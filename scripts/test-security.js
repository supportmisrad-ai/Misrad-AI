const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const jwtOrgA = process.env.SUPABASE_JWT_ORG_A;
const jwtOrgB = process.env.SUPABASE_JWT_ORG_B;

const orgA = process.env.SUPABASE_ORG_A_ID;
const orgB = process.env.SUPABASE_ORG_B_ID;

function requireEnv(name, value) {
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function run() {
  requireEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey);
  requireEnv('SUPABASE_JWT_ORG_A', jwtOrgA);
  requireEnv('SUPABASE_JWT_ORG_B', jwtOrgB);
  requireEnv('SUPABASE_ORG_A_ID', orgA);
  requireEnv('SUPABASE_ORG_B_ID', orgB);

  const clientA = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwtOrgA}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientB = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwtOrgB}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targets = [
    { table: 'organizations', col: 'id' },
    { table: 'clients', col: 'organization_id' },
    { table: 'tasks', col: 'organization_id' },
    { table: 'social_posts', col: 'organization_id' },
    { table: 'system_leads', col: 'organization_id' },
  ];

  const results = [];

  for (const t of targets) {
    const aReadsB = await clientA.from(t.table).select('*').eq(t.col, orgB).limit(1);
    results.push({ actor: 'A', targetOrg: 'B', table: t.table, ok: !aReadsB.error && (aReadsB.data?.length ?? 0) === 0, error: aReadsB.error?.message ?? null });

    const bReadsA = await clientB.from(t.table).select('*').eq(t.col, orgA).limit(1);
    results.push({ actor: 'B', targetOrg: 'A', table: t.table, ok: !bReadsA.error && (bReadsA.data?.length ?? 0) === 0, error: bReadsA.error?.message ?? null });
  }

  const failures = results.filter((r) => !r.ok);

  console.log(JSON.stringify({ ok: failures.length === 0, failures, results }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
