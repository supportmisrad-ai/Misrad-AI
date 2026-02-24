#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env.prod_backup and override DATABASE_URL + DIRECT_URL
const envPath = path.join(__dirname, '..', '.env.prod_backup');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 0) continue;
  const key = t.slice(0, eq).trim();
  const val = t.slice(eq + 1).trim();
  if (key === 'DATABASE_URL' || key === 'DIRECT_URL') {
    process.env[key] = val;
  }
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) { console.error('No DIRECT_URL/DATABASE_URL found'); process.exit(1); }
const isProd = dbUrl.includes('ap-northeast-2');
console.log('Target:', isProd ? 'PRODUCTION (Korea)' : 'UNKNOWN');
console.log('URL:', dbUrl.replace(/:[^:@]+@/, ':***@'), '\n');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Check key columns
  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Organization' AND column_name IN ('ai_credits_balance_cents','is_medical_exempt','billing_cycle','billing_email','payment_method_id','cancellation_reason') ORDER BY column_name"
  );
  console.log('Organization columns:');
  for (const r of cols) console.log('  ' + r.column_name + ' (' + r.data_type + ')');
  if (cols.length === 0) console.log('  (none found!)');

  // 2. Check SQL functions
  const funcs = await prisma.$queryRawUnsafe(
    "SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('ai_debit_credits','ai_adjust_credits') AND routine_schema='public'"
  );
  console.log('\nSQL functions:', funcs.length ? funcs.map(r => r.routine_name).join(', ') : 'NONE');

  // 3. Check credit balances
  const orgs = await prisma.$queryRawUnsafe(
    "SELECT name, slug, subscription_plan, subscription_status, ai_credits_balance_cents FROM \"Organization\" WHERE subscription_status IN ('active','trial') ORDER BY name"
  );
  console.log('\nActive organizations:');
  for (const o of orgs) {
    const bal = Number(o.ai_credits_balance_cents || 0);
    console.log('  ' + o.name + ' (' + o.slug + ') plan=' + (o.subscription_plan || 'none') + ' balance=' + bal + ' cents (' + (bal/100).toFixed(0) + ' ILS)');
  }

  // 4. Check AI tables
  const tables = await prisma.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('ai_feature_settings','ai_usage_logs','ai_model_aliases','organization_settings') ORDER BY table_name"
  );
  console.log('\nAI-related tables:', tables.map(r => r.table_name).join(', '));

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
