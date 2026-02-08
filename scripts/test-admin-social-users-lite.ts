import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import {
  installPrismaTenantGuard,
  withPrismaTenantIsolationOverride,
  withTenantIsolationContext,
} from '../lib/prisma-tenant-guard';

function loadEnvLocalOnly(): void {
  const fullPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(fullPath)) {
    throw new Error('[test-admin-social-users-lite] .env.local not found; cannot continue.');
  }
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
}

async function main(): Promise<void> {
  loadEnvLocalOnly();

  const prisma = new PrismaClient();
  installPrismaTenantGuard(prisma);

  try {
    const query = String(process.argv[2] || '').trim();
    const limitArg = Number(process.argv[3] || 50);
    const limit = Number.isFinite(limitArg) ? Math.min(Math.max(limitArg, 1), 500) : 50;

    const data = await withTenantIsolationContext(
      {
        suppressReporting: true,
        source: 'test-admin-social-users-lite',
        mode: 'global_admin',
        isSuperAdmin: true,
      },
      async () => {
        return await prisma.social_users.findMany(
          withPrismaTenantIsolationOverride(
            {
              where: query
                ? {
                    OR: [
                      { email: { contains: query, mode: 'insensitive' as const } },
                      { full_name: { contains: query, mode: 'insensitive' as const } },
                      { clerk_user_id: { contains: query, mode: 'insensitive' as const } },
                    ],
                  }
                : undefined,
              select: { id: true, clerk_user_id: true, email: true, full_name: true, role: true, organization_id: true },
              orderBy: { created_at: 'desc' as const },
              take: limit,
            },
            { suppressReporting: true, reason: 'test_admin_social_users_lite' }
          )
        );
      }
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          count: Array.isArray(data) ? data.length : 0,
          sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[test-admin-social-users-lite] Failed: ${msg}`);
  process.exitCode = 1;
});
