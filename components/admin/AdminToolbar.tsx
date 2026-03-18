import * as React from 'react';

import { Search } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';

export default function AdminToolbar(props: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const hasSearch = typeof props.searchValue === 'string' && typeof props.onSearchChange === 'function';

  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-3 shadow-sm',
        props.className
      )}
      dir="rtl"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          {hasSearch ? (
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                value={props.searchValue}
                onChange={(e) => props.onSearchChange?.(e.target.value)}
                placeholder={props.searchPlaceholder || 'חפש...'}
                className="pr-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 h-10"
              />
            </div>
          ) : null}

          {props.filters ? <div className="w-full sm:w-auto">{props.filters}</div> : null}
        </div>

        {props.actions ? <div className="w-full md:w-auto flex justify-end">{props.actions}</div> : null}
      </div>
    </div>
  );
}
