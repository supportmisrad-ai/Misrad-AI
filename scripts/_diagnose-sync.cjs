// Fix: unlink orgs from deleted business clients and re-link them to live clients
require('dotenv').config({ path: '.env.prod_backup' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIX: Orgs linked to deleted business clients ===\n');

  // 1. Before state
  const totalOrgs = await prisma.organization.count();
  const bizClientsTotal = await prisma.businessClient.count();
  const bizClientsActive = await prisma.businessClient.count({ where: { deleted_at: null } });
  const bizClientsDeleted = bizClientsTotal - bizClientsActive;

  console.log(`BEFORE:`);
  console.log(`  Organizations: ${totalOrgs}`);
  console.log(`  Business clients: ${bizClientsActive} active, ${bizClientsDeleted} deleted`);

  // 2. Find orgs linked to deleted business clients
  const orgsOnDeletedClients = await prisma.organization.findMany({
    where: {
      business_client: { deleted_at: { not: null } },
    },
    select: {
      id: true,
      name: true,
      client_id: true,
      owner_id: true,
      owner: { select: { id: true, email: true, full_name: true } },
    },
  });

  console.log(`  Orgs linked to DELETED clients: ${orgsOnDeletedClients.length}`);

  if (orgsOnDeletedClients.length === 0) {
    console.log('\n✓ Nothing to fix!');
    return;
  }

  // 3. Unlink them
  console.log('\nStep 1: Unlinking orgs from deleted clients...');
  const unlinkResult = await prisma.organization.updateMany({
    where: { id: { in: orgsOnDeletedClients.map(o => o.id) } },
    data: { client_id: null },
  });
  console.log(`  Unlinked ${unlinkResult.count} orgs`);

  // 4. Re-link each org to a live business client
  console.log('\nStep 2: Re-linking orgs to live business clients...');
  let created = 0;
  let linked = 0;

  for (const org of orgsOnDeletedClients) {
    const ownerEmail = org.owner?.email ? String(org.owner.email).trim().toLowerCase() : '';
    const ownerName = org.owner?.full_name || org.name || 'Unknown';

    try {
      let bizClient = null;
      if (ownerEmail) {
        // First: look for a live business client with this email
        bizClient = await prisma.businessClient.findFirst({
          where: { primary_email: ownerEmail, deleted_at: null },
          select: { id: true, company_name: true },
        });

        // Second: if not found, check if a DELETED one exists → undelete it
        if (!bizClient) {
          const deletedClient = await prisma.businessClient.findFirst({
            where: { primary_email: ownerEmail, deleted_at: { not: null } },
            select: { id: true, company_name: true },
          });
          if (deletedClient) {
            await prisma.businessClient.update({
              where: { id: deletedClient.id },
              data: { deleted_at: null },
            });
            bizClient = deletedClient;
            console.log(`  Restored deleted: "${bizClient.company_name}" <${ownerEmail}>`);
          }
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
          select: { id: true, company_name: true },
        });
        console.log(`  Created new: "${bizClient.company_name}" <${normalizedEmail}>`);
        created++;
      } else if (!bizClient.company_name) {
        console.log(`  Found existing: "${bizClient.company_name}"`);
      }

      // Link org
      await prisma.organization.update({
        where: { id: org.id },
        data: { client_id: bizClient.id },
      });
      console.log(`  ✓ Linked "${org.name}" → ${bizClient.company_name}`);
      linked++;

      // Link owner as contact
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
        }
      }
    } catch (err) {
      console.log(`  ✗ FAILED for "${org.name}": ${err.message}`);
    }
  }

  // 5. After state
  const afterActive = await prisma.businessClient.count({ where: { deleted_at: null } });
  const afterUnlinked = await prisma.organization.count({ where: { client_id: null } });
  const afterOnDeleted = await prisma.organization.count({
    where: { business_client: { deleted_at: { not: null } } },
  });

  console.log(`\nAFTER:`);
  console.log(`  Business clients (active): ${afterActive} (was ${bizClientsActive})`);
  console.log(`  Orgs with client_id=null: ${afterUnlinked}`);
  console.log(`  Orgs on deleted clients: ${afterOnDeleted}`);
  console.log(`\n=== Created ${created} new clients, linked ${linked} orgs ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
