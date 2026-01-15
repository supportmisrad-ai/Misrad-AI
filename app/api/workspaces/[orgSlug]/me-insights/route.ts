import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug } = await params;
    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
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

      return NextResponse.json({
        success: true,
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

      return NextResponse.json({
        success: true,
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

      const openLeads = await prisma.systemLead.findMany({
        where: { organizationId: workspace.id },
        select: { value: true, status: true, score: true },
        take: 5000,
      });

      const weightedPipeline = openLeads
        .filter((l) => {
          const s = String((l as any).status || '').toLowerCase();
          return s !== 'won' && s !== 'lost';
        })
        .reduce((sum, l: any) => {
          const score = Number(l.score || 0);
          const prob = Math.max(0, Math.min(1, score / 100));
          const value = Number(l.value || 0);
          return sum + value * prob;
        }, 0);

      const systemInvoices = await prisma.systemInvoice.findMany({
        where: {
          lead: { is: { organizationId: workspace.id } },
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
        select: { amount: true, status: true },
        take: 5000,
      });

      const systemInvoicesOpen = systemInvoices
        .filter((inv: any) => {
          const s = String(inv.status || '').toLowerCase();
          if (!s) return true;
          if (s.includes('paid') || s.includes('settled') || s.includes('complete')) return false;
          if (s.includes('void') || s.includes('cancel')) return false;
          return true;
        })
        .reduce((sum, inv: any) => sum + Number(inv.amount || 0), 0);

      const misradInvoices = await prisma.misradInvoice.findMany({
        where: { organization_id: workspace.id },
        select: { amount: true, dueDate: true, status: true, created_at: true },
        take: 500,
        orderBy: { created_at: 'desc' },
      });

      const misradInvoicesOpenThisMonth = (misradInvoices || [])
        .filter((inv: any) => {
          const status = String(inv.status || '').toUpperCase();
          if (status === 'PAID') return false;
          const due = new Date(String(inv.dueDate || ''));
          if (!Number.isFinite(due.getTime())) return false;
          return due >= startOfMonth && due < startOfNextMonth;
        })
        .reduce((sum, inv: any) => sum + Number(inv.amount || 0), 0);

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

      return NextResponse.json({
        success: true,
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

    return NextResponse.json({ success: true, moduleId: moduleId || null, organizationId: workspace.id });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const GET = shabbatGuard(GETHandler);
