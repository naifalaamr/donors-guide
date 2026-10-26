import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { withBase } from '../lib/donors';
// Public pages for search engines. /logos/ (review page) and 404 are left out on purpose.
export async function GET({ site }: APIContext) {
  const donors = (await getCollection('donors')).sort((a, b) => a.data.code - b.data.code);
  const paths = ['', 'compare/', 'submit/', 'about/', ...donors.map((d) => `donors/${d.id}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(withBase(p), site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
