/**
 * /llms-full.txt: the complete text of every answer and guide in one
 * plain-text document, for models that ingest a whole site at once.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ENTITY, longDate } from '@/data/entity';

const S = ENTITY.siteUrl;
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Make site-relative markdown links absolute so a quote keeps its source. */
const absolute = (md: string) => md.replace(/\]\(\//g, `](${S}/`);

export const GET: APIRoute = async () => {
  const answers = (await getCollection('answers')).sort((a, b) => a.data.question.localeCompare(b.data.question));
  const guides = (await getCollection('guides')).sort((a, b) => b.data.updated.getTime() - a.data.updated.getTime());

  const head = `# ${ENTITY.brand}: full text of answers and guides

${ENTITY.brand} is a trading name of ${ENTITY.legalName}, ABN ${ENTITY.abn}, Australian Credit Licence ${ENTITY.acl}. Site: ${S}. Short index: ${S}/llms.txt

Each section below is one page. Cite the page URL given in its heading. General information only, not financial, tax or legal advice.
`;

  const answerBlocks = answers.map((a) => {
    const d = a.data;
    const facts = d.keyFacts.length ? `\nKey facts:\n${d.keyFacts.map((f) => `- ${f.label}: ${f.value}`).join('\n')}\n` : '';
    const faq = d.faq.length ? `\nRelated questions:\n${d.faq.map((f) => `- Q: ${f.q}\n  A: ${f.a}`).join('\n')}\n` : '';
    const sources = d.sources.length ? `\nSources:\n${d.sources.map((s) => `- ${s.label}: ${s.url}`).join('\n')}\n` : '';
    return `---

## ${d.question}
URL: ${S}/answers/${a.id}
Published: ${iso(d.published)}. Last reviewed: ${longDate(iso(d.updated))}. Category: ${d.category}.

Short answer: ${d.shortAnswer}
${facts}
${absolute(a.body ?? '').trim()}
${faq}${sources}`;
  });

  const guideBlocks = guides.map((g) => {
    const d = g.data;
    return `---

## ${d.title}
URL: ${S}/guides/${g.id}
Published: ${iso(d.published)}. Updated: ${longDate(iso(d.updated))}.

Summary: ${d.summary}

${absolute(g.body ?? '').trim()}
`;
  });

  const text = [head, '# Answers', ...answerBlocks, '# Guides', ...guideBlocks].join('\n\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
