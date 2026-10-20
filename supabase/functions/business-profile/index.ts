// Background business check.
//
// Called by the chat as soon as the applicant confirms their ABN, so it runs while
// they answer the next questions; the chat shows the result later for them to
// confirm. Westpac needs "background of business/directors" on every application.
//
// 1. Re-checks the ABN on the register (abn-lookup): only active ABNs are researched,
//    so this can't be used to research arbitrary businesses.
// 2. Returns a cached profile if one is under 30 days old (one search per ABN).
// 3. Claude researches the business with web search (business context only), then a
//    second call turns the findings into a fixed profile. Two calls because web
//    search results carry citations, which can't be combined with structured output.
//
// Model: Claude Opus 5.5 with server-side refusal fallbacks.

import Anthropic from 'npm:@anthropic-ai/sdk@0.124.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'claude-opus-5-5';
const CACHE_DAYS = 30;
const MAX_SEARCHES = 8;
const MAX_FETCHES = 10; // ABN Lookup page + the business's own website pages
const NOT_FOUND_CACHE_DAYS = 1; // a thin result is retried sooner

const str = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const list = { type: 'array', items: { type: 'string' } };

const PROFILE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'matched', 'confidence', 'summary', 'description', 'industry', 'activities', 'servicesProducts',
    'customers', 'serviceArea', 'locations', 'operatingSince', 'history', 'size', 'accreditations',
    'website', 'onlinePresence', 'reviews', 'tradingNames', 'keyPeople', 'lenderNotes',
  ],
  properties: {
    matched: { type: 'boolean', description: 'true only if the sources are clearly about this exact entity (name/ABN/location agree)' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    summary: { type: 'string', description: 'One or two sentences: what the business is and does. Empty string if not matched.' },
    description: { type: 'string', description: 'A detailed plain-English profile (4-8 sentences) a credit assessor could read cold: what it does and for whom, how it operates, where, how long, size, anything distinctive. Only facts from the findings. Empty string if not matched.' },
    industry: str,
    activities: { ...str, description: 'Main line of business in one phrase, e.g. "civil earthmoving and site preparation"' },
    servicesProducts: { ...list, description: 'Specific services or products offered, as the business describes them' },
    customers: { ...str, description: 'Who they sell to: residential, commercial, government, trade, named sectors or notable clients if published' },
    serviceArea: { ...str, description: 'Geographic area served, e.g. "Melbourne metro and regional Victoria"' },
    locations: { ...list, description: 'Addresses or suburbs of premises, depots, branches' },
    operatingSince: { ...str, description: 'Year or date it started trading, if a source states it' },
    history: { ...str, description: 'Founding story, milestones, previous names, acquisitions, as published' },
    size: { ...str, description: 'Staff numbers, fleet or equipment, number of sites, annual jobs, as published' },
    accreditations: { ...list, description: 'Licences, registrations, certifications, industry memberships (e.g. ACL, builder licence, ISO, HIA/MBA)' },
    website: str,
    onlinePresence: { ...list, description: 'URLs of official social or directory profiles (LinkedIn company page, Facebook, Instagram, Google Business)' },
    reviews: { ...str, description: 'Review ratings and counts if published (e.g. "4.8 from 120 Google reviews"), else null' },
    tradingNames: list,
    keyPeople: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['name', 'role'], properties: { name: { type: 'string' }, role: { type: 'string' } } },
      description: 'Owners, directors or managers only as publicly listed in a business role',
    },
    lenderNotes: { ...str, description: 'For the credit assessor only: insolvency or court notices, ATO matters, adverse news, licence issues, inconsistencies between sources, checks that could not be completed. Null if nothing to note.' },
  },
};

const RESEARCH_SYSTEM = `You research Australian businesses for an asset finance application. The applicant has confirmed the business is theirs and will review what you find. A credit assessor at the lender also reads it, so be thorough and specific.

Work in this order:
1. Read the official ABN Lookup page you are given: registered business and trading names, location.
2. Search for the legal name, each trading name and the ABN/ACN to find the business's own website and official profiles.
3. On the business's own website, fetch the pages that describe it: the home page, About / Our story / Who we are, Services or Products, Projects or Case studies, Team or Our people, and Contact or Locations. Use the site's own navigation links to find them. These are the best source of what the business actually does.
4. Check official profiles (LinkedIn company page, Facebook, Google Business) and registers for licences or accreditations relevant to the industry.
5. Search for anything a lender should know: insolvency or administration notices, court or tribunal matters, ATO or regulator action, adverse news, licence suspensions.

Capture: what it does and for whom, specific services or products, industries or customer types served, service area and premises, when it started and its history, size (staff, fleet, equipment, sites), licences and memberships, online presence, published review ratings, and the owners, directors or managers as listed in a business role.

Rules:
- Report only what sources say. Never guess or fill gaps.
- Make sure each source is about this exact entity: names can be shared by unrelated businesses. Use the ABN, state and postcode to tell them apart, and say when you cannot.
- Do not research anyone's private life. People only as named in a business role.
- Finish with a detailed plain-text findings report, citing the URL for each fact.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!apiKey || !supabaseUrl || !serviceKey || !anonKey) return json({ status: 'failed', error: 'Not configured' }, 500);

  let abn = '';
  try {
    abn = String((await req.json())?.abn ?? '').replace(/\D/g, '');
  } catch {
    return json({ status: 'failed', error: 'Invalid JSON' }, 400);
  }
  if (abn.length !== 11) return json({ status: 'failed', error: 'abn (11 digits) is required' }, 400);

  const db = createClient(supabaseUrl, serviceKey);

  // Cached?
  const since = new Date(Date.now() - CACHE_DAYS * 864e5).toISOString();
  const { data: cached } = await db.from('business_profiles').select('*').eq('abn', abn).gte('created_at', since).maybeSingle();
  const fresh = cached && (cached.status === 'done' || (cached.status === 'not_found' && Date.parse(cached.created_at) > Date.now() - NOT_FOUND_CACHE_DAYS * 864e5));
  if (cached && fresh) {
    return json({ status: cached.status, entityName: cached.entity_name, profile: cached.profile, sources: cached.sources, cached: true });
  }

  // Register check: only research active ABNs
  const lookupRes = await fetch(`${supabaseUrl}/functions/v1/abn-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ abn }),
  });
  const reg = await lookupRes.json().catch(() => ({}));
  if (!lookupRes.ok || !reg.found || String(reg.abnStatus).toLowerCase() !== 'active') {
    return json({ status: 'failed', error: 'ABN not active on the register' }, 422);
  }

  const client = new Anthropic({ apiKey });
  const brief =
    `Business to research:\n` +
    `- Legal name: ${reg.entityName}\n` +
    `- ABN: ${abn} (registered ${reg.abnRegisteredDate || 'unknown'}; ${reg.gstRegistered ? 'GST registered' : 'not GST registered'})\n` +
    `- Entity type: ${reg.entityType || 'unknown'}\n` +
    `- Location on the register: ${[reg.state, reg.postcode].filter(Boolean).join(' ') || 'unknown'}\n` +
    (/company/i.test(String(reg.entityType)) ? `- ACN (last 9 digits of the ABN): ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8)}\n` : '') +
    `\nStart by reading the official ABN Lookup page for registered business and trading names: https://abr.business.gov.au/ABN/View?abn=${abn}\n` +
    `Then search the web for the legal name, each trading name, and the ABN/ACN.`;

  try {
    // 1. Research with web search (resume if the server-side tool loop pauses)
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: brief }];
    let research: Anthropic.Beta.BetaMessage | null = null;
    for (let turn = 0; turn < 6; turn++) {
      research = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        // @ts-expect-error fallbacks "default" form is newer than the SDK typings
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: RESEARCH_SYSTEM,
        // @ts-expect-error web_search_20260209 is newer than the SDK typings
        tools: [
          { type: 'web_search_20260209', name: 'web_search', max_uses: MAX_SEARCHES, user_location: { type: 'approximate', country: 'AU' } },
          { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: MAX_FETCHES },
        ],
        messages,
      });
      if (research.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: research.content });
    }
    if (!research || research.stop_reason === 'refusal') throw new Error('research declined');

    const findings = research.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim();

    // Sources: the pages the findings actually cite (search also returns unrelated hits)
    const seen = new Set<string>();
    const sources: { url: string; title: string }[] = [];
    const add = (url?: string, title?: string) => {
      if (url && !seen.has(url)) {
        seen.add(url);
        sources.push({ url, title: title || url });
      }
    };
    for (const block of research.content as unknown as Array<{ type: string; citations?: Array<{ url?: string; title?: string }> }>) {
      if (block.type === 'text') for (const c of block.citations ?? []) add(c.url, c.title);
    }
    // Findings cite URLs in plain text too (the report format asks for them)
    for (const m of findings.matchAll(/https?:\/\/[^\s)\]>"']+/g)) add(m[0].replace(/[.,;]+$/, ''));

    // 2. Structure the findings
    const structured = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      // @ts-expect-error fallbacks "default" form is newer than the SDK typings
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: PROFILE_SCHEMA } },
      system: 'Turn research findings about an Australian business into the profile schema. Use only facts in the findings. Facts from the official ABN Lookup page count as identifying this entity. Set matched to false only if the findings do not identify this exact entity at all.',
      messages: [{ role: 'user', content: `${brief}\n\nFindings:\n${findings || '(no findings)'}` }],
    });
    if (structured.stop_reason === 'refusal') throw new Error('structuring declined');
    const text = structured.content.find((b) => b.type === 'text') as { text: string } | undefined;
    const profile = JSON.parse(text?.text ?? '{}');
    const status = profile.matched ? 'done' : 'not_found';

    await db.from('business_profiles').upsert({
      abn, entity_name: reg.entityName, status, profile, sources: sources.slice(0, 12), model: structured.model, created_at: new Date().toISOString(),
    });
    return json({ status, entityName: reg.entityName, profile, sources: sources.slice(0, 12) });
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error('Claude API error', error.status, error.message);
    else console.error('business-profile error', error);
    await db.from('business_profiles').upsert({ abn, entity_name: reg.entityName, status: 'failed', created_at: new Date().toISOString() });
    return json({ status: 'failed' }, 502);
  }
});
