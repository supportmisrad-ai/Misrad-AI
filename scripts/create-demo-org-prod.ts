
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// CONSTANTS & CONFIG
// ==========================================

const TARGET_EMAIL = 'itsikdahan1@gmail.com';
const TARGET_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'; // Prod ID
const DEMO_ORG_SLUG = 'misrad-ai-demo-il';
const DEMO_ORG_NAME = 'הדגמה - סוכנות דיגיטל פרו';

// Realistic Israeli Data Arrays
const DEPARTMENTS = ['מכירות', 'שיווק', 'פיתוח', 'תמיכה', 'כספים', 'ניהול'];
const ROLES = ['עובד', 'מנהל צוות', 'סמנכ״ל', 'מנהל פרוייקטים'];

const ISRAELI_NAMES = [
  { first: 'דני', last: 'כהן', gender: 'male' },
  { first: 'מיכל', last: 'לוי', gender: 'female' },
  { first: 'יוסי', last: 'מזרחי', gender: 'male' },
  { first: 'נועה', last: 'אברהם', gender: 'female' },
  { first: 'גיא', last: 'שפירא', gender: 'male' },
  { first: 'עדי', last: 'פרידמן', gender: 'female' },
  { first: 'רועי', last: 'ביטון', gender: 'male' },
  { first: 'תמר', last: 'גולן', gender: 'female' },
  { first: 'אבי', last: 'זוהר', gender: 'male' },
  { first: 'שירה', last: 'ברק', gender: 'female' },
  { first: 'עומר', last: 'אדרי', gender: 'male' },
  { first: 'מאיה', last: 'סלע', gender: 'female' },
];

const CLIENT_COMPANIES = [
  'טכנולוגיות עתיד בע״מ',
  'סטארט-אפ ניין',
  'משרד עורכי דין שוהם',
  'מרפאת שיניים חיוך מושלם',
  'מסעדת השף הלבן',
  'מוסך הצפון',
  'חברת בנייה יסודות',
  'סטודיו לעיצוב קו נקי',
];

const LOCATIONS = [
  'תל אביב',
  'רמת גן',
  'הרצליה',
  'ירושלים',
  'ראשון לציון',
  'פתח תקווה',
];

// ==========================================
// UTILS
// ==========================================

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
  const prefix = getRandomItem(['050', '052', '053', '054', '055', '058']);
  const number = getRandomInt(1000000, 9999999);
  return `${prefix}-${number}`;
}

function generateIsraeliDate(daysAgo: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

// ==========================================
// MAIN LOGIC
// ==========================================

async function main() {
  console.log('🚀 Starting Demo Organization Creation for PROD...');
  console.log(`🎯 Target User: ${TARGET_EMAIL}`);

  // 1. Find User
  const user = await prisma.organizationUser.findFirst({
    where: {
      OR: [
        { email: { equals: TARGET_EMAIL, mode: 'insensitive' } },
        { clerk_user_id: TARGET_CLERK_ID }
      ]
    }
  });

  if (!user) {
    console.error('❌ User not found! Please check the email/clerk_id.');
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.full_name} (${user.id})`);

  // 2. Create or Update Organization
  let org = await prisma.organization.findFirst({
    where: { slug: DEMO_ORG_SLUG }
  });

  const orgData = {
    name: DEMO_ORG_NAME,
    slug: DEMO_ORG_SLUG,
    owner_id: user.id,
    subscription_plan: 'the_empire', // Full features
    subscription_status: 'active',
    has_nexus: true,
    has_social: true,
    has_system: true,
    has_finance: true,
    has_client: true,
    has_operations: true,
    seats_allowed: 50,
    balance: 0,
    is_shabbat_protected: true,
  };

  if (!org) {
    console.log(`📝 Creating new organization: ${DEMO_ORG_NAME}`);
    org = await prisma.organization.create({
      data: orgData
    });
  } else {
    console.log(`🔄 Updating existing organization: ${DEMO_ORG_NAME}`);
    org = await prisma.organization.update({
      where: { id: org.id },
      data: orgData
    });
  }

  // Link user to this org as owner if not already linked (optional, but good for direct access)
  // Note: user might be owner of another org, but we want them to have access here.
  // We'll add them as a OrganizationUser record if they aren't the owner in the org context? 
  // Actually the schema has `organization_id` on user, which is single relation. 
  // But there's also `owned_organizations`. 
  // Let's ensure the user has access. Since we set `owner_id`, they have access.

  const orgId = org.id;
  console.log(`🏢 Organization ID: ${orgId}`);

  // 3. SEED MODULES
  await seedNexus(orgId);
  await seedClients(orgId);
  await seedLeads(orgId);
  await seedTasks(orgId);
  await seedSocialMedia(orgId);
  await seedFinance(orgId);
  await seedOperations(orgId);
  await seedAttendance(orgId);
  await seedClientTasks(orgId);
  await seedClientPortalUsers(orgId);
  await seedSocialCampaigns(orgId);
  await seedSystemTickets(orgId);

  console.log('✨ Demo Organization setup complete!');
  console.log(`🔗 Access: https://misrad-ai.com/workspaces/${DEMO_ORG_SLUG}`);
}

// ==========================================
// MODULE SEEDERS
// ==========================================

async function seedNexus(orgId: string) {
  console.log('🔹 Seeding Nexus (HR/Team)...');
  
  // Create Employees (NexusUser)
  for (const person of ISRAELI_NAMES) {
    const email = `${person.first.toLowerCase()}.${person.last.toLowerCase()}@demo.local`;
    const exists = await prisma.nexusUser.findFirst({ where: { organizationId: orgId, email } });
    
    if (!exists) {
      await prisma.nexusUser.create({
        data: {
          organizationId: orgId,
          name: `${person.first} ${person.last}`,
          email: email,
          phone: generatePhone(),
          role: getRandomItem(ROLES),
          department: getRandomItem(DEPARTMENTS),
          location: getRandomItem(LOCATIONS),
          paymentType: getRandomItem(['monthly', 'hourly']),
          hourlyRate: getRandomInt(40, 150),
          monthlySalary: getRandomInt(7000, 25000),
          commissionPct: getRandomInt(0, 10),
        }
      });
    }
  }
  console.log('   ✅ Employees created');
}

async function seedClients(orgId: string) {
  console.log('🔹 Seeding Clients...');

  // Get employees for assignment
  const employees = await prisma.nexusUser.findMany({
    where: { organizationId: orgId },
    take: 12
  });

  for (const company of CLIENT_COMPANIES) {
    const exists = await prisma.clientClient.findFirst({ where: { organizationId: orgId, companyName: company } });
    
    if (!exists) {
      const contactFirst = getRandomItem(ISRAELI_NAMES).first;
      const contactLast = getRandomItem(ISRAELI_NAMES).last;
      const assignedManager = employees.length > 0 ? getRandomItem(employees) : null;
      
      await prisma.clientClient.create({
        data: {
          organizationId: orgId,
          companyName: company,
          fullName: `${contactFirst} ${contactLast}`,
          email: `${contactFirst.toLowerCase()}@${company.replace(/\s+/g, '').toLowerCase()}.co.il`,
          phone: generatePhone(),
          status: getRandomItem(['Active', 'Onboarding', 'Lead', 'Churned']),
          package: getRandomItem(['Retainer', 'Project', 'Hourly']),
          notes: 'לקוח דמו שנוצר אוטומטית',
          joinedAt: generateIsraeliDate(getRandomInt(10, 365)),
          contactPerson: assignedManager?.name || `${contactFirst} ${contactLast}`,
          metadata: {
            assignedManagerName: assignedManager?.name,
            assignedManagerPhone: assignedManager?.phone,
            assignedManagerEmail: assignedManager?.email,
          },
        }
      });
    }
  }
  console.log('   ✅ Clients created');
}

async function seedLeads(orgId: string) {
  console.log('🔹 Seeding System Leads...');
  
  // Pipeline Stages
  const stages = ['חדש', 'נוצר קשר', 'פגישה תואמה', 'הצעת מחיר', 'משא ומתן', 'זכייה', 'הפסד'];
  
  // Ensure stages exist (SystemPipelineStage) - Simplified for now, assuming defaults or just creating leads with statuses
  
  for (let i = 0; i < 15; i++) {
    const person = getRandomItem(ISRAELI_NAMES);
    const company = `עסק דמו ${i+1}`;
    
    await prisma.systemLead.create({
      data: {
        organizationId: orgId,
        name: `${person.first} ${person.last}`,
        company: company,
        email: `lead${i}@example.com`,
        phone: generatePhone(),
        source: getRandomItem(['Facebook', 'Google', 'Referral', 'Website']),
        status: getRandomItem(stages),
        value: getRandomInt(5000, 50000),
        score: getRandomInt(10, 100),
        isHot: Math.random() > 0.7,
        lastContact: generateIsraeliDate(getRandomInt(0, 30)),
        createdAt: generateIsraeliDate(getRandomInt(0, 60)),
      }
    });
  }
  console.log('   ✅ Leads created');
}

async function seedTasks(orgId: string) {
  console.log('🔹 Seeding Nexus Tasks...');
  
  const tasks = [
    'הכנת דוח חודשי',
    'פגישת צוות',
    'שיחת מכירה עם לקוח חדש',
    'עדכון אתר אינטרנט',
    'שליחת הצעת מחיר',
    'בדיקת מלאי',
    'סידור משרד',
    'הזמנת ציוד',
    'מענה למיילים',
    'קמפיין פייסבוק',
  ];

  for (let i = 0; i < 20; i++) {
    await prisma.nexusTask.create({
      data: {
        organizationId: orgId,
        title: getRandomItem(tasks),
        status: getRandomItem(['todo', 'in_progress', 'done', 'review']),
        priority: getRandomItem(['low', 'medium', 'high', 'critical']),
        dueDate: generateIsraeliDate(getRandomInt(-5, 14)), // Some overdue, some future
        createdAt: new Date(),
      }
    });
  }
  console.log('   ✅ Tasks created');
}

async function seedSocialMedia(orgId: string) {
  console.log('🔹 Seeding Social Media...');
  
  const clients = await prisma.clientClient.findMany({ 
    where: { organizationId: orgId },
    take: 5 
  });
  
  if (clients.length === 0) return;

  const postTemplates = [
    'טיפ שיווקי של היום: {tip}',
    'לקוחות שלנו אוהבים את {service}!',
    'סוף שבוע טוב מכל הצוות! 🎉',
    'מבצע מיוחד החודש - {offer}',
    'הכירו את הצוות שלנו - {name}',
  ];

  for (const client of clients) {
    // Create 10-15 posts per client
    for (let i = 0; i < getRandomInt(10, 15); i++) {
      const scheduledDate = generateIsraeliDate(getRandomInt(-30, 30));
      const isPast = scheduledDate < new Date();
      
      await prisma.socialPost.create({
        data: {
          organizationId: orgId,
          clientId: client.id,
          content: getRandomItem(postTemplates).replace('{tip}', 'תוכן איכותי').replace('{service}', 'השירות').replace('{offer}', '20% הנחה').replace('{name}', 'דני'),
          status: isPast ? 'published' : getRandomItem(['draft', 'scheduled', 'pending']),
          scheduled_at: scheduledDate,
          published_at: isPast ? scheduledDate : null,
          createdAt: generateIsraeliDate(getRandomInt(35, 60)),
        }
      });
    }
  }
  console.log('   ✅ Social posts created');
}

async function seedFinance(orgId: string) {
  console.log('🔹 Seeding Finance...');
  
  const clients = await prisma.clientClient.findMany({ 
    where: { organizationId: orgId },
    take: 6
  });
  
  if (clients.length === 0) return;

  // Create MisradClients for finance tracking
  for (const client of clients) {
    const misradClient = await prisma.misradClient.create({
      data: {
        organizationId: orgId,
        clientClientId: client.id,
        name: client.companyName || client.fullName,
        industry: getRandomItem(['טכנולוגיה', 'שירותים', 'קמעונאות', 'בריאות']),
        employeeCount: getRandomInt(5, 50),
        logoInitials: client.companyName?.substring(0, 2) || 'XX',
        healthScore: getRandomInt(60, 95),
        healthStatus: getRandomItem(['STABLE', 'AT_RISK', 'CRITICAL']),
        status: 'ACTIVE',
        type: 'RETAINER',
        monthlyRetainer: getRandomInt(3000, 15000),
        profitMargin: getRandomInt(20, 60),
        lifetimeValue: getRandomInt(20000, 150000),
        hoursLogged: getRandomInt(50, 300),
        internalHourlyRate: getRandomInt(150, 400),
        directExpenses: getRandomInt(1000, 8000),
        profitabilityVerdict: getRandomItem(['רווחי', 'נקודת איזון', 'הפסד']),
        lastContact: new Date().toISOString().split('T')[0],
        nextRenewal: generateIsraeliDate(-getRandomInt(30, 180)).toISOString().split('T')[0],
        mainContact: client.fullName,
        mainContactRole: 'מנכ״ל',
        strengths: ['תקשורת טובה', 'תשלומים בזמן'],
        weaknesses: ['דרישות שינויים', 'לא מגיב מהר'],
        sentimentTrend: ['POSITIVE', 'NEUTRAL'],
        referralStatus: 'נכון להפנות',
        healthBreakdown: {},
        engagementMetrics: {},
      }
    });

    // Create invoices for this client
    for (let i = 0; i < getRandomInt(3, 8); i++) {
      const amount = getRandomInt(2000, 12000);
      const dateAt = generateIsraeliDate(getRandomInt(0, 180));
      const dueDateAt = new Date(dateAt);
      dueDateAt.setDate(dueDateAt.getDate() + 30);

      await prisma.misradInvoice.create({
        data: {
          organization_id: orgId,
          client_id: misradClient.id,
          number: `INV-${getRandomInt(1000, 9999)}`,
          amount: amount,
          date: dateAt.toISOString().split('T')[0],
          dueDate: dueDateAt.toISOString().split('T')[0],
          dateAt: dateAt,
          dueDateAt: dueDateAt,
          status: getRandomItem(['PAID', 'PENDING', 'OVERDUE']),
          downloadUrl: `https://example.com/invoice-${i}.pdf`,
        }
      });
    }
  }
  console.log('   ✅ Finance data created');
}

async function seedOperations(orgId: string) {
  console.log('🔹 Seeding Operations...');

  // Create work orders / projects
  for (let i = 0; i < 12; i++) {
    await prisma.operationsWorkOrder.create({
      data: {
        organizationId: orgId,
        title: getRandomItem([
          'התקנת מערכת חדשה',
          'תיקון תקלה דחופה',
          'שדרוג ציוד',
          'תחזוקה שוטפת',
          'בדיקת מערכת',
        ]),
        description: 'פרטי הפרויקט...',
        status: getRandomItem(['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
        priority: getRandomItem(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
        installationAddress: getRandomItem(LOCATIONS),
        scheduledStart: generateIsraeliDate(getRandomInt(-10, 20)),
        createdAt: generateIsraeliDate(getRandomInt(15, 60)),
      }
    });
  }
  console.log('   ✅ Operations data created');
}

async function seedAttendance(orgId: string) {
  console.log('🔹 Seeding Attendance...');
  
  const employees = await prisma.nexusUser.findMany({
    where: { organizationId: orgId },
    take: 8
  });

  if (employees.length === 0) return;

  // Create time entries for the last 30 days
  for (const emp of employees) {
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      // Skip weekends randomly
      if (Math.random() > 0.7) continue;

      const date = generateIsraeliDate(dayOffset);
      const startHour = getRandomInt(7, 9);
      const endHour = getRandomInt(16, 19);
      
      const startTime = new Date(date);
      startTime.setHours(startHour, getRandomInt(0, 59), 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, getRandomInt(0, 59), 0);
      
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

      await prisma.nexusTimeEntry.create({
        data: {
          organizationId: orgId,
          userId: emp.id,
          startTime: startTime,
          endTime: endTime,
          date: date,
          durationMinutes: durationMinutes,
          startCity: getRandomItem(LOCATIONS),
          endCity: getRandomItem(LOCATIONS),
        }
      });
    }
  }
  console.log('   ✅ Attendance records created');
}

async function seedClientTasks(orgId: string) {
  console.log('🔹 Seeding Client Tasks...');
  
  const clients = await prisma.clientClient.findMany({ 
    where: { organizationId: orgId },
    take: 8
  });
  
  if (clients.length === 0) return;

  const taskTemplates = [
    'אישור לוגו חדש',
    'מילוי טופס צרכים',
    'העלאת תמונות למאגר',
    'חתימה על הסכם',
    'אישור תוכנית תוכן',
    'משוב על קמפיין',
    'אישור עיצוב אתר',
  ];

  for (const client of clients) {
    for (let i = 0; i < getRandomInt(3, 8); i++) {
      await prisma.clientTask.create({
        data: {
          organizationId: orgId,
          clientId: client.id,
          title: getRandomItem(taskTemplates),
          description: 'משימה דמו',
          status: getRandomItem(['todo', 'in_progress', 'done', 'pending']),
          priority: getRandomItem(['low', 'medium', 'high', 'urgent']),
          dueAt: generateIsraeliDate(getRandomInt(-5, 14)),
        }
      });
    }
  }
  console.log('   ✅ Client tasks created');
}

async function seedClientPortalUsers(orgId: string) {
  console.log('🔹 Seeding Client Portal Users...');
  
  const clients = await prisma.clientClient.findMany({ 
    where: { organizationId: orgId },
    take: 5
  });
  
  if (clients.length === 0) return;

  for (const client of clients) {
    // Create 1-2 portal users per client
    for (let i = 0; i < getRandomInt(1, 2); i++) {
      const person = getRandomItem(ISRAELI_NAMES);
      await prisma.clientPortalUser.create({
        data: {
          organizationId: orgId,
          clientId: client.id,
          clerkUserId: `user_demo_${client.id}_${i}`,
          email: `${person.first.toLowerCase()}.${person.last.toLowerCase()}@${client.companyName?.replace(/\s+/g, '').toLowerCase()}.co.il`,
          fullName: `${person.first} ${person.last}`,
          status: 'ACTIVE',
        }
      });
    }
  }
  console.log('   ✅ Portal users created');
}

async function seedSocialCampaigns(orgId: string) {
  console.log('🔹 Seeding Social Campaigns...');
  
  const socialClients = await prisma.clients.findMany({
    where: { organization_id: orgId },
    take: 3
  });
  
  if (socialClients.length === 0) return;

  const campaignNames = [
    'קמפיין השקה',
    'מבצע סוף עונה',
    'קידום ממומן פייסבוק',
    'תוכן ויראלי אורגני',
  ];

  for (const client of socialClients) {
    for (let i = 0; i < getRandomInt(2, 3); i++) {
      await prisma.socialMediaCampaign.create({
        data: {
          organizationId: orgId,
          client_id: client.id,
          name: getRandomItem(campaignNames),
          status: getRandomItem(['draft', 'active', 'paused', 'completed']),
          objective: getRandomItem(['awareness', 'engagement', 'conversion', 'traffic']),
          budget: getRandomInt(1000, 10000),
          spent: getRandomInt(0, 5000),
          impressions: getRandomInt(1000, 50000),
          clicks: getRandomInt(50, 2000),
          start_date: generateIsraeliDate(getRandomInt(10, 60)),
          end_date: generateIsraeliDate(getRandomInt(-30, 30)),
        }
      });
    }
  }
  console.log('   ✅ Social campaigns created');
}

async function seedSystemTickets(orgId: string) {
  console.log('🔹 Seeding System Support Tickets...');
  
  const leads = await prisma.systemLead.findMany({ 
    where: { organizationId: orgId },
    take: 8
  });
  
  if (leads.length === 0) return;

  const categories = ['טכני', 'מכירות', 'תמיכה', 'חיוב', 'כללי'];
  const subjects = [
    'בקשה למידע נוסף',
    'בעיה טכנית באתר',
    'שאלה לגבי מחירים',
    'בקשה לשדרוג חבילה',
    'תקלה במערכת',
  ];

  for (let i = 0; i < getRandomInt(5, 8); i++) {
    const lead = getRandomItem(leads);
    await prisma.systemSupportTicket.create({
      data: {
        organizationId: orgId,
        leadId: lead.id,
        category: getRandomItem(categories),
        subject: getRandomItem(subjects),
        status: getRandomItem(['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
      }
    });
  }
  console.log('   ✅ Support tickets created');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
