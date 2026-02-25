// Fix: re-link 6 orgs that were unlinked but couldn't be re-linked due to unique constraint.
// Strategy: for each unlinked org, find or restore the business client by owner email.
require('dotenv').config({ path: '.env.prod_backup' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIX: Re-link unlinked orgs ===\n');

  const unlinkedOrgs = await prisma.organization.findMany({
    where: { client_id: null },
    select: {
      id: true,
      name: true,
      owner_id: true,
      owner: { select: { id: true, email: true, full_name: true } },
    },
  });

  console.log(`Found ${unlinkedOrgs.length} unlinked orgs\n`);

  let fixed = 0;

  for (const org of unlinkedOrgs) {
    const ownerEmail = org.owner?.email ? String(org.owner.email).trim().toLowerCase() : '';
    const ownerName = org.owner?.full_name || org.name || 'Unknown';
    console.log(`Processing: "${org.name}" (owner: ${ownerName} <${ownerEmail}>)`);

    try {
      let bizClient = null;

      if (ownerEmail) {
        // 1. Look for ANY business client with this email (including deleted)
        bizClient = await prisma.businessClient.findUnique({
          where: { primary_email: ownerEmail },
          select: { id: true, company_name: true, deleted_at: true },
        });

        if (bizClient && bizClient.deleted_at) {
          // Restore the deleted client
          await prisma.businessClient.update({
            where: { id: bizClient.id },
            data: { deleted_at: null },
          });
          console.log(`  Restored deleted client: "${bizClient.company_name}"`);
        } else if (bizClient) {
          console.log(`  Found live client: "${bizClient.company_name}"`);
        }
      }

      if (!bizClient) {
        const normalizedEmail = ownerEmail || `org-${org.id}@placeholder.local`;
        bizClient = await prisma.businessClient.create({
          data: {
            company_name: ownerName,
            primary_email: normalizedEmail,
            status: 'active',
            lifecycle_stage: 'customer',
          },
          select: { id: true, company_name: true, deleted_at: true },
        });
        console.log(`  Created new client: "${bizClient.company_name}"`);
      }

      // Link org to business client
      await prisma.organization.update({
        where: { id: org.id },
        data: { client_id: bizClient.id },
      });
      console.log(`  ✓ Linked org → ${bizClient.company_name}`);

      // Ensure owner is a contact
      if (org.owner?.id) {
        const exists = await prisma.businessClientContact.findUnique({
          where: { client_id_user_id: { client_id: bizClient.id, user_id: org.owner.id } },
          select: { id: true },
        });
        if (!exists) {
          await prisma.businessClientContact.create({
            data: {
              client_id: bizClient.id,
              user_id: org.owner.id,
              role: 'owner',
              is_primary: true,
            },
          });
          console.log(`  ✓ Added owner as contact`);
        }
      }

      fixed++;
    } catch (err) {
      console.log(`  ✗ FAILED: ${err.message}`);
    }
    console.log('');
  }

  // Final state
  const afterUnlinked = await prisma.organization.count({ where: { client_id: null } });
  const afterActive = await prisma.businessClient.count({ where: { deleted_at: null } });
  const afterDeleted = await prisma.businessClient.count({ where: { deleted_at: { not: null } } });

  console.log(`=== RESULT ===`);
  console.log(`Fixed: ${fixed}/${unlinkedOrgs.length}`);
  console.log(`Unlinked orgs remaining: ${afterUnlinked}`);
  console.log(`Active business clients: ${afterActive}`);
  console.log(`Deleted business clients: ${afterDeleted}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
