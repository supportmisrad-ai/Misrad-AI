'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { SquareMousePointer, Bell, Calendar, Home, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import nextDynamic from 'next/dynamic';
import ToastContainer from '@/components/social/ToastContainer';

const AddClientModal = nextDynamic(() => import('@/components/social/modals/AddClientModal'), { ssr: false });
const InviteClientModal = nextDynamic(() => import('@/components/social/modals/InviteClientModal'), { ssr: false });
const PaymentLinkModal = nextDynamic(() => import('@/components/social/modals/PaymentLinkModal'), { ssr: false });
const TaskModal = nextDynamic(() => import('@/components/social/modals/TaskModal'), { ssr: false });
const CampaignWizard = nextDynamic(() => import('@/components/social/modals/CampaignWizard'), { ssr: false });
const ReportModal = nextDynamic(() => import('@/components/social/modals/ReportModal'), { ssr: false });
const HelpModal = nextDynamic(() => import('@/components/social/modals/HelpModal'), { ssr: false });
const CommandPalette = nextDynamic(() => import('@/components/social/CommandPalette'), { ssr: false });
const NotificationCenter = nextDynamic(() => import('@/components/social/NotificationCenter'), { ssr: false });
const OnboardingTour = nextDynamic(() => import('@/components/social/OnboardingTour'), { ssr: false });
const ClientOnboardingPortal = nextDynamic(() => import('@/components/social/ClientOnboardingPortal'), { ssr: false });

import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { joinPath } from '@/lib/os/social-routing';

import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { getUnreadUpdatesCount } from '@/app/actions/updates';
import { openComingSoon } from '@/components/shared/coming-soon';
import { Skeleton } from '@/components/ui/skeletons';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import { getOSModule } from '@/types/os-modules';
import type { OrganizationProfile } from '@/types';
import { ModuleBackground } from '@/components/shared/ModuleBackground';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import MobileMenuAttendanceButton from '@/components/shared/MobileMenuAttendanceButton';

import { useSocialUI } from '@/contexts/SocialUIContext';
import { useSocialData } from '@/contexts/SocialDataContext';

export default function SocialFrame({
  children,
  basePath,
  orgSlug,
  isTeamEnabled,
  initialOrganization,
  initialCurrentUser,
}: {
  children: React.ReactNode;
  basePath: string;
  orgSlug: string;
  isTeamEnabled?: boolean;
  initialOrganization?: Partial<OrganizationProfile> | null;
  initialCurrentUser?: { name?: string | null; role?: string | null; avatarUrl?: string | null } | null;
}) {
  const {
    isTourActive,
    setIsTourActive,
    isOnboardingMode,
    isTeamManagementEnabled,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setIsNotificationCenterOpen,
    isNotificationCenterOpen,
    setIsHelpModalOpen,
    isHelpModalOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    isAddClientModalOpen,
    setIsAddClientModalOpen,
    isCampaignWizardOpen,
    setIsCampaignWizardOpen,
    isInviteModalOpen,
    isPaymentModalOpen,
    isTaskModalOpen,
    isReportModalOpen,
  } = useSocialUI();

  const { activeClient } = useSocialData();

  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { roomName, gradient, roomIconName } = useRoomBranding();
  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: initialCurrentUser?.name ?? null,
    role: initialCurrentUser?.role ?? null,
    avatarUrl: initialCurrentUser?.avatarUrl ?? null,
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };
    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true });
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  const isActive = (suffix: string) => {
    const full = joinPath(basePath, suffix);
    return (pathname || '') === full;
  };

  const navigate = (suffix: string) => {
    router.push(joinPath(basePath, suffix));
  };

  const titles: Record<string, string> = {
    dashboard: 'מרכז שליטה',
    machine: 'פוסט בקליק ✨',
    calendar: 'לוח שידורים',
    workspace: 'סביבת עבודה ללקוח',
    campaigns: 'ניהול קמפיינים',
    analytics: 'נתונים וביצועים',
    inbox: 'הודעות ותגובות',
    settings: 'הגדרות מערכת',
    'all-clients': 'כל הלקוחות שלי',
    profile: 'פרופיל אישי',
    team: 'צוות',
    collection: 'גבייה',
    'content-bank': 'בנק תכנים',
    'agency-insights': 'תובנות',
    'admin-panel': 'ניהול מערכת',
  };

  const getViewFromPath = (pathnameValue: string | null): string => {
    const p = pathnameValue || '';
    const sub = p.startsWith(basePath) ? p.slice(basePath.length) : p;
    const map: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/clients': 'all-clients',
      '/calendar': 'calendar',
      '/inbox': 'inbox',
      '/workspace': 'workspace',
      '/machine': 'machine',
      '/campaigns': 'campaigns',
      '/analytics': 'analytics',
      '/collection': 'collection',
      '/content-bank': 'content-bank',
      '/agency-insights': 'agency-insights',
      '/admin': 'admin-panel',
      '/settings': 'settings',
      '/me': 'profile',
    };
    return map[sub] || 'dashboard';
  };

  const currentView = useMemo(() => getViewFromPath(pathname), [pathname]);

  // Prefer workspace/business name for header title as soon as possible.
  // roomName (from branding) might arrive a bit later, so we use initialOrganization
  // as a fast, server-provided fallback to avoid showing "Social" for long seconds.
  const workspaceName = useMemo(() => {
    const org = initialOrganization || null;
    if (!org) return '';
    const name =
      (typeof org.name === 'string' && org.name.trim()) ||
      (typeof (org as { displayName?: string }).displayName === 'string' &&
        (org as { displayName?: string }).displayName?.trim()) ||
      '';
    return name;
  }, [initialOrganization]);

  const moduleTitle = useMemo(
    () => workspaceName || roomName || 'Social',
    [workspaceName, roomName],
  );
  const screenTitle = useMemo(() => {
    if (currentView === 'machine') return null;
    return titles[currentView] || 'סושיאל';
  }, [currentView]);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const result = await getUnreadUpdatesCount();
        if (result.success && result.count !== undefined) {
          setUnreadCount(result.count);
        }
      } catch {
        // ignore
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const resolvedUser = useMemo(
    () => ({
      name: systemIdentity?.name || initialCurrentUser?.name || moduleTitle,
      role: systemIdentity?.role || initialCurrentUser?.role || null,
      avatarUrl: systemIdentity?.avatarUrl || initialCurrentUser?.avatarUrl || null,
      needsProfileCompletion: Boolean(systemIdentity?.needsProfileCompletion),
    }),
    [
      initialCurrentUser?.avatarUrl,
      initialCurrentUser?.name,
      initialCurrentUser?.role,
      moduleTitle,
      systemIdentity?.avatarUrl,
      systemIdentity?.name,
      systemIdentity?.needsProfileCompletion,
      systemIdentity?.role,
    ]
  );

  const avatarSlot = useMemo(
    () => (
      <Avatar
        src={resolvedUser.avatarUrl || null}
        alt={resolvedUser.name}
        name={resolvedUser.name}
        size="md"
        rounded="full"
        className="border-2 border-white shadow-sm"
      />
    ),
    [resolvedUser.avatarUrl, resolvedUser.name]
  );


  const notificationsSlot = (
    <button
      onClick={() => setIsNotificationCenterOpen(true)}
      className="relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors hover:bg-white/50 text-gray-600"
      aria-label="התראות"
      type="button"
    >
      <Bell size={18} />
      {unreadCount > 0 ? (
        <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );

  type MenuItem = {
    id: string;
    label: string;
    view: string;
    icon: string;
    requiresClient?: boolean;
    isClientSection?: boolean;
  };

  const iconMap = useMemo(() => Icons as unknown as Record<string, LucideIcon>, []);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { id: 'dashboard', label: 'דשבורד', view: 'dashboard', icon: 'Home' },
      { id: 'all-clients', label: 'לקוחות', view: 'all-clients', icon: 'Users' },
      { id: 'calendar', label: 'אירועים', view: 'calendar', icon: 'Calendar' },
      { id: 'inbox', label: 'הודעות', view: 'inbox', icon: 'MessageSquare' },
      { id: 'content-bank', label: 'בנק תכנים', view: 'content-bank', icon: 'Database' },
      { id: 'workspace', label: 'סביבת עבודה', view: 'workspace', icon: 'LayoutGrid', requiresClient: true, isClientSection: true },
      { id: 'machine', label: 'פוסט בקליק ✨', view: 'machine', icon: 'Sparkles', requiresClient: true },
      { id: 'campaigns', label: 'קמפיינים', view: 'campaigns', icon: 'Megaphone', requiresClient: true },
      { id: 'analytics', label: 'אנליטיקה', view: 'analytics', icon: 'BarChart3', requiresClient: true },
      { id: 'collection', label: 'גבייה', view: 'collection', icon: 'Wallet' },
      { id: 'agency-insights', label: 'תובנות', view: 'agency-insights', icon: 'TrendingUp' },
      { id: 'settings', label: 'הגדרות', view: 'settings', icon: 'Settings' },
    ],
    []
  );

  const getRouteForView = (view: string) => {
    const map: Record<string, string> = {
      dashboard: '/dashboard',
      'all-clients': '/clients',
      calendar: '/calendar',
      inbox: '/inbox',
      workspace: '/workspace',
      machine: '/machine',
      campaigns: '/campaigns',
      analytics: '/analytics',
      'content-bank': '/content-bank',
      collection: '/collection',
      'agency-insights': '/agency-insights',
      settings: '/settings',
      profile: '/me',
    };
    return map[view] || '/dashboard';
  };

  const navItems = useMemo(
    () =>
      menuItems.map((item) => {
        const IconComponent = iconMap[item.icon] || Icons.Home;
        const path = getRouteForView(item.view);
        const isFirstClient = item.isClientSection;
        return {
          label: item.label,
          path,
          icon: IconComponent,
          ...(isFirstClient
            ? {
                separatorBefore: true,
                sectionLabel: activeClient
                  ? `לקוח: ${String((activeClient as unknown as { companyName?: string; name?: string })?.companyName || (activeClient as unknown as { companyName?: string; name?: string })?.name || 'נבחר')}`
                  : 'סביבת לקוח',
                sectionContainerClass:
                  'bg-gradient-to-br from-purple-50/70 to-violet-50/40 border border-purple-100/60 rounded-2xl p-2 my-1',
              }
            : {}),
        };
      }),
    [iconMap, menuItems, activeClient]
  );

  const primaryNavPaths = useMemo(
    () => [
      '/dashboard', '/clients', '/calendar', '/inbox', '/content-bank',
      '/workspace', '/machine', '/campaigns', '/analytics',
    ],
    []
  );

  const isActiveAction = (path: string) => {
    const full = `${basePath}${path}`;
    return (pathname || '') === full || (pathname || '').startsWith(`${full}/`);
  };

  const onNavigateAction = (path: string) => {
    router.push(`${basePath}${path}`);
  };

  const handlePlusClick = () => {
    // Contextual Plus Action based on current view
    const actions: Record<string, () => void> = {
      'all-clients': () => setIsAddClientModalOpen(true),
      'campaigns': () => {
        if (!activeClient) { openComingSoon(); return; }
        setIsCampaignWizardOpen(true);
      },
      'machine': () => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('social:machine:new'));
        }
      },
    };

    const action = actions[currentView];
    if (action) {
      action();
    } else {
      // Default fallback to machine
      navigate('/machine');
    }
  };

  const isPlusActive = useMemo(() => {
    if (currentView === 'machine') return true;
    if (currentView === 'all-clients' && isAddClientModalOpen) return true;
    if (currentView === 'campaigns' && isCampaignWizardOpen) return true;
    return false;
  }, [currentView, isAddClientModalOpen, isCampaignWizardOpen]);

  return (
    <>
      <div className="flex h-screen w-full bg-[#f8fafc] text-gray-900 overflow-hidden relative" dir="rtl">
        <ModuleBackground moduleKey="social" />
        {/* Grain Overlay for Cinematic Feel */}
        <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <SharedSidebar
          isOpen={isSidebarOpen}
          onSetOpenAction={setIsSidebarOpen}
          brand={{
            name: initialOrganization?.name || 'Workspace',
            logoUrl: initialOrganization?.logo || null,
            fallbackIcon: <OSModuleSquircleIcon moduleKey="social" boxSize={40} iconSize={18} className="shadow-none" />,
            badgeModuleKey: 'social',
          }}
          brandSubtitle={moduleTitle}
          onBrandClickAction={() => onNavigateAction('/dashboard')}
          topSlot={
            <div className="flex flex-col gap-2">
              <BusinessSwitcher currentTenantName={initialOrganization?.name || moduleTitle} />
              <WorkspaceSwitcher className="w-full" />
            </div>
          }
          navItems={navItems}
          primaryNavPaths={primaryNavPaths}
          isActiveAction={isActiveAction}
          onNavigateAction={onNavigateAction}
          bottomSlot={
            <div className="space-y-3">
              <AttendanceMiniStatus />
              <OSAppSwitcher
                compact={true}
                buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
                buttonLabel="מודולים"
                className={isSidebarOpen ? '' : 'w-full flex justify-center'}
                orgSlug={orgSlug}
                currentModule="social"
              />
            </div>
          }
        />

        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <SharedHeader
            title={moduleTitle}
            subtitle={screenTitle}
            currentDate={currentDate || ' '}
            mobileBrand={{
              name: moduleTitle,
              logoUrl: initialOrganization?.logo || null,
              fallbackIcon: <OSModuleSquircleIcon moduleKey="social" boxSize={32} iconSize={16} className="shadow-none" />,
              badgeModuleKey: 'social',
            }}
            mobileLeadingSlot={undefined}
            onOpenCommandPaletteAction={() => setIsCommandPaletteOpen(true)}
            onOpenSupportAction={() => setIsHelpModalOpen(true)}
            actionsSlot={<ModuleHelpVideos moduleKey="social" />}
            switcherSlot={<WorkspaceSwitcher />}
            notificationsSlot={notificationsSlot}
            user={{ name: resolvedUser.name, role: resolvedUser.role }}
            onProfileClickAction={undefined}
            profileHref={joinPath(basePath, `/me`)}
            userAvatarSlot={avatarSlot}
            profileSlot={undefined}
            className="bg-transparent"
          />

          <div id="main-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-32 w-full relative">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
        </main>
      </div>

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
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50" />
                <div className="space-y-6">
                  {/* Grid Section */}
                  <div className="bg-slate-50/80 rounded-[2.5rem] p-6 border border-slate-100 relative overflow-hidden">
                    <div className="grid grid-cols-4 gap-y-6 relative z-10">
                      {menuItems.filter(i => !i.isClientSection && !['machine', 'campaigns', 'analytics'].includes(i.id)).map((item) => {
                        const isActiveItem = currentView === item.view;
                        const IconComponent = iconMap[item.icon] || Icons.Home;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => { onNavigateAction(getRouteForView(item.view)); setIsMobileMenuOpen(false); }}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all duration-300 ${
                              isActiveItem
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-105'
                                : 'bg-white text-slate-600 border border-slate-100 shadow-sm'
                            }`}>
                              <IconComponent size={24} strokeWidth={isActiveItem ? 2.5 : 2} className={isActiveItem ? 'text-white' : 'text-slate-600'} />
                            </div>
                            <span className={`text-[10px] font-black text-center leading-tight ${isActiveItem ? 'text-slate-900' : 'text-slate-500'}`}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Client Section (Glassmorphism) */}
                  <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 rounded-[2.5rem] p-6 border border-purple-100/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                    
                    <div className="grid grid-cols-4 gap-y-6 relative z-10">
                      {menuItems.filter(i => i.isClientSection || ['machine','campaigns','analytics'].includes(i.id)).map((item) => {
                        const isActiveItem = currentView === item.view;
                        const IconComponent = iconMap[item.icon] || Icons.Home;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              if (item.requiresClient && !activeClient) { openComingSoon(); return; }
                              onNavigateAction(getRouteForView(item.view)); setIsMobileMenuOpen(false);
                            }}
                            className="flex flex-col items-center gap-2"
                          >
                            <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all duration-300 ${
                              isActiveItem
                                ? 'bg-purple-600 text-white shadow-xl shadow-purple-200 scale-105'
                                : 'bg-white/80 text-purple-700 border border-purple-100/50 backdrop-blur-md shadow-sm'
                            }`}>
                              <IconComponent size={24} strokeWidth={isActiveItem ? 2.5 : 2} className={isActiveItem ? 'text-white' : 'text-purple-700'} />
                            </div>
                            <span className={`text-[10px] font-black text-center leading-tight ${isActiveItem ? 'text-purple-900' : 'text-slate-500'}`}>
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modules Section */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right mb-4 px-2">מודולים</div>
                    <div className="px-2">
                      <OSAppSwitcher mode="inlineGrid" compact={true} orgSlug={orgSlug} currentModule="social" />
                    </div>
                  </div>
                </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {currentView !== 'machine' && (
        <MobileBottomNav
          rightItems={[
            {
              id: 'dashboard',
              label: 'דשבורד',
              icon: Home,
              active: isActive('/dashboard'),
              onClick: () => navigate('/dashboard'),
            },
            {
              id: 'clients',
              label: 'לקוחות',
              icon: Users,
              active: isActive('/clients'),
              onClick: () => navigate('/clients'),
            },
          ]}
          leftItems={[
            {
              id: 'calendar',
              label: 'אירועים',
              icon: Calendar,
              active: isActive('/calendar'),
              onClick: () => navigate('/calendar'),
            },
            {
              id: 'menu',
              label: 'תפריט',
              icon: SquareMousePointer,
              active: isMobileMenuOpen,
              onClick: () => setIsMobileMenuOpen(true),
            },
          ]}
          onPlusClickAction={handlePlusClick}
          plusAriaLabel="יצירת פוסט"
          plusActive={isPlusActive}
          plusGradient={getOSModule('social')?.gradient}
        />
      )}

      <ToastContainer />
      {isCommandPaletteOpen && <CommandPalette />}
      {isNotificationCenterOpen && <NotificationCenter />}
      {isAddClientModalOpen && <AddClientModal />}
      {isInviteModalOpen && <InviteClientModal />}
      {isPaymentModalOpen && <PaymentLinkModal />}
      {isTaskModalOpen && <TaskModal />}
      {isCampaignWizardOpen && <CampaignWizard />}
      {isReportModalOpen && <ReportModal />}
      {isHelpModalOpen && <HelpModal />}
      {isTourActive && <OnboardingTour isOpen={isTourActive} onClose={() => setIsTourActive(false)} />}
      <AnimatePresence>{isOnboardingMode ? <ClientOnboardingPortal /> : null}</AnimatePresence>
    </>
  );
}
