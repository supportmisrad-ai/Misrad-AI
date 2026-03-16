import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientIpFromRequest, rateLimit, buildRateLimitHeaders } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BatchTrackPayload {
  visitor_id: string;
  session_id?: string;
  events: Array<{
    type: 'session' | 'pageview' | 'pageview_update' | 'event' | 'signup';
    payload: Record<string, unknown>;
    timestamp: number;
  }>;
  // session fields (if session event included)
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  landing_page?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit check - higher limits for batch endpoint
    const ip = getClientIpFromRequest(req);
    const rl = await rateLimit({
      namespace: 'analytics.batch',
      key: ip,
      limit: 30, // 30 batches per minute = up to 1500 events
      windowMs: 60_000,
      mode: 'degraded',
      degradedLimit: 10,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: 'rate limited' },
        {
          status: 429,
          headers: buildRateLimitHeaders({
            limit: 30,
            remaining: 0,
            resetAt: rl.resetAt,
            retryAfterSeconds: rl.retryAfterSeconds,
          }),
        },
      );
    }

    const body = (await req.json()) as BatchTrackPayload;

    if (!body.visitor_id || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
    }

    const results: Array<{ ok: boolean; id?: string; error?: string }> = [];
    let sessionId = body.session_id;

    // Process all events in sequence to avoid race conditions
    for (const event of body.events) {
      try {
        switch (event.type) {
          case 'session': {
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
            sessionId = session.id;
            results.push({ ok: true, id: session.id });
            break;
          }

          case 'pageview': {
            if (!sessionId) {
              results.push({ ok: false, error: 'no session' });
              continue;
            }
            const path = String(event.payload.path || '');
            if (!path) {
              results.push({ ok: false, error: 'missing path' });
              continue;
            }
            const pv = await prisma.siteAnalyticsPageView.create({
              data: {
                session_id: sessionId,
                path,
                title: event.payload.title ? String(event.payload.title) : null,
                referrer_page: event.payload.referrer_page ? String(event.payload.referrer_page) : null,
              },
            });
            await prisma.siteAnalyticsSession.update({
              where: { id: sessionId },
              data: { total_pages: { increment: 1 } },
            });
            results.push({ ok: true, id: pv.id });
            break;
          }

          case 'pageview_update': {
            const pageviewId = String(event.payload.pageview_id || '');
            if (!pageviewId) {
              results.push({ ok: false, error: 'missing pageview_id' });
              continue;
            }
            await prisma.siteAnalyticsPageView.update({
              where: { id: pageviewId },
              data: {
                time_on_page_ms: typeof event.payload.time_on_page_ms === 'number' ? event.payload.time_on_page_ms : undefined,
                max_scroll_pct: typeof event.payload.max_scroll_pct === 'number' ? event.payload.max_scroll_pct : undefined,
                left_at: new Date(),
              },
            });
            if (sessionId && typeof event.payload.time_on_page_ms === 'number') {
              await prisma.siteAnalyticsSession.update({
                where: { id: sessionId },
                data: { total_duration_ms: { increment: event.payload.time_on_page_ms } },
              });
            }
            results.push({ ok: true });
            break;
          }

          case 'event': {
            if (!sessionId) {
              results.push({ ok: false, error: 'no session' });
              continue;
            }
            const eventType = String(event.payload.event_type || '');
            if (!eventType) {
              results.push({ ok: false, error: 'missing event_type' });
              continue;
            }
            await prisma.siteAnalyticsEvent.create({
              data: {
                session_id: sessionId,
                event_type: eventType,
                event_data: event.payload.event_data ? (event.payload.event_data as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
                page_path: event.payload.page_path ? String(event.payload.page_path) : null,
              },
            });
            results.push({ ok: true });
            break;
          }

          case 'signup': {
            if (!sessionId) {
              results.push({ ok: false, error: 'no session' });
              continue;
            }
            const signupUserId = String(event.payload.signup_user_id || '');
            if (!signupUserId) {
              results.push({ ok: false, error: 'missing signup_user_id' });
              continue;
            }
            await prisma.siteAnalyticsSession.update({
              where: { id: sessionId },
              data: {
                signup_user_id: signupUserId,
                signed_up_at: new Date(),
              },
            });
            results.push({ ok: true });
            break;
          }

          default:
            results.push({ ok: false, error: 'unknown type' });
        }
      } catch (err) {
        console.error('[analytics/batch] event error:', err);
        results.push({ ok: false, error: 'processing error' });
      }
    }

    return NextResponse.json({ ok: true, session_id: sessionId, results });
  } catch (err) {
    console.error('[analytics/batch] error:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
