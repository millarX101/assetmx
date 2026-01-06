// AssetMX Calculator Logic
// Transparent pricing with broker comparison

export interface QuoteInput {
  assetType: 'vehicle' | 'truck' | 'equipment' | 'technology';
  assetCondition: 'new' | 'demo' | 'used_0_3' | 'used_4_7' | 'used_8_plus';
  loanAmount: number;
  termMonths: number;
  balloonPercentage: number;
  financePlatformFee?: boolean; // true = finance $800 into loan (default), false = pay upfront
}

export interface QuoteOutput {
  indicativeRate: number;
  // Repayments WITH fees financed (what you actually pay)
  monthlyRepayment: number;
  weeklyRepayment: number;
  fortnightlyRepayment: number;
  // Repayments WITHOUT platform fee (if paying upfront)
  monthlyRepaymentFeeUpfront: number;
  weeklyRepaymentFeeUpfront: number;
  fortnightlyRepaymentFeeUpfront: number;
  // Totals
  totalInterest: number;
  totalRepayments: number;
  balloonAmount: number;
  // Fees
  platformFee: number;
  lenderEstablishmentFee: number;
  ppsrFee: number;
  totalFeesFinanced: number; // Fees included in the loan
  totalFeesUpfront: number; // Fees paid before settlement
  totalCost: number;
  // Amount actually financed (loan + financed fees)
  totalAmountFinanced: number;
  totalAmountFinancedFeeUpfront: number;
  // Broker comparison
  brokerComparisonRate: number;
  brokerComparisonTotalCost: number;
  estimatedSaving: number;
  // Flag for which option is selected
  isPlatformFeeFinanced: boolean;
}

// Fee constants - TRANSPARENT PRICING
export const PLATFORM_FEE = 800;
export const PPSR_FEE = 7.40;
export const LENDER_ESTABLISHMENT_FEE = 500; // Financed into the loan (per lender quote)
export const BROKER_MARGIN = 2.00; // What brokers typically add to hide commission (~$2k on $100k vs our $800)

// Base rates by term (from lender rate sheets)
// 1-5 years: 6.45%, 5+ years: 7.15%
// These are the ACTUAL lender rates - no markup
export const BASE_RATE_SHORT = 6.45; // 1-5 years (12-60 months)
export const BASE_RATE_LONG = 7.15;  // 5+ years (61-84 months)

// Get base rate based on term
export function getBaseRate(termMonths: number): number {
  return termMonths <= 60 ? BASE_RATE_SHORT : BASE_RATE_LONG;
}

// Maximum balloon percentages by term (years)
// 1 year: 65%, 2 years: 60%, 3 years: 50%, 4 years: 40%, 5+ years: 30%
export const MAX_BALLOON_BY_TERM: Record<number, number> = {
  12: 65,  // 1 year
  24: 60,  // 2 years
  36: 50,  // 3 years
  48: 40,  // 4 years
  60: 30,  // 5 years
  72: 30,  // 6 years
  84: 30,  // 7 years
};

// Get maximum balloon for a given term
export function getMaxBalloon(termMonths: number): number {
  // Find the closest term (round up to nearest 12 months)
  const termYears = Math.ceil(termMonths / 12);
  const termKey = termYears * 12;
  return MAX_BALLOON_BY_TERM[termKey] || 30;
}

// Legacy BASE_RATES kept for backwards compatibility but now unused
export const BASE_RATES: Record<string, Record<string, number>> = {
  vehicle: {
    new: 6.45,
    demo: 6.45,
    used_0_3: 6.45,
    used_4_7: 6.45,
    used_8_plus: 6.45
  },
  truck: {
    new: 6.45,
    demo: 6.45,
    used_0_3: 6.45,
    used_4_7: 6.45,
    used_8_plus: 6.45
  },
  equipment: {
    new: 6.45,
    demo: 6.45,
    used_0_3: 6.45,
    used_4_7: 6.45,
    used_8_plus: 6.45
  },
  technology: {
    new: 6.45,
    demo: 6.45,
    used_0_3: 6.45,
    used_4_7: 6.45,
    used_8_plus: 6.45
  },
};

/**
 * Calculate monthly repayment with balloon/residual
 * Uses standard PMT formula adjusted for balloon payment
 */
function calculateRepayment(
  principal: number,
  annualRate: number,
  termMonths: number,
  balloonAmount: number
): number {
  const monthlyRate = annualRate / 100 / 12;

  // Handle 0% rate edge case
  if (monthlyRate === 0) {
    return (principal - balloonAmount) / termMonths;
  }

  // Present value of balloon payment
  const pvBalloon = balloonAmount / Math.pow(1 + monthlyRate, termMonths);

  // Adjusted principal (loan amount minus PV of balloon)
  const adjustedPrincipal = principal - pvBalloon;

  // PMT formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  const payment = adjustedPrincipal *
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  return payment;
}

/**
 * Main quote calculation function
 * This is the TRANSPARENT pricing engine that shows:
 * 1. Lender base rate (no markup)
 * 2. All fees itemized separately
 * 3. Broker comparison showing hidden costs
 *
 * IMPORTANT: Repayments are calculated on the TOTAL AMOUNT FINANCED
 * which includes the lender establishment fee (always financed) and
 * optionally the platform fee. This matches real lender quotes.
 *
 * Payments are IN ADVANCE (first payment due at contract start).
 */
export function calculateQuote(input: QuoteInput): QuoteOutput {
  // Validate inputs
  if (input.loanAmount < 5000 || input.loanAmount > 500000) {
    throw new Error('Loan amount must be between $5,000 and $500,000');
  }
  if (input.termMonths < 12 || input.termMonths > 84) {
    throw new Error('Loan term must be between 12 and 84 months');
  }

  // Validate balloon against maximum for this term
  const maxBalloon = getMaxBalloon(input.termMonths);
  if (input.balloonPercentage < 0 || input.balloonPercentage > maxBalloon) {
    throw new Error(`Balloon percentage must be between 0% and ${maxBalloon}% for a ${Math.ceil(input.termMonths / 12)} year term`);
  }

  // Get base rate based on term length
  // 1-5 years: 6.45%, 5+ years: 7.15%
  const indicativeRate = getBaseRate(input.termMonths);

  // Balloon is calculated on the ASSET VALUE (loan amount), not financed amount
  const balloonAmount = input.loanAmount * (input.balloonPercentage / 100);

  // Default: finance platform fee (most common choice)
  const financePlatformFee = input.financePlatformFee !== false;

  // ===== OPTION 1: Finance platform fee (default) =====
  // Total amount financed = asset cost + establishment fee + platform fee
  const totalAmountFinanced = input.loanAmount + LENDER_ESTABLISHMENT_FEE + PLATFORM_FEE;

  // Calculate repayments on financed amount
  const monthlyRepayment = calculateRepayment(
    totalAmountFinanced,
    indicativeRate,
    input.termMonths,
    balloonAmount
  );
  const weeklyRepayment = (monthlyRepayment * 12) / 52;
  const fortnightlyRepayment = (monthlyRepayment * 12) / 26;

  // ===== OPTION 2: Pay platform fee upfront =====
  // Total amount financed = asset cost + establishment fee only
  const totalAmountFinancedFeeUpfront = input.loanAmount + LENDER_ESTABLISHMENT_FEE;

  const monthlyRepaymentFeeUpfront = calculateRepayment(
    totalAmountFinancedFeeUpfront,
    indicativeRate,
    input.termMonths,
    balloonAmount
  );
  const weeklyRepaymentFeeUpfront = (monthlyRepaymentFeeUpfront * 12) / 52;
  const fortnightlyRepaymentFeeUpfront = (monthlyRepaymentFeeUpfront * 12) / 26;

  // Calculate total costs for the financed option
  const totalRepayments = (monthlyRepayment * input.termMonths) + balloonAmount;
  const totalInterest = totalRepayments - totalAmountFinanced;

  // Fees breakdown
  const totalFeesFinanced = LENDER_ESTABLISHMENT_FEE + (financePlatformFee ? PLATFORM_FEE : 0);
  const totalFeesUpfront = PPSR_FEE + (financePlatformFee ? 0 : PLATFORM_FEE);

  // Total cost = all repayments + any upfront fees
  const totalCost = totalRepayments + totalFeesUpfront;

  // ===== BROKER COMPARISON =====
  // Brokers hide their ~2% commission in the interest rate
  const brokerRate = indicativeRate + BROKER_MARGIN;
  const brokerMonthlyRepayment = calculateRepayment(
    input.loanAmount + LENDER_ESTABLISHMENT_FEE, // Brokers also finance establishment
    brokerRate,
    input.termMonths,
    balloonAmount
  );
  const brokerTotalRepayments = (brokerMonthlyRepayment * input.termMonths) + balloonAmount;
  const brokerTotalCost = brokerTotalRepayments + PPSR_FEE;

  // The savings = broker's hidden commission vs our transparent fee
  const estimatedSaving = brokerTotalCost - totalCost;

  return {
    indicativeRate: round(indicativeRate, 2),
    // With fees financed
    monthlyRepayment: round(monthlyRepayment, 2),
    weeklyRepayment: round(weeklyRepayment, 2),
    fortnightlyRepayment: round(fortnightlyRepayment, 2),
    // With fee paid upfront
    monthlyRepaymentFeeUpfront: round(monthlyRepaymentFeeUpfront, 2),
    weeklyRepaymentFeeUpfront: round(weeklyRepaymentFeeUpfront, 2),
    fortnightlyRepaymentFeeUpfront: round(fortnightlyRepaymentFeeUpfront, 2),
    // Totals
    totalInterest: round(totalInterest, 2),
    totalRepayments: round(totalRepayments, 2),
    balloonAmount: round(balloonAmount, 2),
    // Fees
    platformFee: PLATFORM_FEE,
    lenderEstablishmentFee: LENDER_ESTABLISHMENT_FEE,
    ppsrFee: PPSR_FEE,
    totalFeesFinanced: round(totalFeesFinanced, 2),
    totalFeesUpfront: round(totalFeesUpfront, 2),
    totalCost: round(totalCost, 2),
    // Amounts financed
    totalAmountFinanced: round(totalAmountFinanced, 2),
    totalAmountFinancedFeeUpfront: round(totalAmountFinancedFeeUpfront, 2),
    // Broker comparison
    brokerComparisonRate: round(brokerRate, 2),
    brokerComparisonTotalCost: round(brokerTotalCost, 2),
    estimatedSaving: round(estimatedSaving, 2),
    // Flag
    isPlatformFeeFinanced: financePlatformFee,
  };
}

/**
 * Round to specified decimal places
 */
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Format currency for display (Australian dollars)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-AU').format(value);
}
