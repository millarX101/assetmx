// Background business check (edge function business-profile).
// Started as soon as the applicant confirms their ABN; the chat awaits the same
// request later, when it shows the result for them to confirm. The function caches
// per ABN, so a page reload simply asks again and gets the saved profile.
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from '@/lib/supabase';

export interface BusinessProfile {
  status: 'done' | 'not_found' | 'failed';
  entityName?: string;
  profile?: {
    matched: boolean;
    confidence: 'high' | 'medium' | 'low';
    summary: string;
    industry: string | null;
    activities: string | null;
    website: string | null;
    tradingNames: string[];
    locations: string[];
    operatingSince: string | null;
    keyPeople: { name: string; role: string }[];
    lenderNotes: string | null;
  };
  sources?: { url: string; title: string }[];
}

const pending = new Map<string, Promise<BusinessProfile | null>>();

function request(abn: string): Promise<BusinessProfile | null> {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  return fetch(`${getSupabaseUrl()}/functions/v1/business-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: getSupabaseAnonKey() ?? '' },
    body: JSON.stringify({ abn }),
  })
    .then((res) => res.json())
    .then((data) => (data && typeof data.status === 'string' ? (data as BusinessProfile) : null))
    .catch(() => null);
}

/** Starts the check in the background (no-op if already running for this ABN). */
export function startBusinessProfile(abn: string) {
  const clean = abn.replace(/\D/g, '');
  if (clean.length !== 11 || pending.has(clean)) return;
  pending.set(clean, request(clean));
}

/** The check's result, waiting at most timeoutMs for it to finish. */
export async function getBusinessProfile(abn: string, timeoutMs = 30000): Promise<BusinessProfile | null> {
  const clean = abn.replace(/\D/g, '');
  if (clean.length !== 11) return null;
  if (!pending.has(clean)) pending.set(clean, request(clean));
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([pending.get(clean)!, timeout]);
}
