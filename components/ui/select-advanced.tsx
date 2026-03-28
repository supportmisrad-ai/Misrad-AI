'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

// Select Context
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

const useSelect = () => {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within Select');
  }
  return context;
};

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Select = ({ 
  children, 
  value: controlledValue, 
  defaultValue,
  onValueChange,
  className 
}: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const [open, setOpen] = React.useState(false);
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger = ({ children, className }: SelectTriggerProps) => {
  const { setOpen, open } = useSelect();
  
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-12 w-full items-center justify-between rounded-xl border-2 border-slate-100 bg-white px-4 text-base font-bold text-slate-800 shadow-sm transition-all',
        'hover:border-slate-200 hover:shadow-md hover:bg-slate-50/50',
        'focus:border-sky-500 focus:ring-4 focus:ring-sky-100 focus:bg-white',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
    >
      {children}
      <ChevronDown 
        className={cn(
          'h-5 w-5 text-slate-400 transition-transform duration-200',
          open && 'rotate-180'
        )} 
      />
    </button>
  );
};

export interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

export const SelectValue = ({ placeholder, children }: SelectValueProps) => {
  const { value } = useSelect();
  
  return (
    <span className={cn('block truncate', !value && 'text-slate-400')}>
      {children || value || placeholder || 'בחר...'}
    </span>
  );
};

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent = ({ children, className }: SelectContentProps) => {
  const { open } = useSelect();
  
  if (!open) return null;
  
  return (
    <div 
      className={cn(
        'absolute z-50 w-full min-w-[8rem] overflow-hidden rounded-xl border-2 border-slate-100 bg-white text-slate-800 shadow-lg mt-1',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        className
      )}
    >
      <div className="p-1 max-h-[300px] overflow-auto">
        {children}
      </div>
    </div>
  );
};

export interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export const SelectItem = ({ children, value, className, disabled }: SelectItemProps) => {
  const { value: selectedValue, onValueChange } = useSelect();
  const isSelected = selectedValue === value;
  
  return (
    <div
      onClick={() => !disabled && onValueChange(value)}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pl-10 pr-3 text-sm font-medium transition-colors',
        'hover:bg-slate-100 focus:bg-slate-100',
        isSelected && 'bg-sky-50 text-sky-700 hover:bg-sky-100',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {isSelected && (
        <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
        </span>
      )}
      <span>{children}</span>
    </div>
  );
};
