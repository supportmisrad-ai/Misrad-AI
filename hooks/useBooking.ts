/**
 * Booking Hooks - React Query + State Management
 * MISRAD AI - Optimized hooks for fast navigation
 * 
 * @module hooks/useBooking
 * @description React hooks with caching, prefetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type {
  BookingProvider,
  BookingService,
  BookingLink,
  BookingAppointment,
  TimeSlot,
  BookingResponse,
} from '@/types/booking';

// ============================================
// QUERY KEYS
// ============================================

const KEYS = {
  providers: (orgId: string) => ['booking', 'providers', orgId] as const,
  services: (orgId: string) => ['booking', 'services', orgId] as const,
  links: (orgId: string) => ['booking', 'links', orgId] as const,
  appointments: (orgId: string, start?: Date, end?: Date) => 
    ['booking', 'appointments', orgId, start?.toISOString(), end?.toISOString()] as const,
  appointment: (id: string) => ['booking', 'appointment', id] as const,
  availability: (providerId: string, date: string) => 
    ['booking', 'availability', providerId, date] as const,
  link: (slug: string) => ['booking', 'link', slug] as const,
};

// ============================================
// PROVIDERS HOOKS
// ============================================

/**
 * Fetch all providers
 */
export function useBookingProviders(orgSlug: string) {
  return useQuery({
    queryKey: KEYS.providers(orgSlug),
    queryFn: async () => {
      const res = await fetch(`/api/booking/providers?orgSlug=${orgSlug}`);
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json() as Promise<{ providers: BookingProvider[]; stats: Record<string, number> }>;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create/Update provider mutation
 */
export function useUpsertProvider(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BookingProvider> & { id?: string }) => {
      const url = data.id 
        ? `/api/booking/providers/${data.id}`
        : `/api/booking/providers`;
      
      const res = await fetch(url, {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save provider');
      }

      return res.json() as Promise<BookingProvider>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.providers(orgSlug) });
    },
  });
}

// ============================================
// SERVICES HOOKS
// ============================================

/**
 * Fetch all services
 */
export function useBookingServices(orgSlug: string) {
  return useQuery({
    queryKey: KEYS.services(orgSlug),
    queryFn: async () => {
      const res = await fetch(`/api/booking/services?orgSlug=${orgSlug}`);
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json() as Promise<{ services: BookingService[] }>;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Create/Update service mutation
 */
export function useUpsertService(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BookingService> & { id?: string }) => {
      const url = data.id 
        ? `/api/booking/services/${data.id}`
        : `/api/booking/services`;
      
      const res = await fetch(url, {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save service');
      }

      return res.json() as Promise<BookingService>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.services(orgSlug) });
    },
  });
}

// ============================================
// LINKS HOOKS
// ============================================

/**
 * Fetch all links
 */
export function useBookingLinks(orgSlug: string) {
  return useQuery({
    queryKey: KEYS.links(orgSlug),
    queryFn: async () => {
      const res = await fetch(`/api/booking/links?orgSlug=${orgSlug}`);
      if (!res.ok) throw new Error('Failed to fetch links');
      return res.json() as Promise<{ links: BookingLink[] }>;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch public link by slug
 */
export function useBookingLink(slug: string) {
  return useQuery({
    queryKey: KEYS.link(slug),
    queryFn: async () => {
      const res = await fetch(`/api/booking/link/${slug}`);
      if (!res.ok) throw new Error('Failed to fetch link');
      return res.json() as Promise<{ link: BookingLink; provider: { id: string; name: string }; services: BookingService[] }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for public page
    gcTime: 10 * 60 * 1000,
    enabled: !!slug,
  });
}

/**
 * Create/Update link mutation
 */
export function useUpsertLink(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<BookingLink> & { id?: string }) => {
      const url = data.id 
        ? `/api/booking/links/${data.id}`
        : `/api/booking/links`;
      
      const res = await fetch(url, {
        method: data.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save link');
      }

      return res.json() as Promise<BookingLink>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.links(orgSlug) });
    },
  });
}

// ============================================
// APPOINTMENTS HOOKS
// ============================================

/**
 * Fetch appointments for date range
 */
export function useBookingAppointments(
  orgSlug: string,
  startDate?: Date,
  endDate?: Date
) {
  return useQuery({
    queryKey: KEYS.appointments(orgSlug, startDate, endDate),
    queryFn: async () => {
      const params = new URLSearchParams({ orgSlug });
      if (startDate) params.set('start', startDate.toISOString());
      if (endDate) params.set('end', endDate.toISOString());

      const res = await fetch(`/api/booking/appointments?${params}`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json() as Promise<{ appointments: BookingAppointment[] }>;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch single appointment
 */
export function useBookingAppointment(id: string) {
  return useQuery({
    queryKey: KEYS.appointment(id),
    queryFn: async () => {
      const res = await fetch(`/api/booking/appointments/${id}`);
      if (!res.ok) throw new Error('Failed to fetch appointment');
      return res.json() as Promise<{ appointment: BookingAppointment }>;
    },
    enabled: !!id,
  });
}

/**
 * Create appointment mutation
 */
export function useCreateAppointment(orgSlug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: {
      providerId: string;
      serviceId: string;
      startTime: Date;
      endTime: Date;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      customerCompany?: string;
      customerReason?: string;
      locationType: string;
    }) => {
      const res = await fetch('/api/booking/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create appointment');
      }

      return res.json() as Promise<{ appointment: BookingAppointment }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', 'appointments'] });
      router.refresh();
    },
  });
}

/**
 * Cancel appointment mutation
 */
export function useCancelAppointment(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      appointmentId: string;
      reasonId: string;
      customReason?: string;
      refundPayment?: boolean;
    }) => {
      const res = await fetch(`/api/booking/appointments/${data.appointmentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to cancel appointment');
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: KEYS.appointment(variables.appointmentId) });
    },
  });
}

/**
 * Quick action mutation (confirm/complete/no_show/remind)
 */
export function useQuickAppointmentAction(orgSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      appointmentId: string;
      action: 'confirm' | 'complete' | 'no_show' | 'remind';
      notes?: string;
    }) => {
      const res = await fetch(`/api/booking/appointments/${data.appointmentId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, orgSlug }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to perform action');
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: KEYS.appointment(variables.appointmentId) });
    },
  });
}

// ============================================
// AVAILABILITY HOOKS
// ============================================

/**
 * Fetch availability for provider on date
 */
export function useAvailability(providerId: string, date: Date) {
  const dateStr = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: KEYS.availability(providerId, dateStr),
    queryFn: async () => {
      const res = await fetch(`/api/booking/availability/${providerId}?date=${dateStr}`);
      if (!res.ok) throw new Error('Failed to fetch availability');
      return res.json() as Promise<{ slots: TimeSlot[] }>;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!providerId && !!date,
  });
}

/**
 * Prefetch availability for next days
 */
export function usePrefetchAvailability() {
  const queryClient = useQueryClient();

  return useCallback(
    async (providerId: string, dates: Date[]) => {
      const promises = dates.map((date) => {
        const dateStr = date.toISOString().split('T')[0];
        return queryClient.prefetchQuery({
          queryKey: KEYS.availability(providerId, dateStr),
          queryFn: async () => {
            const res = await fetch(`/api/booking/availability/${providerId}?date=${dateStr}`);
            if (!res.ok) throw new Error('Failed to fetch availability');
            return res.json() as Promise<{ slots: TimeSlot[] }>;
          },
        });
      });

      await Promise.all(promises);
    },
    [queryClient]
  );
}

// ============================================
// STATISTICS HOOKS
// ============================================

/**
 * Fetch booking statistics
 */
export function useBookingStats(orgSlug: string) {
  return useQuery({
    queryKey: ['booking', 'stats', orgSlug],
    queryFn: async () => {
      const res = await fetch(`/api/booking/stats?orgSlug=${orgSlug}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json() as Promise<{
        todayAppointments: number;
        weekAppointments: number;
        pendingPayments: number;
        providersCount: number;
        servicesCount: number;
        linksCount: number;
      }>;
    },
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Prefetch all booking data for instant navigation
 */
export function usePrefetchBookingData(orgSlug: string) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: KEYS.providers(orgSlug),
        queryFn: async () => {
          const res = await fetch(`/api/booking/providers?orgSlug=${orgSlug}`);
          if (!res.ok) throw new Error('Failed');
          return res.json();
        },
      }),
      queryClient.prefetchQuery({
        queryKey: KEYS.services(orgSlug),
        queryFn: async () => {
          const res = await fetch(`/api/booking/services?orgSlug=${orgSlug}`);
          if (!res.ok) throw new Error('Failed');
          return res.json();
        },
      }),
      queryClient.prefetchQuery({
        queryKey: KEYS.links(orgSlug),
        queryFn: async () => {
          const res = await fetch(`/api/booking/links?orgSlug=${orgSlug}`);
          if (!res.ok) throw new Error('Failed');
          return res.json();
        },
      }),
    ]);
  }, [queryClient, orgSlug]);
}

/**
 * Optimistic update helper
 */
export function useOptimisticAppointmentUpdate() {
  const queryClient = useQueryClient();

  return useCallback(
    <T extends BookingAppointment>(
      orgSlug: string,
      appointmentId: string,
      updater: (old: T) => T
    ) => {
      // Update in cache optimistically
      queryClient.setQueryData(
        KEYS.appointment(appointmentId),
        (old: { appointment: T } | undefined) => {
          if (!old) return old;
          return { appointment: updater(old.appointment) };
        }
      );

      // Also update in list
      queryClient.setQueriesData<{ appointments: T[] }>(
        { queryKey: ['booking', 'appointments', orgSlug] },
        (old) => {
          if (!old) return old;
          return {
            appointments: old.appointments.map((apt) =>
              apt.id === appointmentId ? updater(apt) : apt
            ),
          };
        }
      );
    },
    [queryClient]
  );
}
