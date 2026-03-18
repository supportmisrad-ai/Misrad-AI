'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { BarChart, FileText, Menu, Mic, Settings, SquareMousePointer, TrendingUp, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/system/contexts/AuthContext';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { buildDocumentTitle } from '@/lib/room-branding';
import { usePathname, useRouter } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import { GlobalNotificationsBell } from '@/components/shared/GlobalNotificationsBell';
import { GlobalSearchModal } from '@/components/shared/GlobalSearchModal';
import { GlobalSupportModal } from '@/components/shared/GlobalSupportModal';
import { getOSModule } from '@/types/os-modules';
import type { OrganizationProfile } from '@/types';
import { ModuleBackground } from '@/components/shared/ModuleBackground';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import MobileMenuAttendanceButton from '@/components/shared/MobileMenuAttendanceButton';

export default function FinanceShell(props: {
  children: React.ReactNode;
  initialOrganization?: Partial<OrganizationProfile> | null;
}) {
  const { user } = useAuth();
  const { pathname, roomName } = useRoomBranding();
  const nextPathname = usePathname();
  const router = useRouter();

  const orgSlug = React.useMemo(() => parseWorkspaceRoute(nextPathname).orgSlug, [nextPathname]);
  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: user?.name ?? null,
    role: user?.role ?? null,
    avatarUrl: user?.avatar ?? null,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [, startTransition] = useTransition();

  const basePath = useMemo(() => {
    const info = parseWorkspaceRoute(nextPathname);
    if (info.orgSlug && info.module === 'finance') {
      return `/w/${encodeURIComponent(info.orgSlug)}/finance`;
    }
    return '/finance';
  }, [nextPathname]);

  const isMeRoute = useMemo(() => {
    return Boolean(nextPathname && nextPathname.startsWith(`${basePath}/me`));
  }, [basePath, nextPathname]);

  const moduleTitle = roomName || 'Finance';
  const orgTitle = props.initialOrganization?.name || moduleTitle;

  const navItems = useMemo(
    () => [
      { id: 'overview', label: 'סקירה', href: `${basePath}/overview`, icon: TrendingUp },
      { id: 'invoices', label: 'חשבוניות', href: `${basePath}/invoices`, icon: FileText },
      { id: 'expenses', label: 'הוצאות', href: `${basePath}/expenses`, icon: BarChart },
      { id: 'me', label: 'פרופיל', href: `${basePath}/me`, icon: UserIcon },
    ],
    [basePath]
  );

  const activeNavItem = useMemo(() => {
    const p = nextPathname || '';
    if (p.startsWith(`${basePath}/overview`)) return navItems.find((n) => n.id === 'overview') || null;
    if (p.startsWith(`${basePath}/invoices`)) return navItems.find((n) => n.id === 'invoices') || null;
    if (p.startsWith(`${basePath}/expenses`)) return navItems.find((n) => n.id === 'expenses') || null;
    if (p.startsWith(`${basePath}/me`)) return navItems.find((n) => n.id === 'me') || null;
    return navItems.find((n) => n.id === 'overview') || null;
  }, [basePath, navItems, nextPathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = buildDocumentTitle({ pathname, screenName: activeNavItem?.label || null });
  }, [activeNavItem?.label, pathname]);

  const goToMe = useCallback(() => {
    router.push(`${basePath}/me`);
  }, [basePath, router, systemIdentity?.needsProfileCompletion]);

  // Side-effects-only for sidebar (Link handles actual navigation)
  const onSidebarItemClick = useCallback((path: string) => {
    setIsMobileMenuOpen(false);
    setIsPlusMenuOpen(false);
  }, []);

  const onNavigateAction = useCallback((path: string) => {
    const href = `${basePath}${path === '/' ? '' : path}`;
    startTransition(() => router.push(href));
    setIsMobileMenuOpen(false);
    setIsPlusMenuOpen(false);
  }, [basePath, router, startTransition]);

  // Prefetch all nav routes on mount
  useEffect(() => {
    navItems.forEach((n) => {
      router.prefetch(n.href);
    });
  }, [navItems, router]);

  const headerName = systemIdentity?.name || String(user?.name || user?.email || 'משתמש');
  const headerRole = systemIdentity?.role || null;

  if (!user) {
    return <div className="p-8 text-center">נדרש התחברות</div>;
  }

  const viewNavItems = navItems
    .filter((n) => n.id !== 'me')
    .map((n) => ({ label: n.label, path: n.href.replace(basePath, '') || '/', icon: n.icon }));

  const mobileMenuItems = navItems.map((n) => ({
    id: n.id,
    label: n.label,
    path: n.href.replace(basePath, '') || '/',
    icon: n.icon,
  }));

  const isActiveAction = (path: string) => {
    const href = `${basePath}${path === '/' ? '' : path}`;
    return (nextPathname || '') === href || (nextPathname || '').startsWith(`${href}/`);
  };

  const togglePlusMenu = () => {
    setIsMobileMenuOpen(false);
    setIsPlusMenuOpen((v) => !v);
  };

  const handleVoiceClick = () => {
    setIsPlusMenuOpen(false);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus:open-voice-command'));
      }
    } catch {
      // ignore
    }
  };

  const avatarSlot = (
    <Avatar
      src={systemIdentity?.avatarUrl || null}
      alt={headerName}
      name={headerName}
      size="md"
      rounded="full"
      className="border-2 border-white shadow-sm"
    />
  );

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 overflow-hidden relative" dir="rtl">
      <ModuleBackground moduleKey="finance" />
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: orgTitle,
          logoUrl: props.initialOrganization?.logo || null,
          fallbackIcon: <OSModuleSquircleIcon moduleKey="finance" boxSize={40} iconSize={18} className="shadow-none" />,
          badgeModuleKey: 'finance',
        }}
        brandSubtitle={moduleTitle}
        onBrandClickAction={() => startTransition(() => router.push('/workspaces'))}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={props.initialOrganization?.name || moduleTitle} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={viewNavItems}
        primaryNavPaths={viewNavItems.map((n) => n.path)}
        isActiveAction={isActiveAction}
        onNavigateAction={onSidebarItemClick}
        linkHrefPrefix={basePath}
        bottomSlot={
          <div className="space-y-3">
            <AttendanceMiniStatus />
            <OSAppSwitcher compact={true} buttonLabel="מודולים" orgSlug={orgSlug || undefined} currentModule="finance" />
          </div>
        }
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <SharedHeader
          title={orgTitle}
          subtitle={activeNavItem?.label || null}
          currentDate={new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          mobileBrand={{
            name: orgTitle,
            logoUrl: props.initialOrganization?.logo || null,
            fallbackIcon: <OSModuleSquircleIcon moduleKey="finance" boxSize={32} iconSize={16} className="shadow-none" />,
            badgeModuleKey: 'finance',
          }}
          mobileLeadingSlot={undefined}
          onOpenCommandPaletteAction={undefined}
          onOpenSupportAction={undefined}
          actionsSlot={<ModuleHelpVideos moduleKey="finance" />}
          switcherSlot={<WorkspaceSwitcher />}
          notificationsSlot={<GlobalNotificationsBell />}
          user={{ name: headerName, role: headerRole }}
          onProfileClickAction={goToMe}
          profileHref={`${basePath}/me`}
          userAvatarSlot={avatarSlot}
          profileSlot={undefined}
          className="bg-transparent"
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-32 w-full relative" id="main-scroll-container">
          {props.children}
        </main>
      </main>

      <MobileBottomNav
        className={isPlusMenuOpen ? 'z-[60]' : 'z-40'}
        rightItems={[
          {
            id: 'overview',
            label: 'סקירה',
            icon: TrendingUp,
            active: activeNavItem?.id === 'overview',
            onClick: () => startTransition(() => router.push(`${basePath}/overview`)),
          },
          {
            id: 'invoices',
            label: 'חשבוניות',
            icon: FileText,
            active: activeNavItem?.id === 'invoices',
            onClick: () => startTransition(() => router.push(`${basePath}/invoices`)),
          },
        ]}
        leftItems={[
          {
            id: 'expenses',
            label: 'הוצאות',
            icon: BarChart,
            active: activeNavItem?.id === 'expenses',
            onClick: () => startTransition(() => router.push(`${basePath}/expenses`)),
          },
          {
            id: 'menu',
            label: 'תפריט',
            icon: SquareMousePointer,
            active: isMobileMenuOpen,
            onClick: () => setIsMobileMenuOpen(true),
          },
        ]}
        onPlusClickAction={togglePlusMenu}
        plusAriaLabel={isPlusMenuOpen ? 'סגור פעולות' : 'פעולה חדשה'}
        plusActive={isPlusMenuOpen}
        plusGradient={getOSModule('finance')?.gradient}
      />

      <AnimatePresence>
        {isPlusMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[45] backdrop-blur-md md:hidden"
              onClick={() => setIsPlusMenuOpen(false)}
            />
            <div className="fixed bottom-28 left-0 right-0 z-[50] flex justify-center gap-4 sm:gap-6 md:hidden pointer-events-none px-4">
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.05 }}
                className="flex flex-col items-center gap-2.5 pointer-events-auto"
              >
                <button
                  onClick={handleVoiceClick}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center hover:from-red-600 hover:to-red-700 active:scale-95 transition-all duration-200 border border-red-400/20"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Mic size={24} className="sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">פקודה קולית</span>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex flex-col items-center gap-2.5 pointer-events-auto"
              >
                <button
                  onClick={() => onNavigateAction('/me')}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-white text-slate-900 rounded-2xl shadow-lg shadow-black/10 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all duration-200 border border-gray-200/60"
                  aria-label="פרופיל"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <UserIcon size={24} className="sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">פרופיל</span>
              </motion.div>
            </div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                const shouldClose = info.offset.y > 110 || info.velocity.y > 900;
                if (shouldClose) setIsMobileMenuOpen(false);
              }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] border-t border-white/50"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              role="dialog"
              aria-modal="true"
              aria-label="תפריט"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50"></div>
              <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                  {mobileMenuItems.filter(i => i.id !== 'me' && i.id !== 'overview' && i.id !== 'invoices' && i.id !== 'expenses').map((item) => {
                    const isActiveItem = isActiveAction(item.path);
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { onNavigateAction(item.path); setIsMobileMenuOpen(false); }}
                        className="flex flex-col items-center gap-2 group"
                        aria-label={item.label}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md ${
                          isActiveItem
                            ? 'bg-[#059669] text-white shadow-[#059669]/30'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}>
                          <IconComponent size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] font-bold text-center leading-tight ${isActiveItem ? 'text-[#059669]' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                <div className="flex justify-center">
                  {(() => {
                    const meItem = mobileMenuItems.find(i => i.id === 'me');
                    if (!meItem) return null;
                    const isActiveItem = isActiveAction(meItem.path);
                    const IconComponent = meItem.icon;
                    return (
                      <button
                        type="button"
                        onClick={() => { onNavigateAction(meItem.path); setIsMobileMenuOpen(false); }}
                        className={`flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl transition-all duration-200 shadow-md ${
                          isActiveItem
                            ? 'bg-[#059669] text-white shadow-lg shadow-[#059669]/30'
                            : 'bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-slate-300/50'
                        }`}
                      >
                        <IconComponent size={24} strokeWidth={2} />
                        <span className="text-sm font-bold">פרופיל</span>
                      </button>
                    );
                  })()}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right mb-3 px-2">מודולים</div>
                  <div className="space-y-3">
                    <MobileMenuAttendanceButton />
                    <div className="px-2">
                      <OSAppSwitcher mode="inlineGrid" compact={true} orgSlug={orgSlug || undefined} currentModule="finance" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <GlobalSearchModal />
      <GlobalSupportModal />
    </div>
  );
}
