// The letter tile for a card without a logo, as a centred vector glyph (see scripts/build-monograms.mjs).
import data from './monogram-glyphs.json';
const G = (data as { glyphs: Record<string, string> }).glyphs;
// Alef forms share one shape family; fall back to the bare letter when a variant is missing.
const FALLBACK: Record<string, string> = { 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي' };
export const MONO_VIEW = '-40 -40 80 80';
export function monogram(ch: string): string | null {
  return G[ch] ?? G[FALLBACK[ch] ?? ''] ?? null;
}
