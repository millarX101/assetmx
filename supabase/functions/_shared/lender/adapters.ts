// Lender adapters: each turns the AssetMX standard application (./canonical.ts) into
// one lender's format, and optionally sends it to that lender's API.
//
// To add a lender:
//   1. Write an adapter below: `map` builds the lender's payload from the canonical
//      application; `submit` (optional) POSTs it and returns the lender's reply.
//   2. Add it to ADAPTERS. Credentials go in Supabase secrets, read inside `submit`.
//   3. Nothing else changes: lender-export, the audit table and the admin button pick it up.

import type { CanonicalApplication } from "./canonical.ts";

export interface SubmitResult {
  ok: boolean;
  externalRef?: string | null; // the lender's application number
  response: unknown; // stored as-is in lender_submissions.response
}

export interface LenderAdapter {
  id: string;
  name: string;
  description: string;
  map(app: CanonicalApplication): unknown;
  submit?(payload: unknown): Promise<SubmitResult>;
}

// ── AssetMX standard ─────────────────────────────────────────────────────────
// The canonical application itself, minus internal-only notes. The format to give a
// lender that wants to build their own mapping.
const canonical: LenderAdapter = {
  id: "canonical",
  name: "AssetMX standard (JSON)",
  description: "Lender-neutral application in the AssetMX v1 schema.",
  map: (app) => ({ ...app, businessCheck: { ...app.businessCheck, lenderNotes: undefined } }),
};

// ── Westpac Equipment Finance ────────────────────────────────────────────────
// No public API: DriveOnline is keyed in by the broker. This lays the application
// out in the order of Westpac's "Minimum Documentation Requirements" (items required
// for all applications incl. DriveXpress / Matrix), with a check per item, so it can
// be keyed in now and mapped to an API field-for-field later.
const westpac: LenderAdapter = {
  id: "westpac",
  name: "Westpac Equipment Finance",
  description: "Westpac minimum documentation layout (DriveOnline). Manual entry; no API yet.",
  map: (app) => {
    const primary = app.individuals.find((i) => i.isPrimaryContact) ?? app.individuals[0];
    const everyoneConsented = app.individuals.length > 0 && app.individuals.every((i) => i.privacyConsent.given);
    return {
      lender: "westpac",
      channel: "DriveOnline (manual entry)",
      reference: app.reference,
      submittedAt: app.submittedAt,
      introducer: app.broker,
      minimumDocumentation: {
        clientInformation: {
          satisfied: !!(primary?.detailsComplete && app.borrower.description),
          business: {
            legalName: app.borrower.legalName,
            abn: app.borrower.abn,
            acn: app.borrower.acn,
            entityType: app.borrower.entityType,
            tradingNames: app.borrower.tradingNames,
            address: app.borrower.address,
            industry: app.borrower.industry,
            background: app.borrower.description,
            backgroundSource: app.borrower.descriptionSource,
            website: app.borrower.website,
          },
          directorsGuarantors: app.individuals.map((i) => ({
            name: [i.firstName, i.lastName].filter(Boolean).join(" ") || null,
            dateOfBirth: i.dateOfBirth,
            residentialAddress: i.residentialAddress,
            monthsAtAddress: i.monthsAtAddress,
            previousAddress: i.previousAddress,
            driverLicence: i.driverLicence,
            mobile: i.mobile,
            email: i.email,
            detailsComplete: i.detailsComplete,
          })),
        },
        goodsAndPurpose: {
          satisfied: !!(app.goods.description && app.goods.purposeOfPurchase),
          description: app.goods.description,
          condition: app.goods.condition,
          supplier: app.goods.supplier,
          priceExGst: app.goods.priceExGst,
          gst: app.goods.gst,
          priceIncGst: app.goods.priceIncGst,
          reasonForPurchase: app.goods.purposeOfPurchase,
        },
        abnAndGst: {
          satisfied: (app.borrower.abnAgeMonths ?? 0) >= 24 && app.borrower.gstRegistered,
          abnRegisteredDate: app.borrower.abnRegisteredDate,
          abnAgeMonths: app.borrower.abnAgeMonths,
          abnStatus: app.borrower.abnStatus,
          gstRegistered: app.borrower.gstRegistered,
          gstRegisteredDate: app.borrower.gstRegisteredDate,
        },
        privacyConsent: {
          satisfied: everyoneConsented,
          individuals: app.individuals.map((i) => ({
            name: [i.firstName, i.lastName].filter(Boolean).join(" ") || i.email,
            ...i.privacyConsent,
          })),
        },
      },
      driveXpress: {
        // Answers behind the chat's DriveXpress checks (Key Policies Q1FY26)
        customerType: app.declarations.existingWestpacCustomer ? "existing" : "new_to_business_bank",
        ownsResidentialProperty: app.declarations.ownsProperty,
        annualIncomeAtLeast75k: app.declarations.incomeOver75k,
        statutoryObligationsCurrentNoArrangements: app.declarations.taxUpToDate,
        goodsClass: app.goods.category === "agri" ? "C" : app.goods.assetType === "vehicle" ? "A" : "B",
        assetAgeYears: app.goods.year ? new Date().getFullYear() - app.goods.year : null,
        accessoriesPercentOfInvoice: app.goods.accessoriesAmount && app.goods.priceIncGst ? Math.round((app.goods.accessoriesAmount / app.goods.priceIncGst) * 1000) / 10 : 0,
        existingDriveXpressExposure: app.declarations.westpacExposure,
      },
      finance: app.finance,
      declarations: app.declarations,
    };
  },
};

// ── Metro Finance ────────────────────────────────────────────────────────────
// Streamlined products (Passenger Vehicle, Trucks/Trailers/Wheeled, Agri). Manual
// submission; no API yet. Lays out what Metro's streamlined criteria turn on.
const metro: LenderAdapter = {
  id: "metro",
  name: "Metro Finance",
  description: "Metro streamlined layout: property position, credit reference, deposit. Manual; no API yet.",
  map: (app) => ({
    lender: "metro",
    channel: "Broker submission (manual)",
    reference: app.reference,
    submittedAt: app.submittedAt,
    introducer: app.broker,
    streamlined: {
      product: app.goods.category === "agri" ? "Agri" : app.goods.assetType === "vehicle" ? "Passenger Vehicle (<3.5t)" : "Trucks, Trailers & Wheeled Equipment",
      propertyOwnership: app.route.propertyStatus, // own = borrower/guarantor name
      comparableCreditReference: app.route.creditReference, // asset_finance, or mortgage statements (<= $100k)
      gstRegisteredDate: app.borrower.gstRegisteredDate,
      depositPercent: app.goods.priceIncGst ? Math.round(((app.finance.deposit + app.finance.tradeIn) / app.goods.priceIncGst) * 1000) / 10 : null,
      assetAgeYears: app.goods.year ? new Date().getFullYear() - app.goods.year : null,
      taxiRideshare: app.route.taxiRideshare,
      whyNotDriveXpress: app.route.driveXpressMiss,
      serialOrVin: app.goods.vin || app.goods.serialNumber || null, // assets must be serial numbered
      genuinePrimaryProducer40ha: app.declarations.primaryProducer,
      goodsNormallyUsedByBusiness: app.goods.fitsBusiness,
    },
    borrower: { ...app.borrower },
    individuals: app.individuals,
    goods: app.goods,
    finance: app.finance,
    declarations: app.declarations,
  }),
};

export const ADAPTERS: Record<string, LenderAdapter> = { canonical, westpac, metro };

export const listAdapters = () =>
  Object.values(ADAPTERS).map((a) => ({ id: a.id, name: a.name, description: a.description, canSubmit: !!a.submit }));
