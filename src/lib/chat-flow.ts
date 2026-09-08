// Chat Flow Engine - Defines the conversational application flow
// Each step represents a point in the conversation

import { validateABN, cleanABN, type ABNSearchResult } from './abn-lookup';
import { getMaxBalloon, PLATFORM_FEE, LENDER_ESTABLISHMENT_FEE } from './calculator';
import type { ApplicationData } from '@/types/application';

export type InputType = 'text' | 'select' | 'number' | 'date' | 'email' | 'phone' | 'confirm' | 'abn_select' | 'file_upload';

export type ChatAction = 'abn_lookup' | 'abn_search' | 'calculate_quote' | 'check_eligibility' | 'submit_application' | 'save_lead' | 'save_novated_lead' | 'send_director_form';

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
    reason?: string;  // Why they didn't qualify
    consentToShare?: boolean;  // Permission to share with partner brokers
    assetType?: string;  // What type of asset they want
    loanAmount?: string;  // Rough loan amount range
  };
  // Eligibility tracking
  eligibility?: {
    ownsProperty?: boolean;
    canDeposit20?: boolean;
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

// Calculate years since a date
const yearsSince = (dateStr: string): number => {
  const date = parseDate(dateStr);
  if (!date) {
    console.warn('[Chat] yearsSince: Invalid date string:', dateStr);
    return 0;
  }
  const now = new Date();
  const years = (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  console.log('[Chat] yearsSince:', { dateStr, parsedDate: date.toISOString(), years });
  return Math.floor(years);
};

// Calculate whole months since a date (used for the ABN/GST age messages)
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
    return "Invalid email format. Please re-enter.";
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) {
    return "Phone number must be 10 digits.";
  }
  return null;
};

const validateAmount = (value: string): string | null => {
  // Accepts the formats the placeholders advertise: 75000, 75k, 75,000, $75 000
  const amount = parseAmount(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter amount as a number (e.g. 75000 or 75k).";
  }
  if (amount < 5000) {
    return "Minimum finance amount: $5,000.";
  }
  if (amount > 500000) {
    return "For amounts over $500k, contact us directly.";
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

// The conversation flow definition
export const CHAT_FLOW: ChatStep[] = [
  // ========== PHASE 1: GREETING & BUSINESS LOOKUP ==========
  {
    id: 'greeting',
    messages: [
      "I'm the AssetMX Express Assistant.",
      "I'll check your eligibility and guide you through the application.",
      "Because it is all online, there is one flat $800 fee and no commission built into your rate - you see the lender's base rate as it is.",
      "Let's start - what's your business name?"
    ],
    inputType: 'text',
    field: 'business.businessName',
    placeholder: "e.g. Smith Plumbing, ABC Transport",
    validate: (value) => {
      if (!value || value.trim().length < 2) {
        return "Just need at least a couple of characters to search.";
      }
      return null;
    },
    action: 'abn_search',
    nextStep: 'abn_search_results',
  },

  {
    id: 'abn_search_results',
    messages: (data) => {
      if (!data.abnSearchResults || data.abnSearchResults.length === 0) {
        return [
          "Hmm, I couldn't find any businesses with that name.",
          "No worries - you can enter your ABN directly if you have it handy."
        ];
      }
      return [
        "Let me search for that...",
        "Found some matches! Is your business one of these?"
      ];
    },
    inputType: 'abn_select',
    options: (data) => {
      if (!data.abnSearchResults || data.abnSearchResults.length === 0) {
        return ["Enter ABN manually", "Try a different name"];
      }
      // Build options from search results (up to 3) plus manual entry option
      const businessOptions = data.abnSearchResults.slice(0, 3).map(result =>
        `${result.entityName} (${result.state}) - ABN: ${result.abn}`
      );
      return [...businessOptions, "None of these - enter ABN manually"];
    },
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('different name') || answer.toLowerCase().includes('try')) {
        return 'greeting';
      }
      if (answer.toLowerCase().includes('manually') || answer.toLowerCase().includes('enter abn')) {
        return 'abn_manual_entry';
      }
      // User selected a business from the list - extract ABN and look it up
      const abnMatch = answer.match(/ABN:\s*([\d\s]+)/);
      if (abnMatch) {
        return 'abn_confirm_lookup';
      }
      return 'abn_manual_entry';
    },
  },

  {
    id: 'abn_confirm_lookup',
    messages: ["Great choice! Let me grab the full details..."],
    inputType: 'confirm',
    options: [],
    action: 'abn_lookup',
    nextStep: 'abn_result',
  },

  {
    id: 'abn_manual_entry',
    messages: ["No worries! What's your ABN?"],
    inputType: 'text',
    field: 'business.abn',
    placeholder: 'Enter your 11-digit ABN',
    validate: (value) => {
      const cleaned = cleanABN(value);
      if (!validateABN(cleaned)) {
        return "That ABN doesn't look quite right. It should be 11 digits - have another crack?";
      }
      return null;
    },
    nextStep: 'abn_manual_lookup',
  },

  {
    id: 'abn_manual_lookup',
    messages: ["Thanks, just grabbing the details..."],
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
          "Hmm, I couldn't find that ABN in the register.",
          "Double-check the number and try again?"
        ];
      }
      const years = yearsSince(data.abnLookup.abnRegisteredDate);
      const gstStatus = data.abnLookup.gstRegistered ? 'GST registered ✓' : 'Not GST registered';

      // Build trading history string - handle missing dates gracefully
      let tradingInfo = '';
      if (data.abnLookup.abnRegisteredDate && years > 0) {
        tradingInfo = `Trading since ${formatDate(data.abnLookup.abnRegisteredDate)} (${years} year${years !== 1 ? 's' : ''})`;
      } else if (data.abnLookup.abnRegisteredDate) {
        tradingInfo = `Trading since ${formatDate(data.abnLookup.abnRegisteredDate)}`;
      } else {
        tradingInfo = 'ABN Active';
      }

      return [
        `✅ Found it!\n\n${data.abnLookup.entityName}\n${tradingInfo}\n${gstStatus}`,
        "Is this your business?"
      ];
    },
    inputType: 'select',
    options: ["Yep that's me", "Nah, wrong one"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('nah') || answer.toLowerCase().includes('wrong') || answer.toLowerCase().includes('no')) {
        return 'abn_retry';
      }
      // Check eligibility - ABN 2+ years
      if (!data.abnLookup) return 'abn_retry';

      // Trading history is a hard requirement - if the register gave us no date we cannot
      // verify it, so fail closed rather than letting the applicant through unchecked.
      if (!data.abnLookup.abnRegisteredDate) {
        return 'abn_unverified';
      }
      const abnYears = yearsSince(data.abnLookup.abnRegisteredDate);
      if (abnYears < 2) return 'abn_too_young';

      // Check GST registration
      if (!data.abnLookup.gstRegistered) return 'no_gst_warning';

      // Check GST 2+ years (only if we have the date)
      if (data.abnLookup.gstRegisteredDate) {
        const gstYears = yearsSince(data.abnLookup.gstRegisteredDate);
        if (gstYears < 2) return 'gst_too_young';
      }
      return 'eligibility_pass';
    },
  },

  {
    id: 'abn_unverified',
    messages: [
      "We could not confirm your trading history from the register.",
      "We need to verify this manually before we can continue online.",
      "Leave your details and our team will check it for you?"
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
    messages: ["No worries! How would you like to find your business?"],
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
        `Your ABN is ${months} months old.`,
        "AssetMX Express requires 2+ years ABN registration.",
        "You don't qualify for this product, but our team may have other options. Leave your details?"
      ];
    },
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      const months = data.abnLookup ? monthsSince(data.abnLookup.abnRegisteredDate) : 0;
      data.lead = { ...(data.lead || {}), reason: `ABN only ${months} months old (need 2+ years)` };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'gst_too_young',
    messages: (data) => {
      const gstMonths = data.abnLookup?.gstRegisteredDate ? monthsSince(data.abnLookup.gstRegisteredDate) : 0;
      return [
        `GST registration: ${gstMonths} months.`,
        "AssetMX Express requires 2+ years GST registration.",
        "You don't qualify for this product. Leave details for manual review?"
      ];
    },
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      const gstMonths = data.abnLookup?.gstRegisteredDate ? monthsSince(data.abnLookup.gstRegisteredDate) : 0;
      data.lead = { ...(data.lead || {}), reason: `GST registration only ${gstMonths} months (need 2+ years)` };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'no_gst_warning',
    messages: [
      "GST registration not found.",
      "AssetMX Express requires GST registration.",
      "If this is incorrect, re-enter your ABN. Otherwise, leave details for manual review."
    ],
    inputType: 'select',
    options: ["Re-enter ABN", "I'm not GST registered"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('re-enter') || answer.toLowerCase().includes('abn')) {
        return 'abn_retry';
      }
      // Auto-set reason for disqualification
      data.lead = { ...(data.lead || {}), reason: 'Not GST registered' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'eligibility_pass',
    // Only tick the checks that actually ran against register data
    messages: (data) => {
      const lines: string[] = [];
      if (data.abnLookup?.abnRegisteredDate) {
        lines.push(`✓ ABN check: Passed (${monthsSince(data.abnLookup.abnRegisteredDate)} months trading)`);
      }
      if (data.abnLookup?.gstRegistered) {
        lines.push(data.abnLookup.gstRegisteredDate
          ? `✓ GST check: Passed (registered ${monthsSince(data.abnLookup.gstRegisteredDate)} months)`
          : "✓ GST check: Registered for GST");
      }
      lines.push("You meet AssetMX Express business requirements. Now let's check the asset.");
      return lines;
    },
    inputType: 'confirm',
    options: [],
    nextStep: 'eligibility_asset_type',
  },

  // ========== ELIGIBILITY PRE-QUALIFICATION ==========
  {
    id: 'eligibility_asset_type',
    messages: ["What type of asset are you looking to finance?"],
    inputType: 'select',
    options: [
      "Vehicle (ute, van, car)",
      "Electric Vehicle (EV)",
      "Truck or trailer",
      "Construction equipment (excavator, loader, etc.)",
      "Other mobile equipment",
      "Fixed/installed equipment"
    ],
    field: 'asset.assetType',
    nextStep: (answer) => {
      // Fixed/installed assets go to lead bucket
      if (answer.toLowerCase().includes('fixed') || answer.toLowerCase().includes('installed')) {
        return 'eligibility_fixed_asset';
      }
      // EVs need to check if business or novated
      if (answer.toLowerCase().includes('electric') || answer.toLowerCase().includes('ev')) {
        return 'ev_use_type';
      }
      return 'eligibility_asset_age';
    },
  },

  // EV-specific routing - business vs novated lease
  {
    id: 'ev_use_type',
    messages: [
      "All the hype around EVs is novated leasing - but did you know switching to an EV for your business vehicle has huge benefits too?",
      "• Business use: GST credits and depreciation, with the same flat $800 fee.",
      "• Personal use: novated leasing through millarX - FBT concessions may apply to eligible EVs, and the millarX team will confirm what applies to you.",
      "Which applies to you?"
    ],
    inputType: 'select',
    options: ["Business use (company vehicle)", "Novated lease (personal/salary sacrifice)"],
    field: 'asset.evUseType',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('novated') || answer.toLowerCase().includes('personal') || answer.toLowerCase().includes('salary')) {
        return 'ev_novated_capture';
      }
      // Business EV continues through normal flow
      return 'eligibility_asset_age';
    },
  },

  // Novated lease enquiries go to millarX lead bucket
  {
    id: 'ev_novated_capture',
    messages: [
      "Novated leasing is handled by millarX, our sister company.",
      "They handle everything - employer setup, salary packaging, running costs, FBT exemptions.",
      "I'll pass your details to the millarX team. What's your name?"
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
      "The millarX team will be in touch within one business day to discuss your novated lease options.",
      "They'll explain FBT exemptions, salary packaging setup, and running cost bundles."
    ],
    inputType: 'confirm',
    options: ["Done"],
    action: 'save_novated_lead',
    nextStep: 'end_lead_captured',
  },

  {
    id: 'eligibility_fixed_asset',
    messages: [
      "Fixed/installed equipment doesn't qualify for AssetMX Express.",
      "This requires manual assessment. Leave your details?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      data.lead = { ...(data.lead || {}), reason: 'Fixed/installed equipment (not mobile asset)' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'eligibility_asset_age',
    messages: [
      "The asset needs to be no more than 15 years old at the end of the loan term.",
      "How old is the asset now?"
    ],
    inputType: 'select',
    options: ["Under 10 years", "10 to 15 years", "Over 15 years"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('over')) {
        return 'eligibility_older_asset';
      }
      return 'eligibility_property';
    },
  },

  {
    id: 'eligibility_older_asset',
    messages: [
      "Assets over 15 years old sit outside our low-doc lender policy.",
      "Leave your details for manual review?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      data.lead = { ...(data.lead || {}), reason: 'Asset too old (over 15 years)' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'eligibility_property',
    messages: [
      "AssetMX Express has two tracks:",
      "• Property owners: No deposit required",
      "• Non-property owners: 20% deposit required",
      "Do you own property in Australia?"
    ],
    inputType: 'select',
    options: ["Yes, I own property", "No property"],
    field: 'eligibility.ownsProperty',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('no')) {
        return 'eligibility_deposit';
      }
      return 'eligibility_loan_amount';
    },
  },

  {
    id: 'eligibility_deposit',
    messages: [
      "Without property, AssetMX Express requires 20% deposit.",
      "Can you provide 20% deposit?"
    ],
    inputType: 'select',
    options: ["Yes, 20% or more", "Less than 20%"],
    field: 'eligibility.canDeposit20',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('less')) {
        return 'eligibility_no_security';
      }
      return 'eligibility_loan_amount';
    },
  },

  {
    id: 'eligibility_no_security',
    messages: [
      "AssetMX Express requires either property ownership OR 20% deposit.",
      "You don't meet these requirements. Leave details for other options?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      data.lead = { ...(data.lead || {}), reason: 'No property security and unable to provide 20% deposit' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'eligibility_loan_amount',
    messages: [
      "We finance from $5,000 to $500,000.",
      "What's your loan amount?"
    ],
    inputType: 'select',
    options: ["$5k - $50k", "$50k - $150k", "$150k - $500k", "Over $500k"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('over')) {
        return 'eligibility_over_150k';
      }
      return 'eligibility_credit_check';
    },
  },

  {
    id: 'eligibility_over_150k',
    messages: [
      "Amounts over $500,000 sit outside our low-doc lender policy.",
      "Leave your details and we will assess it manually?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      data.lead = { ...(data.lead || {}), reason: 'Loan amount over $500k' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'eligibility_credit_check',
    messages: [
      "AssetMX Express requires clear credit.",
      "Any bankruptcies, defaults, or judgments in the last 5 years?"
    ],
    inputType: 'select',
    options: ["No, all clear", "Yes, there's something"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('yes') || answer.toLowerCase().includes('something')) {
        return 'eligibility_credit_issues';
      }
      return 'eligibility_qualified';
    },
  },

  {
    id: 'eligibility_credit_issues',
    messages: [
      "Credit issues exclude you from AssetMX Express.",
      "Leave details for specialist options?"
    ],
    inputType: 'select',
    options: ["Yes, take my details", "No thanks"],
    nextStep: (answer, data) => {
      if (answer.toLowerCase().includes('no')) {
        return 'end_saved';
      }
      // Auto-set reason for disqualification
      data.lead = { ...(data.lead || {}), reason: 'Credit history issues (bankruptcy, defaults, or judgments)' };
      return 'lead_capture_asset_type';
    },
  },

  {
    id: 'eligibility_qualified',
    messages: [
      "✓ All eligibility checks passed.",
      "You qualify for AssetMX Express. Proceeding to application."
    ],
    inputType: 'confirm',
    options: [],
    nextStep: 'asset_type_confirmed',
  },

  // ========== LEAD CAPTURE FLOW ==========
  // First capture what they're looking for and amount
  {
    id: 'lead_capture_asset_type',
    messages: ["Before we save your details - what type of asset are you looking to finance?"],
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
    messages: ["What's your name?"],
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
      // Allow skip option
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
      "We only work with trusted partners who look after our clients.",
      "Can we share your details with a partner who may be able to help with your finance needs?",
      "Note that rates and terms may vary depending on your circumstances."
    ],
    inputType: 'select',
    options: ["Yes, that's fine", "No, contact me directly"],
    field: 'lead.consentToShare',
    nextStep: 'lead_capture_complete',
  },

  {
    id: 'lead_capture_complete',
    messages: (data) => {
      const consented = data.lead?.consentToShare;
      if (consented) {
        return [
          "Great! Our team or one of our trusted partners will be in touch within one business day to discuss your options."
        ];
      }
      return [
        "No problem. Our team will contact you within one business day."
      ];
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
    messages: ["Thanks for your enquiry! Is there anything else we can help with?"],
    inputType: 'select',
    options: ["Start a new enquiry", "No, I'm done"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_lead_captured';
    },
  },

  // Continue with full application after eligibility check
  {
    id: 'asset_type_confirmed',
    messages: (data) => {
      const assetType = data.application.asset?.assetType || 'vehicle';
      const typeLabel = assetType === 'vehicle' ? 'Vehicle' :
                       assetType === 'truck' ? 'Truck' : 'Asset';
      return [`${typeLabel} selected. New or used?`];
    },
    inputType: 'select',
    options: ["Brand new", "Demo", "Used (0-3 years)"],
    field: 'asset.assetCondition',
    nextStep: 'asset_purchased_check',
  },

  // Check if they've already purchased or found the asset
  {
    id: 'asset_purchased_check',
    messages: (data) => {
      const assetType = data.application.asset?.assetType || 'vehicle';
      const typeLabel = assetType === 'vehicle' ? 'vehicle' :
                       assetType === 'truck' ? 'truck' : 'unit';
      return [`Have you already found the ${typeLabel} you want to buy?`];
    },
    inputType: 'select',
    options: ["Yes, I have a quote/invoice", "Yes, I know what I want", "Not yet, still looking"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('quote') || answer.toLowerCase().includes('invoice')) {
        return 'asset_upload_quote';
      }
      if (answer.toLowerCase().includes('know what')) {
        return 'asset_make';
      }
      return 'asset_price';
    },
  },

  // Upload quote/invoice path
  {
    id: 'asset_upload_quote',
    messages: [
      "Great! Please upload your quote or tax invoice.",
      "This helps us process your application faster."
    ],
    inputType: 'file_upload',
    options: [],
    nextStep: 'asset_price',
  },

  // Manual entry path - make
  {
    id: 'asset_make',
    messages: (data) => {
      const assetType = data.application.asset?.assetType || 'vehicle';
      const typeLabel = assetType === 'vehicle' ? 'vehicle' :
                       assetType === 'truck' ? 'truck' : 'equipment';
      return [`What's the make of the ${typeLabel}?`];
    },
    inputType: 'text',
    field: 'asset.assetMake',
    placeholder: "e.g. Toyota, Ford, Caterpillar",
    nextStep: 'asset_model',
  },

  {
    id: 'asset_model',
    messages: ["And the model?"],
    inputType: 'text',
    field: 'asset.assetModel',
    placeholder: "e.g. Hilux SR5, Ranger Wildtrak, 320D",
    nextStep: 'asset_year',
  },

  {
    id: 'asset_year',
    messages: ["What year is it?"],
    inputType: 'number',
    field: 'asset.assetYear',
    placeholder: "e.g. 2024",
    validate: (value) => {
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear - 3 || year > currentYear + 1) {
        return `Year must be between ${currentYear - 3} and ${currentYear + 1}`;
      }
      return null;
    },
    nextStep: 'asset_supplier',
  },

  {
    id: 'asset_supplier',
    messages: ["Where are you buying it from? (dealer name or 'private sale')"],
    inputType: 'text',
    field: 'asset.supplierName',
    placeholder: "e.g. City Toyota, Private Sale",
    nextStep: 'asset_price',
  },

  // ========== PHASE 2: ASSET DETAILS ==========
  {
    id: 'asset_condition',
    messages: (data) => {
      const assetType = data.application.asset?.assetType || 'asset';
      const typeLabel = assetType === 'vehicle' ? 'vehicle' :
                       assetType === 'truck' ? 'truck' :
                       assetType === 'equipment' ? 'equipment' : 'gear';
      return [`Nice! Is the ${typeLabel} new or used?`];
    },
    inputType: 'select',
    options: ["Brand new", "Demo", "Used (0-3 years)", "Used (4-7 years)", "Older (8+ years)"],
    field: 'asset.assetCondition',
    nextStep: 'asset_price',
  },

  {
    id: 'asset_price',
    messages: ["Asset price (approximate)?"],
    inputType: 'number',
    field: 'asset.assetPriceIncGst',
    placeholder: "e.g. 75000 or 75k",
    validate: validateAmount,
    nextStep: 'show_estimate',
  },

  {
    id: 'show_estimate',
    messages: (data) => {
      const price = data.application.asset?.assetPriceIncGst || 0;
      const quote = data.quote;
      if (!quote) {
        return [
          `Price: ${formatMoney(price)}`,
          "I can't price that just yet - we'll confirm the numbers at the review step.",
          "Continue to full application?"
        ];
      }
      return [
        `Price: ${formatMoney(price)}`,
        `Indicative repayment: ~${formatMoney(quote.monthlyRepayment)}/month (~${formatMoney(quote.weeklyRepayment || quote.monthlyRepayment / 4.33)}/week) at ${quote.indicativeRate.toFixed(2)}% p.a. lender base rate over ${termLabel(data)}.`,
        `That includes the flat ${formatMoney(PLATFORM_FEE)} AssetMX fee and the ${formatMoney(LENDER_ESTABLISHMENT_FEE)} lender establishment fee financed into the loan.`,
        "Indicative only - not an offer of credit.",
        "Continue to full application?"
      ];
    },
    inputType: 'select',
    options: ["Continue", "Save for later"],
    action: 'calculate_quote',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later') || answer.toLowerCase().includes('save')) {
        return 'save_for_later';
      }
      return 'director_intro';
    },
  },

  {
    id: 'save_for_later',
    messages: [
      "Progress saved. Return anytime to continue."
    ],
    inputType: 'confirm',
    options: ["Done"],
    nextStep: 'end_saved',
  },

  // ========== PHASE 3: DIRECTOR DETAILS ==========
  // Name, DOB, address come from driver's licence - we just need contact + A&L
  {
    id: 'director_intro',
    messages: [
      "Asset confirmed. Next: your details.",
      "Email address?"
    ],
    inputType: 'email',
    field: 'directors.directors.0.email',
    placeholder: "your@email.com",
    validate: validateEmail,
    nextStep: 'director_phone',
  },

  {
    id: 'director_phone',
    messages: ["Mobile number?"],
    inputType: 'phone',
    field: 'directors.directors.0.phone',
    placeholder: "04XX XXX XXX",
    validate: validatePhone,
    nextStep: 'director_assets',
  },

  // ========== INDIVIDUAL ASSET/LIABILITY COLLECTION ==========
  // Assets intro
  {
    id: 'director_assets',
    messages: [
      "Financial position check.",
      "I'll ask about your assets and any loans against them."
    ],
    inputType: 'select',
    options: ["Continue"],
    nextStep: 'asset_property',
  },

  // 1. Primary residence
  {
    id: 'asset_property',
    messages: ["Do you own your home?"],
    inputType: 'select',
    options: ["Yes", "No"],
    field: 'directors.directors.0.ownsProperty',
    nextStep: (answer) => {
      if (answer.toLowerCase() === 'yes') {
        return 'asset_property_value';
      }
      return 'asset_investment_property';
    },
  },

  {
    id: 'asset_property_value',
    messages: ["Estimated home value?"],
    inputType: 'number',
    field: 'directors.directors.0.propertyValue',
    placeholder: "e.g. 800000",
    nextStep: 'asset_property_mortgage',
  },

  {
    id: 'asset_property_mortgage',
    messages: ["Outstanding mortgage balance?"],
    inputType: 'number',
    field: 'directors.directors.0.mortgageBalance',
    placeholder: "e.g. 400000 (enter 0 if paid off)",
    nextStep: 'asset_investment_property',
  },

  // 2. Investment property
  {
    id: 'asset_investment_property',
    messages: ["Any investment properties?"],
    inputType: 'select',
    options: ["Yes", "No"],
    field: 'directors.directors.0.hasInvestmentProperty',
    nextStep: (answer) => {
      if (answer.toLowerCase() === 'yes') {
        return 'asset_investment_value';
      }
      return 'asset_vehicles';
    },
  },

  {
    id: 'asset_investment_value',
    messages: ["Total investment property value?"],
    inputType: 'number',
    field: 'directors.directors.0.investmentPropertyValue',
    placeholder: "e.g. 600000",
    nextStep: 'asset_investment_mortgage',
  },

  {
    id: 'asset_investment_mortgage',
    messages: ["Outstanding investment mortgage balance?"],
    inputType: 'number',
    field: 'directors.directors.0.investmentMortgageBalance',
    placeholder: "e.g. 450000 (enter 0 if paid off)",
    nextStep: 'asset_vehicles',
  },

  // 3. Vehicles
  {
    id: 'asset_vehicles',
    messages: ["Total value of vehicles you own?"],
    inputType: 'number',
    field: 'directors.directors.0.vehiclesValue',
    placeholder: "e.g. 45000 (enter 0 if none)",
    nextStep: (answer) => {
      const value = parseAmount(answer) || 0;
      if (value > 0) {
        return 'asset_vehicles_loan';
      }
      return 'liability_credit_cards';
    },
  },

  {
    id: 'asset_vehicles_loan',
    messages: ["Outstanding car loan balance?"],
    inputType: 'number',
    field: 'directors.directors.0.vehicleLoanBalance',
    placeholder: "e.g. 20000 (enter 0 if paid off)",
    nextStep: 'liability_credit_cards',
  },

  // 4. Credit cards (liability only)
  {
    id: 'liability_credit_cards',
    messages: ["Total credit card limit? (all cards combined)"],
    inputType: 'number',
    field: 'directors.directors.0.creditCardLimit',
    placeholder: "e.g. 15000 (enter 0 if none)",
    nextStep: 'credit_card_outstanding',
  },

  // Credit card outstanding balance
  {
    id: 'credit_card_outstanding',
    messages: ["How much is currently outstanding on your credit cards?"],
    inputType: 'number',
    field: 'directors.directors.0.creditCardOutstanding',
    placeholder: "e.g. 5000 (enter 0 if fully paid)",
    skipIf: (data) => {
      const director = data.application.directors?.directors?.[0];
      return !director?.creditCardLimit || Number(director.creditCardLimit) === 0;
    },
    nextStep: 'monthly_mortgage_payment',
  },

  // ========== MONTHLY PAYMENTS (for affordability) ==========
  {
    id: 'monthly_mortgage_payment',
    messages: ["What's your monthly mortgage payment?"],
    inputType: 'number',
    field: 'directors.directors.0.monthlyMortgagePayment',
    placeholder: "e.g. 2500 (enter 0 if none)",
    skipIf: (data) => {
      const director = data.application.directors?.directors?.[0];
      return !director?.ownsProperty || !director?.mortgageBalance || Number(director.mortgageBalance) === 0;
    },
    nextStep: 'monthly_vehicle_payment',
  },

  {
    id: 'monthly_vehicle_payment',
    messages: ["What's your monthly vehicle loan payment?"],
    inputType: 'number',
    field: 'directors.directors.0.monthlyVehicleLoanPayment',
    placeholder: "e.g. 600 (enter 0 if none)",
    skipIf: (data) => {
      const director = data.application.directors?.directors?.[0];
      return !director?.vehicleLoanBalance || Number(director.vehicleLoanBalance) === 0;
    },
    nextStep: 'monthly_credit_card_payment',
  },

  {
    id: 'monthly_credit_card_payment',
    messages: ["What's your typical monthly credit card payment?"],
    inputType: 'number',
    field: 'directors.directors.0.monthlyCreditCardPayment',
    placeholder: "e.g. 500 (minimum payment)",
    skipIf: (data) => {
      const director = data.application.directors?.directors?.[0];
      return !director?.creditCardLimit || Number(director.creditCardLimit) === 0;
    },
    nextStep: 'income_salary',
  },

  // ========== INCOME ==========
  {
    id: 'income_salary',
    messages: ["Now for income. What's your annual salary/wages? (before tax)"],
    inputType: 'number',
    field: 'directors.directors.0.annualSalary',
    placeholder: "e.g. 85000",
    nextStep: 'income_other',
  },

  {
    id: 'income_other',
    messages: ["Any other regular income? (dividends, rental, etc.)"],
    inputType: 'number',
    field: 'directors.directors.0.otherIncome',
    placeholder: "e.g. 10000 per year (enter 0 if none)",
    nextStep: 'living_expenses',
  },

  {
    id: 'living_expenses',
    messages: ["Estimate your monthly living expenses (food, utilities, insurance, etc.)"],
    inputType: 'number',
    field: 'directors.directors.0.monthlyLivingExpenses',
    placeholder: "e.g. 3000",
    nextStep: 'director_net_position',
  },

  // Net position summary
  {
    id: 'director_net_position',
    messages: (data) => {
      const d = data.application.directors?.directors?.[0];

      const totalAssets =
        (Number(d?.propertyValue) || 0) +
        (Number(d?.investmentPropertyValue) || 0) +
        (Number(d?.vehiclesValue) || 0);

      const totalLiabilities =
        (Number(d?.mortgageBalance) || 0) +
        (Number(d?.investmentMortgageBalance) || 0) +
        (Number(d?.vehicleLoanBalance) || 0) +
        (Number(d?.creditCardLimit) || 0);

      const netPosition = totalAssets - totalLiabilities;

      const annualIncome = (Number(d?.annualSalary) || 0) + (Number(d?.otherIncome) || 0);
      const monthlyIncome = annualIncome / 12;

      const totalMonthlyPayments =
        (Number(d?.monthlyMortgagePayment) || 0) +
        (Number(d?.monthlyVehicleLoanPayment) || 0) +
        (Number(d?.monthlyCreditCardPayment) || 0) +
        (Number(d?.monthlyLivingExpenses) || 0);

      return [
        `Assets: ${formatMoney(totalAssets)} | Liabilities: ${formatMoney(totalLiabilities)}`,
        `Net position: ${formatMoney(netPosition)}`,
        `Monthly income: ${formatMoney(monthlyIncome)} | Monthly expenses: ${formatMoney(totalMonthlyPayments)}`
      ];
    },
    inputType: 'select',
    options: ["Continue now", "Save and return later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later') || answer.toLowerCase().includes('save')) {
        return 'save_for_later';
      }
      return 'more_directors';
    },
  },

  {
    id: 'more_directors',
    messages: (data) => {
      const entityType = data.abnLookup?.entityType?.toLowerCase() || '';
      // mapEntityType returns the enum value 'sole_trader' (underscore), not 'sole trader'
      if (entityType.includes('sole_trader') || entityType.includes('sole trader') || entityType.includes('individual')) {
        return ["Sole trader - no additional directors required."];
      }
      return ["Any additional directors or guarantors on this application?"];
    },
    inputType: 'select',
    options: (data) => {
      const entityType = data.abnLookup?.entityType?.toLowerCase() || '';
      // mapEntityType returns the enum value 'sole_trader' (underscore), not 'sole trader'
      if (entityType.includes('sole_trader') || entityType.includes('sole trader') || entityType.includes('individual')) {
        return ["Continue"];
      }
      return ["Just me", "Yes, add another"];
    },
    nextStep: (answer, data) => {
      const entityType = data.abnLookup?.entityType?.toLowerCase() || '';
      // mapEntityType returns the enum value 'sole_trader' (underscore), not 'sole trader'
      if (entityType.includes('sole_trader') || entityType.includes('sole trader') || entityType.includes('individual')) {
        return 'loan_term';
      }
      if (answer.toLowerCase().includes('another') || answer.toLowerCase().includes('yes')) {
        return 'additional_director_method';
      }
      return 'loan_term';
    },
  },

  // Ask how they want to add the additional director
  {
    id: 'additional_director_method',
    messages: [
      "How would you like to add their details?",
      "We can email them a short form to complete, or you can enter the basics now."
    ],
    inputType: 'select',
    options: ["Email them directly (recommended)", "I'll enter their details"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('email') || answer.toLowerCase().includes('recommend')) {
        return 'additional_director_email_request';
      }
      return 'additional_director_email';
    },
  },

  // Request email to send form
  {
    id: 'additional_director_email_request',
    messages: ["What's their email address? We'll send them a quick form to complete."],
    inputType: 'email',
    field: 'directors.directors.1.email',
    placeholder: "their@email.com",
    validate: validateEmail,
    nextStep: 'additional_director_email_sent',
  },

  {
    id: 'additional_director_email_sent',
    messages: [
      "Sending them a quick form now...",
      "They'll receive an email with a link to complete their details.",
      "Let's continue with your application - we'll notify you when they've completed it."
    ],
    inputType: 'confirm',
    options: [],
    action: 'send_director_form',
    nextStep: 'loan_term',
  },

  // Manual entry path - just collect email and basic info
  {
    id: 'additional_director_email',
    messages: ["Their email address?"],
    inputType: 'email',
    field: 'directors.directors.1.email',
    placeholder: "their@email.com",
    validate: validateEmail,
    nextStep: 'additional_director_property_owner',
  },

  // Simplified - just ask if they own property (main thing lenders care about)
  {
    id: 'additional_director_property_owner',
    messages: ["Do they own property in Australia?"],
    inputType: 'select',
    options: ["Yes", "No", "Not sure"],
    field: 'directors.directors.1.ownsProperty',
    nextStep: 'additional_director_done',
  },

  {
    id: 'additional_director_done',
    messages: [
      "Got it. We may follow up with them directly if we need more details.",
      "Let's continue."
    ],
    inputType: 'confirm',
    options: [],
    nextStep: 'loan_term',
  },

  // ========== PHASE 4: LOAN PREFERENCES ==========
  {
    id: 'loan_term',
    messages: [
      "Details collected. Final step: loan structure.",
      "What loan term would you like?"
    ],
    inputType: 'select',
    options: ["1 year", "2 years", "3 years", "4 years", "5 years"],
    field: 'loan.termMonths',
    nextStep: 'balloon_preference',
  },

  {
    id: 'balloon_preference',
    messages: (data) => {
      const termMonths = currentTermMonths(data);
      const termYears = Math.ceil(termMonths / 12);
      // Single source of truth for balloon caps (calculator.ts MAX_BALLOON_BY_TERM)
      const maxBalloon = getMaxBalloon(termMonths);
      return [
        "Do you want a balloon payment at the end?",
        `(For a ${termYears} year term, max balloon is ${maxBalloon}%)`
      ];
    },
    inputType: 'select',
    options: (data) => {
      const maxBalloon = getMaxBalloon(currentTermMonths(data));

      const options = ["No balloon - own it outright"];
      for (const pct of [10, 20, 30, 40, 50, 60, 65]) {
        if (pct <= maxBalloon) options.push(`${pct}% balloon`);
      }
      options.push("What's a balloon?");
      return options;
    },
    field: 'loan.balloonPercentage',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes("what's")) {
        return 'balloon_explain';
      }
      return 'deposit_question';
    },
  },

  {
    id: 'balloon_explain',
    messages: (data) => {
      const maxBalloon = getMaxBalloon(currentTermMonths(data));
      return [
        "Good question!",
        "A balloon is a lump sum you pay at the end of the loan.",
        "• No balloon = higher monthly payments, but you own it at the end",
        `• Up to ${maxBalloon}% balloon = lower monthly payments, but you'll owe that amount at the end (can refinance, pay cash, or trade in)`,
        "What suits you better?"
      ];
    },
    inputType: 'select',
    options: (data) => {
      const maxBalloon = getMaxBalloon(currentTermMonths(data));
      return ["No balloon - own it outright", `Lower payments (${maxBalloon}% balloon)`];
    },
    field: 'loan.balloonPercentage',
    nextStep: 'deposit_question',
  },

  {
    id: 'deposit_question',
    messages: ["Will you have any deposit or trade-in?"],
    inputType: 'select',
    options: ["No deposit", "Yes, I'll put some down"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('yes') || answer.toLowerCase().includes("i'll put")) {
        return 'deposit_amount';
      }
      return 'final_review';
    },
  },

  {
    id: 'deposit_amount',
    messages: ["How much deposit or trade-in value?"],
    inputType: 'number',
    field: 'loan.depositAmount',
    placeholder: "e.g. 10000",
    validate: (value, data) => {
      const deposit = parseAmount(value);
      if (!Number.isFinite(deposit)) {
        return "Enter the deposit as a number (e.g. 10000 or 10k).";
      }
      if (deposit < 0) {
        return "Deposit can't be less than zero.";
      }
      const price = Number(data.application.asset?.assetPriceIncGst) || 0;
      const maxDeposit = price - 5000;
      if (price > 0 && deposit > maxDeposit) {
        return maxDeposit <= 0
          ? `We finance a minimum of ${formatMoney(5000)}, so we can't take a deposit on a ${formatMoney(price)} asset.`
          : `We finance a minimum of ${formatMoney(5000)}, so on a ${formatMoney(price)} asset the most you can put in is ${formatMoney(maxDeposit)}.`;
      }
      return null;
    },
    nextStep: 'final_review',
  },

  // ========== PHASE 5: REVIEW ==========
  {
    id: 'final_review',
    messages: [
      "Application summary:",
      "📋 SUMMARY_CARD",  // Special token that triggers summary card render
      "Review and confirm."
    ],
    inputType: 'select',
    options: ["Confirm and submit", "Edit details"],
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
    messages: ["Select section to edit:"],
    inputType: 'select',
    options: ["Business details", "Asset details", "Personal details", "Loan setup"],
    nextStep: (answer) => {
      // Re-enter the business section without wiping the application (D-2)
      if (answer.toLowerCase().includes('business')) return 'abn_manual_entry';
      if (answer.toLowerCase().includes('asset')) return 'asset_condition';
      if (answer.toLowerCase().includes('personal')) return 'director_intro';
      if (answer.toLowerCase().includes('loan')) return 'loan_term';
      return 'final_review';
    },
  },

  {
    id: 'privacy_consent',
    messages: [
      "Almost there! When you submit, we'll email you:",
      "• Privacy consent form (authorises credit check & identity verification)",
      "• Affordability declaration (confirms you can comfortably afford the repayments)",
      "Please keep an eye out and action when you can.",
      "Ready to submit?"
    ],
    inputType: 'select',
    options: ["Submit my application", "Save for later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later') || answer.toLowerCase().includes('save')) {
        return 'save_for_later';
      }
      return 'document_upload';
    },
  },

  {
    id: 'document_upload',
    messages: [
      "Final step: document verification.",
      "Please upload your documents below."
    ],
    inputType: 'file_upload',
    options: [], // Document requirements handled by the file upload component
    nextStep: 'address_duration',
  },

  // Address duration - need to know how long at current address
  {
    id: 'address_duration',
    messages: ["How long at your current address?"],
    inputType: 'select',
    options: ["Less than 6 months", "6-12 months", "1-2 years", "2+ years"],
    // Stored as a number of months via mapOptionToValue (see addressMonths mapping below)
    field: 'directors.directors.0.addressMonths',
    nextStep: (answer) => {
      const months = addressAnswerToMonths(answer);
      // If less than 2 years, need previous address
      if (months < 24) {
        return 'previous_address';
      }
      return 'affordability_notice';
    },
  },

  // Previous address (required if less than 2 years at current)
  {
    id: 'previous_address',
    messages: ["Previous address? (full address)"],
    inputType: 'text',
    field: 'directors.directors.0.previousAddress',
    placeholder: "e.g. 123 Smith St, Richmond VIC 3121",
    nextStep: 'affordability_notice',
  },

  // Affordability declaration notice
  {
    id: 'affordability_notice',
    messages: [
      "Almost done!",
      "After you submit, your lender will email you an affordability declaration to sign electronically.",
      "This confirms you can comfortably afford the proposed repayments.",
      "Please check your email and complete it promptly to avoid delays."
    ],
    inputType: 'select',
    options: ["I understand, submit my application"],
    nextStep: 'submission_complete',
  },

  {
    id: 'submission_complete',
    // The submit_application action runs before these messages render (see processStepMessages),
    // so the copy can report the real outcome instead of assuming success.
    messages: (data) => {
      if (data.submittedApplicationId) {
        return [
          `Application submitted. Reference ${data.submittedApplicationId}.`,
          "What happens next:",
          "1. Check your email for the privacy consent and affordability declaration - please sign both",
          "2. We'll review your application",
          "3. Conditional approval is typically the same business day for in-policy applications.",
          "You'll receive updates via email."
        ];
      }
      return [
        "Something went wrong sending your application. Nothing has been lost - tap Retry to send it again.",
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
    messages: ["Your application has been submitted. Need to finance another asset?"],
    inputType: 'select',
    options: ["Start a new application", "No, I'm done"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_complete';
    },
  },

  {
    id: 'end_saved',
    messages: ["Your progress has been saved. You can return anytime to continue."],
    inputType: 'select',
    options: ["Start a new enquiry", "I'm done for now"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_saved';
    },
  },

  {
    id: 'end_ineligible',
    messages: ["Is there anything else we can help with?"],
    inputType: 'select',
    options: ["Start a new enquiry", "No, I'm done"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('new') || answer.toLowerCase().includes('start')) {
        return 'greeting';
      }
      return 'end_ineligible';
    },
  },
];

// Helper to get a step by ID
export function getStep(stepId: string): ChatStep | undefined {
  return CHAT_FLOW.find(step => step.id === stepId);
}

// Helper to map select option to field value
export function mapOptionToValue(option: string, field: string): string | number {
  // Asset type mapping
  if (field === 'asset.assetType') {
    if (option.toLowerCase().includes('vehicle')) return 'vehicle';
    if (option.toLowerCase().includes('truck') || option.toLowerCase().includes('trailer')) return 'truck';
    if (option.toLowerCase().includes('construction') || option.toLowerCase().includes('excavator') || option.toLowerCase().includes('loader')) return 'equipment';
    if (option.toLowerCase().includes('mobile equipment')) return 'equipment';
    if (option.toLowerCase().includes('fixed') || option.toLowerCase().includes('installed')) return 'equipment';
  }

  // Asset condition mapping
  if (field === 'asset.assetCondition') {
    if (option.toLowerCase().includes('new')) return 'new';
    if (option.toLowerCase().includes('demo')) return 'demo';
    if (option.toLowerCase().includes('0-3')) return 'used_0_3';
    if (option.toLowerCase().includes('4-7')) return 'used_4_7';
    if (option.toLowerCase().includes('8+') || option.toLowerCase().includes('older')) return 'used_8_plus';
  }

  // Loan term mapping
  if (field === 'loan.termMonths') {
    if (option.includes('1 year')) return 12;
    if (option.includes('2 year')) return 24;
    if (option.includes('3 year')) return 36;
    if (option.includes('4 year')) return 48;
    if (option.includes('5 year')) return 60;
  }

  // Address duration mapping (stored as months)
  if (field.endsWith('.addressMonths')) {
    return addressAnswerToMonths(option);
  }

  // Balloon mapping
  if (field === 'loan.balloonPercentage') {
    if (option.toLowerCase().includes('no balloon') || option.toLowerCase().includes('own it')) return 0;
    // Extract percentage from option like "20% balloon" or "Lower payments (30% balloon)"
    const percentMatch = option.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1], 10);
    }
    if (option.toLowerCase().includes('lower payments')) return 20; // fallback
  }

  return option;
}

// Get step number for progress. Every step on a main path has an entry, so the bar
// never snaps back to 1; the total is derived from the map rather than hard-coded.
const PROGRESS_MAP: Record<string, number> = {
  // Business lookup
  'greeting': 1,
  'abn_search_results': 2,
  'abn_confirm_lookup': 2,
  'abn_manual_entry': 2,
  'abn_manual_lookup': 2,
  'abn_result': 3,
  'abn_retry': 3,
  'abn_too_young': 3,
  'abn_unverified': 3,
  'gst_too_young': 3,
  'no_gst_warning': 3,
  // Eligibility pre-qualification
  'eligibility_pass': 4,
  'eligibility_asset_type': 4,
  'eligibility_fixed_asset': 4,
  'ev_use_type': 4,
  'ev_novated_capture': 5,
  'ev_novated_phone': 5,
  'ev_novated_email': 5,
  'ev_novated_complete': 5,
  'eligibility_asset_age': 5,
  'eligibility_older_asset': 5,
  'eligibility_property': 5,
  'eligibility_deposit': 5,
  'eligibility_no_security': 5,
  'eligibility_loan_amount': 6,
  'eligibility_over_150k': 6,
  'eligibility_credit_check': 6,
  'eligibility_credit_issues': 6,
  'eligibility_qualified': 7,
  // Lead capture
  'lead_capture_asset_type': 4,
  'lead_capture_amount': 4,
  'lead_capture_name': 5,
  'lead_capture_phone': 5,
  'lead_capture_email': 5,
  'lead_capture_consent': 6,
  'lead_capture_complete': 6,
  // Asset details
  'asset_type_confirmed': 8,
  'asset_purchased_check': 8,
  'asset_upload_quote': 8,
  'asset_make': 8,
  'asset_model': 8,
  'asset_year': 8,
  'asset_supplier': 8,
  'asset_condition': 8,
  'asset_price': 9,
  'show_estimate': 10,
  'save_for_later': 10,
  // Director details (name/DOB/address come from the licence)
  'director_intro': 11,
  'director_phone': 12,
  'director_assets': 13,
  'asset_property': 13,
  'asset_property_value': 13,
  'asset_property_mortgage': 13,
  'asset_investment_property': 14,
  'asset_investment_value': 14,
  'asset_investment_mortgage': 14,
  'asset_vehicles': 14,
  'asset_vehicles_loan': 14,
  'liability_credit_cards': 15,
  'credit_card_outstanding': 15,
  // Monthly commitments
  'monthly_mortgage_payment': 16,
  'monthly_vehicle_payment': 16,
  'monthly_credit_card_payment': 16,
  // Income and expenses
  'income_salary': 17,
  'income_other': 17,
  'living_expenses': 17,
  'director_net_position': 18,
  'more_directors': 18,
  'additional_director_method': 19,
  'additional_director_email_request': 19,
  'additional_director_email_sent': 19,
  'additional_director_email': 19,
  'additional_director_property_owner': 19,
  'additional_director_done': 19,
  // Loan setup
  'loan_term': 20,
  'balloon_preference': 21,
  'balloon_explain': 21,
  'deposit_question': 22,
  'deposit_amount': 22,
  // Final
  'final_review': 23,
  'edit_choice': 23,
  'privacy_consent': 24,
  'document_upload': 25,
  'address_duration': 26,
  'previous_address': 26,
  'affordability_notice': 27,
  'submission_complete': 28,
  // End states
  'end_complete': 29,
  'end_saved': 29,
  'end_lead_captured': 29,
  'end_ineligible': 29,
};

const PROGRESS_TOTAL = Math.max(...Object.values(PROGRESS_MAP));

export function getStepProgress(stepId: string): { current: number; total: number } {
  return {
    current: PROGRESS_MAP[stepId] || 1,
    total: PROGRESS_TOTAL,
  };
}
