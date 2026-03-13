/**
 * MISRAD AI — Email Analytics (Open Tracking)
 * Simple pixel-based open tracking for email analytics
 */

import { createHash } from 'crypto';

export interface EmailAnalyticsEvent {
    id: string;
    emailType: string;
    recipientEmail: string;
    organizationId?: string;
    sentAt: Date;
    openedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
}

// In-memory store for analytics (in production, use Redis or DB)
const _analyticsStore = new Map<string, EmailAnalyticsEvent>();

/**
 * Generate a unique tracking pixel URL for an email
 */
export function generateTrackingPixelUrl(params: {
    emailType: string;
    recipientEmail: string;
    organizationId?: string;
    messageId: string;
}): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://misrad-ai.com';

    // Create a hash of the message ID and email for uniqueness
    const hash = createHash('sha256')
        .update(`${params.messageId}:${params.recipientEmail}`)
        .digest('hex')
        .slice(0, 16);

    const trackingId = `${hash}`;

    // Store the event
    _analyticsStore.set(trackingId, {
        id: trackingId,
        emailType: params.emailType,
        recipientEmail: params.recipientEmail,
        organizationId: params.organizationId,
        sentAt: new Date(),
    });

    return `${baseUrl}/api/email/track?tid=${trackingId}`;
}

/**
 * Record an email open event
 */
export async function recordEmailOpen(trackingId: string, metadata: {
    ipAddress?: string;
    userAgent?: string;
}): Promise<void> {
    const event = _analyticsStore.get(trackingId);
    if (!event) return;

    // Only record first open
    if (!event.openedAt) {
        event.openedAt = new Date();
        event.ipAddress = metadata.ipAddress;
        event.userAgent = metadata.userAgent;

        // In production, persist to database
        // await prisma.emailAnalytics.create({...})

        if (process.env.NODE_ENV !== 'production') {
            console.log('[EmailAnalytics] Open recorded:', {
                trackingId,
                emailType: event.emailType,
                recipient: event.recipientEmail,
                openedAt: event.openedAt,
            });
        }
    }
}

/**
 * Get analytics for an email type
 */
export function getEmailAnalytics(emailType: string): {
    sent: number;
    opened: number;
    openRate: number;
} {
    const events = Array.from(_analyticsStore.values()).filter(e => e.emailType === emailType);
    const sent = events.length;
    const opened = events.filter(e => e.openedAt).length;
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

    return { sent, opened, openRate };
}

/**
 * Generate tracking pixel HTML
 */
export function generateTrackingPixelHtml(trackingUrl: string): string {
    return `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;" />`;
}
