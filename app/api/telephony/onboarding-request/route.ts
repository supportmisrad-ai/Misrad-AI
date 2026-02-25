import { NextRequest, NextResponse } from 'next/server';
import { generateBaseEmailTemplate, EmailTemplateComponents } from '@/lib/email-templates';
import { resend, isResendConfigured } from '@/lib/resend';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

const IS_PROD = process.env.NODE_ENV === 'production';

// ── Rate limiter (in-memory, per IP) ─────────────────────────────────
const RL_MAP = new Map<string, { count: number; resetAt: number }>();
const RL_MAX = 3; // max 3 requests per window per IP
const RL_WINDOW_MS = 5 * 60_000; // 5 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = RL_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RL_MAP.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    if (RL_MAP.size > 5000) {
      for (const [k, v] of RL_MAP) { if (now > v.resetAt) RL_MAP.delete(k); }
    }
    return false;
  }
  entry.count++;
  return entry.count > RL_MAX;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '127.0.0.1';
}

// ── HTML escape for email template interpolation ─────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveRecipientEmail(originalTo: string): string {
    const override = process.env.RESEND_TEST_TO;
    if (!override) return originalTo;
    return String(override).trim() || originalTo;
}

// ─── Email Templates ────────────────────────────────────────────────

function generateClientConfirmationEmail(params: {
    contactName: string;
    businessName: string;
    selectedPackage: string;
    billingCycle: string;
    packagePrice: string;
}): string {
    const safeName = escapeHtml(params.contactName);
    const safeBiz = escapeHtml(params.businessName);
    const safePkg = escapeHtml(params.selectedPackage);
    const safePrice = escapeHtml(params.packagePrice);
    const bodyContent = `
        <div style="font-size:24px;font-weight:900;color:#0f172a;margin-bottom:24px;">${safeName},</div>
        
        <div style="font-size:17px;line-height:1.8;color:#334155;margin-bottom:24px;">
            הבקשה שלך להפעלת מרכזיית ענן עבור <strong>${safeBiz}</strong> התקבלה בהצלחה!
        </div>

        <div style="margin:24px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">פרטי הבקשה</div>
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;font-weight:600;">חבילה:</td>
                    <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:900;text-align:left;">${safePkg}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;font-weight:600;">מחיר:</td>
                    <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:900;text-align:left;">${safePrice}</td>
                </tr>
                <tr>
                    <td style="padding:6px 0;font-size:14px;color:#64748b;font-weight:600;">תקופת חיוב:</td>
                    <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:900;text-align:left;">${params.billingCycle === 'annual' ? 'שנתי (הנחה 20%)' : 'חודשי'}</td>
                </tr>
            </table>
        </div>

        <div style="margin:24px 0;background:#ecfdf5;border:2px solid #a7f3d0;border-radius:14px;padding:22px 24px;">
            <div style="font-size:15px;font-weight:900;color:#065f46;margin-bottom:8px;">מה הלאה?</div>
            <ol style="margin:0;padding:0 20px 0 0;color:#065f46;font-size:14px;line-height:2;">
                <li>נבדוק את הבקשה ונאשר אותה (עד יום עסקים)</li>
                <li>נשלח לכם הצעת מחיר סופית + הסכם שירות</li>
                <li>לאחר חתימה — נפעיל את המרכזייה תוך 1-3 ימים</li>
                <li>נוודא שהכל עובד מושלם ונדריך את הצוות</li>
            </ol>
        </div>

        <div style="margin-top:28px;font-size:13px;color:#64748b;line-height:1.8;text-align:center;">
            שאלות? אנחנו כאן בשבילכם:<br />
            <a href="mailto:support@misrad-ai.com" style="color:#6366f1;font-weight:700;">support@misrad-ai.com</a>
            <span style="margin:0 8px;color:#cbd5e1;">·</span>
            <a href="https://wa.me/972512239522" style="color:#6366f1;font-weight:700;">WhatsApp</a>
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'MISRAD AI',
        headerSubtitle: 'בקשה להפעלת מרכזייה',
        headerGradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

function generateAdminNotificationEmail(params: {
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    businessName: string;
    businessId: string;
    selectedPackage: string;
    billingCycle: string;
    employeeCount: string;
    currentProvider: string;
    portNumbers: boolean;
    portNumbersList: string;
    notes: string;
}): string {
    const s = (v: string) => escapeHtml(v);
    const bodyContent = `
        <div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:20px;">בקשה חדשה להפעלת מרכזייה 📞</div>
        
        <div style="margin:20px 0;background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:22px 24px;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">פרטי הלקוח</div>
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:5px 0;font-size:13px;color:#64748b;width:120px;">שם איש קשר:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.contactName)}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">אימייל:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.contactEmail)}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">טלפון:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.contactPhone)}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">שם העסק:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.businessName)}</td></tr>
                ${params.businessId ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b;">ח.פ./ע.מ.:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.businessId)}</td></tr>` : ''}
                <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">מספר עובדים:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.employeeCount) || 'לא צוין'}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">ספק נוכחי:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.currentProvider) || 'לא צוין'}</td></tr>
            </table>
        </div>

        <div style="margin:20px 0;background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;padding:22px 24px;">
            <div style="font-size:12px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">פרטי החבילה</div>
            <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                <tr><td style="padding:5px 0;font-size:13px;color:#1e40af;width:120px;">חבילה:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.selectedPackage)}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#1e40af;">תקופת חיוב:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${params.billingCycle === 'annual' ? 'שנתי' : 'חודשי'}</td></tr>
                <tr><td style="padding:5px 0;font-size:13px;color:#1e40af;">ניוד מספרים:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${params.portNumbers ? 'כן' : 'לא'}</td></tr>
                ${params.portNumbers && params.portNumbersList ? `<tr><td style="padding:5px 0;font-size:13px;color:#1e40af;">מספרים לניוד:</td><td style="padding:5px 0;font-size:13px;color:#0f172a;font-weight:700;">${s(params.portNumbersList)}</td></tr>` : ''}
            </table>
        </div>

        ${params.notes ? `
        <div style="margin:20px 0;background:#fff7ed;border:2px solid #fed7aa;border-radius:14px;padding:22px 24px;">
            <div style="font-size:12px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">הערות הלקוח</div>
            <div style="font-size:14px;color:#78350f;line-height:1.6;">${s(params.notes)}</div>
        </div>
        ` : ''}

        <div style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center;">
            בקשה זו הוגשה דרך MISRAD AI — דף מידע לקוחות מרכזיית ענן
        </div>
    `;

    return generateBaseEmailTemplate({
        headerTitle: 'בקשה חדשה — מרכזיית ענן',
        headerSubtitle: `${s(params.businessName)} · ${s(params.contactName)}`,
        headerGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        bodyContent,
        showSocialLinks: false,
    });
}

// ─── Package Label Mapping ──────────────────────────────────────────

const PACKAGE_LABELS: Record<string, string> = {
    basic: 'בסיסי (1-5 שלוחות)',
    business: 'עסקי (5-20 שלוחות)',
    enterprise: 'ארגוני (20+ שלוחות)',
};

const PACKAGE_PRICES: Record<string, { monthly: number; annual: number }> = {
    basic: { monthly: 99, annual: 79 },
    business: { monthly: 249, annual: 199 },
    enterprise: { monthly: 0, annual: 0 },
};

// ─── POST Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // Rate limit — prevent email spam abuse
        const ip = getClientIp(request);
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'יותר מדי בקשות. נסה שוב בעוד מספר דקות.' },
                { status: 429 }
            );
        }

        const bodyJson: unknown = await request.json().catch(() => ({}));
        const body = asObject(bodyJson) ?? {};

        // Extract fields
        const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
        const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
        const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : '';
        const contactPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';
        const contactEmail = typeof body.contactEmail === 'string' ? body.contactEmail.trim() : '';
        const employeeCount = typeof body.employeeCount === 'string' ? body.employeeCount.trim() : '';
        const currentProvider = typeof body.currentProvider === 'string' ? body.currentProvider.trim() : '';
        const selectedPackage = typeof body.selectedPackage === 'string' ? body.selectedPackage.trim() : 'business';
        const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly';
        const portNumbers = Boolean(body.portNumbers);
        const portNumbersList = typeof body.portNumbersList === 'string' ? body.portNumbersList.trim() : '';
        const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

        // Validate required fields
        if (!businessName || !contactName || !contactPhone || !contactEmail) {
            return NextResponse.json(
                { error: 'נא למלא את כל השדות הנדרשים: שם עסק, איש קשר, טלפון ואימייל' },
                { status: 400 }
            );
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            return NextResponse.json(
                { error: 'כתובת אימייל לא תקינה' },
                { status: 400 }
            );
        }

        const packageLabel = PACKAGE_LABELS[selectedPackage] || selectedPackage;
        const prices = PACKAGE_PRICES[selectedPackage];
        const price = prices
            ? prices[billingCycle === 'annual' ? 'annual' : 'monthly']
            : 0;
        const packagePrice = price > 0 ? `₪${price}/חודש` : 'מותאם אישית';

        // ─── Send Emails ────────────────────────────────────────────
        const emailResults: { client: boolean; admin: boolean; errors: string[] } = {
            client: false,
            admin: false,
            errors: [],
        };

        if (isResendConfigured() && resend) {
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

            // 1. Send client confirmation email
            try {
                const clientHtml = generateClientConfirmationEmail({
                    contactName,
                    businessName,
                    selectedPackage: packageLabel,
                    billingCycle,
                    packagePrice,
                });

                const clientTo = resolveRecipientEmail(contactEmail);

                const { error: clientError } = await resend.emails.send({
                    from: fromEmail,
                    to: clientTo,
                    subject: `אישור בקשה — מרכזיית ענן עבור ${businessName}`,
                    html: clientHtml,
                });

                if (clientError) {
                    emailResults.errors.push(`Client email: ${getErrorMessage(clientError)}`);
                } else {
                    emailResults.client = true;
                }
            } catch (err: unknown) {
                emailResults.errors.push(`Client email: ${getErrorMessage(err)}`);
            }

            // 2. Send admin notification email
            try {
                const adminEmail = process.env.MISRAD_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'admin@misrad-ai.com';
                const adminTo = resolveRecipientEmail(adminEmail);

                const adminHtml = generateAdminNotificationEmail({
                    contactName,
                    contactEmail,
                    contactPhone,
                    businessName,
                    businessId,
                    selectedPackage: packageLabel,
                    billingCycle,
                    employeeCount,
                    currentProvider,
                    portNumbers,
                    portNumbersList,
                    notes,
                });

                const { error: adminError } = await resend.emails.send({
                    from: fromEmail,
                    to: adminTo,
                    subject: `🔔 בקשה חדשה למרכזייה — ${businessName} (${contactName})`,
                    html: adminHtml,
                });

                if (adminError) {
                    emailResults.errors.push(`Admin email: ${getErrorMessage(adminError)}`);
                } else {
                    emailResults.admin = true;
                }
            } catch (err: unknown) {
                emailResults.errors.push(`Admin email: ${getErrorMessage(err)}`);
            }
        } else {
            emailResults.errors.push('Email service not configured (RESEND_API_KEY missing)');
        }

        if (emailResults.errors.length > 0 && !IS_PROD) {
            console.warn('[Telephony Onboarding] Email warnings:', emailResults.errors);
        }

        return NextResponse.json({
            success: true,
            message: 'הבקשה נשלחה בהצלחה',
            emailsSent: {
                client: emailResults.client,
                admin: emailResults.admin,
            },
        });
    } catch (error: unknown) {
        if (IS_PROD) {
            console.error('[Telephony Onboarding] Error processing request');
        } else {
            console.error('[Telephony Onboarding] Error:', error);
        }

        return NextResponse.json(
            { error: getErrorMessage(error) || 'שגיאה בעיבוד הבקשה' },
            { status: 500 }
        );
    }
}
