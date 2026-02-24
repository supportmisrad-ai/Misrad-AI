/**
 * MISRAD AI — Unified Messaging Service
 * 
 * Sends real messages via:
 *   - WhatsApp Business Cloud API (Meta)
 *   - SMS via Twilio
 *   - Email via Resend (extends existing email-sender)
 * 
 * Each organization stores its own credentials in system_settings (BYOC model).
 * Credentials are stored in system_flags → messaging → { whatsapp, sms, email }
 */

import { Buffer } from 'buffer';
import prisma, { queryRawTenantScoped } from '@/lib/prisma';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Types ──────────────────────────────────────────────────────────

export type MessagingChannel = 'whatsapp' | 'sms' | 'email';

export interface MessagingCredentials {
    whatsapp?: {
        phoneNumberId: string;
        accessToken: string;
        businessAccountId?: string;
        isActive: boolean;
    };
    sms?: {
        accountSid: string;
        authToken: string;
        fromNumber: string;
        isActive: boolean;
    };
    email?: {
        fromAddress: string;
        fromName: string;
        replyTo?: string;
        isActive: boolean;
    };
}

export interface SendMessageParams {
    channel: MessagingChannel;
    to: string;
    body: string;
    subject?: string; // For email
    tenantId: string;
}

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
    channel: MessagingChannel;
}

// ─── Credential Fetching ────────────────────────────────────────────

async function getMessagingCredentials(tenantId: string): Promise<MessagingCredentials | null> {
    try {
        const rows = await queryRawTenantScoped<
            Array<{ system_flags: unknown }>
        >(prisma, {
            tenantId,
            reason: 'messaging_credentials_get',
            query: `
                SELECT system_flags
                FROM system_settings
                WHERE tenant_id = $1::uuid
                LIMIT 1
            `,
            values: [tenantId],
        });

        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!row) return null;

        const flags = asObject(row.system_flags);
        if (!flags) return null;

        const messaging = asObject(flags.messaging);
        if (!messaging) return null;

        return {
            whatsapp: parseWhatsAppCreds(asObject(messaging.whatsapp)),
            sms: parseSmsCreds(asObject(messaging.sms)),
            email: parseEmailCreds(asObject(messaging.email)),
        };
    } catch (error) {
        if (!IS_PROD) console.error('[MessagingService] Error fetching credentials:', error);
        return null;
    }
}

function parseWhatsAppCreds(obj: Record<string, unknown> | null) {
    if (!obj) return undefined;
    const phoneNumberId = typeof obj.phoneNumberId === 'string' ? obj.phoneNumberId : '';
    const accessToken = typeof obj.accessToken === 'string' ? obj.accessToken : '';
    if (!phoneNumberId || !accessToken) return undefined;
    return {
        phoneNumberId,
        accessToken,
        businessAccountId: typeof obj.businessAccountId === 'string' ? obj.businessAccountId : undefined,
        isActive: Boolean(obj.isActive ?? true),
    };
}

function parseSmsCreds(obj: Record<string, unknown> | null) {
    if (!obj) return undefined;
    const accountSid = typeof obj.accountSid === 'string' ? obj.accountSid : '';
    const authToken = typeof obj.authToken === 'string' ? obj.authToken : '';
    const fromNumber = typeof obj.fromNumber === 'string' ? obj.fromNumber : '';
    if (!accountSid || !authToken || !fromNumber) return undefined;
    return {
        accountSid,
        authToken,
        fromNumber,
        isActive: Boolean(obj.isActive ?? true),
    };
}

function parseEmailCreds(obj: Record<string, unknown> | null) {
    if (!obj) return undefined;
    const fromAddress = typeof obj.fromAddress === 'string' ? obj.fromAddress : '';
    if (!fromAddress) return undefined;
    return {
        fromAddress,
        fromName: typeof obj.fromName === 'string' ? obj.fromName : 'MISRAD AI',
        replyTo: typeof obj.replyTo === 'string' ? obj.replyTo : undefined,
        isActive: Boolean(obj.isActive ?? true),
    };
}

// ─── Channel Status ─────────────────────────────────────────────────

export interface ChannelStatus {
    whatsapp: { configured: boolean; active: boolean };
    sms: { configured: boolean; active: boolean };
    email: { configured: boolean; active: boolean };
}

export async function getChannelStatus(tenantId: string): Promise<ChannelStatus> {
    const creds = await getMessagingCredentials(tenantId);
    return {
        whatsapp: {
            configured: Boolean(creds?.whatsapp),
            active: Boolean(creds?.whatsapp?.isActive),
        },
        sms: {
            configured: Boolean(creds?.sms),
            active: Boolean(creds?.sms?.isActive),
        },
        email: {
            configured: Boolean(creds?.email) || Boolean(process.env.RESEND_API_KEY),
            active: Boolean(creds?.email?.isActive) || Boolean(process.env.RESEND_API_KEY),
        },
    };
}

// ─── Send Message (Unified) ─────────────────────────────────────────

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { channel, to, body, subject, tenantId } = params;

    const creds = await getMessagingCredentials(tenantId);

    switch (channel) {
        case 'whatsapp':
            return sendWhatsApp(to, body, creds?.whatsapp ?? null);
        case 'sms':
            return sendSms(to, body, creds?.sms ?? null);
        case 'email':
            return sendEmailInbox(to, body, subject, creds?.email ?? null);
        default:
            return { success: false, error: `Unknown channel: ${channel}`, channel };
    }
}

// ─── WhatsApp (Meta Cloud API) ──────────────────────────────────────

async function sendWhatsApp(
    to: string,
    body: string,
    creds: MessagingCredentials['whatsapp'] | null
): Promise<SendMessageResult> {
    if (!creds || !creds.isActive) {
        return {
            success: false,
            error: 'WhatsApp לא מוגדר. הגדר את פרטי ההתחברות בהגדרות → ערוצי תקשורת.',
            channel: 'whatsapp',
        };
    }

    try {
        // Clean phone number — Meta expects international format without + prefix
        const cleanTo = to.replace(/[^\d]/g, '');

        const apiUrl = `https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'text',
            text: { body },
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${creds.accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = `WhatsApp API error: ${response.statusText}`;
            try {
                const parsed = JSON.parse(errorText) as { error?: { message?: string } };
                if (parsed?.error?.message) {
                    errorMsg = parsed.error.message;
                }
            } catch {
                if (errorText) errorMsg = errorText;
            }
            console.error('[MessagingService] WhatsApp API error:', { status: response.status });
            return { success: false, error: errorMsg, channel: 'whatsapp' };
        }

        const result = (await response.json()) as { messages?: Array<{ id?: string }> };
        const messageId = result?.messages?.[0]?.id;

        return {
            success: true,
            messageId: messageId || undefined,
            channel: 'whatsapp',
        };
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (!IS_PROD) console.error('[MessagingService] WhatsApp send error:', error);
        return { success: false, error: `שגיאה בשליחת WhatsApp: ${msg}`, channel: 'whatsapp' };
    }
}

// ─── SMS (Twilio) ───────────────────────────────────────────────────

async function sendSms(
    to: string,
    body: string,
    creds: MessagingCredentials['sms'] | null
): Promise<SendMessageResult> {
    if (!creds || !creds.isActive) {
        return {
            success: false,
            error: 'SMS לא מוגדר. הגדר את פרטי ההתחברות בהגדרות → ערוצי תקשורת.',
            channel: 'sms',
        };
    }

    try {
        const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;
        const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

        const payload = new URLSearchParams();
        payload.set('From', creds.fromNumber);
        payload.set('To', to.replace(/[^\d+]/g, ''));
        payload.set('Body', body);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${auth}`,
            },
            body: payload.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[MessagingService] Twilio SMS error:', { status: response.status });
            let errorMsg = `SMS API error: ${response.statusText}`;
            try {
                const parsed = JSON.parse(errorText) as { message?: string };
                if (parsed?.message) errorMsg = parsed.message;
            } catch {
                // use default
            }
            return { success: false, error: errorMsg, channel: 'sms' };
        }

        const result = (await response.json()) as { sid?: string };
        return {
            success: true,
            messageId: result?.sid || undefined,
            channel: 'sms',
        };
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (!IS_PROD) console.error('[MessagingService] SMS send error:', error);
        return { success: false, error: `שגיאה בשליחת SMS: ${msg}`, channel: 'sms' };
    }
}

// ─── Email (Resend) ─────────────────────────────────────────────────

async function sendEmailInbox(
    to: string,
    body: string,
    subject: string | undefined,
    creds: MessagingCredentials['email'] | null
): Promise<SendMessageResult> {
    // Fallback to system Resend API key
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        return {
            success: false,
            error: 'Email לא מוגדר. הגדר RESEND_API_KEY בהגדרות המערכת.',
            channel: 'email',
        };
    }

    const fromAddr = creds?.fromAddress || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = creds?.fromName || 'MISRAD AI';
    const replyTo = creds?.replyTo;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: `${fromName} <${fromAddr}>`,
                to: [to],
                subject: subject || 'הודעה מ-MISRAD AI',
                html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.8;color:#1e293b;padding:24px;">${body.replace(/\n/g, '<br/>')}</div>`,
                ...(replyTo ? { reply_to: replyTo } : {}),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[MessagingService] Resend email error:', { status: response.status });
            let errorMsg = `Email API error: ${response.statusText}`;
            try {
                const parsed = JSON.parse(errorText) as { message?: string };
                if (parsed?.message) errorMsg = parsed.message;
            } catch {
                // use default
            }
            return { success: false, error: errorMsg, channel: 'email' };
        }

        const result = (await response.json()) as { id?: string };
        return {
            success: true,
            messageId: result?.id || undefined,
            channel: 'email',
        };
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (!IS_PROD) console.error('[MessagingService] Email send error:', error);
        return { success: false, error: `שגיאה בשליחת Email: ${msg}`, channel: 'email' };
    }
}

// ─── Save Credentials ───────────────────────────────────────────────

export async function saveMessagingCredentials(
    tenantId: string,
    channel: MessagingChannel,
    credentials: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
    try {
        // Build the messaging object with just the updated channel
        const messagingPatch = { [channel]: credentials };

        await queryRawTenantScoped(prisma, {
            tenantId,
            reason: 'messaging_credentials_upsert',
            query: `
                INSERT INTO system_settings (tenant_id, system_flags)
                VALUES ($1::uuid, jsonb_build_object('messaging', $2::jsonb))
                ON CONFLICT (tenant_id)
                DO UPDATE SET
                    system_flags = jsonb_set(
                        COALESCE(system_settings.system_flags, '{}'::jsonb),
                        '{messaging}',
                        COALESCE(system_settings.system_flags->'messaging', '{}'::jsonb) || $2::jsonb
                    ),
                    updated_at = NOW()
                RETURNING id
            `,
            values: [tenantId, messagingPatch],
        });

        return { success: true };
    } catch (error: unknown) {
        const msg = getErrorMessage(error);
        if (!IS_PROD) console.error('[MessagingService] Save credentials error:', error);
        return { success: false, error: msg };
    }
}
