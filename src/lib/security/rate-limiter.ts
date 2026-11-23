/**
 * Sliding-window in-memory rate limiter.
 * Operates without external dependencies (Redis-free) and prunes stale windows automatically.
 */
interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const threshold = now - windowMs;
  for (const [key, record] of memoryStore.entries()) {
    record.timestamps = record.timestamps.filter((t) => t > threshold);
    if (record.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60 * 1000, maxRequests: 20 }
): RateLimitResult {
  const now = Date.now();
  cleanupStaleEntries(options.windowMs);

  const threshold = now - options.windowMs;
  let record = memoryStore.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(identifier, record);
  }

  // Keep only timestamps within window
  record.timestamps = record.timestamps.filter((t) => t > threshold);

  if (record.timestamps.length >= options.maxRequests) {
    const oldest = record.timestamps[0] || now;
    const resetMs = Math.max(0, oldest + options.windowMs - now);
    return {
      success: false,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: options.maxRequests - record.timestamps.length,
    resetMs: options.windowMs,
  };
}

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "127.0.0.1";
}
