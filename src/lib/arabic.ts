// Arabic search normalisation, used for both the index and the query.
// NFKC (presentation forms from PDFs) → strip tashkeel & tatweel → unify alef/taa marbuta/yaa → Latin digits.
const TASHKEEL = /[ً-ٰٟۖ-ۭ]/g;
export function normalizeAr(input: unknown): string {
  return String(input ?? '')
    .normalize('NFKC')
    .replace(TASHKEEL, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
// Drop the definite article so "الأوقاف" matches "أوقاف".
export function tokens(q: string): string[] {
  return normalizeAr(q).split(' ').filter(Boolean).map((t) => (t.length > 3 ? t.replace(/^(وال|بال|فال|كال|لل|ال)/, '') : t));
}
