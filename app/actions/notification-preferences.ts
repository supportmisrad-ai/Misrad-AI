'use server';


/**
 * Server Actions: Notification Preferences
 * Read/write Profile.notificationPreferences JSON field.
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { logger } from '@/lib/server/logger';
import { getErrorMessage } from '@/lib/shared/unknown';

export async function getNotificationPreferences(organizationId: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
}> {
    try {
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) {
            return { success: false, error: 'נדרשת התחברות' };
        }

        const profile = await prisma.profile.findFirst({
            where: {
                clerkUserId,
                organizationId,
            },
            select: { notificationPreferences: true },
        });

        if (!profile) {
            return { success: true, data: {} };
        }

        const prefs = typeof profile.notificationPreferences === 'object' && profile.notificationPreferences !== null
            ? (profile.notificationPreferences as Record<string, unknown>)
            : {};

        return { success: true, data: prefs };
    } catch (error: unknown) {
        logger.error('notification-preferences', 'Error loading preferences:', error);
        return { success: false, error: getErrorMessage(error) || 'שגיאה בטעינת העדפות' };
    }
}

export async function saveNotificationPreferences(
    organizationId: string,
    preferences: Record<string, boolean>
): Promise<{ success: boolean; error?: string }> {
    try {
        const clerkUserId = await getCurrentUserId();
        if (!clerkUserId) {
            return { success: false, error: 'נדרשת התחברות' };
        }

        // Validate input — only allow known preference keys
        const allowedKeys = new Set([
            'marketing_newsletter',
            'marketing_events',
            'marketing_product_updates',
            'marketing_promotions',
            'marketing_reengagement',
            'system_reports',
            'system_alerts',
            'system_maintenance',
            'system_updates',
            'system_admin_alerts',
            'team_updates',
            'org_lifecycle',
            'support_surveys',
            'support_admin_notifications',
            'onboarding_tips',
        ]);

        const sanitized: Record<string, boolean> = {};
        for (const [key, value] of Object.entries(preferences)) {
            if (allowedKeys.has(key) && typeof value === 'boolean') {
                sanitized[key] = value;
            }
        }

        // Find existing profile
        const profile = await prisma.profile.findFirst({
            where: {
                clerkUserId,
                organizationId,
            },
            select: { id: true, notificationPreferences: true },
        });

        if (!profile) {
            return { success: false, error: 'פרופיל לא נמצא' };
        }

        // Merge with existing preferences (keep non-notification keys intact)
        const existing = typeof profile.notificationPreferences === 'object' && profile.notificationPreferences !== null
            ? (profile.notificationPreferences as Record<string, unknown>)
            : {};

        const merged = { ...existing, ...sanitized };

        await prisma.profile.update({
            where: { id: profile.id },
            data: {
                notificationPreferences: merged as Prisma.InputJsonValue,
                updatedAt: new Date(),
            },
        });

        return { success: true };
    } catch (error: unknown) {
        logger.error('notification-preferences', 'Error saving preferences:', error);
        return { success: false, error: getErrorMessage(error) || 'שגיאה בשמירת העדפות' };
    }
}
