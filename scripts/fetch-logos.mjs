// Build-time logo pipeline. Run by `npm run build` (prebuild); never fails the build.
//
// Where a card's logo comes from (the first source that yields a usable image wins):
//   1. a file dropped in public/logos/ named after the card id: d47-012.png / .svg / .webp / .jpg
//   2. src/data/logo-overrides.json: { "d47-012": "https://…/logo.png" } forces a URL,
//      { "d47-012": false } keeps the letter tile (e.g. when discovery picked the wrong image),
//      { "d47-012": { "plate": "dark" } } keeps the found logo but forces its plate (light | dark | mid),
//      { "d47-012": { "src": "https://…/logo.png", "plate": "light" } } does both
//   3. the card's own "logo" field in donors.json (a URL, or a file name in public/logos/)
//   4. discovery from the card's website, built on metascraper (github.com/microlinkhq/metascraper, MIT):
//      structured logo (og:logo, schema.org) → the site's header <img> logo → apple-touch-icon / largest favicon
//      (metascraper-logo-favicon, which falls back to Google's favicon service). Set LOGO_DISCOVER=0 to skip.
//
// Every image is fetched once at build time (directly, then through images.weserv.nl — an open-source image
// proxy, github.com/weserv/images — for hosts that refuse datacentre IPs or hotlinking), trimmed, measured and
// stored as public/logos/auto/<id>.webp, so pages never hotlink a donor's server.
//
// Sizing follows the Logo Soup approach (sanity-labs/react-logo-soup, MIT): width = base · ratio^k, so wide
// and square logos read at the same visual weight, with a mild density correction.
//
// Plate (the logo's background tile): every visible pixel votes for the plate it stays legible on
// (contrast ≥ 2.5:1, a little under WCAG 1.4.11's 3:1 so anti-aliased edges don't skew the vote):
// white, the ink plate (#1B2550) or a mid slate (#6B748A, ≥4.5:1 against both white and black).
// So a white wordmark with a coloured emblem no longer disappears on white.
//
// Output: src/data/logo-meta.json, read by src/components/Tile.astro and the review page src/pages/logos.astro.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const donorsFile = process.env.DONORS_FILE || join(root, 'src/data/donors.json');
const logosDir = join(root, 'public/logos');
const outDir = join(logosDir, 'auto');
const metaFile = join(root, 'src/data/logo-meta.json');
const overridesFile = join(root, 'src/data/logo-overrides.json');
const DISCOVER = process.env.LOGO_DISCOVER !== '0';
const TIMEOUT = 12000, CONCURRENCY = 8, OUT_H = 160, PER_CARD_MS = 75000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const IMG_EXT = /\.(svg|png|webp|jpe?g|gif|avif)$/i;

// ---------- colour helpers ----------
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const PLATES = { light: [0xff, 0xff, 0xff], dark: [0x1b, 0x25, 0x50], mid: [0x6b, 0x74, 0x8a] };
const PLATE_L = Object.fromEntries(Object.entries(PLATES).map(([k, [r, g, b]]) => [k, lum(r, g, b)]));
const LEGIBLE = 2.5, VISIBLE = 1.75;

// Decide the plate from raw RGBA pixels. Logos are drawn for a white page, so white is the default: coloured,
// gold and two-tone logos stay on white even when parts of them are soft (a dark plate would swallow their dark
// text). A logo moves to a darker plate only when it is mostly white or near-white and would vanish on white:
// under 25% of it legible on white (contrast >= 2.5) and under 60% even visible there (contrast >= 1.75).
// Only logos with real transparency can change plate: an opaque logo carries its own background.
// `transparentSource` must be measured on the image BEFORE trimming: a tight logo has few transparent pixels
// left once its margins are cut. Exceptions go in src/data/logo-overrides.json ({"plate": "dark"}).
export function choosePlate(data, N, transparentSource) {
  let transp = 0, wsum = 0, ink = 0, seen = 0;
  const ok = { light: 0, dark: 0, mid: 0 };
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    if (a < 128) { transp++; continue; }
    const w = a / 255, l = lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    wsum += w;
    if (l < 0.85) ink++;
    if (contrast(l, PLATE_L.light) >= VISIBLE) seen += w;
    for (const p in ok) if (contrast(l, PLATE_L[p]) >= LEGIBLE) ok[p] += w;
  }
  const share = Object.fromEntries(Object.entries(ok).map(([p, v]) => [p, wsum ? v / wsum : 1]));
  const hasAlpha = transparentSource ?? transp / N > 0.05;
  const onWhite = wsum ? seen / wsum : 1;
  let plate = 'light';
  if (hasAlpha && share.light < 0.25 && onWhite < 0.6) plate = share.dark >= share.mid - 0.05 ? 'dark' : 'mid';
  return { plate, hasAlpha, visible: N - transp, ink, share, onWhite };
}

// ---------- fetching ----------
async function get(url, { html = false } = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: {
      'user-agent': UA, 'accept-language': 'ar,en;q=0.8',
      accept: html ? 'text/html,application/xhtml+xml,*/*;q=0.5' : 'image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.5',
    } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return html ? { text: await r.text(), url: r.url || url } : Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}
const viaProxy = (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=png&w=1600&h=1600&fit=inside&we`;

async function loadImage(c) {
  if (c.kind === 'file') return { buf: readFileSync(join(logosDir, c.ref)), via: 'file' };
  try { return { buf: await get(c.ref), via: 'direct' }; }
  catch (e) {
    try { return { buf: await get(viaProxy(c.ref)), via: 'proxy' }; }
    catch { throw e; }
  }
}

// ---------- discovery (metascraper) ----------
let scrapers;
async function getScrapers() {
  if (scrapers !== undefined) return scrapers;
  try {
    const [{ default: metascraper }, { default: logoRules }, { default: faviconRules }, cheerio] = await Promise.all([
      import('metascraper'), import('metascraper-logo'), import('metascraper-logo-favicon'), import('cheerio'),
    ]);
    const gotOpts = { timeout: { request: 8000 }, headers: { 'user-agent': UA } };
    scrapers = { structured: metascraper([logoRules()]), favicon: metascraper([faviconRules({ gotOpts })]), cheerio };
  } catch (e) {
    console.warn('logos: metascraper not available — discovery skipped (' + e.message + ')');
    scrapers = null;
  }
  return scrapers;
}

// The site's own header logo: most donor sites here are WordPress or Drupal themes.
const HEADER_SELECTORS = [
  'img.custom-logo', 'header img[src*="logo" i]', '.navbar-brand img', '.site-logo img', '.logo img',
  '[class*="logo" i] img', '[id*="logo" i] img', 'img[class*="logo" i]', 'img[id*="logo" i]',
  'img[src*="logo" i]', 'img[alt*="logo" i]', 'img[alt*="شعار"]',
];

export async function candidatesFromHtml(html, url) {
  const s = await getScrapers();
  const out = [];
  const push = (u) => {
    if (!u || /^data:/i.test(u)) return;
    try { const abs = new URL(u.trim(), url).href; if (!out.includes(abs)) out.push(abs); } catch {}
  };
  if (!s) return out;
  try { push((await s.structured({ url, html })).logo); } catch {}
  const $ = s.cheerio.load(html);
  for (const sel of HEADER_SELECTORS) {
    const el = $(sel).first();
    if (el.length) push(el.attr('src') || el.attr('data-src') || el.attr('data-lazy-src') || (el.attr('srcset') || '').split(/[\s,]+/)[0]);
    if (out.length >= 4) break;
  }
  try { push((await s.favicon({ url, html })).logo); } catch {}
  return out;
}

async function discover(website) {
  const url = /^https?:\/\//i.test(website) ? website : 'https://' + website;
  try {
    const page = await get(url, { html: true });
    return await candidatesFromHtml(page.text, page.url);
  } catch {
    // homepage unreachable from here: Google's favicon service is the last resort (tiny icons are rejected below)
    return [`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`];
  }
}

// ---------- processing ----------
async function processImage(sharp, buf, id, kind, forcePlate) {
  let img = sharp(buf, { density: 300, animated: false }).ensureAlpha();
  const meta0 = await img.metadata();
  if (!meta0.width || !meta0.height) throw new Error('not an image');
  if (Math.max(meta0.width, meta0.height) > 2000) img = img.resize({ width: 2000, height: 2000, fit: 'inside' });
  const base = await img.png().toBuffer();
  // does the source itself have a transparent background? (measured before trimming, see choosePlate)
  const { data: d0, info: i0 } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
  let t0 = 0; for (let i = 3; i < d0.length; i += 4) if (d0[i] < 128) t0++;
  const transparentSource = t0 / (i0.width * i0.height) > 0.02;
  // trim: transparent edges first, then a solid (white) frame if the file has one
  const trimmed = await sharp(base).trim({ threshold: 10 }).png().toBuffer().catch(() => base);
  const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const auto = choosePlate(data, N, transparentSource);
  const { visible, ink, share } = auto;
  const plate = PLATES[forcePlate] ? forcePlate : auto.plate;
  // quality gate — stricter for images found by discovery, which nobody has looked at yet
  const minSide = kind === 'site' ? 48 : 16;
  if (Math.max(W, H) < minSide) throw new Error(`too small (${W}×${H})`);
  if (visible / N < 0.02) throw new Error('blank image');
  if (kind === 'site' && (W / H > 8 || W / H < 0.2)) throw new Error('not logo-shaped');
  const density = (plate === 'light' ? ink : visible) / N;
  const out = `${id}.webp`;
  await sharp(trimmed).resize({ height: OUT_H, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(outDir, out));
  return {
    file: 'auto/' + out, ratio: +(W / H).toFixed(3), density: +density.toFixed(3),
    plate, dark: plate === 'dark', legible: +share[plate].toFixed(2),
  };
}

function candidatesFor(d, dropped, overrides) {
  const c = [];
  if (dropped[d.id]) c.push({ kind: 'file', ref: dropped[d.id] });
  const ov = overrides[d.id];
  if (ov === false) return c;
  const ovSrc = typeof ov === 'string' ? ov : ov && typeof ov === 'object' ? ov.src : null;
  if (ovSrc) c.push({ kind: 'override', ref: ovSrc });
  if (d.logo) {
    if (/^https?:/i.test(d.logo)) c.push({ kind: 'data', ref: d.logo });
    else c.push({ kind: 'file', ref: d.logo.replace(/^.*\//, '') });
  }
  if (DISCOVER && d.website) c.push({ kind: 'site', ref: d.website });
  return c;
}

async function main() {
  let sharp;
  try { sharp = (await import('sharp')).default; } catch {
    console.warn('logos: sharp not available — skipping (remote logos stay as they are)');
    if (!existsSync(metaFile)) writeFileSync(metaFile, '{}\n');
    return;
  }
  const readJSON = (f, dflt) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return dflt; } };
  const donors = readJSON(donorsFile, []);
  const overrides = readJSON(overridesFile, {});
  const dropped = Object.fromEntries((existsSync(logosDir) ? readdirSync(logosDir) : [])
    .filter((f) => IMG_EXT.test(f) && /^d47-\d{3}\./.test(f)).map((f) => [f.replace(IMG_EXT, ''), f]));

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const meta = {}; const failed = []; const counts = {};
  const queue = donors.filter((d) => candidatesFor(d, dropped, overrides).length);
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let d; (d = queue.shift()); ) {
      const errs = []; const deadline = Date.now() + PER_CARD_MS;
      for (const c of candidatesFor(d, dropped, overrides)) {
        if (Date.now() > deadline) { errs.push('time budget used up'); break; }
        const tries = c.kind === 'site' ? (await discover(c.ref)).map((u) => ({ kind: 'site', ref: u })) : [c];
        for (const t of tries) {
          if (Date.now() > deadline) break;
          try {
            const { buf, via } = await loadImage(t);
            const forcePlate = overrides[d.id] && typeof overrides[d.id] === 'object' ? overrides[d.id].plate : undefined;
            meta[d.id] = { ...(await processImage(sharp, buf, d.id, t.kind, forcePlate)), source: t.kind, via, src: t.kind === 'file' ? 'logos/' + t.ref : t.ref };
            break;
          } catch (e) { errs.push(`${t.kind}: ${e.name === 'AbortError' ? 'timeout' : e.message}`); }
        }
        if (meta[d.id]) break;
      }
      if (meta[d.id]) counts[meta[d.id].source] = (counts[meta[d.id].source] || 0) + 1;
      else failed.push(`${d.id} (${errs.slice(-2).join('; ') || 'no candidate'})`);
    }
  }));
  writeFileSync(metaFile, JSON.stringify(Object.fromEntries(Object.entries(meta).sort()), null, 1) + '\n');
  const plates = Object.values(meta).reduce((a, m) => ((a[m.plate] = (a[m.plate] || 0) + 1), a), {});
  console.log(`logos: ${Object.keys(meta).length}/${donors.length} cards have a stored logo ` +
    `(sources ${JSON.stringify(counts)}, plates ${JSON.stringify(plates)})` +
    (failed.length ? `\nlogos: no usable logo for ${failed.length}: ${failed.join(', ')}` : ''));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((e) => { console.warn('logos: skipped after an unexpected error — ' + e.message); });
}
