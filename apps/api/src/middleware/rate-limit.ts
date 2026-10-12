import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { Redis } from "ioredis";
import { config } from "../config.js";

// In-memory fallback bucket for offline dev & unit testing
interface MemBucket {
  count: number;
  resetAt: number;
}
const memStore = new Map<string, MemBucket>();

export function clearRateLimits(): void {
  memStore.clear();
}

let redisClient: Redis | null = null;
let isRedisConnected = false;

function getRedis(): Redis | null {
  if (config.NODE_ENV === "test") {
    // Tests use memStore for fast, deterministic unit test assertions
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      redisClient.connect().then(() => {
        isRedisConnected = true;
      }).catch(() => {
        isRedisConnected = false;
      });

      redisClient.on("connect", () => { isRedisConnected = true; });
      redisClient.on("error", () => { isRedisConnected = false; });
      redisClient.on("close", () => { isRedisConnected = false; });
    } catch {
      isRedisConnected = false;
    }
  }

  return isRedisConnected ? redisClient : null;
}

export interface RateLimitConfig {
  keyPrefix: string;
  windowSeconds: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (c: Context) => string | Promise<string>;
}

export function getClientIp(c: Context): string {
  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Creates a rate limiting middleware backed by Redis/Valkey with an in-memory fallback.
 */
export function createRateLimiter(opts: RateLimitConfig) {
  const { keyPrefix, windowSeconds, maxRequests, message, keyGenerator } = opts;

  return createMiddleware(async (c, next) => {
    // Allow bypassing rate limits for super admin in tests if configured
    if (config.NODE_ENV === "test" && c.req.header("x-bypass-rate-limit") === "1") {
      return await next();
    }

    const identifier = keyGenerator
      ? await keyGenerator(c)
      : getClientIp(c);

    if (!identifier) {
      return await next();
    }

    const fullKey = `${keyPrefix}:${identifier}`;
    let current = 0;
    let ttl = windowSeconds;

    const redis = getRedis();

    if (redis) {
      try {
        // Lua script: atomically increment and set TTL on first hit
        const script = `
          local current = redis.call('INCR', KEYS[1])
          if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
          end
          local ttl = redis.call('TTL', KEYS[1])
          return {current, ttl}
        `;
        const res = (await redis.eval(script, 1, fullKey, windowSeconds)) as [number, number];
        current = res[0];
        ttl = Math.max(1, res[1]);
      } catch (err) {
        // Fall back to memory on Redis error
        current = updateMemoryBucket(fullKey, windowSeconds);
      }
    } else {
      current = updateMemoryBucket(fullKey, windowSeconds);
      const bucket = memStore.get(fullKey);
      if (bucket) {
        ttl = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
      }
    }

    // Set standard rate limit headers
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - current)));
    c.header("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + ttl));

    if (current > maxRequests) {
      c.header("Retry-After", String(ttl));
      return c.json(
        {
          type: "https://httpstatuses.com/429",
          title: "Too Many Requests",
          status: 429,
          detail:
            message ||
            `Rate limit exceeded. Please wait ${ttl} seconds before trying again.`,
          retryAfter: ttl,
        },
        429
      );
    }

    await next();
  });
}

function updateMemoryBucket(key: string, windowSeconds: number): number {
  const now = Date.now();
  let bucket = memStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + windowSeconds * 1000 };
    memStore.set(key, bucket);
    return 1;
  }

  bucket.count += 1;
  return bucket.count;
}

// =========================================================================
// Pre-configured rate limiters per Remediation Plan Task 3.1
// =========================================================================

/**
 * Login: 5 attempts/min/IP
 */
export const loginIpRateLimiter = createRateLimiter({
  keyPrefix: "rl:login:ip",
  windowSeconds: 60,
  maxRequests: 5,
  message: "Too many login attempts from this IP. Please try again after 60 seconds.",
});

/**
 * Login Account Lockout: 10 attempts/hour/account
 */
export const loginAccountRateLimiter = createRateLimiter({
  keyPrefix: "rl:login:acct",
  windowSeconds: 3600,
  maxRequests: 10,
  message: "Account temporarily locked due to too many failed attempts. Try again in an hour.",
  keyGenerator: async (c) => {
    try {
      const cloned = c.req.raw.clone();
      const body = await cloned.json();
      const accountId = body.email || body.phone || body.username;
      return accountId ? String(accountId).toLowerCase().trim() : "";
    } catch {
      return "";
    }
  },
});

/**
 * Register Store: 3 requests/hour/IP
 */
export const registerStoreRateLimiter = createRateLimiter({
  keyPrefix: "rl:register:ip",
  windowSeconds: 3600,
  maxRequests: 3,
  message: "Store creation rate limit exceeded (maximum 3 stores per hour per IP).",
});

/**
 * Orders (Checkout): 10 requests/min/IP
 */
export const orderRateLimiter = createRateLimiter({
  keyPrefix: "rl:orders:ip",
  windowSeconds: 60,
  maxRequests: 10,
  message: "Order submission rate limit exceeded. Please wait a moment before trying again.",
});

/**
 * Incomplete Orders: 20 requests/min/IP
 */
export const incompleteOrderRateLimiter = createRateLimiter({
  keyPrefix: "rl:incomplete:ip",
  windowSeconds: 60,
  maxRequests: 20,
  message: "Incomplete lead submission rate limit exceeded.",
});

/**
 * Merchant API (/v1/*): 120 requests/min/session or token
 */
export const merchantApiRateLimiter = createRateLimiter({
  keyPrefix: "rl:v1:sess",
  windowSeconds: 60,
  maxRequests: 120,
  message: "Merchant API rate limit exceeded (120 requests/minute).",
  keyGenerator: (c) => {
    const authHeader = c.req.header("authorization");
    if (authHeader) return authHeader.slice(-32);

    const testSession = c.req.header("x-test-session");
    if (testSession) {
      try {
        const parsed = JSON.parse(testSession);
        if (parsed.session?.id || parsed.user?.id) {
          return parsed.session?.id || parsed.user?.id;
        }
      } catch {}
    }

    const cookie = c.req.header("cookie");
    if (cookie) {
      const match = cookie.match(/better-auth\.session_token=([^;]+)/);
      if (match) return match[1];
    }

    return getClientIp(c);
  },
});
