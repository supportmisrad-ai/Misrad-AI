/**
 * Prisma Client Singleton
 * 
 * This file ensures we only create one instance of Prisma Client
 * to avoid connection pool exhaustion in development (hot-reload)
 * 
 * Usage:
 *   import prisma from '@/lib/prisma';
 *   const users = await prisma.nexusUser.findMany();
 */

import { PrismaClient } from '@prisma/client';

type _PrismaClientSanity = {
  systemLead: PrismaClient['systemLead'];
  nexusTask: PrismaClient['nexusTask'];
};

type _SystemLeadWhere = Parameters<_PrismaClientSanity['systemLead']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _SystemLeadCreateData = Parameters<_PrismaClientSanity['systemLead']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _Assert<T extends true> = T;
type _HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

// If these fail, Prisma Client was generated from a schema that doesn't match prisma/schema.prisma.
// Fix by running: npm run prisma:generate (and restart TS server).
type _AssertSystemLeadWhereHasOrgId = _Assert<_HasKey<NonNullable<_SystemLeadWhere>, 'organizationId'>>;
type _AssertSystemLeadCreateHasOrgId = _Assert<_HasKey<_SystemLeadCreateData, 'organizationId'>>;

type _NexusTaskWhere = Parameters<_PrismaClientSanity['nexusTask']['findMany']>[0] extends {
  where?: infer W;
}
  ? W
  : never;

type _NexusTaskCreateData = Parameters<_PrismaClientSanity['nexusTask']['create']>[0] extends {
  data: infer D;
}
  ? D
  : never;

type _AssertNexusTaskWhereHasOrgId = _Assert<_HasKey<NonNullable<_NexusTaskWhere>, 'organizationId'>>;
type _AssertNexusTaskCreateHasOrgId = _Assert<_HasKey<_NexusTaskCreateData, 'organizationId'>>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

