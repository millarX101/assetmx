// Rate fetching utilities for AssetMX
// Fetches rates from Supabase and updates the calculator cache

import { supabase, isSupabaseConfigured } from './supabase';
import { updateRateCache, DEFAULT_RATES } from './calculator';

export interface RateConfig {
  id: string;
  term_months: number;
  base_rate: number;
  is_active: boolean;
  updated_at: string;
}

export interface FeeConfig {
  id: string;
  fee_name: string;
  amount: number;
  description: string | null;
  condition?: string; // e.g., 'private_sale' for inspection fee
}

// Fetch rates from database and update cache
export async function fetchRates(): Promise<Record<number, number>> {
  if (!isSupabaseConfigured()) {
    console.log('[Rates] Supabase not configured, using defaults');
    return DEFAULT_RATES;
  }

  try {
    // Fetch term-based rates from rate_config table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('rate_config') as any)
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('[Rates] Error fetching rates:', error);
      return DEFAULT_RATES;
    }

    if (!data || data.length === 0) {
      console.log('[Rates] No rates in database, using defaults');
      return DEFAULT_RATES;
    }

    // Convert to term_months -> rate map
    // Handle both old schema (asset_type/condition) and new schema (term_months)
    const rates: Record<number, number> = { ...DEFAULT_RATES };

    for (const row of data) {
      // New schema: term_months field
      if (row.term_months) {
        rates[row.term_months] = row.base_rate;
      }
      // Old schema: try to map asset_condition to term (as fallback)
      // For now, just use the base_rate as the default for all terms
    }

    // Update the calculator cache
    updateRateCache(rates);
    console.log('[Rates] Loaded rates from database:', rates);

    return rates;
  } catch (err) {
    console.error('[Rates] Unexpected error:', err);
    return DEFAULT_RATES;
  }
}

// Fetch fees from database
export async function fetchFees(): Promise<FeeConfig[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('fee_config') as any)
      .select('*');

    if (error) {
      console.error('[Fees] Error fetching fees:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[Fees] Unexpected error:', err);
    return [];
  }
}

// Get inspection fee for private sales (if configured)
export async function getInspectionFee(): Promise<number> {
  const fees = await fetchFees();
  const inspectionFee = fees.find(f => f.fee_name === 'inspection_fee');
  return inspectionFee?.amount || 250; // Default $250
}
