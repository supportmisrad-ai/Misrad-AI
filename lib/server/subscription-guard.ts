import 'server-only';

/**
 * Subscription Guard — controls AI feature access based on org subscription status.
 *
 * Statuses that BLOCK AI features:
 *   - suspended  → admin suspended due to debt
 *   - past_due   → payment failed / overdue
 *   - cancelled  → subscription cancelled
 *   - expired    → trial expired (already handled by workspace access with 402)
 *
 * Statuses that ALLOW AI features:
 *   - active
 *   - trial
 *   - null/undefined (fallback: allow)
 */

type AiBlockReason = 'suspended' | 'past_due' | 'cancelled' | 'expired';

export type AiAccessResult =
  | { allowed: true }
  | { allowed: false; reason: AiBlockReason; message: string };

const BLOCKED_STATUSES: Record<string, { reason: AiBlockReason; message: string }> = {
  suspended: { reason: 'suspended', message: 'חשבון מושעה — יש להסדיר את החוב כדי להשתמש בתכונות AI' },
  past_due: { reason: 'past_due', message: 'קיים חוב פתוח — תכונות AI מוגבלות עד להסדרת התשלום' },
  cancelled: { reason: 'cancelled', message: 'המנוי בוטל — תכונות AI אינן זמינות' },
  expired: { reason: 'expired', message: 'תקופת הניסיון הסתיימה — יש לשדרג כדי להשתמש בתכונות AI' },
};

export function checkAiAccess(subscriptionStatus: string | null | undefined): AiAccessResult {
  if (!subscriptionStatus) return { allowed: true };
  const normalized = subscriptionStatus.toLowerCase().trim();
  const blocked = BLOCKED_STATUSES[normalized];
  if (blocked) return { allowed: false, reason: blocked.reason, message: blocked.message };
  return { allowed: true };
}
