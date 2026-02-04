import { apiError, apiSuccess } from '@/lib/server/api-response';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { AIService } from '@/lib/services/ai/AIService';
import { Prisma } from '@prisma/client';
import { getOrgKeyOrThrow, getWorkspaceByOrgKeyOrThrow } from '@/lib/server/api-workspace';

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

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : String(error ?? '');
}

function safeJson(obj: unknown): string {
  try {
    return JSON.stringify(obj ?? {});
  } catch {
    return '{}';
  }
}

async function POSTHandler(req: Request) {
  try {
    await requireSuperAdmin();

    const orgKey = getOrgKeyOrThrow(req);

    const rawBody: unknown = await req.json().catch(() => ({}));
    const bodyObj = asObject(rawBody) ?? {};

    if (bodyObj.organizationId != null) {
      return apiError('organizationId must be provided via x-org-id header', { status: 400 });
    }

    const includeObj = asObject(bodyObj.include) ?? {};
    const includeSystemLeads = includeObj.systemLeads !== false;
    const includeNexusClients = includeObj.nexusClients !== false;
    const batchSize = Math.max(1, Math.min(500, Math.floor(Number(bodyObj.limitPerType ?? 200))));

    const ai = AIService.getInstance();

    const normalizedOrgKey = String(orgKey || '').trim();
    const isAll = normalizedOrgKey.toLowerCase() === 'all';
    const orgIds: string[] = isAll
      ? (await prisma.social_organizations.findMany({ select: { id: true }, orderBy: { created_at: 'asc' } })).map((o) => String(o.id))
      : [String((await getWorkspaceByOrgKeyOrThrow(normalizedOrgKey)).workspaceId)];

    const results: {
      organizationId: string;
      organizationsProcessed: number;
      systemLeads: { attempted: number; succeeded: number; failed: number };
      nexusClients: { attempted: number; succeeded: number; failed: number };
      errors: Array<{ source_type: string; source_id: string; message: string }>;
    } = {
      organizationId: isAll ? 'all' : String(orgIds[0] || ''),
      organizationsProcessed: orgIds.length,
      systemLeads: { attempted: 0, succeeded: 0, failed: 0 },
      nexusClients: { attempted: 0, succeeded: 0, failed: 0 },
      errors: [] as Array<{ source_type: string; source_id: string; message: string }>,
    };

    for (const orgId of orgIds) {
      if (includeSystemLeads) {
        let cursorId: string | null = null;
        while (true) {
          const leadArgs: Prisma.SystemLeadFindManyArgs = {
            where: { organizationId: orgId },
            orderBy: { id: 'asc' },
            take: batchSize,
          };
          if (cursorId) {
            leadArgs.cursor = { id: cursorId };
            leadArgs.skip = 1;
          }

          const leads = await prisma.systemLead.findMany(leadArgs);

          if (!leads || leads.length === 0) break;

          for (const lead of leads) {
            results.systemLeads.attempted++;
            const sourceId = String(lead.id);

            const doc = {
              id: sourceId,
              name: lead.name,
              company: lead.company ?? null,
              email: lead.email ?? null,
              phone: lead.phone ?? null,
              status: lead.status,
              source: lead.source,
              value: lead.value ?? null,
              isHot: lead.isHot ?? null,
              score: lead.score ?? null,
              productInterest: lead.productInterest ?? null,
              playbookStep: lead.playbookStep ?? null,
              lastContact: lead.lastContact ? new Date(lead.lastContact).toISOString() : null,
              createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : null,
              updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : null,
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
            } catch (e: unknown) {
              results.systemLeads.failed++;
              results.errors.push({ source_type: 'system_leads', source_id: sourceId, message: getErrorMessage(e) });
            }
          }

          cursorId = String(leads[leads.length - 1].id);
          if (leads.length < batchSize) break;
        }
      }

      if (includeNexusClients) {
        let cursorId: string | null = null;
        while (true) {
          const clientArgs: Prisma.NexusClientFindManyArgs = {
            where: { organizationId: orgId },
            orderBy: { id: 'asc' },
            take: batchSize,
          };
          if (cursorId) {
            clientArgs.cursor = { id: cursorId };
            clientArgs.skip = 1;
          }

          const clients = await prisma.nexusClient.findMany(clientArgs);

          if (!clients || clients.length === 0) break;

          for (const client of clients) {
            results.nexusClients.attempted++;
            const sourceId = String(client.id);

            const doc = {
              id: sourceId,
              name: client.name,
              companyName: client.companyName,
              contactPerson: client.contactPerson,
              email: client.email,
              phone: client.phone,
              status: client.status,
              package: client.package ?? null,
              source: client.source ?? null,
              joinedAt: client.joinedAt ? new Date(client.joinedAt).toISOString() : null,
              createdAt: client.createdAt ? new Date(client.createdAt).toISOString() : null,
              updatedAt: client.updatedAt ? new Date(client.updatedAt).toISOString() : null,
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
            } catch (e: unknown) {
              results.nexusClients.failed++;
              results.errors.push({ source_type: 'nexus_clients', source_id: sourceId, message: getErrorMessage(e) });
            }
          }

          cursorId = String(clients[clients.length - 1].id);
          if (clients.length < batchSize) break;
        }
      }
    }

    return apiSuccess(results);
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg.toLowerCase().includes('forbidden') ? 403 : msg.toLowerCase().includes('unauthorized') ? 401 : 500;
    return apiError(e, { status });
  }
}

export const POST = shabbatGuard(POSTHandler);
