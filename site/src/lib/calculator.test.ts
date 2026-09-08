import { describe, it, expect } from 'vitest';
import { calculateQuote, pmt } from './calculator';

describe('pmt', () => {
  it('matches a plain amortising loan when balloon is 0', () => {
    // Independent closed-form PMT for $100k at 6.89% over 60 months
    const r = 0.0689 / 12;
    const expected = (100_000 * r * Math.pow(1 + r, 60)) / (Math.pow(1 + r, 60) - 1);
    expect(pmt(100_000, 6.89, 60, 0)).toBeCloseTo(expected, 6);
    expect(expected).toBeGreaterThan(1900);
    expect(expected).toBeLessThan(2050);
  });
  it('handles zero rate', () => {
    expect(pmt(12_000, 0, 12, 0)).toBe(1000);
  });
});

describe('calculateQuote', () => {
  it('uses the term-based lender rate and itemises fees', () => {
    const q = calculateQuote({ amount: 100_000, termMonths: 60, balloonPct: 30 });
    expect(q.ratePct).toBe(6.89);
    expect(q.amountFinanced).toBe(101_300);
    expect(q.platformFee).toBe(800);
    expect(q.balloon).toBe(30_000);
    expect(q.saving).toBeGreaterThan(0);
  });
  it('rejects a balloon above the term cap', () => {
    expect(() => calculateQuote({ amount: 50_000, termMonths: 60, balloonPct: 40 })).toThrow();
  });
});
