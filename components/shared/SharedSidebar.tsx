'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { safeBrowserUrl } from '@/lib/shared/safe-browser-url';

export type SharedNavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  separatorBefore?: boolean;
  sectionLabel?: string;
  sectionContainerClass?: string;
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
  secondaryDefaultOpen = false,
  linkHrefPrefix,
}: {
  isOpen: boolean;
  onSetOpenAction: (open: boolean) => void;
  brand: {
    name: string;
    logoUrl?: string | null;
    fallbackIcon?: React.ReactNode;
    badgeIcon?: React.ReactNode;
    badgeModuleKey?: OSModuleKey | null;
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
  secondaryDefaultOpen?: boolean;
  linkHrefPrefix?: string;
}) {
  const STORAGE_KEY = 'sidebar-secondary-open';
  const userToggledRef = useRef(false);

  const [isSecondaryOpen, setIsSecondaryOpen] = useState(() => {
    if (typeof window === 'undefined') return secondaryDefaultOpen;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch { /* ignore */ }
    return secondaryDefaultOpen;
  });

  const toggleSecondary = useCallback(() => {
    userToggledRef.current = true;
    setIsSecondaryOpen((v) => {
      const next = !v;
      try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const primaryItems = primaryNavPaths
    ? navItems.filter((item) => primaryNavPaths.includes(item.path))
    : navItems;
  const secondaryItems = primaryNavPaths
    ? navItems.filter((item) => !primaryNavPaths.includes(item.path))
    : [];
  const hasSecondary = secondaryItems.length > 0;
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
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-[color:var(--os-sidebar-logo-surface,#ffffff)] border border-[color:var(--os-sidebar-logo-border,#f3f4f6)]">
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    {safeBrowserUrl(brand.logoUrl) ? (
                      <img src={safeBrowserUrl(brand.logoUrl)!} alt="Logo" className="w-full h-full object-cover" suppressHydrationWarning />
                    ) : (
                      brand.fallbackIcon || null
                    )}
                  </div>
                  {brand.badgeModuleKey ? (
                    <div className="absolute -bottom-2 -left-2 z-20">
                      <OSModuleSquircleIcon moduleKey={brand.badgeModuleKey} boxSize={26} iconSize={14} />
                    </div>
                  ) : brand.badgeIcon ? (
                    <div className="absolute -bottom-2 -left-2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                      {brand.badgeIcon}
                    </div>
                  ) : null}
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
            <div className="relative w-10 h-10 bg-[color:var(--os-sidebar-logo-surface,#ffffff)] rounded-xl flex items-center justify-center shadow-md border border-[color:var(--os-sidebar-logo-border,#f3f4f6)]">
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                {safeBrowserUrl(brand.logoUrl) ? (
                  <img src={safeBrowserUrl(brand.logoUrl)!} alt="Logo" className="w-full h-full object-cover" suppressHydrationWarning />
                ) : (
                  brand.fallbackIcon || null
                )}
              </div>
              {brand.badgeModuleKey ? (
                <div className="absolute -bottom-2 -left-2 z-20">
                  <OSModuleSquircleIcon moduleKey={brand.badgeModuleKey} boxSize={26} iconSize={14} />
                </div>
              ) : brand.badgeIcon ? (
                <div className="absolute -bottom-2 -left-2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                  {brand.badgeIcon}
                </div>
              ) : null}
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
          {renderNavGroup(primaryItems, isOpen, isActiveAction, onNavigateAction, linkHrefPrefix)}

          {hasSecondary ? (
            <>
              <div className={`shrink-0 ${isOpen ? 'mx-2 my-2' : 'mx-2 my-3'}`}>
                <button
                  type="button"
                  onClick={toggleSecondary}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all
                    text-[color:var(--os-sidebar-text-muted,#9ca3af)] hover:text-[color:var(--os-sidebar-text,#6b7280)] hover:bg-[color:var(--os-sidebar-item-hover,rgba(255,255,255,0.30))]
                    ${!isOpen ? 'justify-center px-0' : ''}`}
                  aria-label={isSecondaryOpen ? 'הסתר עוד' : 'הצג עוד'}
                >
                  {isOpen ? (
                    <>
                      <MoreHorizontal size={14} />
                      <span>{isSecondaryOpen ? 'פחות' : 'עוד'}</span>
                      <ChevronDown size={12} className={`mr-auto transition-transform duration-200 ${isSecondaryOpen ? 'rotate-180' : ''}`} />
                    </>
                  ) : (
                    <MoreHorizontal size={16} />
                  )}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isSecondaryOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-1.5"
                  >
                    {renderNavGroup(secondaryItems, isOpen, isActiveAction, onNavigateAction, linkHrefPrefix)}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          ) : null}
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

function renderNavGroup(
  items: SharedNavItem[],
  isOpen: boolean,
  isActiveAction: (path: string) => boolean,
  onNavigateAction: (path: string) => void,
  linkHrefPrefix?: string
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < items.length) {
    const item = items[i];

    // Separator line
    if (item.separatorBefore) {
      elements.push(
        <div
          key={`sep-${item.path}`}
          className="shrink-0 h-px bg-gradient-to-r from-transparent via-[color:var(--os-sidebar-divider,rgba(209,213,219,0.30))] to-transparent mx-2 my-2"
        />
      );
    }

    // Section container: collect consecutive items sharing the same sectionContainerClass
    if (item.sectionContainerClass) {
      const containerClass = item.sectionContainerClass;
      const label = item.sectionLabel;
      const group: SharedNavItem[] = [item];
      let j = i + 1;
      while (j < items.length && !items[j].separatorBefore && !items[j].sectionContainerClass) {
        group.push(items[j]);
        j++;
      }

      elements.push(
        <div key={`section-${item.path}`} className={containerClass}>
          {label && isOpen ? (
            <div className="px-2.5 pt-1.5 pb-1">
              <span className="text-[10px] font-black text-[color:var(--os-sidebar-section-label,#9ca3af)] uppercase tracking-widest">
                {label}
              </span>
            </div>
          ) : null}
          <div className="space-y-1">
            {group.map((gi) => (
              <NavButton
                key={gi.path}
                item={gi}
                isOpen={isOpen}
                isActiveAction={isActiveAction}
                onNavigateAction={onNavigateAction}
                linkHrefPrefix={linkHrefPrefix}
              />
            ))}
          </div>
        </div>
      );
      i = j;
      continue;
    }

    // Standalone section label (no container)
    if (item.sectionLabel && isOpen) {
      elements.push(
        <div key={`label-${item.path}`} className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-black text-[color:var(--os-sidebar-text-muted,#9ca3af)] uppercase tracking-widest">
            {item.sectionLabel}
          </span>
        </div>
      );
    }

    elements.push(
      <NavButton
        key={item.path}
        item={item}
        isOpen={isOpen}
        isActiveAction={isActiveAction}
        onNavigateAction={onNavigateAction}
        linkHrefPrefix={linkHrefPrefix}
      />
    );
    i++;
  }

  return elements;
}

function NavButton({
  item,
  isOpen,
  isActiveAction,
  onNavigateAction,
  linkHrefPrefix,
}: {
  item: SharedNavItem;
  isOpen: boolean;
  isActiveAction: (path: string) => boolean;
  onNavigateAction: (path: string) => void;
  linkHrefPrefix?: string;
}) {
  const active = isActiveAction(item.path);

  const sharedClassName = `w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-150 group relative
    ${
      active
        ? 'text-[color:var(--os-sidebar-active-text,#ffffff)] shadow-[0_2px_8px_var(--os-sidebar-active-shadow,rgba(17,24,39,0.12))] font-bold'
        : 'text-[color:var(--os-sidebar-text-muted,#6b7280)] hover:bg-[color:var(--os-sidebar-item-hover,rgba(255,255,255,0.50))] hover:text-[color:var(--os-sidebar-text,#111827)]'
    }
    ${!isOpen ? 'justify-center px-0 aspect-square' : ''}`;

  const innerContent = (
    <>
      {active ? (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 rounded-2xl z-0 ring-1 ring-[color:var(--os-sidebar-active-ring,rgba(0,0,0,0.08))]"
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
          strokeWidth={active ? 2.5 : 2}
          className={active ? 'text-[color:var(--os-sidebar-active-text,#ffffff)]' : 'text-current'}
        />
      </span>

      {isOpen ? <span className="relative z-10">{item.label}</span> : null}
    </>
  );

  const resolvedHref = linkHrefPrefix
    ? `${linkHrefPrefix}${item.path === '/' ? '' : item.path.startsWith('/') ? item.path : `/${item.path}`}`
    : undefined;

  if (resolvedHref) {
    return (
      <Link
        href={resolvedHref}
        prefetch={true}
        onClick={() => onNavigateAction(item.path)}
        className={sharedClassName}
        aria-label={item.label}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      onClick={() => onNavigateAction(item.path)}
      className={sharedClassName}
      aria-label={item.label}
      type="button"
    >
      {innerContent}
    </button>
  );
}
