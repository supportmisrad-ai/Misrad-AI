'use strict';
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const DEV_CLERK_ID = 'user_36taRKpH1VdyycRdg9POOD0trxH';
const DEV_EMAIL    = 'itsikdahan1@gmail.com';
const ORG_SLUG     = 'misrad-ai-hq';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Fix DEV Onboarding (comprehensive) ===\n');

  // 1. Find the target org
  const org = await prisma.organization.findFirst({ where: { slug: ORG_SLUG }, select: { id: true, slug: true, name: true } });
  if (!org) { console.error('❌ Org not found:', ORG_SLUG); return; }
  console.log('✅ Org:', org.slug, '→', org.id, `(${org.name})`);

  // 2. Handle profiles — find ALL, keep only the misrad-ai-hq one
  const allProfiles = await prisma.profile.findMany({
    where: { clerkUserId: DEV_CLERK_ID },
    select: { id: true, organizationId: true },
  });
  console.log(`\n📋 Found ${allProfiles.length} profile(s) for DEV user`);

  const correctProfile = allProfiles.find(p => p.organizationId === org.id);
  const wrongProfiles = allProfiles.filter(p => p.organizationId !== org.id);

  if (wrongProfiles.length > 0) {
    for (const wp of wrongProfiles) {
      await prisma.profile.delete({ where: { id: wp.id } });
      console.log(`  🗑️  Deleted stale profile (orgId: ${wp.organizationId})`);
    }
  }

  if (!correctProfile) {
    await prisma.profile.create({
      data: {
        clerkUserId: DEV_CLERK_ID,
        email: DEV_EMAIL,
        fullName: 'יצחק דהן',
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Profile created → linked to', org.slug);
  } else {
    console.log('✅ Profile correctly linked to', org.slug);
  }

  // 3. Handle organization_users — ensure one record for misrad-ai-hq
  const allOu = await prisma.organizationUser.findMany({
    where: { clerk_user_id: DEV_CLERK_ID },
    select: { id: true, organization_id: true, role: true },
  });
  console.log(`\n📋 Found ${allOu.length} organization_user(s) for DEV user`);

  const correctOu = allOu.find(ou => ou.organization_id === org.id);
  if (!correctOu) {
    await prisma.organizationUser.create({
      data: {
        clerk_user_id: DEV_CLERK_ID,
        email: DEV_EMAIL,
        full_name: 'יצחק דהן',
        organization_id: org.id,
        role: 'owner',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log('✅ organization_user created for', org.slug);
  } else {
    console.log('✅ organization_user exists for', org.slug, '→ role:', correctOu.role);
  }

  // 4. Upsert customer_account (skips onboarding form)
  const existing = await prisma.customerAccount.findFirst({
    where: { organizationId: org.id },
    select: { id: true, company_name: true, phone: true },
  });
  console.log('');
  if (existing) {
    if (existing.company_name && existing.phone) {
      console.log('✅ customer_account already has company + phone — onboarding will auto-skip');
    } else {
      await prisma.customerAccount.update({
        where: { id: existing.id },
        data: {
          name: 'Misrad AI HQ',
          company_name: 'Misrad AI HQ',
          phone: '050-0000000',
          email: DEV_EMAIL,
          updated_at: new Date(),
        },
      });
      console.log('✅ customer_account updated with company + phone');
    }
  } else {
    await prisma.customerAccount.create({
      data: {
        organizationId: org.id,
        name: 'Misrad AI HQ',
        company_name: 'Misrad AI HQ',
        phone: '050-0000000',
        email: DEV_EMAIL,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log('✅ customer_account created with company + phone');
  }

  // 5. Verify final state
  console.log('\n--- Final Verification ---');
  const finalProfile = await prisma.profile.findFirst({
    where: { clerkUserId: DEV_CLERK_ID },
    select: { organizationId: true },
  });
  const finalOu = await prisma.organizationUser.findFirst({
    where: { clerk_user_id: DEV_CLERK_ID, organization_id: org.id },
    select: { role: true },
  });
  const finalCa = await prisma.customerAccount.findFirst({
    where: { organizationId: org.id },
    select: { company_name: true, phone: true },
  });
  console.log('  Profile orgId:', finalProfile?.organizationId === org.id ? '✅ correct' : '❌ wrong');
  console.log('  OrgUser role :', finalOu?.role || '❌ missing');
  console.log('  CustomerAcct :', finalCa?.company_name ? '✅ ' + finalCa.company_name : '❌ missing');
  console.log('  Phone        :', finalCa?.phone ? '✅ ' + finalCa.phone : '❌ missing');

  console.log('\n✅ DEV onboarding fixed — login should go directly to /w/misrad-ai-hq');
}

main().catch(e => console.error('❌', e.message)).finally(() => prisma.$disconnect());
