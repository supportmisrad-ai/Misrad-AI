const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find Misrad AI HQ ID
  const misrad = await prisma.organization.findUnique({
    where: { slug: 'misrad-ai-hq' }
  });
  
  if (!misrad) {
    console.log('misrad-ai-hq not found');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Misrad AI HQ ID:', misrad.id);
  
  // Check customer account
  const customerAccount = await prisma.customerAccount.findUnique({
    where: { organizationId: misrad.id }
  });
  
  if (customerAccount) {
    console.log('\nCustomerAccount found:');
    console.log('  company_name:', customerAccount.company_name);
    console.log('  phone:', customerAccount.phone);
    console.log('  email:', customerAccount.email);
    console.log('  contact_name:', customerAccount.contact_name);
  } else {
    console.log('\nNo CustomerAccount for this org');
  }
  
  // Check ALL customer accounts for similar names
  const allCustomers = await prisma.customerAccount.findMany();
  
  console.log('\n\nAll CustomerAccounts with company names:');
  for (const ca of allCustomers) {
    if (ca.company_name) {
      const org = await prisma.organization.findUnique({ where: { id: ca.organizationId } });
      console.log(`  - ${ca.company_name} (org: ${org?.name || 'N/A'})`);
    }
  }
  
  await prisma.$disconnect();
}

main();
