'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OSModuleKey } from '@/lib/os/modules/types';
import { buildWorkspaceModulePath } from '@/lib/os/modules/registry';
import { OS_MODULES } from '@/types/os-modules';

type WorkspaceItem = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  entitlements: Record<OSModuleKey, boolean>;
  subscriptionPlan?: string | null;
};

function parseWorkspaceRoute(pathname: string | null): {
  orgSlug: string | null;
  module: OSModuleKey | null;
  rest: string;
} {
  if (!pathname) return { orgSlug: null, module: null, rest: '' };
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'w') return { orgSlug: null, module: null, rest: '' };
  const orgSlug = parts[1] || null;
  const rawModule = parts[2] || null;
  const allowed = new Set<OSModuleKey>(OS_MODULES.map((m) => m.id as OSModuleKey));
  const module = rawModule && allowed.has(rawModule as OSModuleKey) ? (rawModule as OSModuleKey) : null;
  const rest = parts.length > 3 ? `/${parts.slice(3).join('/')}` : '';
  return { orgSlug, module, rest };
}

function getFirstAllowedModule(entitlements: Record<OSModuleKey, boolean>): OSModuleKey | null {
  const order: OSModuleKey[] = OS_MODULES.map((m) => m.id as OSModuleKey);
  for (const key of order) {
    if (entitlements[key]) return key;
  }
  return null;
}

function OrgAvatar({ name, logo, size = 32 }: { name: string; logo?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={name}
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0)}
    </div>
  );
}

export function WorkspaceSwitcher({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const routeInfo = useMemo(() => parseWorkspaceRoute(pathname), [pathname]);

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch('/api/workspaces', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setWorkspaces(Array.isArray(data?.workspaces) ? data.workspaces : []);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authLoaded, isSignedIn]);

  const current = routeInfo.orgSlug;
  const currentWorkspace = workspaces.find((w) => w.slug === current);

  const handleSwitch = useCallback((target: WorkspaceItem) => {
    setIsOpen(false);
    const currentModule = routeInfo.module;
    const rest = routeInfo.rest;

    if (currentModule && target.entitlements[currentModule]) {
      router.push(`${buildWorkspaceModulePath(target.slug, currentModule)}${rest}`);
      return;
    }

    const first = getFirstAllowedModule(target.entitlements);
    if (first) {
      router.push(buildWorkspaceModulePath(target.slug, first));
      return;
    }

    router.push(`/w/${encodeURIComponent(target.slug)}/lobby`);
  }, [routeInfo, router]);

  const toggleOpen = useCallback(() => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 280) });
    }
    setIsOpen((v) => !v);
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (isLoading) return null;
  if (!current || workspaces.length <= 1) return null;

  // Split: current org first, then others
  const otherWorkspaces = workspaces.filter((w) => w.slug !== current);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border ${
          isOpen
            ? 'bg-white border-slate-300 shadow-md ring-2 ring-slate-900/5'
            : 'bg-white/80 border-slate-200/80 shadow-sm hover:bg-white hover:shadow-md hover:border-slate-300'
        } ${className}`}
        aria-label="החלף ארגון"
      >
        <OrgAvatar name={currentWorkspace?.name || '?'} logo={currentWorkspace?.logo} size={26} />
        <span className="flex-1 text-right truncate text-slate-800">{currentWorkspace?.name || current}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && position && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 9999 }}
            className="bg-white rounded-2xl shadow-[0_12px_48px_-12px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden"
            dir="rtl"
          >
            {/* Current Org */}
            {currentWorkspace ? (
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <OrgAvatar name={currentWorkspace.name} logo={currentWorkspace.logo} size={34} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{currentWorkspace.name}</p>
                    <p className="text-[10px] font-bold text-emerald-600">פעיל כעת</p>
                  </div>
                  <Check size={16} className="text-emerald-600 shrink-0" strokeWidth={3} />
                </div>
              </div>
            ) : null}

            {/* Divider */}
            {otherWorkspaces.length > 0 ? (
              <div className="px-5">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>
            ) : null}

            {/* Other Orgs */}
            {otherWorkspaces.length > 0 ? (
              <div className="px-3 py-2 max-h-[240px] overflow-y-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1.5">ארגונים נוספים</p>
                {otherWorkspaces.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSwitch(w)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-right transition-all hover:bg-slate-50 group"
                  >
                    <OrgAvatar name={w.name} logo={w.logo} size={30} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 truncate">{w.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
