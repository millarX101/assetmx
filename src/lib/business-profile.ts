// Background business check (edge function business-profile).
// The first call starts the research on the server and returns 'running' at once (it
// takes 1-3 minutes, longer than a request may stay open). When the chat reaches the
// confirm step it polls the same endpoint until the saved profile is ready.
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from '@/lib/supabase';

export interface BusinessProfile {
  status: 'running' | 'done' | 'not_found' | 'failed';
  entityName?: string;
  profile?: {
    matched: boolean;
    confidence: 'high' | 'medium' | 'low';
    summary: string;
    description: string;
    industry: string | null;
    activities: string | null;
    servicesProducts: string[];
    customers: string | null;
    serviceArea: string | null;
    locations: string[];
    operatingSince: string | null;
    history: string | null;
    size: string | null;
    accreditations: string[];
    website: string | null;
    onlinePresence: string[];
    reviews: string | null;
    tradingNames: string[];
    keyPeople: { name: string; role: string }[];
    lenderNotes: string | null;
  };
  sources?: { url: string; title: string }[];
}

const started = new Set<string>();
const POLL_MS = 4000;

function request(abn: string): Promise<BusinessProfile | null> {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  return fetch(`${getSupabaseUrl()}/functions/v1/business-profile`, {
    method: 'POST',
    // The function is deployed with JWT verification: send the anon key as the bearer too
    headers: { 'Content-Type': 'application/json', apikey: getSupabaseAnonKey() ?? '', Authorization: `Bearer ${getSupabaseAnonKey() ?? ''}` },
    body: JSON.stringify({ abn }),
  })
    .then((res) => res.json())
    .then((data) => (data && typeof data.status === 'string' ? (data as BusinessProfile) : null))
    .catch(() => null);
}

/** Starts the check on the server (fire and forget; once per ABN per page load). */
export function startBusinessProfile(abn: string) {
  const clean = abn.replace(/\D/g, '');
  if (clean.length !== 11 || started.has(clean)) return;
  started.add(clean);
  void request(clean);
}

/** Polls until the profile is ready, or gives up after timeoutMs (returns null). */
export async function getBusinessProfile(abn: string, timeoutMs = 60000): Promise<BusinessProfile | null> {
  const clean = abn.replace(/\D/g, '');
  if (clean.length !== 11) return null;
  started.add(clean);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await request(clean); // also starts it if it never was
    if (result && result.status !== 'running') return result;
    if (Date.now() + POLL_MS > deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}
