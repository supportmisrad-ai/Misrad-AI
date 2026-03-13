import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, style, ...props }, ref) => {
  return (
    <div className="relative group">
      <select
        ref={ref}
        className={cn(
          'appearance-none h-12 w-full rounded-2xl border-2 border-slate-100 bg-white pl-10 pr-4 text-base font-bold text-slate-800 shadow-sm outline-none transition-all duration-200 cursor-pointer',
          'hover:border-slate-200 hover:shadow-md hover:bg-slate-50/50',
          'focus:border-sky-500 focus:ring-4 focus:ring-sky-100 focus:bg-white',
          'disabled:opacity-50 disabled:pointer-events-none disabled:bg-slate-50 disabled:cursor-not-allowed',
          'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-400 aria-[invalid=true]:focus:ring-rose-100',
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </select>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-colors group-hover:text-slate-600 group-focus-within:text-sky-500">
        <ChevronDown size={18} strokeWidth={2.5} />
      </div>
    </div>
  );
});

Select.displayName = 'Select';
