import * as React from 'react';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

export type AdminTabItem = {
  id: string;
  label: string;
  icon?: React.ElementType;
  badgeCount?: number;
};

export default function AdminTabs(props: {
  tabs: AdminTabItem[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2', props.className)} dir="rtl">
      {props.tabs.map((t) => {
        const Icon = t.icon;
        const active = String(props.value) === String(t.id);

        return (
          <Button
            key={t.id}
            type="button"
            onClick={() => props.onValueChange(t.id)}
            variant="ghost"
            className={cn(
              'gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border',
              active 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            {Icon ? <Icon size={16} className={active ? 'text-slate-300' : 'text-slate-500'} /> : null}
            <span>{t.label}</span>
            {typeof t.badgeCount === 'number' ? (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold',
                  active ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {t.badgeCount}
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
