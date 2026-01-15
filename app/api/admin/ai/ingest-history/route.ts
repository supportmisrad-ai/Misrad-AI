import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { AIService } from '@/lib/services/ai/AIService';

import { shabbatGuard } from '@/lib/api-shabbat-guard';
export const runtime = 'nodejs';

type IngestHistoryRequest = {
  organizationId: string;
  include?: {
    systemLeads?: boolean;
    nexusClients?: boolean;
  };
  limitPerType?: number;
};

function safeJson(obj: any): string {
  try {
    return JSON.stringify(obj ?? {});
  } catch {
    return '{}';
  }
}

async function POSTHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const body = (await req.json().catch(() => ({}))) as IngestHistoryRequest;
    const organizationId = String(body.organizationId || '').trim();
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const includeSystemLeads = body.include?.systemLeads !== false;
    const includeNexusClients = body.include?.nexusClients !== false;
    const batchSize = Math.max(1, Math.min(500, Math.floor(body.limitPerType ?? 200)));

    const ai = AIService.getInstance();

    const orgIds: string[] =
      organizationId.toLowerCase() === 'all'
        ? (await prisma.social_organizations.findMany({ select: { id: true }, orderBy: { created_at: 'asc' } })).map((o: any) => String(o.id))
        : [organizationId];

    const results: any = {
      organizationId,
      organizationsProcessed: orgIds.length,
      systemLeads: { attempted: 0, succeeded: 0, failed: 0 },
      nexusClients: { attempted: 0, succeeded: 0, failed: 0 },
      errors: [] as Array<{ source_type: string; source_id: string; message: string }>,
    };

    for (const orgId of orgIds) {
      if (includeSystemLeads) {
        let cursorId: string | null = null;
        while (true) {
          const leadArgs: any = {
            where: { organizationId: orgId },
            orderBy: { id: 'asc' },
            take: batchSize,
          };
          if (cursorId) {
            leadArgs.cursor = { id: cursorId };
            leadArgs.skip = 1;
          }

          const leads: any[] = await prisma.systemLead.findMany(leadArgs);

          if (!leads || leads.length === 0) break;

          for (const lead of leads) {
            results.systemLeads.attempted++;
            const sourceId = String((lead as any).id);

            const doc = {
              id: sourceId,
              name: (lead as any).name,
              company: (lead as any).company ?? null,
              email: (lead as any).email ?? null,
              phone: (lead as any).phone ?? null,
              status: (lead as any).status,
              source: (lead as any).source,
              value: (lead as any).value ?? null,
              isHot: (lead as any).isHot ?? null,
              score: (lead as any).score ?? null,
              productInterest: (lead as any).productInterest ?? null,
              playbookStep: (lead as any).playbookStep ?? null,
              lastContact: (lead as any).lastContact ? new Date((lead as any).lastContact).toISOString() : null,
              createdAt: (lead as any).createdAt ? new Date((lead as any).createdAt).toISOString() : null,
              updatedAt: (lead as any).updatedAt ? new Date((lead as any).updatedAt).toISOString() : null,
            };

            try {
              await ai.ingestText({
                featureKey: 'ai.memory.history_ingest',
                organizationId: orgId,
                moduleId: 'system',
                docKey: `system:system_leads:${sourceId}`,
                text: `System lead\n${safeJson(doc)}`,
                isPublicInOrg: true,
                metadata: {
                  source_type: 'system_leads',
                  source_id: sourceId,
                  module: 'system',
                  organization_id: orgId,
                  doc_kind: 'entity',
                },
              });
              results.systemLeads.succeeded++;
            } catch (e: any) {
              results.systemLeads.failed++;
              results.errors.push({ source_type: 'system_leads', source_id: sourceId, message: String(e?.message || e) });
            }
          }

          cursorId = String((leads[leads.length - 1] as any).id);
          if (leads.length < batchSize) break;
        }
      }

      if (includeNexusClients) {
        let cursorId: string | null = null;
        while (true) {
          const clientArgs: any = {
            where: { organizationId: orgId },
            orderBy: { id: 'asc' },
            take: batchSize,
          };
          if (cursorId) {
            clientArgs.cursor = { id: cursorId };
            clientArgs.skip = 1;
          }

          const clients: any[] = await prisma.nexusClient.findMany(clientArgs);

          if (!clients || clients.length === 0) break;

          for (const client of clients) {
            results.nexusClients.attempted++;
            const sourceId = String((client as any).id);

            const doc = {
              id: sourceId,
              name: (client as any).name,
              companyName: (client as any).companyName,
              contactPerson: (client as any).contactPerson,
              email: (client as any).email,
              phone: (client as any).phone,
              status: (client as any).status,
              package: (client as any).package ?? null,
              source: (client as any).source ?? null,
              joinedAt: (client as any).joinedAt ? new Date((client as any).joinedAt).toISOString() : null,
              createdAt: (client as any).createdAt ? new Date((client as any).createdAt).toISOString() : null,
              updatedAt: (client as any).updatedAt ? new Date((client as any).updatedAt).toISOString() : null,
            };

            try {
              await ai.ingestText({
                featureKey: 'ai.memory.history_ingest',
                organizationId: orgId,
                moduleId: 'nexus',
                docKey: `nexus:nexus_clients:${sourceId}`,
                text: `Nexus client\n${safeJson(doc)}`,
                isPublicInOrg: true,
                metadata: {
                  source_type: 'nexus_clients',
                  source_id: sourceId,
                  module: 'nexus',
                  organization_id: orgId,
                  doc_kind: 'entity',
                },
              });
              results.nexusClients.succeeded++;
            } catch (e: any) {
              results.nexusClients.failed++;
              results.errors.push({ source_type: 'nexus_clients', source_id: sourceId, message: String(e?.message || e) });
            }
          }

          cursorId = String((clients[clients.length - 1] as any).id);
          if (clients.length < batchSize) break;
        }
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export const POST = shabbatGuard(POSTHandler);
