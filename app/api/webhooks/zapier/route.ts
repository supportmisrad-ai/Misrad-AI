import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateOrganizationUserByClerkUserId } from '@/lib/services/social-users';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { withWebhookTenantContext } from '@/lib/api-webhook-guard';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
const IS_PROD = process.env.NODE_ENV === 'production';

function isUuidLike(value: string | null | undefined): boolean {
  const v = String(value || '').trim();
  if (!v) return false;
  const normalized = v.toLowerCase().startsWith('urn:uuid:') ? v.slice('urn:uuid:'.length) : v;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
}

/**
 * POST /api/webhooks/zapier
 * Receives webhook from Zapier
 */
async function POSTHandler(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body: unknown = rawBody ? JSON.parse(rawBody) : {};
    const bodyObj = asObject(body) ?? {};
    const signature = request.headers.get('x-zapier-signature');
    const webhookId = request.headers.get('x-zapier-webhook-id');

    // Zero-trust: require valid signature in production
    const secret = process.env.ZAPIER_WEBHOOK_SECRET;
    if (IS_PROD) {
      if (!secret) {
        console.error('Webhook secret is not configured');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }
      if (!signature) {
        return NextResponse.json({ error: 'Missing x-zapier-signature' }, { status: 401 });
      }
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // Get user from webhook ID or body
    const userId = bodyObj.user_id ?? webhookId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    const resolvedUserId = String(userId || '').trim();
    let socialUserId: string | null = isUuidLike(resolvedUserId) ? resolvedUserId : null;
    if (!socialUserId) {
      const userResult = await getOrCreateOrganizationUserByClerkUserId(resolvedUserId);
      if (!userResult.success || !userResult.userId) {
        return NextResponse.json(
          { error: userResult.error || 'User not found' },
          { status: 404 }
        );
      }
      socialUserId = userResult.userId;
    }

    const webhookOwner = await prisma.organizationUser.findFirst({
      where: { id: socialUserId },
      select: { organization_id: true },
    });
    const ownerOrganizationId = webhookOwner?.organization_id ? String(webhookOwner.organization_id) : null;
    if (!ownerOrganizationId) {
      return NextResponse.json({ error: 'Webhook user is not linked to an organization' }, { status: 403 });
    }

    return await withWebhookTenantContext(
      { source: 'webhook_zapier', organizationId: ownerOrganizationId },
      async () => {

        // Get webhook config
        const webhookConfig = await prisma.social_webhook_configs.findFirst({
          where: {
            user_id: socialUserId,
            integration_name: 'zapier',
            is_active: true,
          },
          select: { id: true },
        });

        if (!webhookConfig) {
          return NextResponse.json({ error: 'Webhook not configured' }, { status: 404 });
        }

        // Update last triggered
        await prisma.social_webhook_configs.updateMany({
          where: { id: webhookConfig.id },
          data: { last_triggered_at: new Date(), updated_at: new Date() },
        });

        // Process webhook based on event type
        const eventType = typeof bodyObj.event_type === 'string' ? String(bodyObj.event_type) : 'unknown';

    const normalizeSource = (src: string) => {
      const s = String(src || '').trim().toLowerCase();
      if (!s) return 'Social';
      if (s.includes('facebook') || s === 'fb' || s.includes('meta')) return 'Facebook';
      if (s.includes('instagram') || s === 'ig') return 'Instagram';
      if (s.includes('whatsapp') || s === 'wa') return 'WhatsApp';
      return String(src || '').trim();
    };

    const normalizePhoneDigits = (phone: string) => {
      const p = String(phone || '').trim();
      const digits = p.replace(/[^0-9]/g, '');
      return digits;
    };

    const resolveOrgId = async (orgKey: string) => {
      const key = String(orgKey || '').trim();
      if (!key) return null;
      const row = await prisma.organization.findFirst({
        where: isUuidLike(key) ? { OR: [{ id: key }, { slug: key }] } : { slug: key },
        select: { id: true },
      });
      return row?.id ? String(row.id) : null;
    };

    const isLeadEvent = (t: string) => {
      const tt = String(t || '').toLowerCase();
      return tt === 'social.lead.created' || tt === 'social.lead.upsert' || tt === 'lead.created' || tt === 'lead';
    };

    if (isLeadEvent(eventType)) {
      const payloadObj = asObject(bodyObj.payload) ?? bodyObj;
      const orgSlug = String(
        payloadObj.orgSlug ??
          payloadObj.org_slug ??
          payloadObj.organization ??
          payloadObj.organization_id ??
          ''
      ).trim();

      if (orgSlug) {
        const payloadOrganizationId = await resolveOrgId(orgSlug);
        if (!payloadOrganizationId) {
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        if (String(payloadOrganizationId) !== String(ownerOrganizationId)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const organizationId = ownerOrganizationId;

      const name = String(payloadObj.name ?? payloadObj.full_name ?? payloadObj.fullName ?? '').trim();
      const emailRaw = String(payloadObj.email ?? payloadObj.email_address ?? '').trim();
      const phone = String(payloadObj.phone ?? payloadObj.phone_number ?? payloadObj.mobile ?? '').trim();
      const phoneDigits = normalizePhoneDigits(phone);
      const source = normalizeSource(String(payloadObj.source ?? payloadObj.platform ?? payloadObj.channel ?? ''));

      if (!name || !phone) {
        return NextResponse.json({ error: 'Missing lead name/phone' }, { status: 400 });
      }

      const email = emailRaw || '';
      const now = new Date();

      const or: Prisma.SystemLeadWhereInput[] = [];
      if (phone) or.push({ phone });
      if (phoneDigits && phoneDigits !== phone) or.push({ phone: phoneDigits });
      if (email) or.push({ email });

      const existing = await prisma.systemLead.findFirst({
        where: {
          organizationId,
          ...(or.length ? { OR: or } : {}),
        },
        select: { id: true, status: true },
      });

      if (existing?.id) {
        const updated = await prisma.systemLead.updateMany({
          where: { id: existing.id, organizationId },
          data: {
            name,
            phone,
            email,
            source: source || undefined,
            lastContact: now,
          },
        });

        if (!updated.count) {
          return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, leadId: existing.id, created: false }, { status: 200 });
      }

      const created = await prisma.systemLead.create({
        data: {
          organizationId,
          name,
          phone,
          email,
          source: source || 'Social',
          status: 'incoming',
          lastContact: now,
        },
        select: { id: true },
      });

      return NextResponse.json({ success: true, leadId: created.id, created: true }, { status: 200 });
    }

        // Log the webhook
        // Return success
        return NextResponse.json({
          success: true,
          message: 'Webhook received',
          event_type: eventType,
        });
      }
    );
  } catch (error: unknown) {
    if (!IS_PROD) console.error('Zapier webhook error:', error);
    else console.error('Zapier webhook error');
    return NextResponse.json(
      { error: IS_PROD ? 'Internal server error' : (getErrorMessage(error) || 'Internal server error') },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/zapier
 * Webhook verification (Zapier ping)
 */
async function GETHandler(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Zapier webhook endpoint is active',
  });
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
