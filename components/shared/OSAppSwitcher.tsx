'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, Lock, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { OSModuleKey } from '@/lib/os/modules/types';
import { buildWorkspaceModulePath, modulesRegistry } from '@/lib/os/modules/registry';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { OS_MODULES } from '@/types/os-modules';
import { LockedModuleUpgradeModal } from '@/components/shared/LockedModuleUpgradeModal';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

function shouldOpenModuleInNewTab(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as any)?.standalone ||
    Boolean((window as any)?.Capacitor?.isNativePlatform?.());
  return !isStandalone;
}

function getUpsellCopy(module: OSModuleKey): { title: string; message: string } {
  const def = modulesRegistry[module];

  if (module === 'nexus') {
    return {
      title: def.label,
      message: 'Nexus תמיד זמין בחבילה שלך.',
    };
  }

  if (module === 'system') {
    return {
      title: def.label,
      message: 'אל תיתן לאף ליד ליפול בין הכיסאות. שדרג ל"מרכז המכירות והלידים" והפוך את תהליך הסגירה שלך למדויק, מהיר ועקבי.',
    };
  }

  if (module === 'social') {
    return {
      title: def.label,
      message: 'מוכן להפוך למותג שכולם מדברים עליו? שדרג למסלול "The Authority" והתחל לייצר שיווק שבונה סמכות ומביא לקוחות פרימיום באופן אוטומטי.',
    };
  }

  if (module === 'client') {
    return {
      title: def.label,
      message: 'רוצה לתת ללקוחות שלך חוויית VIP? שדרג ל"מעקב לקוחות ומתאמנים" והפוך כל שירות למוצר פרימיום שאי אפשר לעזוב.',
    };
  }

  if (module === 'finance') {
    return {
      title: def.label,
      message: 'רוצה לוודא שהכסף לא בורח מהצדדים? שדרג עכשיו ל"שליטה פיננסית מלאה"',
    };
  }

  return {
    title: def.label,
    message: 'המודול הזה לא כלול בחבילה שלך.',
  };
}

interface OSAppSwitcherProps {
  className?: string;
  orgSlug?: string;
  currentModule?: OSModuleKey;
  entitlements?: Record<OSModuleKey, boolean> | null;
  launchScopeModules?: Record<OSModuleKey, boolean> | null;
  mode?: 'button' | 'inlineGrid';
  buttonVariant?: 'icon' | 'wide';
  buttonLabel?: string;
  compact?: boolean;
  hideLockedModules?: boolean;
}

function parseWorkspaceRoute(pathname: string | null): {
  orgSlug: string | null;
  module: OSModuleKey | null;
} {
  if (!pathname) return { orgSlug: null, module: null };
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'w') return { orgSlug: null, module: null };
  const orgSlug = parts[1] || null;
  const rawModule = parts[2] || null;
  const allowed = new Set<OSModuleKey>(OS_MODULES.map((m) => m.id as OSModuleKey));
  const module = rawModule && allowed.has(rawModule as OSModuleKey) ? (rawModule as OSModuleKey) : null;
  return { orgSlug, module };
}

function getOrderedModuleKeys(): OSModuleKey[] {
  const keys = OS_MODULES.map((m) => m.id as OSModuleKey);
  return ['nexus', ...keys.filter((k) => k !== 'nexus')];
}

export const OSAppSwitcher: React.FC<OSAppSwitcherProps> = ({
  className = '',
  orgSlug: orgSlugProp,
  currentModule: currentModuleProp,
  entitlements: entitlementsProp,
  launchScopeModules: launchScopeModulesProp,
  mode = 'button',
  buttonVariant = 'icon',
  buttonLabel = 'מודולים',
  compact = true,
  hideLockedModules = false,
}) => {
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const entitlementsInFlightRef = useRef(false);
  const entitlementsAbortRef = useRef<AbortController | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const pathname = usePathname();
  const [entitlements, setEntitlements] = useState<Record<OSModuleKey, boolean> | null>(entitlementsProp ?? null);
  const [locked, setLocked] = useState<OSModuleKey | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const routeInfo = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);
  const orgSlug = orgSlugProp ?? routeInfo.orgSlug;
  const currentModule = currentModuleProp ?? routeInfo.module;

  const scope = useMemo<Record<OSModuleKey, boolean> | null>(() => {
    if (launchScopeModulesProp) return launchScopeModulesProp;
    // When not provided, fall back to showing all modules and let entitlements handle access.
    return null;
  }, [launchScopeModulesProp]);

  const calculateDropdownPosition = () => {
    if (!buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(560, Math.max(420, window.innerHeight - 140)); // Approximate height
    const dropdownWidth = 384;

    const desiredBottom = window.innerHeight - 16;
    const spaceAbove = rect.top;
    const spaceBelow = desiredBottom - rect.bottom;
    const shouldPlaceAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = window.innerWidth - dropdownWidth - 8;
    }
    if (left < 8) left = 8;

    let top = shouldPlaceAbove ? desiredBottom - dropdownHeight : rect.bottom + 12;
    if (top < 8) top = 8;
    if (top + dropdownHeight > desiredBottom) {
      top = desiredBottom - dropdownHeight;
    }

    setDropdownPosition({
      top,
      left,
      placement: shouldPlaceAbove ? 'top' : 'bottom',
    });
  };

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current && typeof window !== 'undefined') {
      calculateDropdownPosition();
    } else if (!isOpen) {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setEntitlements(entitlementsProp ?? null);
  }, [entitlementsProp]);

  useEffect(() => {
    const load = async () => {
      if (!orgSlug) return;
      if (entitlementsProp !== undefined) return;
      if (entitlementsInFlightRef.current) return;
      entitlementsInFlightRef.current = true;

      entitlementsAbortRef.current?.abort();
      const controller = new AbortController();
      entitlementsAbortRef.current = controller;
      try {
        const res = await fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/entitlements`, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.entitlements) {
          setEntitlements(data.entitlements);
        }
      } catch {
        // ignore
      }
      finally {
        entitlementsInFlightRef.current = false;
      }
    };

    load();
    const handleFocus = () => load();
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        load();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      entitlementsAbortRef.current?.abort();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [entitlementsProp, orgSlug]);

  const moduleKeys: OSModuleKey[] = getOrderedModuleKeys();
  const visibleModules = moduleKeys.filter((k) => k !== currentModule).filter((k) => (scope ? Boolean(scope[k]) : true));
  const enabledCount = entitlements
    ? visibleModules.filter((k) => Boolean(entitlements[k])).length
    : 0;

  const navigateTo = (targetOrgSlug: string, module: OSModuleKey) => {
    const href = buildWorkspaceModulePath(targetOrgSlug, module);
    if (shouldOpenModuleInNewTab()) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(href);
  };

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  if (mode === 'inlineGrid') {
    const effectiveEntitlements = hasMounted ? entitlements : null;
    const isReady = Boolean(effectiveEntitlements);
    const modulesToRender = hideLockedModules
      ? isReady
        ? visibleModules.filter((k) => k === 'nexus' ? true : Boolean(effectiveEntitlements?.[k]))
        : []
      : visibleModules;
    const gridColsClass = modulesToRender.length >= 5 ? 'grid-cols-3' : modulesToRender.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

    return (
      <div className={className} aria-label="מעבר בין מערכות">
        <div className={`grid ${gridColsClass} ${compact ? 'gap-2' : 'gap-3'}`}>
          {modulesToRender.map((key) => {
            const def = modulesRegistry[key];
            const enabled = key === 'nexus' ? true : Boolean(effectiveEntitlements?.[key]);

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (!orgSlug) return;
                  if (!isReady && key !== 'nexus') return;
                  if (enabled) {
                    navigateTo(orgSlug, key);
                    return;
                  }
                  setLocked(key);
                }}
                disabled={!orgSlug || (!isReady && key !== 'nexus')}
                className={`group relative w-full rounded-3xl border border-white/70 backdrop-blur transition-all overflow-hidden text-center
                  ${enabled ? 'bg-white/70' : 'bg-slate-50/80'}
                  ${compact ? 'h-28 p-3' : 'h-32 p-4'}
                `}
                aria-label={def?.label || key}
                title={def?.label || key}
              >
                <div
                  className={`absolute inset-0 transition-opacity ${enabled ? 'opacity-60 group-hover:opacity-100' : 'opacity-100'}`}
                  style={{
                    background: enabled
                      ? `radial-gradient(420px circle at 30% 10%, ${def.theme.accent}26, transparent 45%)`
                      : 'radial-gradient(420px circle at 30% 10%, rgba(148,163,184,0.22), transparent 45%)',
                  }}
                />

                <div className="relative flex flex-col items-center justify-center h-full">
                  <div className="relative flex items-center justify-center mx-auto mb-3">
                    <OSModuleSquircleIcon moduleKey={key} boxSize={56} iconSize={20} disabled={!enabled} />
                  </div>

                  <div className={`text-sm font-black leading-none ${enabled ? 'text-slate-900' : 'text-slate-500'}`}>
                    {def?.label || key}
                    {!enabled ? <Lock size={12} className="inline-block mr-2 align-[-2px] text-slate-400" /> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {locked ? <LockedModuleUpgradeModal module={locked} onCloseAction={() => setLocked(null)} /> : null}
      </div>
    );
  }

  return (
    <>
      <div className={`relative ${className}`} ref={switcherRef}>
        <button
          ref={buttonRef}
          onClick={() => {
            if (!isOpen) {
              calculateDropdownPosition();
              setIsOpen(true);
              return;
            }
            // When open, ignore button clicks to avoid accidental immediate close.
            // Close via backdrop or the X button.
          }}
          className={`
            ${buttonVariant === 'wide'
              ? 'w-full h-12 rounded-2xl px-4 flex items-center justify-center gap-3 flex-row-reverse'
              : 'w-10 h-10 rounded-xl flex items-center justify-center'}
            transition-all duration-200 relative
            ${isOpen
              ? 'bg-slate-200/80 text-slate-900 shadow-sm'
              : 'bg-white/60 text-slate-700 hover:bg-white/80 hover:text-slate-900 shadow-sm'}
            backdrop-blur-xl
            border border-slate-200/70
          `}
          aria-label="מעבר בין מערכות"
          title="מעבר בין מערכות"
          disabled={!orgSlug}
        >
          <LayoutGrid size={20} />
          {buttonVariant === 'wide' ? (
            <span className="text-sm font-black text-slate-700">{buttonLabel}</span>
          ) : null}
          {enabledCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center leading-none">
              {enabledCount}
            </span>
          )}
        </button>

      {/* Popup Menu */}
      {(() => {
        if (!isOpen) return null;

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

        const content = (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9000]"
              onClick={() => setIsOpen(false)}
            />

            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: isMobile ? '50%' : dropdownPosition ? dropdownPosition.top : '50%',
                left: isMobile
                  ? '50%'
                  : dropdownPosition
                    ? Math.max(8, Math.min(dropdownPosition.left, window.innerWidth - 392))
                    : '50%',
                transform: isMobile || !dropdownPosition ? 'translate(-50%, -50%)' : undefined,
                width: isMobile ? 'min(420px, calc(100vw - 16px))' : '384px',
                maxHeight: 'calc(100vh - 32px)',
                zIndex: 9001,
              }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="max-h-[calc(100vh-32px)] overflow-y-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">מעבר בין מערכות</h3>
                  <p className="text-xs text-slate-500 mt-0.5">בחר מערכת לעבור אליה</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="סגור"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleModules.map((key) => {
                  const def = modulesRegistry[key];
                  const isKnownLocked = key !== 'nexus' && Boolean(entitlements) && !Boolean(entitlements?.[key]);
                  const enabled = key === 'nexus' ? true : !isKnownLocked;
                  const accent = def?.theme?.accent || '#0F172A';

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (!orgSlug) return;
                        setIsOpen(false);
                        if (enabled) {
                          navigateTo(orgSlug, key);
                          return;
                        }
                        setLocked(key);
                      }}
                      className={`group relative p-5 rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col items-center justify-center text-center min-h-[144px] ${
                        enabled
                          ? 'border-slate-200/70 bg-white/70 hover:bg-white hover:border-slate-300 hover:shadow-md cursor-pointer'
                          : 'border-slate-200/70 bg-slate-50/80 text-slate-400'
                      }`}
                      title={def.label}
                      type="button"
                    >
                      <div
                        className="absolute inset-0 opacity-100"
                        style={{
                          background: enabled
                            ? `radial-gradient(520px circle at 35% 20%, ${accent}14, transparent 45%)`
                            : 'radial-gradient(520px circle at 35% 20%, rgba(148,163,184,0.16), transparent 45%)',
                        }}
                      />

                      <div className="relative flex items-center justify-center mb-3">
                        <OSModuleSquircleIcon moduleKey={key} boxSize={56} iconSize={20} disabled={!enabled} />
                      </div>

                      <div className="relative w-full min-w-0">
                        <div
                          className={`text-sm font-black leading-none truncate ${enabled ? 'text-slate-900' : 'text-slate-400'}`}
                          title={def.label}
                        >
                          {def.label}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
                <p className="text-xs text-slate-500 text-center">
                  {enabledCount} מערכות זמינות
                </p>
              </div>
              </div>
            </div>
          </>
        );

        return portalTarget ? createPortal(content, portalTarget) : content;
      })()}
    </div>
      {locked && (
        <LockedModuleUpgradeModal module={locked} onCloseAction={() => setLocked(null)} />
      )}
    </>
  );
};

export default OSAppSwitcher;

