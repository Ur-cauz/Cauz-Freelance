// Fixed-window-ish sliding log per key, held in module memory.
// Best effort only: on Vercel each warm instance has its own Map and cold
// starts reset it. It stops casual floods, not a distributed attacker
// (Turnstile covers that when enabled).

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const MAX_KEYS = 5000;

const hits = new Map<string, number[]>();

export function rateLimit(key: string, now = Date.now()): { ok: boolean; retryAfterS: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_HITS) {
    hits.set(key, recent);
    return { ok: false, retryAfterS: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }

  recent.push(now);
  hits.delete(key); // re-insert so Map order tracks recency
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) hits.delete(oldest);
  }
  return { ok: true, retryAfterS: 0 };
}
