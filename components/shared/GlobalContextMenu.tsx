'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Home,
  Search,
  User,
  Copy,
  ExternalLink,
  Maximize,
  Share2,
  Languages,
  // Module-specific icons
  BarChart3,
  Phone,
  Users,
  CalendarDays,
  ListTodo,
  TrendingUp,
  Target,
  FileText,
  PenTool,
  ImageIcon,
  Megaphone,
  LayoutDashboard,
  UserPlus,
  Briefcase,
  Receipt,
  Wallet,
  ClipboardList,
  HardHat,
  Package,
  Clock,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import type { OSModuleKey } from '@/lib/os/modules/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ContextMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
};

type ContextMenuSection = {
  id: string;
  label?: string;
  items: ContextMenuItem[];
};

type ContextMenuState = {
  x: number;
  y: number;
  sections: ContextMenuSection[];
} | null;

type ContextMenuContextValue = {
  registerItems: (key: string, sections: ContextMenuSection[]) => void;
  unregisterItems: (key: string) => void;
};

const ContextMenuContext = createContext<ContextMenuContextValue>({
  registerItems: () => {},
  unregisterItems: () => {},
});

export const useContextMenu = () => useContext(ContextMenuContext);

// ─── Module accent colors ────────────────────────────────────────────────────

const MODULE_ACCENT: Record<OSModuleKey, string> = {
  nexus: '#3730A3',
  system: '#A21D3C',
  social: '#7C3AED',
  finance: '#059669',
  client: '#C5A572',
  operations: '#0EA5E9',
};

const MODULE_LABEL_HE: Record<OSModuleKey, string> = {
  nexus: 'ניהול, משימות וצוות',
  system: 'מכירות',
  social: 'שיווק',
  finance: 'כספים',
  client: 'מעקב לקוחות',
  operations: 'תפעול',
};

// ─── Module-specific menu items ──────────────────────────────────────────────

function buildModuleItems(
  module: OSModuleKey,
  basePath: string,
  navigate: (path: string) => void,
): ContextMenuSection[] {
  const go = (sub: string) => () => navigate(`${basePath}/${sub}`);

  switch (module) {
    case 'system':
      return [{
        id: 'system-actions',
        label: 'מכירות',
        items: [
          { id: 'sys-dashboard', label: 'לוח בקרה', icon: LayoutDashboard, action: go('system') },
          { id: 'sys-pipeline', label: 'צינור מכירות', icon: TrendingUp, action: go('sales_pipeline') },
          { id: 'sys-leads', label: 'לידים', icon: Target, action: go('sales_leads') },
          { id: 'sys-dialer', label: 'חייגן', icon: Phone, action: go('dialer') },
          { id: 'sys-calendar', label: 'יומן', icon: CalendarDays, action: go('calendar') },
          { id: 'sys-reports', label: 'דוחות', icon: BarChart3, action: go('reports') },
          { id: 'sys-call-analyzer', label: 'ניתוח שיחות AI', icon: Sparkles, action: go('call_analyzer') },
          { id: 'sys-teams', label: 'צוותים', icon: Users, action: go('teams') },
          { id: 'sys-hub', label: 'מרכז שליטה', icon: Briefcase, action: go('hub') },
          { id: 'sys-automations', label: 'אוטומציות', icon: Settings, action: go('automations') },
        ],
      }];

    case 'nexus':
      return [{
        id: 'nexus-actions',
        label: 'ניהול וצוות',
        items: [
          { id: 'nex-home', label: 'דף הבית', icon: LayoutDashboard, action: go('') },
          { id: 'nex-tasks', label: 'משימות', icon: ListTodo, action: go('tasks') },
          { id: 'nex-team', label: 'צוות', icon: Users, action: go('team') },
          { id: 'nex-calendar', label: 'יומן', icon: CalendarDays, action: go('calendar') },
          { id: 'nex-clients', label: 'לקוחות', icon: UserPlus, action: go('clients') },
        ],
      }];

    case 'social':
      return [{
        id: 'social-actions',
        label: 'שיווק',
        items: [
          { id: 'soc-dashboard', label: 'לוח בקרה', icon: LayoutDashboard, action: go('dashboard') },
          { id: 'soc-calendar', label: 'לוח שנה', icon: CalendarDays, action: go('calendar') },
          { id: 'soc-content', label: 'בנק תוכן', icon: ImageIcon, action: go('content-bank') },
          { id: 'soc-campaigns', label: 'קמפיינים', icon: Megaphone, action: go('campaigns') },
          { id: 'soc-analytics', label: 'אנליטיקס', icon: BarChart3, action: go('analytics') },
          { id: 'soc-machine', label: 'מכונת תוכן AI', icon: Sparkles, action: go('machine') },
          { id: 'soc-clients', label: 'לקוחות', icon: Users, action: go('clients') },
          { id: 'soc-hub', label: 'מרכז שליטה', icon: Briefcase, action: go('hub') },
          { id: 'soc-compose', label: 'יצירת פוסט', icon: PenTool, action: go('collection') },
        ],
      }];

    case 'finance':
      return [{
        id: 'finance-actions',
        label: 'כספים',
        items: [
          { id: 'fin-overview', label: 'סקירה כללית', icon: LayoutDashboard, action: go('overview') },
          { id: 'fin-invoices', label: 'חשבוניות', icon: Receipt, action: go('invoices') },
          { id: 'fin-expenses', label: 'הוצאות', icon: Wallet, action: go('expenses') },
        ],
      }];

    case 'client':
      return [{
        id: 'client-actions',
        label: 'מעקב לקוחות',
        items: [
          { id: 'cli-dashboard', label: 'לוח בקרה', icon: LayoutDashboard, action: go('dashboard') },
          { id: 'cli-clients', label: 'לקוחות', icon: Users, action: go('clients') },
          { id: 'cli-hub', label: 'מרכז שליטה', icon: Briefcase, action: go('hub') },
          { id: 'cli-portal', label: 'פורטל לקוח', icon: ExternalLink, action: go('client-portal') },
          { id: 'cli-workflows', label: 'תהליכי עבודה', icon: ClipboardList, action: go('workflows') },
        ],
      }];

    case 'operations':
      return [{
        id: 'operations-actions',
        label: 'תפעול',
        items: [
          { id: 'ops-home', label: 'לוח בקרה', icon: LayoutDashboard, action: go('') },
          { id: 'ops-work-orders', label: 'הזמנות עבודה', icon: ClipboardList, action: go('work-orders') },
          { id: 'ops-projects', label: 'פרויקטים', icon: HardHat, action: go('projects') },
          { id: 'ops-inventory', label: 'מלאי', icon: Package, action: go('inventory') },
          { id: 'ops-contractors', label: 'קבלנים', icon: Users, action: go('contractors') },
          { id: 'ops-attendance', label: 'דוחות נוכחות', icon: Clock, action: go('attendance-reports') },
          { id: 'ops-purchase', label: 'הזמנות רכש', icon: FileText, action: go('purchase-orders') },
          { id: 'ops-settings', label: 'הגדרות', icon: Settings, action: go('settings') },
        ],
      }];

    default:
      return [];
  }
}

// ─── Global (always-shown) items ─────────────────────────────────────────────

function buildGlobalItems(
  navigate: (path: string) => void,
  hasSelection: boolean,
  orgSlug: string | null,
): ContextMenuSection[] {
  const sections: ContextMenuSection[] = [];

  // Clipboard & translate section (only when text is selected)
  if (hasSelection) {
    sections.push({
      id: 'clipboard',
      items: [
        {
          id: 'copy',
          label: 'העתק',
          icon: Copy,
          shortcut: 'Ctrl+C',
          action: () => {
            document.execCommand('copy');
          },
        },
        {
          id: 'translate',
          label: 'תרגם עם Google',
          icon: Languages,
          action: () => {
            const text = window.getSelection()?.toString()?.trim() || '';
            if (text) {
              window.open(`https://translate.google.com/?sl=auto&tl=he&text=${encodeURIComponent(text)}`, '_blank');
            }
          },
        },
      ],
    });
  }

  // Navigation section
  sections.push({
    id: 'navigation',
    items: [
      {
        id: 'back',
        label: 'אחורה',
        icon: ArrowRight,
        shortcut: 'Alt+→',
        action: () => window.history.back(),
      },
      {
        id: 'forward',
        label: 'קדימה',
        icon: ArrowLeft,
        shortcut: 'Alt+←',
        action: () => window.history.forward(),
      },
      {
        id: 'refresh',
        label: 'רענון',
        icon: RefreshCw,
        shortcut: 'Ctrl+R',
        action: () => window.location.reload(),
      },
    ],
  });

  // Quick links section
  const quickItems: ContextMenuItem[] = [
    {
      id: 'search',
      label: 'חיפוש',
      icon: Search,
      shortcut: 'Ctrl+K',
      action: () => {
        // Dispatch Ctrl+K to open existing search modals
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      },
    },
  ];

  if (orgSlug) {
    quickItems.push(
      {
        id: 'home',
        label: 'דף הבית',
        icon: Home,
        action: () => navigate(`/w/${encodeURIComponent(orgSlug)}`),
      },
      {
        id: 'profile',
        label: 'הפרופיל שלי',
        icon: User,
        action: () => navigate(`/w/${encodeURIComponent(orgSlug)}/nexus/me`),
      },
    );
  }

  sections.push({ id: 'quick-links', items: quickItems });

  // Utility section
  const utilItems: ContextMenuItem[] = [];

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    utilItems.push({
      id: 'share',
      label: 'שיתוף דף',
      icon: Share2,
      action: () => {
        navigator.share({ title: document.title, url: window.location.href }).catch(() => {});
      },
    });
  }

  utilItems.push({
    id: 'fullscreen',
    label: document.fullscreenElement ? 'יציאה ממסך מלא' : 'מסך מלא',
    icon: Maximize,
    shortcut: 'F11',
    action: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    },
  });

  if (utilItems.length > 0) {
    sections.push({ id: 'utility', items: utilItems });
  }

  return sections;
}

// ─── The menu UI ─────────────────────────────────────────────────────────────

function ContextMenuOverlay({
  state,
  onClose,
  accentColor,
  moduleLabel,
}: {
  state: NonNullable<ContextMenuState>;
  onClose: () => void;
  accentColor: string | null;
  moduleLabel: string | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: state.x, y: state.y });

  // Adjust position to keep menu inside viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      let x = state.x;
      let y = state.y;
      const pad = 8;

      if (x + rect.width > window.innerWidth - pad) {
        x = window.innerWidth - rect.width - pad;
      }
      if (y + rect.height > window.innerHeight - pad) {
        y = window.innerHeight - rect.height - pad;
      }
      if (x < pad) x = pad;
      if (y < pad) y = pad;

      setAdjustedPos({ x, y });
    });
  }, [state.x, state.y]);

  // Close on Escape / scroll / resize
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = () => onClose();
    const handleScroll = () => onClose();
    const handleResize = () => onClose();

    window.addEventListener('keydown', handleKey);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose]);

  const accent = accentColor || '#3730A3';

  return (
    <div className="fixed inset-0 z-[99999]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -4 }}
        transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
        className="absolute bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/80 py-1.5 min-w-[220px] max-w-[300px] max-h-[80vh] overflow-y-auto select-none"
        style={{
          left: adjustedPos.x,
          top: adjustedPos.y,
          boxShadow: `0 8px 40px -8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04), 0 0 0 3px ${accent}15`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Module badge */}
        {moduleLabel && (
          <div className="px-3 pt-1.5 pb-2 flex items-center gap-2 border-b border-slate-100 mb-1">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: accent }}
            />
            <span className="text-[11px] font-black text-slate-500 tracking-wide">
              {moduleLabel}
            </span>
          </div>
        )}

        {state.sections.map((section, sIdx) => (
          <div key={section.id}>
            {sIdx > 0 && <div className="h-px bg-slate-100 my-1 mx-2" />}
            {section.label && (
              <div className="px-3 pt-1.5 pb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {section.label}
                </span>
              </div>
            )}
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onClose();
                  // Slight delay so animation finishes
                  requestAnimationFrame(() => item.action());
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-right transition-all duration-100
                  ${item.danger
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-50'
                  }
                  active:scale-[0.98] group
                `}
              >
                <item.icon
                  size={15}
                  className={`shrink-0 transition-colors ${
                    item.danger
                      ? 'text-rose-400 group-hover:text-rose-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  style={!item.danger ? { ['--hover-color' as string]: accent } : undefined}
                />
                <span className="flex-1 text-[13px] font-bold truncate">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono font-bold text-slate-300 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        ))}

        {/* Branding footer */}
        <div className="h-px bg-slate-100 my-1 mx-2" />
        <div className="px-3 py-1.5 flex items-center justify-center">
          <span className="text-[9px] font-black text-slate-300 tracking-widest">MISRAD AI</span>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function GlobalContextMenuProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuState, setMenuState] = useState<ContextMenuState>(null);
  const customItemsRef = useRef<Map<string, ContextMenuSection[]>>(new Map());

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const closeMenu = useCallback(() => setMenuState(null), []);

  const registerItems = useCallback((key: string, sections: ContextMenuSection[]) => {
    customItemsRef.current.set(key, sections);
  }, []);

  const unregisterItems = useCallback((key: string) => {
    customItemsRef.current.delete(key);
  }, []);

  // Track whether the device uses touch — disable custom menu on touch devices
  const isTouchDeviceRef = useRef(false);

  useEffect(() => {
    const markTouch = () => { isTouchDeviceRef.current = true; };
    window.addEventListener('touchstart', markTouch, { once: true, passive: true });
    // Also detect on mount if touch is available
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      isTouchDeviceRef.current = true;
    }
    return () => window.removeEventListener('touchstart', markTouch);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // ── MOBILE: Never show custom context menu on touch devices ──
      // Long-press on mobile fires contextmenu and hijacks button taps.
      // Context menus are a desktop-only paradigm.
      if (isTouchDeviceRef.current) return;

      // Allow default context menu on input/textarea/contenteditable for native editing
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // ── Skip interactive elements (button, a, [role=button]) ──
      // Even on desktop, right-clicking a button should not hijack it.
      const interactive = target.closest('button, a, [role="button"], [role="link"], select, label');
      if (interactive) return;

      // Allow default on links (for "copy link address" etc.) only with Shift held
      if (e.shiftKey) return;

      e.preventDefault();

      const routeInfo = parseWorkspaceRoute(pathname);
      const hasSelection = Boolean(window.getSelection()?.toString()?.trim());
      const sections: ContextMenuSection[] = [];

      // 1. Module-specific items
      if (routeInfo.module && routeInfo.orgSlug) {
        const basePath = `/w/${encodeURIComponent(routeInfo.orgSlug)}/${routeInfo.module}`;
        const moduleItems = buildModuleItems(routeInfo.module, basePath, navigate);
        sections.push(...moduleItems);
      }

      // 2. Custom registered items from child components
      for (const customSections of customItemsRef.current.values()) {
        sections.push(...customSections);
      }

      // 3. Global items
      const globalItems = buildGlobalItems(navigate, hasSelection, routeInfo.orgSlug);
      sections.push(...globalItems);

      setMenuState({ x: e.clientX, y: e.clientY, sections });
    };

    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, [pathname, navigate]);

  // Parse route info for accent color
  const routeInfo = parseWorkspaceRoute(pathname);
  const accentColor = routeInfo.module ? MODULE_ACCENT[routeInfo.module] : null;
  const moduleLabel = routeInfo.module ? MODULE_LABEL_HE[routeInfo.module] : null;

  return (
    <ContextMenuContext.Provider value={{ registerItems, unregisterItems }}>
      {children}
      <AnimatePresence>
        {menuState && (
          <ContextMenuOverlay
            key="context-menu"
            state={menuState}
            onClose={closeMenu}
            accentColor={accentColor}
            moduleLabel={moduleLabel}
          />
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
}
