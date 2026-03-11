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
  // NOTE: past_due is *not* blocked anymore – we allow AI usage even אם יש חוב פתוח,
  // כדי שלא לשבור חוויית עבודה של הלקוח ולשמור את הבלוק רק למצבים קיצוניים.
  // past_due: { reason: 'past_due', message: 'קיים חוב פתוח — תכונות AI מוגבלות עד להסדרת התשלום' },
  cancelled: { reason: 'cancelled', message: 'המנוי בוטל — תכונות AI אינן זמינות' },
  // NOTE: expired (trial) גם איננו חסימה כרגע — ממשיכים לאפשר AI עד שנגדיר מדיניות ברורה.
  // expired: { reason: 'expired', message: 'תקופת הניסיון הסתיימה — יש לשדרג כדי להשתמש בתכונות AI' },
};

export function checkAiAccess(subscriptionStatus: string | null | undefined): AiAccessResult {
  if (!subscriptionStatus) return { allowed: true };

  const normalized = subscriptionStatus.toLowerCase().trim();

  // #region agent log
  try {
    // Lightweight debug log for AI access decisions (H3)
    fetch('http://127.0.0.1:7328/ingest/bbae1bc8-c2a1-4945-9a27-fe94f6ee54cf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '3e79f2',
      },
      body: JSON.stringify({
        sessionId: '3e79f2',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        location: 'lib/server/subscription-guard.ts:checkAiAccess',
        message: 'checkAiAccess evaluation',
        data: {
          rawStatus: subscriptionStatus,
          normalizedStatus: normalized,
          isBlockedStatus: Boolean(BLOCKED_STATUSES[normalized]),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {
    // ignore logging failures
  }
  // #endregion

  const blocked = BLOCKED_STATUSES[normalized];
  if (blocked) return { allowed: false, reason: blocked.reason, message: blocked.message };
  return { allowed: true };
}
