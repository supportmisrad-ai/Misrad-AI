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
  className,
}: {
  rightItems: [MobileBottomNavItem, MobileBottomNavItem];
  leftItems: [MobileBottomNavItem, MobileBottomNavItem];
  onPlusClickAction: () => void;
  plusAriaLabel?: string;
  plusActive?: boolean;
  className?: string;
}) {
  const baseHeight = 65;

  const renderItem = (item: MobileBottomNavItem) => {
    const Icon = item.icon;
    const isActive = Boolean(item.active);
    return (
      <button
        key={item.id}
        onClick={item.onClick}
        aria-label={item.ariaLabel || item.label}
        aria-current={isActive ? 'page' : undefined}
        type="button"
        className={`mx-auto flex flex-col items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200 ${
          isActive
            ? 'bg-slate-900 text-white shadow-lg shadow-black/20'
            : 'bg-white/80 text-slate-500 border border-slate-200/60 shadow-sm hover:bg-white hover:border-slate-200'
        }`}
      >
        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="sm:w-5 sm:h-5" />
      </button>
    );
  };

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${className || ''}`}
      style={{ height: `calc(${baseHeight}px + env(safe-area-inset-bottom))` }}
      aria-label="ניווט תחתון"
    >
      <div className="absolute inset-0 pointer-events-none">
        <svg
          viewBox={`0 0 100 ${baseHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d={`M 0 0 L 36 0 C 41 0 43 20 50 22 C 57 20 59 0 64 0 L 100 0 L 100 ${baseHeight} L 0 ${baseHeight} Z`}
            fill="rgba(255,255,255,0.92)"
          />
          <path
            d={`M 0 0 L 36 0 C 41 0 43 20 50 22 C 57 20 59 0 64 0 L 100 0`}
            fill="none"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="1"
          />
        </svg>
        <div className="absolute inset-0 shadow-[0_-12px_30px_rgba(15,23,42,0.08)]" />
      </div>

      <div
        className="relative h-full grid grid-cols-5 items-center px-4"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="col-span-2 grid grid-cols-2 gap-4 justify-items-center">
          {rightItems.map(renderItem)}
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="relative -top-4">
            <button
              onClick={onPlusClickAction}
              aria-label={plusAriaLabel || 'פעולה חדשה'}
              type="button"
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(15,23,42,0.22)] border-[5px] border-[#f1f5f9] bg-gradient-to-br from-slate-900 to-slate-700"
            >
              <Plus
                size={26}
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
