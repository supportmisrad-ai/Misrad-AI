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
    <div className={cn('flex flex-col md:flex-row md:items-end md:justify-between gap-4', props.className)} dir="rtl">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
            <Icon className="text-slate-700" size={22} />
          </div>
        ) : null}
        <div>
          <div className="text-2xl md:text-3xl font-black text-slate-900">{props.title}</div>
          {props.subtitle ? <div className="text-sm font-bold text-slate-500 mt-1">{props.subtitle}</div> : null}
        </div>
      </div>

      {props.actions ? <div className="w-full md:w-auto">{props.actions}</div> : null}
    </div>
  );
}
