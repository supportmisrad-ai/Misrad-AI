const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const raw = String(argv[i] || '');
    if (!raw.startsWith('--')) {
      out._.push(raw);
      continue;
    }

    const eq = raw.indexOf('=');
    if (eq !== -1) {
      const key = raw.slice(2, eq);
      const value = raw.slice(eq + 1);
      out[key] = value;
      continue;
    }

    const key = raw.slice(2);
    const next = argv[i + 1];
    if (next != null && !String(next).startsWith('--')) {
      out[key] = String(next);
      i++;
      continue;
    }
    out[key] = true;
  }
  return out;
}

function loadEnvFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Env file not found: ${abs}`);
  }
  const parsed = dotenv.parse(fs.readFileSync(abs));
  return { absPath: abs, env: parsed };
}

function pickDbUrl(env) {
  return String(env.DIRECT_URL || env.DATABASE_URL || '').trim();
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

function printDbTarget(label, url) {
  const id = parseDbIdentity(url);
  if (!id) {
    console.error(`[${label}] DB -> (missing/invalid)`);
    return;
  }
  console.error(`[${label}] DB -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`);
}

function normalizeStringOrNull(v) {
  const s = v == null ? '' : String(v).trim();
  return s ? s : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const sourceEnvPath = String(args['source-env'] || '.env.prod_backup');
  const targetEnvPath = String(args['target-env'] || '.env.local');

  const email = String(args.email || 'itsikdahan1@gmail.com').trim();
  const clerkUserId = normalizeStringOrNull(args['clerk-user-id']);

  const apply = Boolean(args.apply);
  const dryRun = !apply;

  const forcedPlan = String(args.plan || 'the_mentor').trim() || 'the_mentor';

  const srcEnv = loadEnvFile(sourceEnvPath);
  const dstEnv = loadEnvFile(targetEnvPath);

  const srcUrl = pickDbUrl(srcEnv.env);
  const dstUrl = pickDbUrl(dstEnv.env);

  if (!srcUrl) throw new Error(`Missing DIRECT_URL/DATABASE_URL in ${srcEnv.absPath}`);
  if (!dstUrl) throw new Error(`Missing DIRECT_URL/DATABASE_URL in ${dstEnv.absPath}`);

  printDbTarget('SOURCE', srcUrl);
  printDbTarget('TARGET', dstUrl);

  const src = new PrismaClient({ datasources: { db: { url: srcUrl } } });
  const dst = new PrismaClient({ datasources: { db: { url: dstUrl } } });

  try {
    const userWhereOr = [];
    if (clerkUserId) userWhereOr.push({ clerk_user_id: clerkUserId });
    if (email) userWhereOr.push({ email: { equals: email, mode: 'insensitive' } });

    if (userWhereOr.length === 0) {
      throw new Error('Provide at least --email or --clerk-user-id');
    }

    const sourceUser = await src.organizationUser.findFirst({
      where: { OR: userWhereOr },
      select: {
        id: true,
        clerk_user_id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        role: true,
        organization_id: true,
        allowed_modules: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!sourceUser?.id) {
      throw new Error(`User not found in SOURCE (email=${email}${clerkUserId ? ` clerk_user_id=${clerkUserId}` : ''})`);
    }

    const [ownedOrgIds, membershipRows] = await Promise.all([
      src.social_organizations.findMany({
        where: { owner_id: String(sourceUser.id) },
        select: { id: true },
      }),
      src.teamMember.findMany({
        where: { user_id: String(sourceUser.id) },
        select: { organization_id: true },
      }),
    ]);

    const orgIds = new Set();
    if (sourceUser.organization_id) orgIds.add(String(sourceUser.organization_id));
    for (const row of ownedOrgIds) {
      if (row?.id) orgIds.add(String(row.id));
    }
    for (const row of membershipRows) {
      if (row?.organization_id) orgIds.add(String(row.organization_id));
    }

    const ids = Array.from(orgIds).filter(Boolean);
    if (!ids.length) {
      throw new Error('No organizations found for user in SOURCE (no primary org, no owned orgs, no team membership)');
    }

    const sourceOrgs = await src.social_organizations.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        owner_id: true,
        has_nexus: true,
        has_social: true,
        has_system: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
        seats_allowed: true,
        subscription_plan: true,
        subscription_status: true,
        trial_start_date: true,
        trial_days: true,
        subscription_start_date: true,
        created_at: true,
        updated_at: true,
        is_shabbat_protected: true,
      },
      orderBy: { created_at: 'asc' },
    });

    console.log('\n📦 SOURCE snapshot');
    console.log('='.repeat(80));
    console.log(`User: ${sourceUser.email || '(no email)'} | id=${sourceUser.id} | clerk_user_id=${sourceUser.clerk_user_id}`);
    console.log(`Organizations found: ${sourceOrgs.length}`);
    for (const o of sourceOrgs) {
      console.log(`- ${o.name} | slug=${o.slug || '(null)'} | id=${o.id} | owner_id=${o.owner_id}`);
    }

    const preferredPrimaryOrgId = sourceUser.organization_id && orgIds.has(String(sourceUser.organization_id)) ? String(sourceUser.organization_id) : String(sourceOrgs[0].id);

    console.log('\n🧭 Migration plan');
    console.log('='.repeat(80));
    console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'APPLY (will write to TARGET)'}`);
    console.log(`Target plan for all orgs: ${forcedPlan}`);
    console.log(`Primary org for organizationUser.organization_id: ${preferredPrimaryOrgId}`);

    if (dryRun) {
      console.log('\n✅ Dry run complete. Re-run with --apply to perform writes.');
      return;
    }

    const now = new Date();

    const existingTargetUser = await dst.organizationUser.findUnique({
      where: { clerk_user_id: String(sourceUser.clerk_user_id) },
      select: { id: true },
    });

    const targetUserId = existingTargetUser?.id ? String(existingTargetUser.id) : String(sourceUser.id);

    if (existingTargetUser?.id) {
      await dst.organizationUser.update({
        where: { clerk_user_id: String(sourceUser.clerk_user_id) },
        data: {
          email: sourceUser.email ? String(sourceUser.email).toLowerCase() : null,
          full_name: sourceUser.full_name ? String(sourceUser.full_name) : null,
          avatar_url: sourceUser.avatar_url ? String(sourceUser.avatar_url) : null,
          role: 'owner',
          allowed_modules: ['nexus', 'system', 'social', 'client', 'finance', 'operations'],
          organization_id: null,
          updated_at: now,
        },
      });
    } else {
      await dst.organizationUser.create({
        data: {
          id: targetUserId,
          clerk_user_id: String(sourceUser.clerk_user_id),
          email: sourceUser.email ? String(sourceUser.email).toLowerCase() : null,
          full_name: sourceUser.full_name ? String(sourceUser.full_name) : null,
          avatar_url: sourceUser.avatar_url ? String(sourceUser.avatar_url) : null,
          role: 'owner',
          allowed_modules: ['nexus', 'system', 'social', 'client', 'finance', 'operations'],
          organization_id: null,
          created_at: sourceUser.created_at instanceof Date ? sourceUser.created_at : now,
          updated_at: now,
        },
      });
    }

    for (const org of sourceOrgs) {
      await dst.social_organizations.upsert({
        where: { id: String(org.id) },
        create: {
          id: String(org.id),
          name: String(org.name),
          slug: org.slug ? String(org.slug) : null,
          logo: org.logo ? String(org.logo) : null,
          owner_id: targetUserId,
          has_nexus: true,
          has_social: true,
          has_system: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          subscription_status: 'active',
          subscription_plan: forcedPlan,
          trial_days: 365,
          is_shabbat_protected: org.is_shabbat_protected === false ? false : true,
          created_at: org.created_at instanceof Date ? org.created_at : now,
          updated_at: now,
        },
        update: {
          name: String(org.name),
          slug: org.slug ? String(org.slug) : null,
          logo: org.logo ? String(org.logo) : null,
          owner_id: targetUserId,
          has_nexus: true,
          has_social: true,
          has_system: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          subscription_status: 'active',
          subscription_plan: forcedPlan,
          trial_days: 365,
          is_shabbat_protected: org.is_shabbat_protected === false ? false : true,
          updated_at: now,
        },
      });

      await dst.profile.upsert({
        where: {
          organizationId_clerkUserId: {
            organizationId: String(org.id),
            clerkUserId: String(sourceUser.clerk_user_id),
          },
        },
        create: {
          organizationId: String(org.id),
          clerkUserId: String(sourceUser.clerk_user_id),
          email: sourceUser.email ? String(sourceUser.email).toLowerCase() : null,
          fullName: sourceUser.full_name ? String(sourceUser.full_name) : null,
          avatarUrl: sourceUser.avatar_url ? String(sourceUser.avatar_url) : null,
          role: 'owner',
        },
        update: {
          email: sourceUser.email ? String(sourceUser.email).toLowerCase() : null,
          fullName: sourceUser.full_name ? String(sourceUser.full_name) : null,
          avatarUrl: sourceUser.avatar_url ? String(sourceUser.avatar_url) : null,
          role: 'owner',
        },
      });
    }

    await dst.organizationUser.update({
      where: { clerk_user_id: String(sourceUser.clerk_user_id) },
      data: {
        organization_id: preferredPrimaryOrgId,
        updated_at: now,
      },
    });

    const targetUser = await dst.organizationUser.findUnique({
      where: { clerk_user_id: String(sourceUser.clerk_user_id) },
      select: { id: true, email: true, role: true, organization_id: true },
    });

    const orgCount = await dst.social_organizations.count({ where: { owner_id: String(targetUser?.id || '') } });
    const profileCount = await dst.profile.count({ where: { clerkUserId: String(sourceUser.clerk_user_id) } });

    console.log('\n✅ Migration applied to TARGET');
    console.log('='.repeat(80));
    console.log(`Target user: id=${targetUser?.id || 'n/a'} email=${targetUser?.email || 'n/a'} role=${targetUser?.role || 'n/a'} primary_org=${targetUser?.organization_id || 'n/a'}`);
    console.log(`Organizations owned in TARGET: ${orgCount}`);
    console.log(`Profiles in TARGET for clerkUserId: ${profileCount}`);
  } finally {
    await Promise.allSettled([src.$disconnect(), dst.$disconnect()]);
  }
}

main().catch((e) => {
  console.error('\n❌ data-migrate-old-to-dev failed:', e?.message || e);
  process.exit(1);
});
