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
            variant="outline"
            className={cn(
              'gap-2 px-4 py-2 rounded-xl text-sm font-black transition-colors whitespace-nowrap',
              active ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : undefined
            )}
          >
            {Icon ? <Icon size={16} /> : null}
            <span>{t.label}</span>
            {typeof t.badgeCount === 'number' ? (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-[11px] font-black',
                  active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
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
