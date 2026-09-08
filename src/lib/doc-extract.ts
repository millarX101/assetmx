// Client for the doc-extract edge function (Claude reads uploaded documents).
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from '@/lib/supabase';

export type ExtractKind = 'quote' | 'licence';

export interface ExtractResult {
  kind: ExtractKind;
  fields: Record<string, unknown>;
}

export async function extractDocument(kind: ExtractKind, paths: string[]): Promise<ExtractResult | null> {
  if (!isSupabaseConfigured() || paths.length === 0) return null;
  try {
    const res = await fetch(`${getSupabaseUrl()}/functions/v1/doc-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: getSupabaseAnonKey() ?? '' },
      body: JSON.stringify({ kind, paths }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.fields !== 'object') return null;
    return { kind, fields: data.fields as Record<string, unknown> };
  } catch {
    return null;
  }
}
