'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface StyledDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'pricing' | 'support';
}

export function StyledDropdown({
  value,
  onChange,
  options,
  placeholder = 'בחר...',
  className = '',
  variant = 'default'
}: StyledDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionsRef.current) {
      const focusedElement = optionsRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex, isOpen]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'pricing':
        return {
          button: 'bg-gradient-to-br from-white to-slate-50 border-2 border-indigo-200 text-slate-900 font-bold text-base shadow-md hover:border-indigo-300 hover:shadow-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400',
          dropdown: 'border-2 border-indigo-200 bg-white shadow-2xl',
          option: 'hover:bg-indigo-50 focus:bg-indigo-100 data-[selected=true]:bg-indigo-50',
          check: 'text-indigo-600'
        };
      case 'support':
        return {
          button: 'bg-gradient-to-br from-white to-slate-50 border-2 border-indigo-200 text-slate-900 font-bold text-base shadow-md hover:border-indigo-300 hover:shadow-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400',
          dropdown: 'border-2 border-indigo-200 bg-white shadow-2xl',
          option: 'hover:bg-indigo-50 focus:bg-indigo-100 data-[selected=true]:bg-indigo-50',
          check: 'text-indigo-600'
        };
      default:
        return {
          button: 'bg-white border-2 border-slate-200 text-slate-900 font-bold shadow-sm hover:border-slate-300 hover:shadow-md focus:ring-2 focus:ring-slate-400 focus:border-slate-400',
          dropdown: 'border-2 border-slate-200 bg-white shadow-xl',
          option: 'hover:bg-slate-50 focus:bg-slate-100 data-[selected=true]:bg-slate-50',
          check: 'text-slate-600'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full h-12 px-4 rounded-2xl flex items-center justify-between transition-all cursor-pointer focus:outline-none ${styles.button}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={optionsRef}
          className={`absolute z-50 w-full mt-2 rounded-2xl overflow-hidden ${styles.dropdown}`}
          role="listbox"
          aria-label="אופציות"
        >
          <div className="max-h-64 overflow-y-auto">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;
              
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${styles.option} ${
                    isFocused ? 'ring-2 ring-inset ring-indigo-300' : ''
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setFocusedIndex(-1);
                    buttonRef.current?.focus();
                  }}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span className="text-slate-900 font-bold text-base">
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check size={18} className={styles.check} strokeWidth={3} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
