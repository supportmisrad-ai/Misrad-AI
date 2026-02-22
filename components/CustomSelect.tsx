import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; isMobile?: boolean; showAbove?: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = options.find(opt => opt.value === value);
  const selectedIndex = options.findIndex(opt => opt.value === value);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    
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
        setIsOpen(false);
    };

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', () => setIsOpen(false));
        window.addEventListener('scroll', handleScroll, true);
    }
    
    return () => {
        if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
        }
        if (typeof window !== 'undefined') {
        window.removeEventListener('resize', () => setIsOpen(false));
        window.removeEventListener('scroll', handleScroll, true);
        }
    };
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        toggleOpen();
        return;
      }
    }
    
    if (isOpen) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => (prev + 1) % options.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => (prev - 1 + options.length) % options.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    }
  }, [isOpen, disabled, highlightedIndex, options, onChange]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0) {
      itemsRef.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const toggleOpen = () => {
      if (disabled) return;
      
      if (!isOpen && containerRef.current && typeof window !== 'undefined') {
          const rect = containerRef.current.getBoundingClientRect();
          const dropdownHeight = Math.min(options.length * 44, 280) + 16;
          const spaceBelow = window.innerHeight - rect.bottom;
          const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
          const isMobile = window.innerWidth < 768;

          setPosition({
              top: showAbove ? rect.top - 6 : rect.bottom + 6,
              left: rect.left,
              width: isMobile ? Math.min(rect.width, window.innerWidth - 32) : rect.width,
              isMobile,
              showAbove
          });
          setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
      setIsOpen(!isOpen);
  };

  return (
    <>
      <div className={`relative ${className}`} ref={containerRef}>
        <button
          type="button"
          onClick={toggleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full h-11 flex items-center justify-between px-4 bg-white/95 backdrop-blur-sm border rounded-2xl text-sm font-semibold transition-all outline-none duration-250 group ${
            isOpen 
              ? 'border-slate-900 ring-[3px] ring-slate-900/8 shadow-lg z-20 relative bg-white' 
              : 'border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {icon && <span className={`transition-colors duration-200 ${isOpen ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>}
            
            {selectedOption ? (
              <span className="text-slate-900 font-bold flex items-center gap-2 truncate">
                 {selectedOption.icon && <span className="opacity-80 scale-90">{selectedOption.icon}</span>}
                 {selectedOption.label}
              </span>
            ) : (
              <span className="text-slate-400 font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
              size={15} 
              strokeWidth={2.5}
              className={`flex-shrink-0 transition-all duration-300 ease-out ${isOpen ? 'rotate-180 text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} 
          />
        </button>
      </div>

      {isOpen && position && createPortal(
        <AnimatePresence>
            {position.isMobile && (
                <motion.div 
                    key="backdrop"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[9998]"
                    onClick={() => setIsOpen(false)}
                />
            )}
            <motion.div
                key="dropdown"
                ref={dropdownRef}
                initial={{ opacity: 0, y: position.showAbove ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position.showAbove ? 6 : -6, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'fixed', 
                    top: position.top,
                    left: position.left, 
                    width: position.width, 
                    zIndex: 9999,
                    transformOrigin: position.showAbove ? 'bottom center' : 'top center'
                }}
                className={`bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_16px_64px_-16px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden max-h-[280px] overflow-y-auto custom-scrollbar p-1.5 ${position.showAbove ? '-translate-y-full' : ''}`}
                role="listbox"
            >
                <div className="space-y-0.5">
                {options.map((option, index) => {
                    const isSelected = value === option.value;
                    const isHighlighted = highlightedIndex === index;
                    return (
                        <button
                        key={option.value}
                        ref={el => { itemsRef.current[index] = el; }}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => { onChange(option.value); setIsOpen(false); }}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl transition-all duration-150 group/item ${
                            isSelected 
                            ? 'bg-slate-900 text-white font-bold shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3)]' 
                            : isHighlighted
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                        }`}
                        >
                        <div className="flex items-center gap-2.5 truncate">
                            {option.icon && (
                                <span className={`scale-90 transition-all duration-150 group-hover/item:scale-100 ${isSelected ? 'opacity-100 text-white' : 'opacity-70 text-slate-400 group-hover/item:text-slate-600 group-hover/item:opacity-100'}`}>
                                    {option.icon}
                                </span>
                            )}
                            <span className="truncate">{option.label}</span>
                        </div>
                        
                        {isSelected && (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            >
                                <Check size={14} className="text-white flex-shrink-0" strokeWidth={3} />
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
