// Chat Flow Engine - Defines the conversational application flow
// Each step represents a point in the conversation

import { validateABN, cleanABN, type ABNSearchResult } from './abn-lookup';
import type { ApplicationData } from '@/types/application';

export type InputType = 'text' | 'select' | 'number' | 'date' | 'email' | 'phone' | 'confirm' | 'abn_select';

export interface ChatStep {
  id: string;
  messages: string[] | ((data: ChatFlowData) => string[]);
  inputType: InputType;
  options?: string[] | ((data: ChatFlowData) => string[]);
  field?: string;  // Dot notation path e.g. 'business.abn', 'directors.0.firstName'
  placeholder?: string;
  validate?: (value: string, data: ChatFlowData) => string | null;  // Returns error message or null
  action?: 'abn_lookup' | 'abn_search' | 'calculate_quote' | 'check_eligibility' | 'submit_application' | 'save_lead';
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
    weeklyRepayment: number;
    indicativeRate: number;
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
  };
  // Eligibility tracking
  eligibility?: {
    ownsProperty?: boolean;
    canDeposit20?: boolean;
  };
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

// Helper to format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
};

// Calculate years since a date
const yearsSince = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

// Validation helpers
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Hmm, that email doesn't look quite right. Can you check it?";
  }
  return null;
};

const validatePhone = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) {
    return "That phone number looks a bit short. Australian numbers are usually 10 digits.";
  }
  return null;
};

const validateDate = (dateStr: string): string | null => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return "That date doesn't look right. Try DD/MM/YYYY format.";
  }
  const age = yearsSince(dateStr);
  if (age < 18) {
    return "You need to be at least 18 to apply for finance.";
  }
  if (age > 100) {
    return "Hmm, that date seems a bit off. Can you double-check it?";
  }
  return null;
};

const validateAmount = (value: string): string | null => {
  const amount = parseFloat(value.replace(/[,$]/g, ''));
  if (isNaN(amount) || amount <= 0) {
    return "I need a number there - just the amount is fine, like '75000' or '75k'.";
  }
  if (amount < 5000) {
    return "We finance from $5,000 upwards. Is the amount right?";
  }
  if (amount > 500000) {
    return "For amounts over $500k, we'd need to chat directly. Call us on 1300 XXX XXX.";
  }
  return null;
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
      "G'day! I'm here to help you get finance sorted.",
      "Quick and easy, no paperwork headaches.",
      "First up - what's your business name?"
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
      return [
        `✅ Found it!\n\n${data.abnLookup.entityName}\nTrading since ${formatDate(data.abnLookup.abnRegisteredDate)} (${years} year${years !== 1 ? 's' : ''})\n${gstStatus}`,
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
      const abnYears = yearsSince(data.abnLookup.abnRegisteredDate);
      if (abnYears < 2) return 'abn_too_young';
      // Check GST registration
      if (!data.abnLookup.gstRegistered) return 'no_gst_warning';
      // Check GST 2+ years
      if (data.abnLookup.gstRegisteredDate) {
        const gstYears = yearsSince(data.abnLookup.gstRegisteredDate);
        if (gstYears < 2) return 'gst_too_young';
      }
      return 'eligibility_pass';
    },
  },

  {
    id: 'abn_retry',
    messages: ["No worries! Let's try again - what's the correct ABN?"],
    inputType: 'text',
    field: 'business.abn',
    placeholder: 'Enter your 11-digit ABN',
    validate: (value) => {
      const cleaned = cleanABN(value);
      if (!validateABN(cleaned)) {
        return "That ABN doesn't look quite right. Should be 11 digits.";
      }
      return null;
    },
    action: 'abn_lookup',
    nextStep: 'abn_result',
  },

  {
    id: 'abn_too_young',
    messages: (data) => {
      const years = data.abnLookup ? yearsSince(data.abnLookup.abnRegisteredDate) : 0;
      const months = Math.round(years * 12);
      return [
        `Ah, looks like your ABN has only been active for about ${months} months.`,
        "For a quick approval, we need 2+ years trading history.",
        "Our team can still help though - can I grab your details?"
      ];
    },
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'gst_too_young',
    messages: (data) => {
      const gstYears = data.abnLookup?.gstRegisteredDate ? yearsSince(data.abnLookup.gstRegisteredDate) : 0;
      const gstMonths = Math.round(gstYears * 12);
      return [
        `Your GST registration is only ${gstMonths} months old.`,
        "For the quick approval path, we need 2+ years GST registration.",
        "No worries though - our team can look at other options. Can I grab your details?"
      ];
    },
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'no_gst_warning',
    messages: [
      "I noticed you're not GST registered.",
      "That's usually a requirement for our lenders, but let's keep going and see how we can help.",
      "Ready to continue?"
    ],
    inputType: 'select',
    options: ["Yeah, let's continue", "Actually, I am GST registered"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('am gst') || answer.toLowerCase().includes('actually')) {
        return 'abn_retry';
      }
      return 'eligibility_pass';
    },
  },

  {
    id: 'eligibility_pass',
    messages: [
      "Awesome! Your business is looking good.",
      "Just a few quick questions to make sure we can help you today..."
    ],
    inputType: 'confirm',
    options: ["Let's do it"],
    nextStep: 'eligibility_asset_type',
  },

  // ========== ELIGIBILITY PRE-QUALIFICATION ==========
  {
    id: 'eligibility_asset_type',
    messages: ["What type of asset are you looking to finance?"],
    inputType: 'select',
    options: [
      "Vehicle (ute, van, car)",
      "Truck or trailer",
      "Construction equipment (excavator, loader, etc.)",
      "Other mobile equipment",
      "Fixed/installed equipment"
    ],
    field: 'asset.assetType',
    nextStep: (answer) => {
      // Fixed/installed assets go to lead bucket - everything else passes through
      if (answer.toLowerCase().includes('fixed') || answer.toLowerCase().includes('installed')) {
        return 'eligibility_fixed_asset';
      }
      return 'eligibility_asset_age';
    },
  },

  {
    id: 'eligibility_fixed_asset',
    messages: [
      "For fixed or installed equipment, we need to do a bit more work to find the right lender.",
      "Our team can help with this - can I grab your details?"
    ],
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'eligibility_asset_age',
    messages: ["Is the asset you're looking at less than 3 years old?"],
    inputType: 'select',
    options: ["Yes, under 3 years", "No, it's older"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('older') || answer.toLowerCase().includes('no')) {
        return 'eligibility_older_asset';
      }
      return 'eligibility_property';
    },
  },

  {
    id: 'eligibility_older_asset',
    messages: [
      "For older assets we need to do a bit more work to find the right lender.",
      "One of our team can help with this - can I grab your details?"
    ],
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'eligibility_property',
    messages: ["Do you own any property? (home, investment property, or land)"],
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
    messages: ["No worries! Can you put down at least 20% deposit on the asset?"],
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
      "Without property or a larger deposit, we'd need to look at different options for you.",
      "Our team can chat through what might work - can I grab your details?"
    ],
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'eligibility_loan_amount',
    messages: ["Roughly, how much are you looking to borrow?"],
    inputType: 'select',
    options: ["Under $100k", "$100k - $150k", "Over $150k"],
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
      "For loans over $150k, we need a bit more info to find the best deal.",
      "One of our team will reach out to chat through your options - can I grab your details?"
    ],
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'eligibility_credit_check',
    messages: [
      "Last one - any credit issues we should know about?",
      "(bankruptcies, defaults, or outstanding judgments)"
    ],
    inputType: 'select',
    options: ["No, all clean", "Yes, there's something"],
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
      "No judgement here - credit issues happen!",
      "We work with lenders who specialise in these situations. One of our team can help find the right fit.",
      "Can I grab your details?"
    ],
    inputType: 'select',
    options: ["Sure, take my details", "I'll come back later"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later')) {
        return 'end_saved';
      }
      return 'lead_capture_name';
    },
  },

  {
    id: 'eligibility_qualified',
    messages: [
      "Brilliant! You're ticking all the boxes.",
      "Based on what you've told me, you've got a 95% chance of approval.",
      "Let's get your application sorted - it'll only take a few more minutes."
    ],
    inputType: 'confirm',
    options: ["Let's go!"],
    nextStep: 'asset_type_confirmed',
  },

  // ========== LEAD CAPTURE FLOW ==========
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
    messages: ["And the best number to reach you?"],
    inputType: 'phone',
    field: 'lead.phone',
    placeholder: "04XX XXX XXX",
    validate: validatePhone,
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
      "One last thing - we may share your details with a trusted partner broker who can help with your specific situation.",
      "Is that okay with you?"
    ],
    inputType: 'select',
    options: ["Yes, that's fine", "No, don't share my details"],
    field: 'lead.consentToShare',
    nextStep: 'lead_capture_complete',
  },

  {
    id: 'lead_capture_complete',
    messages: (data) => {
      const consented = data.lead?.consentToShare;
      if (consented) {
        return [
          "Thanks! One of our team (or a trusted partner) will be in touch within 24 hours.",
          "We'll find the best option for your situation.",
          "Chat soon!"
        ];
      }
      return [
        "No worries! One of our team will be in touch within 24 hours.",
        "We'll do our best to help you directly.",
        "Chat soon!"
      ];
    },
    inputType: 'confirm',
    options: ["Done"],
    action: 'save_lead',
    nextStep: 'end_lead_captured',
  },

  {
    id: 'end_lead_captured',
    messages: [],
    inputType: 'confirm',
    options: [],
    nextStep: 'end_lead_captured',
  },

  // Continue with full application after eligibility check
  {
    id: 'asset_type_confirmed',
    messages: (data) => {
      const assetType = data.application.asset?.assetType || 'vehicle';
      const typeLabel = assetType === 'vehicle' ? 'vehicle' :
                       assetType === 'truck' ? 'truck' : 'asset';
      return [`Great! So we're looking at a ${typeLabel}. New or used?`];
    },
    inputType: 'select',
    options: ["Brand new", "Demo", "Used (0-3 years)"],
    field: 'asset.assetCondition',
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
    messages: ["What's the rough price you're looking at?", "(Don't worry if you're not 100% sure yet)"],
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
          `Got it - around ${formatMoney(price)}.`,
          "Let me work out a quick estimate..."
        ];
      }
      return [
        `Got it - around ${formatMoney(price)}.`,
        `Based on what you've told me, here's a quick estimate:\n\n📊 ~${formatMoney(quote.monthlyRepayment)}/month over 5 years\n   (~${formatMoney(quote.weeklyRepayment)}/week)\n   at ${quote.indicativeRate.toFixed(2)}% p.a.`,
        "Want me to continue with the full application? Takes about 5 more minutes."
      ];
    },
    inputType: 'select',
    options: ["Yeah let's do it", "I'll come back later"],
    action: 'calculate_quote',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('later') || answer.toLowerCase().includes('come back')) {
        return 'save_for_later';
      }
      return 'director_intro';
    },
  },

  {
    id: 'save_for_later',
    messages: [
      "No worries at all! Your progress is saved.",
      "Come back anytime and we'll pick up where you left off. 👋"
    ],
    inputType: 'confirm',
    options: ["Thanks!"],
    nextStep: 'end_saved',
  },

  // ========== PHASE 3: DIRECTOR DETAILS ==========
  {
    id: 'director_intro',
    messages: [
      "Sweet! Just need a few details about you as the director.",
      "What's your full name?"
    ],
    inputType: 'text',
    field: 'directors.0.firstName',
    placeholder: "Your full name",
    nextStep: 'director_dob',
  },

  {
    id: 'director_dob',
    messages: ["And your date of birth?"],
    inputType: 'date',
    field: 'directors.0.dateOfBirth',
    placeholder: "DD/MM/YYYY",
    validate: validateDate,
    nextStep: 'director_email',
  },

  {
    id: 'director_email',
    messages: ["What's the best email to reach you?"],
    inputType: 'email',
    field: 'directors.0.email',
    placeholder: "your@email.com",
    validate: validateEmail,
    nextStep: 'director_phone',
  },

  {
    id: 'director_phone',
    messages: ["And your mobile number?"],
    inputType: 'phone',
    field: 'directors.0.phone',
    placeholder: "04XX XXX XXX",
    validate: validatePhone,
    nextStep: 'director_address',
  },

  {
    id: 'director_address',
    messages: ["What's your residential address?"],
    inputType: 'text',
    field: 'directors.0.residentialAddress',
    placeholder: "Street address, suburb, state, postcode",
    nextStep: 'director_assets_intro',
  },

  // ========== PERSONAL ASSETS & LIABILITIES ==========
  {
    id: 'director_assets_intro',
    messages: [
      "Nearly there! Lenders need a quick snapshot of your personal financial position.",
      "This helps them assess the application. Just rough figures are fine!"
    ],
    inputType: 'confirm',
    options: ["Got it, let's go"],
    nextStep: 'director_property',
  },

  {
    id: 'director_property',
    messages: ["Do you own any property (home, investment, land)?"],
    inputType: 'select',
    options: ["Yes, I own property", "No, I don't own property"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('yes')) {
        return 'director_property_value';
      }
      return 'director_vehicles';
    },
  },

  {
    id: 'director_property_value',
    messages: ["What's the approximate total value of your property/properties?"],
    inputType: 'number',
    field: 'directors.0.propertyValue',
    placeholder: "$500,000",
    nextStep: 'director_property_owing',
  },

  {
    id: 'director_property_owing',
    messages: ["And how much do you owe on it? (mortgage balance)"],
    inputType: 'number',
    field: 'directors.0.mortgageBalance',
    placeholder: "$300,000",
    nextStep: 'director_vehicles',
  },

  {
    id: 'director_vehicles',
    messages: ["Do you own any vehicles (cars, boats, bikes)?"],
    inputType: 'select',
    options: ["Yes", "No"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('yes')) {
        return 'director_vehicles_value';
      }
      return 'director_savings';
    },
  },

  {
    id: 'director_vehicles_value',
    messages: ["What's the approximate total value of your vehicles?"],
    inputType: 'number',
    field: 'directors.0.vehiclesValue',
    placeholder: "$30,000",
    nextStep: 'director_savings',
  },

  {
    id: 'director_savings',
    messages: ["Roughly, how much do you have in savings, shares, or super combined?"],
    inputType: 'number',
    field: 'directors.0.savingsValue',
    placeholder: "$50,000",
    nextStep: 'director_other_loans',
  },

  {
    id: 'director_other_loans',
    messages: ["Do you have any other loans? (car loan, personal loan, credit cards, HECS)"],
    inputType: 'select',
    options: ["Yes, I have other loans", "No other loans"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('yes')) {
        return 'director_other_loans_amount';
      }
      return 'director_credit_cards';
    },
  },

  {
    id: 'director_other_loans_amount',
    messages: ["What's the total balance owing on other loans? (excluding mortgage)"],
    inputType: 'number',
    field: 'directors.0.otherLoansBalance',
    placeholder: "$10,000",
    nextStep: 'director_credit_cards',
  },

  {
    id: 'director_credit_cards',
    messages: ["Do you have any credit cards?"],
    inputType: 'select',
    options: ["Yes", "No"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('yes')) {
        return 'director_credit_cards_limit';
      }
      return 'director_financial_summary';
    },
  },

  {
    id: 'director_credit_cards_limit',
    messages: ["What's the total credit limit across all your cards?"],
    inputType: 'number',
    field: 'directors.0.creditCardLimit',
    placeholder: "$10,000",
    nextStep: 'director_financial_summary',
  },

  {
    id: 'director_financial_summary',
    messages: (data) => {
      const director = data.application.directors?.directors?.[0];
      const propertyValue = Number(director?.propertyValue) || 0;
      const vehiclesValue = Number(director?.vehiclesValue) || 0;
      const savingsValue = Number(director?.savingsValue) || 0;
      const mortgageBalance = Number(director?.mortgageBalance) || 0;
      const otherLoans = Number(director?.otherLoansBalance) || 0;
      const creditCards = Number(director?.creditCardLimit) || 0;

      const totalAssets = propertyValue + vehiclesValue + savingsValue;
      const totalLiabilities = mortgageBalance + otherLoans + creditCards;
      const netPosition = totalAssets - totalLiabilities;

      const formatMoney = (amt: number) => new Intl.NumberFormat('en-AU', {
        style: 'currency', currency: 'AUD', minimumFractionDigits: 0
      }).format(amt);

      return [
        "Here's your financial snapshot:",
        `📊 Total Assets: ${formatMoney(totalAssets)}`,
        `📊 Total Liabilities: ${formatMoney(totalLiabilities)}`,
        `📊 Net Position: ${formatMoney(netPosition)}`,
        "This looks good! Let's continue."
      ];
    },
    inputType: 'confirm',
    options: ["Continue"],
    nextStep: 'more_directors',
  },

  {
    id: 'more_directors',
    messages: (data) => {
      const entityType = data.abnLookup?.entityType?.toLowerCase() || '';
      if (entityType.includes('sole trader') || entityType.includes('individual')) {
        return ["Great! Since you're a sole trader, that's all I need about you."];
      }
      return ["Are there any other directors or guarantors we need to include?"];
    },
    inputType: 'select',
    options: ["Just me", "Add another director"],
    skipIf: (data) => {
      const entityType = data.abnLookup?.entityType?.toLowerCase() || '';
      return entityType.includes('sole trader') || entityType.includes('individual');
    },
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('another') || answer.toLowerCase().includes('add')) {
        return 'additional_director_name';
      }
      return 'loan_term';
    },
  },

  // Additional director loop (simplified - can be expanded)
  {
    id: 'additional_director_name',
    messages: ["What's their full name?"],
    inputType: 'text',
    field: 'directors.1.firstName',
    placeholder: "Director's full name",
    nextStep: 'additional_director_email',
  },

  {
    id: 'additional_director_email',
    messages: ["And their email?"],
    inputType: 'email',
    field: 'directors.1.email',
    placeholder: "their@email.com",
    validate: validateEmail,
    nextStep: 'loan_term',
  },

  // ========== PHASE 4: LOAN PREFERENCES ==========
  {
    id: 'loan_term',
    messages: [
      "Nearly there!",
      "How long would you like to spread the payments over?"
    ],
    inputType: 'select',
    options: ["3 years", "4 years", "5 years"],
    field: 'loan.termMonths',
    nextStep: 'balloon_preference',
  },

  {
    id: 'balloon_preference',
    messages: (data) => {
      const termMonths = data.application.loan?.termMonths || 60;
      const termYears = Math.ceil(termMonths / 12);
      // Max balloon: 1yr=65%, 2yr=60%, 3yr=50%, 4yr=40%, 5yr+=30%
      const maxBalloon = termYears === 1 ? 65 : termYears === 2 ? 60 : termYears === 3 ? 50 : termYears === 4 ? 40 : 30;
      return [
        "Do you want a balloon payment at the end?",
        `(For a ${termYears} year term, max balloon is ${maxBalloon}%)`
      ];
    },
    inputType: 'select',
    options: ["No balloon - own it outright", "20% balloon", "30% balloon", "What's a balloon?"],
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
      const termMonths = data.application.loan?.termMonths || 60;
      const termYears = Math.ceil(termMonths / 12);
      const maxBalloon = termYears === 1 ? 65 : termYears === 2 ? 60 : termYears === 3 ? 50 : termYears === 4 ? 40 : 30;
      return [
        "Good question!",
        "A balloon is a lump sum you pay at the end of the loan.",
        "• No balloon = higher monthly payments, but you own it at the end",
        `• Up to ${maxBalloon}% balloon = lower monthly payments, but you'll owe that amount at the end (can refinance, pay cash, or trade in)`,
        "What suits you better?"
      ];
    },
    inputType: 'select',
    options: ["No balloon - own it outright", "Lower payments with balloon"],
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
    nextStep: 'final_review',
  },

  // ========== PHASE 5: REVIEW ==========
  {
    id: 'final_review',
    messages: [
      "Alright, here's everything I've got. Have a quick look:",
      "📋 SUMMARY_CARD",  // Special token that triggers summary card render
      "All good?"
    ],
    inputType: 'select',
    options: ["Looks good, submit!", "Need to change something"],
    action: 'calculate_quote',
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('change') || answer.toLowerCase().includes('edit')) {
        return 'edit_choice';
      }
      return 'privacy_consent';
    },
  },

  {
    id: 'edit_choice',
    messages: ["No worries! What would you like to change?"],
    inputType: 'select',
    options: ["Business details", "Asset details", "My personal details", "Loan setup"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('business')) return 'greeting';
      if (answer.toLowerCase().includes('asset')) return 'asset_condition';
      if (answer.toLowerCase().includes('personal')) return 'director_intro';
      if (answer.toLowerCase().includes('loan')) return 'loan_term';
      return 'final_review';
    },
  },

  {
    id: 'privacy_consent',
    messages: [
      "Brilliant! Before I can submit your application, there's one important step.",
      "When we submit to our lending panel, you'll need to sign a Privacy Consent form electronically.",
      "This authorises us to:\n• Check your credit file\n• Verify your identity\n• Share your application with our lending partners",
      "It's a legal requirement before we can lodge with the lender. We'll send it to your email for you to sign.",
      "Ready to proceed?"
    ],
    inputType: 'select',
    options: ["Yes, I understand - proceed", "I need more time to think"],
    nextStep: (answer) => {
      if (answer.toLowerCase().includes('more time') || answer.toLowerCase().includes('think')) {
        return 'save_for_later';
      }
      return 'document_upload';
    },
  },

  {
    id: 'document_upload',
    messages: [
      "Great! Last step - I just need to verify a couple of things.",
      "Please upload:",
      "📄 Your driver's licence (front)",
      "📄 Your latest tax return or financials",
      "This helps us fast-track your approval."
    ],
    inputType: 'confirm',
    options: ["Upload documents"],
    nextStep: 'submission_complete',
  },

  {
    id: 'submission_complete',
    messages: [
      "🎉 You're all done!",
      "Here's what happens next:",
      "1️⃣ We'll send you the Privacy Consent form to sign (check your email)",
      "2️⃣ Once signed, we'll submit to our lending panel",
      "3️⃣ You'll hear back within 15 minutes during business hours",
      "We'll send updates to your email and SMS.",
      "Thanks for choosing AssetMX! 💜"
    ],
    inputType: 'confirm',
    options: ["Done"],
    action: 'submit_application',
    nextStep: 'end_complete',
  },

  // ========== END STATES ==========
  {
    id: 'end_complete',
    messages: [],
    inputType: 'confirm',
    options: [],
    nextStep: 'end_complete',
  },

  {
    id: 'end_saved',
    messages: [],
    inputType: 'confirm',
    options: [],
    nextStep: 'end_saved',
  },

  {
    id: 'end_ineligible',
    messages: [],
    inputType: 'confirm',
    options: [],
    nextStep: 'end_ineligible',
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
    if (option.toLowerCase().includes('technology')) return 'technology';
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
    if (option.includes('3')) return 36;
    if (option.includes('4')) return 48;
    if (option.includes('5')) return 60;
  }

  // Balloon mapping
  if (field === 'loan.balloonPercentage') {
    if (option.toLowerCase().includes('no balloon') || option.toLowerCase().includes('own it')) return 0;
    if (option.includes('20')) return 20;
    if (option.includes('30')) return 30;
    if (option.toLowerCase().includes('lower payments')) return 20;
  }

  return option;
}

// Get step number for progress (rough estimate)
export function getStepProgress(stepId: string): { current: number; total: number } {
  const progressMap: Record<string, number> = {
    'greeting': 1,
    'abn_search_results': 2,
    'abn_confirm_lookup': 2,
    'abn_manual_entry': 2,
    'abn_result': 3,
    'abn_retry': 3,
    'abn_too_young': 3,
    'gst_too_young': 3,
    'no_gst_warning': 3,
    'eligibility_pass': 4,
    // Eligibility pre-qualification
    'eligibility_asset_type': 4,
    'eligibility_fixed_asset': 4,
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
    'lead_capture_name': 4,
    'lead_capture_phone': 4,
    'lead_capture_email': 4,
    'lead_capture_consent': 4,
    'lead_capture_complete': 4,
    'end_lead_captured': 4,
    // Asset details
    'asset_type_confirmed': 7,
    'asset_condition': 8,
    'asset_price': 9,
    'show_estimate': 10,
    'director_intro': 11,
    'director_dob': 12,
    'director_email': 13,
    'director_phone': 14,
    'director_address': 15,
    'director_assets_intro': 16,
    'director_property': 16,
    'director_property_value': 16,
    'director_property_owing': 17,
    'director_vehicles': 17,
    'director_vehicles_value': 17,
    'director_savings': 18,
    'director_other_loans': 18,
    'director_other_loans_amount': 18,
    'director_credit_cards': 19,
    'director_credit_cards_limit': 19,
    'director_financial_summary': 19,
    'more_directors': 20,
    'additional_director_name': 21,
    'additional_director_email': 22,
    'loan_term': 23,
    'balloon_preference': 24,
    'balloon_explain': 24,
    'deposit_question': 25,
    'deposit_amount': 26,
    'final_review': 27,
    'privacy_consent': 28,
    'document_upload': 29,
    'submission_complete': 30,
  };

  return {
    current: progressMap[stepId] || 1,
    total: 30,
  };
}
