// Chat AI edge function: Claude assists the scripted application flow.
//
// The chat itself is a deterministic state machine (src/lib/chat-flow.ts).
// Claude is called only when the customer types something the current step
// cannot parse: it extracts the value in canonical form, answers a question
// grounded in the facts below, or flags that a human should take over.
//
// Model: Claude Fable 5.1 (explicitly requested) with server-side refusal
// fallbacks enabled, low effort (classification/extraction), cached system prompt.

import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-fable-5-1';

// Facts are the single source of truth for what Claude may say about AssetMX.
// Keep identical to site/src/data/entity.ts and site/src/data/rates.ts.
const FACTS = `
ENTITY
- AssetMX is a trading name of Blackrock Leasing Pty Ltd, ABN 15 681 267 818, Australian Credit Licence 569484. Email info@assetmx.com.au.

PRICING (fixed positioning)
- One flat $800 AssetMX fee, disclosed up front. It can be financed into the loan or paid before settlement. AssetMX receives no lender commission and adds nothing to the lender's rate.
- Lender establishment fee: typically $500, financed into the loan.
- Private-sale inspection fee: $250 may apply.
- Indicative lender base rates, verified 8 September 2026: 12 months 9.10% p.a., 24 months 8.10% p.a., 36 to 60 months 7.50% p.a. The lender sets the final rate on formal application.
- Amount $5,000 to $500,000. Term 12 to 84 months. Maximum balloon by term: 1 year 65%, 2 years 60%, 3 years 50%, 4 years 40%, 5 years or more 30%. Balloon is calculated on the asset value. Repayments are in advance.

ELIGIBILITY (bank low-doc policy)
- ABN active 24 months or more, registered for GST, at least one director or guarantor, clean credit (no defaults or judgments), asset for business use, asset no older than 15 years at the end of the term.
- Low-doc means no tax returns or full financials for in-policy applications: driver licence, business bank statements (3 to 6 months) and the supplier invoice are enough. Lenders may ask for more on large or complex deals.
- If the business does not fit, say so plainly and suggest a broker. Do not promise approval.

PROCESS
- Quote is instant. Conditional approval is typically the same business day for in-policy applications. Settlement usually 1 to 2 business days after signed documents and invoice. Never say "15 minutes".
- No credit check until the customer explicitly consents inside the application.

STRUCTURES
- Chattel mortgage: business owns the asset from day one, lender holds security, GST on the price usually claimable up front by GST-registered businesses, interest and depreciation generally deductible to the business-use share.
- Finance lease: lender owns, business rents, residual at the end. Novated leases are for employees and are referred to millarX.
- Tax questions: give the general rule above, then say to confirm with their accountant. Never give personal tax advice.
`.trim();

const STYLE = `
You are the assistant inside the AssetMX guided finance application. Australian English. Plain, warm, brief. No hype, no exclamation marks, no emoji, no markdown.
Keep replies to at most two short sentences, then restate the current question so the customer knows what to answer next.
Use only the facts provided. If asked something outside them, say you are not sure and that a person from AssetMX can follow up by email.
`.trim();

interface Step {
  id: string;
  question: string;
  inputType: string;
  field?: string;
  options?: { label: string; value: string }[];
}

interface AssistRequest {
  step: Step;
  userText: string;
  context?: Record<string, string | number | boolean | null | undefined>;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'value', 'reply'],
  properties: {
    intent: {
      type: 'string',
      enum: ['answer', 'question', 'change', 'handoff', 'unclear'],
      description:
        'answer: the text answers the current question and value is filled. question: the customer asked something; reply answers it and restates the question. change: they want to go back or change an earlier answer. handoff: they want a person or are outside policy. unclear: cannot tell.',
    },
    value: {
      type: ['string', 'null'],
      description:
        'Canonical value for the current step when intent is answer, else null. number: digits only, no symbols (e.g. 50000). date: YYYY-MM-DD. select or confirm: exactly one of the option values. abn: 11 digits. phone: digits only. email: lowercase. text: cleaned text. asset_description: a JSON object string with keys make, model, year (integer), supplierName, priceIncGst (number, AUD), condition (new|demo|used); use null for anything not stated, never guess.',
    },
    reply: {
      type: 'string',
      description: 'What the assistant says next. Empty string when intent is answer and no comment is needed.',
    },
  },
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'AI service not configured' }, 500);

  let body: AssistRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body?.step?.id || typeof body.userText !== 'string') {
    return json({ error: 'step and userText are required' }, 400);
  }

  const client = new Anthropic({ apiKey });

  const ctx = Object.entries(body.context ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const stepBlock = [
    `CURRENT STEP: ${body.step.id}`,
    `QUESTION ASKED: ${body.step.question}`,
    `EXPECTED INPUT: ${body.step.inputType}${body.step.field ? ` (stores to ${body.step.field})` : ''}`,
    body.step.inputType === 'asset_description'
      ? 'The customer is describing the vehicle or equipment they want to finance in a sentence. Intent is answer; value is the JSON object string described in the schema. Prices like "68k drive-away" mean 68000 including GST.'
      : '',
    body.step.options?.length
      ? `OPTIONS (value = label): ${body.step.options.map((o) => `${o.value} = ${o.label}`).join('; ')}`
      : '',
    ctx ? `APPLICATION SO FAR:\n${ctx}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const history: Anthropic.MessageParam[] = (body.history ?? []).slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 600,
      betas: ['server-side-fallback-2026-07-01'],
      // @ts-expect-error fallbacks "default" form is newer than the SDK typings
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RESULT_SCHEMA },
      },
      system: [
        { type: 'text', text: `${STYLE}\n\nFACTS\n${FACTS}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: stepBlock },
      ],
      messages: [
        ...history,
        {
          role: 'user',
          content: `The customer typed: """${body.userText}"""\nClassify it against the current step and respond with the JSON object.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return json({ intent: 'handoff', value: null, reply: 'I cannot help with that here. A person from AssetMX can follow up by email.' });
    }

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    let parsed: { intent: string; value: string | null; reply: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ intent: 'unclear', value: null, reply: '' });
    }

    return json({
      intent: parsed.intent,
      value: parsed.value ?? null,
      reply: parsed.reply ?? '',
      usage: response.usage,
      model: response.model,
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'AI service busy' }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'AI service misconfigured' }, 500);
    if (error instanceof Anthropic.APIError) {
      console.error('Claude API error', error.status, error.message);
      return json({ error: 'AI service error' }, 502);
    }
    console.error('Chat AI error', error);
    return json({ error: 'Chat failed' }, 500);
  }
});
