// Chat Flow Engine - Defines the conversational application flow
// Each step represents a point in the conversation.
//
// v2 (low-doc): the flow asks about 18 questions instead of about 44. Pre-qualification
// quizzing, personal financials (assets, liabilities, income, living expenses) and the
// duplicated asset questions are gone. What the applicant would otherwise type is read
// off the documents they upload (dealer quote, driver licence) and confirmed in a card.

import { validateABN, cleanABN, type ABNSearchResult } from './abn-lookup';
import { getMaxBalloon, PLATFORM_FEE, LENDER_ESTABLISHMENT_FEE } from './calculator';
import type { ApplicationData } from '@/types/application';

export type InputType = 'text' | 'select' | 'number' | 'date' | 'email' | 'phone' | 'confirm' | 'abn_select' | 'file_upload';

export type ChatAction =
  | 'abn_lookup'
  | 'abn_search'
  | 'calculate_quote'
  | 'check_eligibility'
  | 'submit_application'
  | 'save_lead'
  | 'save_novated_lead'
  | 'send_director_form'
  // Document reading. Both must be listed in the hook's PRE_RENDER_ACTIONS so the
  // extracted values exist by the time the confirmation card renders its messages.
  | 'extract_asset'
  | 'extract_licence';

export interface ChatStep {
  id: string;
  messages: string[] | ((data: ChatFlowData) => string[]);
  inputType: InputType;
  options?: string[] | ((data: ChatFlowData) => string[]);
  field?: string;  // Dot notation path e.g. 'business.abn', 'directors.directors.0.firstName'
  placeholder?: string;
  validate?: (value: string, data: ChatFlowData) => string | null;  // Returns error message or null
  action?: ChatAction;
  nextStep: string | ((answer: string, data: ChatFlowData) => string);
  skipIf?: (data: ChatFlowData) => boolean;
}

export interface ChatFlowData {
  application: Partial<ApplicationData>;
  abnLookup?: {
    entityName: string;
    entityType: string;
    abnStatus: string;
    abnRegisteredDate: string;
    gstRegistered: boolean;
    gstRegisteredDate?: string;
    state?: string;
    postcode?: string;
  };
  abnSearchResults?: ABNSearchResult[];
  businessNameSearch?: string;
  quote?: {
    monthlyRepayment: number;
    weeklyRepayment?: number;
    indicativeRate: number;
    totalInterest?: number;
    totalRepayments?: number;
    totalFeesFinanced?: number;
    totalFeesUpfront?: number;
    totalCost?: number;
  };
  currentDirectorIndex: number;
  eligibilityPassed?: boolean;
  eligibilityMessages?: string[];
  // Lead capture for non-qualifying applicants
  lead?: {
    name?: string;
    phone?: string;
    email?: string;
    reason?: string;  // Why they did not qualify
    consentToShare?: boolean;  // Permission to share with partner brokers
    assetType?: string;  // What type of asset they want
    loanAmount?: string;  // Rough loan amount range
  };
  // Eligibility tracking.
  // The hook coerces anything written through a step's `field` under `eligibility.` to a
  // boolean, so the two string values below are set from the step's nextStep instead.
  eligibility?: {
    ownsProperty?: boolean;
    canDeposit20?: boolean;
    creditDeclaration?: 'clear' | 'declare';
    creditDetails?: string;
  };
  // Values read off an uploaded document (dealer quote / tax invoice, driver licence).
  // Written by the extract_asset / extract_licence actions, confirmed by the applicant,
  // then copied onto the application by applyExtractedAsset / applyExtractedLicence.
  extracted?: {
    asset?: {
      make?: string;
      model?: string;
      year?: number;
      supplierName?: string;
      priceIncGst?: number;
      priceExGst?: number;
      gst?: number;
      condition?: string;
      description?: string;
    };
    licence?: {
      fullName?: string;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      address?: string;
      licenceNumber?: string;
      state?: string;
      expiry?: string;
    };
  };
  // Set once the applicant has confirmed an extraction and it has been copied across
  extractedApplied?: {
    asset?: boolean;
    licence?: boolean;
  };
  // Document upload tracking
  documentsUploaded?: boolean;
  uploadedDocuments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
  // Flag indicating user came from calculator with pre-filled data
  fromCalculator?: boolean;
  // Privacy consent - the hook stamps the time when consent is given
  consentAt?: string;
  // Set once the application row has been inserted - guards against double submission
  submittedApplicationId?: string;
  submissionError?: string;
}

// Helper to format currency
const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Term (in months) currently selected, defaulting to 60 until the applicant chooses
const currentTermMonths = (data: ChatFlowData): number => {
  const term = Number(data.application.loan?.termMonths);
  return term > 0 ? term : 60;
};

// Human label for the current term, e.g. "5 years"
const termLabel = (data: ChatFlowData): string => {
  const years = Math.round(currentTermMonths(data) / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
};

// Helper to format date for display
const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'Unknown date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
};

// Parse date string that might be in various formats
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  // Try standard ISO format first (YYYY-MM-DD)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  // Try YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date;
  }

  // Try DD/MM/YYYY format (common Australian format)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) return date;
  }

  console.warn('[Chat] Could not parse date:', dateStr);
  return null;
};

// Calculate years since a date (used for the ABN summary line)
const yearsSince = (dateStr: string): number => {
  const date = parseDate(dateStr);
  if (!date) {
    console.warn('[Chat] yearsSince: Invalid date string:', dateStr);
    return 0;
  }
  const now = new Date();
  const years = (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.floor(years);
};

// Calculate whole months since a date (used for the 24 month ABN gate)
const monthsSince = (dateStr: string): number => {
  const date = parseDate(dateStr);
  if (!date) {
    console.warn('[Chat] monthsSince: Invalid date string:', dateStr);
    return 0;
  }
  const now = new Date();
  let months = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  if (now.getDate() < date.getDate()) months -= 1;
  return Math.max(0, months);
};

// Validation helpers
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "That email does not look right. Please re-enter it.";
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) {
    return "A phone number needs to be 10 digits.";
  }
  return null;
};

const validateAmount = (value: string): string | null => {
  // Accepts the formats the placeholders advertise: 75000, 75k, 75,000, $75 000
  const amount = parseAmount(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter the amount as a number, for example 75000 or 75k.";
  }
  if (amount < 5000) {
    return "The minimum finance amount is $5,000.";
  }
  if (amount > 500000) {
    return "For amounts over $500,000, please contact us directly.";
  }
  return null;
};

// Map the address-duration answer to a number of months
export const addressAnswerToMonths = (answer: string): number => {
  const a = answer.toLowerCase();
  if (a.includes('less than 6')) return 3;
  if (a.includes('6-12')) return 9;
  if (a.includes('1-2')) return 18;
  return 24; // "2+ years"
};

// Parse amount from natural input (handles "75k", "$75,000", "75000" etc)
export const parseAmount = (value: string): number => {
  let cleaned = value.toLowerCase().replace(/[,$\s]/g, '');
  if (cleaned.endsWith('k')) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * 1000;
  }
  if (cleaned.endsWith('m')) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * 1000000;
  }
  return parseFloat(cleaned);
};

// ---------------------------------------------------------------------------
// Small mutators. Most values are written through a step's `field`, but a few have to
// be written from nextStep: either because the hook coerces them (anything under
// `eligibility.` becomes a boolean) or because the answer is not always a value (the
// "What is a balloon?" option must not overwrite the balloon percentage).
// ---------------------------------------------------------------------------

type MutableDirector = Record<string, unknown>;

function getDirector(data: ChatFlowData, index = 0): MutableDirector {
  const app = data.application as Record<string, unknown>;
  if (!app.directors) app.directors = { directors: [], primaryContactIndex: 0 };
  const block = app.directors as { directors?: MutableDirector[] };
  if (!Array.isArray(block.directors)) block.directors = [];
  const list = block.directors as MutableDirector[];
  if (!list[index]) list[index] = {};
  return list[index];
}

function setLoanValue(data: ChatFlowData, key: string, value: number): void {
  const app = data.application as Record<string, unknown>;
  if (!app.loan) app.loan = {};
  (app.loan as Record<string, unknown>)[key] = value;
}

function setAssetValue(data: ChatFlowData, key: string, value: unknown): void {
  const app = data.application as Record<string, unknown>;
  if (!app.asset) app.asset = {};
  (app.asset as Record<string, unknown>)[key] = value;
}

function setEligibility(data: ChatFlowData, patch: Partial<NonNullable<ChatFlowData['eligibility']>>): void {
  data.eligibility = { ...(data.eligibility || {}), ...patch };
}

// Split a typed full name into the first and last name the submission payload reads
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

// Map a free-text condition read off a quote to the AssetCondition enum
function normaliseCondition(condition?: string): string | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (c.includes('demo')) return 'demo';
  if (c.includes('new')) return 'new';
  if (c.includes('used') || c.includes('second')) return 'used_0_3';
  return null;
}

/**
 * Copy the values read off the dealer quote onto the application. Called once the
 * applicant confirms the extraction (the hook also calls this on the Yes branch, so it
 * has to stay idempotent).
 */
export function applyExtractedAsset(data: ChatFlowData): ChatFlowData {
  const extracted = data.extracted?.asset;
  if (!extracted) return data;

  const app = data.application as Record<string, unknown>;
  if (!app.asset) app.asset = {};
  const asset = app.asset as Record<string, unknown>;

  if (extracted.make) asset.assetMake = extracted.make;
  if (extracted.model) asset.assetModel = extracted.model;
  if (extracted.year) asset.assetYear = extracted.year;
  if (extracted.supplierName) asset.supplierName = extracted.supplierName;
  if (extracted.description) asset.assetDescription = extracted.description;
  if (extracted.priceIncGst) asset.assetPriceIncGst = extracted.priceIncGst;
  if (extracted.priceExGst) asset.assetPriceExGst = extracted.priceExGst;
  if (extracted.gst) asset.assetGst = extracted.gst;
  const condition = normaliseCondition(extracted.condition);
  if (condition) asset.assetCondition = condition;

  data.extractedApplied = { ...(data.extractedApplied || {}), asset: true };
  return data;
}

/**
 * Copy the values read off the driver licence onto the primary director. Called once the
 * applicant confirms the extraction (idempotent, see applyExtractedAsset).
 */
export function applyExtractedLicence(data: ChatFlowData): ChatFlowData {
  const licence = data.extracted?.licence;
  if (!licence) return data;

  const director = getDirector(data, 0);
  const fullName = licence.fullName
    || [licence.firstName, licence.lastName].filter(Boolean).join(' ').trim();

  if (fullName) director.fullName = fullName;
  if (licence.firstName) {
    director.firstName = licence.firstName;
  } else if (fullName) {
    director.firstName = splitFullName(fullName).firstName;
  }
  if (licence.lastName) {
    director.lastName = licence.lastName;
  } else if (fullName) {
    director.lastName = splitFullName(fullName).lastName;
  }
  if (licence.dateOfBirth) director.dob = licence.dateOfBirth;
  if (licence.address) {
    director.address = licence.address;
    director.residentialAddress = licence.address;
  }
  if (licence.licenceNumber) director.licenceNumber = licence.licenceNumber;
  if (licence.state) director.licenceState = licence.state;

  data.extractedApplied = { ...(data.extractedApplied || {}), licence: true };
  return data;
}

// Do we already have a name for the primary director (from the licence, or typed)?
function hasDirectorName(data: ChatFlowData): boolean {
  const d = data.application.directors?.directors?.[0] as MutableDirector | undefined;
  if (!d) return false;
  return !!d.fullName || (!!d.firstName && !!d.lastName);
}

// The conversation flow definition
export const CHAT_FLOW: ChatStep[] = [
  // ========== PHASE 1: BUSINESS LOOKUP ==========
  {
    id: 'greeting',
    messages: [
      "I am the AssetMX assistant. I will check your business and take you through the application.",
      "It is one flat $800 fee with no commission built into your rate, so you see the lender base rate as it is.",
      "To start, what is your business name or ABN?"
    ],
    inputType: 'text',
    field: 'business.businessName',
    placeholder: "Business name, or your 11-digit ABN",
    validate: (value) => {
      if (!value || value.trim().length < 2) {
        return "I need at least a couple of characters to search.";
      }
      return null;
    },
    action: 'abn_search',
    nextStep: 'abn_search_results',
  },

  {
    id: 'abn_search_results',
    // If the applicant typed an ABN the hook looks it up directly, so there is nothing
    // to choose between - go straight to the result.
    skipIf: (data) => !!data.abnLookup && !(data.abnSearchResults?.length),
    messages: (data) => {
      if (!data.abnSearchResults || data.abnSearchResults.length === 0) {
        return [
          "I could not find a business with that name.",
          "You can enter your ABN directly if you have it handy."
        ];
      }
      return ["Here is what I found. Is your business one of these?"];
    },
    inputType: 'abn_select',
    options: (data) => {
      if (!data.abnSearchResults || data.abnSearchResults.length === 0) {
        return ["Enter ABN manually", "Try a different name"];
      }
      const businessOptions = data.abnSearchResults.slice(0, 3).map(result =>
        `${result.entityName} (${result.state}) - ABN: ${result.abn}`
      );
      return [...businessOptions, "None of these - enter ABN manually"];
    },
    nextStep: (answer, data) => {
      // An empty answer means the step was skipped (see skipIf)
      if (!answer) return data.abnLookup ? 'abn_result' : 'abn_manual_entry';
      if (answer.toLowerCase().includes('different name') || answer.toLowerCase().includes('try')) {
        return 'greeting';
      }
      if (answer.toLowerCase().includes('manually') || answer.toLowerCase().includes('enter abn')) {
        return 'abn_manual_entry';
      }
      const abnMatch = answer.match(/ABN:\s*([\d\s]+)/);
      if (abnMatch) {
        return 'abn_confirm_lookup';
      }
      return 'abn_manual_entry';
    },
  },

  {
    id: 'abn_confirm_lookup',
    messages: ["Grabbing the full details."],
    inputType: 'confirm',
    options: [],
    action: 'abn_lookup',
    nextStep: 'abn_result',
  },

  {
    id: 'abn_manual_entry',
    messages: ["No problem. What is your ABN?"],
    inputType: 'text',
    field: 'business.abn',
    placeholder: 'Enter your 11-digit ABN',
    validate: (value) => {
      const cleaned = cleanABN(value);
      if (!validateABN(cleaned)) {
        return "That ABN does not look right. It should be 11 digits. Have another go?";
      }
      return null;
    },
    nextStep: 'abn_manual_lookup',
  },

  {
    id: 'abn_manual_lookup',
    messages: ["Thanks, checking the register."],
    inputType: 'confirm',
    options: [],
    action: 'abn_lookup',
    nextStep: 'abn_result',
  },

  {
    id: 'abn_result',
    messages: (data) => {
      if (!data.abnLookup) {
        return [
          "I could not find that ABN in the register.",
          "Double-check the number and try again?"
        ];
      }
      const years = yearsSince(data.abnLookup.abnRegisteredDate);
      const gstStatus = data.abnLookup.gstRegistered ? 'GST registered' : 'Not GST registered';

      let tradingInfo: string;
      if (data.abnLookup.abnRegisteredDate && years > 0) {
        tradingInfo = `Trading since ${formatDate(data.abnLookup.abnRegisteredDate)} (${years} year${years !== 1 ? 's' : ''})`;
      } else if (data.abnLookup.abnRegisteredDate) {
        tradingInfo = `Trading since ${formatDate(data.abnLookup.abnRegisteredDate)}`;
      } else {
        tradingInfo = 'ABN active';
      }

      return [
        `Found it.\n\n${data.abnLookup.entityName}\n${tradingInfo}\n${gstStatus}`,
        "Is this your business?"
      ];
    },
    inputType: 'select',
    options: ["Yes, that is us", "No, wrong one"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().startsWith('no')) {
        return 'abn_retry';
      }
      if (!data.abnLookup) return 'abn_retry';

      // The ABN has to be active on the register
      if (data.abnLookup.abnStatus && data.abnLookup.abnStatus.toLowerCase() !== 'active') {
        return 'abn_unverified';
      }
      // Trading history is a hard requirement - if the register gave us no date we cannot
      // verify it, so fail closed rather than letting the applicant through unchecked.
      if (!data.abnLookup.abnRegisteredDate) {
        return 'abn_unverified';
      }
      if (monthsSince(data.abnLookup.abnRegisteredDate) < 24) return 'abn_too_young';
      if (!data.abnLookup.gstRegistered) return 'no_gst_warning';

      return 'eligibility_property';
    },
  },

  {
    id: 'abn_unverified',
    messages: [
      "We could not confirm your trading history from the register.",
      "Our team needs to check that by hand before we can continue online.",
      "Would you like to leave your details so we can look into it?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      data.lead = { ...(data.lead || {}), reason: 'Could not verify ABN trading history from the register' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'abn_retry',
    messages: ["No problem. How would you like to find your business?"],
    inputType: 'select',
    options: ["Search by name again", "Enter ABN manually"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('name') || answer.toLowerCase().includes('search')) {
        return 'greeting';
      }
      return 'abn_manual_entry';
    },
  },

  {
    id: 'abn_too_young',
    messages: (data) => {
      const months = data.abnLookup ? monthsSince(data.abnLookup.abnRegisteredDate) : 0;
      return [
        `Your ABN is ${months} months old, and this product needs 24 months or more.`,
        "Our team may still have options for you. Would you like to leave your details?"
      ];
    },
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      const months = data.abnLookup ? monthsSince(data.abnLookup.abnRegisteredDate) : 0;
      data.lead = { ...(data.lead || {}), reason: `ABN only ${months} months old (need 24+ months)` };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'no_gst_warning',
    messages: [
      "I cannot see a GST registration against that ABN, and this product needs one.",
      "If that is not right, re-enter your ABN. Otherwise our team can review it by hand."
    ],
    inputType: 'select',
    options: ["Re-enter ABN", "I am not GST registered"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('re-enter') || answer.toLowerCase().includes('abn')) {
        return 'abn_retry';
      }
      data.lead = { ...(data.lead || {}), reason: 'Not GST registered' };
      return 'lead_capture_asset_type';
    },
  },

  // ========== PHASE 2: SECURITY POSITION ==========
  {
    id: 'eligibility_property',
    messages: ["Do you own property, a home or an investment property?"],
    inputType: 'select',
    options: ["Yes", "No"],
    field: 'eligibility.ownsProperty',
    nextStep: (answer) => {
      if (answer.toLowerCase().startsWith('no')) {
        return 'eligibility_deposit';
      }
      return 'asset_type';
    },
  },

  {
    id: 'eligibility_deposit',
    messages: ["Without property, lenders want a deposit or trade-in of at least 20 percent of the price. Can you do that?"],
    inputType: 'select',
    options: ["Yes, 20 percent or more", "No"],
    field: 'eligibility.canDeposit20',
    nextStep: (answer) => {
      if (answer.toLowerCase().startsWith('no')) {
        return 'eligibility_no_security';
      }
      return 'asset_type';
    },
  },

  {
    id: 'eligibility_no_security',
    messages: [
      "This product needs either property ownership or a deposit of 20 percent.",
      "Our team works with lenders who look at things differently. Would you like to leave your details?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      data.lead = { ...(data.lead || {}), reason: 'No property security and unable to provide a 20 percent deposit' };
      return 'lead_capture_asset_type';
    },
  },

  // ========== PHASE 3: THE ASSET ==========
  {
    id: 'asset_type',
    // Only skipped when the public site handed the asset type over with a quote
    skipIf: (data) => !!data.fromCalculator && !!data.application.asset?.assetType,
    messages: ["What are you financing?"],
    inputType: 'select',
    options: ["Car, ute or van", "Truck or trailer", "Equipment or machinery", "Electric vehicle"],
    field: 'asset.assetType',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('electric')) {
        return 'ev_use_type';
      }
      return 'asset_purchased_check';
    },
  },

  // EV routing - business use continues here, novated goes to millarX
  {
    id: 'ev_use_type',
    messages: [
      "Most of the noise about EVs is novated leasing, but an EV as a business vehicle stacks up too.",
      "Business use: GST credits and depreciation, with the same flat $800 fee.",
      "Personal use: novated leasing through millarX, where FBT concessions may apply to eligible EVs and the millarX team will confirm what applies to you.",
      "Which one applies to you?"
    ],
    inputType: 'select',
    options: ["Business use (company vehicle)", "Novated lease (personal or salary sacrifice)"],
    field: 'asset.evUseType',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('novated') || answer.toLowerCase().includes('personal') || answer.toLowerCase().includes('salary')) {
        return 'ev_novated_capture';
      }
      // A business EV keeps assetType 'vehicle' and continues through the normal flow
      return 'asset_purchased_check';
    },
  },

  {
    id: 'ev_novated_capture',
    messages: [
      "Novated leasing is handled by millarX, our sister company.",
      "They take care of the lot: employer setup, salary packaging, running costs and FBT.",
      "I will pass your details to the millarX team. What is your name?"
    ],
    inputType: 'text',
    field: 'lead.name',
    placeholder: "Your name",
    nextStep: 'ev_novated_phone',
  },

  {
    id: 'ev_novated_phone',
    messages: ["Best phone number?"],
    inputType: 'phone',
    field: 'lead.phone',
    placeholder: "04XX XXX XXX",
    validate: validatePhone,
    nextStep: 'ev_novated_email',
  },

  {
    id: 'ev_novated_email',
    messages: ["And your email?"],
    inputType: 'email',
    field: 'lead.email',
    placeholder: "your@email.com",
    validate: validateEmail,
    nextStep: 'ev_novated_complete',
  },

  {
    id: 'ev_novated_complete',
    messages: [
      "Details captured.",
      "The millarX team will be in touch within one business day about your novated lease options.",
      "They will walk you through FBT, salary packaging setup and running cost bundles."
    ],
    inputType: 'confirm',
    options: ["Done"],
    action: 'save_novated_lead',
    nextStep: 'end_lead_captured',
  },

  {
    id: 'asset_purchased_check',
    messages: ["Do you have a quote or invoice for it yet?"],
    inputType: 'select',
    options: ["Upload the quote", "I will describe it", "Not chosen yet"],
    nextStep: (answer) => {
      const a = answer.toLowerCase();
      if (a.includes('upload')) return 'asset_upload_quote';
      if (a.includes('describe')) return 'asset_describe';
      return 'asset_price';
    },
  },

  {
    id: 'asset_upload_quote',
    messages: ["Upload the dealer quote or tax invoice. I will read the details from it."],
    inputType: 'file_upload',
    options: [],
    nextStep: 'asset_confirm',
  },

  {
    id: 'asset_describe',
    messages: ["Tell me what you are buying, in your own words."],
    inputType: 'text',
    field: 'asset.assetDescription',
    placeholder: "e.g. 2023 Hilux SR5 from City Toyota, about 68k drive-away",
    nextStep: (answer, data) => {
      // The hook's extract_asset reads application.asset.description, while the
      // submission payload reads assetDescription - keep both in step.
      setAssetValue(data, 'description', answer);
      return 'asset_confirm';
    },
  },

  {
    id: 'asset_confirm',
    // extract_asset reads either the uploaded quote or the typed description; the hook
    // decides which source to use. It has to be listed in the hook's PRE_RENDER_ACTIONS
    // so data.extracted is populated before these messages render.
    //
    // No skipIf here: skipIf is evaluated before the step's action runs, so skipping on
    // "nothing extracted yet" would mean the extraction never happened. Instead the
    // options resolve to an empty list when there is nothing to confirm, which makes the
    // hook auto-advance to the manual questions.
    action: 'extract_asset',
    messages: (data) => {
      const a = data.extracted?.asset;
      if (!a) return ["I could not read the details from that, so I will ask you instead."];

      const lines: string[] = [];
      const item = [a.year, a.make, a.model].filter(Boolean).join(' ');
      if (item) lines.push(item);
      if (a.supplierName) lines.push(`From ${a.supplierName}`);
      if (a.priceIncGst) lines.push(`${formatMoney(a.priceIncGst)} inc GST`);
      if (a.condition) lines.push(a.condition);

      return [
        `Here is what I have:\n\n${lines.join('\n')}`,
        "Is that right?"
      ];
    },
    inputType: 'select',
    options: (data) => (data.extracted?.asset ? ["Yes, that is right", "Something is off"] : []),
    nextStep: (answer, data) => {
      if (!answer || !data.extracted?.asset) return 'asset_make';
      if (answer.toLowerCase().includes('off')) return 'asset_make';
      applyExtractedAsset(data);
      return 'asset_price';
    },
  },

  {
    id: 'asset_make',
    skipIf: (data) => !!data.application.asset?.assetMake,
    messages: ["What is the make?"],
    inputType: 'text',
    field: 'asset.assetMake',
    placeholder: "e.g. Toyota, Ford, Caterpillar",
    nextStep: 'asset_model',
  },

  {
    id: 'asset_model',
    skipIf: (data) => !!data.application.asset?.assetModel,
    messages: ["And the model?"],
    inputType: 'text',
    field: 'asset.assetModel',
    placeholder: "e.g. Hilux SR5, Ranger Wildtrak, 320D",
    nextStep: 'asset_year',
  },

  {
    id: 'asset_year',
    skipIf: (data) => !!data.application.asset?.assetYear,
    messages: ["What year is it?"],
    inputType: 'number',
    field: 'asset.assetYear',
    placeholder: "e.g. 2024",
    validate: (value) => {
      const year = parseInt(value, 10);
      const maxYear = new Date().getFullYear() + 1;
      if (isNaN(year) || year < 1990 || year > maxYear) {
        return `Enter a year between 1990 and ${maxYear}.`;
      }
      return null;
    },
    nextStep: 'asset_supplier',
  },

  {
    id: 'asset_supplier',
    skipIf: (data) => !!data.application.asset?.supplierName,
    messages: ["Who are you buying it from? A dealer name, or private sale."],
    inputType: 'text',
    field: 'asset.supplierName',
    placeholder: "e.g. City Toyota, Private Sale",
    nextStep: 'asset_price',
  },

  {
    id: 'asset_price',
    skipIf: (data) => Number(data.application.asset?.assetPriceIncGst) > 0,
    messages: ["What is the price including GST?"],
    inputType: 'number',
    field: 'asset.assetPriceIncGst',
    placeholder: "e.g. 75000 or 75k",
    validate: validateAmount,
    nextStep: 'asset_condition_q',
  },

  {
    id: 'asset_condition_q',
    // Only skipped when the quote told us the condition and the applicant confirmed it
    skipIf: (data) => !!data.extractedApplied?.asset && !!data.extracted?.asset?.condition,
    messages: ["Is it new, a demo, or used?"],
    inputType: 'select',
    options: ["New", "Demo", "Used"],
    field: 'asset.assetCondition',
    nextStep: 'show_estimate',
  },

  {
    id: 'show_estimate',
    // calculate_quote is a PRE_RENDER action, so the numbers below are already current
    action: 'calculate_quote',
    messages: (data) => {
      const quote = data.quote;
      if (!quote) {
        return [
          "I cannot price that just yet. We will confirm the numbers at the review step.",
          "Ready to keep going?"
        ];
      }
      const weekly = quote.weeklyRepayment || (quote.monthlyRepayment * 12) / 52;
      return [
        `Indicative repayment: about ${formatMoney(quote.monthlyRepayment)} per month (${formatMoney(weekly)} per week) at ${quote.indicativeRate.toFixed(2)}% p.a. lender base rate over ${termLabel(data)}.`,
        `That includes the flat ${formatMoney(PLATFORM_FEE)} AssetMX fee and the ${formatMoney(LENDER_ESTABLISHMENT_FEE)} lender establishment fee financed into the loan.`,
        "Indicative only, not an offer of credit."
      ];
    },
    inputType: 'select',
    options: ["Continue", "Save for later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later') || answer.toLowerCase().includes('save')) {
        return 'save_for_later';
      }
      return 'loan_term';
    },
  },

  {
    id: 'save_for_later',
    messages: ["Progress saved. Come back any time to pick up where you left off."],
    inputType: 'confirm',
    options: ["Done"],
    nextStep: 'end_saved',
  },

  // ========== PHASE 4: LOAN STRUCTURE ==========
  {
    id: 'loan_term',
    messages: ["Over how long would you like to pay it off?"],
    inputType: 'select',
    options: ["1 year", "2 years", "3 years", "4 years", "5 years", "7 years"],
    field: 'loan.termMonths',
    nextStep: 'balloon_preference',
  },

  {
    id: 'balloon_preference',
    messages: (data) => {
      const maxBalloon = getMaxBalloon(currentTermMonths(data));
      return [`Would you like a balloon at the end? For this term the cap is ${maxBalloon} percent.`];
    },
    inputType: 'select',
    options: (data) => {
      const maxBalloon = getMaxBalloon(currentTermMonths(data));
      const options = ["No balloon"];
      for (let pct = 10; pct <= maxBalloon; pct += 10) {
        options.push(`${pct} percent`);
      }
      options.push("What is a balloon?");
      return options;
    },
    // No `field` here on purpose: the explainer option must not overwrite the percentage.
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('what is a balloon')) {
        return 'balloon_explain';
      }
      const match = answer.match(/(\d+)/);
      const pct = match ? parseInt(match[1], 10) : 0;
      setLoanValue(data, 'balloonPercentage', Math.min(pct, getMaxBalloon(currentTermMonths(data))));
      return 'deposit_amount';
    },
  },

  {
    id: 'balloon_explain',
    messages: (data) => {
      const maxBalloon = getMaxBalloon(currentTermMonths(data));
      return [
        `A balloon is a lump sum left owing at the end of the loan. No balloon means a higher monthly payment and you own it outright at the end. A balloon of up to ${maxBalloon} percent lowers the monthly payment, but you owe that amount at the end and can refinance it, pay it out, or trade the asset in.`
      ];
    },
    inputType: 'confirm',
    options: [],
    nextStep: 'balloon_preference',
  },

  {
    id: 'deposit_amount',
    messages: ["How much deposit or trade-in are you putting in?"],
    inputType: 'number',
    field: 'loan.depositAmount',
    placeholder: "Enter 0 for none",
    validate: (value, data) => {
      // A typed "no" is routed to the lead capture branch by nextStep below
      if (value.trim().toLowerCase() === 'no') return null;

      const deposit = parseAmount(value);
      if (!Number.isFinite(deposit)) {
        return "Enter the deposit as a number, for example 10000 or 10k. Enter 0 for none.";
      }
      if (deposit < 0) {
        return "The deposit cannot be less than zero.";
      }
      const price = Number(data.application.asset?.assetPriceIncGst) || 0;
      const maxDeposit = price - 5000;
      if (price > 0 && deposit > maxDeposit) {
        return maxDeposit <= 0
          ? `We finance a minimum of ${formatMoney(5000)}, so we cannot take a deposit on a ${formatMoney(price)} asset.`
          : `We finance a minimum of ${formatMoney(5000)}, so on a ${formatMoney(price)} asset the most you can put in is ${formatMoney(maxDeposit)}.`;
      }
      if (!data.eligibility?.ownsProperty && price > 0 && deposit < price * 0.2) {
        return `Without property, the lender needs at least 20 percent (${formatMoney(Math.round(price * 0.2))}). Enter a deposit of at least that, or type 'no' to leave your details instead.`;
      }
      return null;
    },
    nextStep: (answer, data) => {
      if (answer.trim().toLowerCase() === 'no') {
        setLoanValue(data, 'depositAmount', 0);
        return 'eligibility_no_security';
      }
      return 'document_upload';
    },
  },

  // ========== PHASE 5: IDENTITY ==========
  {
    id: 'document_upload',
    messages: ["Next, your driver licence. Upload a clear photo of the front and I will read your name, date of birth and address from it."],
    inputType: 'file_upload',
    options: [],
    nextStep: 'identity_confirm',
  },

  {
    id: 'identity_confirm',
    // extract_licence has to be listed in the hook's PRE_RENDER_ACTIONS, and there is no
    // skipIf for the same reason as asset_confirm (skipIf runs before the action).
    action: 'extract_licence',
    messages: (data) => {
      const l = data.extracted?.licence;
      if (!l) return ["I could not read that licence, so I will ask you instead."];

      const lines: string[] = [];
      const fullName = l.fullName || [l.firstName, l.lastName].filter(Boolean).join(' ').trim();
      if (fullName) lines.push(fullName);
      if (l.dateOfBirth) lines.push(`Born ${l.dateOfBirth}`);
      if (l.address) lines.push(l.address);
      if (l.licenceNumber) lines.push(`Licence ${l.licenceNumber}${l.state ? ` (${l.state})` : ''}`);

      return [
        `Here is what I have:\n\n${lines.join('\n')}`,
        "Is that right?"
      ];
    },
    inputType: 'select',
    options: (data) => (data.extracted?.licence ? ["Yes, that is right", "Something is off"] : []),
    nextStep: (answer, data) => {
      if (!answer || !data.extracted?.licence) return 'identity_name';
      if (answer.toLowerCase().includes('off')) return 'identity_name';
      applyExtractedLicence(data);
      return 'director_intro';
    },
  },

  {
    id: 'identity_name',
    skipIf: hasDirectorName,
    messages: ["What is your full name, as it appears on your licence?"],
    inputType: 'text',
    // Stored as a single fullName. The nextStep below also splits it into firstName and
    // lastName, which is what the submission payload reads.
    field: 'directors.directors.0.fullName',
    placeholder: "e.g. Jane Marie Smith",
    nextStep: (answer, data) => {
      const { firstName, lastName } = splitFullName(answer);
      const director = getDirector(data, 0);
      director.firstName = firstName;
      director.lastName = lastName;
      return 'identity_dob';
    },
  },

  {
    id: 'identity_dob',
    skipIf: (data) => !!data.application.directors?.directors?.[0]?.dob,
    messages: ["And your date of birth?"],
    inputType: 'date',
    field: 'directors.directors.0.dateOfBirth',
    // ChatInput renders inputType 'date' as a native date picker, so the placeholder is
    // only ever seen as the field label on browsers that show one.
    placeholder: "Your date of birth",
    nextStep: (answer, data) => {
      // Keep the canonical dob field the submission payload reads in step
      getDirector(data, 0).dob = answer;
      return 'identity_address';
    },
  },

  {
    id: 'identity_address',
    skipIf: (data) => !!data.application.directors?.directors?.[0]?.address,
    messages: ["And your residential address?"],
    inputType: 'text',
    field: 'directors.directors.0.address',
    placeholder: "e.g. 12 Smith St, Richmond VIC 3121",
    nextStep: (answer, data) => {
      getDirector(data, 0).residentialAddress = answer;
      return 'director_intro';
    },
  },

  // ========== PHASE 6: CONTACT AND DECLARATIONS ==========
  {
    id: 'director_intro',
    messages: ["What is the best email for you?"],
    inputType: 'email',
    field: 'directors.directors.0.email',
    placeholder: "your@email.com",
    validate: validateEmail,
    nextStep: 'director_phone',
  },

  {
    id: 'director_phone',
    messages: ["And your mobile number?"],
    inputType: 'phone',
    field: 'directors.directors.0.phone',
    placeholder: "04XX XXX XXX",
    validate: validatePhone,
    nextStep: 'address_duration',
  },

  {
    id: 'address_duration',
    messages: ["How long have you been at your current address?"],
    inputType: 'select',
    options: ["Less than 6 months", "6-12 months", "1-2 years", "2+ years"],
    // Stored as a number of months via mapOptionToValue
    field: 'directors.directors.0.addressMonths',
    nextStep: (answer) => {
      if (addressAnswerToMonths(answer) < 24) {
        return 'previous_address';
      }
      return 'credit_declaration';
    },
  },

  {
    id: 'previous_address',
    skipIf: (data) => Number(data.application.directors?.directors?.[0]?.addressMonths) >= 24,
    messages: ["What was your previous address?"],
    inputType: 'text',
    field: 'directors.directors.0.previousAddress',
    placeholder: "e.g. 123 Smith St, Richmond VIC 3121",
    nextStep: 'credit_declaration',
  },

  {
    id: 'credit_declaration',
    messages: ["Any defaults, judgments or bankruptcies against you or the business in the last five years?"],
    inputType: 'select',
    options: ["No, all clear", "Yes, something to declare"],
    // Written from nextStep: the hook coerces eligibility fields to booleans
    nextStep: (answer, data) => {
      if (answer.toLowerCase().startsWith('yes')) {
        setEligibility(data, { creditDeclaration: 'declare' });
        return 'credit_details';
      }
      setEligibility(data, { creditDeclaration: 'clear' });
      return 'more_directors';
    },
  },

  {
    id: 'credit_details',
    messages: ["Tell me briefly what happened."],
    inputType: 'text',
    placeholder: "A sentence is plenty",
    // Written from nextStep for the same reason as credit_declaration
    nextStep: (answer, data) => {
      setEligibility(data, { creditDetails: answer });
      return 'more_directors';
    },
  },

  {
    id: 'more_directors',
    skipIf: (data) => {
      const entityType = data.abnLookup?.entityType?.toLowerCase() || '';
      return entityType.includes('sole_trader') || entityType.includes('sole trader') || entityType.includes('individual');
    },
    messages: ["Are there other directors or guarantors?"],
    inputType: 'select',
    options: ["Just me", "Yes, add another"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('another')) {
        return 'additional_director_email_request';
      }
      return 'final_review';
    },
  },

  {
    id: 'additional_director_email_request',
    messages: ["Their email. We will send them a short form to complete."],
    inputType: 'email',
    field: 'directors.directors.1.email',
    placeholder: "their@email.com",
    validate: validateEmail,
    nextStep: 'additional_director_email_sent',
  },

  {
    id: 'additional_director_email_sent',
    messages: [
      "Sent. They will get an email with a link to complete their details.",
      "We can keep going, and I will let you know when they are done."
    ],
    inputType: 'confirm',
    options: [],
    action: 'send_director_form',
    nextStep: 'final_review',
  },

  // ========== PHASE 7: REVIEW AND SUBMIT ==========
  {
    id: 'final_review',
    messages: [
      "Here is everything so far.",
      "📋 SUMMARY_CARD"  // Special token that triggers the summary card render
    ],
    inputType: 'select',
    options: ["Looks good", "Edit details"],
    action: 'calculate_quote',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('edit')) {
        return 'edit_choice';
      }
      return 'privacy_consent';
    },
  },

  {
    id: 'edit_choice',
    messages: ["Which part would you like to change?"],
    inputType: 'select',
    options: ["Business details", "Asset", "Loan", "My details", "Back to review"],
    nextStep: (answer) => {
      const a = answer.toLowerCase();
      // Re-enter the business section without wiping the application
      if (a.includes('business')) return 'abn_manual_entry';
      if (a.includes('asset')) return 'asset_purchased_check';
      if (a.includes('loan')) return 'loan_term';
      if (a.includes('my details')) return 'document_upload';
      return 'final_review';
    },
  },

  {
    id: 'privacy_consent',
    messages: [
      "Before you submit: we share your identity, business and asset details, and any bank statements we ask for later, with our lender panel and with credit reporting bodies. Submitting means a credit enquiry is made."
    ],
    inputType: 'select',
    options: ["I agree", "Not now"],
    field: 'consent',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('not now')) {
        return 'save_for_later';
      }
      return 'submission_complete';
    },
  },

  {
    id: 'submission_complete',
    // The submit_application action runs before these messages render (see
    // processStepMessages), so the copy can report the real outcome.
    messages: (data) => {
      if (data.submittedApplicationId) {
        return ["Sending your application to the lender panel now."];
      }
      return [
        "Something went wrong sending your application. Nothing has been lost, tap Retry to send it again.",
      ];
    },
    inputType: 'confirm',
    options: (data) => (data.submittedApplicationId ? [] : ["Retry"]),
    action: 'submit_application',
    nextStep: (_answer, data) => (data.submittedApplicationId ? 'end_complete' : 'submission_complete'),
  },

  // ========== END STATES ==========
  {
    id: 'end_complete',
    messages: (data) => [
      `Application submitted. Reference ${data.submittedApplicationId || 'pending'}.`,
      "Conditional approval is typically the same business day for in-policy applications.",
      "We will send a secure link for your bank statements, and your lender may email an affordability declaration to sign."
    ],
    inputType: 'select',
    options: ["Back to home"],
    nextStep: 'end_complete',
  },

  {
    id: 'end_saved',
    messages: ["Your progress has been saved. You can come back any time to continue."],
    inputType: 'select',
    options: ["Start a new enquiry", "I am done for now"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_saved';
    },
  },

  // ========== LEAD CAPTURE FLOW ==========
  {
    id: 'lead_capture_asset_type',
    messages: ["Before we save your details, what type of asset are you looking to finance?"],
    inputType: 'select',
    options: ["Vehicle", "Truck/Trailer", "Equipment", "Other"],
    field: 'lead.assetType',
    nextStep: 'lead_capture_amount',
  },

  {
    id: 'lead_capture_amount',
    messages: ["And roughly how much are you looking to borrow?"],
    inputType: 'select',
    options: ["Under $30k", "$30k - $75k", "$75k - $150k", "Over $150k"],
    field: 'lead.loanAmount',
    nextStep: 'lead_capture_name',
  },

  {
    id: 'lead_capture_name',
    messages: ["What is your name?"],
    inputType: 'text',
    field: 'lead.name',
    placeholder: "Your name",
    nextStep: 'lead_capture_phone',
  },

  {
    id: 'lead_capture_phone',
    messages: ["Best number to reach you?"],
    inputType: 'phone',
    field: 'lead.phone',
    placeholder: "04XX XXX XXX",
    validate: (value) => {
      if (value.toLowerCase() === 'skip' || value.toLowerCase() === 'email only') {
        return null;
      }
      return validatePhone(value);
    },
    options: ["Skip - email only"],
    nextStep: 'lead_capture_email',
  },

  {
    id: 'lead_capture_email',
    messages: ["And your email address?"],
    inputType: 'email',
    field: 'lead.email',
    placeholder: "your@email.com",
    validate: validateEmail,
    nextStep: 'lead_capture_consent',
  },

  {
    id: 'lead_capture_consent',
    messages: [
      "We only work with partners who look after our clients.",
      "Can we share your details with a partner who may be able to help?",
      "Rates and terms may vary depending on your circumstances."
    ],
    inputType: 'select',
    options: ["Yes, that is fine", "No, contact me directly"],
    field: 'lead.consentToShare',
    nextStep: 'lead_capture_complete',
  },

  {
    id: 'lead_capture_complete',
    messages: (data) => {
      if (data.lead?.consentToShare) {
        return ["Thanks. Our team or one of our partners will be in touch within one business day."];
      }
      return ["No problem. Our team will contact you within one business day."];
    },
    inputType: 'select',
    options: ["Done", "Start a new enquiry"],
    action: 'save_lead',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_lead_captured';
    },
  },

  {
    id: 'end_lead_captured',
    messages: ["Thanks for your enquiry. Is there anything else we can help with?"],
    inputType: 'select',
    options: ["Start a new enquiry", "No, I am done"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_lead_captured';
    },
  },
];

// Helper to get a step by ID
export function getStep(stepId: string): ChatStep | undefined {
  return CHAT_FLOW.find(step => step.id === stepId);
}

// Helper to map select option to field value
export function mapOptionToValue(option: string, field: string): string | number {
  const o = option.toLowerCase();

  // Asset type mapping
  if (field === 'asset.assetType') {
    if (o.includes('truck') || o.includes('trailer')) return 'truck';
    if (o.includes('equipment') || o.includes('machinery')) return 'equipment';
    // "Car, ute or van" and "Electric vehicle" are both financed as vehicles
    if (o.includes('car') || o.includes('ute') || o.includes('van') || o.includes('vehicle') || o.includes('electric')) return 'vehicle';
  }

  // Asset condition mapping
  if (field === 'asset.assetCondition') {
    if (o.includes('demo')) return 'demo';
    if (o.includes('new')) return 'new';
    if (o.includes('used')) return 'used_0_3';
  }

  // Loan term mapping
  if (field === 'loan.termMonths') {
    const match = option.match(/(\d+)\s*year/i);
    if (match) return parseInt(match[1], 10) * 12;
  }

  // Address duration mapping (stored as months)
  if (field.endsWith('.addressMonths')) {
    return addressAnswerToMonths(option);
  }

  // Balloon mapping. balloon_preference writes the value from its nextStep so the
  // explainer option cannot overwrite it; this stays for the calculator hand-off.
  if (field === 'loan.balloonPercentage') {
    if (o.includes('no balloon')) return 0;
    const percentMatch = option.match(/(\d+)/);
    if (percentMatch) return parseInt(percentMatch[1], 10);
    return 0;
  }

  // Security position. The hook stores eligibility fields as booleans; this keeps the
  // mapping honest for any other caller.
  if (field === 'eligibility.ownsProperty' || field === 'eligibility.canDeposit20') {
    return o.startsWith('yes') ? 'true' : 'false';
  }

  // Credit declaration
  if (field === 'eligibility.creditDeclaration') {
    return o.startsWith('yes') ? 'declare' : 'clear';
  }

  // Privacy consent
  if (field === 'consent' || field === 'application.consent') {
    return o.includes('agree') ? 'agreed' : 'declined';
  }

  return option;
}

// Get step number for progress. Every step on a main path has an entry, so the bar
// never snaps back to 1; the total is derived from the map rather than hard-coded.
const PROGRESS_MAP: Record<string, number> = {
  // Business lookup
  'resume_choice': 1,
  'greeting': 1,
  'abn_search_results': 2,
  'abn_confirm_lookup': 2,
  'abn_manual_entry': 2,
  'abn_manual_lookup': 2,
  'abn_result': 3,
  'abn_retry': 3,
  'abn_too_young': 3,
  'abn_unverified': 3,
  'no_gst_warning': 3,
  // Security position
  'eligibility_property': 4,
  'eligibility_deposit': 4,
  'eligibility_no_security': 4,
  // Asset
  'asset_type': 5,
  'ev_use_type': 5,
  'asset_purchased_check': 6,
  'asset_upload_quote': 6,
  'asset_describe': 6,
  'asset_confirm': 7,
  'asset_make': 7,
  'asset_model': 7,
  'asset_year': 7,
  'asset_supplier': 7,
  'asset_price': 8,
  'asset_condition_q': 8,
  'show_estimate': 9,
  'save_for_later': 9,
  // Loan structure
  'loan_term': 10,
  'balloon_preference': 11,
  'balloon_explain': 11,
  'deposit_amount': 12,
  // Identity
  'document_upload': 13,
  'identity_confirm': 14,
  'identity_name': 14,
  'identity_dob': 14,
  'identity_address': 14,
  // Contact and declarations
  'director_intro': 15,
  'director_phone': 16,
  'address_duration': 17,
  'previous_address': 17,
  'credit_declaration': 18,
  'credit_details': 18,
  'more_directors': 19,
  'additional_director_email_request': 19,
  'additional_director_email_sent': 19,
  // Review and submit
  'final_review': 20,
  'edit_choice': 20,
  'privacy_consent': 21,
  'submission_complete': 22,
  // Lead capture branch
  'lead_capture_asset_type': 5,
  'lead_capture_amount': 5,
  'lead_capture_name': 6,
  'lead_capture_phone': 6,
  'lead_capture_email': 6,
  'lead_capture_consent': 7,
  'lead_capture_complete': 7,
  // EV novated branch
  'ev_novated_capture': 6,
  'ev_novated_phone': 6,
  'ev_novated_email': 6,
  'ev_novated_complete': 7,
  // End states
  'end_complete': 23,
  'end_saved': 23,
  'end_lead_captured': 23,
};

const PROGRESS_TOTAL = Math.max(...Object.values(PROGRESS_MAP));

export function getStepProgress(stepId: string): { current: number; total: number } {
  return {
    current: PROGRESS_MAP[stepId] || 1,
    total: PROGRESS_TOTAL,
  };
}
