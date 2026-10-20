// Westpac DriveXpress fast-track rules, from "Equipment Finance Key Policies" (Westpac,
// Q1FY26, Feb 2025). AssetMX is built around DriveXpress: the chat only takes a deal
// online when it fits these; anything else goes to the team as a lead.
//
// Not encoded (checked by Westpac or the team): the credit bureau itself (the chat asks a
// credit declaration covering every director), the signed Affordability Declaration
// (Westpac emails it). Property in a spouse's name is routed to Metro.

import type { ChatFlowData } from './chat-flow';

/** A: cars and light commercials (<4.5t). B: trucks, trailers, yellow goods. C: farm machinery. */
export type GoodsClass = 'A' | 'B' | 'C';

export const DRIVEXPRESS = {
  newCustomerMaxLoan: 150000, // owns residential property and earns $75k+
  existingCustomerMaxLoan: { A: 200000, B: 300000, C: 500000 } as Record<GoodsClass, number>,
  maxAgeYears: { A: 5, B: 5, C: 7 } as Record<GoodsClass, number>,
  dealerOnly: { A: false, B: true, C: true } as Record<GoodsClass, boolean>,
  maxCarPrice: 250000,
  minIncome: 75000,
  maxExposure: { new: 250000, existing: 750000 }, // aggregate DriveXpress balances
  maxAccessoriesPct: 10, // of the dealer invoice / purchase price
};

// 'Not taxi/hire/import/exotic cars': makes treated as exotic
const EXOTIC_MAKES = /\b(ferrari|lamborghini|mclaren|rolls[- ]?royce|bentley|aston[- ]?martin|bugatti|pagani|koenigsegg|maserati|lotus|maybach|rimac)\b/i;

// Equipment kinds, from the make/model/description. DriveXpress goods B (and Metro's
// Trucks, Trailers & Wheeled Equipment) cover wheeled / yellow goods; Metro's Other
// Equipment covers tools and workshop machinery; neither covers fit-outs or IT.
const YELLOW_GOODS = /excavator|digger|loader|skid ?steer|bobcat|forklift|telehandler|dozer|bulldozer|grader|scraper|roller|crane|backhoe|tipper|dump truck|boom lift|scissor lift|spider lift|elevated work platform|ewp|trailer|truck|prime mover|tractor|harvester|header|baler|sprayer|seeder/i;
const NOT_FINANCEABLE = /\b(furniture|fit[- ]?outs?|desks?|chairs?|carpets?|blinds|partitions?|coffee machines?|kitchens?|catering|gym|fitness|beauty|solar|led lighting|air ?con(ditioning)?|ducting|racking|safes?|strong ?rooms?|scaffold(ing)?|spray booths?|telephones?|phone systems?|printers?|computers?|laptops?|servers?|it equipment|audio ?visual|signage|display units?|drones?|software)\b/i;

export type EquipmentKind = 'yellow_goods' | 'other_equipment' | 'not_financeable' | 'unknown';

export function equipmentKind(data: ChatFlowData): EquipmentKind {
  const a = data.application.asset as Record<string, unknown> | undefined;
  const text = [a?.assetMake, a?.assetModel, a?.assetDescription].filter(Boolean).join(' ');
  if (!text.trim()) return 'unknown';
  if (NOT_FINANCEABLE.test(text)) return 'not_financeable';
  if (a?.assetType === 'truck' || a?.assetCategory === 'agri' || YELLOW_GOODS.test(text)) return 'yellow_goods';
  return 'other_equipment';
}

export const westpacExposure = (data: ChatFlowData) => Number((data.eligibility as Record<string, unknown> | undefined)?.westpacExposure) || 0;

export function goodsClass(data: ChatFlowData): GoodsClass {
  const asset = data.application.asset as Record<string, unknown> | undefined;
  if (asset?.assetCategory === 'agri') return 'C';
  return asset?.assetType === 'vehicle' || !asset?.assetType ? 'A' : 'B';
}

export const isExistingWestpacCustomer = (data: ChatFlowData) =>
  (data.eligibility as Record<string, unknown> | undefined)?.existingWestpacCustomer === true;

/** The most DriveXpress will lend this applicant on this asset. */
export function maxDriveXpressLoan(data: ChatFlowData): number {
  if (!isExistingWestpacCustomer(data)) return DRIVEXPRESS.newCustomerMaxLoan;
  // Existing customers: the goods-class limit, within the $750k aggregate DriveXpress exposure
  const headroom = Math.max(0, DRIVEXPRESS.maxExposure.existing - westpacExposure(data));
  return Math.min(DRIVEXPRESS.existingCustomerMaxLoan[goodsClass(data)], headroom);
}

const CLASS_LABEL: Record<GoodsClass, string> = {
  A: 'cars and light commercials',
  B: 'trucks, trailers and equipment',
  C: 'farm machinery',
};

/** Why the asset falls outside DriveXpress, in plain words, or null if it fits. */
export function assetPolicyIssue(data: ChatFlowData): string | null {
  const asset = data.application.asset as Record<string, unknown> | undefined;
  const cls = goodsClass(data);
  const year = Number(asset?.assetYear);
  if (year > 1900) {
    const age = new Date().getFullYear() - year;
    const max = DRIVEXPRESS.maxAgeYears[cls];
    if (age > max) return `A ${year} is ${age} years old. The fast-track lender takes ${CLASS_LABEL[cls]} up to ${max} years old.`;
  }
  const supplier = String(asset?.supplierName ?? '');
  if (DRIVEXPRESS.dealerOnly[cls] && /private/i.test(supplier)) {
    return `For ${CLASS_LABEL[cls]}, the fast-track lender only funds purchases from a dealer, not private sales.`;
  }
  const price = Number(asset?.assetPriceIncGst);
  if (cls === 'A' && price > DRIVEXPRESS.maxCarPrice) {
    return `The fast-track lender funds cars up to $250,000.`;
  }
  if (cls === 'A' && EXOTIC_MAKES.test(String(asset?.assetMake ?? '') + ' ' + String(asset?.assetDescription ?? ''))) {
    return 'The fast-track lender does not fund exotic cars.';
  }
  const accessories = Number(asset?.accessoriesAmount);
  if (accessories > 0 && price > 0 && (accessories / price) * 100 > DRIVEXPRESS.maxAccessoriesPct) {
    return `Accessories and modifications are ${Math.round((accessories / price) * 100)}% of the invoice; the fast-track lender allows up to ${DRIVEXPRESS.maxAccessoriesPct}%.`;
  }
  if (asset?.assetType === 'equipment' && cls === 'B') {
    const kind = equipmentKind(data);
    if (kind === 'not_financeable') return 'Our lenders do not fund fit-outs, furniture, IT or similar equipment online.';
    if (kind === 'other_equipment') return 'The fast-track lender covers trucks, trailers and yellow goods such as excavators, loaders and forklifts.';
  }
  return null;
}
