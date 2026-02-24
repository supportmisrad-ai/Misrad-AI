#!/usr/bin/env node
/**
 * Deploy AI Credit Functions to Supabase
 * 
 * Usage:
 *   node scripts/deploy-ai-credit-functions.js          # Uses DIRECT_URL from .env.local
 *   node scripts/deploy-ai-credit-functions.js --prod    # Requires DIRECT_URL pointing to PROD (Korea)
 *   node scripts/deploy-ai-credit-functions.js --dev     # Requires DIRECT_URL pointing to DEV (India)
 * 
 * This script runs the SQL functions defined in scripts/db-setup/add-ai-credit-functions.sql
 * directly against the database using DIRECT_URL (bypassing PgBouncer pooler).
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* ignore */ }

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error('ERROR: No DIRECT_URL or DATABASE_URL found in environment');
  process.exit(1);
}

// Detect environment
const isProd = directUrl.includes('ap-northeast-2');
const isDev = directUrl.includes('ap-south-1');
const envLabel = isProd ? 'PRODUCTION (Korea)' : isDev ? 'DEV (India)' : 'UNKNOWN';

const args = process.argv.slice(2);
if (args.includes('--prod') && !isProd) {
  console.error(`ERROR: --prod flag used but DIRECT_URL points to ${envLabel}`);
  process.exit(1);
}
if (args.includes('--dev') && !isDev) {
  console.error(`ERROR: --dev flag used but DIRECT_URL points to ${envLabel}`);
  process.exit(1);
}

console.log(`\n🎯 Target: ${envLabel}`);
console.log(`📦 Database: ${directUrl.replace(/:[^:@]+@/, ':***@')}\n`);

if (isProd && !args.includes('--prod')) {
  console.error('⚠️  PRODUCTION detected! Add --prod flag to confirm.');
  process.exit(1);
}

const { Client } = require('pg');

async function main() {
  const sqlPath = path.join(__dirname, 'db-setup', 'add-ai-credit-functions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Verify the column exists
    const colCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Organization' 
        AND column_name = 'ai_credits_balance_cents'
    `);

    if (colCheck.rows.length === 0) {
      console.error('❌ Column ai_credits_balance_cents not found on Organization table!');
      process.exit(1);
    }

    console.log(`✅ Column verified: ${colCheck.rows[0].column_name} (${colCheck.rows[0].data_type})`);

    // Run the SQL
    await client.query(sql);
    console.log('✅ SQL functions deployed successfully');

    // Verify functions
    const funcCheck = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN ('ai_debit_credits', 'ai_adjust_credits')
        AND routine_schema = 'public'
    `);

    console.log(`✅ Functions verified: ${funcCheck.rows.map(r => r.routine_name).join(', ')}`);

    // Show current orgs and their credit balances
    const orgs = await client.query(`
      SELECT name, slug, subscription_plan, subscription_status, ai_credits_balance_cents
      FROM "Organization"
      WHERE subscription_status IN ('active', 'trial')
      ORDER BY name
    `);

    if (orgs.rows.length > 0) {
      console.log('\n📊 Active organizations:');
      for (const org of orgs.rows) {
        const balance = Number(org.ai_credits_balance_cents || 0);
        console.log(`   ${org.name} (${org.slug}) — plan: ${org.subscription_plan || 'none'} — balance: ₪${(balance / 100).toFixed(0)}`);
      }
    }

    console.log('\n🎉 Done!\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
