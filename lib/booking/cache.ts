/**
 * Booking Data Cache & Prefetch Utilities
 * MISRAD AI - Performance optimization for fast navigation
 * 
 * @module lib/booking/cache
 * @description Client-side caching and prefetching for instant page transitions
 */

import { cache } from 'react';
import { unstable_cache as nextCache } from 'next/cache';
import { prisma } from '@/lib/prisma';

// ============================================
// REACT CACHE (Request deduplication)
// ============================================

/**
 * Cache providers list for the duration of a request
 */
export const getCachedProviders = cache(async (organizationId: string) => {
  return prisma.bookingProvider.findMany({
    where: { organizationId, isActive: true },
    include: {
      services: {
        where: { isActive: true },
        include: { service: true },
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
    orderBy: { name: 'asc' },
  });
});

/**
 * Cache services list
 */
export const getCachedServices = cache(async (organizationId: string) => {
  return prisma.bookingService.findMany({
    where: { organizationId, isActive: true },
    include: {
      providers: {
        where: { isActive: true },
        include: { provider: true },
      },
    },
    orderBy: { name: 'asc' },
  });
});

/**
 * Cache links list
 */
export const getCachedLinks = cache(async (organizationId: string) => {
  return prisma.bookingLink.findMany({
    where: { organizationId, isActive: true },
    include: {
      services: { include: { service: true } },
      provider: true,
    },
    orderBy: { createdAt: 'desc' },
  });
});

/**
 * Cache today's appointments
 */
export const getCachedTodayAppointments = cache(async (organizationId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.bookingAppointment.findMany({
    where: {
      organizationId,
      startTime: { gte: today, lt: tomorrow },
      status: { notIn: ['cancelled'] },
    },
    include: {
      provider: true,
      service: true,
      link: true,
      payment: true,
    },
    orderBy: { startTime: 'asc' },
  });
});

/**
 * Cache appointments for date range
 */
export const getCachedAppointments = cache(
  async (organizationId: string, startDate: Date, endDate: Date) => {
    return prisma.bookingAppointment.findMany({
      where: {
        organizationId,
        startTime: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled'] },
      },
      include: {
        provider: true,
        service: true,
        link: true,
        payment: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }
);

/**
 * Cache availability for provider
 */
export const getCachedAvailability = cache(async (providerId: string) => {
  const [weekly, overrides] = await Promise.all([
    prisma.bookingAvailability.findMany({
      where: { providerId, type: 'weekly' },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.bookingAvailability.findMany({
      where: {
        providerId,
        type: { in: ['override', 'blocked'] },
        specificDate: { gte: new Date() },
      },
      orderBy: { specificDate: 'asc' },
      take: 60,
    }),
  ]);

  return { weekly, overrides };
});

// ============================================
// NEXT.JS CACHE (Server-side caching)
// ============================================

const CACHE_TAGS = {
  providers: 'booking-providers',
  services: 'booking-services',
  links: 'booking-links',
  appointments: 'booking-appointments',
  availability: 'booking-availability',
} as const;

/**
 * Server-side cached providers
 */
export const getServerCachedProviders = nextCache(
  async (organizationId: string) => getCachedProviders(organizationId),
  ['booking-providers'],
  {
    tags: [CACHE_TAGS.providers],
    revalidate: 60, // 1 minute
  }
);

/**
 * Server-side cached services
 */
export const getServerCachedServices = nextCache(
  async (organizationId: string) => getCachedServices(organizationId),
  ['booking-services'],
  {
    tags: [CACHE_TAGS.services],
    revalidate: 60,
  }
);

/**
 * Server-side cached links
 */
export const getServerCachedLinks = nextCache(
  async (organizationId: string) => getCachedLinks(organizationId),
  ['booking-links'],
  {
    tags: [CACHE_TAGS.links],
    revalidate: 60,
  }
);

/**
 * Server-side cached appointments
 */
export const getServerCachedAppointments = nextCache(
  async (organizationId: string, startDate: Date, endDate: Date) =>
    getCachedAppointments(organizationId, startDate, endDate),
  ['booking-appointments'],
  {
    tags: [CACHE_TAGS.appointments],
    revalidate: 30, // 30 seconds for appointments
  }
);

// ============================================
// CACHE INVALIDATION
// ============================================

import { revalidatePath } from 'next/cache';

export function invalidateBookingCache(type: keyof typeof CACHE_TAGS) {
  // Revalidate booking pages
  revalidatePath('/app/admin/booking', 'layout');
}

export function invalidateAllBookingCache() {
  revalidatePath('/app/admin/booking', 'layout');
  revalidatePath('/booking', 'layout');
}

// ============================================
// PREFETCH UTILITIES
// ============================================

/**
 * Prefetch data for common navigation paths
 */
export async function prefetchBookingData(organizationId: string) {
  // Parallel prefetch of all main data
  const [providers, services, links, todayAppointments] = await Promise.all([
    getCachedProviders(organizationId),
    getCachedServices(organizationId),
    getCachedLinks(organizationId),
    getCachedTodayAppointments(organizationId),
  ]);

  return {
    providers,
    services,
    links,
    todayAppointments,
    stats: {
      providersCount: providers.length,
      servicesCount: services.length,
      linksCount: links.length,
      todayAppointments: todayAppointments.length,
      pendingPayments: todayAppointments.filter((a: { payment?: { status: string } | null }) => 
        a.payment?.status === 'pending'
      ).length,
    },
  };
}

/**
 * Prefetch availability for next 7 days
 */
export async function prefetchWeeklyAvailability(providerId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const appointments = await prisma.bookingAppointment.findMany({
    where: {
      providerId,
      startTime: { gte: today, lt: weekEnd },
      status: { notIn: ['cancelled', 'no_show'] },
    },
    select: {
      startTime: true,
      endTime: true,
      locationType: true,
    },
    orderBy: { startTime: 'asc' },
  });

  const availability = await getCachedAvailability(providerId);

  return { appointments, availability };
}

// ============================================
// CLIENT-SIDE CACHE HOOKS
// ============================================

/**
 * Client-side cache manager (for use in React components)
 */
export class BookingCacheManager {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly TTL = 60 * 1000; // 1 minute

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const bookingCache = new BookingCacheManager();

// ============================================
// OPTIMISTIC UPDATES
// ============================================

/**
 * Optimistic update helpers for instant UI feedback
 */
export const optimisticUpdates = {
  /**
   * Optimistically add appointment to cache
   */
  addAppointment: (cached: unknown[], newAppointment: unknown) => {
    return [...(cached || []), newAppointment];
  },

  /**
   * Optimistically update appointment status
   */
  updateAppointmentStatus: (
    cached: Array<Record<string, unknown>>,
    appointmentId: string,
    status: string
  ) => {
    return (cached || []).map((apt) => {
      if (apt.id === appointmentId) {
        return { ...apt, status };
      }
      return apt;
    });
  },

  /**
   * Optimistically remove appointment
   */
  removeAppointment: (
    cached: Array<Record<string, unknown>>,
    appointmentId: string
  ) => {
    return (cached || []).filter((apt) => apt.id !== appointmentId);
  },
};
