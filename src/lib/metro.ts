// Metro Finance streamlined products, from Metro's product sheets (Passenger Vehicle
// <3.5t; Trucks, Trailers & Wheeled Equipment; Agri). AssetMX's second lender: the chat
// routes here when a deal is outside Westpac DriveXpress but fits Metro.
//
// New Metro customers only (the higher limits for 12-24 months of Metro history are not
// used). Not encoded, checked by Metro or the team: satisfactory Equifax, goods normally
// used in the business, serial numbers, total Metro exposure, Agri's genuine primary
// producer / 40 ha minimum, and the Other Equipment product's narrower asset list
// (equipment is assessed under the Trucks, Trailers & Wheeled Equipment rules here).

import type { ChatFlowData } from './chat-flow';
import { goodsClass } from './drivexpress';

export type PropertyStatus = 'own' | 'spouse' | 'none';

const ASSUMED_TERM_YEARS = 5; // term isn't chosen yet when the asset is checked

export const METRO = {
  // [own property, spouse's property, no property]
  maxLoan: {
    A: { own: 150000, spouse: 150000, none: 100000 }, // cars and light commercials
    B: { own: 250000, spouse: 150000, none: 100000 }, // trucks, trailers, yellow goods
    C: { own: 250000, spouse: 0, none: 0 }, // farm machinery: property in own name only
  } as Record<'A' | 'B' | 'C', Record<PropertyStatus, number>>,
  maxAgeAtEndYears: { A: 12, B: 15, C: 15 },
  minGstMonths: { A: 24, B: 24, C: 60 },
  noPropertyMinDepositPct: 30,
  mortgageReferenceMaxLoan: 100000, // home loan statements instead of an asset finance reference
};

const elig = (data: ChatFlowData) => (data.eligibility || {}) as Record<string, unknown>;
export const propertyStatus = (data: ChatFlowData) => elig(data).propertyStatus as PropertyStatus | undefined;
export const isMetroTrack = (data: ChatFlowData) => elig(data).lenderTrack === 'metro';

function monthsSince(iso?: string): number {
  const t = iso ? new Date(iso) : null;
  if (!t || isNaN(t.getTime())) return 0;
  const n = new Date();
  return (n.getFullYear() - t.getFullYear()) * 12 + (n.getMonth() - t.getMonth());
}

/** The most Metro will lend this applicant on this asset (0 = not available). */
export function maxMetroLoan(data: ChatFlowData): number {
  const cls = goodsClass(data);
  const status = propertyStatus(data) ?? 'none';
  let max = METRO.maxLoan[cls][status];
  // Non-property is motor vehicles only (cars, light commercials, trucks), not equipment
  if (status === 'none' && data.application.asset?.assetType === 'equipment') max = 0;
  if (elig(data).creditReference === 'mortgage') max = Math.min(max, METRO.mortgageReferenceMaxLoan);
  return max;
}

/** Why the deal falls outside Metro's streamlined products, or null if it fits. */
export function metroIssue(data: ChatFlowData): string | null {
  const cls = goodsClass(data);
  const status = propertyStatus(data) ?? 'none';
  const asset = data.application.asset as Record<string, unknown> | undefined;

  if (monthsSince(data.abnLookup?.gstRegisteredDate) < METRO.minGstMonths[cls]) {
    return `Metro Finance needs GST registration for at least ${METRO.minGstMonths[cls] / 12} years.`;
  }
  if (maxMetroLoan(data) === 0) {
    return status === 'none'
      ? 'Without property, Metro Finance only funds vehicles.'
      : 'For farm machinery, Metro Finance needs property in your own name.';
  }
  if (status === 'none' && /private/i.test(String(asset?.supplierName ?? ''))) {
    return 'Without property, Metro Finance only funds purchases from a dealer.';
  }
  if (elig(data).taxiRideshare && status !== 'own') {
    return 'For taxi or rideshare use, Metro Finance needs property in your own name.';
  }
  const year = Number(asset?.assetYear);
  if (year > 1900) {
    const ageAtEnd = new Date().getFullYear() - year + ASSUMED_TERM_YEARS;
    const max = METRO.maxAgeAtEndYears[cls];
    if (ageAtEnd > max) return `A ${year} would be ${ageAtEnd} years old by the end of a 5-year loan; the limit is ${max}.`;
  }
  return null;
}

/** Plain-words reason this went to Metro, for the chat and the team. */
export function metroRouteSummary(data: ChatFlowData): string {
  const status = propertyStatus(data);
  return status === 'none'
    ? `up to ${METRO.maxLoan.A.none.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })} with a ${METRO.noPropertyMinDepositPct}% deposit`
    : `up to ${maxMetroLoan(data).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })}`;
}
