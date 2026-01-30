import * as React from 'react';

import { cn } from '@/lib/cn';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/60 disabled:opacity-60 disabled:pointer-events-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-400 aria-[invalid=true]:focus:ring-2 aria-[invalid=true]:focus:ring-rose-200/60',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';
