#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFileSilent(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  return true;
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('-')) return null;
  return v;
}

const explicitEnv = getArgValue('--env');
if (explicitEnv) {
  loadEnvFileSilent(explicitEnv);
} else {
  const loaded = loadEnvFileSilent('.env.local');
  if (!loaded) {
    console.error('[show-db-connection] .env.local not found; using process.env only.');
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${tableName}'
    ) AS exists`
  );
  return Boolean(rows?.[0]?.exists);
}

async function main() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const directUrl = process.env.DIRECT_URL || '';
    
    console.log('\n📊 Environment Variables:');
    console.log('='.repeat(60));
    
    // Parse DATABASE_URL
    if (dbUrl) {
      try {
        const u = new URL(dbUrl);
        console.log('\n🔗 DATABASE_URL:');
        console.log(`   Host: ${u.hostname}`);
        console.log(`   Port: ${u.port || '5432'}`);
        console.log(`   Database: ${u.pathname.slice(1)}`);
        console.log(`   User: ${u.username}`);
        console.log(`   Full: ${u.hostname}:${u.port || '5432'}${u.pathname}`);
      } catch (e) {
        console.log('\n🔗 DATABASE_URL: (invalid format)');
        console.log(`   ${dbUrl.substring(0, 50)}...`);
      }
    }
    
    if (directUrl && directUrl !== dbUrl) {
      try {
        const u = new URL(directUrl);
        console.log('\n🔗 DIRECT_URL:');
        console.log(`   Host: ${u.hostname}`);
        console.log(`   Port: ${u.port || '5432'}`);
        console.log(`   Database: ${u.pathname.slice(1)}`);
        console.log(`   User: ${u.username}`);
      } catch {}
    }
    
    // Query actual connection
    console.log('\n\n📡 Actual DB Connection:');
    console.log('='.repeat(60));
    
    const conn = await prisma.$queryRawUnsafe(`
      SELECT 
        inet_server_addr()::text as server_ip,
        inet_server_port() as server_port,
        current_database() as db,
        current_user as usr,
        current_schema() as schema,
        version() as pg_version
    `);
    
    console.log('\n✅ Connected to:');
    console.log(`   IP: ${conn[0].server_ip}`);
    console.log(`   Port: ${conn[0].server_port}`);
    console.log(`   Database: ${conn[0].db}`);
    console.log(`   User: ${conn[0].usr}`);
    console.log(`   Schema: ${conn[0].schema}`);
    console.log(`   PostgreSQL: ${conn[0].pg_version.split(' ')[0]} ${conn[0].pg_version.split(' ')[1]}`);
    
    const hasSocialOrgs = await tableExists('social_organizations');
    const hasOrgs = await tableExists('organizations');
    const orgTable = hasSocialOrgs ? 'social_organizations' : hasOrgs ? 'organizations' : null;
    const orgs = orgTable
      ? await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM ${orgTable}`)
      : [{ count: null }];
    
    const users = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count FROM social_users
    `);
    
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='_prisma_migrations'
      ) AS has_migrations
    `);
    
    console.log('\n\n📊 Database Status:');
    console.log('='.repeat(60));
    console.log(`   Organizations${orgTable ? ` (${orgTable})` : ''}: ${orgs[0].count}`);
    console.log(`   Social Users: ${users[0].count}`);
    console.log(`   Has Prisma Migrations: ${migrations[0].has_migrations ? 'YES' : 'NO'}`);
    
    if (migrations[0].has_migrations) {
      const lastMigrations = await prisma.$queryRawUnsafe(`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC NULLS LAST 
        LIMIT 5
      `);
      
      console.log('\n📜 Last 5 Migrations:');
      lastMigrations.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.migration_name}`);
        console.log(`      ${m.finished_at ? new Date(m.finished_at).toLocaleString() : 'Not finished'}`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
