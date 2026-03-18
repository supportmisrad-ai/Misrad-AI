import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 עדכון לסטטוסים פשוטים\n');
  
  // עדכון כל הלידים לסטטוסים פשוטים
  const updates = await Promise.all([
    // זכייה → סגור
    prisma.systemLead.updateMany({
      where: { status: 'זכייה' },
      data: { status: 'סגור' }
    }),
    // won → סגור
    prisma.systemLead.updateMany({
      where: { status: 'won' },
      data: { status: 'סגור' }
    }),
    // הפסד → לא רלוונטי
    prisma.systemLead.updateMany({
      where: { status: 'הפסד' },
      data: { status: 'לא רלוונטי' }
    }),
    // lost → לא רלוונטי
    prisma.systemLead.updateMany({
      where: { status: 'lost' },
      data: { status: 'לא רלוונטי' }
    }),
    // incoming → חדש
    prisma.systemLead.updateMany({
      where: { status: 'incoming' },
      data: { status: 'חדש' }
    }),
    // contacted → נוצר קשר
    prisma.systemLead.updateMany({
      where: { status: 'contacted' },
      data: { status: 'נוצר קשר' }
    }),
    // meeting → פגישה תואמה
    prisma.systemLead.updateMany({
      where: { status: 'meeting' },
      data: { status: 'פגישה תואמה' }
    }),
    // proposal → הצעת מחיר
    prisma.systemLead.updateMany({
      where: { status: 'proposal' },
      data: { status: 'הצעת מחיר' }
    }),
    // negotiation → משא ומתן
    prisma.systemLead.updateMany({
      where: { status: 'negotiation' },
      data: { status: 'משא ומתן' }
    }),
    // churned → נטישה
    prisma.systemLead.updateMany({
      where: { status: 'churned' },
      data: { status: 'נטישה' }
    })
  ]);
  
  const totalUpdated = updates.reduce((sum, r) => sum + r.count, 0);
  console.log(`✅ עודכנו ${totalUpdated} לידים`);
  
  // בדיקה סופית
  const allLeads = await prisma.systemLead.findMany({
    select: { status: true }
  });
  
  const statuses = new Set(allLeads.map(l => l.status));
  console.log('\nסטטוסים בשימוש עכשיו:', Array.from(statuses));
  
  await prisma.$disconnect();
}

main();
