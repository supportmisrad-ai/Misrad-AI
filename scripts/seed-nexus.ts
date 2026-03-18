import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🚀 Seeding Nexus module data...');

  const org = await prisma.organization.findUnique({ where: { id: ORG_ID } });
  if (!org) {
    console.error('❌ Organization not found');
    return;
  }

  // Get the owner user to create OrganizationUser record
  const owner = await prisma.organizationUser.findFirst({
    where: { organization_id: ORG_ID }
  });
  
  if (!owner) {
    console.log('⚠️ No organization users found. Creating demo users...');
    
    // Create demo users first
    const demoUsers = [];
    
    // Create owner user
    const ownerUser = await prisma.organizationUser.create({
      data: {
        organization_id: ORG_ID,
        clerk_user_id: 'owner_demo_' + ORG_ID,
        email: 'owner@demo.com',
        full_name: 'בעלים דמו',
        avatar_url: null,
        role: 'owner',
        created_at: new Date()
      }
    });
    demoUsers.push(ownerUser);
    console.log('✅ Created owner demo user');
    
    // Create additional demo users
    for (let i = 1; i <= 2; i++) {
      const demoEmail = `demo${i}@demo.com`;
      const newDemoUser = await prisma.organizationUser.create({
        data: {
          organization_id: ORG_ID,
          clerk_user_id: `demo_${i}_${ORG_ID}`,
          email: demoEmail,
          full_name: `דמו משתמש ${i}`,
          avatar_url: null,
          role: 'member',
          created_at: new Date()
        }
      });
      demoUsers.push(newDemoUser);
      console.log(`✅ Created demo user ${i}`);
    }
    
    console.log('✅ Demo users created, continuing with Nexus seeding...');
    
    // --- NEXUS: Tasks ---
    console.log('📋 Seeding Nexus tasks...');

    const tasks = [
      {
        title: 'הכנת דוח חודשי ללקוחות',
        content: 'סיכום פעילות חודשית ושליחה ללקוחות פעילים',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedTo: demoUsers[0]?.clerk_user_id,
        createdBy: demoUsers[0]?.clerk_user_id
      },
      {
        title: 'פגישת צוות שבועית',
        content: 'סינכרון פעילות ותכנון השבוע הקרוב',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedTo: demoUsers[1]?.clerk_user_id,
        createdBy: demoUsers[0]?.clerk_user_id
      },
      {
        title: 'עדכון מערכת הניהול',
        content: 'התקנת עדכונים ובדיקת תקינות מערכת',
        status: 'completed',
        priority: 'low',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedTo: demoUsers[2]?.clerk_user_id,
        createdBy: demoUsers[0]?.clerk_user_id
      }
    ];

    // Create demo clients first for client_id
    const demoClient = await prisma.misradClient.create({
      data: {
        organizationId: ORG_ID,
        name: 'לקוח דמו נקסוס',
        industry: 'TECHNOLOGY',
        employeeCount: 10,
        logoInitials: 'לדנ',
        healthScore: 85,
        healthStatus: 'STABLE',
        status: 'ACTIVE',
        type: 'RETAINER',
        tags: [],
        monthlyRetainer: 5000,
        profitMargin: 30,
        lifetimeValue: 150000,
        hoursLogged: 100,
        internalHourlyRate: 200,
        directExpenses: 2000,
        profitabilityVerdict: 'HIGH',
        lastContact: new Date().toISOString().split('T')[0],
        nextRenewal: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mainContact: 'ישראל ישראלי',
        mainContactRole: 'מנכ"ל',
        strengths: [],
        weaknesses: [],
        referralStatus: 'NONE',
        healthBreakdown: {},
        engagementMetrics: {},
        created_at: new Date()
      }
    });

    try {
      for (const task of tasks) {
        const demoUser = demoUsers.find(u => u.clerk_user_id === task.assignedTo);
        if (!demoUser) continue;

        // Create NexusUser record for the demo user
        const nexusUser = await prisma.nexusUser.upsert({
          where: { 
            organizationId_email: {
              organizationId: ORG_ID,
              email: demoUser.email || `demo-${task.assignedTo}@demo.com`
            }
          },
          create: {
            organizationId: ORG_ID,
            name: demoUser.full_name || 'משתמש דמו',
            email: demoUser.email || `demo-${task.assignedTo}@demo.com`,
            role: 'member'
          },
          update: {}
        });

        await prisma.nexusTask.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: ORG_ID,
            title: task.title,
            description: task.content,
            status: task.status === 'todo' ? 'Todo' : task.status === 'in_progress' ? 'In Progress' : 'Done',
            priority: task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low',
            creatorId: nexusUser.id,
            assigneeId: nexusUser.id,
            assigneeIds: [nexusUser.id],
            dueDate: task.dueDate ? new Date(task.dueDate + 'T00:00:00.000Z') : null,
            clientId: demoClient.id,
            createdAt: new Date(),
            tags: [],
            timeSpent: 0,
            isTimerRunning: false,
            isPrivate: false,
            snoozeCount: 0,
            isFocus: false,
            module: 'nexus'
          }
        });
      }
      console.log('✅ Nexus tasks seeded successfully (in nexusTask table)');
    } catch (error) {
      console.log('⚠️ Could not seed tasks:', error);
    }

    console.log('✅ Nexus seeding completed!');
    await prisma.$disconnect();
    return;
  }
  await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Error seeding Nexus:', e);
    prisma.$disconnect();
});
