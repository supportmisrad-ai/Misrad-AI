import * as React from 'react';

import { cn } from '@/lib/cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, style, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'appearance-none h-11 w-full rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm bg-no-repeat pl-10 pr-4 text-sm font-bold text-slate-800 shadow-sm outline-none transition-all duration-200 cursor-pointer',
        'hover:border-slate-300 hover:shadow-md hover:bg-white',
        'focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/8 focus:shadow-lg focus:bg-white',
        'disabled:opacity-50 disabled:pointer-events-none disabled:bg-slate-50 disabled:cursor-not-allowed',
        'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-400 aria-[invalid=true]:focus:ring-rose-100',
        className
      )}
      style={{ backgroundImage: chevronSvg, backgroundSize: '16px 16px', backgroundPosition: 'left 14px center', ...style }}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';
