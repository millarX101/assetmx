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
  action?: 'abn_lookup' | 'abn_search' | 'calculate_quote' | 'check_eligibility';
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
      // Check eligibility
      if (!data.abnLookup) return 'abn_retry';
      const years = yearsSince(data.abnLookup.abnRegisteredDate);
      if (years < 2) return 'abn_too_young';
      if (!data.abnLookup.gstRegistered) return 'no_gst_warning';
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
        "We typically need 2+ years trading history for this type of finance.",
        "No hard feelings - come back when you hit that milestone! 🎯"
      ];
    },
    inputType: 'confirm',
    options: ["Got it, thanks"],
    nextStep: 'end_ineligible',
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
      "Awesome! You're already looking good for approval. 👍",
      "Now, what are you looking to finance?"
    ],
    inputType: 'select',
    options: ["Vehicle (ute, van, car)", "Truck or trailer", "Equipment/machinery", "Technology/medical gear"],
    field: 'asset.assetType',
    nextStep: 'asset_condition',
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
      "Nearly there! 🎉",
      "How long would you like to spread the payments over?"
    ],
    inputType: 'select',
    options: ["3 years", "4 years", "5 years", "7 years"],
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
      return 'document_upload';
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
    id: 'document_upload',
    messages: [
      "Brilliant! Last step - I just need to verify a couple of things.",
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
      "🎉 You're done!",
      "We're reviewing your application now.",
      "You'll hear back from us within 15 minutes during business hours.",
      "We'll send updates to your email and SMS.",
      "Thanks for choosing AssetMX! 💜"
    ],
    inputType: 'confirm',
    options: ["Done"],
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
    if (option.toLowerCase().includes('truck')) return 'truck';
    if (option.toLowerCase().includes('equipment')) return 'equipment';
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
    if (option.includes('7')) return 84;
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
    'no_gst_warning': 3,
    'eligibility_pass': 4,
    'asset_condition': 4,
    'asset_price': 5,
    'show_estimate': 6,
    'director_intro': 7,
    'director_dob': 8,
    'director_email': 9,
    'director_phone': 10,
    'director_address': 11,
    'more_directors': 12,
    'additional_director_name': 13,
    'additional_director_email': 14,
    'loan_term': 15,
    'balloon_preference': 16,
    'balloon_explain': 16,
    'deposit_question': 17,
    'deposit_amount': 18,
    'final_review': 19,
    'document_upload': 20,
    'submission_complete': 20,
  };

  return {
    current: progressMap[stepId] || 1,
    total: 20,
  };
}
