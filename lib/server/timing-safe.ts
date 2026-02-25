import { timingSafeEqual, createHmac } from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 * Returns true only if both strings are non-empty and equal.
 *
 * Uses HMAC-SHA256 to normalize both inputs to the same length before
 * comparing, preventing attackers from learning the secret's length
 * through timing differences.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  // HMAC both values with a static key so the resulting buffers
  // are always 32 bytes regardless of input length. This prevents
  // leaking the length of either value via early return.
  const key = 'misrad-timing-safe-compare';
  const hmacA = createHmac('sha256', key).update(a).digest();
  const hmacB = createHmac('sha256', key).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}
