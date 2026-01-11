'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export type SharedNavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

export function SharedSidebar({
  isOpen,
  onSetOpenAction,
  brand,
  brandSubtitle,
  onBrandClickAction,
  topSlot,
  navItems,
  isActiveAction,
  onNavigateAction,
  primaryNavPaths,
  bottomSlot,
  containerClassName,
  showCollapseControls = true,
}: {
  isOpen: boolean;
  onSetOpenAction: (open: boolean) => void;
  brand: {
    name: string;
    logoUrl?: string | null;
    fallbackIcon?: React.ReactNode;
  };
  brandSubtitle?: string | null;
  onBrandClickAction?: () => void;
  topSlot?: React.ReactNode;
  navItems: SharedNavItem[];
  isActiveAction: (path: string) => boolean;
  onNavigateAction: (path: string) => void;
  primaryNavPaths?: string[];
  bottomSlot?: React.ReactNode;
  containerClassName?: string;
  showCollapseControls?: boolean;
}) {
  return (
    <aside
      className={
        containerClassName
          ? containerClassName
          : `hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'w-80' : 'w-32'} p-4 z-30 h-screen relative`
      }
    >
      <div
        id="main-sidebar"
        className={`flex flex-col h-full bg-[color:var(--os-sidebar-surface,rgba(255,255,255,0.60))] backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-[color:var(--os-sidebar-border,rgba(255,255,255,0.40))] overflow-hidden transition-all duration-500 ${isOpen ? 'px-4' : 'px-2 items-center'}`}
      >
        <div className={`flex items-center justify-between py-8 ${isOpen ? 'px-2' : 'justify-center'}`}>
          {isOpen ? (
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={onBrandClickAction}
                type="button"
                className={`flex items-center gap-3 text-right rounded-2xl px-1.5 py-1 transition-colors hover:bg-[color:var(--os-sidebar-brand-hover,rgba(255,255,255,0.50))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--os-sidebar-focus,rgba(0,0,0,0.20))] ${onBrandClickAction ? 'cursor-pointer' : 'cursor-default'}`}
                aria-label="מעבר בין עסקים"
                title="מעבר בין עסקים"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-gray-400/20 bg-[color:var(--os-sidebar-logo-surface,#ffffff)] overflow-hidden border border-[color:var(--os-sidebar-logo-border,#f3f4f6)]">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-cover" suppressHydrationWarning />
                  ) : (
                    brand.fallbackIcon || null
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span
                    className="font-bold text-lg tracking-tight text-[color:var(--os-sidebar-text,#111827)] block leading-none truncate"
                    title={brand.name}
                    suppressHydrationWarning
                  >
                    {brand.name}
                  </span>
                  {brandSubtitle ? (
                    <span
                      className="text-[9px] text-[color:var(--os-sidebar-text-muted,#9ca3af)] font-bold tracking-widest uppercase"
                      suppressHydrationWarning
                    >
                      {brandSubtitle}
                    </span>
                  ) : null}
                </div>
              </button>

              {topSlot ? <div className="w-full">{topSlot}</div> : null}
            </div>
          ) : (
            <div className="w-10 h-10 bg-[color:var(--os-sidebar-logo-surface,#ffffff)] rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-[color:var(--os-sidebar-logo-border,#f3f4f6)]">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-cover" suppressHydrationWarning />
              ) : (
                brand.fallbackIcon || null
              )}
            </div>
          )}

          {showCollapseControls ? (
            isOpen ? (
              <button
                onClick={() => onSetOpenAction(false)}
                className="text-[color:var(--os-sidebar-text-muted,#9ca3af)] hover:text-[color:var(--os-sidebar-text,#111827)] transition-colors p-1.5 hover:bg-[color:var(--os-sidebar-control-hover,rgba(255,255,255,0.60))] rounded-lg"
                aria-label="סגור תפריט צד"
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => onSetOpenAction(true)}
                className="mt-4 text-[color:var(--os-sidebar-text-muted,#9ca3af)] hover:text-[color:var(--os-sidebar-text,#111827)] transition-colors p-1.5 hover:bg-[color:var(--os-sidebar-control-hover,rgba(255,255,255,0.60))] rounded-lg"
                aria-label="פתח תפריט צד"
                type="button"
              >
                <ChevronLeft size={20} />
              </button>
            )
          ) : null}
        </div>

        <nav className="flex-1 space-y-1.5 mt-2 overflow-y-auto no-scrollbar">
          {navItems.map((item, index) => {
            const prevItem = index > 0 ? navItems[index - 1] : null;
            const isCurrentSecondary = primaryNavPaths ? !primaryNavPaths.includes(item.path) : false;
            const isPrevPrimary = primaryNavPaths ? Boolean(prevItem && primaryNavPaths.includes(prevItem.path)) : false;
            const showSeparator = Boolean(primaryNavPaths && isCurrentSecondary && isPrevPrimary);
            const showTrashSettingsSeparator = item.path === '/settings' && prevItem?.path === '/trash';

            return (
              <React.Fragment key={item.path}>
                {showSeparator ? (
                  <div
                    className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${isOpen ? 'mx-6 my-4' : 'mx-2 my-3'}`}
                  ></div>
                ) : null}
                {showTrashSettingsSeparator ? (
                  <div
                    className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${isOpen ? 'mx-6 my-4' : 'mx-2 my-3'}`}
                  ></div>
                ) : null}

                <button
                  onClick={() => onNavigateAction(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-150 group relative
                    ${
                      isActiveAction(item.path)
                        ? 'text-[color:var(--os-sidebar-active-text,#ffffff)] shadow-lg shadow-gray-900/30 font-bold'
                        : 'text-[color:var(--os-sidebar-text-muted,#6b7280)] hover:bg-[color:var(--os-sidebar-item-hover,rgba(255,255,255,0.50))] hover:text-[color:var(--os-sidebar-text,#111827)]'
                    }
                    ${!isOpen ? 'justify-center px-0 aspect-square' : ''}`}
                  aria-label={item.label}
                  type="button"
                >
                  {isActiveAction(item.path) ? (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-2xl z-0 ring-2 ring-[color:var(--os-sidebar-active-ring,rgba(0,0,0,0.20))]"
                      style={{
                        backgroundColor: 'var(--os-sidebar-active-bg,#000000)',
                        backgroundImage: 'var(--os-sidebar-active-bg-image, none)',
                        backgroundSize: 'cover',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  ) : null}

                  <span className="relative z-10 flex items-center justify-center w-5 h-5">
                    <item.icon
                      size={20}
                      strokeWidth={isActiveAction(item.path) ? 2.5 : 2}
                      className={isActiveAction(item.path) ? 'text-[color:var(--os-sidebar-active-text,#ffffff)]' : 'text-current'}
                    />
                  </span>

                  {isOpen ? <span className="relative z-10">{item.label}</span> : null}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {bottomSlot ? (
          <div
            className={`mt-auto pt-4 border-t border-[color:var(--os-sidebar-divider,rgba(229,231,235,0.30))] mb-4 ${isOpen ? 'px-2' : 'px-1'} `}
          >
            {bottomSlot}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
