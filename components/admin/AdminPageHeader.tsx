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
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 text-slate-600">
            <Icon size={20} />
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-xl font-black text-slate-900 tracking-tight truncate">{props.title}</div>
          {props.subtitle ? <div className="text-sm font-medium text-slate-500 truncate">{props.subtitle}</div> : null}
        </div>
      </div>

      {props.actions ? <div className="w-full md:w-auto">{props.actions}</div> : null}
    </div>
  );
}
