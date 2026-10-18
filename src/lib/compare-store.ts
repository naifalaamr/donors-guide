// Up to 4 entities selected for comparison; kept per viewer in localStorage (convenience only).
const KEY = 'dg_cmp';
export const MAX_CMP = 4;
export function readCmp(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX_CMP) : []; } catch { return []; }
}
export function writeCmp(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_CMP))); } catch {}
  window.dispatchEvent(new CustomEvent('dg:cmp'));
}
export function toggleCmp(id: string): boolean {
  const ids = readCmp();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else { if (ids.length >= MAX_CMP) return false; ids.push(id); }
  writeCmp(ids);
  return true;
}
export function onCmpChange(fn: () => void) {
  window.addEventListener('dg:cmp', fn);
  window.addEventListener('storage', (e) => { if (e.key === KEY) fn(); });
}
