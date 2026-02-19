import { NextRequest, NextResponse } from 'next/server';
import { sendContactFormReceivedEmail, sendContactFormAdminNotification } from '@/lib/email';

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = RATE_LIMIT_MAP.get(ip);
    if (!entry || now > entry.resetAt) {
        RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || '127.0.0.1';
}

function sanitize(value: string): string {
    return value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .trim();
}

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
                { status: 429 }
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
