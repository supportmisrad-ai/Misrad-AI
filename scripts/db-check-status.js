#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvLocalOnly() {
  const fullPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(fullPath)) {
    console.error('[db-check-status] .env.local not found; using process.env only.');
    return;
  }
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
}

function parseDbIdentity(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    const database = u.pathname ? String(u.pathname).replace(/^\//, '') : '';
    return {
      host: u.hostname || null,
      port: Number.isFinite(port) ? port : 5432,
      database: database || null,
      user: u.username ? decodeURIComponent(u.username) : null,
    };
  } catch {
    return null;
  }
}

loadEnvLocalOnly();

const dbId = parseDbIdentity(process.env.DATABASE_URL);
if (dbId) {
  console.error(
    `[db-check-status] DATABASE_URL -> host=${dbId.host} port=${dbId.port} db=${dbId.database ?? 'unknown'} user=${dbId.user ?? 'unknown'}`
  );
} else {
  console.error('[db-check-status] DATABASE_URL -> (missing/invalid)');
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${tableName}') AS exists;`
  );
  return Boolean(rows?.[0]?.exists);
}

async function main() {
  try {
    const hasMigrations = await tableExists('_prisma_migrations');

    const orgCount = await prisma.social_organizations.count();
    const userCount = await prisma.organizationUser.count();

    console.log('\n📊 DB Status');
    console.log('='.repeat(60));
    console.log(`Organizations: ${orgCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Has _prisma_migrations: ${hasMigrations ? 'YES' : 'NO'}`);

    const orgs = await prisma.social_organizations.findMany({
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        slug: true,
        name: true,
        subscription_status: true,
        subscription_plan: true,
        trial_days: true,
        has_nexus: true,
        has_social: true,
        has_system: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
        created_at: true,
      },
    });

    console.log('\n🏢 Organizations (latest 20)');
    console.log('='.repeat(60));
    if (!orgs.length) {
      console.log('(none)');
    } else {
      for (const o of orgs) {
        const modules = [
          o.has_nexus ? 'N' : '-',
          o.has_social ? 'S' : '-',
          o.has_system ? 'Y' : '-',
          o.has_finance ? 'F' : '-',
          o.has_client ? 'C' : '-',
          o.has_operations ? 'O' : '-',
        ].join('');

        console.log(`${o.name} (${o.slug || o.id})`);
        console.log(`  status=${o.subscription_status || 'n/a'} plan=${o.subscription_plan || 'n/a'} trial_days=${o.trial_days ?? 'n/a'} modules=${modules}`);
      }
    }

    const statusAgg = await prisma.social_organizations.groupBy({
      by: ['subscription_status'],
      _count: { _all: true },
      orderBy: { subscription_status: 'asc' },
    });

    console.log('\n📈 By subscription_status');
    console.log('='.repeat(60));
    for (const row of statusAgg) {
      console.log(`${row.subscription_status || 'null'}: ${row._count._all}`);
    }

    const planAgg = await prisma.social_organizations.groupBy({
      by: ['subscription_plan'],
      _count: { _all: true },
      orderBy: { subscription_plan: 'asc' },
    });

    console.log('\n📈 By subscription_plan');
    console.log('='.repeat(60));
    for (const row of planAgg) {
      console.log(`${row.subscription_plan || 'null'}: ${row._count._all}`);
    }

    if (hasMigrations) {
      const last = await prisma.$queryRawUnsafe(
        "SELECT migration_name, finished_at FROM public._prisma_migrations ORDER BY finished_at DESC NULLS LAST LIMIT 5;"
      );

      console.log('\n📜 Last 5 migrations');
      console.log('='.repeat(60));
      for (const r of Array.isArray(last) ? last : []) {
        console.log(`${r.migration_name}${r.finished_at ? ` -> ${r.finished_at}` : ''}`);
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');
  } catch (e) {
    console.error('[db-check-status] failed:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
