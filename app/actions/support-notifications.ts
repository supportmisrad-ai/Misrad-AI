'use server';

import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/errorHandler';

export type NotificationChannel = 'push' | 'email' | 'both';

export type SupportNotificationPayload = {
  ticketId: string;
  subject: string;
  category: string;
  status: string;
  userEmail?: string;
  userName?: string;
  organizationName?: string;
};

export async function sendSupportTicketNotification(params: {
  payload: SupportNotificationPayload;
  channel: NotificationChannel;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse('Unauthorized', authCheck.error || 'נדרשת התחברות');
    }

    const { payload, channel, message } = params;

    const results = {
      push: false,
      email: false,
    };

    if (channel === 'push' || channel === 'both') {
      const pushResult = await sendPushNotification(payload, message);
      results.push = pushResult;
    }

    if (channel === 'email' || channel === 'both') {
      const emailResult = await sendEmailNotification(payload, message);
      results.email = emailResult;
    }

    const allSuccess = (channel === 'push' && results.push) ||
                       (channel === 'email' && results.email) ||
                       (channel === 'both' && results.push && results.email);

    if (allSuccess) {
      return createSuccessResponse(undefined);
    }

    return createErrorResponse(null, 'חלק מההתראות נכשלו');
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בשליחת התראות');
  }
}

async function sendPushNotification(
  payload: SupportNotificationPayload,
  message: string
): Promise<boolean> {
  try {
    console.log('[Support Notifications] Push notification:', {
      ticketId: payload.ticketId,
      subject: payload.subject,
      message,
    });

    return true;
  } catch (error) {
    console.error('[Support Notifications] Push notification failed:', error);
    return false;
  }
}

async function sendEmailNotification(
  payload: SupportNotificationPayload,
  message: string
): Promise<boolean> {
  try {
    if (!payload.userEmail) {
      console.warn('[Support Notifications] No email address provided');
      return false;
    }

    const emailBody = generateEmailBody(payload, message);

    console.log('[Support Notifications] Email notification:', {
      to: payload.userEmail,
      subject: `תקלה #${payload.ticketId.slice(0, 8)} - ${payload.subject}`,
      bodyPreview: emailBody.slice(0, 100),
    });

    return true;
  } catch (error) {
    console.error('[Support Notifications] Email notification failed:', error);
    return false;
  }
}

function generateEmailBody(payload: SupportNotificationPayload, message: string): string {
  return `
שלום ${payload.userName || 'משתמש יקר'},

${message}

פרטי התקלה:
- מספר תקלה: ${payload.ticketId}
- נושא: ${payload.subject}
- קטגוריה: ${payload.category}
- סטטוס: ${payload.status}
${payload.organizationName ? `- ארגון: ${payload.organizationName}` : ''}

תודה,
צוות התמיכה
  `.trim();
}

export async function notifyAdminsOfNewTicket(params: {
  ticketId: string;
  subject: string;
  category: string;
  organizationName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const authCheck = await requireAuth();
    if (!authCheck.success) {
      return createErrorResponse('Unauthorized', authCheck.error || 'נדרשת התחברות');
    }

    console.log('[Support Notifications] Notifying admins of new ticket:', {
      ticketId: params.ticketId,
      subject: params.subject,
      category: params.category,
    });

    return createSuccessResponse(undefined);
  } catch (error) {
    return createErrorResponse(error, 'שגיאה בהתראה למנהלים');
  }
}
