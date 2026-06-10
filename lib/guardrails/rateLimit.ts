// A simple in-memory rate limiter: each visitor (by IP) gets N debates per hour.
// Toggle with ENABLE_RATE_LIMIT=false in .env.local.
//
// Honest caveat: "in-memory" means the counts live inside the running server
// process. On Vercel, function instances are reused across requests (Fluid
// Compute) so this works well enough at low traffic, but counts reset when an
// instance is recycled and aren't shared across instances. The free upgrade
// path later is Upstash Redis via the Vercel Marketplace — this file is the
// only thing you'd swap.

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const hits = new Map<string, number[]>();

export function rateLimitEnabled(): boolean {
  return process.env.ENABLE_RATE_LIMIT !== 'false';
}

function maxPerHour(): number {
  return Number(process.env.RATE_LIMIT_PER_HOUR ?? 5);
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  if (!rateLimitEnabled()) return { allowed: true, remaining: Infinity };

  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= maxPerHour()) {
    hits.set(ip, recent);
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  hits.set(ip, recent);
  return { allowed: true, remaining: maxPerHour() - recent.length };
}

export function ipFromRequest(req: Request): string {
  // On Vercel the real client IP arrives in x-forwarded-for.
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
