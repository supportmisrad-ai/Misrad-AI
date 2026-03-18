import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

// Journey stages templates
const JOURNEY_STAGES = [
  { name: 'הכרות ראשונית', status: 'COMPLETED' as const },
  { name: 'בניית אסטרטגיה', status: 'COMPLETED' as const },
  { name: 'הטמעה ראשונית', status: 'ACTIVE' as const },
  { name: 'אופטימיזציה', status: 'PENDING' as const },
  { name: 'צמיחה ומדידה', status: 'PENDING' as const },
];

// Action templates (APPROVAL, UPLOAD, SIGNATURE, FORM)
const ACTION_TEMPLATES = [
  { title: 'העלאת חוזה חתום', description: 'נא להעלות את החוזה החתום', type: 'UPLOAD' as const, status: 'PENDING' as const, dueDate: '2024-01-15', isBlocking: true },
  { title: 'אישור הצעת מחיר', description: 'אישור הצעת המחיר לפרויקט הבא', type: 'APPROVAL' as const, status: 'PENDING' as const, dueDate: '2024-01-20', isBlocking: false },
  { title: 'חתימת הסכם', description: 'חתימה על הסכם שירות', type: 'SIGNATURE' as const, status: 'COMPLETED' as const, dueDate: '2024-01-10', isBlocking: false },
];

// Meeting templates (ZOOM, FRONTAL, PHONE, WHATSAPP)
const MEETING_TEMPLATES = [
  { title: 'פגישת קיק-אוף', date: '2024-01-05', location: 'ZOOM' as const, attendees: ['יוסי כהן', 'מנהל פרויקט'], transcript: 'סיכום פגישת הקיק-אוף...', summary: 'הגדרת יעדים ומטרות לפרויקט' },
  { title: 'עדכון שבועי', date: '2024-01-12', location: 'ZOOM' as const, attendees: ['יוסי כהן'], transcript: 'עדכון על התקדמות...', summary: 'סקירת התקדמות והצלחות' },
  { title: 'סקירה חודשית', date: '2024-01-19', location: 'FRONTAL' as const, attendees: ['יוסי כהן', 'מנהל פרויקט', 'מנכ"ל'], transcript: 'סקירה מקיפה...', summary: 'ניתוח תוצאות ותכנון המשך' },
];

async function main() {
  console.log('🚀 יצירת נתוני demo למודול Client Portal\n');
  
  const clients = await prisma.misradClient.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true }
  });
  
  console.log(`📊 נמצאו ${clients.length} לקוחות\n`);
  
  let totalStages = 0;
  let totalActions = 0;
  let totalMeetings = 0;
  
  for (const client of clients) {
    console.log(`\n═══ מעבד לקוח: ${client.name} ═══`);
    
    // Create Journey Stages
    for (const stage of JOURNEY_STAGES) {
      await prisma.misradJourneyStage.create({
        data: {
          organization_id: ORG_ID,
          client_id: client.id,
          name: stage.name,
          status: stage.status,
          date: new Date().toISOString().split('T')[0],
          dateAt: new Date(),
          completionPercentage: stage.status === 'COMPLETED' ? 100 : stage.status === 'ACTIVE' ? 50 : 0,
        }
      });
      totalStages++;
    }
    console.log(`  ✅ נוצרו ${JOURNEY_STAGES.length} שלבי Journey`);
    
    // Create Actions
    for (const action of ACTION_TEMPLATES) {
      await prisma.misradClientAction.create({
        data: {
          organization_id: ORG_ID,
          client_id: client.id,
          title: action.title,
          description: action.description,
          type: action.type,
          status: action.status,
          dueDate: action.dueDate,
          dueDateAt: new Date(action.dueDate),
          isBlocking: action.isBlocking,
        }
      });
      totalActions++;
    }
    console.log(`  ✅ נוצרו ${ACTION_TEMPLATES.length} משימות`);
    
    // Create Meetings
    for (const meeting of MEETING_TEMPLATES) {
      await prisma.misradMeeting.create({
        data: {
          organization_id: ORG_ID,
          client_id: client.id,
          date: meeting.date,
          dateAt: new Date(meeting.date),
          meetingAt: new Date(meeting.date + 'T10:00:00Z'),
          title: meeting.title,
          location: meeting.location,
          attendees: meeting.attendees,
          transcript: meeting.transcript,
          summary: meeting.summary,
        }
      });
      totalMeetings++;
    }
    console.log(`  ✅ נוצרו ${MEETING_TEMPLATES.length} פגישות`);
  }
  
  console.log('\n\n═══ סיכום ═══');
  console.log(`✅ נוצרו בהצלחה:`);
  console.log(`   - ${totalStages} שלבי Journey`);
  console.log(`   - ${totalActions} משימות`);
  console.log(`   - ${totalMeetings} פגישות`);
  console.log(`\n🎉 Client Portal מוכן לשימוש!`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
