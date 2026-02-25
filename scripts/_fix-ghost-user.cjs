// Fix: merge ghost temp user into real user for djv.afakot@gmail.com
// Ghost: badb92d4-b863-4005-846e-e4b5e99b4bbc (clerk: temp_1771451104342_y1vwus)
// Real:  839c3f46-690b-4f20-bb0f-faa859cd3c09 (clerk: user_39zcLxENz13PvyrSm2Jrp3fHu8F)
require('dotenv').config({ path: '.env.prod_backup' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GHOST_USER_ID = 'badb92d4-b863-4005-846e-e4b5e99b4bbc';
const REAL_USER_ID = '839c3f46-690b-4f20-bb0f-faa859cd3c09';

async function main() {
  console.log('=== FIX: Merge ghost user into real user ===\n');

  // 1. Verify both users exist
  const ghost = await prisma.organizationUser.findUnique({
    where: { id: GHOST_USER_ID },
    select: { id: true, email: true, full_name: true, clerk_user_id: true, organization_id: true },
  });
  const real = await prisma.organizationUser.findUnique({
    where: { id: REAL_USER_ID },
    select: { id: true, email: true, full_name: true, clerk_user_id: true, organization_id: true },
  });

  if (!ghost) { console.log('Ghost user not found!'); return; }
  if (!real) { console.log('Real user not found!'); return; }

  console.log('Ghost:', ghost.full_name, '<' + ghost.email + '>', 'clerk:', ghost.clerk_user_id);
  console.log('Real:', real.full_name, '<' + real.email + '>', 'clerk:', real.clerk_user_id);
  console.log('');

  // 2. Find orgs owned by ghost
  const ghostOrgs = await prisma.organization.findMany({
    where: { owner_id: GHOST_USER_ID },
    select: { id: true, name: true, slug: true },
  });
  console.log(`Orgs owned by ghost: ${ghostOrgs.length}`);
  for (const o of ghostOrgs) {
    console.log(`  "${o.name}" [${o.slug}]`);
  }

  // 3. Find all references to ghost user in other tables
  const contactRefs = await prisma.businessClientContact.findMany({
    where: { user_id: GHOST_USER_ID },
    select: { id: true, client_id: true, role: true },
  });
  console.log(`BusinessClientContact refs: ${contactRefs.length}`);

  // 4. Transfer org ownership from ghost → real
  if (ghostOrgs.length > 0) {
    console.log('\nStep 1: Transferring org ownership...');
    const result = await prisma.organization.updateMany({
      where: { owner_id: GHOST_USER_ID },
      data: { owner_id: REAL_USER_ID },
    });
    console.log(`  Transferred ${result.count} orgs`);
  }

  // 5. Transfer business client contacts from ghost → real (or delete if real already has one)
  if (contactRefs.length > 0) {
    console.log('\nStep 2: Transferring business client contacts...');
    for (const contact of contactRefs) {
      // Check if real user already has a contact for this client
      const existingReal = await prisma.businessClientContact.findUnique({
        where: { client_id_user_id: { client_id: contact.client_id, user_id: REAL_USER_ID } },
        select: { id: true },
      });
      if (existingReal) {
        // Real user already linked — just delete the ghost contact
        await prisma.businessClientContact.delete({ where: { id: contact.id } });
        console.log(`  Deleted duplicate contact ${contact.id} (real user already linked)`);
      } else {
        // Transfer contact to real user
        await prisma.businessClientContact.update({
          where: { id: contact.id },
          data: { user_id: REAL_USER_ID },
        });
        console.log(`  Transferred contact ${contact.id} to real user`);
      }
    }
  }

  // 6. Check for any other references before deleting
  // Check common FK tables
  const tables = [
    { name: 'NexusTask', check: () => prisma.nexusTask.count({ where: { assignee_id: GHOST_USER_ID } }) },
    { name: 'NexusTimeEntry', check: () => prisma.nexusTimeEntry.count({ where: { user_id: GHOST_USER_ID } }) },
    { name: 'NexusLeaveRequest', check: () => prisma.nexusLeaveRequest.count({ where: { user_id: GHOST_USER_ID } }) },
    { name: 'billing_events', check: () => prisma.billing_events.count({ where: { triggered_by: GHOST_USER_ID } }) },
  ];

  console.log('\nStep 3: Checking for other references...');
  let hasOtherRefs = false;
  for (const t of tables) {
    try {
      const count = await t.check();
      if (count > 0) {
        console.log(`  ⚠ ${t.name}: ${count} references — need manual transfer`);
        hasOtherRefs = true;
      }
    } catch {
      // Table might not exist or column name different — skip
    }
  }

  if (hasOtherRefs) {
    console.log('\n⚠ Ghost user has other references. Manual cleanup needed before deletion.');
    return;
  }

  // 7. Delete ghost user
  console.log('\nStep 4: Deleting ghost user...');
  try {
    await prisma.organizationUser.delete({ where: { id: GHOST_USER_ID } });
    console.log('  ✓ Ghost user deleted');
  } catch (err) {
    console.log(`  ✗ Failed to delete: ${err.message}`);
    console.log('  Trying to find remaining FK references...');
    // If delete fails, there's a FK constraint we missed
    return;
  }

  // 8. Verify
  const afterUsers = await prisma.organizationUser.count();
  const afterOwners = await prisma.organization.findMany({ select: { owner_id: true } });
  const uniqueOwners = new Set(afterOwners.map(o => o.owner_id));
  const afterBiz = await prisma.businessClient.count({ where: { deleted_at: null } });

  console.log('\n=== AFTER ===');
  console.log(`DB users: ${afterUsers}`);
  console.log(`Unique org owners: ${uniqueOwners.size}`);
  console.log(`Active business clients: ${afterBiz}`);
  console.log(`Orgs: ${afterOwners.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
