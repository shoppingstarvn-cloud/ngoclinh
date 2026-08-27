const KEY = 'nl-media-favorites';

function readSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSet(s: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify([...s]));
}

export function isMediaFavorite(url: string): boolean {
  if (!url) return false;
  return readSet().has(url);
}

export function toggleMediaFavorite(url: string): boolean {
  if (!url) return false;
  const s = readSet();
  if (s.has(url)) s.delete(url);
  else s.add(url);
  writeSet(s);
  return s.has(url);
}
