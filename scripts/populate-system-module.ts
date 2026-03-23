/**
 * יצירת נתוני מודול System לארגון הדמו
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORG_SLUG = 'misrad-ai-demo-il';

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDate(daysAgo: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function populateSystemModule() {
  console.log('🚀 מאכלס נתוני מודול System...\n');

  try {
    // מציאת ארגון הדמו
    const org = await prisma.organization.findFirst({
      where: { slug: DEMO_ORG_SLUG }
    });

    if (!org) {
      console.error('❌ ארגון הדמו לא נמצא!');
      return;
    }

    console.log(`✅ נמצא ארגון: ${org.name} (${org.id})\n`);

    // 1. צוות מכירות (MisradSalesTeam + MisradSalesTeamMember)
    console.log('📊 יוצר צוותי מכירות...');
    
    const salesTeams = ['צוות מכירות דרום', 'צוות מכירות מרכז', 'צוות מכירות צפון'];
    const createdSalesTeams = [];

    for (const teamName of salesTeams) {
      const team = await prisma.misradSalesTeam.create({
        data: {
          organization_id: org.id,
          name: teamName,
          region: getRandomItem(['דרום', 'מרכז', 'צפון']),
        }
      });
      createdSalesTeams.push(team);
      
      // יצירת חברי צוות
      const memberNames = ['דני כהן', 'מיכל לוי', 'יוסי מזרחי'];
      for (const name of memberNames) {
        await prisma.misradSalesTeamMember.create({
          data: {
            organization_id: org.id,
            team_id: team.id,
            name: name,
            email: `${name.replace(/\s+/g, '.').toLowerCase()}@demo.local`,
            phone: `050-${getRandomInt(1000000, 9999999)}`,
            role: getRandomItem(['מנהל מכירות', 'נציג מכירות בכיר', 'נציג מכירות']),
          }
        });
      }
    }
    console.log(`   ✅ נוצרו ${createdSalesTeams.length} צוותי מכירות\n`);

    // 2. צוות שטח (MisradFieldTeam + MisradFieldTeamMember)
    console.log('📊 יוצר צוותי שטח...');
    
    const fieldTeams = ['צוות התקנות', 'צוות תחזוקה', 'צוות תמיכה טכנית'];
    const createdFieldTeams = [];

    for (const teamName of fieldTeams) {
      const team = await prisma.misradFieldTeam.create({
        data: {
          organization_id: org.id,
          name: teamName,
        }
      });
      createdFieldTeams.push(team);
      
      // יצירת חברי צוות
      const memberNames = ['אבי זוהר', 'רועי ביטון', 'עומר אדרי'];
      for (const name of memberNames) {
        await prisma.misradFieldTeamMember.create({
          data: {
            organization_id: org.id,
            team_id: team.id,
            name: name,
            email: `${name.replace(/\s+/g, '.').toLowerCase()}@demo.local`,
            phone: `052-${getRandomInt(1000000, 9999999)}`,
            role: getRandomItem(['טכנאי בכיר', 'טכנאי', 'מתקין']),
          }
        });
      }
    }
    console.log(`   ✅ נוצרו ${createdFieldTeams.length} צוותי שטח\n`);

    // 3. שותפים (Partner - לא SystemPartner!)
    console.log('📊 יוצר שותפים...');
    
    const partners = [
      { name: 'שותף עסקי א׳', type: 'reseller', commission: 15 },
      { name: 'שותף עסקי ב׳', type: 'affiliate', commission: 10 },
      { name: 'שותף טכנולוגי', type: 'technology', commission: 0 },
    ];

    for (const partner of partners) {
      await prisma.partner.create({
        data: {
          name: partner.name,
          email: `${partner.name.replace(/\s+/g, '.').toLowerCase()}@partner.com`,
          phone: `054-${getRandomInt(1000000, 9999999)}`,
          contactPerson: getRandomItem(['דן כהן', 'שרה לוי', 'יוסף אברהם']),
          website: 'https://partner.example.com',
          orgId: org.id,
        }
      });
    }
    console.log(`   ✅ נוצרו ${partners.length} שותפים\n`);

    // 4. אירועי צוות (NexusTeamEvent)
    console.log('📊 יוצר אירועי צוות...');
    
    const eventTypes = ['פגישת צוות', 'הדרכה', 'ימי גיבוש', 'כנס שנתי'];
    
    for (let i = 0; i < 8; i++) {
      const startDate = generateDate(getRandomInt(-30, 30));
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + getRandomInt(2, 8));
      
      await prisma.nexusTeamEvent.create({
        data: {
          organizationId: org.id,
          title: getRandomItem(eventTypes),
          description: 'תיאור האירוע...',
          eventType: getRandomItem(['meeting', 'training', 'team_building']),
          startDate: startDate,
          endDate: endDate,
          location: getRandomItem(['משרד ראשי', 'אולם אירועים', 'זום']),
        }
      });
    }
    console.log(`   ✅ נוצרו 8 אירועי צוות\n`);

    // 5. ליידים (SystemLead)
    console.log('📊 יוצר ליידים...');
    
    const existingLeads = await prisma.systemLead.count({
      where: { organizationId: org.id }
    });

    if (existingLeads === 0) {
      const names = ['דני כהן', 'מיכל לוי', 'יוסי מזרחי', 'נועה אברהם', 'גיא שפירא'];
      
      for (const name of names) {
        await prisma.systemLead.create({
          data: {
            organizationId: org.id,
            name: name,
            phone: `050-${getRandomInt(1000000, 9999999)}`,
            email: `${name.replace(/\s+/g, '.').toLowerCase()}@example.com`,
            companyName: `חברת ${name.split(' ')[1]}`,
            stage: getRandomItem(['חדש', 'נוצר קשר', 'פגישה תואמה', 'הצעת מחיר']),
            source: getRandomItem(['אתר', 'המלצה', 'פייסבוק', 'גוגל']),
            score: getRandomInt(10, 100),
            isHot: Math.random() > 0.7,
            lastContact: generateDate(getRandomInt(0, 30)),
            createdAt: generateDate(getRandomInt(0, 60)),
          }
        });
      }
      console.log(`   ✅ נוצרו ${names.length} ליידים\n`);
    } else {
      console.log(`   ℹ️  כבר קיימים ${existingLeads} ליידים\n`);
    }

    // 6. בדיקה סופית
    console.log('📊 בדיקה סופית:\n');
    
    const salesTeamCount = await prisma.misradSalesTeam.count({
      where: { organization_id: org.id }
    });
    const salesMemberCount = await prisma.misradSalesTeamMember.count({
      where: { organization_id: org.id }
    });
    const fieldTeamCount = await prisma.misradFieldTeam.count({
      where: { organization_id: org.id }
    });
    const fieldMemberCount = await prisma.misradFieldTeamMember.count({
      where: { organization_id: org.id }
    });
    const partnerCount = await prisma.partner.count({
      where: { orgId: org.id }
    });
    const eventCount = await prisma.nexusTeamEvent.count({
      where: { organizationId: org.id }
    });
    const leadCount = await prisma.systemLead.count({
      where: { organizationId: org.id }
    });

    console.log('תוצאות:');
    console.log(`   צוותי מכירות: ${salesTeamCount}`);
    console.log(`   חברי צוות מכירות: ${salesMemberCount}`);
    console.log(`   צוותי שטח: ${fieldTeamCount}`);
    console.log(`   חברי צוות שטח: ${fieldMemberCount}`);
    console.log(`   שותפים: ${partnerCount}`);
    console.log(`   אירועי צוות: ${eventCount}`);
    console.log(`   ליידים: ${leadCount}`);
    
    console.log('\n✨ הושלם בהצלחה!');

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateSystemModule();
