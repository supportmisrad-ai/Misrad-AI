/**
 * CRON Connection Guard
 *
 * Protects the database from connection pool exhaustion caused by
 * multiple concurrent CRON job executions.
 *
 * Strategy:
 * 1. Global in-memory semaphore (works within single instance)
 * 2. Redis-based distributed lock (works across multiple instances)
 * 3. Graceful degradation - if DB is under pressure, skip non-critical CRONs
 *
 * Limitations:
 * - Vercel serverless functions don't share memory between invocations
 * - Redis lock is best-effort (network latency may cause race conditions)
 *
 * Usage:
 *   export const GET = cronGuard(cronConnectionGuard(handler, { critical: false }));
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUpstashRedisClient } from '@/lib/server/upstashRedis';

export type CronConnectionOptions = {
  /** Critical CRONs run even under pressure (default: false) */
  critical?: boolean;
  /** Lock duration in seconds (default: 300 = 5 minutes) */
  lockDuration?: number;
  /** Max concurrent CRONs globally (default: 3) */
  maxConcurrent?: number;
  /** Skip lock if Redis unavailable (default: true) */
  skipIfRedisDown?: boolean;
};

const DEFAULT_OPTIONS: Required<CronConnectionOptions> = {
  critical: false,
  lockDuration: 300,
  maxConcurrent: 6,
  skipIfRedisDown: true,
};

// In-memory tracking (works only within same instance/lambda)
const instanceRunningCrons = new Set<string>();

/**
 * Get Redis key for global CRON tracking
 */
function getCronLockKey(cronPath: string): string {
  return `cron:lock:${cronPath}`;
}

function getCronGlobalKey(): string {
  return 'cron:global:running';
}

/**
 * Check if we should allow this CRON to run based on connection pressure
 */
async function shouldAllowCron(
  cronPath: string,
  options: Required<CronConnectionOptions>
): Promise<{ allowed: boolean; reason?: string }> {
  const redis = getUpstashRedisClient();

  // If Redis is down and skipIfRedisDown is true, allow (fail open for availability)
  if (!redis && options.skipIfRedisDown) {
    return { allowed: true, reason: 'redis_unavailable_fail_open' };
  }

  if (!redis) {
    return { allowed: false, reason: 'redis_required_but_unavailable' };
  }

  try {
    // Check global concurrent count
    const globalCount = await redis.scard(getCronGlobalKey());

    if (globalCount >= options.maxConcurrent && !options.critical) {
      return {
        allowed: false,
        reason: `max_concurrent_crons_reached: ${globalCount}/${options.maxConcurrent}`,
      };
    }

    // Check if this specific CRON is already running (prevent duplicate execution)
    const lockKey = getCronLockKey(cronPath);
    const lockExists = await redis.exists(lockKey);

    if (lockExists) {
      return { allowed: false, reason: 'cron_already_running' };
    }

    return { allowed: true };
  } catch (error) {
    // Redis error - fail open if configured, otherwise block
    if (options.skipIfRedisDown) {
      return { allowed: true, reason: 'redis_error_fail_open' };
    }
    return { allowed: false, reason: 'redis_error' };
  }
}

/**
 * Acquire lock for CRON execution
 */
async function acquireCronLock(
  cronPath: string,
  options: Required<CronConnectionOptions>
): Promise<boolean> {
  const redis = getUpstashRedisClient();
  if (!redis) return false;

  try {
    const lockKey = getCronLockKey(cronPath);
    const globalKey = getCronGlobalKey();

    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.set(lockKey, '1', { nx: true, ex: options.lockDuration });
    pipeline.sadd(globalKey, cronPath);
    pipeline.expire(globalKey, options.lockDuration);

    const results = await pipeline.exec();
    // results is [Error | null, string][] from ioredis pipeline
    const firstResult = results?.[0] as [Error | null, string] | undefined;
    return firstResult?.[1] === 'OK'; // Check if set succeeded
  } catch {
    return false;
  }
}

/**
 * Release lock after CRON execution
 */
async function releaseCronLock(cronPath: string): Promise<void> {
  const redis = getUpstashRedisClient();
  if (!redis) return;

  try {
    const lockKey = getCronLockKey(cronPath);
    const globalKey = getCronGlobalKey();

    const pipeline = redis.pipeline();
    pipeline.del(lockKey);
    pipeline.srem(globalKey, cronPath);

    await pipeline.exec();
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Wrap a CRON handler with connection guard
 *
 * @param handler The CRON handler function
 * @param options Configuration options
 * @returns Wrapped handler that respects connection limits
 */
export function cronConnectionGuard(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  options: CronConnectionOptions = {}
): (req: NextRequest) => Promise<NextResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: NextRequest): Promise<NextResponse> => {
    const cronPath = req.nextUrl.pathname;

    // Check if we should run
    const check = await shouldAllowCron(cronPath, opts);

    if (!check.allowed) {
      console.warn(`[CRON Guard] Blocked ${cronPath}: ${check.reason}`);
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          reason: check.reason,
          message: 'CRON skipped due to connection pressure or duplicate execution',
        },
        { status: 503 }
      );
    }

    // Try to acquire lock
    const lockAcquired = await acquireCronLock(cronPath, opts);

    if (!lockAcquired && !opts.critical) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          reason: 'lock_acquisition_failed',
          message: 'Could not acquire CRON lock',
        },
        { status: 503 }
      );
    }

    // Track in memory (for same-instance awareness)
    instanceRunningCrons.add(cronPath);

    try {
      console.log(`[CRON Guard] Executing ${cronPath}${check.reason ? ` (${check.reason})` : ''}`);

      const startTime = Date.now();
      const result = await handler(req);
      const duration = Date.now() - startTime;

      console.log(`[CRON Guard] Completed ${cronPath} in ${duration}ms`);

      return result;
    } catch (error) {
      console.error(`[CRON Guard] Failed ${cronPath}:`, error);
      throw error;
    } finally {
      // Cleanup
      instanceRunningCrons.delete(cronPath);
      await releaseCronLock(cronPath);
    }
  };
}

/**
 * Get current CRON status for monitoring
 */
export async function getCronStatus(): Promise<{
  instanceRunning: string[];
  globalRunning?: number;
}> {
  const redis = getUpstashRedisClient();
  let globalRunning: number | undefined;

  if (redis) {
    try {
      globalRunning = await redis.scard(getCronGlobalKey());
    } catch {
      // Ignore
    }
  }

  return {
    instanceRunning: Array.from(instanceRunningCrons),
    globalRunning,
  };
}
