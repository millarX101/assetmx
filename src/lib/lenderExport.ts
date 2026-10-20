// Admin: application export for lenders (edge function lender-export).
// Adapters live server-side in supabase/functions/_shared/lender/adapters.ts.
import { supabase } from '@/lib/supabase';

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
