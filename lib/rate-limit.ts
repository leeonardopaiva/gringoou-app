import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  scope: string;
  key: string;
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __emigreiRateLimitStore: Map<string, RateLimitEntry> | undefined;
  // eslint-disable-next-line no-var
  var __emigreiRateLimitOps: number | undefined;
  // eslint-disable-next-line no-var
  var __emigreiUpstashRateLimiters: Map<string, Ratelimit> | undefined;
}

const localRateLimitStore =
  globalThis.__emigreiRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalThis.__emigreiRateLimitStore) {
  globalThis.__emigreiRateLimitStore = localRateLimitStore;
}

if (!globalThis.__emigreiRateLimitOps) {
  globalThis.__emigreiRateLimitOps = 0;
}

const upstashRateLimiters =
  globalThis.__emigreiUpstashRateLimiters ?? new Map<string, Ratelimit>();

if (!globalThis.__emigreiUpstashRateLimiters) {
  globalThis.__emigreiUpstashRateLimiters = upstashRateLimiters;
}

const hasUpstashCredentials = Boolean(
  process.env.NODE_ENV === 'production' &&
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const upstashRedis = hasUpstashCredentials ? Redis.fromEnv() : null;

const toDurationString = (windowMs: number) => {
  if (windowMs % 86_400_000 === 0) {
    return `${windowMs / 86_400_000} d` as const;
  }

  if (windowMs % 3_600_000 === 0) {
    return `${windowMs / 3_600_000} h` as const;
  }

  if (windowMs % 60_000 === 0) {
    return `${windowMs / 60_000} m` as const;
  }

  if (windowMs % 1000 === 0) {
    return `${windowMs / 1000} s` as const;
  }

  return `${windowMs} ms` as const;
};

const getUpstashLimiter = (scope: string, max: number, windowMs: number) => {
  const limiterKey = `${scope}:${max}:${windowMs}`;
  const existingLimiter = upstashRateLimiters.get(limiterKey);

  if (existingLimiter) {
    return existingLimiter;
  }

  const nextLimiter = new Ratelimit({
    redis: upstashRedis!,
    limiter: Ratelimit.fixedWindow(max, toDurationString(windowMs)),
    prefix: `@emigrei/ratelimit/${scope}`,
  });

  upstashRateLimiters.set(limiterKey, nextLimiter);

  return nextLimiter;
};

const cleanupExpiredEntries = (now: number) => {
  globalThis.__emigreiRateLimitOps = (globalThis.__emigreiRateLimitOps ?? 0) + 1;

  if (
    (globalThis.__emigreiRateLimitOps ?? 0) % 200 !== 0 &&
    localRateLimitStore.size < 2000
  ) {
    return;
  }

  for (const [entryKey, entry] of localRateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      localRateLimitStore.delete(entryKey);
    }
  }
};

const consumeLocalRateLimit = ({
  scope,
  key,
  max,
  windowMs,
}: RateLimitConfig): RateLimitResult => {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const entryKey = `${scope}:${key}`;
  const currentEntry = localRateLimitStore.get(entryKey);

  if (!currentEntry || currentEntry.resetAt <= now) {
    const nextEntry = {
      count: 1,
      resetAt: now + windowMs,
    };

    localRateLimitStore.set(entryKey, nextEntry);

    return {
      allowed: true,
      remaining: Math.max(0, max - nextEntry.count),
      resetAt: nextEntry.resetAt,
    };
  }

  currentEntry.count += 1;
  localRateLimitStore.set(entryKey, currentEntry);

  return {
    allowed: currentEntry.count <= max,
    remaining: Math.max(0, max - currentEntry.count),
    resetAt: currentEntry.resetAt,
  };
};

export const getRequestIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
};

export const getRateLimitKey = (request: Request, userId?: string | null) =>
  userId ? `user:${userId}` : `ip:${getRequestIp(request)}`;

export const consumeRateLimit = async (
  config: RateLimitConfig,
): Promise<RateLimitResult> => {
  if (!upstashRedis) {
    return consumeLocalRateLimit(config);
  }

  try {
    const limiter = getUpstashLimiter(config.scope, config.max, config.windowMs);
    const result = await limiter.limit(config.key);

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    console.error('Upstash rate limit failed. Falling back to local memory.', error);
    return consumeLocalRateLimit(config);
  }
};

export const buildRateLimitHeaders = (result: RateLimitResult) => ({
  'X-RateLimit-Remaining': String(result.remaining),
  'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
});

export const isDistributedRateLimitEnabled = hasUpstashCredentials;
