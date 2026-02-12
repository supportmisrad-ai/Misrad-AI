#!/usr/bin/env node

const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  } catch (e) {
    console.error(`[db-backup-critical] Failed to load ${envPath}:`, e);
    process.exit(1);
  }
}

const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRaw(
    Prisma.sql`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=${String(
      tableName
    )}) AS exists;`
  );
  return Boolean(rows?.[0]?.exists);
}

function assertSafeTableName(table) {
  const t = String(table || '').trim();
  if (!t) throw new Error('Missing table name');
  if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?$/.test(t)) {
    throw new Error(`Invalid table name: ${t}`);
  }
  return t;
}

async function countRows(table) {
  const safeTable = assertSafeTableName(table);
  const rows = await prisma.$queryRaw(Prisma.sql`SELECT COUNT(*)::int AS count FROM ${Prisma.raw(safeTable)}`);
  return Number(rows?.[0]?.count || 0);
}

async function main() {
  console.log('🔄 Creating backup tables...');

  try {
    await prisma.$executeRaw(Prisma.sql`CREATE SCHEMA IF NOT EXISTS _backup`);

    const hasOrganizations = await tableExists('organizations');
    if (hasOrganizations) {
      await prisma.$executeRaw(Prisma.sql`DROP TABLE IF EXISTS ${Prisma.raw('_backup.organizations')}`);
      await prisma.$executeRaw(
        Prisma.sql`CREATE TABLE ${Prisma.raw('_backup.organizations')} AS SELECT * FROM ${Prisma.raw('public.organizations')}`
      );
    }

    const hasNexusUsers = await tableExists('nexus_users');
    if (hasNexusUsers) {
      await prisma.$executeRaw(Prisma.sql`DROP TABLE IF EXISTS ${Prisma.raw('_backup.nexus_users')}`);
      await prisma.$executeRaw(
        Prisma.sql`CREATE TABLE ${Prisma.raw('_backup.nexus_users')} AS SELECT * FROM ${Prisma.raw('public.nexus_users')}`
      );
    }

    const hasOrgUsers = await tableExists('organization_users');
    const hasSocialUsers = await tableExists('social_users');
    const usersSourceTable = hasOrgUsers ? 'organization_users' : hasSocialUsers ? 'social_users' : null;
    if (usersSourceTable) {
      await prisma.$executeRaw(Prisma.sql`DROP TABLE IF EXISTS ${Prisma.raw('_backup.organization_users')}`);
      await prisma.$executeRaw(
        Prisma.sql`CREATE TABLE ${Prisma.raw('_backup.organization_users')} AS SELECT * FROM ${Prisma.raw(
          `public.${usersSourceTable}`
        )}`
      );
    }

    const hasProfiles = await tableExists('profiles');
    if (hasProfiles) {
      await prisma.$executeRaw(Prisma.sql`DROP TABLE IF EXISTS ${Prisma.raw('_backup.profiles')}`);
      await prisma.$executeRaw(
        Prisma.sql`CREATE TABLE ${Prisma.raw('_backup.profiles')} AS SELECT * FROM ${Prisma.raw('public.profiles')}`
      );
    }

    const orgs = hasOrganizations ? await countRows('_backup.organizations') : null;
    const nexusUsers = hasNexusUsers ? await countRows('_backup.nexus_users') : null;
    const socialUsers = usersSourceTable ? await countRows('_backup.organization_users') : null;
    const profiles = hasProfiles ? await countRows('_backup.profiles') : null;

    console.log('✅ Organizations backed up:', orgs);
    console.log('✅ Nexus Users backed up:', nexusUsers);
    console.log('✅ Social Users backed up:', socialUsers);
    console.log('✅ Profiles backed up:', profiles);

    console.log('🎯 Backup complete! Schema: _backup');
  } catch (error) {
    console.error('❌ Backup failed:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
