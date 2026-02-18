/**
 * export-prod-superadmin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * מייצא את נתוני המשתמש הראשי (Super Admin) + כל הארגונים שלו מה-DB הנוכחי
 * לקובץ SQL מוכן לשחזור על DB נקי חדש.
 *
 * הרצה:
 *   node scripts/export-prod-superadmin.js
 *   (יוצר: scripts/restore-superadmin.sql)
 *
 * דרישות: DATABASE_URL / DIRECT_URL בקובץ .env (מצביע על PROD)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPERADMIN_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
const SUPERADMIN_EMAIL    = 'itsikdahan1@gmail.com';
const OUTPUT_FILE         = path.join(__dirname, 'restore-superadmin.sql');

// ─── helpers ────────────────────────────────────────────────────────────────

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function buildInsert(table, row, conflictClause = '') {
  const cols = Object.keys(row).filter(k => row[k] !== undefined);
  const vals = cols.map(c => esc(row[c]));
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')})${conflictClause};`;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌  No DATABASE_URL / DIRECT_URL found in .env');
    process.exit(1);
  }

  console.log('🔌  Connecting via Prisma...');
  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    console.log('✅  Connected');
  } catch (e) {
    console.error('❌  Connection failed:', e.message);
    process.exit(1);
  }

  const lines = [
    '-- ═══════════════════════════════════════════════════════════════════',
    '-- restore-superadmin.sql',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Super Admin restore script for clean-schema PROD reset',
    '-- Run AFTER: prisma migrate deploy  (on fresh empty DB)',
    '-- Usage:  psql $DIRECT_URL -f scripts/restore-superadmin.sql',
    '-- ═══════════════════════════════════════════════════════════════════',
    '',
    'BEGIN;',
    '',
    '-- ─── 1. OrganizationUser (Super Admin) ─────────────────────────────',
  ];

  // 1. Super Admin user row
  const user = await prisma.organizationUser.findFirst({
    where: {
      OR: [
        { clerk_user_id: SUPERADMIN_CLERK_ID },
        { email: { equals: SUPERADMIN_EMAIL, mode: 'insensitive' } },
      ],
    },
  });

  if (!user) {
    console.error('❌  Super admin user not found in DB!');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`✅  Found user: ${user.full_name} (${user.email}) id=${user.id}`);

  lines.push(buildInsert(
    'organization_users',
    {
      id: user.id,
      clerk_user_id: user.clerk_user_id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      allowed_modules: null, // will use default
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    ` ON CONFLICT (clerk_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now()`
  ));
  lines.push('');

  // 2. Organizations owned by super admin
  const orgs = await prisma.organization.findMany({
    where: { owner_id: user.id },
    orderBy: { created_at: 'asc' },
  });
  console.log(`✅  Found ${orgs.length} organization(s)`);

  lines.push('-- ─── 2. Organizations ──────────────────────────────────────────────');
  for (const org of orgs) {
    console.log(`   • ${org.name} (${org.slug}) — ${org.subscription_plan}`);
    lines.push(`-- Org: ${org.name} (slug: ${org.slug}, plan: ${org.subscription_plan})`);
    lines.push(buildInsert(
      'organizations',
      {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        owner_id: org.owner_id,
        has_nexus: org.has_nexus,
        has_social: org.has_social,
        has_system: org.has_system,
        has_finance: org.has_finance,
        has_client: org.has_client,
        has_operations: org.has_operations,
        seats_allowed: org.seats_allowed,
        subscription_plan: org.subscription_plan,
        subscription_status: org.subscription_status,
        trial_days: org.trial_days,
        trial_start_date: org.trial_start_date,
        trial_end_date: org.trial_end_date,
        balance: org.balance,
        ai_credits_balance_cents: org.ai_credits_balance_cents,
        is_shabbat_protected: org.is_shabbat_protected,
        billing_email: org.billing_email,
        tax_id: org.tax_id,
        mrr: org.mrr,
        arr: org.arr,
        discount_percent: org.discount_percent,
        created_at: org.created_at,
        updated_at: org.updated_at,
      },
      ` ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now()`
    ));
  }
  lines.push('');

  // 3. Link user → primary org (first created)
  if (orgs.length > 0) {
    const primaryOrg = orgs[0];
    lines.push('-- ─── 3. Link Super Admin → Primary Organization ────────────────────');
    lines.push(`UPDATE organization_users`);
    lines.push(`  SET organization_id = '${primaryOrg.id}', updated_at = now()`);
    lines.push(`  WHERE clerk_user_id = '${SUPERADMIN_CLERK_ID}';`);
    lines.push('');
  }

  const orgIds = orgs.map(o => o.id);

  // 4. Profiles
  const profiles = await prisma.profile.findMany({
    where: { clerkUserId: SUPERADMIN_CLERK_ID },
  });
  if (profiles.length > 0) {
    lines.push('-- ─── 4. Profiles ───────────────────────────────────────────────────');
    for (const p of profiles) {
      lines.push(buildInsert(
        'profiles',
        {
          id: p.id,
          organization_id: p.organizationId,
          clerk_user_id: p.clerkUserId,
          email: p.email,
          full_name: p.fullName,
          avatar_url: p.avatarUrl,
          phone: p.phone,
          role: p.role,
          notification_preferences: p.notificationPreferences,
          ui_preferences: p.uiPreferences,
          social_profile: p.socialProfile,
          billing_info: p.billingInfo,
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        },
        ` ON CONFLICT (organization_id, clerk_user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now()`
      ));
    }
    lines.push('');
    console.log(`✅  Found ${profiles.length} profile(s)`);
  }

  // 5. Organization settings
  if (orgIds.length > 0) {
    const settings = await prisma.organization_settings.findMany({
      where: { organization_id: { in: orgIds } },
    });
    if (settings.length > 0) {
      lines.push('-- ─── 5. Organization Settings ──────────────────────────────────────');
      for (const s of settings) {
        lines.push(buildInsert(
          'organization_settings',
          {
            organization_id: s.organization_id,
            ai_dna: s.ai_dna,
            ai_quota_cents: s.ai_quota_cents,
            created_at: s.created_at,
            updated_at: s.updated_at,
          },
          ` ON CONFLICT (organization_id) DO UPDATE SET
    ai_dna = EXCLUDED.ai_dna,
    ai_quota_cents = EXCLUDED.ai_quota_cents,
    updated_at = now()`
        ));
      }
      lines.push('');
      console.log(`✅  Found ${settings.length} org settings row(s)`);
    }

    // 6. NexusTenants linked to their orgs
    const nexusTenants = await prisma.nexusTenant.findMany({
      where: { organizationId: { in: orgIds } },
    });
    if (nexusTenants.length > 0) {
      lines.push('-- ─── 6. NexusTenants ───────────────────────────────────────────────');
      for (const t of nexusTenants) {
        lines.push(buildInsert(
          'nexus_tenants',
          {
            id: t.id,
            name: t.name,
            owner_email: t.ownerEmail,
            subdomain: t.subdomain,
            plan: t.plan,
            status: t.status,
            joined_at: t.joinedAt,
            modules: null,
            organization_id: t.organizationId,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
          },
          ` ON CONFLICT (subdomain) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    updated_at = now()`
        ));
      }
      lines.push('');
      console.log(`✅  Found ${nexusTenants.length} nexus tenant(s)`);
    }

    // 7. System settings per org
    const sysCfg = await prisma.system_settings.findMany({
      where: { tenant_id: { in: orgIds } },
    });
    if (sysCfg.length > 0) {
      lines.push('-- ─── 7. System Settings ────────────────────────────────────────────');
      for (const s of sysCfg) {
        lines.push(buildInsert(
          'system_settings',
          {
            id: s.id,
            tenant_id: s.tenant_id,
            system_flags: s.system_flags,
            maintenance_mode: s.maintenance_mode,
            created_at: s.created_at,
            updated_at: s.updated_at,
          },
          ` ON CONFLICT (id) DO UPDATE SET
    system_flags = EXCLUDED.system_flags,
    maintenance_mode = EXCLUDED.maintenance_mode,
    updated_at = now()`
        ));
      }
      lines.push('');
      console.log(`✅  Found ${sysCfg.length} system settings row(s)`);
    }

    // 8. NexusUsers (employee profiles) owned by these orgs for the super admin
    const nexusUsers = await prisma.nexusUser.findMany({
      where: {
        organizationId: { in: orgIds },
        email: SUPERADMIN_EMAIL,
      },
    });
    if (nexusUsers.length > 0) {
      lines.push('-- ─── 8. NexusUsers (Admin employee profiles) ───────────────────────');
      for (const u of nexusUsers) {
        lines.push(buildInsert(
          'nexus_users',
          {
            id: u.id,
            organization_id: u.organizationId,
            name: u.name,
            role: u.role,
            department: u.department,
            email: u.email,
            phone: u.phone,
            is_super_admin: u.isSuperAdmin,
            created_at: u.createdAt,
            updated_at: u.updatedAt,
          },
          ` ON CONFLICT (organization_id, email) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = now()`
        ));
      }
      lines.push('');
      console.log(`✅  Found ${nexusUsers.length} nexus user profile(s)`);
    }
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- ─── Verification Queries ──────────────────────────────────────────');
  lines.push(`SELECT 'organization_users' AS tbl, count(*)::text AS cnt FROM organization_users WHERE clerk_user_id = '${SUPERADMIN_CLERK_ID}'`);
  lines.push(`UNION ALL SELECT 'organizations', count(*)::text FROM organizations WHERE owner_id = (SELECT id FROM organization_users WHERE clerk_user_id = '${SUPERADMIN_CLERK_ID}');`);
  lines.push('');

  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');
  await prisma.$disconnect();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`✅  Export complete → ${OUTPUT_FILE}`);
  console.log(`   👤 ${user.full_name} (${user.email})`);
  console.log(`   🏢 ${orgs.length} organization(s) exported`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n📌 Next steps:');
  console.log('   1. Review: scripts/restore-superadmin.sql');
  console.log('   2. After PROD reset + prisma migrate deploy:');
  console.log('      psql $DIRECT_URL -f scripts/restore-superadmin.sql');
}

main().catch(err => {
  console.error('❌  Export failed:', err.message);
  process.exit(1);
});
