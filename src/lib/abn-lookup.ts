// ABN Lookup Service
// Uses Australian Business Register (ABR) API via Supabase Edge Function

import type { ABNLookupResult, EntityType } from '@/types/application';
import { supabase } from './supabase';

/**
 * Clean ABN string (remove spaces and non-digits)
 */
export function cleanABN(abn: string): string {
  return abn.replace(/\D/g, '');
}

/**
 * Format ABN for display (XX XXX XXX XXX)
 */
export function formatABN(abn: string): string {
  const clean = cleanABN(abn);
  if (clean.length !== 11) return abn;
  return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 11)}`;
}

/**
 * Validate ABN using the official algorithm
 * Returns true if the ABN is mathematically valid
 */
export function validateABN(abn: string): boolean {
  const clean = cleanABN(abn);

  if (clean.length !== 11) return false;

  // ABN validation weights
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

  // Subtract 1 from first digit
  const digits = clean.split('').map((d, i) => {
    const num = parseInt(d, 10);
    return i === 0 ? num - 1 : num;
  });

  // Calculate weighted sum
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0);

  // Valid if divisible by 89
  return sum % 89 === 0;
}

/**
 * Map ABR entity type to our EntityType
 */
function mapEntityType(abrEntityType: string): EntityType {
  const typeMap: Record<string, EntityType> = {
    'Australian Private Company': 'company',
    'Australian Public Company': 'company',
    'Private Company': 'company',
    'Public Company': 'company',
    'Discretionary Trading Trust': 'trust',
    'Family Trust': 'trust',
    'Unit Trust': 'trust',
    'Fixed Trust': 'trust',
    'Hybrid Trust': 'trust',
    'Trust': 'trust',
    'Sole Trader': 'sole_trader',
    'Individual/Sole Trader': 'sole_trader',
    'Partnership': 'partnership',
    'Limited Partnership': 'partnership',
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (abrEntityType.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Default to company if unknown
  return 'company';
}

/**
 * Look up ABN details via Supabase Edge Function
 * Falls back to mock data if Edge Function is not available
 */
export async function lookupABN(abn: string): Promise<ABNLookupResult | null> {
  const clean = cleanABN(abn);

  // Validate first
  if (!validateABN(clean)) {
    return null;
  }

  try {
    // Try the Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('abn-lookup', {
      body: { abn: clean },
    });

    if (error) {
      console.warn('ABN lookup edge function error, falling back to mock:', error);
      return getMockABNResult(clean);
    }

    if (!data.found) {
      console.warn('ABN not found:', data.error);
      return null;
    }

    // Map the response to our format
    const result: ABNLookupResult = {
      abn: clean,
      abnStatus: data.abnStatus || 'Active',
      abnRegisteredDate: data.abnRegisteredDate || data.abnStatusFromDate,
      entityName: data.entityName,
      entityType: mapEntityType(data.entityType),
      gstRegistered: data.gstRegistered,
      gstRegisteredDate: data.gstRegisteredDate || undefined,
      tradingName: undefined, // ABR basic lookup doesn't include trading names
      businessAddress: data.businessAddress || '',
      state: data.state,
      postcode: data.postcode,
    };

    return result;
  } catch (err) {
    console.warn('ABN lookup failed, falling back to mock:', err);
    return getMockABNResult(clean);
  }
}

/**
 * Mock ABN lookup for development/fallback
 */
function getMockABNResult(clean: string): ABNLookupResult {
  // Generate deterministic mock data based on ABN
  const seed = parseInt(clean.slice(0, 4), 10);

  const yearsAgo = (seed % 10) + 1;
  const monthsAgo = seed % 12;
  const registeredDate = new Date();
  registeredDate.setFullYear(registeredDate.getFullYear() - yearsAgo);
  registeredDate.setMonth(registeredDate.getMonth() - monthsAgo);

  const entityTypes: EntityType[] = ['company', 'trust', 'sole_trader', 'partnership'];
  const entityType = entityTypes[seed % 4];

  const gstRegistered = seed % 10 !== 0;

  const gstDate = new Date(registeredDate);
  gstDate.setMonth(gstDate.getMonth() + 1);

  const industries = ['Construction', 'Transport', 'Services', 'Manufacturing', 'Retail', 'Technology'];
  const suffixes = ['Pty Ltd', 'Holdings Pty Ltd', 'Group Pty Ltd', 'Australia Pty Ltd'];
  const industry = industries[seed % industries.length];
  const suffix = entityType === 'company' ? suffixes[seed % suffixes.length] : '';

  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA'];
  const state = states[seed % states.length];

  return {
    abn: clean,
    abnStatus: 'Active',
    abnRegisteredDate: registeredDate.toISOString().split('T')[0],
    entityName: `${industry} ${suffix}`.trim(),
    entityType,
    gstRegistered,
    gstRegisteredDate: gstRegistered ? gstDate.toISOString().split('T')[0] : undefined,
    tradingName: seed % 3 === 0 ? `${industry} Co` : undefined,
    businessAddress: `${100 + (seed % 900)} ${industry} Street`,
    state,
    postcode: `${2000 + (seed % 8000)}`,
  };
}

/**
 * Check if we should use mock ABN lookup
 * In production, this would check for API credentials
 */
export function isABNLookupConfigured(): boolean {
  // TODO: Check for ABR API credentials
  // return !!import.meta.env.VITE_ABR_GUID;
  return false; // Always use mock for now
}

/**
 * Get ABN age in months from registration date
 */
export function getABNAgeMonths(registeredDate: string): number {
  const registered = new Date(registeredDate);
  const now = new Date();
  const yearDiff = now.getFullYear() - registered.getFullYear();
  const monthDiff = now.getMonth() - registered.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Format ABN age for display
 */
export function formatABNAge(registeredDate: string): string {
  const months = getABNAgeMonths(registeredDate);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }

  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
}

/**
 * Search result from ABN name search
 */
export interface ABNSearchResult {
  abn: string;
  entityName: string;
  entityType: string;
  state: string;
  postcode: string;
  score: number;
}

/**
 * Search for businesses by name via Supabase Edge Function
 * Returns top matches from the ABR database
 */
export async function searchABNByName(name: string, maxResults = 5): Promise<ABNSearchResult[]> {
  if (!name || name.trim().length < 2) {
    return [];
  }

  try {
    // Try the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('abn-search', {
      body: { name: name.trim(), maxResults },
    });

    if (error) {
      console.warn('ABN search edge function error, falling back to mock:', error);
      return getMockSearchResults(name, maxResults);
    }

    if (data.error) {
      console.warn('ABN search returned error:', data.error);
      return getMockSearchResults(name, maxResults);
    }

    return data.results || [];
  } catch (err) {
    console.warn('ABN search failed, falling back to mock:', err);
    return getMockSearchResults(name, maxResults);
  }
}

/**
 * Mock search results for development/fallback
 */
function getMockSearchResults(name: string, maxResults: number): ABNSearchResult[] {
  // Generate deterministic mock results based on search term
  const searchLower = name.toLowerCase();
  const seed = searchLower.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const mockBusinesses = [
    { suffix: 'Pty Ltd', type: 'Australian Private Company' },
    { suffix: 'Holdings Pty Ltd', type: 'Australian Private Company' },
    { suffix: 'Group', type: 'Discretionary Trading Trust' },
    { suffix: 'Services', type: 'Sole Trader' },
    { suffix: 'Australia', type: 'Australian Private Company' },
  ];

  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA'];

  // Generate mock results that match the search term
  const results: ABNSearchResult[] = [];
  for (let i = 0; i < Math.min(maxResults, 3); i++) {
    const business = mockBusinesses[(seed + i) % mockBusinesses.length];
    const state = states[(seed + i) % states.length];

    // Generate a valid-looking ABN
    const abnBase = (51824753556 + seed + i * 1000) % 99999999999;
    const abnStr = String(abnBase).padStart(11, '0');
    const formattedAbn = `${abnStr.slice(0, 2)} ${abnStr.slice(2, 5)} ${abnStr.slice(5, 8)} ${abnStr.slice(8, 11)}`;

    // Capitalize the search term for the business name
    const capitalizedName = name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    results.push({
      abn: formattedAbn,
      entityName: `${capitalizedName} ${business.suffix}`,
      entityType: business.type,
      state,
      postcode: `${2000 + (seed + i) % 6000}`,
      score: 100 - i * 10,
    });
  }

  return results;
}
