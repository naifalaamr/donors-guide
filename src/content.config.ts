import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const TYPE = z.enum(['waqf', 'found', 'gov', 'csr', 'fund', 'other']);
const ACCESS = z.enum(['open', 'invite', 'mixed', 'unknown']);
const text = z.string().nullish().transform((v) => v ?? '');
const list = z.array(z.string()).nullish().transform((v) => v ?? []);
const money = z.number().nonnegative().nullish().transform((v) => v ?? null);

// One study card = 9 axes + summary. Student names are NOT part of the public schema.
const donors = defineCollection({
  loader: file('src/data/donors.json'),
  schema: z
    .object({
      id: z.string().optional(),
      code: z.number().int().positive(),
      name: z.string().min(2),
      type: TYPE,
      logo: z.string().nullish().transform((v) => v ?? null),
      founded: text, legalForm: text, hq: text, scope: text, website: text, mission: text,
      // official public channels only (unified number, grants email) — never staff mobiles
      phone: text, email: text,
      fields: list, regions: list, grantTypes: list,
      access: ACCESS.catch('unknown'),
      supportForm: text, duration: text, cycle: text, platform: text,
      minGrant: money, maxGrant: money,
      orientation: text, types: text, policies: text, criteria: text, size: text,
      apply: text, followup: text, opportunity: text, summary: text, sources: text,
    })
    .strict(), // unknown keys (e.g. "student") fail the build on purpose
});

export const collections = { donors };
