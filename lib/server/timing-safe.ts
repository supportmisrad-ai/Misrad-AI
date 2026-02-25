import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks on secrets.
 * Returns true only if both strings are non-empty and equal.
 *
 * Uses Node.js crypto.timingSafeEqual under the hood which ensures
 * constant-time comparison regardless of where strings differ.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
