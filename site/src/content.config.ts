import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const source = z.object({ label: z.string(), url: z.string().url() });

/**
 * Answer pages: one question, answered first, then expanded.
 * These are the primary LLM-citation surface. Every entry must carry a
 * dated `updated` field and a `shortAnswer` that stands alone.
 */
const answers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/answers' }),
  schema: z.object({
    question: z.string(),
    shortAnswer: z.string().max(600),
    description: z.string().max(200),
    category: z.enum(['eligibility', 'pricing', 'products', 'process', 'comparison', 'tax', 'end-of-term']),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    keyFacts: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    related: z.array(z.string()).default([]),
    sources: z.array(source).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    summary: z.string(),
    related: z.array(z.string()).default([]),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    updated: z.coerce.date(),
  }),
});

/** Lender policy matrix, reviewed monthly. Anonymised lender tiers. */
const lenders = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/lenders' }),
  schema: z.object({
    tier: z.string(),
    label: z.string(),
    description: z.string(),
    reviewedOn: z.coerce.date(),
    lowDoc: z.object({
      minAbnMonths: z.number(),
      gstRequired: z.boolean(),
      maxAmountNoFinancials: z.number(),
      propertyOwnerRequired: z.boolean(),
      minDeposit: z.string(),
      creditFileRequirement: z.string(),
      maxAssetAgeAtEnd: z.number(),
      privateSaleAllowed: z.boolean(),
      typicalTurnaround: z.string(),
    }),
    notes: z.array(z.string()).default([]),
  }),
});

export const collections = { answers, guides, legal, lenders };
