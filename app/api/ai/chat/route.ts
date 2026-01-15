import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';
import prisma from '@/lib/prisma';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

function formatHistory(messages: ChatMessage[]): string {
  return messages
    .slice(-20)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').trim()}`)
    .filter(Boolean)
    .join('\n');
}

export const runtime = 'nodejs';

function normalizeModuleId(m: string | null | undefined): string | null {
  const v = String(m || '').trim().toLowerCase();
  if (!v) return null;
  if (['system', 'client', 'nexus', 'finance', 'social', 'global'].includes(v)) return v === 'global' ? null : v;
  return null;
}

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

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      featureKey?: string;
      module?: string;
      orgId?: string;
      context?: any;
      clientContext?: any;
      toneOverride?: string;
      messages?: ChatMessage[];
    };

    const featureKey = String(body.featureKey || 'ai.chat');
    const moduleName = String(body.module || 'global');

    const orgIdFromHeader = req.headers.get('x-org-id') || req.headers.get('x-orgid');
    const orgIdFromBody = body.orgId ? String(body.orgId) : null;
    const requestedOrgId = orgIdFromHeader || orgIdFromBody;

    let organizationId: string | null = null;

    if (requestedOrgId) {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(String(requestedOrgId));
      organizationId = String(workspace.id);
    } else {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('social_users')
        .select('organization_id')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      organizationId = (data as any)?.organization_id ? String((data as any).organization_id) : null;
      if (!organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await requireWorkspaceAccessByOrgSlugApi(organizationId);
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const safeMessages: ChatMessage[] = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => ({ role: m.role, content: String(m.content || '') }));

    const lastUser = [...safeMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const historyText = formatHistory(safeMessages);

    const context = body.context ?? body.clientContext ?? null;
    const contextText = context ? JSON.stringify(context).slice(0, 12000) : '';

    const ai = AIService.getInstance();

    const memoryModuleId = normalizeModuleId(moduleName);

    let moduleSnapshotText = '';
    try {
      if (memoryModuleId === 'system') {
        const hottest = await prisma.systemLead.findFirst({
          where: { organizationId },
          orderBy: [{ isHot: 'desc' }, { score: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true, name: true, status: true, score: true, updatedAt: true },
        });
        moduleSnapshotText = JSON.stringify({
          hottestLead: hottest
            ? {
                id: hottest.id,
                name: hottest.name,
                status: hottest.status,
                score: hottest.score ?? null,
                updatedAt: hottest.updatedAt ? new Date(hottest.updatedAt as any).toISOString() : null,
              }
            : null,
        }).slice(0, 6000);
      } else if (memoryModuleId === 'client') {
        const analyses = await prisma.misradMeetingAnalysisResult.findMany({
          where: { organization_id: organizationId },
          orderBy: { created_at: 'desc' },
          take: 6,
          select: { meeting_id: true, rating: true, created_at: true, meeting: { select: { title: true } }, client: { select: { name: true } } },
        });

        let lastCommitment: any = null;
        for (const a of analyses) {
          const commitments = parseCommitments((a as any).rating || {});
          if (commitments.length) {
            const c = commitments[0];
            lastCommitment = {
              meetingId: String((a as any).meeting_id),
              clientName: (a as any)?.client?.name ? String((a as any).client.name) : null,
              meetingTitle: (a as any)?.meeting?.title ? String((a as any).meeting.title) : null,
              createdAt: new Date((a as any).created_at as any).toISOString(),
              who: c.who,
              what: c.what,
              due: c.due,
            };
            break;
          }
        }

        moduleSnapshotText = JSON.stringify({ lastCommitment }).slice(0, 6000);
      } else if (memoryModuleId === 'finance') {
        const supabase = createClient();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const openLeads = await prisma.systemLead.findMany({
          where: { organizationId },
          select: { value: true, status: true, score: true },
          take: 5000,
        });

        const weightedPipeline = openLeads
          .filter((l: any) => {
            const s = String(l.status || '').toLowerCase();
            return s !== 'won' && s !== 'lost';
          })
          .reduce((sum: number, l: any) => {
            const score = Number(l.score || 0);
            const prob = Math.max(0, Math.min(1, score / 100));
            const value = Number(l.value || 0);
            return sum + value * prob;
          }, 0);

        const systemInvoices = await prisma.systemInvoice.findMany({
          where: {
            lead: { is: { organizationId } },
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
          .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);

        const misradInvoices = await prisma.misradInvoice.findMany({
          where: { organization_id: organizationId },
          select: { amount: true, dueDate: true, status: true },
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
          .reduce((sum: number, inv: any) => sum + Number(inv.amount || 0), 0);

        let recurringMonthly = 0;
        const billing = await supabase.from('nexus_billing_items').select('cadence,amount').eq('organization_id', organizationId).limit(500);
        if (!billing.error && Array.isArray(billing.data)) {
          recurringMonthly = billing.data
            .filter((r: any) => String(r.cadence || '').toLowerCase() === 'monthly')
            .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
        }

        const expectedMonthlyRevenue = Math.round((weightedPipeline + systemInvoicesOpen + misradInvoicesOpenThisMonth + recurringMonthly) * 100) / 100;
        moduleSnapshotText = JSON.stringify({ expectedMonthlyRevenue, breakdown: { weightedPipeline, systemInvoicesOpenThisMonth: systemInvoicesOpen, misradInvoicesOpenThisMonth, recurringMonthly } }).slice(0, 6000);
      }
    } catch {
      moduleSnapshotText = '';
    }
    let memoryHits: Array<{ docKey: string; chunkIndex: number; similarity: number; content: string; metadata: any }> = [];
    try {
      if (lastUser.trim()) {
        const hits = await ai.semanticSearch({
          featureKey: `${featureKey}.semantic_search`,
          organizationId,
          userId: clerkUserId,
          query: lastUser,
          moduleId: memoryModuleId,
          matchCount: 6,
          similarityThreshold: 0.2,
        });
        memoryHits = (hits || []).map((h) => ({
          docKey: h.docKey,
          chunkIndex: h.chunkIndex,
          similarity: h.similarity,
          content: String(h.content || '').slice(0, 700),
          metadata: h.metadata ?? null,
        }));
      }
    } catch {
      memoryHits = [];
    }

    const memoryText = memoryHits.length
      ? memoryHits
          .map((h, i) => `#${i + 1} (${h.similarity.toFixed(3)}) ${h.docKey}\n${h.content}`)
          .join('\n\n')
      : '(none)';

    const request = `מודול: ${moduleName}

UI Snapshot (me-insights):
${moduleSnapshotText || '(none)'}

Organizational Memory (pgvector):
${memoryText}

Context (JSON):
${contextText || '{}'}

History:
${historyText || '(empty)'}

User message:
${lastUser}`;

    await logAuditEvent('ai.query', featureKey, {
      details: {
        organizationId,
        module: moduleName,
        hasContext: Boolean(context),
        memoryHits: memoryHits.length,
      },
    });

    const out = await ai.generateText({
      featureKey,
      organizationId,
      userId: clerkUserId,
      prompt: request,
      meta: {
        module: moduleName,
        toneOverride: body.toneOverride,
      },
    });

    return NextResponse.json({
      text: out.text || '',
      provider: out.provider,
      model: out.model,
      chargedCents: out.chargedCents,
      memory: memoryHits.map((h) => ({
        docKey: h.docKey,
        similarity: h.similarity,
        chunkIndex: h.chunkIndex,
        content: h.content,
        metadata: h.metadata ?? null,
      })),
    });
  } catch (e: any) {
    if (e?.status === 402 || e?.name === 'UpgradeRequiredError') {
      return NextResponse.json({ error: e?.message || 'Upgrade Required' }, { status: 402 });
    }
    return NextResponse.json({ error: e?.message ?? 'Chat failed' }, { status: 500 });
  }
}

export const POST = shabbatGuard(POSTHandler);
