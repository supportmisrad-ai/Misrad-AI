/**
 * MISRAD AI — Smart Email Sender
 * Routes emails through correct sender addresses based on category,
 * checks user notification preferences, and handles unsubscribe tokens.
 *
 * This is the ONLY module that should call Resend directly.
 * All other code should use `sendEmail()` from this module.
 */

import { Resend } from 'resend';
import crypto from 'crypto';
import { getBaseUrl } from '@/lib/utils';
import {
    EMAIL_SENDERS,
    getEmailDefinition,
    getSenderForEmail,
    isEmailOptedOut,
    type EmailCategory,
    type SenderKey,
} from './email-registry';
import { ensureEmailAssetsCacheWarm } from './email-assets';

const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Resend Client (lazy) ───────────────────────────────────────────
let _resendTransactional: Resend | null = null;
let _resendMarketing: Resend | null = null;

function getTransactionalClient(): Resend | null {
    if (_resendTransactional) return _resendTransactional;
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    _resendTransactional = new Resend(key);
    return _resendTransactional;
}

function getMarketingClient(): Resend | null {
    if (_resendMarketing) return _resendMarketing;
    // Use separate API key for marketing if available, else fall back to transactional
    const key = process.env.RESEND_MARKETING_API_KEY || process.env.RESEND_API_KEY;
    if (!key) return null;
    _resendMarketing = new Resend(key);
    return _resendMarketing;
}

// ─── Test Override ──────────────────────────────────────────────────
function resolveRecipient(email: string): string {
    const override = process.env.RESEND_TEST_TO;
    if (!override) return email;
    return String(override).trim() || email;
}

// ─── Unsubscribe Token ─────────────────────────────────────────────
// Simple HMAC-based token so users can unsubscribe via link without login.
function generateUnsubscribeToken(email: string, preferenceKey: string): string {
    const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || 'misrad-unsub-fallback';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${email}:${preferenceKey}`);
    return hmac.digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, preferenceKey: string, token: string): boolean {
    const expected = generateUnsubscribeToken(email, preferenceKey);
    return token === expected;
}

function buildUnsubscribeUrl(email: string, preferenceKey: string): string {
    const token = generateUnsubscribeToken(email, preferenceKey);
    const base = getBaseUrl();
    return `${base}/api/email/unsubscribe?email=${encodeURIComponent(email)}&pref=${encodeURIComponent(preferenceKey)}&token=${encodeURIComponent(token)}`;
}

// ─── Core Send Function ─────────────────────────────────────────────
export interface SendEmailOptions {
    /** Email type ID from the registry */
    emailTypeId: string;
    /** Recipient email address */
    to: string;
    /** Email subject line */
    subject: string;
    /** Full HTML content (already generated via email-templates.ts) */
    html: string;
    /** Optional reply-to address */
    replyTo?: string;
    /** Optional: user's notification preferences (Profile.notificationPreferences) */
    userPreferences?: Record<string, unknown>;
    /** Optional: force send even if user opted out (for billing/security) */
    forceSend?: boolean;
    /** Optional: override sender key */
    senderKeyOverride?: SenderKey;
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
    skippedReason?: 'opted_out' | 'no_client' | 'no_recipient';
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const {
        emailTypeId,
        to,
        subject,
        html,
        replyTo,
        userPreferences,
        forceSend = false,
        senderKeyOverride,
    } = options;

    // Warm email assets cache (DB overrides) — TTL-guarded, no-op if warm
    await ensureEmailAssetsCacheWarm();

    // Validate recipient
    if (!to || !to.includes('@')) {
        return { success: false, error: 'Invalid recipient', skippedReason: 'no_recipient' };
    }

    // Look up email definition
    const definition = getEmailDefinition(emailTypeId);
    const category: EmailCategory = definition?.category || 'transactional';

    // Check user preferences (skip for non-unsubscribable emails)
    if (!forceSend && definition?.canUnsubscribe && userPreferences) {
        if (isEmailOptedOut(definition.preferenceKey, userPreferences)) {
            return { success: true, skippedReason: 'opted_out' };
        }
    }

    // Determine sender
    const senderConfig = senderKeyOverride
        ? EMAIL_SENDERS[senderKeyOverride]
        : getSenderForEmail(emailTypeId);

    // Resolve from address — use env override if configured, else registry
    const fromAddress = resolveFromAddress(category, senderConfig.address);
    const fromName = senderConfig.name;
    const from = `${fromName} <${fromAddress}>`;

    // Pick the right Resend client
    const client = category === 'marketing'
        ? getMarketingClient()
        : getTransactionalClient();

    if (!client) {
        if (!IS_PROD) console.warn(`[EmailSender] No Resend client for category=${category}`);
        return { success: false, error: 'Email service not configured', skippedReason: 'no_client' };
    }

    // Add unsubscribe headers for all emails that can be unsubscribed
    const headers: Record<string, string> = {};
    let finalHtml = html;

    if (definition?.canUnsubscribe) {
        const unsubUrl = buildUnsubscribeUrl(to, definition.preferenceKey);
        headers['List-Unsubscribe'] = `<${unsubUrl}>`;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
        // Inject unsubscribe footer into HTML if not already present
        if (!html.includes('unsubscribe-link')) {
            finalHtml = injectUnsubscribeFooter(html, unsubUrl);
        }
    }

    const recipient = resolveRecipient(to);

    try {
        const sendParams: Record<string, unknown> = {
            from,
            to: recipient,
            subject,
            html: finalHtml,
            ...(replyTo ? { replyTo } : {}),
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
        };

        const { data, error } = await (client.emails.send as unknown as (params: Record<string, unknown>) => Promise<{ data: { id: string } | null; error: { message: string } | null }>)(sendParams);

        if (error) {
            const errMsg = typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message: string }).message)
                : String(error);
            if (!IS_PROD) {
                console.error(`[EmailSender] Error sending ${emailTypeId}:`, errMsg);
            }
            return { success: false, error: errMsg };
        }

        return {
            success: true,
            messageId: data?.id ? String(data.id) : undefined,
        };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (!IS_PROD) {
            console.error(`[EmailSender] Exception sending ${emailTypeId}:`, msg);
        }
        return { success: false, error: msg };
    }
}

// ─── Batch Send ─────────────────────────────────────────────────────
export async function sendEmailBatch(
    emails: SendEmailOptions[]
): Promise<SendEmailResult[]> {
    // Send sequentially to respect rate limits
    const results: SendEmailResult[] = [];
    for (const email of emails) {
        const result = await sendEmail(email);
        results.push(result);
    }
    return results;
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Resolve the actual "from" address.
 * Uses environment overrides if the specific domain isn't verified yet in Resend.
 */
function resolveFromAddress(category: EmailCategory, registryAddress: string): string {
    // Per-category env overrides (allows gradual domain migration)
    const overrides: Partial<Record<EmailCategory, string>> = {
        transactional: process.env.EMAIL_FROM_TRANSACTIONAL,
        onboarding: process.env.EMAIL_FROM_ONBOARDING,
        team: process.env.EMAIL_FROM_TEAM,
        organization: process.env.EMAIL_FROM_ORGANIZATION,
        billing: process.env.EMAIL_FROM_BILLING,
        support: process.env.EMAIL_FROM_SUPPORT || process.env.MISRAD_SUPPORT_FROM_EMAIL,
        system: process.env.EMAIL_FROM_SYSTEM,
        marketing: process.env.EMAIL_FROM_MARKETING,
    };

    const override = overrides[category];
    if (override && override.trim()) return override.trim();

    // Global fallback
    const global = process.env.RESEND_FROM_EMAIL;
    if (global && global.trim()) return global.trim();

    return registryAddress;
}

/**
 * Inject an unsubscribe footer into email HTML.
 * Looks for the closing </table> before </body> and inserts before it.
 */
function injectUnsubscribeFooter(html: string, unsubUrl: string): string {
    const manageUrl = unsubUrl.replace('/api/email/unsubscribe?', '/me/notifications?');

    const footer = `
        <tr>
            <td style="padding:24px 40px 16px;text-align:center;border-top:1px solid #e2e8f0;">
                <div style="margin-bottom:12px;">
                    <a href="${manageUrl}" style="color:#64748b;font-size:12px;text-decoration:none;font-weight:600;">
                        ניהול העדפות התראות →
                    </a>
                </div>
                <a href="${unsubUrl}" class="unsubscribe-link" style="color:#94a3b8;font-size:11px;text-decoration:underline;">
                    ביטול הרשמה מרשימת תפוצה זו
                </a>
            </td>
        </tr>
    `;

    // Insert before the last </table> tag (which is the outer wrapper)
    const lastTableIdx = html.lastIndexOf('</table>');
    if (lastTableIdx === -1) {
        // Fallback: append before </body>
        const fallbackFooter = `<div style="text-align:center;padding:16px;">
            <div style="margin-bottom:8px;">
                <a href="${manageUrl}" style="color:#64748b;font-size:12px;text-decoration:none;font-weight:600;">ניהול העדפות התראות →</a>
            </div>
            <a href="${unsubUrl}" class="unsubscribe-link" style="color:#94a3b8;font-size:11px;text-decoration:underline;">ביטול הרשמה מרשימת תפוצה זו</a>
        </div>`;
        return html.replace('</body>', `${fallbackFooter}</body>`);
    }

    return html.slice(0, lastTableIdx) + footer + html.slice(lastTableIdx);
}
