import * as React from 'react';

import { cn } from '@/lib/cn';

export default function AdminPageHeader(props: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}) {
  const Icon = props.icon;

  return (
    <div className={cn('flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-4', props.className)} dir="rtl">
      <div className="flex items-center gap-2.5 md:gap-3">
        {Icon ? (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
            <Icon className="text-slate-700" size={20} />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-xl md:text-3xl font-black text-slate-900 truncate">{props.title}</div>
          {props.subtitle ? <div className="text-xs md:text-sm font-bold text-slate-500 mt-0.5 md:mt-1 truncate">{props.subtitle}</div> : null}
        </div>
      </div>

      {props.actions ? <div className="w-full md:w-auto">{props.actions}</div> : null}
    </div>
  );
}
