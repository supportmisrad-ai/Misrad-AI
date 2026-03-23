/**
 * מילוי נתוני System module לארגון הדגמה
 * כולל: Pipeline Stages, לידים, פעילויות, טיקטים, צוותי מכירות, צוותי שטח, אירועים
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

const ISRAELI_NAMES = [
  { first: 'משה', last: 'כהן' },
  { first: 'שרה', last: 'לוי' },
  { first: 'דוד', last: 'מזרחי' },
  { first: 'רחל', last: 'אברהם' },
  { first: 'יוסף', last: 'פרץ' },
  { first: 'מרים', last: 'ביטון' },
  { first: 'אברהם', last: 'דהן' },
  { first: 'לאה', last: 'אוחיון' },
  { first: 'יעקב', last: 'שלום' },
  { first: 'חנה', last: 'גבאי' },
  { first: 'נתן', last: 'עמר' },
  { first: 'תמר', last: 'בן דוד' },
  { first: 'אליהו', last: 'חדד' },
  { first: 'נועה', last: 'רוזנברג' },
  { first: 'עומר', last: 'סויסה' },
];

const COMPANIES = [
  'סטודיו דיגיטל פלוס', 'קפה שוק', 'מסעדת הגינה', 'סטייל ביוטי', 'טק סולושנס',
  'בית ספר לשחייה', 'מספרת שיק', 'פיטנס פרו', 'נדל"ן גולד', 'יועצי שלומי',
  'מרכז רפואי אור', 'בניין חכם', 'סוכנות ביטוח אלון', 'חשבונאות מקצועית', 'גרפיקה פלוס',
];

const SOURCES = ['אתר', 'פייסבוק', 'המלצה', 'גוגל', 'לינקדאין', 'שיחה קרה', 'תערוכה', 'וואטסאפ'];
const LEAD_STATUSES = ['חדש', 'נוצר_קשר', 'פגישה_תואמה', 'הצעת_מחיר', 'משא_ומתן', 'נסגר_הצלחה', 'לא_רלוונטי'];
const TICKET_CATEGORIES = ['תמיכה טכנית', 'חיוב', 'שאלה כללית', 'באג', 'בקשת פיצ\'ר', 'אינטגרציה'];
const TICKET_STATUSES = ['פתוח', 'בטיפול', 'ממתין_ללקוח', 'סגור'];
const EVENT_TYPES = ['meeting', 'training', 'team_building', 'review', 'standup'];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(days: number): Date { return new Date(Date.now() - days * 86400000); }
function daysFromNow(days: number): Date { return new Date(Date.now() + days * 86400000); }
function randPhone(): string { return `05${randInt(0, 9)}${randInt(1000000, 9999999)}`; }
function randEmail(first: string, last: string): string { return `${first}.${last}@demo.co.il`.replace(/\s+/g, ''); }

async function main() {
  console.log('🚀 מתחיל מילוי נתוני System...\n');

  // Verify org exists
  const org = await prisma.organization.findUnique({ where: { id: DEMO_ORG_ID }, select: { name: true } });
  if (!org) { console.error('❌ ארגון לא נמצא!'); return; }
  console.log(`📌 ארגון: ${org.name}\n`);

  // ── 1. Pipeline Stages ──
  console.log('🔹 יוצר Pipeline Stages...');
  const stages = [
    { key: 'new', label: 'חדש', color: '#3b82f6', accent: '#dbeafe', order: 0 },
    { key: 'contacted', label: 'נוצר קשר', color: '#8b5cf6', accent: '#ede9fe', order: 1 },
    { key: 'meeting', label: 'פגישה תואמה', color: '#f59e0b', accent: '#fef3c7', order: 2 },
    { key: 'proposal', label: 'הצעת מחיר', color: '#ec4899', accent: '#fce7f3', order: 3 },
    { key: 'negotiation', label: 'משא ומתן', color: '#f97316', accent: '#ffedd5', order: 4 },
    { key: 'won', label: 'נסגר בהצלחה', color: '#22c55e', accent: '#dcfce7', order: 5 },
    { key: 'lost', label: 'לא רלוונטי', color: '#6b7280', accent: '#f3f4f6', order: 6 },
  ];

  let stagesCreated = 0;
  for (const s of stages) {
    try {
      await prisma.systemPipelineStage.upsert({
        where: { organizationId_key: { organizationId: DEMO_ORG_ID, key: s.key } },
        update: {},
        create: { organizationId: DEMO_ORG_ID, key: s.key, label: s.label, color: s.color, accent: s.accent, order: s.order },
      });
      stagesCreated++;
    } catch (e) { console.log(`  ⚠️  שלב ${s.key} כבר קיים`); }
  }
  console.log(`  ✅ ${stagesCreated} pipeline stages\n`);

  // ── 2. System Leads ──
  console.log('🔹 יוצר לידים...');
  const createdLeadIds: string[] = [];

  for (let i = 0; i < 15; i++) {
    const person = ISRAELI_NAMES[i];
    const company = COMPANIES[i];
    const name = `${person.first} ${person.last}`;
    const daysOld = randInt(1, 60);

    try {
      const lead = await prisma.systemLead.create({
        data: {
          organizationId: DEMO_ORG_ID,
          name,
          company,
          phone: randPhone(),
          email: randEmail(person.first, person.last),
          source: rand(SOURCES),
          status: rand(LEAD_STATUSES),
          value: randInt(500, 25000),
          lastContact: daysAgo(randInt(0, 14)),
          createdAt: daysAgo(daysOld),
          isHot: Math.random() > 0.6,
          score: randInt(10, 95),
          address: `רחוב ${rand(['הרצל', 'בן גוריון', 'רוטשילד', 'ויצמן', 'ז\'בוטינסקי'])} ${randInt(1, 120)}, ${rand(['תל אביב', 'חיפה', 'ירושלים', 'באר שבע', 'נתניה'])}`,
          productInterest: rand(['חבילת ניהול', 'מודול מכירות', 'CRM מלא', 'שיווק דיגיטלי', 'ניהול צוות']),
          closureProbability: randInt(10, 90),
          closureRationale: rand(['לקוח מעוניין מאוד', 'מחכה להחלטת תקציב', 'השוואה עם מתחרים', 'צפוי לסגור השבוע']),
          recommendedAction: rand(['לתאם פגישה', 'לשלוח הצעת מחיר', 'לעקוב מחר', 'להציג דמו', 'לשלוח חוזה']),
          nextActionDate: daysFromNow(randInt(1, 14)),
          nextActionNote: rand(['להתקשר שוב', 'לשלוח מייל סיכום', 'לשלוח הצעה מעודכנת', 'לבדוק סטטוס']),
        },
      });
      createdLeadIds.push(lead.id);
    } catch (e) {
      console.error(`  ❌ שגיאה ביצירת ליד ${i}:`, (e as Error).message);
    }
  }
  console.log(`  ✅ ${createdLeadIds.length} לידים\n`);

  // ── 3. Lead Activities ──
  console.log('🔹 יוצר פעילויות לידים...');
  let activitiesCreated = 0;
  const activityTypes = ['call', 'email', 'meeting', 'note', 'whatsapp'];
  const activityTitles: Record<string, string[]> = {
    call: ['שיחת היכרות', 'שיחת מעקב', 'שיחת סגירה', 'שיחה לאחר הצעה'],
    email: ['שליחת הצעת מחיר', 'מייל מעקב', 'שליחת חוזה', 'מייל תודה'],
    meeting: ['פגישת היכרות', 'דמו למוצר', 'פגישת סגירה', 'פגישת אונבורדינג'],
    note: ['הערה פנימית', 'סיכום פגישה', 'עדכון סטטוס', 'תזכורת'],
    whatsapp: ['הודעת וואטסאפ', 'שליחת קטלוג', 'תזכורת פגישה'],
  };

  for (const leadId of createdLeadIds) {
    const numActivities = randInt(1, 5);
    for (let j = 0; j < numActivities; j++) {
      const type = rand(activityTypes);
      try {
        const actTitle = rand(activityTitles[type]);
        await prisma.systemLeadActivity.create({
          data: {
            organizationId: DEMO_ORG_ID,
            leadId,
            type,
            content: `${actTitle} - ${rand([
              'הלקוח מעוניין בחבילה המלאה',
              'ביקש לחזור אליו בתחילת החודש',
              'מתעניין במודול ניהול צוות',
              'ביקש הנחה של 10%',
              'שלחנו הצעת מחיר מעודכנת',
              'סיכמנו פגישה ליום ראשון',
              'הלקוח השווה עם מתחרים',
              'נשלח דמו מוקלט',
            ])}`,
            createdAt: daysAgo(randInt(0, 30)),
          },
        });
        activitiesCreated++;
      } catch (e) { /* skip */ }
    }
  }
  console.log(`  ✅ ${activitiesCreated} פעילויות\n`);

  // ── 4. Support Tickets ──
  console.log('🔹 יוצר טיקטים...');
  let ticketsCreated = 0;
  const ticketSubjects = [
    'בעיה בהתחברות למערכת', 'שאלה לגבי חשבונית', 'בקשה להוספת משתמש',
    'המערכת איטית', 'שגיאה בדוח חודשי', 'בקשת אינטגרציה עם וואטסאפ',
    'לא מצליח לייצא נתונים', 'בעיה בלוח שנה', 'שאלה על תמחור',
    'בקשה לשינוי חבילה', 'לא מקבל התראות', 'בעיה במובייל',
  ];

  for (let i = 0; i < Math.min(12, createdLeadIds.length); i++) {
    try {
      await prisma.systemSupportTicket.create({
        data: {
          organizationId: DEMO_ORG_ID,
          leadId: createdLeadIds[i],
          category: rand(TICKET_CATEGORIES),
          subject: ticketSubjects[i],
          status: rand(TICKET_STATUSES),
          createdAt: daysAgo(randInt(0, 30)),
        },
      });
      ticketsCreated++;
    } catch (e) {
      console.error(`  ❌ טיקט ${i}:`, (e as Error).message);
    }
  }
  console.log(`  ✅ ${ticketsCreated} טיקטים\n`);

  // ── 5. Sales Teams ──
  console.log('🔹 יוצר צוותי מכירות...');
  const salesTeams = [
    { name: 'צוות מכירות צפון', color: '#3b82f6', target: 50000 },
    { name: 'צוות מכירות מרכז', color: '#8b5cf6', target: 80000 },
    { name: 'צוות מכירות דרום', color: '#f59e0b', target: 40000 },
  ];

  let salesTeamsCreated = 0;
  for (const st of salesTeams) {
    try {
      const team = await prisma.misradSalesTeam.create({
        data: {
          organization_id: DEMO_ORG_ID,
          name: st.name,
          description: `${st.name} - מכירות אזוריות`,
          color: st.color,
          target_monthly: st.target,
        },
      });

      // Add 2-3 members per team
      const numMembers = randInt(2, 3);
      for (let m = 0; m < numMembers; m++) {
        const person = rand(ISRAELI_NAMES);
        await prisma.misradSalesTeamMember.create({
          data: {
            organization_id: DEMO_ORG_ID,
            team_id: team.id,
            name: `${person.first} ${person.last}`,
            email: randEmail(person.first, person.last),
            phone: randPhone(),
            role: m === 0 ? 'LEADER' : 'MEMBER',
            target_monthly: randInt(10000, 30000),
          },
        });
      }
      salesTeamsCreated++;
    } catch (e) {
      console.error(`  ❌ צוות מכירות:`, (e as Error).message);
    }
  }
  console.log(`  ✅ ${salesTeamsCreated} צוותי מכירות\n`);

  // ── 6. Field Teams ──
  console.log('🔹 יוצר צוותי שטח...');
  const fieldTeams = [
    { name: 'צוות שטח תל אביב', area: 'תל אביב והמרכז', color: '#f43f5e' },
    { name: 'צוות שטח ירושלים', area: 'ירושלים והסביבה', color: '#10b981' },
  ];

  let fieldTeamsCreated = 0;
  for (const ft of fieldTeams) {
    try {
      await prisma.misradFieldTeam.create({
        data: {
          organization_id: DEMO_ORG_ID,
          name: ft.name,
          area: ft.area,
          color: ft.color,
        },
      });
      fieldTeamsCreated++;
    } catch (e) {
      console.error(`  ❌ צוות שטח:`, (e as Error).message);
    }
  }
  console.log(`  ✅ ${fieldTeamsCreated} צוותי שטח\n`);

  // ── 7. Team Events ──
  console.log('🔹 יוצר אירועי צוות...');
  const events = [
    { title: 'ישיבת צוות שבועית', type: 'meeting', days: -2 },
    { title: 'הדרכת מוצר חדש', type: 'training', days: 3 },
    { title: 'סקירת ביצועים חודשית', type: 'review', days: 7 },
    { title: 'Happy Hour צוות', type: 'team_building', days: 14 },
    { title: 'Stand-up יומי', type: 'standup', days: 0 },
    { title: 'פגישת אסטרטגיה Q2', type: 'meeting', days: 10 },
    { title: 'סדנת מכירות', type: 'training', days: 5 },
    { title: 'יום גיבוש', type: 'team_building', days: 21 },
  ];

  let eventsCreated = 0;
  for (const ev of events) {
    const startDate = ev.days >= 0 ? daysFromNow(ev.days) : daysAgo(-ev.days);
    const endDate = new Date(startDate.getTime() + 2 * 3600000); // +2 hours

    try {
      await prisma.nexusTeamEvent.create({
        data: {
          organizationId: DEMO_ORG_ID,
          title: ev.title,
          description: `${ev.title} - אירוע צוות`,
          event_type: ev.type,
          start_date: startDate,
          end_date: endDate,
          status: ev.days < 0 ? 'completed' : 'scheduled',
          location: rand(['משרד ראשי', 'זום', 'חדר ישיבות A', 'בחוץ', 'Google Meet']),
        },
      });
      eventsCreated++;
    } catch (e) {
      console.error(`  ❌ אירוע:`, (e as Error).message);
    }
  }
  console.log(`  ✅ ${eventsCreated} אירועי צוות\n`);

  // ── Summary ──
  console.log('\n📋 סיכום:');
  console.log(`  Pipeline Stages: ${stagesCreated}`);
  console.log(`  לידים: ${createdLeadIds.length}`);
  console.log(`  פעילויות: ${activitiesCreated}`);
  console.log(`  טיקטים: ${ticketsCreated}`);
  console.log(`  צוותי מכירות: ${salesTeamsCreated}`);
  console.log(`  צוותי שטח: ${fieldTeamsCreated}`);
  console.log(`  אירועים: ${eventsCreated}`);
  console.log('\n✅ הושלם!');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ שגיאה כללית:', e);
  prisma.$disconnect();
  process.exit(1);
});
