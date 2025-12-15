
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
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
  minDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [position, setPosition] = useState<{ top: number; left: number; width: number; placement: 'bottom' | 'top' } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) setViewDate(date);
    }
  }, [value, isOpen]);

  useEffect(() => {
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
        window.addEventListener('resize', () => setIsOpen(false));
        window.addEventListener('scroll', handleScroll, true);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', () => setIsOpen(false));
        window.removeEventListener('scroll', handleScroll, true);
    };
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

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);

    const selected = value ? new Date(value) : null;
    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selected && selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-full transition-all relative
            ${isSelected 
              ? 'bg-black text-white shadow-md z-10 font-bold' 
              : 'hover:bg-gray-100 text-gray-700'
            }
            ${!isSelected && isToday ? 'text-blue-600 font-bold bg-blue-50 ring-1 ring-blue-100' : ''}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const displayValue = value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                onClick={toggleOpen}
                className={`w-full h-11 flex items-center justify-between px-3.5 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl text-sm font-medium transition-all outline-none duration-200 cursor-pointer group ${
                    isOpen || value ? 'bg-white border-gray-200' : ''
                } ${isOpen ? 'ring-2 ring-black/5 shadow-sm' : ''}`}
            >
                <div className="flex items-center gap-2.5 truncate">
                    <CalendarIcon size={16} className={`transition-colors ${value ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className={`truncate ${value ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>
                        {displayValue || placeholder}
                    </span>
                </div>
                {value ? (
                    <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(''); }}
                        className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X size={14} />
                    </button>
                ) : null}
            </div>
        </div>

        {isOpen && createPortal(
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                    className={`fixed inset-0 bg-black/20 z-[9998] backdrop-blur-sm ${!isMobile ? 'bg-transparent pointer-events-none' : ''}`}
                    onClick={() => setIsOpen(false)}
                />
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: isMobile ? 20 : 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isMobile ? 20 : 10, scale: 0.98 }}
                    style={isMobile ? {
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '320px', zIndex: 9999
                    } : {
                        position: 'fixed', top: position?.placement === 'bottom' ? position.top : undefined, bottom: position?.placement === 'top' ? (window.innerHeight - (position?.top || 0) - 8) : undefined, left: position?.left, zIndex: 9999,
                    }}
                    className={`bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 w-[300px] overflow-hidden ${isMobile ? 'translate-x-[-50%] translate-y-[-50%] m-0' : ''}`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><ChevronRight size={18} /></button>
                        <span className="text-sm font-black text-gray-900">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><ChevronLeft size={18} /></button>
                    </div>
                    <div className="grid grid-cols-7 mb-2 text-center">{DAY_NAMES.map(d => <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-1.5 justify-items-center">{renderCalendar()}</div>
                </motion.div>
            </AnimatePresence>,
            document.body
        )}
    </>
  );
};
