'use client';

/**
 * Booking Context - Client-Side State Management
 * MISRAD AI - Fast Tab Navigation without Server Re-renders
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { BookingService, BookingProvider, BookingAppointment, BookingLink } from '@/types/booking';

type TabId = 'calendar' | 'appointments' | 'providers' | 'services' | 'links' | 'settings';

interface BookingStats {
  providersCount: number;
  servicesCount: number;
  linksCount: number;
  todayAppointments: number;
  pendingPayments: number;
}

interface BookingContextValue {
  // Current tab
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  
  // Data
  services: BookingService[];
  providers: BookingProvider[];
  appointments: BookingAppointment[];
  links: BookingLink[];
  stats: BookingStats;
  
  // Loading states
  isLoading: Record<TabId, boolean>;
  errors: Record<TabId, string | null>;
  
  // Refresh functions
  refreshServices: () => Promise<void>;
  refreshProviders: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshLinks: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Initial load
  isInitialized: boolean;
  initialize: () => Promise<void>;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
  orgSlug: string;
  initialStats: BookingStats;
  initialLinks: BookingLink[];
}

export function BookingContextProvider({ 
  children, 
  orgSlug, 
  initialStats,
  initialLinks 
}: BookingProviderProps) {
  const [activeTab, setActiveTabState] = useState<TabId>('calendar');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Data states
  const [services, setServices] = useState<BookingService[]>([]);
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [links, setLinks] = useState<BookingLink[]>(initialLinks);
  const [stats, setStats] = useState<BookingStats>(initialStats);
  
  // Loading states per tab
  const [isLoading, setIsLoading] = useState<Record<TabId, boolean>>({
    calendar: false,
    appointments: false,
    providers: false,
    services: false,
    links: false,
    settings: false,
  });
  
  // Error states per tab
  const [errors, setErrors] = useState<Record<TabId, string | null>>({
    calendar: null,
    appointments: null,
    providers: null,
    services: null,
    links: null,
    settings: null,
  });

  // Track which data has been loaded
  const [loadedData, setLoadedData] = useState<Record<string, boolean>>({
    services: false,
    providers: false,
    appointments: false,
  });

  // Smart tab switcher that loads data on demand
  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    
    // Load data if needed for this tab
    switch (tab) {
      case 'services':
        if (!loadedData.services) {
          refreshServices();
        }
        break;
      case 'providers':
        if (!loadedData.providers) {
          refreshProviders();
        }
        break;
      case 'calendar':
      case 'appointments':
        if (!loadedData.appointments) {
          refreshAppointments();
        }
        break;
    }
  }, [loadedData]);

  const refreshServices = useCallback(async () => {
    if (isLoading.services) return;
    
    setIsLoading(prev => ({ ...prev, services: true }));
    setErrors(prev => ({ ...prev, services: null }));
    
    try {
      const response = await fetch(`/api/booking/services?orgSlug=${orgSlug}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        setLoadedData(prev => ({ ...prev, services: true }));
      } else {
        throw new Error('שגיאה בטעינת שירותים');
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        services: error instanceof Error ? error.message : 'שגיאה בטעינת שירותים' 
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, services: false }));
    }
  }, [orgSlug, isLoading.services]);

  const refreshProviders = useCallback(async () => {
    if (isLoading.providers) return;
    
    setIsLoading(prev => ({ ...prev, providers: true }));
    setErrors(prev => ({ ...prev, providers: null }));
    
    try {
      const response = await fetch(`/api/booking/providers?orgSlug=${orgSlug}`);
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        setLoadedData(prev => ({ ...prev, providers: true }));
      } else {
        throw new Error('שגיאה בטעינת נותני שירות');
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        providers: error instanceof Error ? error.message : 'שגיאה בטעינת נותני שירות' 
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, providers: false }));
    }
  }, [orgSlug, isLoading.providers]);

  const refreshAppointments = useCallback(async () => {
    if (isLoading.calendar) return;
    
    setIsLoading(prev => ({ ...prev, calendar: true, appointments: true }));
    setErrors(prev => ({ ...prev, calendar: null, appointments: null }));
    
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      const response = await fetch(
        `/api/booking/appointments?orgSlug=${orgSlug}&from=${startDate.toISOString()}&to=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
        setLoadedData(prev => ({ ...prev, appointments: true }));
      } else {
        throw new Error('שגיאה בטעינת תורים');
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        calendar: error instanceof Error ? error.message : 'שגיאה בטעינת תורים',
        appointments: error instanceof Error ? error.message : 'שגיאה בטעינת תורים'
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, calendar: false, appointments: false }));
    }
  }, [orgSlug, isLoading.calendar]);

  const refreshLinks = useCallback(async () => {
    if (isLoading.links) return;
    
    setIsLoading(prev => ({ ...prev, links: true }));
    setErrors(prev => ({ ...prev, links: null }));
    
    try {
      const response = await fetch(`/api/booking/links?orgSlug=${orgSlug}`);
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
        setStats(prev => ({ ...prev, linksCount: data.links?.length || 0 }));
      } else {
        throw new Error('שגיאה בטעינת קישורים');
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        links: error instanceof Error ? error.message : 'שגיאה בטעינת קישורים' 
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, links: false }));
    }
  }, [orgSlug, isLoading.links]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshServices(),
      refreshProviders(),
      refreshAppointments(),
      refreshLinks(),
    ]);
  }, [refreshServices, refreshProviders, refreshAppointments, refreshLinks]);

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    // Load appointments for calendar immediately
    await refreshAppointments();
    setIsInitialized(true);
  }, [isInitialized, refreshAppointments]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const value: BookingContextValue = {
    activeTab,
    setActiveTab,
    services,
    providers,
    appointments,
    links,
    stats,
    isLoading,
    errors,
    refreshServices,
    refreshProviders,
    refreshAppointments,
    refreshLinks,
    refreshAll,
    isInitialized,
    initialize,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookingContext() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingContextProvider');
  }
  return context;
}
