'use server';

/**
 * Booking Links Server Actions
 * MISRAD AI - Appointment Scheduling
 * 
 * @module app/actions/booking-links
 * @description Server actions for public booking links management
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { withWorkspaceTenantContext } from '@/lib/server/workspace-tenant-context';
import { requireOrganizationId } from '@/lib/tenant-isolation';
import type {
  BookingLink,
  CreateBookingLinkDTO,
  UpdateBookingLinkDTO,
  BookingResponse,
  LinkWithStats,
} from '@/types/booking';

// ============================================
// LINK CRUD OPERATIONS
// ============================================

/**
 * יצירת לינק ציבורי חדש
 */
export async function createBookingLink(
  orgSlug: string,
  data: CreateBookingLinkDTO
): Promise<BookingResponse<BookingLink>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('createBookingLink', organizationId);

        // ולידציה
        if (!data.slug?.trim()) {
          return { success: false, error: 'מזהה הלינק (slug) חובה' };
        }
        if (!data.title?.trim()) {
          return { success: false, error: 'כותרת הלינק חובה' };
        }
        if (!data.providerId) {
          return { success: false, error: 'נותן שירות חובה' };
        }
        if (!data.serviceIds?.length) {
          return { success: false, error: 'לפחות שירות אחד חובה' };
        }
        if (!data.availableDays?.length) {
          return { success: false, error: 'לפחות יום זמין אחד בשבוע חובה' };
        }

        // בדיקת slug ייחודי
        const existingSlug = await prisma.bookingLink.findUnique({
          where: { slug: data.slug.trim() },
        });
        if (existingSlug) {
          return { success: false, error: 'מזהה הלינק כבר קיים במערכת' };
        }

        // יצירת הלינק עם שירותים
        const link = await prisma.bookingLink.create({
          data: {
            organizationId,
            providerId: data.providerId,
            slug: data.slug.trim().toLowerCase(),
            title: data.title.trim(),
            description: data.description?.trim() || null,
            availableDays: data.availableDays,
            minNoticeHours: data.minNoticeHours ?? 24,
            maxBookingDays: data.maxBookingDays ?? 30,
            allowCancellations: data.allowCancellations ?? false,
            cancellationDeadlineHours: data.cancellationDeadlineHours ?? 48,
            requirePayment: data.requirePayment ?? false,
            paymentAmount: data.paymentAmount || null,
            requireApproval: data.requireApproval ?? false,
            locationType: data.locationType,
            locationDetails: data.locationDetails?.trim() || null,
            isActive: true,
            services: {
              create: data.serviceIds.map(serviceId => ({
                serviceId,
              })),
            },
          },
          include: {
            services: {
              include: { service: true },
            },
            provider: true,
          },
        });

        revalidatePath('/admin/booking/links');
        
        return {
          success: true,
          data: link as unknown as BookingLink,
          message: 'הלינק נוצר בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'createBookingLink' }
    );
  } catch (error) {
    console.error('createBookingLink error:', error);
    return {
      success: false,
      error: 'שגיאה ביצירת לינק',
    };
  }
}

/**
 * עדכון לינק ציבורי
 */
export async function updateBookingLink(
  orgSlug: string,
  linkId: string,
  data: UpdateBookingLinkDTO
): Promise<BookingResponse<BookingLink>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('updateBookingLink', organizationId);

        // בדיקה שהלינק קיים ושייך לארגון
        const existing = await prisma.bookingLink.findFirst({
          where: { id: linkId, organizationId },
          include: { services: true },
        });

        if (!existing) {
          return { success: false, error: 'לינק לא נמצא' };
        }

        // אם יש שינוי בשירותים, מעדכן את הקשרים
        if (data.serviceIds) {
          // מסיר שירותים קיימים
          await prisma.bookingLinkService.deleteMany({
            where: { linkId },
          });
          // יוצר חדשים
          await prisma.bookingLinkService.createMany({
            data: data.serviceIds.map(serviceId => ({
              linkId,
              serviceId,
            })),
          });
        }

        const link = await prisma.bookingLink.update({
          where: { id: linkId },
          data: {
            ...(data.title && { title: data.title.trim() }),
            ...(data.description !== undefined && { description: data.description?.trim() || null }),
            ...(data.availableDays && { availableDays: data.availableDays }),
            ...(data.minNoticeHours !== undefined && { minNoticeHours: data.minNoticeHours }),
            ...(data.maxBookingDays !== undefined && { maxBookingDays: data.maxBookingDays }),
            ...(data.allowCancellations !== undefined && { allowCancellations: data.allowCancellations }),
            ...(data.cancellationDeadlineHours !== undefined && { cancellationDeadlineHours: data.cancellationDeadlineHours }),
            ...(data.requirePayment !== undefined && { requirePayment: data.requirePayment }),
            ...(data.paymentAmount !== undefined && { paymentAmount: data.paymentAmount }),
            ...(data.requireApproval !== undefined && { requireApproval: data.requireApproval }),
            ...(data.locationType && { locationType: data.locationType }),
            ...(data.locationDetails !== undefined && { locationDetails: data.locationDetails?.trim() || null }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
          include: {
            services: { include: { service: true } },
            provider: true,
          },
        });

        revalidatePath('/admin/booking/links');
        
        return {
          success: true,
          data: link as unknown as BookingLink,
          message: 'הלינק עודכן בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'updateBookingLink' }
    );
  } catch (error) {
    console.error('updateBookingLink error:', error);
    return {
      success: false,
      error: 'שגיאה בעדכון לינק',
    };
  }
}

/**
 * מחיקת לינק (soft delete)
 */
export async function deleteBookingLink(
  orgSlug: string,
  linkId: string
): Promise<BookingResponse<void>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('deleteBookingLink', organizationId);

        const existing = await prisma.bookingLink.findFirst({
          where: { id: linkId, organizationId },
        });

        if (!existing) {
          return { success: false, error: 'לינק לא נמצא' };
        }

        await prisma.bookingLink.update({
          where: { id: linkId },
          data: { isActive: false },
        });

        revalidatePath('/admin/booking/links');
        
        return {
          success: true,
          message: 'הלינק הושבת בהצלחה',
        };
      },
      { source: 'booking_actions', reason: 'deleteBookingLink' }
    );
  } catch (error) {
    console.error('deleteBookingLink error:', error);
    return {
      success: false,
      error: 'שגיאה במחיקת לינק',
    };
  }
}

/**
 * קבלת לינק בודד (לפי ID - לשימוש פנימי)
 */
export async function getBookingLink(
  orgSlug: string,
  linkId: string
): Promise<BookingResponse<LinkWithStats>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingLink', organizationId);

        const link = await prisma.bookingLink.findFirst({
          where: { id: linkId, organizationId },
          include: {
            services: { include: { service: true } },
            provider: true,
            _count: {
              select: { appointments: true },
            },
          },
        });

        if (!link) {
          return { success: false, error: 'לינק לא נמצא' };
        }

        // סטטיסטיקה
        const recentBookings = await prisma.bookingAppointment.count({
          where: {
            linkId,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        });

        const linkWithStats: LinkWithStats = {
          ...link,
          totalBookings: link._count.appointments,
          recentBookings,
          conversionRate: 0, // יחושב לפי צפיות
        } as unknown as LinkWithStats;

        return {
          success: true,
          data: linkWithStats,
        };
      },
      { source: 'booking_actions', reason: 'getBookingLink' }
    );
  } catch (error) {
    console.error('getBookingLink error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת לינק',
    };
  }
}

/**
 * קבלת לינק לפי slug (לדף ציבורי)
 */
export async function getBookingLinkBySlug(
  slug: string
): Promise<BookingResponse<BookingLink>> {
  try {
    const link = await prisma.bookingLink.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        services: {
          where: { service: { isActive: true } },
          include: { service: true },
        },
        provider: true,
      },
    });

    if (!link || !link.isActive) {
      return { success: false, error: 'לינק לא נמצא או לא פעיל' };
    }

    return {
      success: true,
      data: link as unknown as BookingLink,
    };
  } catch (error) {
    console.error('getBookingLinkBySlug error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת לינק',
    };
  }
}

/**
 * קבלת רשימת לינקים
 */
export async function getBookingLinks(
  orgSlug: string,
  options?: {
    includeInactive?: boolean;
  }
): Promise<BookingResponse<LinkWithStats[]>> {
  try {
    return await withWorkspaceTenantContext(
      orgSlug,
      async ({ organizationId }) => {
        requireOrganizationId('getBookingLinks', organizationId);

        const links = await prisma.bookingLink.findMany({
          where: {
            organizationId,
            ...(options?.includeInactive ? {} : { isActive: true }),
          },
          include: {
            services: { include: { service: true } },
            provider: true,
            _count: { select: { appointments: true } },
          },
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        });

        const linksWithStats: LinkWithStats[] = links.map((link: { _count: { appointments: number } }) => ({
          ...link,
          totalBookings: link._count.appointments,
          recentBookings: 0,
          conversionRate: 0,
        })) as unknown as LinkWithStats[];

        return {
          success: true,
          data: linksWithStats,
        };
      },
      { source: 'booking_actions', reason: 'getBookingLinks' }
    );
  } catch (error) {
    console.error('getBookingLinks error:', error);
    return {
      success: false,
      error: 'שגיאה בטעינת לינקים',
    };
  }
}
