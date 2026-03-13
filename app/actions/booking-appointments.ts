'use server';

/**
 * Booking Appointments Server Actions
 * MISRAD AI - Appointment Scheduling
 * 
 * @module app/actions/booking-appointments
 * @description Server actions for appointment management
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import { eventBus } from '@/lib/events/event-bus';
import type {
  BookingAppointment,
  CreateBookingAppointmentDTO,
  UpdateBookingAppointmentDTO,
  BookingResponse,
  TimeSlot,
  AvailabilityResult,
  BookingErrorCode,
} from '@/types/booking';

// ============================================
// APPOINTMENT CRUD OPERATIONS
// ============================================

/**
 * יצירת תור חדש
 * עם בדיקות מקיפות נגד כפילויות
 */
export async function createBookingAppointment(
  orgSlug: string,
  data: CreateBookingAppointmentDTO
): Promise<BookingResponse<BookingAppointment>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createBookingAppointment', organizationId);

        // ולידציות בסיסיות
        if (!data.customerName?.trim()) {
          return { success: false, error: 'שם המזמין חובה' };
        }
        if (!data.customerEmail?.trim()) {
          return { success: false, error: 'מייל חובה' };
        }
        if (!data.startTime || !data.endTime) {
          return { success: false, error: 'זמני הפגישה חובים' };
        }

        // בדיקת זמנים - שהתור בעתיד
        if (new Date(data.startTime) < new Date()) {
          return { success: false, error: 'לא ניתן לקבוע תור בזמן שעבר' };
        }

        // בדיקת זמינות עם נעילה (Transaction)
        const appointment = await prisma.$transaction(async (tx) => {
          // בדיקה שאין תור קיים באותו זמן
          const existing = await tx.bookingAppointment.findFirst({
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
            throw new Error('הזמן כבר תפוס');
          }

          // יצירת התור
          return await tx.bookingAppointment.create({
            data: {
              organizationId,
              linkId: data.linkId,
              providerId: data.providerId,
              serviceId: data.serviceId,
              customerName: data.customerName.trim(),
              customerEmail: data.customerEmail.trim().toLowerCase(),
              customerPhone: data.customerPhone?.trim() || null,
              customerCompany: data.customerCompany?.trim() || null,
              customerReason: data.customerReason?.trim() || null,
              startTime: data.startTime,
              endTime: data.endTime,
              timezone: data.timezone || 'Asia/Jerusalem',
              locationType: data.locationType,
              locationDetails: data.locationDetails?.trim() || null,
              meetingUrl: data.meetingUrl || null,
              status: 'confirmed',
            },
            include: {
              provider: true,
              service: true,
              link: true,
            },
          });
        }, {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        });

        revalidatePath('/admin/booking/appointments');
        
        // 🏛️ AI Tower: Emit BOOKING_CREATED event (fire-and-forget)
        eventBus.emitSimple(
          'BOOKING_CREATED',
          {
            appointmentId: appointment.id,
            clientId: appointment.customerEmail,
            clientName: appointment.customerName,
            serviceId: appointment.serviceId,
            serviceName: appointment.service?.name,
            providerId: appointment.providerId,
            providerName: appointment.provider?.name,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            value: appointment.service?.price || 0,
          },
          organizationId,
          appointment.providerId || 'system',
          'booking-appointments.ts:createBookingAppointment'
        ).catch(() => {
          // Fail silently - don't block booking creation
        });
        
        return {
          success: true,
          data: appointment as unknown as BookingAppointment,
          message: 'התור נקבע בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'createBookingAppointment' }
    );
  } catch (error) {
    console.error('createBookingAppointment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה ביצירת תור';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * עדכון תור
 */
export async function updateBookingAppointment(
  orgSlug: string,
  appointmentId: string,
  data: UpdateBookingAppointmentDTO
): Promise<BookingResponse<BookingAppointment>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('updateBookingAppointment', organizationId);

        const existing = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
        });

        if (!existing) {
          return { success: false, error: 'תור לא נמצא' };
        }

        // אם משנים זמנים - בדיקת כפילויות
        if (data.startTime && data.endTime) {
          const conflict = await prisma.bookingAppointment.findFirst({
            where: {
              providerId: existing.providerId,
              id: { not: appointmentId },
              status: { notIn: ['cancelled', 'no_show'] },
              OR: [
                {
                  startTime: { lt: data.endTime },
                  endTime: { gt: data.startTime },
                },
              ],
            },
          });

          if (conflict) {
            return { success: false, error: 'הזמן החדש כבר תפוס' };
          }
        }

        const appointment = await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            ...(data.customerName && { customerName: data.customerName.trim() }),
            ...(data.customerEmail && { customerEmail: data.customerEmail.trim().toLowerCase() }),
            ...(data.customerPhone !== undefined && { customerPhone: data.customerPhone?.trim() || null }),
            ...(data.customerCompany !== undefined && { customerCompany: data.customerCompany?.trim() || null }),
            ...(data.customerReason !== undefined && { customerReason: data.customerReason?.trim() || null }),
            ...(data.startTime && { startTime: data.startTime }),
            ...(data.endTime && { endTime: data.endTime }),
            ...(data.locationType && { locationType: data.locationType }),
            ...(data.locationDetails !== undefined && { locationDetails: data.locationDetails?.trim() || null }),
            ...(data.status && { status: data.status }),
            ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes?.trim() || null }),
            ...(data.attended !== undefined && { attended: data.attended }),
          },
          include: {
            provider: true,
            service: true,
            link: true,
          },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          data: appointment as unknown as BookingAppointment,
          message: 'התור עודכן בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'updateBookingAppointment' }
    );
  } catch (error) {
    console.error('updateBookingAppointment error:', error);
    return {
      success: false,
      error: 'שגיאה בעדכון תור',
    };
  }
}

/**
 * ביטול תור
 */
export async function cancelBookingAppointment(
  orgSlug: string,
  appointmentId: string,
  reason?: string,
  cancelledBy: 'customer' | 'admin' = 'admin'
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('cancelBookingAppointment', organizationId);

        const existing = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
        });

        if (!existing) {
          return { success: false, error: 'תור לא נמצא' };
        }

        if (existing.status === 'cancelled') {
          return { success: false, error: 'התור כבר בוטל' };
        }

        // בדיקת מדיניות ביטול
        const link = await prisma.bookingLink.findUnique({
          where: { id: existing.linkId },
        });

        if (link && !link.allowCancellations && cancelledBy === 'customer') {
          return { success: false, error: 'לא ניתן לבטל תור זה' };
        }

        // בדיקת דדליין ביטול
        if (link?.cancellationDeadlineHours) {
          const deadline = new Date(existing.startTime);
          deadline.setHours(deadline.getHours() - link.cancellationDeadlineHours);
          
          if (new Date() > deadline) {
            return { 
              success: false, 
              error: `חלף הדדליין לביטול (נדרש ${link.cancellationDeadlineHours} שעות מראש)` 
            };
          }
        }

        await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy,
            cancellationReason: reason?.trim() || null,
          },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          message: 'התור בוטל בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'cancelBookingAppointment' }
    );
  } catch (error) {
    console.error('cancelBookingAppointment error:', error);
    return {
      success: false,
      error: 'שגיאה בביטול תור',
    };
  }
}

/**
 * קבלת תור בודד
 */
export async function getBookingAppointment(
  orgSlug: string,
  appointmentId: string
): Promise<BookingResponse<BookingAppointment>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingAppointment', organizationId);

        const appointment = await prisma.bookingAppointment.findFirst({
          where: { id: appointmentId, organizationId },
          include: {
            provider: true,
            service: true,
            link: true,
            payment: true,
            reminders: true,
          },
        });

        if (!appointment) {
          return { success: false, error: 'תור לא נמצא' };
        }

        return {
          success: true,
          data: appointment as unknown as BookingAppointment,
        };
      },
      { source: 'booking_actions', reason: 'getBookingAppointment' }
    );
  } catch (error) {
    console.error('getBookingAppointment error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת תור',
    };
  }
}

/**
 * קבלת רשימת תורים
 */
export async function getBookingAppointments(
  orgSlug: string,
  filters?: {
    providerId?: string;
    status?: string[];
    from?: Date;
    to?: Date;
    limit?: number;
  }
): Promise<BookingResponse<BookingAppointment[]>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingAppointments', organizationId);

        const appointments = await prisma.bookingAppointment.findMany({
          where: {
            organizationId,
            ...(filters?.providerId && { providerId: filters.providerId }),
            ...(filters?.status?.length && { status: { in: filters.status } }),
            ...(filters?.from && { startTime: { gte: filters.from } }),
            ...(filters?.to && { startTime: { lte: filters.to } }),
          },
          include: {
            provider: true,
            service: true,
            link: true,
            payment: true,
          },
          orderBy: { startTime: 'asc' },
          take: filters?.limit || 100,
        });

        return {
          success: true,
          data: appointments as unknown as BookingAppointment[],
        };
      },
      { source: 'booking_actions', reason: 'getBookingAppointments' }
    );
  } catch (error) {
    console.error('getBookingAppointments error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת תורים',
    };
  }
}

/**
 * עדכון סטטוס הגעה
 */
export async function updateAppointmentAttendance(
  orgSlug: string,
  appointmentId: string,
  attended: boolean
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('updateAppointmentAttendance', organizationId);

        await prisma.bookingAppointment.updateMany({
          where: { id: appointmentId, organizationId },
          data: { attended },
        });

        revalidatePath('/admin/booking/appointments');
        
        return {
          success: true,
          message: attended ? 'סומן כהגיע' : 'סומן שלא הגיע',
        };
      },
      { source: 'booking_actions', reason: 'updateAppointmentAttendance' }
    );
  } catch (error) {
    console.error('updateAppointmentAttendance error:', error);
    return {
      success: false,
      error: 'שגיאה בעדכון סטטוס',
    };
  }
}
