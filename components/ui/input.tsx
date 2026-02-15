import * as React from 'react';

import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-150',
        'hover:border-slate-300 hover:shadow',
        'focus:border-sky-400 focus:ring-[3px] focus:ring-sky-100 focus:shadow-none',
        'disabled:opacity-50 disabled:pointer-events-none disabled:bg-slate-50',
        'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-400 aria-[invalid=true]:focus:ring-rose-100',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
