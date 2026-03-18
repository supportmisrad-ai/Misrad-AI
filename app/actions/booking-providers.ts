'use server';

/**
 * Booking System Server Actions
 * MISRAD AI - Appointment Scheduling
 * 
 * @module app/actions/booking
 * @description Server actions for booking providers management
 */

import { prisma } from '@/lib/prisma';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import type {
  BookingProvider,
  CreateBookingProviderDTO,
  UpdateBookingProviderDTO,
  BookingResponse,
  BookingPaginatedResponse,
  ProviderWithStats,
} from '@/types/booking';
import type { BookingProvider as PrismaBookingProvider } from '@prisma/client';

// ============================================
// PROVIDER CRUD OPERATIONS
// ============================================

/**
 * יצירת נותן שירות חדש
 */
export async function createBookingProvider(
  orgSlug: string,
  data: CreateBookingProviderDTO
): Promise<BookingResponse<BookingProvider>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createBookingProvider', organizationId);

        // ולידציה
        if (!data.name?.trim()) {
          return { success: false, error: 'שם נותן השירות חובה' };
        }
        if (!data.email?.trim()) {
          return { success: false, error: 'מייל חובה' };
        }

        // בדיקת אימייל תקין
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          return { success: false, error: 'פורמט מייל לא תקין' };
        }

        const provider = await prisma.bookingProvider.create({
          data: {
            organizationId,
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            phone: data.phone?.trim() || null,
            avatar: data.avatar || null,
            bufferMinutes: data.bufferMinutes ?? 15,
            maxDailyAppointments: data.maxDailyAppointments ?? 8,
            isActive: true,
          },
        });

        
        return {
          success: true,
          data: provider as BookingProvider,
          message: 'נותן השירות נוצר בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'createBookingProvider' }
    );
  } catch (error) {
    console.error('createBookingProvider error:', error);
    return {
      success: false,
      error: 'שגיאה ביצירת נותן שירות',
    };
  }
}

/**
 * עדכון נותן שירות
 */
export async function updateBookingProvider(
  orgSlug: string,
  providerId: string,
  data: UpdateBookingProviderDTO
): Promise<BookingResponse<BookingProvider>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('updateBookingProvider', organizationId);

        // בדיקה שה-provider קיים ושייך לארגון
        const existing = await prisma.bookingProvider.findFirst({
          where: { id: providerId, organizationId },
        });

        if (!existing) {
          return { success: false, error: 'נותן שירות לא נמצא' };
        }

        // בדיקת אימייל אם עודכן
        if (data.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.email)) {
            return { success: false, error: 'פורמט מייל לא תקין' };
          }
        }

        const provider = await prisma.bookingProvider.update({
          where: { id: providerId },
          data: {
            ...(data.name && { name: data.name.trim() }),
            ...(data.email && { email: data.email.trim().toLowerCase() }),
            ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
            ...(data.avatar !== undefined && { avatar: data.avatar || null }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...(data.bufferMinutes !== undefined && { bufferMinutes: data.bufferMinutes }),
            ...(data.maxDailyAppointments !== undefined && { maxDailyAppointments: data.maxDailyAppointments }),
          },
        });

        
        return {
          success: true,
          data: provider as BookingProvider,
          message: 'נותן השירות עודכן בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'updateBookingProvider' }
    );
  } catch (error) {
    console.error('updateBookingProvider error:', error);
    return {
      success: false,
      error: 'שגיאה בעדכון נותן שירות',
    };
  }
}

/**
 * מחיקת נותן שירות (soft delete - פשוט משנה ל-inactive)
 */
export async function deleteBookingProvider(
  orgSlug: string,
  providerId: string
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('deleteBookingProvider', organizationId);

        // בדיקה שה-provider קיים ושייך לארגון
        const existing = await prisma.bookingProvider.findFirst({
          where: { id: providerId, organizationId },
          include: {
            _count: {
              select: { appointments: true },
            },
          },
        });

        if (!existing) {
          return { success: false, error: 'נותן שירות לא נמצא' };
        }

        // בדיקה שאין תורים עתידיים
        const futureAppointments = await prisma.bookingAppointment.count({
          where: {
            providerId,
            startTime: { gte: new Date() },
            status: { notIn: ['cancelled', 'completed'] },
          },
        });

        if (futureAppointments > 0) {
          return {
            success: false,
            error: `לא ניתן למחוק - יש ${futureAppointments} תורים עתידיים`,
          };
        }

        // מחיקה רכה - סימון כלא פעיל
        await prisma.bookingProvider.update({
          where: { id: providerId },
          data: { isActive: false },
        });

        
        return {
          success: true,
          message: 'נותן השירות הושבת בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'deleteBookingProvider' }
    );
  } catch (error) {
    console.error('deleteBookingProvider error:', error);
    return {
      success: false,
      error: 'שגיאה במחיקת נותן שירות',
    };
  }
}

/**
 * קבלת נותן שירות בודד
 */
export async function getBookingProvider(
  orgSlug: string,
  providerId: string
): Promise<BookingResponse<BookingProvider>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingProvider', organizationId);

        const provider = await prisma.bookingProvider.findFirst({
          where: { id: providerId, organizationId },
          include: {
            services: {
              where: { isActive: true },
              include: {
                service: true,
              },
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
        });

        if (!provider) {
          return { success: false, error: 'נותן שירות לא נמצא' };
        }

        return {
          success: true,
          data: provider as unknown as BookingProvider,
        };
      },
      { source: 'booking_actions', reason: 'getBookingProvider' }
    );
  } catch (error) {
    console.error('getBookingProvider error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת נותן שירות',
    };
  }
}

/**
 * קבלת רשימת נותני שירות
 */
export async function getBookingProviders(
  orgSlug: string,
  options?: {
    includeInactive?: boolean;
    withStats?: boolean;
  }
): Promise<BookingResponse<ProviderWithStats[]>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingProviders', organizationId);

        const providers = await prisma.bookingProvider.findMany({
          where: {
            organizationId,
            ...(options?.includeInactive ? {} : { isActive: true }),
          },
          include: {
            services: {
              where: { isActive: true },
              include: { service: true },
            },
            _count: {
              select: {
                appointments: true,
              },
            },
          },
          orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        });

        // אם נדרש סטטיסטיקה מורחבת
        let providersWithStats: ProviderWithStats[] = providers as unknown as ProviderWithStats[];
        
        if (options?.withStats) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          providersWithStats = await Promise.all(
            providers.map(async (provider: PrismaBookingProvider) => {
              const [upcoming, todayAppointments, completed, total] = await Promise.all([
                prisma.bookingAppointment.count({
                  where: {
                    providerId: provider.id,
                    startTime: { gte: new Date() },
                    status: { notIn: ['cancelled', 'completed'] },
                  },
                }),
                prisma.bookingAppointment.count({
                  where: {
                    providerId: provider.id,
                    startTime: { gte: today, lt: tomorrow },
                    status: { notIn: ['cancelled'] },
                  },
                }),
                prisma.bookingAppointment.count({
                  where: {
                    providerId: provider.id,
                    status: 'completed',
                  },
                }),
                prisma.bookingAppointment.count({
                  where: { providerId: provider.id },
                }),
              ]);

              const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

              return {
                ...provider,
                totalAppointments: total,
                upcomingAppointments: upcoming,
                todayAppointments,
                completionRate,
              } as ProviderWithStats;
            })
          );
        }

        return {
          success: true,
          data: providersWithStats,
        };
      },
      { source: 'booking_actions', reason: 'getBookingProviders' }
    );
  } catch (error) {
    console.error('getBookingProviders error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת נותני שירות',
    };
  }
}

/**
 * שיוך שירות ל-provider
 */
export async function assignServiceToProvider(
  orgSlug: string,
  providerId: string,
  serviceId: string,
  customDuration?: number,
  customPrice?: number
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('assignServiceToProvider', organizationId);

        // בדיקות
        const [provider, service] = await Promise.all([
          prisma.bookingProvider.findFirst({
            where: { id: providerId, organizationId },
          }),
          prisma.bookingService.findFirst({
            where: { id: serviceId, organizationId },
          }),
        ]);

        if (!provider) {
          return { success: false, error: 'נותן שירות לא נמצא' };
        }
        if (!service) {
          return { success: false, error: 'שירות לא נמצא' };
        }

        // יצירת או עדכון השיוך
        await prisma.bookingProviderService.upsert({
          where: {
            providerId_serviceId: {
              providerId,
              serviceId,
            },
          },
          update: {
            isActive: true,
            ...(customDuration && { customDuration }),
            ...(customPrice && { customPrice }),
          },
          create: {
            providerId,
            serviceId,
            customDuration: customDuration || null,
            customPrice: customPrice || null,
            isActive: true,
          },
        });


        return {
          success: true,
          message: 'השירות שויך בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'assignServiceToProvider' }
    );
  } catch (error) {
    console.error('assignServiceToProvider error:', error);
    return {
      success: false,
      error: 'שגיאה בשיוך שירות',
    };
  }
}

/**
 * הסרת שיוך שירות
 */
export async function removeServiceFromProvider(
  orgSlug: string,
  providerId: string,
  serviceId: string
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('removeServiceFromProvider', organizationId);

        await prisma.bookingProviderService.updateMany({
          where: {
            providerId,
            serviceId,
          },
          data: {
            isActive: false,
          },
        });


        return {
          success: true,
          message: 'השירות הוסר בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'removeServiceFromProvider' }
    );
  } catch (error) {
    console.error('removeServiceFromProvider error:', error);
    return {
      success: false,
      error: 'שגיאה בהסרת שירות',
    };
  }
}
