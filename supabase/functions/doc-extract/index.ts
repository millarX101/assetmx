// Document extraction edge function.
//
// Reads a dealer quote / tax invoice or a driver licence that the customer
// uploaded to the private `application-documents` bucket, and returns the
// fields the application needs as structured JSON. The chat renders them as a
// confirmation card; nothing is written to the application until the customer
// confirms.
//
// Model: Claude Fable 5.1 with server-side refusal fallbacks. Vision input as
// base64 image or PDF document blocks. Effort medium: reading a photographed
// licence is harder than classification.

import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-fable-5-1';
const BUCKET = 'application-documents';
const MAX_BYTES = 20 * 1024 * 1024;

type Kind = 'quote' | 'licence';

interface ExtractRequest {
  kind: Kind;
  paths: string[]; // storage object paths inside the bucket
}

const SCHEMAS: Record<Kind, Record<string, unknown>> = {
  quote: {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'make', 'model', 'year', 'supplierName', 'supplierAbn', 'priceIncGst', 'priceExGst', 'gst', 'condition', 'description', 'notes'],
    properties: {
      found: { type: 'boolean', description: 'true if the document is a vehicle/equipment quote, invoice or contract of sale' },
      make: { type: ['string', 'null'] },
      model: { type: ['string', 'null'], description: 'Model and variant, e.g. "Hilux SR5 dual cab"' },
      year: { type: ['integer', 'null'], description: 'Build or model year' },
      supplierName: { type: ['string', 'null'], description: 'Dealer or seller trading name' },
      supplierAbn: { type: ['string', 'null'], description: '11 digits, no spaces' },
      priceIncGst: { type: ['number', 'null'], description: 'Total drive-away / invoice total including GST, in AUD' },
      priceExGst: { type: ['number', 'null'] },
      gst: { type: ['number', 'null'] },
      condition: { type: ['string', 'null'], enum: ['new', 'demo', 'used', null] },
      description: { type: ['string', 'null'], description: 'One line: year make model, e.g. "2023 Toyota Hilux SR5"' },
      notes: { type: ['string', 'null'], description: 'Anything a credit assessor should know: accessories, trade-in, deposit already paid, odometer' },
    },
  },
  licence: {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'fullName', 'firstName', 'lastName', 'dateOfBirth', 'address', 'licenceNumber', 'state', 'expiry', 'legible'],
    properties: {
      found: { type: 'boolean', description: 'true if the image is an Australian driver licence (front)' },
      fullName: { type: ['string', 'null'] },
      firstName: { type: ['string', 'null'] },
      lastName: { type: ['string', 'null'] },
      dateOfBirth: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
      address: { type: ['string', 'null'], description: 'Residential address as printed, one line' },
      licenceNumber: { type: ['string', 'null'] },
      state: { type: ['string', 'null'], enum: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', null] },
      expiry: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
      legible: { type: 'boolean', description: 'false if glare, blur or cropping prevented a confident read of any required field' },
    },
  },
};

const INSTRUCTIONS: Record<Kind, string> = {
  quote:
    'Read this dealer quote, tax invoice or contract of sale for a business vehicle or equipment purchase in Australia. Extract only what is printed. Prices in AUD as numbers without symbols. If a field is not present, use null. Do not guess a year from a model name.',
  licence:
    'Read this Australian driver licence (front). Extract only what is printed. Dates as YYYY-MM-DD. If any required field cannot be read confidently because of glare, blur or cropping, set legible to false and use null for that field. Never infer or correct a name or address.',
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !supabaseUrl || !serviceKey) return json({ error: 'Extraction service not configured' }, 500);

  let body: ExtractRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body || (body.kind !== 'quote' && body.kind !== 'licence') || !Array.isArray(body.paths) || body.paths.length === 0) {
    return json({ error: 'kind (quote|licence) and paths[] are required' }, 400);
  }

  // Only read inside the application-documents bucket; never follow arbitrary URLs.
  const paths = body.paths.slice(0, 4).map((p) => String(p).replace(/^\/+/, ''));
  if (paths.some((p) => p.includes('..'))) return json({ error: 'Invalid path' }, 400);

  const supabase = createClient(supabaseUrl, serviceKey);
  const content: Anthropic.ContentBlockParam[] = [];

  for (const path of paths) {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) {
      console.error('download failed', path, error?.message);
      return json({ error: `Could not read ${path}` }, 404);
    }
    if (data.size > MAX_BYTES) return json({ error: 'File too large' }, 413);
    const bytes = new Uint8Array(await data.arrayBuffer());
    const b64 = toBase64(bytes);
    const mime = data.type || 'application/octet-stream';
    if (mime === 'application/pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
    } else if (IMAGE_TYPES.has(mime)) {
      content.push({ type: 'image', source: { type: 'base64', media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: b64 } });
    } else {
      return json({ error: `Unsupported file type ${mime}` }, 415);
    }
  }
  content.push({ type: 'text', text: INSTRUCTIONS[body.kind] });

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1500,
      betas: ['server-side-fallback-2026-07-01'],
      // @ts-expect-error fallbacks "default" form is newer than the SDK typings
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMAS[body.kind] } },
      system:
        'You extract fields from Australian finance documents for a credit application. Return only what is printed on the document. Never fabricate. Australian date formats on documents are DD/MM/YYYY.',
      messages: [{ role: 'user', content }],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'Document could not be processed' }, 422);

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: 'Extraction returned no data' }, 502);
    }
    return json({ kind: body.kind, fields: parsed, usage: response.usage, model: response.model });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Extraction service busy' }, 429);
    if (error instanceof Anthropic.APIError) {
      console.error('Claude API error', error.status, error.message);
      return json({ error: 'Extraction service error' }, 502);
    }
    console.error('doc-extract error', error);
    return json({ error: 'Extraction failed' }, 500);
  }
});
