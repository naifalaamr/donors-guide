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
export const GTYPES = ['المشروعات', 'التشغيل', 'بناء القدرات', 'البحث', 'الاستثمار الاجتماعي', 'المنح العينية', 'الأوقاف والأصول'];
export const REGIONS = ['الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الشرقية', 'القصيم', 'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف', 'خارج المملكة'];
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
const GENERIC = ['وقف', 'أوقاف', 'مؤسسة', 'المؤسسة', 'صندوق', 'برنامج', 'جمعية', 'بنك', 'شركة', 'منصة', 'الخيرية', 'الأهلية', 'الشيخ', 'الأمير', 'الأميرة', 'والدة', 'لوالدة', 'ابن', 'بن', 'صاحب', 'السمو', 'الملكي', 'سمو'];
export function letterOf(name: string) {
  const w = String(name || '').replace(/\(.*?\)/g, ' ').split(/\s+/).filter(Boolean);
  let x = w.find((t) => !GENERIC.includes(t)) || w[0] || '؟';
  x = x.replace(/^(ال|لل)/, '');
  return x.charAt(0) || '؟';
}
export const withBase = (p: string) => (import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + p.replace(/^\//, '')).replace(/\/{2,}/g, '/');
