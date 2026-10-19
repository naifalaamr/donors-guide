// Builds src/lib/monogram-glyphs.json: the letter shown on a card that has no logo, as a vector path.
// Run `npm run monograms` after changing the font or the box below; the JSON is committed, so the site build
// itself needs neither the font nor opentype.js.
//
// Why paths and not text: an Arabic letter set as text sits wherever the font's line metrics put it (dots, tails
// and hamzas move it 3–10px off centre in an 80px plate), and letters differ a lot in size (ه vs إ). Each glyph is
// therefore centred on its own ink box and scaled to fit the same box, capped so small letters don't balloon.
// Font: Alexandria Bold (SIL OFL 1.1, via @fontsource/alexandria). A lone letter is its isolated form = the
// glyph the cmap points to (Alexandria has no 'isol' substitutions), so no shaping is needed.
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const FILES = {
  arabic: 'node_modules/@fontsource/alexandria/files/alexandria-arabic-700-normal.woff',
  latin: 'node_modules/@fontsource/alexandria/files/alexandria-latin-700-normal.woff',
};
const VIEW = 80, BOX_W = 46, BOX_H = 42, NOMINAL = 36, CAP = 1.3; // px in an 80×80 viewBox centred on 0,0

const load = (f) => { const b = readFileSync(root + f); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const fonts = { arabic: load(FILES.arabic), latin: load(FILES.latin) };

function glyph(font, ch) {
  const g = font.charToGlyph(ch);
  if (!g || g.index === 0) return null;
  const path = g.getPath(0, 0, 1000);
  const bb = path.getBoundingBox();
  const w = bb.x2 - bb.x1, h = bb.y2 - bb.y1;
  if (!(w > 0 && h > 0)) return null;
  const s = Math.min(BOX_W / w, BOX_H / h, (CAP * NOMINAL) / 1000 * (1000 / font.unitsPerEm));
  const cx = (bb.x1 + bb.x2) / 2, cy = (bb.y1 + bb.y2) / 2;
  const P = (x, y) => `${+((x - cx) * s).toFixed(1)} ${+((y - cy) * s).toFixed(1)}`;
  return path.commands.map((c) =>
    c.type === 'M' ? 'M' + P(c.x, c.y) : c.type === 'L' ? 'L' + P(c.x, c.y)
    : c.type === 'Q' ? 'Q' + P(c.x1, c.y1) + ' ' + P(c.x, c.y)
    : c.type === 'C' ? 'C' + P(c.x1, c.y1) + ' ' + P(c.x2, c.y2) + ' ' + P(c.x, c.y) : 'Z').join('');
}

const chars = [];
for (let c = 0x0621; c <= 0x064A; c++) if (c < 0x063B || c > 0x0640) chars.push(['arabic', String.fromCodePoint(c)]);
for (const r of ['AZ', 'az', '09']) for (let c = r.charCodeAt(0); c <= r.charCodeAt(1); c++) chars.push(['latin', String.fromCharCode(c)]);
const out = { view: VIEW, font: 'Alexandria Bold (OFL)', glyphs: {} };
const missing = [];
for (const [set, ch] of chars) { const d = glyph(fonts[set], ch); if (d) out.glyphs[ch] = d; else missing.push(ch); }
writeFileSync(root + 'src/lib/monogram-glyphs.json', JSON.stringify(out) + '\n');
console.log(`monograms: ${Object.keys(out.glyphs).length} glyphs` + (missing.length ? `; missing ${missing.join(' ')}` : ''));
