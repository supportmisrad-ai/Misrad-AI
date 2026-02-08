import 'server-only';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { asObject } from '@/lib/server/workspace-access/utils';

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  if (value == null) return {};
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => toJsonInput(v));

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toJsonInput(v);
  }
  return out;
}

export async function createClinicSessionForOrganizationId(params: {
  organizationId: string;
  clientId: string;
  startAt: string;
  endAt?: string | null;
  status?: string;
  sessionType?: string | null;
  location?: string | null;
  summary?: string | null;
  createdBy?: string | null;
  metadata?: unknown;
}): Promise<{ id: string }> {
  const organizationId = String(params.organizationId || '').trim();
  const clientId = String(params.clientId || '').trim();
  const startAt = String(params.startAt || '').trim();

  if (!organizationId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!startAt) throw new Error('startAt is required');

  const created = await prisma.clientSession.create({
    data: {
      organizationId,
      clientId,
      startAt: new Date(startAt),
      endAt: params.endAt ? new Date(params.endAt) : null,
      status: params.status ?? 'scheduled',
      sessionType: params.sessionType ?? null,
      location: params.location ?? null,
      summary: params.summary ?? null,
      createdBy: params.createdBy ?? null,
      metadata: toJsonInput(params.metadata),
    },
    select: { id: true },
  });

  if (!created?.id) throw new Error('Failed to create session');
  return { id: created.id };
}
