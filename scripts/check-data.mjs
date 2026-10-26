// Privacy & quality check for src/data/donors.json. Run: npm run check-data
// Errors fail the build; warnings and unavailable facts are printed as a one-line count.
// `npm run report` (--report) lists every warning and which facts each card lacks.
// Student reports are the only source: a fact they don't give stays empty (unavailable), not a to-do.
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const data = read('../src/data/donors.json');
const V = read('../src/lib/vocab.json');
const REPORT = process.argv.includes('--report');
const problems = [], warnings = [], gaps = new Map();

const FORBIDDEN_KEYS = ['student', 'students', 'studentName', 'studentId', 'mobile'];
const PHONE = /(?:\+?966|0)5\d{8}\b|(?:\+?966|0)5\d[\s-]?\d{3}[\s-]?\d{4}/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const FREE_MAIL = /@(gmail|hotmail|outlook|yahoo|icloud|live)\./i;
const TYPES = ['waqf', 'found', 'gov', 'csr', 'fund', 'other'];
const ACCESS = ['open', 'invite', 'mixed', 'unknown'];
const AXES = ['orientation', 'types', 'policies', 'criteria', 'size', 'apply', 'followup', 'opportunity', 'summary'];
const UNKNOWN = /غير (مذكور|محدد|معلن|منشور|ثابت)|لم يحدد/;
// name prefix → types it is expected to have (a hint, not a rule)
const NAME_TYPE = [[/^(وقف|أوقاف)\s/, ['waqf']], [/^(بنك|شركة)\s/, ['csr', 'gov']], [/^صندوق\s/, ['fund', 'gov']]];
// facts a card can carry when its report gives them; label → test that returns true when present
const KEY_FACTS = [
  ['الموقع', (d) => d.website], ['البريد', (d) => d.email], ['الهاتف', (d) => d.phone],
  ['حجم المنحة (رقم)', (d) => d.minGrant != null || d.maxGrant != null],
  ['المنطقة', (d) => d.regions?.length], ['تاريخ التأسيس', (d) => d.founded && !UNKNOWN.test(d.founded)],
  ['طبيعة الدعم', (d) => d.supportForm && d.supportForm !== 'غير معلن'],
  ['مدة الدعم', (d) => d.duration && d.duration !== 'غير معلن'],
];

const ids = new Set(), codes = new Set(), names = new Map();
const norm = (s) => String(s).normalize('NFKC').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
const offList = (list, allowed) => (list || []).filter((v) => !allowed.includes(v));
for (const d of data) {
  const tag = d.id || d.name;
  const err = (m) => problems.push(`${tag}: ${m}`), warn = (m) => warnings.push(`${tag}: ${m}`);

  // privacy
  for (const k of FORBIDDEN_KEYS) if (k in d) err(`forbidden key "${k}" (no student/personal data in public data)`);
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string' && PHONE.test(v)) err(`looks like a personal mobile number in "${k}"`);

  // identity
  if (ids.has(d.id)) err('duplicate id'); ids.add(d.id);
  if (codes.has(d.code)) err(`duplicate code ${d.code}`); codes.add(d.code);
  if (d.id !== 'd47-' + String(d.code).padStart(3, '0')) err(`id should be d47-${String(d.code).padStart(3, '0')}`);
  const n = norm(d.name); if (names.has(n)) err(`same name as ${names.get(n)} — possible duplicate entity`); names.set(n, tag);

  // controlled vocab
  if (!TYPES.includes(d.type)) err(`unknown type "${d.type}"`);
  if (!ACCESS.includes(d.access)) err(`unknown access "${d.access}" (the site would silently show it as unknown)`);
  for (const v of offList(d.regions, [...V.regions, V.allRegions])) err(`region "${v}" is not in src/lib/vocab.json`);
  for (const v of offList(d.grantTypes, V.grantTypes)) err(`grant type "${v}" is not in src/lib/vocab.json`);
  for (const v of offList(d.fields, V.fields)) err(`field "${v}" is not in src/lib/vocab.json`);
  for (const k of ['supportForm', 'duration', 'cycle']) if (d[k] && !V[k].includes(d[k])) warn(`${k} "${d[k]}" is not one of the usual values`);
  for (const [re, types] of NAME_TYPE) if (re.test(d.name) && !types.includes(d.type)) warn(`name suggests type ${types.join('/')}, but type is ${d.type}`);

  // formats
  if (d.website) { try { if (!/^https?:$/.test(new URL(d.website).protocol)) throw 0; } catch { err(`website is not a valid http(s) URL: ${d.website}`); } }
  if (d.email && !EMAIL.test(d.email)) err(`email looks malformed: ${d.email}`);
  if (d.email && FREE_MAIL.test(d.email)) warn(`email is on a free mail service (${d.email}): check it is the official address`);
  if (d.minGrant != null && d.maxGrant != null && d.minGrant > d.maxGrant) err(`minGrant ${d.minGrant} is above maxGrant ${d.maxGrant}`);

  // completeness
  const empty = AXES.filter((k) => !d[k]);
  if (empty.length) warn(`empty axes → ${empty.join(', ')}`);
  const missing = KEY_FACTS.filter(([, has]) => !has(d)).map(([label]) => label);
  if (missing.length) gaps.set(tag, missing);
}

if (REPORT) {
  if (warnings.length) console.log(`\nتنبيهات (${warnings.length}):\n` + warnings.map((w) => '  ' + w).join('\n'));
  console.log(`\nغير متوفر في التقارير، حسب المعلومة (من ${data.length} بطاقة):`);
  for (const [label] of KEY_FACTS) {
    const c = [...gaps.values()].filter((m) => m.includes(label)).length;
    console.log(`  ${label.padEnd(18)} ${String(c).padStart(3)}  ${'█'.repeat(Math.round((c / data.length) * 30))}`);
  }
  console.log(`\nغير متوفر في التقارير، حسب البطاقة (${gaps.size} بطاقة):`);
  for (const [tag, m] of gaps) console.log(`  ${tag}  ${m.join('، ')}`);
  console.log('');
}
if (problems.length) { console.error(problems.map((p) => 'ERROR ' + p).join('\n')); process.exit(1); }
console.log(`OK — ${data.length} cards, no student or personal data found. ${gaps.size} lack some facts their reports don't give, ${warnings.length} warnings` +
  (REPORT ? '.' : ' (npm run report for details).'));
