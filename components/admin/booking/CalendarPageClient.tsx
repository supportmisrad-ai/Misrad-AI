'use client';

/**
 * Calendar Page Client - Real Data Loading
 * MISRAD AI - Booking Calendar with Actual Data
 * 
 * Fixes the "תוכן ייטען בקרוב..." placeholder issue by loading real appointments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { BookingCalendar } from '@/components/admin/BookingCalendar';
import { getBookingAppointments } from '@/app/actions/booking-appointments';
import { getBookingProviders } from '@/app/actions/booking-providers';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, CalendarDays } from 'lucide-react';
import type { BookingAppointment, BookingProvider } from '@/types/booking';

interface CalendarPageClientProps {
  orgSlug: string;
}

export default function CalendarPageClient({ orgSlug }: CalendarPageClientProps) {
  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [providers, setProviders] = useState<BookingProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load appointments and providers in parallel using orgSlug
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // 2 months ahead
      
      const [appointmentsResult, providersResult] = await Promise.all([
        getBookingAppointments(orgSlug, {
          from: startDate,
          to: endDate,
        }),
        getBookingProviders(orgSlug),
      ]);
      
      if (appointmentsResult.success && appointmentsResult.data) {
        setAppointments(appointmentsResult.data);
      } else {
        console.error('Failed to load appointments:', appointmentsResult.error);
      }
      
      if (providersResult.success && providersResult.data) {
        setProviders(providersResult.data);
      } else {
        console.error('Failed to load providers:', providersResult.error);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('שגיאה בטעינת נתוני היומן');
    } finally {
      setIsLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAppointment = (date: Date, time: string) => {
    // Navigate to new appointment page with pre-filled date/time
    const params = new URLSearchParams();
    params.set('date', date.toISOString().split('T')[0]);
    params.set('time', time);
    window.location.href = `/app/admin/booking?action=new&${params.toString()}`;
  };

  const handleAppointmentClick = (appointment: BookingAppointment) => {
    // Navigate to appointment detail/edit page
    window.location.href = `/app/admin/booking?action=edit&id=${appointment.id}`;
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-48 bg-slate-200 rounded animate-pulse hidden sm:block" />
          </div>
          <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        
        {/* Skeleton Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">טוען יומן תורים...</p>
          <p className="text-slate-400 text-sm mt-1">מביא נתונים מהשרת</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-8 h-8 text-rose-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">שגיאה בטעינת היומן</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <Button onClick={loadData} variant="outline" className="gap-2">
          <Loader2 className="w-4 h-4" />
          נסה שוב
        </Button>
      </div>
    );
  }

  // Empty state - no appointments yet
  if (appointments.length === 0) {
    return (
      <div className="space-y-4">
        <BookingCalendar
          appointments={[]}
          providers={providers}
          onCreateAppointment={handleCreateAppointment}
          onAppointmentClick={handleAppointmentClick}
          defaultView="week"
        />
        
        {/* Empty state message below calendar */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-slate-900 mb-1">אין תורים עדיין</h4>
          <p className="text-slate-500 text-sm mb-4">היומן שלך ריק. צור את התור הראשון עכשיו!</p>
          <Button 
            onClick={() => handleCreateAppointment(new Date(), '09:00')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            צור תור חדש
          </Button>
        </div>
      </div>
    );
  }

  // Normal state with data
  return (
    <BookingCalendar
      appointments={appointments}
      providers={providers}
      onCreateAppointment={handleCreateAppointment}
      onAppointmentClick={handleAppointmentClick}
      defaultView="week"
    />
  );
}
