'use client';

import React from 'react';
import { Plus } from 'lucide-react';

export type MobileBottomNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  onClick: () => void;
  active?: boolean;
  ariaLabel?: string;
};

export default function MobileBottomNav({
  rightItems,
  leftItems,
  onPlusClickAction,
  plusAriaLabel,
  plusActive,
  plusGradient,
  plusClassName,
  className,
}: {
  rightItems: [MobileBottomNavItem, MobileBottomNavItem];
  leftItems: [MobileBottomNavItem, MobileBottomNavItem];
  onPlusClickAction: () => void;
  plusAriaLabel?: string;
  plusActive?: boolean;
  plusGradient?: string;
  plusClassName?: string;
  className?: string;
}) {
  const baseHeight = 80;

  const resolvedPlusGradient = plusGradient || 'from-slate-900 to-slate-700';

  const renderItem = (item: MobileBottomNavItem) => {
    const Icon = item.icon;
    const isActive = Boolean(item.active);
    return (
      <div key={item.id} className="flex flex-col items-center gap-1.5">
        <button
          onClick={item.onClick}
          aria-label={item.ariaLabel || item.label}
          aria-current={isActive ? 'page' : undefined}
          type="button"
          className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 ${
            isActive
              ? 'bg-slate-900 text-white shadow-lg shadow-black/20'
              : 'bg-white/80 text-slate-500 border border-slate-200/60 shadow-sm hover:bg-white hover:border-slate-200'
          }`}
        >
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="sm:w-5 sm:h-5" />
        </button>
        <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
          {item.label}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 overflow-visible ${className || ''}`}
      style={{ height: `calc(${baseHeight}px + env(safe-area-inset-bottom))` }}
      aria-label="ניווט תחתון"
    >
      <div className="absolute inset-0 rounded-t-[40px] bg-[var(--bg-app)]"></div>
      <div className="absolute inset-0 rounded-t-[40px] bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pointer-events-none [-webkit-mask-image:radial-gradient(circle_48px_at_50%_-8px,transparent_47px,#000_48px)] [mask-image:radial-gradient(circle_48px_at_50%_-8px,transparent_47px,#000_48px)]"></div>

      <div
        className="relative z-10 h-full grid grid-cols-5 items-center px-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="col-span-2 grid grid-cols-2 gap-4 justify-items-center">
          {rightItems.map(renderItem)}
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="relative -top-8 z-20">
            <button
              onClick={onPlusClickAction}
              aria-label={plusAriaLabel || 'פעולה חדשה'}
              type="button"
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(15,23,42,0.22)] border-[5px] border-white transition-all duration-200 ${plusClassName || ''}`}
              style={{
                background: (() => {
                  if (!plusGradient) return 'linear-gradient(135deg, #0f172a, #334155)';
                  const colorMap: Record<string, string> = {
                    'slate-900': '#0f172a', 'slate-700': '#334155', 'slate-800': '#1e293b',
                    'indigo-500': '#6366f1', 'indigo-600': '#4f46e5',
                    'purple-600': '#9333ea', 'purple-700': '#7e22ce',
                    'violet-600': '#7c3aed',
                    'blue-600': '#2563eb',
                    'pink-600': '#db2777',
                    'fuchsia-600': '#c026d3',
                    'cyan-600': '#0891b2',
                    'sky-500': '#0ea5e9', 'sky-600': '#0284c7',
                    'emerald-500': '#10b981', 'emerald-600': '#059669',
                    'teal-600': '#0d9488',
                    'red-600': '#dc2626', 'red-700': '#b91c1c',
                    'rose-600': '#e11d48',
                    'amber-500': '#f59e0b',
                    'orange-600': '#ea580c',
                  };
                  const resolveColor = (token: string): string | null => {
                    const arbMatch = token.match(/\[([^\]]+)\]/);
                    if (arbMatch) return arbMatch[1];
                    return colorMap[token] || null;
                  };
                  const stops = plusGradient
                    .split(/\s+/)
                    .map(t => t.replace(/^(?:from-|via-|to-)/, ''))
                    .map(resolveColor)
                    .filter(Boolean) as string[];
                  return stops.length >= 2
                    ? `linear-gradient(135deg, ${stops.join(', ')})`
                    : `linear-gradient(135deg, ${stops[0] || '#0f172a'}, ${stops[0] || '#334155'})`;
                })()
              }}
            >
              <Plus
                size={32}
                strokeWidth={2.5}
                className={`text-white transition-transform duration-200 ${plusActive ? 'rotate-45' : ''}`}
              />
            </button>
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4 justify-items-center">
          {leftItems.map(renderItem)}
        </div>
      </div>
    </div>
  );
}
