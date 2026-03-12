import { createNexusTask } from '@/app/actions/nexus/_internal/tasks';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Creates an automatic task in Nexus when a booking is confirmed
 */
export async function createBookingNexusTask(appointmentId: string) {
  try {
    const appointment = await prisma.bookingAppointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        provider: true,
        organization: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const dateStr = format(new Date(appointment.startTime), 'dd/MM/yyyy', { locale: he });
    const timeStr = format(new Date(appointment.startTime), 'HH:mm', { locale: he });

    const taskTitle = `פגישה: ${appointment.customerName} - ${appointment.service.name}`;
    const taskDescription = `
תור חדש נקבע במערכת ה-Booking:
👤 לקוח: ${appointment.customerName}
📧 מייל: ${appointment.customerEmail}
📞 טלפון: ${appointment.customerPhone}
📅 תאריך: ${dateStr}
⏰ שעה: ${timeStr}
📍 מיקום: ${appointment.locationType === 'zoom' ? 'זום (לינק יישלח במייל)' : appointment.locationType}
💰 שירות: ${appointment.service.name}
    `.trim();

    // נחפש את ה-NexusUser שמתאים ל-Provider לפי האימייל
    const providerEmail = appointment.provider.email;
    const nexusUser = await prisma.nexusUser.findFirst({
      where: {
        organizationId: appointment.organizationId,
        email: providerEmail
      }
    });

    // נחפש את ה-Admins/CEOs של הארגון כדי לשלוח להם התראה/משימה במידת הצורך
    const orgAdmins = await prisma.nexusUser.findMany({
      where: {
        organizationId: appointment.organizationId,
        role: {
          in: ['מנכ״ל', 'אדמין']
        }
      }
    });

    const assigneeIds: string[] = [];
    if (nexusUser) assigneeIds.push(nexusUser.id);
    
    // מוסיפים את ה-Admins לרשימת ה-Assignees של המשימה אם רוצים שכולם יראו אותה ב-Nexus שלהם
    // לחילופין, אפשר להשאיר את המשימה רק ל-Provider ולשלוח לאחרים רק התראה
    orgAdmins.forEach((admin: any) => {
      if (!assigneeIds.includes(admin.id)) {
        assigneeIds.push(admin.id);
      }
    });

    await createNexusTask({
      orgId: appointment.organizationId,
      input: {
        title: taskTitle,
        description: taskDescription,
        status: 'Todo',
        priority: 'High' as any,
        dueDate: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
        dueTime: timeStr,
        module: 'booking',
        assigneeId: nexusUser?.id || orgAdmins[0]?.id, // האחראי הראשי
        assigneeIds, // כל מי שיוכל לראות ולנהל את המשימה
        tags: ['booking', 'auto-generated'],
        createdAt: new Date().toISOString(),
        timeSpent: 0,
        isTimerRunning: false,
        messages: [],
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in createBookingNexusTask:', error);
    return { success: false, error: 'Failed to create Nexus task' };
  }
}
