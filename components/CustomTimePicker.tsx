
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ 
  value, 
  onChange, 
  placeholder = 'שעה',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; isMobile?: boolean } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node) && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    const handleScroll = (event: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
        setIsOpen(false);
    };

    // Throttled handlers - defined outside if block for cleanup access
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    let handleResize: (() => void) | null = null;
    let throttledHandleScroll: ((event: Event) => void) | null = null;

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        
        // Throttled resize handler
        handleResize = () => {
            if (resizeTimeout) return;
            resizeTimeout = setTimeout(() => {
                setIsOpen(false);
                resizeTimeout = null;
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        
        // Throttled scroll handler
        throttledHandleScroll = (event: Event) => {
            if (scrollTimeout) return;
            scrollTimeout = setTimeout(() => {
                handleScroll(event);
                scrollTimeout = null;
            }, 50);
        };
        window.addEventListener('scroll', throttledHandleScroll, true);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (handleResize) window.removeEventListener('resize', handleResize);
        if (throttledHandleScroll) window.removeEventListener('scroll', throttledHandleScroll, true);
        if (resizeTimeout) clearTimeout(resizeTimeout);
        if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isOpen]);

  const toggleOpen = () => {
      if (!isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const dropdownHeight = 300; 
          const spaceBelow = window.innerHeight - rect.bottom;
          const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
          const isMobile = window.innerWidth < 768;

          setPosition({
              top: isMobile ? (showAbove ? rect.top - 8 : rect.bottom + 8) : (showAbove ? rect.top - 8 : rect.bottom + 8),
              left: rect.left,
              width: isMobile ? Math.min(Math.max(rect.width, 160), window.innerWidth - 32) : Math.max(rect.width, 160),
              isMobile
          });
      }
      setIsOpen(!isOpen);
  };

  const handleSelect = (time: string) => {
      onChange(time);
      setIsOpen(false);
  };

  useEffect(() => {
      if (isOpen && value && dropdownRef.current) {
          setTimeout(() => {
              const selectedEl = document.getElementById(`time-slot-${value}`);
              if (selectedEl) selectedEl.scrollIntoView({ block: 'center' });
          }, 0);
      }
  }, [isOpen, value]);

  return (
    <>
      <div className={`relative ${className}`} ref={containerRef}>
        <button
            type="button"
            onClick={toggleOpen}
            className={`w-full h-11 flex items-center justify-between px-3.5 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl text-sm font-medium transition-all outline-none duration-200 group overflow-hidden ${
                isOpen || value ? 'bg-white border-gray-200' : ''
            } ${isOpen ? 'ring-2 ring-black/5 shadow-sm' : ''}`}
        >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Clock size={16} className={`transition-colors shrink-0 ${value ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`${value ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'} whitespace-nowrap`}>
                    {value || placeholder}
                </span>
            </div>
            
            {value ? (
                <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onChange(''); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange('');
                        }
                    }}
                    className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="נקה שעה"
                >
                    <X size={14} />
                </span>
            ) : null}
        </button>
      </div>

      {isOpen && position && createPortal(
          <>
          {position.isMobile && (
              <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="fixed inset-0 bg-transparent z-[9998]"
                  onClick={() => setIsOpen(false)}
              />
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            ref={dropdownRef}
            style={position.isMobile ? {
                position: 'fixed', 
                top: position.top + 8,
                left: position.left, 
                width: position.width, 
                zIndex: 9999, 
                transformOrigin: position.top > window.innerHeight / 2 ? 'bottom' : 'top'
            } : {
                position: 'fixed', 
                top: position.top, 
                left: position.left, 
                width: position.width, 
                zIndex: 9999, 
                transformOrigin: position.top > window.innerHeight / 2 ? 'bottom' : 'top'
            }}
            className="bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col max-h-[280px]"
          >
              <div className="overflow-y-auto custom-scrollbar p-1 flex-1 min-h-0">
                  {TIME_SLOTS.map(time => {
                      const isSelected = value === time;
                      return (
                          <button
                              key={time}
                              id={`time-slot-${time}`}
                              onClick={() => handleSelect(time)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isSelected 
                                  ? 'bg-gray-100 text-black font-bold' 
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-black font-medium'
                              }`}
                          >
                              <span className="font-mono">{time}</span>
                              {isSelected && <Check size={14} />}
                          </button>
                      );
                  })}
              </div>
          </motion.div>
          </>,
          document.body
      )}
    </>
  );
};
