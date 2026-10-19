// Build-time logo pipeline. Run by `npm run build` (prebuild); never fails the build.
// For every card with a logo (remote URL or a file in public/logos/):
//   1. fetch it once and store a local copy (no hotlinking at view time),
//   2. trim the padding baked into the file,
//   3. measure aspect ratio, ink density and colour,
//   4. write public/logos/auto/<id>.webp + src/data/logo-meta.json.
// Sizing follows the Logo Soup approach (sanity-labs/react-logo-soup, MIT):
// width = base · ratio^k, so wide and square logos read at the same visual weight,
// with a mild density correction (dense marks shrink a little, thin ones grow).
// Light logos on a transparent background get a dark plate so they stay visible.
// Cards whose logo can't be fetched keep the remote URL (old behaviour) or the letter tile.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const donorsFile = process.env.DONORS_FILE || join(root, 'src/data/donors.json');
const outDir = join(root, 'public/logos/auto');
const metaFile = join(root, 'src/data/logo-meta.json');
const TIMEOUT = 15000, CONCURRENCY = 6, OUT_H = 160;

let sharp;
try { sharp = (await import('sharp')).default; } catch {
  console.warn('logos: sharp not available — skipping (remote logos stay as they are)');
  if (!existsSync(metaFile)) writeFileSync(metaFile, '{}\n');
  process.exit(0);
}

const donors = JSON.parse(readFileSync(donorsFile, 'utf8')).filter((d) => d.logo);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

async function load(logo) {
  if (!/^https?:/i.test(logo)) return readFileSync(join(root, 'public/logos', logo.replace(/^.*\//, '')));
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(logo, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (donors-guide logo fetch)', accept: 'image/*,*/*;q=0.5' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const L_WHITE = 1, L_PLATE = lum(0x1b, 0x25, 0x50); // ink #1B2550

async function process1(d) {
  const buf = await load(d.logo);
  // rasterise (SVG at high density), flatten frames, keep alpha
  let img = sharp(buf, { density: 300, animated: false }).ensureAlpha();
  const meta0 = await img.metadata();
  if (!meta0.width || !meta0.height) throw new Error('not an image');
  if (Math.max(meta0.width, meta0.height) > 2000) img = img.resize({ width: 2000, height: 2000, fit: 'inside' });
  const base = await img.png().toBuffer();
  // trim: transparent edges first, then a solid (white) frame if the file has one
  let trimmed = await sharp(base).trim({ threshold: 10 }).png().toBuffer().catch(() => base);
  const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  let ink = 0, transp = 0, sr = 0, sg = 0, sb = 0, sl = 0, light = 0;
  for (let i = 0; i < N; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    if (a < 128) { transp++; continue; }
    const l = lum(r, g, b);
    if (l > 0.85) light++;
    // "ink" = visible pixels that aren't near-white background
    if (l < 0.85) { ink++; sr += r; sg += g; sb += b; sl += l; }
  }
  const hasAlpha = transp / N > 0.05;
  const visible = N - transp;
  // light-on-transparent logo: most visible pixels are near-white or low-contrast against white
  const meanInkL = ink ? sl / ink : 1;
  const lightShare = visible ? light / visible : 0;
  let dark = false;
  if (hasAlpha) {
    if (lightShare > 0.6) dark = true;                                   // white logo
    else if (ink && contrast(meanInkL, L_WHITE) < 3 && contrast(meanInkL, L_PLATE) > contrast(meanInkL, L_WHITE)) dark = true; // pale gold/grey: under WCAG 1.4.11 3:1 on white
  }
  const density = visible ? (dark ? visible : ink) / N : 1;               // 0..1 share of the box that carries ink
  const out = `${d.id}.webp`;
  await sharp(trimmed).resize({ height: OUT_H, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(outDir, out));
  return { file: 'auto/' + out, ratio: +(W / H).toFixed(3), density: +density.toFixed(3), dark };
}

const meta = {}; const failed = [];
const queue = [...donors];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let d; (d = queue.shift()); ) {
    try { meta[d.id] = await process1(d); }
    catch (e) { failed.push(`${d.id} (${e.name === 'AbortError' ? 'timeout' : e.message})`); }
  }
}));
writeFileSync(metaFile, JSON.stringify(Object.fromEntries(Object.entries(meta).sort()), null, 1) + '\n');
console.log(`logos: ${Object.keys(meta).length}/${donors.length} stored locally` + (failed.length ? `; kept remote: ${failed.join(', ')}` : ''));
