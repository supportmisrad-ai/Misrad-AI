import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { getAuthenticatedUser } from '@/lib/auth';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { logAuditEvent } from '@/lib/audit';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
type IncomingMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
  text?: string;
};

function extractText(msg: IncomingMessage): string {
  if (typeof (msg as any)?.content === 'string') return String((msg as any).content);
  if (typeof (msg as any)?.text === 'string') return String((msg as any).text);
  const parts = Array.isArray(msg.parts) ? msg.parts : [];
  return parts
    .filter((p) => p && p.type === 'text')
    .map((p) => String(p.text || ''))
    .join('');
}

function streamTextResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

async function POSTHandler(req: Request) {
  try {
    await getAuthenticatedUser();

    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIdFromHeader = req.headers.get('x-org-id') || req.headers.get('x-orgid');

    const { messages, clientContext }: {
      messages: IncomingMessage[];
      clientContext?: {
        companyName: string;
        name: string;
        brandVoice: string;
        dna?: {
          brandSummary?: string;
          voice?: {
            formal: number;
            funny: number;
            length: number;
          };
          vocabulary?: {
            loved: string[];
            forbidden: string[];
          };
        };
      };
    } = await req.json();

    let orgKeyFromBody: string | null = null;
    const rawFromCtx = (clientContext as any)?.organizationId;
    if (rawFromCtx) orgKeyFromBody = String(rawFromCtx);

    let organizationKey: string | null = orgIdFromHeader || orgKeyFromBody;

    if (!organizationKey) {
      const supabase = createClient();
      const { data } = await supabase
        .from('social_users')
        .select('organization_id')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      organizationKey = (data as any)?.organization_id ? String((data as any).organization_id) : null;
    }

    if (!organizationKey) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });

    let workspaceId: string;
    try {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(organizationKey);
      workspaceId = String(workspace.id);
    } catch (e: any) {
      const status = typeof e?.status === 'number' ? e.status : 403;
      return NextResponse.json({ error: e?.message || 'Forbidden' }, { status });
    }

    const safeMessages = Array.isArray(messages) ? messages : [];
    const coreMessages = safeMessages.filter((m) => m.id !== 'welcome').map((m) => ({
      role: m.role,
      content: extractText(m),
    }));

    const lastUser = [...coreMessages].reverse().find((m) => m.role === 'user')?.content || '';
    const history = coreMessages.slice(-20).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    const ctx = clientContext ? {
      companyName: clientContext.companyName,
      name: clientContext.name,
      brandVoice: clientContext.brandVoice,
      dna: clientContext.dna,
    } : null;

    const featureKey = ctx ? 'social.chat' : 'ai.chat';
    const moduleName = ctx ? 'social' : 'global';

    await logAuditEvent('ai.query', featureKey, {
      details: {
        organizationId: workspaceId,
        module: moduleName,
        hasClientContext: Boolean(ctx),
      },
    });

    let memoryBlock = '';
    try {
      const ai = AIService.getInstance();
      const memory = await ai.semanticSearch({
        featureKey: `${featureKey}.memory_search`,
        organizationId: workspaceId,
        userId: clerkUserId,
        query: `${lastUser}\n\n${history}`.slice(0, 6000),
        moduleId: moduleName,
        matchCount: 8,
        similarityThreshold: 0.2,
      });

      const compact = memory
        .slice(0, 6)
        .map((m) => ({
          docKey: m.docKey,
          similarity: m.similarity,
          content: String(m.content || '').slice(0, 900),
          metadata: m.metadata ?? null,
        }));

      if (compact.length > 0) {
        memoryBlock = `\n\nMemory snippets (from organizational knowledge base):\n${JSON.stringify(compact).slice(0, 12000)}`;
      }
    } catch (e: any) {
      console.warn('[chat] semantic memory skipped/failed (non-fatal)', {
        message: String(e?.message || e),
      });
    }

    const prompt = `מודול: ${moduleName}\n\nContext (JSON):\n${ctx ? JSON.stringify(ctx).slice(0, 12000) : '{}'}\n\nHistory:\n${history || '(empty)'}${memoryBlock}\n\nUser message:\n${lastUser}`;

    const ai = AIService.getInstance();
    const out = await ai.generateText({
      featureKey,
      organizationId: workspaceId,
      userId: clerkUserId,
      prompt,
    });

    return streamTextResponse(out.text || '');
  } catch (error: any) {
    console.error('Chat API error:', error);
    if (error?.status === 402 || error?.name === 'UpgradeRequiredError') {
      return NextResponse.json({ error: error.message || 'Upgrade Required' }, { status: 402 });
    }
    return new Response(
      JSON.stringify({ error: error.message || 'שגיאה בטעינת הבוט. נסה שוב מאוחר יותר.' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export const POST = shabbatGuard(POSTHandler);
