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

// ---------------------------------------------------------------------------
// Inline documents (driver licences). We may not store licences, so the image
// is held here in memory only - never in chat state (which is saved to
// localStorage) and never in Storage. It is sent in the extraction request and
// dropped as soon as it has been taken.
// ---------------------------------------------------------------------------

export interface InlineDocument {
  data: string; // base64, no data: prefix
  mediaType: string;
}

const inlineDocuments = new Map<string, InlineDocument>();

export function stashInlineDocument(id: string, doc: InlineDocument) {
  inlineDocuments.set(id, doc);
}

/** Returns the documents for these ids and forgets them. */
export function takeInlineDocuments(ids: string[]): InlineDocument[] {
  const docs: InlineDocument[] = [];
  for (const id of ids) {
    const doc = inlineDocuments.get(id);
    if (doc) docs.push(doc);
    inlineDocuments.delete(id);
  }
  return docs;
}

export async function extractInlineDocument(kind: ExtractKind, files: InlineDocument[]): Promise<ExtractResult | null> {
  if (!isSupabaseConfigured() || files.length === 0) return null;
  try {
    const res = await fetch(`${getSupabaseUrl()}/functions/v1/doc-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: getSupabaseAnonKey() ?? '' },
      body: JSON.stringify({ kind, files }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.fields !== 'object') return null;
    return { kind, fields: data.fields as Record<string, unknown> };
  } catch {
    return null;
  }
}

/**
 * Reads a photo into a JPEG no larger than maxEdge px on its long side (PDFs pass
 * through). Shrinks phone photos to a few hundred KB and converts HEIC where the
 * browser can decode it (Safari).
 */
export async function fileToInlineDocument(file: File, maxEdge = 2000): Promise<InlineDocument> {
  if (file.type === 'application/pdf') {
    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < buf.length; i += 0x8000) binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { data: btoa(binary), mediaType: 'application/pdf' };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image'));
      el.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
