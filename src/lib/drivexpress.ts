// Westpac DriveXpress fast-track rules, from "Equipment Finance Key Policies" (Westpac,
// Q1FY26, Feb 2025). AssetMX is built around DriveXpress: the chat only takes a deal
// online when it fits these; anything else goes to the team as a lead.
//
// Not encoded (checked by Westpac or the team): satisfactory credit bureau for all
// directors (the chat asks the credit declaration), the signed Affordability
// Declaration (Westpac emails it), accessories over 10% of the invoice, exotic cars,
// residential property in a spouse's name (Westpac discretion), total DriveXpress
// exposure across existing loans ($250k new / $750k existing).

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
};

export function goodsClass(data: ChatFlowData): GoodsClass {
  const asset = data.application.asset as Record<string, unknown> | undefined;
  if (asset?.assetCategory === 'agri') return 'C';
  return asset?.assetType === 'vehicle' || !asset?.assetType ? 'A' : 'B';
}

export const isExistingWestpacCustomer = (data: ChatFlowData) =>
  (data.eligibility as Record<string, unknown> | undefined)?.existingWestpacCustomer === true;

/** The most DriveXpress will lend this applicant on this asset. */
export function maxDriveXpressLoan(data: ChatFlowData): number {
  return isExistingWestpacCustomer(data)
    ? DRIVEXPRESS.existingCustomerMaxLoan[goodsClass(data)]
    : DRIVEXPRESS.newCustomerMaxLoan;
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
  return null;
}
