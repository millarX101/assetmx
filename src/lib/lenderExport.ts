// Admin: application export for lenders (edge function lender-export).
// Adapters live server-side in supabase/functions/_shared/lender/adapters.ts.
import { supabase, getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

export interface LenderOption {
  id: string;
  name: string;
  description: string;
  canSubmit: boolean;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('lender-export', { body });
  if (error) {
    // supabase-js wraps non-2xx replies; surface the function's own message
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? await ctx.json().then((j) => j.error).catch(() => null) : null;
    throw new Error(msg || error.message);
  }
  return data as T;
}

export async function listLenders(): Promise<LenderOption[]> {
  const data = await call<{ lenders: LenderOption[] }>({ action: 'lenders' });
  return data.lenders;
}

/** Builds the lender's payload (recorded in lender_submissions) and downloads it as JSON. */
export async function exportForLender(applicationId: string, lender: string): Promise<void> {
  const data = await call<{ payload: { reference?: string } }>({ action: 'export', application_id: applicationId, lender });
  const ref = data.payload?.reference || applicationId.slice(0, 8);
  const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ref}-${lender}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Downloads Westpac's SIMPLE+ application form pre-filled (edge function simple-plus-form). */
export async function downloadSimplePlusForm(applicationId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${getSupabaseUrl()}/functions/v1/simple-plus-form`, {
    method: 'POST',
    headers: {
      apikey: getSupabaseAnonKey() ?? '',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ application_id: applicationId }),
  });
  if (!res.ok) {
    const msg = await res.json().then((j) => j.error).catch(() => null);
    throw new Error(msg || `Form request failed (${res.status})`);
  }
  const name = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'westpac-simple-plus.pdf';
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
