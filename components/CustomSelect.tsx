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
        if (typeof document !== 'undefined') {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        if (typeof window !== 'undefined') {
            if (handleResize) window.removeEventListener('resize', handleResize);
            if (throttledHandleScroll) window.removeEventListener('scroll', throttledHandleScroll, true);
        }
        if (resizeTimeout) clearTimeout(resizeTimeout);
        if (scrollTimeout) clearTimeout(scrollTimeout);
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

          const minDropdownWidth = 200;
          const mobileWidth = Math.max(minDropdownWidth, Math.min(rect.width, window.innerWidth - 32));
          const mobileLeft = Math.min(rect.left, window.innerWidth - mobileWidth - 16);

          setPosition({
              top: showAbove ? rect.top - 6 : rect.bottom + 6,
              left: isMobile ? Math.max(16, mobileLeft) : rect.left,
              width: isMobile ? mobileWidth : Math.max(rect.width, minDropdownWidth),
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
          className={`w-full h-11 flex items-center justify-between px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold transition-all outline-none duration-200 group ${
            isOpen 
              ? 'border-indigo-500 ring-4 ring-indigo-50 z-20 relative bg-white' 
              : 'shadow-sm hover:border-slate-300 hover:shadow-md hover:bg-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {icon && <span className={`transition-colors duration-200 ${isOpen ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>}
            
            {selectedOption ? (
              <span className="text-slate-700 font-bold flex items-center gap-2 truncate">
                 {selectedOption.icon && <span className="opacity-90 scale-90">{selectedOption.icon}</span>}
                 {selectedOption.label}
              </span>
            ) : (
              <span className="text-slate-400 font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
              size={16} 
              strokeWidth={2.5}
              className={`flex-shrink-0 transition-all duration-300 ease-out ${isOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'}`} 
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
                    className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-[9998]"
                    onClick={() => setIsOpen(false)}
                />
            )}
            <motion.div
                key="dropdown"
                ref={dropdownRef}
                initial={{ opacity: 0, y: position.showAbove ? 4 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position.showAbove ? 4 : -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                style={{
                    position: 'fixed', 
                    top: position.top,
                    left: position.left, 
                    width: position.width, 
                    zIndex: 9999,
                    transformOrigin: position.showAbove ? 'bottom center' : 'top center'
                }}
                className={`bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar p-1 ${position.showAbove ? '-translate-y-full' : ''}`}
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
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-100 group/item ${
                            isSelected 
                            ? 'bg-indigo-600 text-white font-bold' 
                            : isHighlighted
                            ? 'bg-slate-50 text-indigo-600 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                        }`}
                        >
                        <div className="flex items-center gap-2.5 truncate">
                            {option.icon && (
                                <span className={`scale-90 transition-all duration-100 ${isSelected ? 'opacity-100 text-white' : 'opacity-70 text-slate-400 group-hover/item:text-indigo-500 group-hover/item:opacity-100'}`}>
                                    {option.icon}
                                </span>
                            )}
                            <span className={isSelected ? 'font-bold' : 'font-medium'}>{option.label}</span>
                        </div>
                        
                        {isSelected && (
                            <Check size={14} className="text-white flex-shrink-0" strokeWidth={3} />
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
