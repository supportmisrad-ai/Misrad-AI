/**
 * הוספת systemCalendarEvent לארגון הדמו
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

const EVENT_TYPES = ['פגישה', 'שיחה', 'הדגמה', 'followup', 'ישיבה'];
const LOCATIONS = ['זום', 'טלפון', 'משרד הלקוח', 'משרדנו', 'Teams'];
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function getDayName(d: Date): string {
  return DAY_NAMES[d.getDay() % 5] ?? 'ראשון';
}

async function run() {
  console.log('📅 הוספת נתוני לוח שנה...\n');

  // בדוק קיים
  const existing = await prisma.systemCalendarEvent.count({ where: { organizationId: ORG_ID } });
  if (existing > 0) {
    console.log(`  ✅ כבר יש ${existing} אירועים`);
    await prisma.$disconnect();
    return;
  }

  // קח כמה לידים קיימים
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, company: true },
    take: 15,
  });

  if (leads.length === 0) {
    console.log('  ⚠️ אין לידים — לא ניתן ליצור אירועים');
    await prisma.$disconnect();
    return;
  }

  const events = [
    { daysOffset: 1, title: 'הדגמת מוצר', lead: leads[0] },
    { daysOffset: 2, title: 'שיחת היכרות', lead: leads[1 % leads.length] },
    { daysOffset: 3, title: 'מעקב הצעת מחיר', lead: leads[2 % leads.length] },
    { daysOffset: 4, title: 'ישיבת אסטרטגיה', lead: leads[3 % leads.length] },
    { daysOffset: 5, title: 'בדיקת צרכים', lead: leads[4 % leads.length] },
    { daysOffset: 7, title: 'פרזנטציה', lead: leads[5 % leads.length] },
    { daysOffset: 8, title: 'סגירת עסקה', lead: leads[6 % leads.length] },
    { daysOffset: 9, title: 'אונבורדינג', lead: leads[7 % leads.length] },
    { daysOffset: 12, title: 'ביקורת שביעות רצון', lead: leads[8 % leads.length] },
    { daysOffset: 14, title: 'חידוש חוזה', lead: leads[9 % leads.length] },
    { daysOffset: -3, title: 'שיחה קודמת', lead: leads[10 % leads.length] },
    { daysOffset: -5, title: 'פגישה שהתקיימה', lead: leads[11 % leads.length] },
  ];

  let count = 0;
  for (const e of events) {
    const occursAt = daysFromNow(e.daysOffset);
    await prisma.systemCalendarEvent.create({
      data: {
        organizationId: ORG_ID,
        leadId: e.lead.id,
        title: e.title,
        leadName: e.lead.name,
        leadCompany: e.lead.company ?? '',
        dayName: getDayName(occursAt),
        date: formatDate(occursAt),
        time: formatTime(occursAt),
        occursAt,
        type: EVENT_TYPES[count % EVENT_TYPES.length],
        location: LOCATIONS[count % LOCATIONS.length],
        participants: Math.floor(Math.random() * 3) + 1,
      },
    });
    count++;
  }

  console.log(`  ✅ נוצרו ${count} אירועי לוח שנה`);

  const total = await prisma.systemCalendarEvent.count({ where: { organizationId: ORG_ID } });
  console.log(`  📊 סה"כ: ${total} אירועים`);

  await prisma.$disconnect();
}

run().catch((e) => { console.error('❌', e); prisma.$disconnect(); });
