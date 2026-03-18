import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🔍 בדיקת הרשאות ארגון\n');
  
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: {
      id: true,
      slug: true,
      name: true,
      has_nexus: true,
      has_system: true,
      has_social: true,
      has_finance: true,
      has_client: true,
      has_operations: true,
    }
  });
  
  if (!org) {
    console.log('❌ ארגון לא נמצא!');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`📊 ארגון: ${org.name} (${org.slug})\n`);
  console.log('═══ הרשאות מודולים ═══');
  console.log(`  ${org.has_nexus ? '✅' : '❌'} Nexus: ${org.has_nexus}`);
  console.log(`  ${org.has_system ? '✅' : '❌'} System: ${org.has_system}`);
  console.log(`  ${org.has_social ? '✅' : '❌'} Social: ${org.has_social}`);
  console.log(`  ${org.has_finance ? '✅' : '❌'} Finance: ${org.has_finance}`);
  console.log(`  ${org.has_client ? '✅' : '❌'} Client: ${org.has_client}`);
  console.log(`  ${org.has_operations ? '✅' : '❌'} Operations: ${org.has_operations}`);
  
  console.log('\n═══ סיכום ═══');
  if (!org.has_system) {
    console.log('❌ אין הרשאה ל-System - זו הסיבה שאין נתונים!');
    console.log('   פתרון: UPDATE organizations SET has_system = true WHERE id = ...');
  }
  if (!org.has_nexus) {
    console.log('❌ אין הרשאה ל-Nexus - זו הסיבה שאין נתונים!');
    console.log('   פתרון: UPDATE organizations SET has_nexus = true WHERE id = ...');
  }
  
  if (org.has_system && org.has_nexus) {
    console.log('✅ כל ההרשאות תקינות!');
  }
  
  await prisma.$disconnect();
}

main();
