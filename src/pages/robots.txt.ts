import type { APIContext } from 'astro';
import { withBase } from '../lib/donors';
// On GitHub Pages under a sub-path crawlers only read the root robots.txt, so this one matters once BASE=/ (own domain).
export function GET({ site }: APIContext) {
  const body = `User-agent: *\nDisallow: ${withBase('logos/')}\n\nSitemap: ${new URL(withBase('sitemap.xml'), site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
