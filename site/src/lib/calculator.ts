/**
 * Pure quote maths, shared by the public quote island and the app.
 * Payments in advance, balloon on asset value, fees financed per lender practice.
 * Kept dependency-free so it can be unit tested and run in the browser.
 */
import { PRICING } from '@/data/entity';
import { rateForTerm, maxBalloon } from '@/data/rates';

export interface QuoteInput {
  amount: number;
  termMonths: number;
  balloonPct: number;
  financePlatformFee?: boolean;
}

export interface QuoteOutput {
  ratePct: number;
  monthly: number;
  weekly: number;
  fortnightly: number;
  balloon: number;
  amountFinanced: number;
  totalRepayments: number;
  totalInterest: number;
  totalCost: number;
  platformFee: number;
  lenderEstablishmentFee: number;
  brokerRatePct: number;
  brokerMonthly: number;
  brokerTotalCost: number;
  saving: number;
}

export function pmt(principal: number, annualRatePct: number, n: number, balloon: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return (principal - balloon) / n;
  const pvBalloon = balloon / Math.pow(1 + r, n);
  const p = principal - pvBalloon;
  return (p * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

export function calculateQuote(input: QuoteInput): QuoteOutput {
  const { amount, termMonths, balloonPct } = input;
  if (amount < PRICING.minAmount || amount > PRICING.maxAmount) throw new Error('Amount out of range');
  if (termMonths < PRICING.minTermMonths || termMonths > PRICING.maxTermMonths) throw new Error('Term out of range');
  if (balloonPct < 0 || balloonPct > maxBalloon(termMonths)) throw new Error('Balloon out of range');

  const financeFee = input.financePlatformFee !== false;
  const ratePct = rateForTerm(termMonths);
  const balloon = amount * (balloonPct / 100);
  const amountFinanced = amount + PRICING.lenderEstablishmentFee + (financeFee ? PRICING.platformFee : 0);
  const monthly = pmt(amountFinanced, ratePct, termMonths, balloon);
  const totalRepayments = monthly * termMonths + balloon;
  const totalInterest = totalRepayments - amountFinanced;
  const totalCost = totalRepayments + (financeFee ? 0 : PRICING.platformFee);

  const brokerRatePct = ratePct + PRICING.typicalBrokerMarginPct;
  const brokerMonthly = pmt(amount + PRICING.lenderEstablishmentFee, brokerRatePct, termMonths, balloon);
  const brokerTotalCost = brokerMonthly * termMonths + balloon;

  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    ratePct,
    monthly: r2(monthly),
    weekly: r2((monthly * 12) / 52),
    fortnightly: r2((monthly * 12) / 26),
    balloon: r2(balloon),
    amountFinanced: r2(amountFinanced),
    totalRepayments: r2(totalRepayments),
    totalInterest: r2(totalInterest),
    totalCost: r2(totalCost),
    platformFee: PRICING.platformFee,
    lenderEstablishmentFee: PRICING.lenderEstablishmentFee,
    brokerRatePct: r2(brokerRatePct),
    brokerMonthly: r2(brokerMonthly),
    brokerTotalCost: r2(brokerTotalCost),
    saving: r2(brokerTotalCost - totalCost),
  };
}
