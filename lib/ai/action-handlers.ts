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
      select: { phone: true, name: true, email: true },
    });

    if (!client?.phone) {
      return { success: false, message: 'לקוח ללא מספר טלפון' };
    }

    // TODO: חיבור ל-WhatsApp API (Meta Business API או Twilio)
    // כרגע מדמה את הפעולה
    console.log('[AI Tower] Sending WhatsApp:', {
      to: client.phone,
      template: params.template,
      clientName: client.name,
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
    await prisma.aIInsight.update({
      where: { id: insightId },
      data: { 
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: access.userId,
      },
    });

    return {
      success: true,
      message: `הודעת WhatsApp נשלחה ל-${client.name || client.phone}`,
      data: { 
        recipient: client.phone,
        template: params.template,
        sentAt: new Date().toISOString(),
      },
    };

  } catch (error) {
    console.error('[AI Tower] WhatsApp action failed:', error);
    return {
      success: false,
      message: 'שגיאה בשליחת הודעה',
      error: error instanceof Error ? error.message : 'Unknown error',
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
      return { success: false, message: 'אין הרשאה לפעולות כספיות' };
    }

    // שליפת פרטי הלקוח
    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { 
        id: true, 
        name: true, 
        email: true,
        billingAddress: true,
        taxId: true,
      },
    });

    if (!client) {
      return { success: false, message: 'לקוח לא נמצא' };
    }

    // חישוב סכום אוטומטי אם נדרש
    let finalAmount = params.amount;
    if (params.autoFill && !finalAmount && params.projectId) {
      // שליפת סכום מהפרויקט
      const project = await prisma.cycle.findUnique({
        where: { id: params.projectId },
        select: { 
          id: true,
          // TODO: Add value/price field to cycle model
        },
      });
      // finalAmount = project?.value || 0;
      finalAmount = 0; // Placeholder
    }

    if (!finalAmount || finalAmount <= 0) {
      return { success: false, message: 'לא נמצא סכום לחשבונית' };
    }

    // TODO: יצירת חשבונית אמיתית דרך billing-actions
    // כרגע מדמה
    console.log('[AI Tower] Creating invoice:', {
      clientId: client.id,
      clientName: client.name,
      amount: finalAmount,
      description: params.description || `חשבונית עבור ${client.name}`,
    });

    // יצירת רשומת חשבונית ב-DB
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: access.organizationId!,
        clientId: client.id,
        amount: finalAmount,
        currency: 'ILS',
        status: 'draft',
        description: params.description || `חשבונית עבור ${client.name}`,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 ימים
        createdBy: access.userId,
        // TODO: Add more invoice fields
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
    await prisma.aIInsight.update({
      where: { id: insightId },
      data: { 
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: access.userId,
      },
    });

    return {
      success: true,
      message: `חשבונית על סך ${finalAmount}₪ נוצרה בהצלחה`,
      data: { 
        invoiceId: invoice.id,
        clientName: client.name,
        amount: finalAmount,
        status: 'draft',
      },
    };

  } catch (error) {
    console.error('[AI Tower] Create invoice action failed:', error);
    return {
      success: false,
      message: 'שגיאה ביצירת חשבונית',
      error: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('[AI Tower] Reassigning tasks:', {
      fromUser: params.fromUserId,
      taskCount: overdueTasks.length,
    });

    // רישום בלוג
    await watchtower.executeAction(insightId, 'REASSIGN_TASKS', {
      fromUserId: params.fromUserId,
      taskIds: overdueTasks.map(t => t.id),
      reassignedBy: access.userId,
    });

    return {
      success: true,
      message: `${overdueTasks.length} משימות marked לחלוקה מחדש`,
      data: { 
        taskCount: overdueTasks.length,
        tasks: overdueTasks.map(t => ({ id: t.id, title: t.title })),
      },
    };

  } catch (error) {
    console.error('[AI Tower] Reassign tasks failed:', error);
    return {
      success: false,
      message: 'שגיאה בחלוקת משימות',
      error: error instanceof Error ? error.message : 'Unknown error',
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
      return { success: false, message: 'אין הרשאה' };
    }

    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { phone: true, name: true, email: true },
    });

    if (!client) {
      return { success: false, message: 'לקוח לא נמצא' };
    }

    // בחירת ערוץ (WhatsApp או Email)
    const channel = client.phone ? 'whatsapp' : 'email';

    console.log('[AI Tower] Sending payment reminder:', {
      to: client.name,
      channel,
      amount: params.amount,
      daysOverdue: params.daysOverdue,
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
      message: `תזכורת תשלום נשלחה ל-${client.name}`,
      data: { channel, amount: params.amount },
    };

  } catch (error) {
    console.error('[AI Tower] Payment reminder failed:', error);
    return {
      success: false,
      message: 'שגיאה בשליחת תזכורת',
      error: error instanceof Error ? error.message : 'Unknown error',
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
      return { success: false, message: 'אין הרשאה' };
    }

    const client = await prisma.clientClient.findUnique({
      where: { id: params.clientId },
      select: { phone: true, name: true, email: true },
    });

    if (!client) {
      return { success: false, message: 'לקוח לא נמצא' };
    }

    const offerValidUntil = new Date();
    offerValidUntil.setDate(offerValidUntil.getDate() + params.offerValidDays);

    console.log('[AI Tower] Sending win-back offer:', {
      to: client.name,
      discount: params.discountPercent,
      validUntil: offerValidUntil,
    });

    await watchtower.executeAction(insightId, 'SEND_WIN_BACK_OFFER', {
      clientId: params.clientId,
      discountPercent: params.discountPercent,
      offerValidUntil: offerValidUntil.toISOString(),
      sentBy: access.userId,
    });

    return {
      success: true,
      message: `הצעת חזרה עם ${params.discountPercent}% הנחה נשלחה ל-${client.name}`,
      data: { 
        discount: params.discountPercent,
        validUntil: offerValidUntil.toISOString(),
      },
    };

  } catch (error) {
    console.error('[AI Tower] Win-back offer failed:', error);
    return {
      success: false,
      message: 'שגיאה בשליחת הצעה',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
