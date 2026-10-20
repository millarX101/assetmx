// The AssetMX standard application: one lender-neutral, versioned structure built
// from an `applications` row. Lender adapters (./adapters.ts) map FROM this, never
// from the raw row, so a database change only has to be absorbed here.
//
// Bump SCHEMA_VERSION on any breaking change to the shape below.

export const SCHEMA_VERSION = "assetmx.application/v1";

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface Address {
  full: string | null;
  state: string | null;
  postcode: string | null;
}

export interface Individual {
  role: "director_guarantor";
  isPrimaryContact: boolean;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD
  email: string | null;
  mobile: string | null;
  residentialAddress: string | null;
  monthsAtAddress: number | null;
  previousAddress: string | null;
  driverLicence: { number: string | null; state: string | null; expiry: string | null };
  privacyConsent: { given: boolean; at: string | null; wording: string | null; method: string | null };
  detailsComplete: boolean;
}

export interface CanonicalApplication {
  schema: typeof SCHEMA_VERSION;
  reference: string; // APP-XXXXXXXX
  applicationId: string;
  submittedAt: string;
  status: string;
  source: "assetmx_online";
  // Which lender the chat routed this to, and why (Westpac DriveXpress first, then Metro)
  route: {
    lender: "westpac" | "metro" | null;
    track: "drivexpress" | "metro_streamlined" | null;
    driveXpressMiss: string | null;
    propertyStatus: "own" | "spouse" | "none" | null;
    creditReference: "asset_finance" | "mortgage" | null;
    taxiRideshare: boolean;
  };
  broker: { name: string; abn: string; acl: string; email: string };
  borrower: {
    legalName: string;
    abn: string;
    acn: string | null;
    entityType: string | null;
    abnStatus: string | null;
    abnRegisteredDate: string | null;
    abnAgeMonths: number | null;
    gstRegistered: boolean;
    gstRegisteredDate: string | null;
    tradingNames: string[];
    address: Address;
    industry: string | null;
    description: string | null; // what the business does
    descriptionSource: "applicant" | "applicant_corrected" | "public_sources_confirmed" | null;
    website: string | null;
  };
  individuals: Individual[];
  goods: {
    assetType: string | null;
    category: string | null; // e.g. "agri" (DriveXpress goods class C)
    condition: string | null;
    year: number | null;
    make: string | null;
    model: string | null;
    description: string | null;
    supplier: { name: string | null; abn: string | null };
    priceExGst: number | null;
    gst: number | null;
    priceIncGst: number | null;
    purposeOfPurchase: string | null;
    businessUsePercent: number | null;
    accessoriesAmount: number | null; // from the invoice (DriveXpress: max 10%)
    vin: string | null;
    serialNumber: string | null;
    engineNumber: string | null;
    registration: string | null;
    fitsBusiness: { result: "yes" | "unclear" | "no" | null; note: string | null }; // AI check, flag only
  };
  finance: {
    product: "chattel_mortgage"; // the only product sold online today
    amountFinanced: number;
    deposit: number;
    tradeIn: number;
    termMonths: number;
    repaymentFrequency: "monthly";
    repaymentTiming: "arrears";
    balloonPercent: number;
    balloonAmount: number;
    indicativeRatePercent: number | null;
    indicativeMonthlyRepayment: number | null;
    brokerFee: { amount: number; description: string };
  };
  declarations: {
    creditHistory: "clear" | "declared" | null; // defaults, judgments, bankruptcies (5 years)
    creditHistoryDetails: string | null;
    ownsProperty: boolean | null; // residential property in an applicant's or director's name
    incomeOver75k: boolean | null;
    existingWestpacCustomer: boolean | null;
    taxUpToDate: boolean | null; // tax/BAS lodgements and payments current, no ATO plan
    restrictedUse: boolean | null; // hire car or private import
    westpacExposure: number | null; // existing Westpac customers: current EF balances
    primaryProducer: boolean | null; // Metro Agri: genuine primary producer, 40 ha+
  };
  businessCheck: {
    status: string | null;
    confidence: string | null;
    confirmedByApplicant: boolean;
    applicantCorrections: string | null;
    profile: Row | null; // full public-source profile (services, customers, size, ...)
    sources: { url: string; title: string }[];
    lenderNotes: string | null; // internal: adapters decide whether to pass it on
  };
  documents: { uploadedInChat: boolean };
}

const num = (v: unknown): number | null => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
const str = (v: unknown): string | null => (v == null || String(v).trim() === "" ? null : String(v).trim());

export const applicationReference = (id: string) => `APP-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

function monthsSince(d: unknown): number | null {
  const t = new Date(String(d));
  if (!d || isNaN(t.getTime())) return null;
  const n = new Date();
  return (n.getFullYear() - t.getFullYear()) * 12 + (n.getMonth() - t.getMonth());
}

export function toCanonical(app: Row): CanonicalApplication {
  const directors: Row[] = Array.isArray(app.directors) ? app.directors : app.directors?.directors || [];
  const primaryIndex = Number(app.primary_contact_index) || 0;
  const bp: Row = app.business_profile || {};
  const elig: Row = app.eligibility_checks || {};
  const abnDigits = String(app.abn || "").replace(/\D/g, "");
  const isCompany = /company/i.test(String(app.entity_type || ""));

  const description =
    str(bp.applicantCorrections) || str(bp.applicantDescription) || (bp.confirmedByApplicant ? str(bp.description) || str(bp.summary) : null);
  const descriptionSource = bp.applicantCorrections
    ? "applicant_corrected"
    : bp.applicantDescription
      ? "applicant"
      : bp.confirmedByApplicant && (bp.description || bp.summary)
        ? "public_sources_confirmed"
        : null;

  const individuals: Individual[] = directors.map((d, i) => {
    const isPrimary = i === primaryIndex;
    // The online consent record covers the applicant only; others consent separately
    const consentGiven = isPrimary && !!app.privacy_consent_at;
    return {
      role: "director_guarantor",
      isPrimaryContact: isPrimary,
      firstName: str(d.firstName),
      lastName: str(d.lastName),
      dateOfBirth: str(d.dateOfBirth),
      email: str(d.email),
      mobile: str(d.phone),
      residentialAddress: str(d.address),
      monthsAtAddress: num(d.addressMonths),
      previousAddress: str(d.previousAddress),
      driverLicence: { number: str(d.licenceNumber), state: str(d.licenceState), expiry: str(d.licenceExpiry) },
      privacyConsent: {
        given: consentGiven,
        at: consentGiven ? app.privacy_consent_at : null,
        wording: consentGiven ? str(app.privacy_consent_text) : null,
        method: consentGiven ? "online_application_i_agree" : null,
      },
      detailsComplete: !!(d.firstName && d.lastName && d.dateOfBirth && d.address),
    };
  });

  return {
    schema: SCHEMA_VERSION,
    reference: applicationReference(app.id),
    applicationId: app.id,
    submittedAt: app.created_at,
    status: app.status,
    source: "assetmx_online",
    route: {
      lender: elig.lenderTrack === "metro" ? "metro" : elig.lenderTrack === "drivexpress" ? "westpac" : null,
      track: elig.lenderTrack === "metro" ? "metro_streamlined" : elig.lenderTrack === "drivexpress" ? "drivexpress" : null,
      driveXpressMiss: str(elig.driveXpressMiss),
      propertyStatus: ["own", "spouse", "none"].includes(elig.propertyStatus) ? elig.propertyStatus : null,
      creditReference: ["asset_finance", "mortgage"].includes(elig.creditReference) ? elig.creditReference : null,
      taxiRideshare: elig.taxiRideshare === true,
    },
    broker: { name: "Blackrock Leasing Pty Ltd trading as AssetMX", abn: "15 681 267 818", acl: "569484", email: "info@assetmx.com.au" },
    borrower: {
      legalName: app.entity_name,
      abn: abnDigits,
      acn: isCompany && abnDigits.length === 11 ? abnDigits.slice(2) : null,
      entityType: str(app.entity_type),
      abnStatus: str(app.abn_status),
      abnRegisteredDate: str(app.abn_registered_date),
      abnAgeMonths: monthsSince(app.abn_registered_date),
      gstRegistered: !!app.gst_registered,
      gstRegisteredDate: str(app.gst_registered_date),
      tradingNames: Array.isArray(bp.tradingNames) ? bp.tradingNames : app.trading_name ? [app.trading_name] : [],
      address: { full: str(app.business_address), state: str(app.business_state), postcode: str(app.business_postcode) },
      industry: str(bp.industry),
      description,
      descriptionSource,
      website: str(bp.website),
    },
    individuals,
    goods: {
      assetType: str(app.asset_type),
      category: str(app.asset_category),
      condition: str(app.asset_condition),
      year: num(app.asset_year),
      make: str(app.asset_make),
      model: str(app.asset_model),
      description: str([app.asset_year, app.asset_make, app.asset_model].filter(Boolean).join(" ")) || str(app.asset_description),
      supplier: { name: str(app.supplier_name), abn: str(app.supplier_abn) },
      priceExGst: num(app.asset_price_ex_gst),
      gst: num(app.asset_gst),
      priceIncGst: num(app.asset_price_inc_gst),
      purposeOfPurchase: str(app.purchase_reason),
      businessUsePercent: num(app.business_use_percentage),
      accessoriesAmount: num(app.accessories_amount),
      vin: str(app.asset_vin),
      serialNumber: str(app.asset_serial_number),
      engineNumber: str(app.asset_engine_number),
      registration: str(app.asset_registration),
      fitsBusiness: { result: ["yes", "unclear", "no"].includes(elig.goodsFit) ? elig.goodsFit : null, note: str(elig.goodsFitNote) },
    },
    finance: {
      product: "chattel_mortgage",
      amountFinanced: Number(app.loan_amount) || 0,
      deposit: Number(app.deposit_amount) || 0,
      tradeIn: Number(app.trade_in_amount) || 0,
      termMonths: Number(app.term_months) || 0,
      repaymentFrequency: "monthly",
      repaymentTiming: "arrears",
      balloonPercent: Number(app.balloon_percentage) || 0,
      balloonAmount: Number(app.balloon_amount) || 0,
      indicativeRatePercent: num(app.indicative_rate),
      indicativeMonthlyRepayment: num(app.monthly_repayment),
      brokerFee: { amount: 800, description: "AssetMX flat fee; no lender commission" },
    },
    declarations: {
      creditHistory: elig.creditDeclaration === "clear" ? "clear" : elig.creditDeclaration === "declare" ? "declared" : null,
      creditHistoryDetails: str(elig.creditDetails),
      ownsProperty: typeof elig.ownsProperty === "boolean" ? elig.ownsProperty : null,
      incomeOver75k: typeof elig.incomeOver75k === "boolean" ? elig.incomeOver75k : null,
      existingWestpacCustomer: typeof elig.existingWestpacCustomer === "boolean" ? elig.existingWestpacCustomer : null,
      taxUpToDate: typeof elig.taxUpToDate === "boolean" ? elig.taxUpToDate : null,
      restrictedUse: typeof elig.restrictedUse === "boolean" ? elig.restrictedUse : null,
      westpacExposure: num(elig.westpacExposure),
      primaryProducer: typeof elig.primaryProducer === "boolean" ? elig.primaryProducer : null,
    },
    businessCheck: {
      status: str(bp.status),
      confidence: str(bp.confidence),
      confirmedByApplicant: bp.confirmedByApplicant === true,
      applicantCorrections: str(bp.applicantCorrections),
      profile: bp.status ? bp : null,
      sources: Array.isArray(bp.sources) ? bp.sources : [],
      lenderNotes: str(bp.lenderNotes),
    },
    documents: { uploadedInChat: !!app.documents_uploaded },
  };
}
