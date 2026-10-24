import "server-only";

// Small in-memory sliding-window limiter. Per server instance only (on serverless hosts each
// instance has its own memory), so it slows down scripted abuse but is not a hard guarantee.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return true;
}
