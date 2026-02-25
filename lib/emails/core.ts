import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { Resend } from 'resend';

export const IS_PROD = process.env.NODE_ENV === 'production';

export type ResendSendEmailParams = Parameters<Resend['emails']['send']>[0];

export type EmailSendResult = { success: boolean; error?: string };

export function resolveSupportFromEmail(): string {
    return (process.env.MISRAD_SUPPORT_FROM_EMAIL || 'support@misrad-ai.com').trim() || 'support@misrad-ai.com';
}

export function splitSupportRecipients(input: string): string[] {
    return String(input || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}

export function getErrorField(error: unknown, field: string): string {
    const obj = asObject(error);
    const value = obj ? obj[field] : undefined;
    return typeof value === 'string' ? value : '';
}

export function getErrorName(error: unknown): string {
    if (error instanceof Error && error.name) return error.name;
    return getErrorField(error, 'name');
}

export function getErrorCode(error: unknown): string {
    return getErrorField(error, 'code');
}

export async function resolveSystemSupportEmail(): Promise<string> {
    let fallback = 'support@misrad-ai.com';
    try {
        const { getSystemEmailSettingsUnsafe } = await import('@/lib/server/systemEmailSettings');
        const settings = await getSystemEmailSettingsUnsafe();
        if (settings.supportEmail) {
            return String(settings.supportEmail).trim() || fallback;
        }
    } catch {
        fallback = (process.env.MISRAD_SUPPORT_EMAIL || fallback).trim() || fallback;
    }
    return fallback;
}

export function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return null;
    }
    return new Resend(apiKey);
}

export function resolveRecipientEmail(originalTo: string): string {
    const override = process.env.RESEND_TEST_TO;
    if (!override) return originalTo;
    return String(override).trim() || originalTo;
}

export function resolveAdminNotificationRecipients(): string[] {
    const primary = (process.env.MISRAD_ADMIN_NOTIFICATION_EMAIL || '').trim();
    const fallback = (process.env.MISRAD_SUPPORT_EMAIL || 'support@misrad-ai.com').trim();
    const raw = primary || fallback;
    return splitSupportRecipients(raw);
}
