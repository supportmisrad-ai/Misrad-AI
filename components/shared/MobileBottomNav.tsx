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
    
    // Build gradient style for active state using the same colorMap as plus button
    const activeGradientStyle = (() => {
      if (!isActive || !plusGradient) return undefined;
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
      const gradient = stops.length >= 2
        ? `linear-gradient(135deg, ${stops.join(', ')})`
        : `linear-gradient(135deg, ${stops[0] || '#0f172a'}, ${stops[0] || '#334155'})`;
      return { background: gradient };
    })();
    
    return (
      <div key={item.id} className="flex flex-col items-center gap-1.5">
        <button
          onClick={item.onClick}
          aria-label={item.ariaLabel || item.label}
          aria-current={isActive ? 'page' : undefined}
          type="button"
          className={`flex items-center justify-center w-12 h-12 rounded-[20px] transition-all duration-300 relative group overflow-hidden ${
            isActive
              ? 'text-white shadow-[0_8px_25px_rgba(0,0,0,0.2)] scale-110'
              : 'bg-white/40 text-slate-500 border border-white/40 backdrop-blur-md hover:bg-white/60'
          }`}
        >
          {isActive && (
            <>
              <div 
                className="absolute inset-0 z-0 opacity-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
                style={activeGradientStyle}
              />
              <div className="absolute inset-0 bg-white/20 blur-md" />
            </>
          )}
          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`relative z-10 transition-transform group-active:scale-90 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`} />
        </button>
        <span className={`text-[10px] font-black tracking-tight leading-none transition-colors ${isActive ? 'text-slate-900 scale-105' : 'text-slate-400'}`}>
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
      <div className="absolute inset-0 rounded-t-[40px] bg-white/60 backdrop-blur-2xl border-t border-white/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pointer-events-none [-webkit-mask-image:radial-gradient(circle_52px_at_50%_-8px,transparent_51px,#000_52px)] [mask-image:radial-gradient(circle_52px_at_50%_-8px,transparent_51px,#000_52px)]"></div>

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
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.25)] border-[6px] border-[#f8fafc] transition-all duration-300 hover:scale-105 active:scale-95 ${plusClassName || ''}`}
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
