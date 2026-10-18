import { getCollection } from 'astro:content';
import { normalizeAr } from '../../lib/arabic';
import { TYPE, ACC } from '../../lib/donors';
// Normalised full text of every card (all 9 axes + summary), for the directory search box.
export async function GET() {
  const out: Record<string, string> = {};
  for (const e of await getCollection('donors')) {
    const d = e.data;
    const raw = [d.name, TYPE[d.type]?.label, ACC[d.access], ...d.fields, ...d.regions, ...d.grantTypes,
      d.founded, d.legalForm, d.hq, d.scope, d.mission, d.supportForm, d.duration, d.cycle, d.platform,
      d.orientation, d.types, d.policies, d.criteria, d.size, d.apply, d.followup, d.opportunity, d.summary].join(' ');
    out[e.id] = normalizeAr(raw); // queries are matched as substrings, so "اوقاف" also finds "الاوقاف"
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
