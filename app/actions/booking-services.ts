'use server';

/**
 * Booking Services Server Actions
 * MISRAD AI - Appointment Scheduling
 * 
 * @module app/actions/booking-services
 * @description Server actions for booking services management
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import type {
  BookingService,
  CreateBookingServiceDTO,
  UpdateBookingServiceDTO,
  BookingResponse,
} from '@/types/booking';

// ============================================
// SERVICE CRUD OPERATIONS
// ============================================

/**
 * יצירת שירות חדש
 */
export async function createBookingService(
  orgSlug: string,
  data: CreateBookingServiceDTO
): Promise<BookingResponse<BookingService>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createBookingService', organizationId);

        // ולידציה
        if (!data.name?.trim()) {
          return { success: false, error: 'שם השירות חובה' };
        }
        if (!data.durationMinutes || data.durationMinutes < 5) {
          return { success: false, error: 'משך השירות חייב להיות לפחות 5 דקות' };
        }

        const service = await prisma.bookingService.create({
          data: {
            organizationId,
            name: data.name.trim(),
            description: data.description?.trim() || null,
            color: data.color || '#6366f1',
            durationMinutes: data.durationMinutes,
            bufferAfterMinutes: data.bufferAfterMinutes || 0,
            priceAmount: data.priceAmount || null,
            currency: data.currency || 'ILS',
            requiresPayment: data.requiresPayment || false,
            requiresApproval: data.requiresApproval || false,
            requiresReason: data.requiresReason || false,
            isActive: true,
          },
        });

        revalidatePath('/admin/booking/services');
        
        return {
          success: true,
          data: service as unknown as BookingService,
          message: 'השירות נוצר בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'createBookingService' }
    );
  } catch (error) {
    console.error('createBookingService error:', error);
    return {
      success: false,
      error: 'שגיאה ביצירת שירות',
    };
  }
}

/**
 * עדכון שירות
 */
export async function updateBookingService(
  orgSlug: string,
  serviceId: string,
  data: UpdateBookingServiceDTO
): Promise<BookingResponse<BookingService>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('updateBookingService', organizationId);

        // בדיקה שהשירות קיים ושייך לארגון
        const existing = await prisma.bookingService.findFirst({
          where: { id: serviceId, organizationId },
        });

        if (!existing) {
          return { success: false, error: 'שירות לא נמצא' };
        }

        const service = await prisma.bookingService.update({
          where: { id: serviceId },
          data: {
            ...(data.name && { name: data.name.trim() }),
            ...(data.description !== undefined && { description: data.description?.trim() || null }),
            ...(data.color && { color: data.color }),
            ...(data.durationMinutes && { durationMinutes: data.durationMinutes }),
            ...(data.bufferAfterMinutes !== undefined && { bufferAfterMinutes: data.bufferAfterMinutes }),
            ...(data.priceAmount !== undefined && { priceAmount: data.priceAmount }),
            ...(data.requiresPayment !== undefined && { requiresPayment: data.requiresPayment }),
            ...(data.requiresApproval !== undefined && { requiresApproval: data.requiresApproval }),
            ...(data.requiresReason !== undefined && { requiresReason: data.requiresReason }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
        });

        revalidatePath('/admin/booking/services');
        
        return {
          success: true,
          data: service as unknown as BookingService,
          message: 'השירות עודכן בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'updateBookingService' }
    );
  } catch (error) {
    console.error('updateBookingService error:', error);
    return {
      success: false,
      error: 'שגיאה בעדכון שירות',
    };
  }
}

/**
 * מחיקת שירות (soft delete)
 */
export async function deleteBookingService(
  orgSlug: string,
  serviceId: string
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('deleteBookingService', organizationId);

        // בדיקה שהשירות קיים ושייך לארגון
        const existing = await prisma.bookingService.findFirst({
          where: { id: serviceId, organizationId },
        });

        if (!existing) {
          return { success: false, error: 'שירות לא נמצא' };
        }

        // בדיקה שאין תורים עתידיים עם השירות
        const futureAppointments = await prisma.bookingAppointment.count({
          where: {
            serviceId,
            startTime: { gte: new Date() },
            status: { notIn: ['cancelled', 'completed'] },
          },
        });

        if (futureAppointments > 0) {
          return {
            success: false,
            error: `לא ניתן למחוק - יש ${futureAppointments} תורים עתידיים המשתמשים בשירות זה`,
          };
        }

        // מחיקה רכה
        await prisma.bookingService.update({
          where: { id: serviceId },
          data: { isActive: false },
        });

        revalidatePath('/admin/booking/services');
        
        return {
          success: true,
          message: 'השירות הושבת בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'deleteBookingService' }
    );
  } catch (error) {
    console.error('deleteBookingService error:', error);
    return {
      success: false,
      error: 'שגיאה במחיקת שירות',
    };
  }
}

/**
 * קבלת שירות בודד
 */
export async function getBookingService(
  orgSlug: string,
  serviceId: string
): Promise<BookingResponse<BookingService>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingService', organizationId);

        const service = await prisma.bookingService.findFirst({
          where: { id: serviceId, organizationId },
          include: {
            providers: {
              where: { isActive: true },
              include: {
                provider: true,
              },
            },
          },
        });

        if (!service) {
          return { success: false, error: 'שירות לא נמצא' };
        }

        return {
          success: true,
          data: service as unknown as BookingService,
        };
      },
      { source: 'booking_actions', reason: 'getBookingService' }
    );
  } catch (error) {
    console.error('getBookingService error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת שירות',
    };
  }
}

/**
 * קבלת רשימת שירותים
 */
export async function getBookingServices(
  orgSlug: string,
  options?: {
    includeInactive?: boolean;
  }
): Promise<BookingResponse<BookingService[]>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingServices', organizationId);

        const services = await prisma.bookingService.findMany({
          where: {
            organizationId,
            ...(options?.includeInactive ? {} : { isActive: true }),
          },
          include: {
            providers: {
              where: { isActive: true },
              include: { provider: true },
            },
            _count: {
              select: {
                appointments: {
                  where: {
                    startTime: { gte: new Date() },
                    status: { notIn: ['cancelled', 'completed'] },
                  },
                },
              },
            },
          },
          orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        });

        return {
          success: true,
          data: services as unknown as BookingService[],
        };
      },
      { source: 'booking_actions', reason: 'getBookingServices' }
    );
  } catch (error) {
    console.error('getBookingServices error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת שירותים',
    };
  }
}
