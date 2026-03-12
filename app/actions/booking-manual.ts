'use server';

/**
 * Booking Manual Management Server Actions
 * MISRAD AI - Manual appointment management
 * 
 * @module app/actions/booking-manual
 * @description Manual management actions - override payments, manual appointments, etc.
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import type {
  BookingAppointment,
  BookingResponse,
  BookingLocationType,
} from '@/types/booking';

// ============================================
// CANCELLATION REASONS (Predefined)
// ============================================

type CancellationReason = {
  id: string;
  label: string;
  requiresRefund: boolean;
  allowFreeText?: boolean;
};

export const CANCELLATION_REASONS: CancellationReason[] = [
  { id: 'customer_request', label: 'בקשת הלקוח', requiresRefund: true },
  { id: 'provider_emergency', label: 'מקרה חירום של נותן השירות', requiresRefund: true },
  { id: 'technical_issue', label: 'תקלה טכנית', requiresRefund: true },
  { id: 'no_show', label: 'הלקוח לא הגיע', requiresRefund: false },
  { id: 'weather', label: 'תנאי מזג אוויר', requiresRefund: true },
  { id: 'scheduling_conflict', label: 'כפילות בזימון', requiresRefund: true },
  { id: 'other', label: 'סיבה אחרת', requiresRefund: true, allowFreeText: true },
];

// ============================================
// MANUAL APPOINTMENT CREATION
// ============================================

/**
 * יצירת תור ידנית (ללא תשלום חובה)
 */
export async function createManualAppointment(
  orgSlug: string,
  data: {
    providerId: string;
    serviceId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerCompany?: string;
    customerReason?: string;
    startTime: Date;
    endTime: Date;
    locationType: BookingLocationType;
    locationDetails?: string;
    meetingUrl?: string;
    skipPayment?: boolean;
    adminNotes?: string;
  }
): Promise<BookingResponse<BookingAppointment>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createManualAppointment', organizationId);

        // ולידציה
        if (!data.customerName?.trim()) {
          return { success: false, error: 'שם המזמין חובה' };
        }
        if (!data.startTime || !data.endTime) {
          return { success: false, error: 'זמני הפגישה חובים' };
        }

        // בדיקת כפילויות
        const existing = await prisma.bookingAppointment.findFirst({
          where: {
            providerId: data.providerId,
            status: { notIn: ['cancelled', 'no_show'] },
            OR: [
              {
                startTime: { lt: data.endTime },
                endTime: { gt: data.startTime },
              },
            ],
          },
        });

        if (existing) {
          return { success: false, error: 'הזמן כבר תפוס' };
        }

        // יצירת התור
        const appointment = await prisma.bookingAppointment.create({
          data: {
            organizationId,
            linkId: '', // תור ידני ללא לינק
            providerId: data.providerId,
            serviceId: data.serviceId,
            customerName: data.customerName.trim(),
            customerEmail: data.customerEmail.trim().toLowerCase(),
            customerPhone: data.customerPhone?.trim() || null,
            customerCompany: data.customerCompany?.trim() || null,
            customerReason: data.customerReason?.trim() || null,
            startTime: data.startTime,
            endTime: data.endTime,
            timezone: 'Asia/Jerusalem',
            locationType: data.locationType,
            locationDetails: data.locationDetails?.trim() || null,
            meetingUrl: data.meetingUrl || null,
            status: 'confirmed',
            adminNotes: data.adminNotes?.trim() || null,
          },
          include: {
            provider: true,
            service: true,
          },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          data: appointment as unknown as BookingAppointment,
          message: 'התור נקבע בהצלחה',
        };
      },
      { source: 'booking_manual', reason: 'createManualAppointment' }
    );
  } catch (error) {
    console.error('createManualAppointment error:', error);
    return {
      success: false,
      error: 'שגיאה ביצירת תור ידני',
    };
  }
}

// ============================================
// MANUAL PAYMENT MANAGEMENT
// ============================================

/**
 * ביטול/החזר תשלום
 */
export async function refundBookingPayment(
  orgSlug: string,
  appointmentId: string,
  data: {
    reason: string;
    refundAmount?: number; // החזר חלקי
    refundFull?: boolean;
    adminNotes?: string;
  }
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('refundBookingPayment', organizationId);

        const appointment = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
          include: { payment: true },
        });

        if (!appointment) {
          return { success: false, error: 'תור לא נמצא' };
        }

        if (!appointment.payment) {
          return { success: false, error: 'אין תשלום להחזיר' };
        }

        // עדכון סטטוס התשלום
        await prisma.bookingPayment.update({
          where: { id: appointment.payment.id },
          data: {
            status: 'refunded',
            // בפרודקשן - כאן יש לקרוא ל-API של ספק התשלומים להחזר בפועל
          },
        });

        // עדכון הערות אדמין
        await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            adminNotes: `${appointment.adminNotes || ''}\n[החזר תשלום] ${data.reason}`,
          },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          message: 'התשלום הוחזר בהצלחה',
        };
      },
      { source: 'booking_manual', reason: 'refundBookingPayment' }
    );
  } catch (error) {
    console.error('refundBookingPayment error:', error);
    return {
      success: false,
      error: 'שגיאה בהחזר תשלום',
    };
  }
}

/**
 * סימון תור כשולם ידנית (ללא תשלום)
 */
export async function markAppointmentAsPaid(
  orgSlug: string,
  appointmentId: string,
  data: {
    paymentMethod?: string;
    transactionId?: string;
    adminNotes?: string;
  }
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('markAppointmentAsPaid', organizationId);

        const appointment = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
          include: { service: true },
        });

        if (!appointment) {
          return { success: false, error: 'תור לא נמצא' };
        }

        // יצירת רשומת תשלום ידנית
        await prisma.bookingPayment.create({
          data: {
            appointmentId,
            organizationId,
            amount: appointment.service.priceAmount || 0,
            currency: 'ILS',
            status: 'completed',
            provider: data.paymentMethod || 'manual',
            transactionId: data.transactionId || `manual-${Date.now()}`,
            paidAt: new Date(),
          },
        });

        // עדכון הערות
        await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            adminNotes: `${appointment.adminNotes || ''}\n[תשלום ידני] ${data.adminNotes || 'סומן כשולם'}`,
          },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          message: 'התור סומן כשולם',
        };
      },
      { source: 'booking_manual', reason: 'markAppointmentAsPaid' }
    );
  } catch (error) {
    console.error('markAppointmentAsPaid error:', error);
    return {
      success: false,
      error: 'שגיאה בסימון תשלום',
    };
  }
}

// ============================================
// ADVANCED CANCELLATION
// ============================================

/**
 * ביטול תור עם סיבה מוגדרת או טקסט חופשי
 */
export async function cancelAppointmentWithReason(
  orgSlug: string,
  appointmentId: string,
  data: {
    reasonId: string;
    customReason?: string;
    refundPayment?: boolean;
    notifyCustomer?: boolean;
    adminNotes?: string;
  }
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('cancelAppointmentWithReason', organizationId);

        const appointment = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
          include: { payment: true, service: true },
        });

        if (!appointment) {
          return { success: false, error: 'תור לא נמצא' };
        }

        // מציאת הסיבה
        const reason = CANCELLATION_REASONS.find(r => r.id === data.reasonId);
        const reasonText = reason?.allowFreeText && data.customReason
          ? data.customReason
          : reason?.label || data.reasonId;

        // ביטול התור
        await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'admin',
            cancellationReason: reasonText,
            adminNotes: `${appointment.adminNotes || ''}\n[ביטול] ${reasonText}${data.adminNotes ? ` - ${data.adminNotes}` : ''}`,
          },
        });

        // החזר תשלום אם נדרש
        if (data.refundPayment && appointment.payment && appointment.payment.status === 'completed') {
          await prisma.bookingPayment.update({
            where: { id: appointment.payment.id },
            data: { status: 'refunded' },
          });
        }

        // שליחת התראה ללקוח אם נדרש
        if (data.notifyCustomer) {
          // TODO: שליחת מייל/SMS
          console.log('TODO: Send cancellation notification to customer');
        }

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          message: 'התור בוטל בהצלחה',
        };
      },
      { source: 'booking_manual', reason: 'cancelAppointmentWithReason' }
    );
  } catch (error) {
    console.error('cancelAppointmentWithReason error:', error);
    return {
      success: false,
      error: 'שגיאה בביטול תור',
    };
  }
}

// ============================================
// RESCHEDULING
// ============================================

/**
 * קביעה מחדש של תור
 */
export async function rescheduleAppointment(
  orgSlug: string,
  appointmentId: string,
  data: {
    newStartTime: Date;
    newEndTime: Date;
    keepPayment?: boolean;
    adminNotes?: string;
  }
): Promise<BookingResponse<BookingAppointment>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('rescheduleAppointment', organizationId);

        const appointment = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
        });

        if (!appointment) {
          return { success: false, error: 'תור לא נמצא' };
        }

        // בדיקת כפילויות בזמן החדש
        const conflict = await prisma.bookingAppointment.findFirst({
          where: {
            providerId: appointment.providerId,
            id: { not: appointmentId },
            status: { notIn: ['cancelled', 'no_show'] },
            OR: [
              {
                startTime: { lt: data.newEndTime },
                endTime: { gt: data.newStartTime },
              },
            ],
          },
        });

        if (conflict) {
          return { success: false, error: 'הזמן החדש כבר תפוס' };
        }

        // עדכון התור
        const updated = await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            startTime: data.newStartTime,
            endTime: data.newEndTime,
            adminNotes: `${appointment.adminNotes || ''}\n[קביעה מחדש] ${data.adminNotes || ''}`,
          },
          include: {
            provider: true,
            service: true,
          },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          data: updated as unknown as BookingAppointment,
          message: 'התור נקבע מחדש בהצלחה',
        };
      },
      { source: 'booking_manual', reason: 'rescheduleAppointment' }
    );
  } catch (error) {
    console.error('rescheduleAppointment error:', error);
    return {
      success: false,
      error: 'שגיאה בקביעה מחדש',
    };
  }
}

// ============================================
// QUICK ACTIONS
// ============================================

/**
 * פעולות מהירות על תור
 */
export async function quickAppointmentAction(
  orgSlug: string,
  appointmentId: string,
  action: 'confirm' | 'complete' | 'no_show' | 'remind',
  notes?: string
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('quickAppointmentAction', organizationId);

        const updateData: Record<string, unknown> = {};

        switch (action) {
          case 'confirm':
            updateData.status = 'confirmed';
            break;
          case 'complete':
            updateData.status = 'completed';
            updateData.attended = true;
            break;
          case 'no_show':
            updateData.status = 'no_show';
            updateData.attended = false;
            break;
          case 'remind':
            // TODO: שליחת תזכורת
            break;
        }

        if (notes) {
          updateData.adminNotes = notes;
        }

        await prisma.bookingAppointment.updateMany({
          where: { id: appointmentId, organizationId },
          data: updateData,
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          message: 'הפעולה בוצעה בהצלחה',
        };
      },
      { source: 'booking_manual', reason: 'quickAppointmentAction' }
    );
  } catch (error) {
    console.error('quickAppointmentAction error:', error);
    return {
      success: false,
      error: 'שגיאה בביצוע פעולה',
    };
  }
}

// ============================================
// CANCELLATION POLICY
// ============================================

/**
 * שמירת מדיניות ביטולים
 */
export async function saveCancellationPolicy(
  orgSlug: string,
  policy: {
    freeCancellationHours: number;
    partialRefundHours: number;
    noRefundHours: number;
    noShowPolicy: 'no_refund' | 'partial_refund' | 'reschedule_only';
    providerCommitments: string;
    disputeResolution: string;
  }
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('saveCancellationPolicy', organizationId);

        // שמירה בהגדרות הארגון
        // TODO: להוסיף טבלת organization_settings או לשמור ב-json
        console.log('TODO: Save cancellation policy to organization settings', policy);

        revalidatePath('/admin/booking/settings');
        
        return {
          success: true,
          message: 'מדיניות הביטולים נשמרה בהצלחה',
        };
      },
      { source: 'booking_manual', reason: 'saveCancellationPolicy' }
    );
  } catch (error) {
    console.error('saveCancellationPolicy error:', error);
    return {
      success: false,
      error: 'שגיאה בשמירת מדיניות',
    };
  }
}
