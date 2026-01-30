import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { APIError, getWorkspaceContextOrThrow } from '@/lib/server/api-workspace';
import { queryRawOrgScoped } from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function parseCommitments(rating: any): Array<{ who: string; what: string; due: string }> {
  const commitments = rating?.commitments;
  if (!Array.isArray(commitments)) return [];
  return commitments
    .map((c: any) => ({
      who: asString(c?.who || '').trim(),
      what: asString(c?.what || '').trim(),
      due: asString(c?.due || '').trim(),
    }))
    .filter((c) => c.who || c.what || c.due);
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

    const supabase = createClient();

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

      const { count: indexedLeadsCount } = await supabase
        .from('ai_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', workspace.id)
        .eq('module_id', 'system')
        .like('doc_key', 'system:system_leads:%');

      const docKeys = hotLeads.map((l) => `system:system_leads:${l.id}`);
      const { data: embeddedKeys } = await supabase
        .from('ai_embeddings')
        .select('doc_key')
        .eq('organization_id', workspace.id)
        .eq('module_id', 'system')
        .in('doc_key', docKeys)
        .limit(200);

      const embeddedKeySet = new Set((embeddedKeys || []).map((r: any) => String(r.doc_key || '')));

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
      const { data: embeddedMeetings } = await supabase
        .from('ai_embeddings')
        .select('doc_key')
        .eq('organization_id', workspace.id)
        .eq('module_id', 'client')
        .in('doc_key', meetingDocKeys)
        .limit(500);

      const embeddedMeetingSet = new Set((embeddedMeetings || []).map((r: any) => String(r.doc_key || '')));

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
        const rating: any = a.rating || {};
        const warmthRaw = rating?.relationshipWarmth;
        const warmthNum = typeof warmthRaw === 'number' ? warmthRaw : Number(warmthRaw);
        if (Number.isFinite(warmthNum)) warmthValues.push(warmthNum);

        const commitments = parseCommitments(rating);
        for (const c of commitments) {
          const row = {
            meetingId: String(a.meeting_id),
            clientName: (a as any)?.client?.name ? String((a as any).client.name) : null,
            meetingTitle: (a as any)?.meeting?.title ? String((a as any).meeting.title) : null,
            createdAt: new Date(a.created_at as any).toISOString(),
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

      const { count: indexedMeetingsCount } = await supabase
        .from('ai_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', workspace.id)
        .eq('module_id', 'client')
        .like('doc_key', 'client:meeting:%');

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
      const isMissingRelationError = (error: any): boolean => {
        const message = String(error?.message || '').toLowerCase();
        const code = String((error as any)?.code || '').toLowerCase();
        return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
      };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const toNumberSafe = (v: any): number => {
        if (v == null) return 0;
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        if (typeof v === 'bigint') return Number(v);
        if (typeof v === 'string') {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        }
        if (typeof (v as any)?.toNumber === 'function') {
          const n = (v as any).toNumber();
          return Number.isFinite(n) ? n : 0;
        }
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const [weightedPipelineRow] = await queryRawOrgScoped<Array<{ weighted_pipeline: any }>>(prisma, {
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

      const [systemInvoicesOpenRow] = await queryRawOrgScoped<Array<{ open_sum: any }>>(prisma, {
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

      const [misradInvoicesOpenRow] = await queryRawOrgScoped<Array<{ open_sum: any }>>(prisma, {
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
      const billing = await supabase.from('nexus_billing_items').select('cadence,amount').eq('organization_id', workspace.id).limit(500);
      if (billing.error) {
        if (!isMissingRelationError(billing.error)) {
          throw new Error(billing.error.message);
        }
      } else if (Array.isArray(billing.data)) {
        recurringMonthly = billing.data
          .filter((r: any) => String(r.cadence || '').toLowerCase() === 'monthly')
          .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
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
  } catch (e: any) {
    if (e instanceof APIError) {
      return apiError(e.message || 'Forbidden', { status: e.status });
    }
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
