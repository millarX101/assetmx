// Goods-fit check: does the asset suit the business?
//
// Metro's streamlined products require "goods of the type normally used by the business
// as part of its normal trading activities"; Westpac asks for a reason for purchase.
// The chat calls this after the applicant gives the reason for purchase. It only flags
// (yes / unclear / no, with a one-line note for the team); it never blocks an application.
//
// Model: Claude Haiku 5.5 (fast; the customer is waiting), low effort, structured output.

import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-haiku-5-5';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fit', 'note'],
  properties: {
    fit: { type: 'string', enum: ['yes', 'unclear', 'no'] },
    note: { type: 'string', description: 'One plain sentence for the broker explaining the judgement' },
  },
};

const SYSTEM = `You help an Australian asset finance broker check that a financed asset suits the borrowing business, as lenders require goods "of the type normally used by the business as part of its normal trading activities".

Answer "yes" when the asset plausibly serves the business's trade or the stated purpose (a ute for a builder, an excavator for an earthmover, a car for a consultant's client visits). Answer "unclear" when there is too little information or the link is weak. Answer "no" only when the asset clearly has nothing to do with the business or looks personal (a jet ski for an accounting firm). Business vehicles for staff or the owner are normal.`;

const str = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'Not configured' }, 500);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const asset = str(b.asset, 200);
  if (!asset) return json({ error: 'asset is required' }, 400);

  const facts = [
    `Business: ${str(b.businessName, 200) || 'unknown'}`,
    `What the business does: ${str(b.businessDescription) || 'unknown'}`,
    b.industry ? `Industry: ${str(b.industry, 200)}` : '',
    `Asset being financed: ${asset} (${str(b.assetType, 40) || 'type unknown'})`,
    `Stated reason for purchase: ${str(b.purpose) || 'not given'}`,
  ].filter(Boolean).join('\n');

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: facts }],
    });
    if (response.stop_reason === 'refusal') return json({ fit: 'unclear', note: 'Automatic check declined; review by hand.' });
    const text = response.content.find((c) => c.type === 'text');
    const parsed = JSON.parse(text && text.type === 'text' ? text.text : '{}');
    return json({ fit: parsed.fit ?? 'unclear', note: parsed.note ?? '' });
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error('Claude API error', error.status, error.message);
    else console.error('goods-fit error', error);
    return json({ fit: 'unclear', note: 'Automatic check unavailable; review by hand.' }, 200);
  }
});
