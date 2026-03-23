/**
 * בדיקת נתוני מודול System בארגון הדמו
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDemoSystemData() {
  console.log('🔍 בודק נתוני מודול System בארגון הדמו...\n');

  try {
    // 1. מציאת ארגון הדמו
    const demoOrg = await prisma.organization.findFirst({
      where: { slug: 'misrad-ai-demo-il' },
      include: {
        owner: {
          select: {
            email: true,
            full_name: true,
            clerk_user_id: true,
          }
        }
      }
    });

    if (!demoOrg) {
      console.log('❌ ארגון הדמו לא נמצא!');
      return;
    }

    console.log('✅ ארגון הדמו:');
    console.log('   Name:', demoOrg.name);
    console.log('   Slug:', demoOrg.slug);
    console.log('   ID:', demoOrg.id);
    console.log('   Owner Email:', demoOrg.owner?.email || 'NULL');
    console.log('   Owner Clerk ID:', demoOrg.owner?.clerk_user_id || 'NULL');
    console.log('   Owner Name:', demoOrg.owner?.full_name || 'NULL');
    console.log('\n---\n');

    // 2. בדיקת נתוני System Module
    
    // ליידים (bot_leads)
    const botLeads = await prisma.botLead.count({
      where: { organization_id: demoOrg.id }
    });
    console.log(`📊 Bot Leads (ליידים): ${botLeads}`);

    // אירועים - עם UUID cast
    const events = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM team_events
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0).catch((e) => { console.log('   Events error:', e.message); return 0; });
    console.log(`📊 Events (אירועים): ${events}`);

    // צוות מכירות
    const salesTeam = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM sales_team_members
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0).catch((e) => { console.log('   Sales Team error:', e.message); return 0; });
    console.log(`📊 Sales Team (צוות מכירות): ${salesTeam}`);

    // צוות שטח
    const fieldTeam = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM field_team_members
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0).catch((e) => { console.log('   Field Team error:', e.message); return 0; });
    console.log(`📊 Field Team (צוות שטח): ${fieldTeam}`);

    // שותפים
    const partners = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM partners
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0).catch((e) => { console.log('   Partners error:', e.message); return 0; });
    console.log(`📊 Partners (שותפים): ${partners}`);

    // טיקטים
    const tickets = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM system_tickets
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0).catch((e) => { console.log('   Tickets error:', e.message); return 0; });
    console.log(`📊 System Tickets (טיקטים): ${tickets}`);

    console.log('\n---\n');

    // 3. בדיקת נתוני Nexus (לוודא שהם כן קיימים)
    const nexusUsers = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM nexus_users
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0);

    const nexusTasks = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM nexus_tasks
      WHERE organization_id = ${demoOrg.id}::uuid
    `.then(r => r[0] ? Number(r[0].count) : 0);

    const clients = await prisma.clientClient.count({
      where: { organizationId: demoOrg.id }
    });

    console.log('✅ נתוני Nexus (לוודא שהם עובדים):');
    console.log(`   Users: ${nexusUsers}`);
    console.log(`   Tasks: ${nexusTasks}`);
    console.log(`   Clients: ${clients}`);

    console.log('\n---\n');

    // 4. חיפוש נתוני System ללא organization_id (אולי נוצרו בלי קישור)
    const orphanedLeads = await prisma.botLead.count({
      where: { organization_id: null }
    });
    console.log(`⚠️  Bot Leads ללא organization_id: ${orphanedLeads}`);

    // 5. סיכום
    console.log('\n📋 סיכום:');
    if (botLeads === 0 && events === 0 && salesTeam === 0 && fieldTeam === 0 && partners === 0) {
      console.log('❌ מודול System ריק לגמרי!');
      console.log('   הסיבה: הסקריפט create-demo-org-prod.ts כנראה לא יצר נתוני System');
      console.log('   פתרון: צריך להריץ את הסקריפט עם יצירת נתוני System');
    } else {
      console.log('✅ יש נתוני System');
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDemoSystemData();
