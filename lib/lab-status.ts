// Small live fact for the hero chip: containers up, from the same public snapshot /lab reads.
// Fetched on the server (ISR, 2 min), so no browser request and no CSP change. Anything odd or stale returns null and the chip is hidden.
const FEED = "https://raw.githubusercontent.com/Ur-cauz/lab-status-data/main/status.json";
const MAX_AGE_S = 600;

export type LabLive = { up: number; total: number };

export async function getLabLive(): Promise<LabLive | null> {
  try {
    const res = await fetch(FEED, { next: { revalidate: 120 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { schema_version?: unknown; generated_at?: unknown; summary?: { running?: unknown; containers_total?: unknown } };
    const up = d.summary?.running;
    const total = d.summary?.containers_total;
    if (d.schema_version !== 2 || typeof d.generated_at !== "number" || typeof up !== "number" || typeof total !== "number") return null;
    if (!Number.isInteger(up) || !Number.isInteger(total) || total <= 0 || up < 0 || up > total) return null;
    if (Date.now() / 1000 - d.generated_at > MAX_AGE_S) return null;
    return { up, total };
  } catch {
    return null;
  }
}
