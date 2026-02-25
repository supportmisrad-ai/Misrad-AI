import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormReceivedEmail, sendContactFormAdminNotification } from '@/lib/email';
import { getClientIpFromRequest, rateLimit, buildRateLimitHeaders } from '@/lib/server/rateLimit';

function sanitize(value: string): string {
    return value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .trim();
}

export async function POST(req: NextRequest) {
    try {
        // Rate limit (Upstash Redis — works across serverless instances)
        const ip = getClientIpFromRequest(req);
        const rl = await rateLimit({
            namespace: 'contact.form',
            key: ip,
            limit: 3,
            windowMs: 60_000,
            mode: 'fail_closed',
        });
        if (!rl.ok) {
            return NextResponse.json(
                { error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
                {
                    status: 429,
                    headers: buildRateLimitHeaders({
                        limit: 3,
                        remaining: 0,
                        resetAt: rl.resetAt,
                        retryAfterSeconds: rl.retryAfterSeconds,
                    }),
                },
            );
        }

        const body = await req.json();
        const name = typeof body.name === 'string' ? sanitize(body.name) : '';
        const email = typeof body.email === 'string' ? sanitize(body.email) : '';
        const message = typeof body.message === 'string' ? sanitize(body.message) : '';

        if (!name || name.length < 2 || name.length > 100) {
            return NextResponse.json({ error: 'שם לא תקין' }, { status: 400 });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'אימייל לא תקין' }, { status: 400 });
        }
        if (!message || message.length < 5 || message.length > 2000) {
            return NextResponse.json({ error: 'הודעה חייבת להכיל בין 5 ל-2000 תווים' }, { status: 400 });
        }

        const [userEmail, adminEmail] = await Promise.allSettled([
            sendContactFormReceivedEmail({ toEmail: email, name, message }),
            sendContactFormAdminNotification({ name, email, message }),
        ]);

        const userSuccess = userEmail.status === 'fulfilled' && userEmail.value.success;
        const adminSuccess = adminEmail.status === 'fulfilled' && adminEmail.value.success;

        if (!userSuccess && !adminSuccess) {
            console.error('[Contact] Both emails failed');
        }

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        console.error('[Contact] Unexpected error:', error);
        return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
    }
}
