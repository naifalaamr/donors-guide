import VOCAB from './vocab.json';

export const TYPES = [
  ['waqf', 'وقف', '--t-waqf'],
  ['found', 'مؤسسة مانحة', '--t-found'],
  ['gov', 'جهة حكومية', '--t-gov'],
  ['csr', 'مسؤولية اجتماعية لشركة', '--t-csr'],
  ['fund', 'صندوق أو برنامج مانح', '--t-fund'],
  ['other', 'أخرى', '--t-other'],
] as const;
export const TYPE: Record<string, { label: string; color: string }> = Object.fromEntries(
  TYPES.map((t) => [t[0], { label: t[1], color: t[2] }]),
);
export const ACCESS = [
  ['open', 'مفتوحة للتقديم'],
  ['invite', 'بالدعوة'],
  ['mixed', 'مفتوحة وبالدعوة'],
  ['unknown', 'غير معلن'],
] as const;
export const ACC: Record<string, string> = Object.fromEntries(ACCESS);
// Controlled vocab is shared with scripts/check-data.mjs.
export const GTYPES = VOCAB.grantTypes;
export const REGIONS = VOCAB.regions;
export const AXES = [
  ['identity', 'التعريف', 'اسم الجهة، تاريخ التأسيس، الشكل القانوني، المقر، النطاق الجغرافي، الرسالة.'],
  ['orientation', 'توجه المنح', 'الغاية من المنح، المجالات والقضايا والفئات والمناطق المستهدفة، التركيز أو التنويع، والمجالات المستبعدة.'],
  ['types', 'أنواع وأساليب المنح', 'مشروعات، تشغيل، بناء قدرات، بحث أو استثمار اجتماعي؟ مفتوحة أم بالدعوة؟ نقدية أم عينية؟ سنوية أم متعددة السنوات؟'],
  ['policies', 'السياسات والشروط', 'من يحق له التقديم؟ الشروط القانونية والجغرافية والمالية، الوثائق المطلوبة، وأسباب الاستبعاد المباشر.'],
  ['criteria', 'معايير الاختيار', 'المواءمة، الحاجة، الأثر، الابتكار، القدرة التنفيذية، الحوكمة، الاستدامة، التكلفة والشراكات.'],
  ['size', 'حجم المنحة', 'الحد الأدنى والأعلى، مدة التمويل، المصروفات المقبولة، الدفعات، والتمويل المقابل.'],
  ['apply', 'التقديم والقرار', 'متى تُفتح المنح؟ مستمر أم بدورات؟ المنصة والمراحل والمواعيد، من يتخذ القرار، ومدة النتيجة.'],
  ['followup', 'المتابعة', 'التقارير والمؤشرات والزيارات، قياس النتائج، وشروط التجديد أو الإيقاف.'],
  ['opportunity', 'فرصة الاستفادة', 'الفرصة الأنسب للجهات الخيرية، مع من تتوافق، وفجوة الجاهزية.'],
] as const;
export const AR = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// LRM after the letter keeps the digits from being pulled into the Arabic run (displays as د47-001).
export const codeOf = (code: number) => 'د\u200E47-' + String(code).padStart(3, '0');
export const codePlain = (code: number) => 'د47-' + String(code).padStart(3, '0');
const fmt = (n: number | null | undefined) => (n == null ? '' : Number(n).toLocaleString('en-US'));
export function grantRange(d: { minGrant: number | null; maxGrant: number | null }) {
  const a = fmt(d.minGrant), b = fmt(d.maxGrant);
  if (a && b) return `${a} – ${b} ر.س`;
  if (b) return `حتى ${b} ر.س`;
  if (a) return `من ${a} ر.س`;
  return 'الحجم غير معلن';
}
// Short labels for the three key facts on a directory card (the full text stays on the donor page).
export function cycleShort(c: string) {
  return ({ 'بدورات معلنة': 'دورات معلنة', 'مستمر طوال العام': 'طوال العام', 'غير معلن': 'غير معلنة' } as Record<string, string>)[c] ?? c ?? '—';
}
export function reachShort(d: { regions: string[]; scope: string }) {
  const r = d.regions, all = r.includes('جميع المناطق'), out = r.includes('خارج المملكة');
  if (all && out) return 'المملكة وخارجها';
  if (all) return 'كل المناطق';
  if (r.length === 1) return r[0];
  if (r.length > 1) return `${r[0]} +${r.length - 1}`;
  return d.scope || '—';
}
const parts = (n: number): [string, string] => {
  if (n >= 1e6) return [String(+(n / 1e6).toFixed(1)), 'مليون'];
  if (n >= 1e3) { const v = +(n / 1e3).toFixed(1); return [String(v), v >= 3 && v <= 10 ? 'آلاف' : 'ألف']; }
  return [Number(n).toLocaleString('en-US'), ''];
};
const amount = (n: number) => parts(n).join(' ').trim();
export function sizeShort(d: { minGrant: number | null; maxGrant: number | null }) {
  const a = d.minGrant, b = d.maxGrant;
  if (a != null && b != null) {
    const [x] = parts(a), [y, uy] = parts(b);
    // same unit on both ends ("30 – 300 ألف"); 3–10 thousand takes the plural, so compare the scale, not the word
    const scale = (n: number) => (n >= 1e6 ? 2 : n >= 1e3 ? 1 : 0);
    return scale(a) === scale(b) && scale(a) ? `${x} – ${y} ${uy}` : `${amount(a)} – ${amount(b)}`;
  }
  if (b != null) return `حتى ${amount(b)}`;
  if (a != null) return `من ${amount(a)}`;
  return '';
}
const GENERIC = ['وقف', 'أوقاف', 'مؤسسة', 'المؤسسة', 'صندوق', 'برنامج', 'جمعية', 'بنك', 'شركة', 'منصة', 'الخيرية', 'الأهلية', 'الشيخ', 'الأمير', 'الأميرة', 'والدة', 'لوالدة', 'ابن', 'بن', 'صاحب', 'السمو', 'الملكي', 'سمو'];
export function letterOf(name: string) {
  const w = String(name || '').replace(/\(.*?\)/g, ' ').split(/\s+/).filter(Boolean);
  let x = w.find((t) => !GENERIC.includes(t)) || w[0] || '؟';
  x = x.replace(/^(ال|لل)/, '');
  return x.charAt(0) || '؟';
}
export const withBase = (p: string) => (import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + p.replace(/^\//, '')).replace(/\/{2,}/g, '/');
