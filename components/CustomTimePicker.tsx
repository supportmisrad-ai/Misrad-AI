
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
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

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
          const dropdownHeight = 300; 
          const spaceBelow = window.innerHeight - rect.bottom;
          const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

          setPosition({
              top: showAbove ? rect.top - 8 : rect.bottom + 8,
              left: rect.left,
              width: Math.max(rect.width, 160)
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
            className={`w-full h-11 flex items-center justify-between px-3.5 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl text-sm font-medium transition-all outline-none duration-200 group ${
                isOpen || value ? 'bg-white border-gray-200' : ''
            } ${isOpen ? 'ring-2 ring-black/5 shadow-sm' : ''}`}
        >
            <div className="flex items-center gap-2.5 truncate">
                <Clock size={16} className={`transition-colors ${value ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`truncate ${value ? 'text-gray-900 font-bold' : 'text-gray-400 font-medium'}`}>
                    {value || placeholder}
                </span>
            </div>
            
            {value ? (
                <div onClick={(e) => { e.stopPropagation(); onChange(''); }} className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                </div>
            ) : null}
        </button>
      </div>

      {isOpen && position && createPortal(
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            ref={dropdownRef}
            style={{
                position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 9999, transformOrigin: position.top > window.innerHeight / 2 ? 'bottom' : 'top'
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
          </motion.div>,
          document.body
      )}
    </>
  );
};
