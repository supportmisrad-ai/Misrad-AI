import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIpFromRequest, rateLimit, buildRateLimitHeaders } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TrackPayload {
  type: 'session' | 'pageview' | 'pageview_update' | 'event' | 'signup';
  visitor_id: string;
  session_id?: string;
  // session fields
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  landing_page?: string;
  // pageview fields
  pageview_id?: string;
  path?: string;
  title?: string;
  referrer_page?: string;
  time_on_page_ms?: number;
  max_scroll_pct?: number;
  // event fields
  event_type?: string;
  event_data?: Record<string, unknown>;
  page_path?: string;
  // signup fields
  signup_user_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit check (Upstash Redis — works across serverless instances)
    const ip = getClientIpFromRequest(req);
    const rl = await rateLimit({
      namespace: 'analytics.track',
      key: ip,
      limit: 60,
      windowMs: 60_000,
      mode: 'degraded',
      degradedLimit: 30,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'rate limited' },
        {
          status: 429,
          headers: buildRateLimitHeaders({
            limit: 60,
            remaining: 0,
            resetAt: rl.resetAt,
            retryAfterSeconds: rl.retryAfterSeconds,
          }),
        },
      );
    }

    const body = (await req.json()) as TrackPayload;

    if (!body.visitor_id || !body.type) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
    }

    // Input length guards — prevent storing arbitrarily long strings
    const MAX_ID = 128;
    const MAX_SHORT = 256;
    const MAX_MEDIUM = 1024;
    if (body.visitor_id.length > MAX_ID || (body.session_id && body.session_id.length > MAX_ID)) {
      return NextResponse.json({ ok: false, error: 'invalid id length' }, { status: 400 });
    }
    if ((body.pageview_id && body.pageview_id.length > MAX_ID) ||
        (body.signup_user_id && body.signup_user_id.length > MAX_ID)) {
      return NextResponse.json({ ok: false, error: 'invalid id length' }, { status: 400 });
    }
    if ((body.path && body.path.length > MAX_MEDIUM) ||
        (body.landing_page && body.landing_page.length > MAX_MEDIUM) ||
        (body.referrer && body.referrer.length > MAX_MEDIUM) ||
        (body.referrer_page && body.referrer_page.length > MAX_MEDIUM) ||
        (body.page_path && body.page_path.length > MAX_MEDIUM)) {
      return NextResponse.json({ ok: false, error: 'field too long' }, { status: 400 });
    }
    if ((body.title && body.title.length > MAX_SHORT) ||
        (body.utm_source && body.utm_source.length > MAX_SHORT) ||
        (body.utm_medium && body.utm_medium.length > MAX_SHORT) ||
        (body.utm_campaign && body.utm_campaign.length > MAX_SHORT) ||
        (body.device_type && body.device_type.length > MAX_SHORT) ||
        (body.browser && body.browser.length > MAX_SHORT) ||
        (body.os && body.os.length > MAX_SHORT) ||
        (body.event_type && body.event_type.length > MAX_SHORT)) {
      return NextResponse.json({ ok: false, error: 'field too long' }, { status: 400 });
    }
    // Limit event_data JSON size
    if (body.event_data && JSON.stringify(body.event_data).length > 4096) {
      return NextResponse.json({ ok: false, error: 'event_data too large' }, { status: 400 });
    }

    if (body.type === 'session') {
      const session = await prisma.siteAnalyticsSession.create({
        data: {
          visitor_id: body.visitor_id,
          referrer: body.referrer || null,
          utm_source: body.utm_source || null,
          utm_medium: body.utm_medium || null,
          utm_campaign: body.utm_campaign || null,
          device_type: body.device_type || null,
          browser: body.browser || null,
          os: body.os || null,
          landing_page: body.landing_page || null,
        },
      });
      return NextResponse.json({ ok: true, session_id: session.id });
    }

    if (body.type === 'pageview' && body.session_id && body.path) {
      const pv = await prisma.siteAnalyticsPageView.create({
        data: {
          session_id: body.session_id,
          path: body.path,
          title: body.title || null,
          referrer_page: body.referrer_page || null,
        },
      });
      await prisma.siteAnalyticsSession.update({
        where: { id: body.session_id },
        data: { total_pages: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, pageview_id: pv.id });
    }

    if (body.type === 'pageview_update' && body.pageview_id) {
      await prisma.siteAnalyticsPageView.update({
        where: { id: body.pageview_id },
        data: {
          time_on_page_ms: body.time_on_page_ms ?? undefined,
          max_scroll_pct: body.max_scroll_pct ?? undefined,
          left_at: new Date(),
        },
      });
      if (body.session_id && typeof body.time_on_page_ms === 'number') {
        await prisma.siteAnalyticsSession.update({
          where: { id: body.session_id },
          data: { total_duration_ms: { increment: body.time_on_page_ms } },
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'event' && body.session_id && body.event_type) {
      await prisma.siteAnalyticsEvent.create({
        data: {
          session_id: body.session_id,
          event_type: body.event_type,
          event_data: body.event_data ? (body.event_data as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
          page_path: body.page_path || null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'signup' && body.session_id && body.signup_user_id) {
      await prisma.siteAnalyticsSession.update({
        where: { id: body.session_id },
        data: {
          signup_user_id: body.signup_user_id,
          signed_up_at: new Date(),
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'unknown type' }, { status: 400 });
  } catch (err) {
    console.error('[analytics/track] error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
