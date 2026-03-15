
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatHebrewDate, getHebrewDay, getHebrewMonthName, getHebrewYear, getHebrewYearLetters, isJewishHoliday, getJewishHolidayName, isShabbat, getHebrewDayOfMonthLetters } from '../lib/hebrew-calendar';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  showHebrewDate?: boolean;
  onValidationError?: (message: string) => void;
}

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  value, 
  onChange, 
  placeholder = 'בחר תאריך', 
  className = '',
  minDate,
  maxDate,
  showHebrewDate = false,
  onValidationError
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize with static date to avoid hydration mismatch
  const [viewDate, setViewDate] = useState(() => new Date(2026, 0, 1));
  
  useEffect(() => {
    setViewDate(new Date());
  }, []);
  
  const [position, setPosition] = useState<{ top: number; left: number; width: number; placement: 'bottom' | 'top' } | null>(null);
  const [showHebrewCalendar, setShowHebrewCalendar] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) setViewDate(date);
    }
  }, [value, isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth >= 768) {
          if (containerRef.current && !containerRef.current.contains(event.target as Node) && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
          }
      }
    };
    const handleScroll = (event: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
        setIsOpen(false);
    };

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        
        // Throttled resize handler
        let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
        const handleResize = () => {
            if (resizeTimeout) return;
            resizeTimeout = setTimeout(() => {
                setIsOpen(false);
                resizeTimeout = null;
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        
        // Throttled scroll handler
        let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
        const throttledHandleScroll = (event: Event) => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                handleScroll(event);
                scrollTimeout = null;
            }, 50);
        };
        window.addEventListener('scroll', throttledHandleScroll, true);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', throttledHandleScroll, true);
            if (resizeTimeout) clearTimeout(resizeTimeout);
            if (scrollTimeout) clearTimeout(scrollTimeout);
        };
    }
  }, [isOpen]);

  const toggleOpen = () => {
      if (!isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const dropdownHeight = 320; 
          const spaceBelow = window.innerHeight - rect.bottom;
          const placement = spaceBelow < dropdownHeight && rect.top > dropdownHeight ? 'top' : 'bottom';

          setPosition({
              top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
              left: rect.left,
              width: rect.width,
              placement
          });
      }
      setIsOpen(!isOpen);
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    newDate.setHours(0, 0, 0, 0);
    
    // Validate against minDate
    if (minDate) {
      const minDateObj = new Date(minDate + 'T00:00:00');
      if (newDate < minDateObj) {
        if (onValidationError) {
          onValidationError(`תאריך זה לא יכול להיות לפני ${minDateObj.toLocaleDateString('he-IL')}`);
        }
        return;
      }
    }
    
    // Validate against maxDate
    if (maxDate) {
      const maxDateObj = new Date(maxDate + 'T00:00:00');
      if (newDate > maxDateObj) {
        if (onValidationError) {
          onValidationError(`תאריך זה לא יכול להיות אחרי ${maxDateObj.toLocaleDateString('he-IL')}`);
        }
        return;
      }
    }
    
    const offset = newDate.getTimezoneOffset();
    const localDate = new Date(newDate.getTime() - (offset * 60 * 1000));
    onChange(localDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push(
        <div key={`prev-${prevYear}-${prevMonth}-${day}`} className="w-9 h-9 flex items-center justify-center text-sm text-gray-300">
          {day}
        </div>
      );
    }

    const selected = value ? new Date(value + 'T00:00:00') : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const isSelected = selected && selected.getTime() === date.getTime();
      const isToday = today.getTime() === date.getTime();
      const isPast = date < today;

      const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : null;
      const maxDateObj = maxDate ? new Date(maxDate + 'T00:00:00') : null;
      const isDisabled = (minDateObj && date < minDateObj) || (maxDateObj && date > maxDateObj);
      const isHoliday = !isDisabled && isJewishHoliday(date);
      const holidayName = isHoliday ? getJewishHolidayName(date) : null;
      const isShabbatDay = !isDisabled && isShabbat(date);
      
      days.push(
        <button
          key={`${year}-${month}-${day}`}
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!isDisabled) handleDateClick(day); }}
          disabled={!!isDisabled}
          className={`w-9 h-9 flex flex-col items-center justify-center text-sm font-medium rounded-xl transition-all relative
            ${isSelected 
              ? 'bg-blue-600 text-white shadow-lg z-10 font-bold ring-2 ring-blue-100' 
              : isDisabled
              ? 'text-gray-300 cursor-not-allowed opacity-50'
              : isHoliday || isShabbatDay
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold'
              : 'hover:bg-blue-50 text-gray-700 hover:text-blue-600 hover:font-bold'
            }
            ${!isSelected && isToday && !isDisabled ? 'text-blue-600 font-bold bg-blue-50 ring-1 ring-blue-100' : ''}
          `}
          title={showHebrewDate ? formatHebrewDate(date, { includeYear: true }) + (holidayName ? ` - ${holidayName}` : '') : (holidayName ? holidayName : undefined)}
        >
          <span className="leading-none">{day}</span>
          {showHebrewDate && !isDisabled && (
            <span className={`text-[9px] font-black leading-none mt-0.5 ${isHoliday || isShabbatDay ? 'text-amber-600' : 'text-blue-400 opacity-80'}`}>
              {getHebrewDayOfMonthLetters(date)}
            </span>
          )}
        </button>
      );
    }

    // Next month days to fill the grid (only if needed)
    const totalCells = days.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    if (remainingCells > 0) {
      for (let day = 1; day <= remainingCells && day <= 14; day++) {
        days.push(
          <div key={`next-${nextYear}-${nextMonth}-${day}`} className="w-9 h-9 flex items-center justify-center text-sm text-gray-300">
            {day}
          </div>
        );
      }
    }

    return days;
  };

  const displayValue = value ? new Date(value + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const hebrewDisplayValue = value ? formatHebrewDate(new Date(value + 'T00:00:00'), { includeYear: true, shortFormat: true }) : '';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                onClick={toggleOpen}
            className={`w-full h-11 flex items-center justify-between px-4 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold transition-all outline-none duration-200 cursor-pointer group hover:border-blue-300 hover:bg-white ${
                    isOpen ? 'ring-2 ring-blue-500 border-blue-500 bg-white shadow-sm' : ''
                } ${value ? 'border-slate-200' : ''}`}
            >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
                    <CalendarIcon size={16} className={`transition-colors shrink-0 ${value ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                    <div className="flex flex-col items-start flex-1 min-w-0 overflow-hidden">
                        <span className={`text-right whitespace-nowrap w-full ${value ? 'text-slate-900 font-black' : 'text-slate-400 font-bold'}`}>
                            {displayValue || placeholder}
                        </span>
                    {value && showHebrewDate && hebrewDisplayValue && (
                            <span className="text-[10px] text-blue-500 font-black leading-tight">
                            {hebrewDisplayValue}
                        </span>
                    )}
                    </div>
                </div>
                {value ? (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        className="p-1 hover:bg-rose-50 rounded-full text-slate-300 hover:text-rose-500 transition-colors"
                        aria-label="נקה תאריך"
                    >
                        <X size={14} />
                    </button>
                ) : null}
            </div>
        </div>

        {isOpen && typeof document !== 'undefined' && createPortal(
            <AnimatePresence>
                <motion.div 
                    key="backdrop"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                    className={`fixed inset-0 bg-black/60 z-[9998] backdrop-blur-sm ${!isMobile ? 'bg-transparent pointer-events-none' : ''}`}
                    onClick={() => setIsOpen(false)}
                />
                <motion.div
                    key="dropdown"
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: isMobile ? 20 : 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isMobile ? 20 : 10, scale: 0.98 }}
                    style={isMobile ? {
                        position: 'fixed', top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)', width: '320px', maxWidth: 'calc(100vw - 32px)', zIndex: 9999, margin: '0 auto'
                    } : {
                        position: 'fixed', top: position?.placement === 'bottom' ? position.top : undefined, bottom: position?.placement === 'top' ? (typeof window !== 'undefined' ? window.innerHeight - (position?.top || 0) - 8 : undefined) : undefined, left: position?.left, zIndex: 9999,
                    }}
                    className={`bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 w-[320px] overflow-hidden ${isMobile ? 'translate-x-[-50%] translate-y-[-50%] m-0' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-5">
                        <button 
                            onClick={(e) => { e.stopPropagation(); changeMonth(1); }} 
                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base font-black text-slate-900">
                                {showHebrewCalendar
                              ? `${getHebrewMonthName(viewDate)} ${getHebrewYearLetters(viewDate)}`
                              : `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`
                            }
                        </span>
                            {showHebrewDate && (
                                <span className="text-[10px] text-blue-500 font-black uppercase tracking-tight">
                                    {showHebrewCalendar 
                                      ? `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`
                                      : `${getHebrewMonthName(viewDate)} ${getHebrewYearLetters(viewDate)}`
                                    }
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} 
                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                    {showHebrewDate && (
                        <div className="flex items-center justify-center mb-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowHebrewCalendar(!showHebrewCalendar); }}
                                className="px-4 py-1.5 text-[10px] font-black rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors border border-blue-100"
                            >
                                {showHebrewCalendar ? 'לוח לועזי' : 'לוח עברי'}
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-7 mb-2 text-center gap-1">
                        {DAY_NAMES.map(d => (
                            <div key={d} className="text-[10px] font-black text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 justify-items-center">{renderCalendar()}</div>
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
                            className="text-xs text-slate-400 hover:text-rose-500 font-bold transition-colors"
                        >
                            ניקוי
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); const today = new Date().toISOString().split('T')[0]; onChange(today); setIsOpen(false); }}
                            className="px-4 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl font-black transition-colors"
                        >
                            היום
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>,
            document.body
        )}
    </>
  );
};
