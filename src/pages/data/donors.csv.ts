import { getCollection } from 'astro:content';
import { TYPE, ACC, codePlain } from '../../lib/donors';
const COLS: [string, (d: any) => unknown][] = [
  ['رقم البطاقة', (d) => codePlain(d.code)], ['اسم الجهة', (d) => d.name], ['النوع', (d) => TYPE[d.type]?.label],
  ['تاريخ التأسيس', (d) => d.founded], ['الشكل القانوني', (d) => d.legalForm], ['المقر', (d) => d.hq], ['النطاق', (d) => d.scope],
  ['الموقع', (d) => d.website], ['الهاتف', (d) => d.phone], ['البريد', (d) => d.email], ['الرسالة', (d) => d.mission], ['المجالات', (d) => d.fields.join('، ')], ['المناطق', (d) => d.regions.join('، ')],
  ['نوع المنحة', (d) => d.grantTypes.join('، ')], ['طريقة الإتاحة', (d) => ACC[d.access]], ['طبيعة الدعم', (d) => d.supportForm],
  ['مدة الدعم', (d) => d.duration], ['نمط التقديم', (d) => d.cycle], ['منصة التقديم', (d) => d.platform],
  ['الحد الأدنى', (d) => d.minGrant ?? ''], ['الحد الأعلى', (d) => d.maxGrant ?? ''],
  ['توجه المنح', (d) => d.orientation], ['أنواع وأساليب المنح', (d) => d.types], ['السياسات والشروط', (d) => d.policies],
  ['معايير الاختيار', (d) => d.criteria], ['حجم المنحة', (d) => d.size], ['التقديم والقرار', (d) => d.apply],
  ['المتابعة', (d) => d.followup], ['فرصة الاستفادة', (d) => d.opportunity], ['الخلاصة', (d) => d.summary], ['المصادر', (d) => d.sources],
];
const cell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export async function GET() {
  const all = (await getCollection('donors')).sort((a, b) => a.data.code - b.data.code);
  const csv = '﻿' + [COLS.map((c) => c[0]), ...all.map((e) => COLS.map((c) => c[1](e.data)))].map((r) => r.map(cell).join(',')).join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}
