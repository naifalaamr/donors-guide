// Privacy & quality check for src/data/donors.json. Run: npm run check-data
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(new URL('../src/data/donors.json', import.meta.url), 'utf8'));
const problems = [];
const FORBIDDEN_KEYS = ['student', 'students', 'studentName', 'studentId', 'mobile'];
const PHONE = /(?:\+?966|0)5\d{8}\b|(?:\+?966|0)5\d[\s-]?\d{3}[\s-]?\d{4}/;
const ids = new Set(), codes = new Set(), names = new Map();
const norm = (s) => String(s).normalize('NFKC').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
for (const d of data) {
  const tag = d.id || d.name;
  for (const k of FORBIDDEN_KEYS) if (k in d) problems.push(`${tag}: forbidden key "${k}" (no student/personal data in public data)`);
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string' && PHONE.test(v)) problems.push(`${tag}: looks like a personal mobile number in "${k}"`);
  if (ids.has(d.id)) problems.push(`${tag}: duplicate id`); ids.add(d.id);
  if (codes.has(d.code)) problems.push(`${tag}: duplicate code ${d.code}`); codes.add(d.code);
  if (d.id !== 'd47-' + String(d.code).padStart(3, '0')) problems.push(`${tag}: id should be d47-${String(d.code).padStart(3, '0')}`);
  const n = norm(d.name); if (names.has(n)) problems.push(`${tag}: same name as ${names.get(n)} — possible duplicate entity`); names.set(n, tag);
  const empty = ['orientation', 'types', 'policies', 'criteria', 'size', 'apply', 'followup', 'opportunity', 'summary'].filter((k) => !d[k]);
  if (empty.length) console.warn(`note  ${tag}: empty axes → ${empty.join(', ')}`);
}
if (problems.length) { console.error(problems.map((p) => 'ERROR ' + p).join('\n')); process.exit(1); }
console.log(`OK — ${data.length} cards, no student or personal data found.`);
