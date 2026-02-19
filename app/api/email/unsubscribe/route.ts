/**
 * Email Unsubscribe API
 * GET /api/email/unsubscribe?email=...&pref=...&token=...
 *
 * Verifies HMAC token and updates the user's notification preferences in Profile.
 * Returns a simple Hebrew confirmation page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/email-sender';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const url = request.nextUrl;
    const email = url.searchParams.get('email') || '';
    const pref = url.searchParams.get('pref') || '';
    const token = url.searchParams.get('token') || '';

    if (!email || !pref || !token) {
        return renderPage('פרמטרים חסרים', 'הקישור שגוי או פג תוקף.', false);
    }

    const valid = verifyUnsubscribeToken(email, pref, token);
    if (!valid) {
        return renderPage('קישור לא תקין', 'הקישור שגוי או פג תוקף. נסה שוב מתוך המייל.', false);
    }

    try {
        // Find all profiles with this email and update their notification preferences
        const profiles = await prisma.profile.findMany({
            where: { email },
            select: { id: true, notificationPreferences: true },
        });

        if (profiles.length === 0) {
            // Try by OrganizationUser email
            const orgUsers = await prisma.organizationUser.findMany({
                where: { email },
                select: { clerk_user_id: true },
            });

            if (orgUsers.length > 0) {
                const clerkIds = orgUsers.map((u) => u.clerk_user_id);
                const profilesByClerk = await prisma.profile.findMany({
                    where: { clerkUserId: { in: clerkIds } },
                    select: { id: true, notificationPreferences: true },
                });

                for (const profile of profilesByClerk) {
                    await updatePreference(profile.id, profile.notificationPreferences, pref);
                }

                if (profilesByClerk.length > 0) {
                    return renderPage('בוצע בהצלחה', `בוטלה ההרשמה מ: ${prefLabel(pref)}. אפשר לחזור בכל עת מהגדרות הפרופיל.`, true);
                }
            }

            return renderPage('לא נמצא משתמש', 'לא מצאנו את הכתובת הזו במערכת.', false);
        }

        for (const profile of profiles) {
            await updatePreference(profile.id, profile.notificationPreferences, pref);
        }

        return renderPage('בוצע בהצלחה', `בוטלה ההרשמה מ: ${prefLabel(pref)}. אפשר לחזור בכל עת מהגדרות הפרופיל.`, true);
    } catch (error: unknown) {
        console.error('[Unsubscribe] Error:', error instanceof Error ? error.message : error);
        return renderPage('שגיאה', 'אירעה שגיאה. נסה שוב מאוחר יותר.', false);
    }
}

async function updatePreference(profileId: string, currentPrefs: unknown, prefKey: string) {
    const prefs = (typeof currentPrefs === 'object' && currentPrefs !== null ? currentPrefs : {}) as Record<string, unknown>;
    const updated = { ...prefs, [prefKey]: false };

    await prisma.profile.update({
        where: { id: profileId },
        data: {
            notificationPreferences: updated as Prisma.InputJsonValue,
            updatedAt: new Date(),
        },
    });
}

function prefLabel(pref: string): string {
    const labels: Record<string, string> = {
        marketing_newsletter: 'ניוזלטר',
        marketing_events: 'אירועים ווובינרים',
        marketing_product_updates: 'עדכוני מוצר',
        marketing_promotions: 'מבצעים והצעות',
        marketing_reengagement: 'תזכורות חזרה',
        system_reports: 'דוחות תקופתיים',
        system_alerts: 'התראות מערכת',
        system_maintenance: 'תחזוקה מתוכננת',
        system_updates: 'עדכוני גרסה',
        onboarding_tips: 'טיפים והדרכות',
        team_updates: 'עדכוני צוות',
        org_lifecycle: 'עדכוני ארגון',
        support_surveys: 'סקרי שביעות רצון',
        support_admin_notifications: 'התראות תמיכה לאדמין',
    };
    return labels[pref] || pref;
}

function renderPage(title: string, message: string, success: boolean): NextResponse {
    const color = success ? '#10b981' : '#ef4444';
    const icon = success ? '✓' : '✕';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — MISRAD AI</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; direction: rtl; }
        .card { max-width: 480px; margin: 60px auto; background: white; border-radius: 20px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
        .icon { width: 64px; height: 64px; border-radius: 50%; background: ${color}15; color: ${color}; font-size: 32px; line-height: 64px; margin: 0 auto 24px; font-weight: 900; }
        h1 { font-size: 22px; color: #0f172a; margin: 0 0 12px; font-weight: 900; }
        p { font-size: 15px; color: #64748b; line-height: 1.7; margin: 0; }
        .logo { font-size: 13px; color: #94a3b8; margin-top: 32px; letter-spacing: 2px; font-weight: 800; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="logo">MISRAD AI</div>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
