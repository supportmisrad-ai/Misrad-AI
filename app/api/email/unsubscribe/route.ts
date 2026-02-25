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

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    return labels[pref] || escapeHtml(pref);
}

function renderPage(rawTitle: string, rawMessage: string, success: boolean): NextResponse {
    const title = escapeHtml(rawTitle);
    const message = escapeHtml(rawMessage);
    const founderPhotoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://misrad-ai.com'}/icons/founder-avatar.png`;
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://misrad-ai.com'}/icons/misrad-icon-192.png`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — MISRAD AI</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); min-height: 100vh; padding: 40px 20px; direction: rtl; }
        .container { max-width: 520px; margin: 0 auto; }
        .logo-bar { text-align: center; margin-bottom: 32px; }
        .logo-bar img { width: 44px; height: 44px; border-radius: 12px; }
        .logo-bar span { display: block; font-size: 12px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; margin-top: 8px; }
        .card { background: white; border-radius: 24px; padding: 0; box-shadow: 0 8px 40px rgba(15,23,42,0.08); overflow: hidden; }
        .card-top { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
        .card-top h1 { font-size: 22px; color: white; font-weight: 900; margin-bottom: 4px; }
        .card-top p { font-size: 14px; color: rgba(255,255,255,0.8); }
        .founder-section { padding: 36px 40px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .founder-photo { width: 88px; height: 88px; border-radius: 50%; border: 3px solid #6366f1; box-shadow: 0 4px 16px rgba(99,102,241,0.2); margin-bottom: 20px; }
        .founder-msg { font-size: 15px; color: #334155; line-height: 1.9; text-align: center; max-width: 400px; margin: 0 auto 20px; }
        .founder-sig { font-family: 'Segoe Script', 'Dancing Script', cursive; font-size: 24px; color: #6366f1; margin-bottom: 4px; }
        .founder-name { font-size: 14px; font-weight: 800; color: #0f172a; }
        .founder-title { font-size: 12px; color: #64748b; }
        .result-section { padding: 32px 40px; text-align: center; }
        .result-icon { width: 56px; height: 56px; border-radius: 50%; font-size: 24px; line-height: 56px; margin: 0 auto 16px; font-weight: 900; }
        .result-icon.success { background: #ecfdf5; color: #10b981; }
        .result-icon.error { background: #fef2f2; color: #ef4444; }
        .result-title { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
        .result-msg { font-size: 14px; color: #64748b; line-height: 1.7; }
        ${success ? `
        .feedback-section { padding: 0 40px 36px; }
        .feedback-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 16px; text-align: center; }
        .feedback-reasons { list-style: none; padding: 0; }
        .feedback-reasons li { padding: 12px 16px; margin-bottom: 8px; background: #f8fafc; border-radius: 12px; border: 1.5px solid #e2e8f0; font-size: 13px; color: #334155; cursor: default; display: flex; align-items: center; gap: 10px; transition: all 0.15s; }
        .feedback-reasons li:hover { border-color: #6366f1; background: #eef2ff; }
        .feedback-reasons li .dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1; flex-shrink: 0; }
        .feedback-reasons li:hover .dot { border-color: #6366f1; background: #6366f1; box-shadow: inset 0 0 0 3px white; }
        ` : ''}
        .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; line-height: 1.6; }
        .footer a { color: #6366f1; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-bar">
            <img src="${logoUrl}" alt="MISRAD AI" />
            <span>MISRAD AI</span>
        </div>

        <div class="card">
            <div class="card-top">
                <h1>${success ? 'חבל לנו לראות אותך עוזב...' : title}</h1>
                <p>${success ? 'אבל אנחנו מכבדים את הבחירה שלך' : ''}</p>
            </div>

            ${success ? `
            <div class="founder-section">
                <img src="${founderPhotoUrl}" alt="איציק דהן" class="founder-photo" onerror="this.style.display='none'" />
                <div class="founder-msg">
                    לקוח/ה יקר/ה,
                    <br /><br />
                    כמייסד MISRAD AI, אני רוצה להגיד לך תודה.
                    <br />
                    תודה שנתת לנו את ההזדמנות להיות חלק מהמסע שלך.
                    אנחנו משקיעים המון אנרגיה כדי לבנות את הכלי הטוב ביותר עבורך,
                    ואם יש משהו שיכולנו לעשות טוב יותר — אני באמת רוצה לשמוע.
                    <br /><br />
                    הדלת תמיד פתוחה.
                </div>
                <div class="founder-sig">איציק</div>
                <div class="founder-name">איציק דהן</div>
                <div class="founder-title">מייסד ומנכ"ל, MISRAD AI</div>
            </div>
            ` : ''}

            <div class="result-section">
                <div class="result-icon ${success ? 'success' : 'error'}">${success ? '✓' : '✕'}</div>
                <div class="result-title">${title}</div>
                <div class="result-msg">${message}</div>
            </div>

            ${success ? `
            <div class="feedback-section">
                <div class="feedback-title">מאיזו סיבה?</div>
                <ul class="feedback-reasons">
                    <li><span class="dot"></span> לא ביקשתי לקבל את ההודעות האלה</li>
                    <li><span class="dot"></span> אין לי צורך לקבל מבצעים והטבות</li>
                    <li><span class="dot"></span> אתם שולחים לי יותר מדי הודעות</li>
                    <li><span class="dot"></span> התוכן שנשלח לא רלוונטי אליי</li>
                </ul>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <a href="https://misrad-ai.com">misrad-ai.com</a>
            <span style="margin: 0 6px;">·</span>
            <a href="mailto:support@misrad-ai.com">support@misrad-ai.com</a>
            <br />
            &copy; ${new Date().getFullYear()} MISRAD AI — כל הזכויות שמורות
        </div>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
