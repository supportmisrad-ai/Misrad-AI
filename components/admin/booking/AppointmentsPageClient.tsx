'use client';

import { useState, useMemo, useCallback } from 'react';
import { useBookingAppointments, useQuickAppointmentAction, useCancelAppointment } from '@/hooks/useBooking';
import { AppointmentList, CancellationModal } from '@/components/admin/BookingAdminPanel';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

interface AppointmentsPageClientProps {
  orgSlug: string;
}

type ViewMode = 'day' | 'week' | 'month';
type FilterStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export function AppointmentsPageClient({ orgSlug }: AppointmentsPageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return {
          start: new Date(currentDate.setHours(0, 0, 0, 0)),
          end: new Date(currentDate.setHours(23, 59, 59, 999)),
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  }, [viewMode, currentDate]);

  const { data, isLoading, error, refetch } = useBookingAppointments(
    orgSlug,
    dateRange.start,
    dateRange.end
  );

  const quickAction = useQuickAppointmentAction(orgSlug);
  const cancelMutation = useCancelAppointment(orgSlug);

  const appointments = data?.appointments || [];

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    if (filterStatus === 'all') return appointments;
    return appointments.filter((apt) => apt.status === filterStatus);
  }, [appointments, filterStatus]);

  // Navigation handlers
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      switch (viewMode) {
        case 'day':
          return direction === 'next' ? addDays(prev, 1) : addDays(prev, -1);
        case 'week':
          return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
        case 'month':
          return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
      }
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Action handlers
  const handleAppointmentAction = useCallback(async (appointmentId: string, action: string) => {
    switch (action) {
      case 'cancel':
        setSelectedAppointmentId(appointmentId);
        setShowCancelModal(true);
        break;
      case 'edit':
        // TODO: Open edit modal
        break;
      default:
        if (['confirm', 'complete', 'no_show', 'remind'].includes(action)) {
          await quickAction.mutateAsync({
            appointmentId,
            action: action as 'confirm' | 'complete' | 'no_show' | 'remind',
          });
        }
    }
  }, [quickAction]);

  const handleCancelConfirm = useCallback(async (reasonId: string, customReason?: string, refundPayment?: boolean) => {
    if (!selectedAppointmentId) return;
    
    await cancelMutation.mutateAsync({
      appointmentId: selectedAppointmentId,
      reasonId,
      customReason,
      refundPayment,
    });
    
    setShowCancelModal(false);
    setSelectedAppointmentId(null);
  }, [selectedAppointmentId, cancelMutation]);

  // Get date label
  const dateLabel = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, d בMMMM yyyy', { locale: he });
      case 'week':
        return `${format(dateRange.start, 'd בMMMM', { locale: he })} - ${format(dateRange.end, 'd בMMMM yyyy', { locale: he })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: he });
    }
  }, [viewMode, currentDate, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תורים</h1>
          <p className="text-slate-500 mt-1">{filteredAppointments.length} תורים</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="רענון"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            ייצוא
          </button>
        </div>
      </div>

      {/* Navigation & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'day' && 'יום'}
                {mode === 'week' && 'שבוע'}
                {mode === 'month' && 'חודש'}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavigate('prev')}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-900 min-w-[200px] text-center">
              {dateLabel}
            </span>
            <button
              onClick={() => handleNavigate('next')}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              היום
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="pending">ממתינים</option>
              <option value="confirmed">מאושרים</option>
              <option value="completed">הושלמו</option>
              <option value="cancelled">בוטלו</option>
              <option value="no_show">לא הגיעו</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <AppointmentList
          appointments={filteredAppointments.map((apt) => ({
            id: apt.id,
            customerName: apt.customerName,
            customerEmail: apt.customerEmail,
            startTime: new Date(apt.startTime),
            endTime: new Date(apt.endTime),
            status: apt.status,
            locationType: apt.locationType,
            serviceName: apt.service?.name || '',
            providerName: apt.provider?.name || '',
            hasPayment: !!apt.payment,
          }))}
          onAction={handleAppointmentAction}
        />
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && selectedAppointmentId && (
        <CancellationModal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedAppointmentId(null);
          }}
          onConfirm={handleCancelConfirm}
          hasPayment={appointments.find(a => a.id === selectedAppointmentId)?.payment?.status === 'completed'}
        />
      )}
    </div>
  );
}

export default AppointmentsPageClient;
