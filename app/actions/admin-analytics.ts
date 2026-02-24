'use server';

import prisma from '@/lib/prisma';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/errorHandler';
import { requireSuperAdmin } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalSessions: number;
  uniqueVisitors: number;
  totalPageViews: number;
  avgTimeOnPageMs: number;
  avgScrollPct: number;
  avgPagesPerSession: number;
  totalSignups: number;
  topReferrers: { referrer: string; count: number }[];
  topPages: { path: string; views: number; avgTimeMs: number; avgScrollPct: number }[];
  dailyVisits: { date: string; sessions: number; pageViews: number; signups: number }[];
  deviceBreakdown: { device: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
}

export interface PageAnalytics {
  path: string;
  totalViews: number;
  uniqueVisitors: number;
  avgTimeMs: number;
  avgScrollPct: number;
  bounceRate: number;
}

export interface UserJourney {
  sessionId: string;
  visitorId: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  device: string | null;
  browser: string | null;
  totalPages: number;
  totalDurationMs: number;
  signedUp: boolean;
  signedUpAt: string | null;
  signupUserId: string | null;
  createdAt: string;
  pages: { path: string; title: string | null; timeMs: number; scrollPct: number; enteredAt: string }[];
}

export interface SignupRecord {
  sessionId: string;
  signupUserId: string;
  signedUpAt: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  totalPages: number;
  totalDurationMs: number;
  journeyPages: { path: string; timeMs: number; scrollPct: number }[];
  // joined user info
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  organizationName: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────

async function ensureAdmin() {
  const auth = await requireAuth();
  if (!auth.success) throw new Error(auth.error || 'נדרשת התחברות');
  await requireSuperAdmin();
}

// ── Actions ──────────────────────────────────────────────────────

export async function getAnalyticsOverview(days: number = 30): Promise<{
  success: boolean;
  data?: AnalyticsOverview;
  error?: string;
}> {
  try {
    await ensureAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const [sessions, pageViews, signupSessions] = await Promise.all([
      prisma.siteAnalyticsSession.findMany({
        where: { created_at: { gte: since } },
        select: {
          id: true,
          visitor_id: true,
          referrer: true,
          device_type: true,
          browser: true,
          total_pages: true,
          total_duration_ms: true,
          signup_user_id: true,
          signed_up_at: true,
          created_at: true,
        },
      }),
      prisma.siteAnalyticsPageView.findMany({
        where: { entered_at: { gte: since } },
        select: {
          path: true,
          time_on_page_ms: true,
          max_scroll_pct: true,
          entered_at: true,
          session_id: true,
        },
      }),
      prisma.siteAnalyticsSession.count({
        where: { created_at: { gte: since }, signup_user_id: { not: null } },
      }),
    ]);

    const uniqueVisitors = new Set(sessions.map((s) => s.visitor_id)).size;
    const totalPageViews = pageViews.length;

    const pvWithTime = pageViews.filter((pv) => pv.time_on_page_ms > 0);
    const avgTimeOnPageMs = pvWithTime.length > 0
      ? Math.round(pvWithTime.reduce((sum, pv) => sum + pv.time_on_page_ms, 0) / pvWithTime.length)
      : 0;
    const pvWithScroll = pageViews.filter((pv) => pv.max_scroll_pct > 0);
    const avgScrollPct = pvWithScroll.length > 0
      ? Math.round(pvWithScroll.reduce((sum, pv) => sum + pv.max_scroll_pct, 0) / pvWithScroll.length)
      : 0;
    const avgPagesPerSession = sessions.length > 0
      ? Math.round((totalPageViews / sessions.length) * 10) / 10
      : 0;

    // Top referrers
    const refMap = new Map<string, number>();
    for (const s of sessions) {
      const ref = s.referrer || 'ישיר';
      refMap.set(ref, (refMap.get(ref) || 0) + 1);
    }
    const topReferrers = Array.from(refMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top pages
    const pageMap = new Map<string, { views: number; totalTime: number; totalScroll: number; sessions: Set<string> }>();
    for (const pv of pageViews) {
      const existing = pageMap.get(pv.path) || { views: 0, totalTime: 0, totalScroll: 0, sessions: new Set<string>() };
      existing.views++;
      existing.totalTime += pv.time_on_page_ms;
      existing.totalScroll += pv.max_scroll_pct;
      existing.sessions.add(pv.session_id);
      pageMap.set(pv.path, existing);
    }
    const topPages = Array.from(pageMap.entries())
      .map(([path, data]) => ({
        path,
        views: data.views,
        avgTimeMs: data.views > 0 ? Math.round(data.totalTime / data.views) : 0,
        avgScrollPct: data.views > 0 ? Math.round(data.totalScroll / data.views) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    // Daily visits
    const dayMap = new Map<string, { sessions: number; pageViews: number; signups: number }>();
    for (const s of sessions) {
      const day = s.created_at.toISOString().split('T')[0];
      const existing = dayMap.get(day) || { sessions: 0, pageViews: 0, signups: 0 };
      existing.sessions++;
      if (s.signup_user_id) existing.signups++;
      dayMap.set(day, existing);
    }
    for (const pv of pageViews) {
      const day = pv.entered_at.toISOString().split('T')[0];
      const existing = dayMap.get(day) || { sessions: 0, pageViews: 0, signups: 0 };
      existing.pageViews++;
      dayMap.set(day, existing);
    }
    const dailyVisits = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Device breakdown
    const deviceMap = new Map<string, number>();
    for (const s of sessions) {
      const d = s.device_type || 'לא ידוע';
      deviceMap.set(d, (deviceMap.get(d) || 0) + 1);
    }
    const deviceBreakdown = Array.from(deviceMap.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    // Browser breakdown
    const browserMap = new Map<string, number>();
    for (const s of sessions) {
      const b = s.browser || 'לא ידוע';
      browserMap.set(b, (browserMap.get(b) || 0) + 1);
    }
    const browserBreakdown = Array.from(browserMap.entries())
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count);

    return createSuccessResponse({
      totalSessions: sessions.length,
      uniqueVisitors,
      totalPageViews,
      avgTimeOnPageMs,
      avgScrollPct,
      avgPagesPerSession,
      totalSignups: signupSessions,
      topReferrers,
      topPages,
      dailyVisits,
      deviceBreakdown,
      browserBreakdown,
    });
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת נתוני אנליטיקס');
  }
}

export async function getPageAnalytics(days: number = 30): Promise<{
  success: boolean;
  data?: PageAnalytics[];
  error?: string;
}> {
  try {
    await ensureAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const pageViews = await prisma.siteAnalyticsPageView.findMany({
      where: { entered_at: { gte: since } },
      select: {
        path: true,
        time_on_page_ms: true,
        max_scroll_pct: true,
        session_id: true,
        session: { select: { visitor_id: true, total_pages: true } },
      },
    });

    const pageMap = new Map<string, {
      views: number;
      visitors: Set<string>;
      totalTime: number;
      totalScroll: number;
      singlePageSessions: number;
    }>();

    for (const pv of pageViews) {
      const existing = pageMap.get(pv.path) || {
        views: 0,
        visitors: new Set<string>(),
        totalTime: 0,
        totalScroll: 0,
        singlePageSessions: 0,
      };
      existing.views++;
      existing.visitors.add(pv.session.visitor_id);
      existing.totalTime += pv.time_on_page_ms;
      existing.totalScroll += pv.max_scroll_pct;
      if (pv.session.total_pages <= 1) existing.singlePageSessions++;
      pageMap.set(pv.path, existing);
    }

    const result: PageAnalytics[] = Array.from(pageMap.entries())
      .map(([path, data]) => ({
        path,
        totalViews: data.views,
        uniqueVisitors: data.visitors.size,
        avgTimeMs: data.views > 0 ? Math.round(data.totalTime / data.views) : 0,
        avgScrollPct: data.views > 0 ? Math.round(data.totalScroll / data.views) : 0,
        bounceRate: data.views > 0 ? Math.round((data.singlePageSessions / data.views) * 100) : 0,
      }))
      .sort((a, b) => b.totalViews - a.totalViews);

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת נתוני דפים');
  }
}

export async function getUserJourneys(options: {
  days?: number;
  signupsOnly?: boolean;
  limit?: number;
}): Promise<{
  success: boolean;
  data?: UserJourney[];
  error?: string;
}> {
  try {
    await ensureAdmin();

    const days = options.days || 30;
    const limit = options.limit || 100;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await prisma.siteAnalyticsSession.findMany({
      where: {
        created_at: { gte: since },
        ...(options.signupsOnly ? { signup_user_id: { not: null } } : {}),
      },
      include: {
        page_views: {
          orderBy: { entered_at: 'asc' },
          select: {
            path: true,
            title: true,
            time_on_page_ms: true,
            max_scroll_pct: true,
            entered_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    const result: UserJourney[] = sessions.map((s) => ({
      sessionId: s.id,
      visitorId: s.visitor_id,
      referrer: s.referrer,
      utmSource: s.utm_source,
      utmMedium: s.utm_medium,
      utmCampaign: s.utm_campaign,
      landingPage: s.landing_page,
      device: s.device_type,
      browser: s.browser,
      totalPages: s.total_pages,
      totalDurationMs: s.total_duration_ms,
      signedUp: !!s.signup_user_id,
      signedUpAt: s.signed_up_at?.toISOString() || null,
      signupUserId: s.signup_user_id,
      createdAt: s.created_at.toISOString(),
      pages: s.page_views.map((pv) => ({
        path: pv.path,
        title: pv.title,
        timeMs: pv.time_on_page_ms,
        scrollPct: pv.max_scroll_pct,
        enteredAt: pv.entered_at.toISOString(),
      })),
    }));

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת מסעות משתמשים');
  }
}

export async function getSignupRecords(days: number = 90): Promise<{
  success: boolean;
  data?: SignupRecord[];
  error?: string;
}> {
  try {
    await ensureAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await prisma.siteAnalyticsSession.findMany({
      where: {
        created_at: { gte: since },
        signup_user_id: { not: null },
      },
      include: {
        page_views: {
          orderBy: { entered_at: 'asc' },
          select: { path: true, time_on_page_ms: true, max_scroll_pct: true },
        },
      },
      orderBy: { signed_up_at: 'desc' },
    });

    // Fetch user info for signup users
    const userIds = sessions.map((s) => s.signup_user_id).filter(Boolean) as string[];
    const users = userIds.length > 0
      ? await prisma.organizationUser.findMany({
          where: { clerk_user_id: { in: userIds } },
          select: {
            clerk_user_id: true,
            full_name: true,
            email: true,
            avatar_url: true,
            Organization: { select: { name: true } },
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.clerk_user_id, u]));

    const result: SignupRecord[] = sessions.map((s) => {
      const user = s.signup_user_id ? userMap.get(s.signup_user_id) : null;
      return {
        sessionId: s.id,
        signupUserId: s.signup_user_id!,
        signedUpAt: s.signed_up_at?.toISOString() || s.created_at.toISOString(),
        referrer: s.referrer,
        utmSource: s.utm_source,
        utmMedium: s.utm_medium,
        utmCampaign: s.utm_campaign,
        landingPage: s.landing_page,
        device: s.device_type,
        browser: s.browser,
        os: s.os,
        totalPages: s.total_pages,
        totalDurationMs: s.total_duration_ms,
        journeyPages: s.page_views.map((pv) => ({
          path: pv.path,
          timeMs: pv.time_on_page_ms,
          scrollPct: pv.max_scroll_pct,
        })),
        userName: user?.full_name || null,
        userEmail: user?.email || null,
        userAvatar: user?.avatar_url || null,
        organizationName: user?.Organization?.name || null,
      };
    });

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בטעינת נתוני הרשמות');
  }
}
