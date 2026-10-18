import { getCollection } from 'astro:content';
// Public dataset (no student data — the schema forbids extra keys).
export async function GET() {
  const all = (await getCollection('donors')).sort((a, b) => a.data.code - b.data.code).map((e) => ({ ...e.data, id: e.id }));
  return new Response(JSON.stringify({ donors: all }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
