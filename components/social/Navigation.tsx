 'use client';

import React, { memo, useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { joinPath } from '@/lib/os/social-routing';
import type { SocialNavigationItem } from '@/lib/services/social-service';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { useSocialData } from '@/contexts/SocialDataContext';

// Icon mapping with default colors
const ICON_COLORS: Record<string, string> = {
  Home: 'text-blue-600',
  Users: 'text-indigo-600',
  Calendar: 'text-purple-600',
  MessageSquare: 'text-emerald-600',
  LayoutGrid: 'text-slate-600',
  Sparkles: 'text-amber-600',
  Megaphone: 'text-rose-600',
  BarChart3: 'text-cyan-600',
  Wallet: 'text-green-600',
  TrendingUp: 'text-orange-600',
  ShieldCheck: 'text-red-600',
  Settings: 'text-slate-600',
};

// Default items (fallback if DB is empty)
const DEFAULT_ITEMS: SocialNavigationItem[] = [
  { id: 'dashboard', label: 'מרכז שליטה', icon: 'Home', view: 'dashboard', section: 'global', order: 1, isVisible: true },
  { id: 'all-clients', label: 'כל הלקוחות', icon: 'Users', view: 'all-clients', section: 'global', order: 2, isVisible: true },
  { id: 'calendar', label: 'לוח שידורים', icon: 'Calendar', view: 'calendar', section: 'global', order: 3, isVisible: true },
  { id: 'inbox', label: 'תיבת הודעות', icon: 'MessageSquare', view: 'inbox', section: 'global', order: 4, isVisible: true },
  { id: 'workspace', label: 'סביבת עבודה', icon: 'LayoutGrid', view: 'workspace', section: 'client', order: 1, isVisible: true, requiresClient: true },
  { id: 'machine', label: 'פוסט בקליק ✨', icon: 'Sparkles', view: 'machine', section: 'client', order: 2, isVisible: true, requiresClient: true },
  { id: 'campaigns', label: 'קמפיינים', icon: 'Megaphone', view: 'campaigns', section: 'client', order: 3, isVisible: true, requiresClient: true },
  { id: 'analytics', label: 'נתונים וביצועים', icon: 'BarChart3', view: 'analytics', section: 'client', order: 4, isVisible: true, requiresClient: true },
  { id: 'team', label: 'צוות', icon: 'Users', view: 'team', section: 'management', order: 1, isVisible: true },
  { id: 'collection', label: 'גבייה', icon: 'Wallet', view: 'collection', section: 'management', order: 2, isVisible: true },
  { id: 'agency-insights', label: 'תובנות', icon: 'TrendingUp', view: 'agency-insights', section: 'management', order: 3, isVisible: true },
  { id: 'settings', label: 'הגדרות', icon: 'Settings', view: 'settings', section: 'settings', order: 1, isVisible: true },
];

function NavigationImpl({
  initialMenuItems,
  basePath,
  isSidebarOpen,
  gradient,
  isTeamEnabled,
}: {
  initialMenuItems?: SocialNavigationItem[];
  basePath: string;
  isSidebarOpen: boolean;
  gradient?: string | null;
  isTeamEnabled?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const { activeClientId, activeClient } = useSocialData();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const clientIdFromParams = searchParams.get('clientId');
  const clientNameFromParams = searchParams.get('clientName');
  const selectedClientId = clientIdFromParams || activeClientId || null;
  const selectedClientName = clientNameFromParams
    ? decodeURIComponent(clientNameFromParams)
    : (activeClient ? String((activeClient as unknown as { companyName?: string; name?: string })?.companyName || (activeClient as unknown as { companyName?: string; name?: string })?.name || '') : null);

  const menuItems: SocialNavigationItem[] = Array.isArray(initialMenuItems) && initialMenuItems.length > 0
    ? initialMenuItems
    : DEFAULT_ITEMS;

  // Filter items based on visibility only.
  // IMPORTANT: This sidebar is intentionally "dead" (no hooks / no RBAC / no active client coupling)
  // so it can stay stable and never rerender due to client state.
  const getFilteredItems = (section: string, items: SocialNavigationItem[]) => {
    return items
      .filter((item) => {
        if (item.section !== section) return false;
        if (!item.isVisible) return false;
        if (item.id === 'team' && isTeamEnabled === false) return false;
        return true;
      })
      .sort((a, b) => a.order - b.order);
  };

  const globalItems = getFilteredItems('global', menuItems);
  const clientItems = getFilteredItems('client', menuItems);
  const managementItems = getFilteredItems('management', menuItems);
  const settingsItems = getFilteredItems('settings', menuItems);

  const hasSelectedClient = Boolean(selectedClientId);

  const getRouteForView = (view: string) => {
    const map: Record<string, string> = {
      'dashboard': joinPath(basePath, '/dashboard'),
      'all-clients': joinPath(basePath, '/clients'),
      'calendar': joinPath(basePath, '/calendar'),
      'inbox': joinPath(basePath, '/inbox'),
      'workspace': joinPath(basePath, '/workspace'),
      'machine': joinPath(basePath, '/machine'),
      'campaigns': joinPath(basePath, '/campaigns'),
      'analytics': joinPath(basePath, '/analytics'),
      'team': joinPath(basePath, '/team'),
      'collection': joinPath(basePath, '/collection'),
      'agency-insights': joinPath(basePath, '/agency-insights'),
      'settings': joinPath(basePath, '/settings'),
      'profile': joinPath(basePath, '/me'),
    };
    return map[view] || joinPath(basePath, '/dashboard');
  };

  const NavItem = memo(function NavItem({ item }: { item: SocialNavigationItem }) {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[item.icon] || Icons.Home;
    const color = ICON_COLORS[item.icon] || 'text-slate-600';
    const href = getRouteForView(item.view);

    const isActive =
      hasMounted &&
      Boolean(pathname) &&
      (pathname === href || pathname.startsWith(`${href}/`));

    return (
      <Link
        href={href}
        scroll={false}
        className={`
          group relative flex items-center gap-4 p-3.5 rounded-2xl font-black text-sm transition-all duration-200 w-full
          ${isActive
            ? 'bg-gradient-to-l from-indigo-50 to-purple-50 text-slate-900 shadow-sm border border-indigo-100'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
        `}
      >
        <div className={`${isActive ? color : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
          <IconComponent size={22} />
        </div>
        {isSidebarOpen && (
          <>
            <span className="flex-1 text-right">{item.label}</span>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full" />
            )}
          </>
        )}
      </Link>
    );
  });

  return (
    <aside 
      id="main-sidebar" 
      className={`hidden md:flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-20'} relative z-30 h-screen p-4`}
    >
      <div className={`flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/40 overflow-hidden transition-all duration-300 ${isSidebarOpen ? '' : 'items-center'}`}>
        {/* Header */}
        <div className={`p-6 flex items-center gap-4 border-b border-white/40 bg-white/40 backdrop-blur-2xl ${isSidebarOpen ? '' : 'justify-center w-full'}`}>
          <div 
            className={`w-12 h-12 bg-gradient-to-br ${gradient || 'from-indigo-600 via-purple-600 to-pink-600'} rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg`}
          >
            {'S'}
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
                Social
              </span>
              <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase truncate">
                MISRAD AI
              </span>
            </div>
          )}
        </div>

        {isSidebarOpen ? (
          <div className="px-6 py-4 border-b border-white/30">
            <WorkspaceSwitcher className="w-full" />
          </div>
        ) : null}
        
        <nav className={`flex flex-col gap-2 p-4 flex-1 overflow-y-auto ${isSidebarOpen ? '' : 'w-full'}`}>
        {/* Global Items */}
        <div className="flex flex-col gap-1 mb-2">
          {isSidebarOpen && (
            <span className="text-[9px] font-black text-slate-400 px-4 mb-3 uppercase tracking-widest">
              כללי
            </span>
          )}
          {globalItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        {/* Client Section */}
        {hasSelectedClient ? (
          <>
            <div className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${isSidebarOpen ? 'mx-6 my-4' : 'mx-2 my-3'}`}></div>
            {isSidebarOpen && (
              <div className="px-4 mb-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {selectedClientName ? `לקוח: ${selectedClientName}` : 'לקוח נבחר'}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {clientItems.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </div>
          </>
        ) : null}

        {/* Management Items */}
        <div className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${isSidebarOpen ? 'mx-6 my-4' : 'mx-2 my-3'}`}></div>
        <div className="flex flex-col gap-1">
          {isSidebarOpen && (
            <span className="text-[9px] font-black text-slate-400 px-4 mb-3 uppercase tracking-widest">
              ניהול
            </span>
          )}
          {managementItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        {/* Settings */}
        {settingsItems.length > 0 ? (
          <>
            <div className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${isSidebarOpen ? 'mx-6 my-4' : 'mx-2 my-3'}`}></div>
            <div className="flex flex-col gap-1 mt-auto">
              {isSidebarOpen && (
                <span className="text-[9px] font-black text-slate-400 px-4 mb-3 uppercase tracking-widest">
                  הגדרות
                </span>
              )}
              {settingsItems.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </div>
          </>
        ) : null}
      </nav>

        <div>
          <div
            className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${
              isSidebarOpen ? 'mx-6 my-4' : 'mx-2 my-3'
            }`}
          ></div>
          <div className="px-4 pb-5 pt-4">
            <OSAppSwitcher mode="inlineGrid" compact={true} />
          </div>
        </div>
      </div>
    </aside>
  );
}

export default memo(NavigationImpl);

