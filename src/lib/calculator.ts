// AssetMX Calculator Logic
// Transparent pricing with broker comparison

export interface QuoteInput {
  assetType: 'vehicle' | 'truck' | 'equipment' | 'technology';
  assetCondition: 'new' | 'demo' | 'used_0_3' | 'used_4_7' | 'used_8_plus';
  loanAmount: number;
  termMonths: number;
  balloonPercentage: number;
}

export interface QuoteOutput {
  indicativeRate: number;
  monthlyRepayment: number;
  weeklyRepayment: number;
  fortnightlyRepayment: number;
  totalInterest: number;
  totalRepayments: number;
  balloonAmount: number;
  platformFee: number;
  lenderEstablishmentFee: number;
  ppsrFee: number;
  totalFees: number;
  totalCost: number;
  brokerComparisonRate: number;
  brokerComparisonTotalCost: number;
  estimatedSaving: number;
}

// Fee constants - TRANSPARENT PRICING
export const PLATFORM_FEE = 800;
export const PPSR_FEE = 7.40;
export const LENDER_ESTABLISHMENT_FEE = 495;
export const BROKER_MARGIN = 2.00; // What brokers typically add to hide commission (~$2k on $100k vs our $800)

// Base rates by asset type and condition (from lender rate sheets)
// These are the ACTUAL lender rates - no markup
export const BASE_RATES: Record<string, Record<string, number>> = {
  vehicle: {
    new: 6.29,
    demo: 6.29,
    used_0_3: 6.49,
    used_4_7: 6.99,
    used_8_plus: 7.49
  },
  truck: {
    new: 6.49,
    demo: 6.49,
    used_0_3: 6.79,
    used_4_7: 7.29,
    used_8_plus: 7.99
  },
  equipment: {
    new: 6.49,
    demo: 6.79,
    used_0_3: 6.99,
    used_4_7: 7.49,
    used_8_plus: 8.29
  },
  technology: {
    new: 7.49,
    demo: 7.99,
    used_0_3: 8.29,
    used_4_7: 9.49,
    used_8_plus: 10.99
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
 */
export function calculateQuote(input: QuoteInput): QuoteOutput {
  // Validate inputs
  if (input.loanAmount < 5000 || input.loanAmount > 500000) {
    throw new Error('Loan amount must be between $5,000 and $500,000');
  }
  if (input.termMonths < 12 || input.termMonths > 84) {
    throw new Error('Loan term must be between 12 and 84 months');
  }
  if (input.balloonPercentage < 0 || input.balloonPercentage > 50) {
    throw new Error('Balloon percentage must be between 0% and 50%');
  }

  // Get base rate from lender rate sheet
  const baseRate = BASE_RATES[input.assetType]?.[input.assetCondition];
  if (!baseRate) {
    throw new Error('Invalid asset type or condition');
  }

  // Our indicative rate IS the base rate - no markup
  const indicativeRate = baseRate;
  const balloonAmount = input.loanAmount * (input.balloonPercentage / 100);

  // Calculate repayments at base rate
  const monthlyRepayment = calculateRepayment(
    input.loanAmount,
    indicativeRate,
    input.termMonths,
    balloonAmount
  );

  const weeklyRepayment = (monthlyRepayment * 12) / 52;
  const fortnightlyRepayment = (monthlyRepayment * 12) / 26;

  // Calculate total cost
  const totalRepayments = (monthlyRepayment * input.termMonths) + balloonAmount;
  const totalInterest = totalRepayments - input.loanAmount;

  // All fees shown separately - TRANSPARENT
  const totalFees = PLATFORM_FEE + LENDER_ESTABLISHMENT_FEE + PPSR_FEE;
  const totalCost = totalRepayments + totalFees;

  // ===== BROKER COMPARISON =====
  // This shows what the SAME loan costs with a broker
  // Brokers hide their ~2% commission in the interest rate
  const brokerRate = indicativeRate + BROKER_MARGIN;
  const brokerMonthlyRepayment = calculateRepayment(
    input.loanAmount,
    brokerRate,
    input.termMonths,
    balloonAmount
  );
  const brokerTotalRepayments = (brokerMonthlyRepayment * input.termMonths) + balloonAmount;

  // Brokers still charge similar establishment fees but hide the big commission
  const brokerTotalCost = brokerTotalRepayments + LENDER_ESTABLISHMENT_FEE + PPSR_FEE;

  // The savings = broker's hidden commission
  const estimatedSaving = brokerTotalCost - totalCost;

  return {
    indicativeRate: round(indicativeRate, 2),
    monthlyRepayment: round(monthlyRepayment, 2),
    weeklyRepayment: round(weeklyRepayment, 2),
    fortnightlyRepayment: round(fortnightlyRepayment, 2),
    totalInterest: round(totalInterest, 2),
    totalRepayments: round(totalRepayments, 2),
    balloonAmount: round(balloonAmount, 2),
    platformFee: PLATFORM_FEE,
    lenderEstablishmentFee: LENDER_ESTABLISHMENT_FEE,
    ppsrFee: PPSR_FEE,
    totalFees: round(totalFees, 2),
    totalCost: round(totalCost, 2),
    brokerComparisonRate: round(brokerRate, 2),
    brokerComparisonTotalCost: round(brokerTotalCost, 2),
    estimatedSaving: round(estimatedSaving, 2),
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
