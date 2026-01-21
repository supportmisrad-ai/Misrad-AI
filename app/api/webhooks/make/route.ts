import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getOrCreateSupabaseUserAction } from '@/app/actions/users';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

/**
 * POST /api/webhooks/make
 * Receives webhook from Make.com
 */
async function POSTHandler(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const signature = request.headers.get('x-make-signature');
    const webhookId = request.headers.get('x-make-webhook-id');

    // Zero-trust: require valid signature in production
    const secret = process.env.MAKE_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === 'production') {
      if (!secret) {
        console.error('Missing MAKE_WEBHOOK_SECRET env var');
        return NextResponse.json({ error: 'Server misconfigured (missing MAKE_WEBHOOK_SECRET)' }, { status: 500 });
      }
      if (!signature) {
        return NextResponse.json({ error: 'Missing x-make-signature' }, { status: 401 });
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
    const userId = body.user_id || webhookId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      );
    }

    // Get Supabase user - use Server Action
    const userResult = await getOrCreateSupabaseUserAction(userId);
    if (!userResult.success || !userResult.userId) {
      return NextResponse.json(
        { error: userResult.error || 'User not found' },
        { status: 404 }
      );
    }
    const supabaseUserId = userResult.userId;
    const supabase = createClient();

    // Get webhook config
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('integration_name', 'make')
      .eq('is_active', true)
      .single();

    if (!webhookConfig) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 404 }
      );
    }

    // Update last triggered
    await supabase
      .from('webhook_configs')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhookConfig.id);

    // Process webhook based on event type
    const eventType = body.event_type || 'unknown';

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
      const row = await prisma.social_organizations.findFirst({
        where: {
          OR: [{ id: key }, { slug: key }],
        },
        select: { id: true },
      });
      return row?.id ? String(row.id) : null;
    };

    const isLeadEvent = (t: string) => {
      const tt = String(t || '').toLowerCase();
      return tt === 'social.lead.created' || tt === 'social.lead.upsert' || tt === 'lead.created' || tt === 'lead';
    };

    if (isLeadEvent(eventType)) {
      const payload = (body?.payload && typeof body.payload === 'object' ? body.payload : body) as any;
      const orgSlug = String(payload.orgSlug || payload.org_slug || payload.organization || payload.organization_id || '').trim();

      if (!orgSlug) {
        return NextResponse.json({ error: 'Missing orgSlug' }, { status: 400 });
      }

      const organizationId = await resolveOrgId(orgSlug);
      if (!organizationId) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const name = String(payload.name || payload.full_name || payload.fullName || '').trim();
      const emailRaw = String(payload.email || payload.email_address || '').trim();
      const phone = String(payload.phone || payload.phone_number || payload.mobile || '').trim();
      const phoneDigits = normalizePhoneDigits(phone);
      const source = normalizeSource(String(payload.source || payload.platform || payload.channel || ''));

      if (!name || !phone) {
        return NextResponse.json({ error: 'Missing lead name/phone' }, { status: 400 });
      }

      const email = emailRaw || '';
      const now = new Date();

      const or: any[] = [];
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
        const updated = await prisma.systemLead.update({
          where: { id: existing.id },
          data: {
            name,
            phone,
            email,
            source: source || undefined,
            lastContact: now,
          },
          select: { id: true },
        });
        return NextResponse.json({ success: true, leadId: updated.id, created: false }, { status: 200 });
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
    console.log('Make.com webhook received:', {
      eventType,
      body: JSON.stringify(body),
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      event_type: eventType,
    });
  } catch (error: any) {
    console.error('Make.com webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/make
 * Webhook verification (Make.com ping)
 */
async function GETHandler(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Make.com webhook endpoint is active',
  });
}


export const GET = shabbatGuard(GETHandler);

export const POST = shabbatGuard(POSTHandler);
