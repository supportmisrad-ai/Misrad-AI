import * as React from 'react';

import { cn } from '@/lib/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/60 disabled:opacity-60 disabled:pointer-events-none aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:border-rose-400 aria-[invalid=true]:focus:ring-2 aria-[invalid=true]:focus:ring-rose-200/60',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
