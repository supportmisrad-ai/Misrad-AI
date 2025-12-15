
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'בחר...', 
  className = '',
  icon,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
          containerRef.current && 
          !containerRef.current.contains(event.target as Node) && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = (event: Event) => {
        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) return;
        setIsOpen(false); // Close on scroll to avoid floating position issues
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
      if (disabled) return;
      
      if (!isOpen && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const dropdownHeight = Math.min(options.length * 40, 256) + 16; // Approx height
          const spaceBelow = window.innerHeight - rect.bottom;
          const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

          setPosition({
              top: showAbove ? rect.top - 8 : rect.bottom + 8,
              left: rect.left,
              width: rect.width
          });
      }
      setIsOpen(!isOpen);
  };

  return (
    <>
      <div className={`relative ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={toggleOpen}
          disabled={disabled}
          className={`w-full h-11 flex items-center justify-between px-3.5 bg-white border border-gray-200 hover:border-blue-300 rounded-xl text-sm font-medium transition-all outline-none duration-200 group ${
            isOpen 
              ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm z-20 relative' 
              : 'shadow-sm hover:shadow'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {icon && <span className={`text-gray-400 group-hover:text-blue-500 transition-colors ${isOpen ? 'text-blue-600' : ''}`}>{icon}</span>}
            
            {selectedOption ? (
              <span className="text-gray-900 font-bold flex items-center gap-2 truncate">
                 {selectedOption.icon && <span className="opacity-80 scale-90">{selectedOption.icon}</span>}
                 {selectedOption.label}
              </span>
            ) : (
              <span className="text-gray-400 font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-gray-600'}`} 
          />
        </button>
      </div>

      {isOpen && position && createPortal(
        <AnimatePresence>
            <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ 
                    position: 'fixed', 
                    top: position.top, 
                    left: position.left, 
                    width: position.width, 
                    zIndex: 9999,
                    transformOrigin: position.top > window.innerHeight / 2 ? 'bottom' : 'top'
                }}
                className={`bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar p-1.5 ring-1 ring-black/5 ${position.top > window.innerHeight / 2 ? '-translate-y-full' : ''}`}
            >
                <div className="space-y-0.5">
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                        key={option.value}
                        type="button"
                        onClick={() => { onChange(option.value); setIsOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-150 group ${
                            isSelected 
                            ? 'bg-blue-600 text-white font-bold shadow-md' 
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700 font-medium'
                        }`}
                        >
                        <div className="flex items-center gap-2.5 truncate">
                            {option.icon && (
                                <span className={`scale-90 transition-transform group-hover:scale-100 ${isSelected ? 'opacity-100 text-white' : 'opacity-70 text-gray-400 group-hover:text-blue-500'}`}>
                                    {option.icon}
                                </span>
                            )}
                            {option.label}
                        </div>
                        
                        {isSelected && (
                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                <Check size={14} className="text-white" strokeWidth={3} />
                            </motion.div>
                        )}
                        </button>
                    );
                })}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
