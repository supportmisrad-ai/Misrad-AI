import 'server-only';

import prisma, { executeRawOrgScoped, prismaForInteractiveTransaction, queryRawAllowlisted, queryRawOrgScoped } from '@/lib/prisma';

export { prisma, prismaForInteractiveTransaction };

const OPERATIONS_RAW_REASON = 'operations_raw_sql';

export async function orgQuery<T>(db: unknown, organizationId: string, query: string, values: unknown[]): Promise<T> {
  return queryRawOrgScoped<T>(db, {
    organizationId,
    reason: OPERATIONS_RAW_REASON,
    query,
    values,
  });
}

export async function orgExec(db: unknown, organizationId: string, query: string, values: unknown[]): Promise<number> {
  return executeRawOrgScoped(db, {
    organizationId,
    reason: OPERATIONS_RAW_REASON,
    query,
    values,
  });
}

export async function allowlistedQuery<T>(params: { reason: string; query: string; values: unknown[] }): Promise<T> {
  return queryRawAllowlisted<T>(prisma, {
    reason: params.reason,
    query: params.query,
    values: params.values,
  });
}
