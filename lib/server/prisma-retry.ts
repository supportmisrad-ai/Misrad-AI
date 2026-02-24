import 'server-only';

/**
 * Transient-error retry utility for Prisma / PgBouncer operations.
 *
 * When running through Supabase PgBouncer, transient errors such as
 * connection resets, pool exhaustion, and prepared-statement collisions
 * can occur. This utility retries the operation with exponential backoff
 * so that the end-user never sees a failure for recoverable issues.
 *
 * Non-transient errors (permission denied, missing table, validation) are
 * NOT retried — they propagate immediately.
 */

const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the pool
]);

const TRANSIENT_MESSAGE_PATTERNS = [
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /connection\s+pool\s+exhausted/i,
  /prepared\s+statement\s+.*already\s+exists/i,
  /server\s+closed\s+the\s+connection/i,
  /connection\s+terminated\s+unexpectedly/i,
  /too\s+many\s+connections/i,
  /remaining\s+connection\s+slots\s+are\s+reserved/i,
  /Cannot\s+reach\s+database/i,
];

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const errObj = error as Record<string, unknown>;

  // Prisma error codes
  if (typeof errObj.code === 'string' && TRANSIENT_PRISMA_CODES.has(errObj.code)) {
    return true;
  }

  // Message pattern matching
  const message = typeof errObj.message === 'string' ? errObj.message : '';
  if (message && TRANSIENT_MESSAGE_PATTERNS.some((p) => p.test(message))) {
    return true;
  }

  // Nested cause
  if (errObj.cause && typeof errObj.cause === 'object') {
    return isTransientError(errObj.cause);
  }

  return false;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 150;

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Label for log messages */
  label?: string;
}

/**
 * Execute `fn` with automatic retry on transient DB/network errors.
 * Non-transient errors are thrown immediately without retry.
 */
export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelay = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const label = options?.label ?? 'prisma-retry';

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Non-transient → fail immediately
      if (!isTransientError(error)) {
        throw error;
      }

      // Last attempt → throw
      if (attempt === maxAttempts) {
        console.error(
          `[${label}] All ${maxAttempts} attempts exhausted. Last error:`,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }

      // Exponential backoff: 150ms, 300ms, ...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(
        `[${label}] Transient error on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms:`,
        error instanceof Error ? error.message : String(error),
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // TypeScript safety — unreachable
  throw lastError;
}
