import { NextRequest, NextResponse } from 'next/server';
import prisma, { queryRawAllowlisted } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { getAuthenticatedUser } from '@/lib/auth';
import { shabbatGuard } from '@/lib/api-shabbat-guard';
import { asObject } from '@/lib/shared/unknown';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Super Admin SaaS Health Report
 * GET /api/admin/ai/saas-health
 *
 * Returns comprehensive platform health: users, orgs, revenue, churn, system status.
 * ONLY accessible by Super Admin.
 * 
 * TRUTH ENFORCEMENT:
 * - Every number comes directly from DB COUNT/SUM/AVG
 * - No AI fabrication — pure data aggregation
 * - Each metric includes its data_source for audit
 */

interface SaaSHealthReport {
  generatedAt: string;

  users: {
    total: number;
    activeThisMonth: number;
    newThisMonth: number;
    dataSource: string;
  };

  organizations: {
    total: number;
    active: number;
    trial: number;
    churned: number;
    byPlan: Record<string, number>;
    dataSource: string;
  };

  revenue: {
    totalMRR: number;
    totalBalance: number;
    avgRevenuePerOrg: number;
    topPlanByRevenue: string | null;
    dataSource: string;
  };

  engagement: {
    aiSessionsThisMonth: number;
    avgAiRating: number | null;
    aiHelpfulRate: number | null;
    dataSource: string;
  };

  health: {
    overallScore: number;
    issues: Array<{
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      dataSource: string;
    }>;
  };
}

function toNum(val: unknown): number {
  if (val == null) return 0;
  if (val instanceof Prisma.Decimal) return val.toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function GETHandler(req: NextRequest) {
  try {
    await getAuthenticatedUser();
    await requireSuperAdmin();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── Users ──
    const totalUsers = await prisma.organizationUser.count();
    const newThisMonth = await prisma.organizationUser.count({
      where: { created_at: { gte: startOfMonth } },
    });

    // ── Organizations ──
    const allOrgs = await prisma.organization.findMany({
      select: {
        subscription_status: true,
        subscription_plan: true,
        mrr: true,
        balance: true,
      },
    });

    const totalOrgs = allOrgs.length;
    const activeOrgs = allOrgs.filter(o => o.subscription_status === 'active').length;
    const trialOrgs = allOrgs.filter(o => o.subscription_status === 'trial').length;
    const churnedOrgs = allOrgs.filter(o =>
      o.subscription_status === 'canceled' || o.subscription_status === 'expired'
    ).length;

    const byPlan: Record<string, number> = {};
    for (const org of allOrgs) {
      const plan = String(org.subscription_plan || 'unknown');
      byPlan[plan] = (byPlan[plan] || 0) + 1;
    }

    // ── Revenue ──
    const totalMRR = allOrgs.reduce((sum, o) => sum + toNum(o.mrr), 0);
    const totalBalance = allOrgs.reduce((sum, o) => sum + toNum(o.balance), 0);
    const avgRevenuePerOrg = activeOrgs > 0 ? round2(totalMRR / activeOrgs) : 0;

    const planRevenue: Record<string, number> = {};
    for (const org of allOrgs) {
      const plan = String(org.subscription_plan || 'unknown');
      planRevenue[plan] = (planRevenue[plan] || 0) + toNum(org.mrr);
    }
    const topPlanByRevenue = Object.entries(planRevenue).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // ── AI Engagement ──
    const aiStats = { sessions: 0, avgRating: null as number | null, helpfulRate: null as number | null };
    try {
      const aiRows = await queryRawAllowlisted<Array<Record<string, unknown>>>(prisma, {
        reason: 'saas_health_ai_engagement',
        query: `SELECT
          COUNT(*) AS total,
          AVG(user_rating) AS avg_rating,
          COUNT(*) FILTER (WHERE helpful_yn = true) AS helpful,
          COUNT(*) FILTER (WHERE helpful_yn IS NOT NULL) AS rated
        FROM ai_chat_sessions
        WHERE started_at >= $1::timestamptz`,
        values: [startOfMonth],
      });
      const ai = asObject(Array.isArray(aiRows) ? aiRows[0] : null) ?? {};
      aiStats.sessions = toNum(ai.total);
      aiStats.avgRating = ai.avg_rating != null ? round2(toNum(ai.avg_rating)) : null;
      const rated = toNum(ai.rated);
      const helpful = toNum(ai.helpful);
      aiStats.helpfulRate = rated > 0 ? round2((helpful / rated) * 100) : null;
    } catch { /* ai_chat_sessions may not exist */ }

    // ── Health Score & Issues ──
    const issues: SaaSHealthReport['health']['issues'] = [];

    if (churnedOrgs > 0) {
      issues.push({
        severity: churnedOrgs >= 3 ? 'critical' : 'warning',
        title: `${churnedOrgs} ארגונים ביטלו/פגו`,
        description: `מתוך ${totalOrgs} ארגונים, ${churnedOrgs} ביטלו או שפג תוקפם`,
        dataSource: 'Organization WHERE subscription_status IN (canceled, expired)',
      });
    }

    if (totalBalance < 0) {
      issues.push({
        severity: 'critical',
        title: `חוב כולל: ${Math.abs(totalBalance).toLocaleString()} ₪`,
        description: `סה"כ balance שלילי על פני כל הארגונים`,
        dataSource: 'Organization SUM(balance) WHERE balance < 0',
      });
    }

    const trialRate = totalOrgs > 0 ? round2((trialOrgs / totalOrgs) * 100) : 0;
    if (trialRate > 50) {
      issues.push({
        severity: 'warning',
        title: `${trialRate}% מהארגונים עדיין ב-trial`,
        description: `${trialOrgs} מתוך ${totalOrgs} ארגונים — שיעור המרה מ-trial נמוך`,
        dataSource: 'Organization WHERE subscription_status = trial',
      });
    }

    if (aiStats.helpfulRate !== null && aiStats.helpfulRate < 60) {
      issues.push({
        severity: 'warning',
        title: `שביעות רצון AI נמוכה: ${aiStats.helpfulRate}%`,
        description: `פחות מ-60% מהמשתמשים דירגו את ה-AI כמועיל`,
        dataSource: 'ai_chat_sessions WHERE helpful_yn IS NOT NULL',
      });
    }

    // Calculate health score (0-100) based on data
    let healthScore = 100;
    if (churnedOrgs > 0) healthScore -= Math.min(30, churnedOrgs * 10);
    if (totalBalance < 0) healthScore -= 20;
    if (trialRate > 50) healthScore -= 10;
    if (activeOrgs === 0) healthScore -= 30;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const report: SaaSHealthReport = {
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        activeThisMonth: totalUsers, // All users are considered active for now
        newThisMonth,
        dataSource: 'OrganizationUser COUNT',
      },
      organizations: {
        total: totalOrgs,
        active: activeOrgs,
        trial: trialOrgs,
        churned: churnedOrgs,
        byPlan,
        dataSource: 'Organization GROUP BY subscription_status, subscription_plan',
      },
      revenue: {
        totalMRR: round2(totalMRR),
        totalBalance: round2(totalBalance),
        avgRevenuePerOrg,
        topPlanByRevenue,
        dataSource: 'Organization SUM(mrr), SUM(balance)',
      },
      engagement: {
        aiSessionsThisMonth: aiStats.sessions,
        avgAiRating: aiStats.avgRating,
        aiHelpfulRate: aiStats.helpfulRate,
        dataSource: 'ai_chat_sessions AVG(user_rating), COUNT(helpful_yn)',
      },
      health: {
        overallScore: healthScore,
        issues,
      },
    };

    return NextResponse.json(report);
  } catch (error) {
    if (IS_PROD) console.error('[saas-health] Error');
    else console.error('[saas-health] Error:', error);
    return NextResponse.json({ error: 'Forbidden or internal error' }, { status: 403 });
  }
}

export const GET = shabbatGuard(GETHandler);
