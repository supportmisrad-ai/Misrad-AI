import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getClientIpFromRequest, rateLimit } from '@/lib/server/rateLimit';
import { asObject } from '@/lib/server/workspace-access/utils';
import { sendNewLeadNotificationEmail } from '@/lib/email';

const IS_PROD = process.env.NODE_ENV === 'production';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true; // phone is optional
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned.length >= 9 && cleaned.length <= 15;
}

/**
 * POST /api/lead-capture
 *
 * Public endpoint for the shareable lead capture form.
 * No API key required — rate-limited by IP + honeypot protection.
 *
 * Body (JSON):
 *   - orgSlug: string (required)
 *   - name: string (required)
 *   - phone: string (required)
 *   - email: string (optional)
 *   - company: string (optional)
 *   - message: string (optional)
 *   - source: string (optional, defaults to 'lead-form')
 *   - _hp: string (honeypot — must be empty)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 submissions per minute per IP
    const ip = getClientIpFromRequest(req);
    const rl = await rateLimit({
      namespace: 'lead_capture',
      key: `${ip}:lead_capture`,
      limit: 10,
      windowMs: 60 * 1000,
      mode: 'fail_closed',
      unavailableRetryAfterSeconds: 5,
    });

    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
        { status: 429 }
      );
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const body = asObject(rawBody) ?? {};

    // Honeypot check — bots fill hidden fields
    const honeypot = String(body._hp ?? '').trim();
    if (honeypot) {
      // Silently accept but don't create lead (bot detected)
      return NextResponse.json({ ok: true, message: 'תודה! פנייתך התקבלה.' }, { status: 200 });
    }

    const orgSlug = String(body.orgSlug ?? '').trim();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const email = String(body.email ?? '').trim();
    const company = String(body.company ?? '').trim() || null;
    const message = String(body.message ?? '').trim() || null;

    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: 'חסר מזהה ארגון' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ ok: false, error: 'שם הוא שדה חובה' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ ok: false, error: 'טלפון הוא שדה חובה' }, { status: 400 });
    }

    if (!validatePhone(phone)) {
      return NextResponse.json({ ok: false, error: 'מספר טלפון לא תקין' }, { status: 400 });
    }

    if (email && !validateEmail(email)) {
      return NextResponse.json({ ok: false, error: 'כתובת אימייל לא תקינה' }, { status: 400 });
    }

    // Resolve organization
    const orgConditions: Record<string, string>[] = [{ slug: orgSlug }];
    if (UUID_RE.test(orgSlug)) orgConditions.push({ id: orgSlug });

    const org = await prisma.organization.findFirst({
      where: {
        OR: orgConditions,
        subscription_status: { not: 'expired' },
      },
      select: { id: true, name: true, slug: true, owner: { select: { id: true, email: true } } },
    });

    if (!org) {
      return NextResponse.json({ ok: false, error: 'הטופס אינו זמין כרגע' }, { status: 404 });
    }

    // Check for duplicate by phone within this org
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    const existingLead = await prisma.systemLead.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { phone },
          ...(normalizedPhone !== phone ? [{ phone: normalizedPhone }] : []),
        ],
      },
      select: { id: true },
    });

    if (existingLead) {
      // Update last contact instead of creating duplicate
      await prisma.systemLead.updateMany({
        where: { id: existingLead.id, organizationId: org.id },
        data: { lastContact: new Date() },
      });

      if (message) {
        await prisma.systemLeadActivity.create({
          data: {
            organizationId: org.id,
            leadId: existingLead.id,
            type: 'note',
            content: `הודעה מטופס ליד: ${message}`,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        message: 'תודה! פנייתך התקבלה.',
      });
    }

    // Create new lead
    return await withTenantIsolationContext(
      { source: 'api_lead_capture', organizationId: org.id, reason: 'public_lead_form' },
      async () => {
        const lead = await prisma.systemLead.create({
          data: {
            organizationId: org.id,
            name,
            phone,
            email: email || '',
            company,
            source: 'lead-form',
            status: 'incoming',
            score: 50,
            lastContact: new Date(),
            isHot: false,
          },
          select: { id: true },
        });

        if (message) {
          await prisma.systemLeadActivity.create({
            data: {
              organizationId: org.id,
              leadId: lead.id,
              type: 'note',
              content: `הודעה מטופס ליד: ${message}`,
            },
          });
        }

        // ── Bell notification + Email (fire-and-forget) ──
        const ownerEmail = org.owner?.email;
        const ownerId = org.owner?.id;

        // Find NexusUser ID for the notification recipient
        let recipientId: string | null = null;
        if (ownerEmail) {
          const nexusUser = await prisma.nexusUser.findFirst({
            where: { organizationId: org.id, email: ownerEmail },
            select: { id: true },
          });
          recipientId = nexusUser?.id ?? ownerId ?? null;
        }

        // Insert in-app notification (bell)
        if (recipientId) {
          prisma.misradNotification.create({
            data: {
              organization_id: org.id,
              recipient_id: recipientId,
              type: 'ALERT',
              title: `ליד חדש: ${name}`,
              message: `${name} השאיר/ה פרטים בטופס הציבורי${company ? ` (${company})` : ''}. טלפון: ${phone}`,
              timestamp: new Date().toISOString(),
              timestampAt: new Date(),
              isRead: false,
              link: `/w/${org.slug || orgSlug}/system?leadId=${lead.id}`,
            },
          }).catch((err: unknown) => {
            if (!IS_PROD) console.error('[Lead Capture] Failed to create notification:', err);
          });
        }

        // Send email to org owner
        if (ownerEmail) {
          sendNewLeadNotificationEmail({
            toEmail: ownerEmail,
            leadName: name,
            leadPhone: phone,
            leadEmail: email || undefined,
            leadCompany: company || undefined,
            leadMessage: message || undefined,
            orgName: org.name || '',
            orgSlug: org.slug || orgSlug,
          }).catch((err: unknown) => {
            if (!IS_PROD) console.error('[Lead Capture] Failed to send email:', err);
          });
        }

        return NextResponse.json({
          ok: true,
          message: 'תודה! פנייתך התקבלה. ניצור איתך קשר בהקדם.',
        }, { status: 201 });
      }
    );
  } catch (error: unknown) {
    if (IS_PROD) console.error('[Lead Capture] Error');
    else console.error('[Lead Capture] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'שגיאה בשליחת הטופס. נסה שוב.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
