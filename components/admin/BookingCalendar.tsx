'use client';

/**
 * Booking Calendar Component
 * MISRAD AI - Admin Calendar View
 * 
 * @module components/admin/BookingCalendar
 * @description Main calendar component for managing appointments
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  getDay,
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MoreVertical,
  CheckCircle,
  XCircle,
  Video,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import type {
  BookingAppointment,
  BookingProvider,
  TimeSlot,
  CalendarViewModel,
} from '@/types/booking';

// ============================================
// TYPES
// ============================================

interface BookingCalendarProps {
  /** תורים להצגה */
  appointments: BookingAppointment[];
  /** נותני שירות */
  providers: BookingProvider[];
  /** נותן שירות נבחר (אופציונלי) */
  selectedProviderId?: string;
  /** מצב תצוגה */
  defaultView?: 'day' | 'week' | 'month';
  /** תאריך התחלתי */
  defaultDate?: Date;
  /** קריאה כשלוחצים על תור */
  onAppointmentClick?: (appointment: BookingAppointment) => void;
  /** קריאה כשלוחצים על משבצת ריקה */
  onSlotClick?: (slot: TimeSlot, date: Date) => void;
  /** קריאה כשמשנים תאריך */
  onDateChange?: (date: Date) => void;
  /** קריאה ליצירת תור חדש */
  onCreateAppointment?: (date: Date, time: string) => void;
}

type CalendarView = 'day' | 'week' | 'month' | 'agenda';

// ============================================
// MAIN COMPONENT
// ============================================

export function BookingCalendar({
  appointments,
  providers,
  selectedProviderId,
  defaultView = 'week',
  defaultDate = new Date(),
  onAppointmentClick,
  onSlotClick,
  onDateChange,
  onCreateAppointment,
}: BookingCalendarProps) {
  const [view, setView] = useState<CalendarView>(defaultView);
  const [currentDate, setCurrentDate] = useState<Date>(defaultDate);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);

  // ==========================================
  // NAVIGATION HANDLERS
  // ==========================================

  const navigatePrevious = useCallback(() => {
    setCurrentDate((prev) => {
      switch (view) {
        case 'day':
          return subDays(prev, 1);
        case 'week':
          return subWeeks(prev, 1);
        case 'month':
          return subMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      switch (view) {
        case 'day':
          return addDays(prev, 1);
        case 'week':
          return addWeeks(prev, 1);
        case 'month':
          return addMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [view]);

  const navigateToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    onDateChange?.(today);
  }, [onDateChange]);

  // ==========================================
  // DATE CALCULATIONS
  // ==========================================

  const daysToDisplay = useMemo(() => {
    switch (view) {
      case 'day':
        return [currentDate];
      case 'week': {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        return eachDayOfInterval({ start, end });
      }
      case 'month': {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
      }
      default:
        return [];
    }
  }, [currentDate, view]);

  const displayTitle = useMemo(() => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, d בMMMM yyyy', { locale: he });
      case 'week': {
        const start = daysToDisplay[0];
        const end = daysToDisplay[daysToDisplay.length - 1];
        return `${format(start, 'd בMMMM', { locale: he })} - ${format(end, 'd בMMMM yyyy', { locale: he })}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: he });
      default:
        return '';
    }
  }, [currentDate, view, daysToDisplay]);

  // ==========================================
  // APPOINTMENT RENDERING
  // ==========================================

  const getAppointmentsForDay = useCallback(
    (date: Date) => {
      return appointments.filter((apt) => {
        const aptDate = new Date(apt.startTime);
        return isSameDay(aptDate, date);
      });
    },
    [appointments]
  );

  const getAppointmentStyle = (appointment: BookingAppointment) => {
    const baseClasses = 'relative rounded-lg p-2 text-xs cursor-pointer transition-all hover:shadow-md border';
    
    // צבעים לפי סטטוס
    const statusClasses: Record<string, string> = {
      confirmed: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      pending: 'bg-amber-50 border-amber-200 text-amber-900',
      completed: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      cancelled: 'bg-slate-100 border-slate-200 text-slate-500 line-through',
      no_show: 'bg-rose-50 border-rose-200 text-rose-900',
    };

    // אם שולם - מסגרת זהב
    const paymentClass = appointment.payment?.status === 'completed' 
      ? ' ring-2 ring-yellow-400 ring-offset-1' 
      : '';

    return `${baseClasses} ${statusClasses[appointment.status] || statusClasses.confirmed}${paymentClass}`;
  };

  const getLocationIcon = (locationType: string) => {
    switch (locationType) {
      case 'zoom':
      case 'meet':
        return <Video className="w-3 h-3 inline mr-1" />;
      case 'address':
        return <MapPin className="w-3 h-3 inline mr-1" />;
      case 'phone':
        return <Phone className="w-3 h-3 inline mr-1" />;
      default:
        return null;
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-slate-200 bg-slate-50 gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Navigation */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={navigatePrevious}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="הקודם"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={navigateToday}
              className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex-1 sm:flex-none text-center"
            >
              היום
            </button>
            <button
              onClick={navigateNext}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="הבא"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-slate-900 text-center sm:text-right">
            {displayTitle}
          </h2>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <div className="flex bg-white rounded-lg border border-slate-200 p-1 shrink-0">
            {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === v
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {v === 'day' && 'יום'}
                {v === 'week' && 'שבוע'}
                {v === 'month' && 'חודש'}
              </button>
            ))}
          </div>

          <button
            onClick={() => onCreateAppointment?.(selectedDate, '09:00')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shrink-0 ml-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">תור חדש</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-2 sm:p-4 bg-slate-50/30">
        <div className="min-w-full">
          {view === 'month' ? (
            <MonthView
              days={daysToDisplay}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              getAppointmentsForDay={getAppointmentsForDay}
              getAppointmentStyle={getAppointmentStyle}
              getLocationIcon={getLocationIcon}
              onAppointmentClick={onAppointmentClick}
            />
          ) : view === 'week' ? (
            <div className="overflow-x-auto">
              <WeekView
                days={daysToDisplay}
                getAppointmentsForDay={getAppointmentsForDay}
                getAppointmentStyle={getAppointmentStyle}
                getLocationIcon={getLocationIcon}
                onAppointmentClick={onAppointmentClick}
                onSlotClick={onSlotClick}
              />
            </div>
          ) : (
            <DayView
              date={currentDate}
              appointments={getAppointmentsForDay(currentDate)}
              getAppointmentStyle={getAppointmentStyle}
              getLocationIcon={getLocationIcon}
              onAppointmentClick={onAppointmentClick}
              onSlotClick={onSlotClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  getAppointmentsForDay: (date: Date) => BookingAppointment[];
  getAppointmentStyle: (apt: BookingAppointment) => string;
  getLocationIcon: (type: string) => React.ReactNode;
  onAppointmentClick?: (apt: BookingAppointment) => void;
}

function MonthView({
  days,
  currentDate,
  selectedDate,
  onDateSelect,
  getAppointmentsForDay,
  getAppointmentStyle,
  getLocationIcon,
  onAppointmentClick,
}: MonthViewProps) {
  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="space-y-4">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-medium text-slate-500 py-1 sm:py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isTodayDate = isToday(date);
          const dayAppointments = getAppointmentsForDay(date);
          const isShabbat = getDay(date) === 6;

          return (
            <div
              key={date.toISOString()}
              onClick={() => onDateSelect(date)}
              className={`
                min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 rounded-xl border cursor-pointer transition-all
                ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}
                ${!isCurrentMonth && 'opacity-40'}
                ${isTodayDate && 'ring-2 ring-indigo-500 ring-offset-1'}
                ${isShabbat && 'bg-slate-50/80'}
              `}
            >
              {/* Date Number */}
              <div className={`
                text-xs sm:text-sm font-bold mb-1 flex items-center justify-between
                ${isTodayDate ? 'text-indigo-600' : 'text-slate-700'}
                ${isShabbat && 'text-slate-400'}
              `}>
                <span>{format(date, 'd')}</span>
                {isShabbat && <span className="text-[10px] font-normal hidden sm:inline">שבת</span>}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(apt);
                    }}
                    className={`${getAppointmentStyle(apt)} !p-1 sm:!p-1.5 shadow-sm rounded-lg border-opacity-50`}
                  >
                    <div className="flex items-center gap-1">
                      <div className="hidden sm:block">
                        {getLocationIcon(apt.locationType)}
                      </div>
                      <span className="truncate text-[10px] sm:text-xs font-medium">
                        {format(new Date(apt.startTime), 'HH:mm')} <span className="hidden xs:inline">{apt.customerName}</span>
                      </span>
                    </div>
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-[9px] sm:text-xs text-slate-400 text-center font-medium">
                    +{dayAppointments.length - 3} נוספים
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeekViewProps {
  days: Date[];
  getAppointmentsForDay: (date: Date) => BookingAppointment[];
  getAppointmentStyle: (apt: BookingAppointment) => string;
  getLocationIcon: (type: string) => React.ReactNode;
  onAppointmentClick?: (apt: BookingAppointment) => void;
  onSlotClick?: (slot: TimeSlot, date: Date) => void;
}

function WeekView({
  days,
  getAppointmentsForDay,
  getAppointmentStyle,
  getLocationIcon,
  onAppointmentClick,
  onSlotClick,
}: WeekViewProps) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

  return (
    <div className="space-y-4">
      {/* Days Header */}
      <div className="grid grid-cols-8 gap-1 sm:gap-2">
        <div className="text-center text-[10px] sm:text-sm font-medium text-slate-400 py-2 self-center">
          שעה
        </div>
        {days.map((date) => {
          const isTodayDate = isToday(date);
          const isShabbat = getDay(date) === 6;
          
          return (
            <div
              key={date.toISOString()}
              className={`
                text-center py-2 rounded-xl transition-all
                ${isTodayDate ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-100'}
                ${isShabbat ? 'bg-slate-100 border-none' : ''}
              `}
            >
              <div className={`text-[10px] sm:text-sm font-bold ${isTodayDate ? 'text-white' : isShabbat ? 'text-slate-400' : 'text-slate-900'}`}>
                {format(date, 'EEE', { locale: he })}
              </div>
              <div className={`text-[10px] sm:text-xs ${isTodayDate ? 'text-indigo-100' : 'text-slate-500'}`}>
                {format(date, 'd/M')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 gap-1 sm:gap-2 border-b border-slate-50 last:border-0">
            {/* Hour Label */}
            <div className="text-[10px] sm:text-xs text-slate-400 text-center py-4 font-medium">
              {hour}:00
            </div>

            {/* Day Columns */}
            {days.map((date) => {
              const hourAppointments = getAppointmentsForDay(date).filter((apt) => {
                const aptHour = new Date(apt.startTime).getHours();
                return aptHour === hour;
              });

              const isShabbat = getDay(date) === 6;

              return (
                <div
                  key={`${date.toISOString()}-${hour}`}
                  onClick={() => !isShabbat && onSlotClick?.({ 
                    startTime: new Date(new Date(date).setHours(hour, 0)),
                    endTime: new Date(new Date(date).setHours(hour, 30)),
                    duration: 30,
                    isAvailable: !isShabbat,
                  }, date)}
                  className={`
                    min-h-[70px] sm:min-h-[80px] rounded-xl border-2 p-1 cursor-pointer transition-all
                    ${isShabbat 
                      ? 'bg-slate-50/50 border-transparent cursor-not-allowed' 
                      : 'bg-white border-dashed border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                    }
                  `}
                >
                  {hourAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick?.(apt);
                      }}
                      className={`${getAppointmentStyle(apt)} !p-1 sm:!p-1.5 shadow-sm h-full flex flex-col justify-center`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="hidden sm:block">
                          {getLocationIcon(apt.locationType)}
                        </div>
                        <span className="truncate text-[10px] sm:text-xs font-bold leading-tight">{apt.customerName}</span>
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-medium opacity-80">
                        {format(new Date(apt.startTime), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DayViewProps {
  date: Date;
  appointments: BookingAppointment[];
  getAppointmentStyle: (apt: BookingAppointment) => string;
  getLocationIcon: (type: string) => React.ReactNode;
  onAppointmentClick?: (apt: BookingAppointment) => void;
  onSlotClick?: (slot: TimeSlot, date: Date) => void;
}

function DayView({
  date,
  appointments,
  getAppointmentStyle,
  getLocationIcon,
  onAppointmentClick,
  onSlotClick,
}: DayViewProps) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  const isShabbat = getDay(date) === 6;

  return (
    <div className="space-y-2">
      {/* Day Header */}
      <div className={`
        text-center py-4 rounded-lg mb-4
        ${isShabbat ? 'bg-slate-100 border border-slate-200' : 'bg-indigo-50 border border-indigo-200'}
      `}>
        <div className={`text-xl font-bold ${isShabbat ? 'text-slate-600' : 'text-indigo-900'}`}>
          {format(date, 'EEEE, d בMMMM yyyy', { locale: he })}
        </div>
        {isShabbat && (
          <div className="text-sm text-slate-500 mt-1">
            שבת קודש - לא זמין לקביעת תורים
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {hours.map((hour) => {
          const hourAppointments = appointments.filter((apt) => {
            const aptHour = new Date(apt.startTime).getHours();
            return aptHour === hour;
          });

          return (
            <div
              key={hour}
              onClick={() => !isShabbat && onSlotClick?.({
                startTime: new Date(date.setHours(hour, 0)),
                endTime: new Date(date.setHours(hour, 30)),
                duration: 30,
                isAvailable: true,
              }, date)}
              className={`
                flex gap-4 p-3 rounded-lg border transition-colors
                ${isShabbat 
                  ? 'bg-slate-50 border-slate-200 cursor-not-allowed' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer'
                }
              `}
            >
              {/* Time */}
              <div className="w-16 text-sm font-medium text-slate-600 pt-1">
                {hour}:00
              </div>

              {/* Appointments */}
              <div className="flex-1 space-y-2">
                {hourAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(apt);
                    }}
                    className={getAppointmentStyle(apt)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getLocationIcon(apt.locationType)}
                        <span className="font-semibold">{apt.customerName}</span>
                        <span className="text-slate-500">
                          {format(new Date(apt.startTime), 'HH:mm')} - {format(new Date(apt.endTime), 'HH:mm')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {apt.service?.name}
                      </span>
                    </div>
                    {apt.customerReason && (
                      <div className="text-xs text-slate-500 mt-1">
                        {apt.customerReason}
                      </div>
                    )}
                  </div>
                ))}

                {hourAppointments.length === 0 && !isShabbat && (
                  <div className="text-sm text-slate-400 py-2">
                    לחץ לקביעת תור בשעה {hour}:00
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BookingCalendar;
