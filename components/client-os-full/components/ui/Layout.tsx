'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, BrainCircuit, Settings, Sparkles, MessageSquareQuote, ChevronRight, ClipboardList, GitMerge, Bell, Plus, Menu, Mail, Layers } from 'lucide-react';
import NotificationsPanel from '../NotificationsPanel';
import { Notification } from '../../types';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { useNexus } from '../../context/ClientContext';
import { usePathname, useRouter } from 'next/navigation';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications: contextNotifications } = useNexus();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(contextNotifications);
  const { title, roomName, roomNameHebrew, RoomIcon } = useRoomBranding();
  const isWorkspaceRoute = Boolean(pathname?.startsWith('/w/'));

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [workspaceBrand, setWorkspaceBrand] = useState<{ name: string; logoUrl?: string | null }>({
    name: roomNameHebrew || roomName || 'Client',
    logoUrl: null,
  });

  const userLabel = useMemo(() => {
    const userData = (typeof window !== 'undefined' ? ((window as any).__CLIENT_OS_USER__ as any) : null);
    const rawName = userData?.identity?.name || userData?.name || '';
    const rawRole = userData?.identity?.role || userData?.role || '';
    const name = String(rawName || '').trim();
    const roleLabel = String(rawRole || '').trim();
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
      : '';
    return { name: name || null, roleLabel: roleLabel || null, initials: initials || null };
  }, []);

  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);

  const basePath = useMemo(() => {
    const info = parseWorkspaceRoute(pathname);
    if (info.orgSlug && info.module === 'client') {
      return `/w/${encodeURIComponent(info.orgSlug)}/client`;
    }
    return '/client';
  }, [pathname]);

  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug || null, {
    name: userLabel.name,
    role: userLabel.roleLabel,
    avatarUrl: null,
  });

  const displayInitials = useMemo(() => {
    const name = String(systemIdentity?.name || userLabel.name || '').trim();
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
      : '';
    return initials || userLabel.initials || null;
  }, [systemIdentity?.name, userLabel.initials, userLabel.name]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = ((window as any).__CLIENT_OS_USER__ as any) || null;
    const orgName = userData?.organization?.name || userData?.organization?.name_he || userData?.organization?.id || null;
    const logoUrl = userData?.organization?.logo || null;
    if (!orgName) return;
    setWorkspaceBrand({ name: String(orgName), logoUrl });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
  }, [title]);

  // Sync notifications from context
  useEffect(() => {
    setNotifications(contextNotifications);
  }, [contextNotifications]);

  // Org-level feature flags (temporary hardcoded). Later: load from system_settings.system_flags.
  const featureFlags: Record<string, boolean> = {
    email: true,
    workflows: false,
  };

  const ALL_NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'ראשי' },
    { id: 'clients', icon: Users, label: 'לקוחות' },
    { id: 'cycles', icon: Layers, label: 'מחזורים' },
    { id: 'email', icon: Mail, label: 'דואר' },
    { id: 'workflows', icon: GitMerge, label: 'תהליכים' },
    { id: 'forms', icon: ClipboardList, label: 'טפסים' },
    { id: 'feedback', icon: MessageSquareQuote, label: 'משובים' },
    { id: 'intelligence', icon: BrainCircuit, label: 'פענוח' },
    { id: 'analyzer', icon: Sparkles, label: 'ניתוח' },
  ];

  const navItems = ALL_NAV_ITEMS.filter((item) => featureFlags[item.id] !== false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'בוקר טוב';
    if (hour < 18) return 'צהריים טובים';
    return 'ערב טוב';
  }, []);

  const firstName = useMemo(() => {
    const name = String(systemIdentity?.name || userLabel.name || '').trim();
    if (!name) return '';
    return name.split(' ')[0] || '';
  }, [systemIdentity?.name, userLabel.name]);

  const moduleTitle = useMemo(() => roomNameHebrew || roomName || 'Client', [roomName, roomNameHebrew]);

  const screenTitle = useMemo(() => {
    if (activeView === 'dashboard') {
      return `${greeting}${firstName ? `, ${firstName}` : ''}`;
    }
    const found = navItems.find((n) => n.id === activeView);
    return found?.label || null;
  }, [activeView, firstName, greeting, navItems]);

  const viewNavItems = useMemo(
    () => navItems.map((item) => ({ label: item.label, path: `/${item.id}`, icon: item.icon })),
    [navItems]
  );

  const isActiveAction = (path: string) => {
    const id = path.replace('/', '');
    return id === activeView;
  };

  const onNavigateAction = (path: string) => {
    const id = path.replace('/', '');
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  const handleMarkAsRead = (id?: string) => {
      if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } else {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
  };

  const handleDismiss = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
      setNotifications([]);
  };

  const ALL_MOBILE_EXTRA_ITEMS = [
      { id: 'cycles', icon: Layers, label: 'מחזורים', desc: 'ניהול קבוצות לקוחות' },
      { id: 'email', icon: Mail, label: 'דואר', desc: 'מרכז תקשורת ו-AI' },
      { id: 'workflows', icon: GitMerge, label: 'תהליכים', desc: 'בניית שיטות עבודה' },
      { id: 'forms', icon: ClipboardList, label: 'טפסים', desc: 'שאלונים וקליטת לקוח' },
      { id: 'feedback', icon: MessageSquareQuote, label: 'משובים', desc: 'סקרים ו-NPS' },
      { id: 'analyzer', icon: Sparkles, label: 'ניתוח טקסט', desc: 'בדיקת שיחות חופשית' },
      { id: 'settings', icon: Settings, label: 'הגדרות', desc: 'ניהול המערכת' },
  ];

  const mobileExtraItems = ALL_MOBILE_EXTRA_ITEMS.filter((item) => featureFlags[item.id] !== false);

  const mobileNavItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'בית' },
      { id: 'clients', icon: Users, label: 'לקוחות' },
      { id: 'ADD_ACTION', icon: Plus, label: 'פעולה' },
      { id: 'intelligence', icon: BrainCircuit, label: 'AI' },
      { id: 'MENU', icon: Menu, label: 'תפריט' },
  ];

  const triggerCommand = () => {
      window.dispatchEvent(new CustomEvent('open-nexus-command'));
  };

  const handleMobileNavClick = (id: string) => {
      if (id === 'MENU') {
          setIsMobileMenuOpen(true);
      } else if (id === 'ADD_ACTION') {
          triggerCommand();
      } else {
          onNavigate(id);
      }
  };

  const handleDrawerNav = (id: string) => {
      onNavigate(id);
      setIsMobileMenuOpen(false);
  };

  const notificationsSlot = (
    <div className="flex items-center gap-2">
      <AttendanceMiniStatus />
      <button
        onClick={() => setIsNotificationsOpen(true)}
        className="relative p-2 rounded-full transition-colors hover:bg-white/50 text-gray-600"
        aria-label={`${unreadCount} notifications`}
        type="button"
      >
        <Bell size={18} />
        {unreadCount > 0 ? <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" /> : null}
      </button>
    </div>
  );

  const switcherSlot = isWorkspaceRoute ? <WorkspaceSwitcher /> : <RoomSwitcher />;

  const userAvatarSlot = (
    <Avatar
      src={systemIdentity?.avatarUrl || null}
      alt={systemIdentity?.name || userLabel.name || 'User'}
      name={systemIdentity?.name || userLabel.name || 'User'}
      size="md"
      rounded="full"
      className="border-2 border-white shadow-sm"
    />
  );

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 overflow-hidden" dir="rtl">
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: workspaceBrand.name,
          logoUrl: workspaceBrand.logoUrl || null,
          fallbackIcon: RoomIcon ? <RoomIcon size={20} className="text-gray-900" /> : null,
        }}
        brandSubtitle={roomNameHebrew || roomName || 'פורטל הצלחת לקוח'}
        onBrandClickAction={() => router.push('/workspaces')}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={workspaceBrand.name} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={viewNavItems}
        primaryNavPaths={['/dashboard', '/clients']}
        isActiveAction={isActiveAction}
        onNavigateAction={onNavigateAction}
        bottomSlot={
          <OSAppSwitcher
            compact={true}
            buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
            buttonLabel="מודולים"
            className={isSidebarOpen ? '' : 'w-full flex justify-center'}
          />
        }
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <SharedHeader
          title={moduleTitle}
          subtitle={screenTitle}
          currentDate={new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          mobileBrand={{
            name: moduleTitle,
            logoUrl: workspaceBrand.logoUrl || null,
            fallbackIcon: RoomIcon ? <RoomIcon size={18} className="text-gray-900" /> : null,
          }}
          mobileLeadingSlot={
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-full hover:bg-white/50 text-gray-600"
              aria-label="פתח תפריט"
              type="button"
            >
              <Menu size={18} />
            </button>
          }
          onOpenCommandPaletteAction={triggerCommand}
          onOpenSupportAction={undefined}
          switcherSlot={switcherSlot}
          notificationsSlot={notificationsSlot}
          user={{
            name: systemIdentity?.name || userLabel.name || '—',
            role: systemIdentity?.role || userLabel.roleLabel || null,
          }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me${systemIdentity?.needsProfileCompletion ? '?edit=profile' : ''}`}
          userAvatarSlot={userAvatarSlot}
          className="bg-transparent"
        />

        <main id="main-scroll-container" className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 min-h-0">
          <div className="flex flex-col min-h-0 pb-24 md:pb-0">{children}</div>
        </main>
      </main>

      <MobileBottomNav
        rightItems={[
          {
            id: 'dashboard',
            label: 'בית',
            icon: LayoutDashboard,
            active: activeView === 'dashboard',
            onClick: () => handleMobileNavClick('dashboard'),
          },
          {
            id: 'clients',
            label: 'לקוחות',
            icon: Users,
            active: activeView === 'clients',
            onClick: () => handleMobileNavClick('clients'),
          },
        ]}
        leftItems={[
          {
            id: 'intelligence',
            label: 'AI',
            icon: BrainCircuit,
            active: activeView === 'intelligence',
            onClick: () => handleMobileNavClick('intelligence'),
          },
          {
            id: 'menu',
            label: 'תפריט',
            icon: Menu,
            active: isMobileMenuOpen,
            onClick: () => handleMobileNavClick('MENU'),
          },
        ]}
        onPlusClickAction={triggerCommand}
        plusAriaLabel="Quick Action"
      />

      {/* DRAWER */}
      {isMobileMenuOpen ? (
        <div className="md:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Full menu">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            role="presentation"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-[100] p-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-white/50">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-50" />

            <div className="grid grid-cols-2 gap-4">
              {mobileExtraItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleDrawerNav(item.id)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3 active:scale-[0.98] transition-all"
                  type="button"
                >
                  <div className="w-12 h-12 bg-[#f1f5f9] rounded-xl flex items-center justify-center text-gray-900">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <span className="block font-bold text-gray-900">{item.label}</span>
                    <span className="text-[10px] text-gray-500">{item.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleDrawerNav('me')}
              className="mt-6 w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
              type="button"
            >
              <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center font-black text-lg shadow-md">
                {(displayInitials || 'U').slice(0, 2)}
              </div>
              <div className="flex-1 text-right">
                <span className="block font-bold text-gray-900" suppressHydrationWarning>
                  {systemIdentity?.name || userLabel.name || 'משתמש'}
                </span>
                <span className="text-xs text-gray-500" suppressHydrationWarning>
                  {systemIdentity?.role || userLabel.roleLabel || 'אזור אישי'}
                </span>
              </div>
              <div className="p-2 text-gray-400 bg-gray-50 rounded-lg">
                <ChevronRight size={20} className="rotate-180" />
              </div>
            </button>
          </div>
        </div>
      ) : null}

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onDismiss={handleDismiss}
        onClearAll={handleClearAll}
      />
    </div>
  );
};

export default Layout;
