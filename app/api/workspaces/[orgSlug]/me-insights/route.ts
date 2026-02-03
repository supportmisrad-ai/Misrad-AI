import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { queryRawOrgScoped } from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object') return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : String(error ?? '');
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function parseCommitments(rating: unknown): Array<{ who: string; what: string; due: string }> {
  const ratingObj = asObject(rating) ?? {};
  const commitments = ratingObj.commitments;
  if (!Array.isArray(commitments)) return [];
  return commitments
    .map((c) => {
      const cObj = asObject(c) ?? {};
      return {
        who: asString(cObj.who || '').trim(),
        what: asString(cObj.what || '').trim(),
        due: asString(cObj.due || '').trim(),
      };
    })
    .filter((c): boolean => Boolean(c.who || c.what || c.due));
}

async function GETHandler(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return apiError('Unauthorized', { status: 401 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return apiError('orgSlug is required', { status: 400 });
    }

    const { workspace } = await getWorkspaceContextOrThrow(req, { params });
    const url = new URL(req.url);
    const moduleId = String(url.searchParams.get('module') || '').trim().toLowerCase();

    if (moduleId === 'system') {
      const [totalLeads, hotLeads] = await Promise.all([
        prisma.systemLead.count({ where: { organizationId: workspace.id } }),
        prisma.systemLead.findMany({
          where: { organizationId: workspace.id },
          orderBy: [{ isHot: 'desc' }, { score: 'desc' }, { updatedAt: 'desc' }],
          take: 5,
          select: {
            id: true,
            name: true,
            company: true,
            phone: true,
            email: true,
            status: true,
            score: true,
            isHot: true,
            lastContact: true,
            updatedAt: true,
          },
        }),
      ]);

      const hottest = hotLeads[0] || null;

      const indexedLeadsCount = await prisma.ai_embeddings.count({
        where: {
          organization_id: workspace.id,
          module_id: 'system',
          doc_key: { startsWith: 'system:system_leads:' },
        },
      });

      const docKeys = hotLeads.map((l) => `system:system_leads:${l.id}`);

      const embeddedKeys = await prisma.ai_embeddings.findMany({
        where: {
          organization_id: workspace.id,
          module_id: 'system',
          doc_key: { in: docKeys },
        },
        select: { doc_key: true },
        take: 200,
      });

      const embeddedKeySet = new Set((embeddedKeys || []).map((r) => String(r.doc_key || '')));

      const leadsOut = hotLeads.map((l) => ({
        id: l.id,
        name: l.name,
        company: l.company ?? null,
        status: l.status,
        score: l.score ?? null,
        isHot: l.isHot ?? false,
        lastContact: l.lastContact ? new Date(l.lastContact).toISOString() : null,
        updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : null,
        inMemory: embeddedKeySet.has(`system:system_leads:${l.id}`),
      }));

      return apiSuccess({
        moduleId: 'system',
        organizationId: workspace.id,
        hottestLead: hottest
          ? {
              id: hottest.id,
              name: hottest.name,
              status: hottest.status,
              score: hottest.score ?? null,
              updatedAt: hottest.updatedAt ? new Date(hottest.updatedAt).toISOString() : null,
              inMemory: embeddedKeySet.has(`system:system_leads:${hottest.id}`),
            }
          : null,
        hotLeads: {
          totalLeads,
          indexedLeadsCount: typeof indexedLeadsCount === 'number' ? indexedLeadsCount : null,
          items: leadsOut,
        },
      });
    }

    if (moduleId === 'client') {
      const analyses = await prisma.misradMeetingAnalysisResult.findMany({
        where: { organization_id: workspace.id },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          meeting_id: true,
          client_id: true,
          summary: true,
          rating: true,
          created_at: true,
          meeting: { select: { title: true } },
          client: { select: { name: true } },
        },
      });

      const commitmentItems: Array<{
        meetingId: string;
        clientName: string | null;
        meetingTitle: string | null;
        createdAt: string;
        who: string;
        what: string;
        due: string;
        inMemory: boolean;
      }> = [];

      const warmthValues: number[] = [];

      const meetingDocKeys = analyses.map((a) => `client:meeting:${a.meeting_id}`);

      const embeddedMeetings = await prisma.ai_embeddings.findMany({
        where: {
          organization_id: workspace.id,
          module_id: 'client',
          doc_key: { in: meetingDocKeys },
        },
        select: { doc_key: true },
        take: 500,
      });

      const embeddedMeetingSet = new Set((embeddedMeetings || []).map((r) => String(r.doc_key || '')));

      let lastCommitment: {
        meetingId: string;
        clientName: string | null;
        meetingTitle: string | null;
        createdAt: string;
        who: string;
        what: string;
        due: string;
        inMemory: boolean;
      } | null = null;

      for (const a of analyses) {
        const ratingObj = asObject(a.rating) ?? {};
        const warmthRaw = ratingObj.relationshipWarmth;
        const warmthNum = typeof warmthRaw === 'number' ? warmthRaw : Number(warmthRaw);
        if (Number.isFinite(warmthNum)) warmthValues.push(warmthNum);

        const commitments = parseCommitments(a.rating);
        for (const c of commitments) {
          const row = {
            meetingId: String(a.meeting_id),
            clientName: a.client?.name ? String(a.client.name) : null,
            meetingTitle: a.meeting?.title ? String(a.meeting.title) : null,
            createdAt: new Date(a.created_at).toISOString(),
            who: c.who,
            what: c.what,
            due: c.due,
            inMemory: embeddedMeetingSet.has(`client:meeting:${a.meeting_id}`),
          };
          if (!lastCommitment) {
            lastCommitment = row;
          }
          commitmentItems.push(row);
        }
      }

      const avgWarmth = warmthValues.length ? Math.round((warmthValues.reduce((s, v) => s + v, 0) / warmthValues.length) * 10) / 10 : null;
      const lastWarmth = warmthValues.length ? warmthValues[0] : null;


      const indexedMeetingsCount = await prisma.ai_embeddings.count({
        where: {
          organization_id: workspace.id,
          module_id: 'client',
          doc_key: { startsWith: 'client:meeting:' },
        },
      });

      return apiSuccess({
        moduleId: 'client',
        organizationId: workspace.id,
        lastCommitment,
        meetings: {
          indexedMeetingsCount: typeof indexedMeetingsCount === 'number' ? indexedMeetingsCount : null,
        },
        relationship: {
          avgWarmth,
          lastWarmth,
        },
        commitments: {
          count: commitmentItems.length,
          items: commitmentItems.slice(0, 8),
        },
      });
    }

    if (moduleId === 'finance') {
      const isMissingRelationError = (error: unknown): boolean => {
        const message = getErrorMessage(error).toLowerCase();
        const code = String(asObject(error)?.code || '').toLowerCase();
        return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
      };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const toNumberSafe = (v: unknown): number => {
        if (v == null) return 0;
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        if (typeof v === 'bigint') return Number(v);
        if (typeof v === 'string') {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        }
        const obj = asObject(v);
        const toNumber = obj?.toNumber;
        if (typeof toNumber === 'function') {
          const n = toNumber.call(v);
          return Number.isFinite(n) ? n : 0;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const [weightedPipelineRow] = await queryRawOrgScoped<Array<{ weighted_pipeline: unknown }>>(prisma, {
        organizationId: workspace.id,
        reason: 'me_insights_finance_weighted_pipeline',
        query: `
          SELECT COALESCE(
            SUM(
              COALESCE(value, 0) * GREATEST(0, LEAST(1, (COALESCE(score, 0)::float / 100.0)))
            ),
            0
          ) AS weighted_pipeline
          FROM system_leads
          WHERE organization_id = $1::uuid
            AND LOWER(COALESCE(status, '')) NOT IN ('won', 'lost')
        `,
        values: [workspace.id],
      });

      const weightedPipeline = toNumberSafe(weightedPipelineRow?.weighted_pipeline);

      const [systemInvoicesOpenRow] = await queryRawOrgScoped<Array<{ open_sum: unknown }>>(prisma, {
        organizationId: workspace.id,
        reason: 'me_insights_finance_system_invoices_open',
        query: `
          SELECT COALESCE(SUM(si.amount), 0) AS open_sum
          FROM system_invoices si
          JOIN system_leads sl ON sl.id = si.lead_id
          WHERE sl.organization_id = $1::uuid
            AND si.date >= $2::timestamptz
            AND si.date < $3::timestamptz
            AND (
              LOWER(COALESCE(si.status, '')) NOT LIKE '%paid%'
              AND LOWER(COALESCE(si.status, '')) NOT LIKE '%settled%'
              AND LOWER(COALESCE(si.status, '')) NOT LIKE '%complete%'
              AND LOWER(COALESCE(si.status, '')) NOT LIKE '%void%'
              AND LOWER(COALESCE(si.status, '')) NOT LIKE '%cancel%'
            )
        `,
        values: [workspace.id, startOfMonth, startOfNextMonth],
      });

      const systemInvoicesOpen = toNumberSafe(systemInvoicesOpenRow?.open_sum);

      const [misradInvoicesOpenRow] = await queryRawOrgScoped<Array<{ open_sum: unknown }>>(prisma, {
        organizationId: workspace.id,
        reason: 'me_insights_finance_misrad_invoices_open',
        query: `
          SELECT COALESCE(SUM(mi.amount), 0) AS open_sum
          FROM misrad_invoices mi
          WHERE mi.organization_id = $1::uuid
            AND mi.status <> 'PAID'
            AND (
              CASE
                WHEN mi.due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN mi.due_date::date
                ELSE NULL
              END
            ) >= $2::date
            AND (
              CASE
                WHEN mi.due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN mi.due_date::date
                ELSE NULL
              END
            ) < $3::date
        `,
        values: [workspace.id, startOfMonth, startOfNextMonth],
      });

      const misradInvoicesOpenThisMonth = toNumberSafe(misradInvoicesOpenRow?.open_sum);

      let recurringMonthly = 0;

      try {
        const billingRows = await prisma.nexus_billing_items.findMany({
          where: { organization_id: workspace.id },
          select: { cadence: true, amount: true },
          take: 500,
        });

        recurringMonthly = (billingRows || [])
          .filter((r) => String(r.cadence || '').toLowerCase() === 'monthly')
          .reduce((sum, r) => sum + toNumberSafe(r.amount), 0);
      } catch (e: unknown) {
        if (!isMissingRelationError(e)) {
          throw e;
        }
      }

      const expectedMonthlyRevenue = Math.round((weightedPipeline + systemInvoicesOpen + misradInvoicesOpenThisMonth + recurringMonthly) * 100) / 100;

      return apiSuccess({
        moduleId: 'finance',
        organizationId: workspace.id,
        expectedMonthlyRevenue,
        breakdown: {
          weightedPipeline,
          systemInvoicesOpenThisMonth: systemInvoicesOpen,
          misradInvoicesOpenThisMonth: misradInvoicesOpenThisMonth,
          recurringMonthly,
        },
      });
    }

    return apiSuccess({ moduleId: moduleId || null, organizationId: workspace.id });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    const msg = getErrorMessage(e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
