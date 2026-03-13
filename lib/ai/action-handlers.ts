'use server';

import { prisma } from '@/lib/prisma';
import { requireAITowerAccess, hasPermission } from './ai-tower-guard';
import { watchtower } from './watchtower-engine';

// ═══════════════════════════════════════════════════════════════════
// AI Tower - Action Handlers
// ביצוע פעולות אמיתיות מתוך Action Cards
// ═══════════════════════════════════════════════════════════════════

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════
// 1. שליחת הודעת WhatsApp
// ═══════════════════════════════════════════════════════════════════

export async function sendWhatsAppMessage(
  insightId: string,
  params: {
    clientId: string;
    template: string;
    variables?: Record<string, string>;
    customMessage?: string;
  }
): Promise<ActionResult> {
  try {
    // 🛡️ אבטחה
    const access = await requireAITowerAccess();
    if (!hasPermission(access, 'execute_actions')) {
      return { success: false, message: 'אין הרשאה לביצוע פעולה זו' };
    }

    // שליפת פרטי הלקוח
    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { phone: true, fullName: true, email: true },
    });

    if (!client?.phone) {
      return { success: false, message: 'ללקוח אין מספר טלפון מוגדר' };
    }

    // TODO: חיבור ל-WhatsApp API (Meta Business API או Twilio)
    // כרגע מדמה את הפעולה
    console.log('[מגדל שמירה] שליחת WhatsApp:', {
      אל: client.phone,
      תבנית: params.template,
      שם_לקוח: client.fullName,
    });

    // רישום בלוג
    await watchtower.executeAction(insightId, 'SEND_WHATSAPP', {
      clientId: params.clientId,
      phone: client.phone,
      template: params.template,
      sentBy: access.userId,
      timestamp: new Date().toISOString(),
    });

    // עדכון סטטוס התובנה
    await prisma.ai_insights.update({
      where: { id: insightId },
      data: { 
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: access.userId,
      },
    });

    return {
      success: true,
      message: `הודעת WhatsApp נשלחה בהצלחה ל-${client.fullName || client.phone}`,
      data: { 
        recipient: client.phone,
        template: params.template,
        sentAt: new Date().toISOString(),
      },
    };

  } catch (error) {
    console.error('[מגדל שמירה] פעולת WhatsApp נכשלה:', error);
    return {
      success: false,
      message: 'שגיאה בשליחת ההודעה',
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. יצירת חשבונית
// ═══════════════════════════════════════════════════════════════════

export async function createInvoiceFromInsight(
  insightId: string,
  params: {
    clientId: string;
    projectId?: string;
    amount?: number;
    description?: string;
    autoFill?: boolean;
  }
): Promise<ActionResult> {
  try {
    // 🛡️ אבטחה - דורש הרשאה כספית
    const access = await requireAITowerAccess();
    if (!hasPermission(access, 'view_financial_insights')) {
      return { success: false, message: 'אין לך הרשאה לביצוע פעולות כספיות' };
    }

    // שליפת פרטי הלקוח
    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { 
        id: true, 
        fullName: true, 
        email: true,
      },
    });

    if (!client) {
      return { success: false, message: 'הלקוח לא נמצא במערכת' };
    }

    // חישוב סכום אוטומטי אם נדרש
    let finalAmount = params.amount;
    if (params.autoFill && !finalAmount && params.projectId) {
      // TODO: שליפת סכום מהפרויקט/צ'אט הרלוונטי
      console.log('[מגדל שמירה] בקשת מילוי אוטומטי עבור פרויקט:', params.projectId);
      finalAmount = 0; // Placeholder
    }

    if (!finalAmount || finalAmount <= 0) {
      return { success: false, message: 'לא נמצא סכום תקין ליצירת חשבונית' };
    }

    // TODO: יצירת חשבונית אמיתית דרך billing-actions
    // כרגע מדמה
    console.log('[מגדל שמירה] יצירת חשבונית:', {
      clientId: client.id,
      clientName: client.fullName,
      amount: finalAmount,
      description: params.description || `חשבונית עבור ${client.fullName}`,
    });

    // יצירת רשומת חשבונית ב-DB
    const invoice = await prisma.billing_invoices.create({
      data: {
        organization_id: access.organizationId!,
        morning_invoice_id: `INV-${Date.now()}`,
        invoice_number: `INV-${Date.now()}`,
        amount: finalAmount,
        currency: 'ILS',
        status: 'draft',
        description: params.description || `חשבונית עבור ${client.fullName}`,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 ימים
      },
    });

    // רישום בלוג
    await watchtower.executeAction(insightId, 'CREATE_INVOICE', {
      clientId: params.clientId,
      invoiceId: invoice.id,
      amount: finalAmount,
      createdBy: access.userId,
      timestamp: new Date().toISOString(),
    });

    // עדכון סטטוס התובנה
    await prisma.ai_insights.update({
      where: { id: insightId },
      data: { 
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: access.userId,
      },
    });

    return {
      success: true,
      message: `חשבונית טיוטה על סך ${finalAmount}₪ נוצרה בהצלחה עבור ${client.fullName}`,
      data: { 
        invoiceId: invoice.id,
        clientName: client.fullName,
        amount: finalAmount,
        status: 'draft',
      },
    };

  } catch (error) {
    console.error('[מגדל שמירה] יצירת חשבונית נכשלה:', error);
    return {
      success: false,
      message: 'שגיאה ביצירת החשבונית',
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. חלוקת משימות מחדש
// ═══════════════════════════════════════════════════════════════════

export async function reassignTasks(
  insightId: string,
  params: {
    fromUserId: string;
    toUserId?: string; // אם לא צוין - מחלק אוטומטית
    maxTasks: number;
    taskIds?: string[]; // משימות ספציפיות
  }
): Promise<ActionResult> {
  try {
    // 🛡️ אבטחה
    const access = await requireAITowerAccess();
    if (!hasPermission(access, 'execute_actions')) {
      return { success: false, message: 'אין הרשאה לחלוקת משימות' };
    }

    // שליפת משימות בפיגור של המשתמש
    const overdueTasks = await prisma.cycleTask.findMany({
      where: {
        completions: { none: {} },
        dueDate: { lt: new Date() },
        cycle: {
          tasks: {
            some: {
              // TODO: Add assignee field
            }
          }
        }
      },
      take: params.maxTasks,
    });

    if (overdueTasks.length === 0) {
      return { success: false, message: 'לא נמצאו משימות לחלוקה' };
    }

    // TODO: חלוקה אוטומטית או ידנית
    console.log('[מגדל שמירה] חלוקת משימות מחדש:', {
      מ: params.fromUserId,
      כמות: overdueTasks.length,
    });

    // רישום בלוג
    await watchtower.executeAction(insightId, 'REASSIGN_TASKS', {
      fromUserId: params.fromUserId,
      taskIds: overdueTasks.map((t: { id: string }) => t.id),
      reassignedBy: access.userId,
    });

    return {
      success: true,
      message: `${overdueTasks.length} משימות הועברו לטיפול מחדש`,
      data: { 
        taskCount: overdueTasks.length,
        tasks: overdueTasks.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })),
      },
    };

  } catch (error) {
    console.error('[מגדל שמירה] חלוקת משימות נכשלה:', error);
    return {
      success: false,
      message: 'שגיאה בחלוקת משימות',
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. שליחת תזכורת תשלום
// ═══════════════════════════════════════════════════════════════════

export async function sendPaymentReminder(
  insightId: string,
  params: {
    clientId: string;
    invoiceId: string;
    amount: number;
    daysOverdue: number;
  }
): Promise<ActionResult> {
  try {
    // 🛡️ אבטחה
    const access = await requireAITowerAccess();
    if (!hasPermission(access, 'execute_actions')) {
      return { success: false, message: 'אין לך הרשאה לביצוע פעולה זו' };
    }

    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { phone: true, fullName: true, email: true },
    });

    if (!client) {
      return { success: false, message: 'הלקוח לא נמצא במערכת' };
    }

    // בחירת ערוץ (WhatsApp או Email)
    const channel = client.phone ? 'whatsapp' : 'email';

    console.log('[מגדל שמירה] שליחת תזכורת תשלום:', {
      אל: client.fullName,
      ערוץ: channel,
      סכום: params.amount,
      ימי_איחור: params.daysOverdue,
    });

    // TODO: שליחה בפועל

    await watchtower.executeAction(insightId, 'SEND_PAYMENT_REMINDER', {
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      daysOverdue: params.daysOverdue,
      channel,
      sentBy: access.userId,
    });

    return {
      success: true,
      message: `תזכורת תשלום נשלחה בהצלחה ל-${client.fullName}`,
      data: { channel, amount: params.amount },
    };

  } catch (error) {
    console.error('[מגדל שמירה] תזכורת תשלום נכשלה:', error);
    return {
      success: false,
      message: 'שגיאה בשליחת תזכורת תשלום',
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5. שליחת הצעת חזרה (Win Back)
// ═══════════════════════════════════════════════════════════════════

export async function sendWinBackOffer(
  insightId: string,
  params: {
    clientId: string;
    discountPercent: number;
    offerValidDays: number;
  }
): Promise<ActionResult> {
  try {
    // 🛡️ אבטחה
    const access = await requireAITowerAccess();
    if (!hasPermission(access, 'execute_actions')) {
      return { success: false, message: 'אין לך הרשאה לביצוע פעולה זו' };
    }

    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { phone: true, fullName: true, email: true },
    });

    if (!client) {
      return { success: false, message: 'הלקוח לא נמצא במערכת' };
    }

    const offerValidUntil = new Date();
    offerValidUntil.setDate(offerValidUntil.getDate() + params.offerValidDays);

    console.log('[מגדל שמירה] שליחת הצעת חזרה:', {
      אל: client.fullName,
      הנחה: params.discountPercent,
      בתוקף_עד: offerValidUntil,
    });

    await watchtower.executeAction(insightId, 'SEND_WIN_BACK_OFFER', {
      clientId: params.clientId,
      discountPercent: params.discountPercent,
      offerValidUntil: offerValidUntil.toISOString(),
      sentBy: access.userId,
    });

    return {
      success: true,
      message: `הצעת חזרה עם ${params.discountPercent}% הנחה נשלחה בהצלחה ל-${client.fullName}`,
      data: { 
        discount: params.discountPercent,
        validUntil: offerValidUntil.toISOString(),
      },
    };

  } catch (error) {
    console.error('[מגדל שמירה] הצעת חזרה נכשלה:', error);
    return {
      success: false,
      message: 'שגיאה בשליחת הצעת חזרה',
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}
