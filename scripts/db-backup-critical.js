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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countRows(table) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${table}`);
  return Number(rows?.[0]?.count || 0);
}

async function main() {
  console.log('🔄 Creating backup tables...');

  try {
    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS _backup');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS _backup.organizations');
    await prisma.$executeRawUnsafe('CREATE TABLE _backup.organizations AS SELECT * FROM public.organizations');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS _backup.nexus_users');
    await prisma.$executeRawUnsafe('CREATE TABLE _backup.nexus_users AS SELECT * FROM public.nexus_users');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS _backup.social_users');
    await prisma.$executeRawUnsafe('CREATE TABLE _backup.social_users AS SELECT * FROM public.social_users');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS _backup.profiles');
    await prisma.$executeRawUnsafe('CREATE TABLE _backup.profiles AS SELECT * FROM public.profiles');

    const orgs = await countRows('_backup.organizations');
    const nexusUsers = await countRows('_backup.nexus_users');
    const socialUsers = await countRows('_backup.social_users');
    const profiles = await countRows('_backup.profiles');

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
