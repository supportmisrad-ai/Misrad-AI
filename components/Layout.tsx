'use client';

import React, { useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Task, Notification } from '../types';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from './CommandPalette';
import { useData } from '../context/DataContext';
import { getNexusBasePath, toNexusPath, getWorkspaceOrgSlugFromPathname, useNexusSoloMode } from '@/lib/os/nexus-routing';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { listNexusTasks } from '@/app/actions/nexus';
import { ToastContainer } from './ToastContainer';
import { TutorialOverlay } from './TutorialOverlay';
import { ShabbatScreen } from './ShabbatScreen';
import { useShabbat } from '../hooks/useShabbat';
import confetti from 'canvas-confetti';
import { requestNotificationPermission, showUrgentLeaveRequestNotification } from '../lib/push-notifications';
import { DynamicFavicon } from './DynamicFavicon';
// Import new layout components
import { MemoSidebar } from './layout/Sidebar';
import { MemoHeader } from './layout/Header';
import { LayoutModals } from './layout/LayoutModals';
import { MobileMenu } from './layout/MobileMenu';
import { NAV_ITEMS } from './layout/layout.types';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { ModuleBackground } from '@/components/shared/ModuleBackground';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const basePath: string = getNexusBasePath(pathname);
  const moduleDef = useMemo(() => getModuleDefinition('nexus'), []);
  const location = useMemo(() => ({ pathname: pathname || '/' }), [pathname]);
  const mainScrollRef = useRef<HTMLElement>(null);
  const { showMorningBrief, setShowMorningBrief, notifications, lastDeletedTask, undoDelete, currentUser, users, isCreateTaskOpen, openCreateTask, closeCreateTask, incomingCall, dismissCall, toasts, removeToast, openedTaskId, closeTask, tasks, hasPermission, setCommandPaletteOpen, isCommandPaletteOpen, organization, taskToComplete, isSupportModalOpen, openSupport, activeCelebration, startTutorial, leads } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const urgentLeavePushShownRef = useRef<Set<string>>(new Set());
  
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('טוען...');
  const [isMounted, setIsMounted] = useState(false);
  const orgSlug = useMemo(() => getWorkspaceOrgSlugFromPathname(pathname || ''), [pathname]);
  const { isSoloMode } = useNexusSoloMode(orgSlug, Array.isArray(users) ? users.length : null);

  const { identity: workspaceSystemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: currentUser?.name ?? null,
    role: currentUser?.role ?? null,
    avatarUrl: currentUser?.avatar ?? null,
  });

  const navigate = useCallback(
    (path: string) => {
      const raw = String(path || '/');
      const [rawPath, rawQuery] = raw.split('?');
      const query = new URLSearchParams(rawQuery || '');

      const from = pathname || toNexusPath(basePath, '/');

      // Normalize Nexus profile/settings navigation so the unified hub can provide
      // correct back behavior without changing every call site.
      if (rawPath === '/settings') {
        if (!query.has('origin')) query.set('origin', 'nexus');
        if (!query.has('drawer')) query.set('drawer', 'ai');
        if (!query.has('from')) query.set('from', from);
      }

      const finalPath = query.toString() ? `${rawPath}?${query.toString()}` : rawPath;

      if (finalPath === '/operations') {
        const workspaceOrgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (workspaceOrgSlug) {
          router.push(`/w/${encodeURIComponent(workspaceOrgSlug)}/operations`);
          return;
        }
      }

      const target = toNexusPath(basePath, finalPath);
      router.push(target);
    },
    [basePath, pathname, router]
  );

  const allowMorningBrief = useMemo(() => {
    // Only on Nexus home dashboard
    return location.pathname === toNexusPath(basePath, '/');
  }, [basePath, location.pathname]);

  useEffect(() => {
    if (!allowMorningBrief && showMorningBrief) {
      setShowMorningBrief(false);
    }
  }, [allowMorningBrief, showMorningBrief, setShowMorningBrief]);
  
  // Check Shabbat status
  const { isShabbat, isLoading: shabbatLoading } = useShabbat();
  const isShabbatProtected = 'isShabbatProtected' in (organization || {}) ? (organization as { isShabbatProtected?: boolean }).isShabbatProtected !== false : true;
  
  // Set current date on client side only to avoid hydration mismatch
  useEffect(() => {
      setIsMounted(true);
      setCurrentDate(new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  // Lightweight client navigation timing for internal Nexus route changes
  const isFirstNavRef = useRef(true);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return;

    // Skip the initial page load — it includes full bootstrap time and is not a navigation
    if (isFirstNavRef.current) {
      isFirstNavRef.current = false;
      return;
    }

    const startMark = 'nexus_nav_start';
    const endMark = 'nexus_nav_end';
    const measureName = 'nexus_nav';

    try {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    } catch {
      // ignore
    }

    performance.mark(startMark);

    // Wait a couple frames so React commit + paint are more likely to have happened
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        performance.mark(endMark);
        try {
          performance.measure(measureName, startMark, endMark);
          const entries = performance.getEntriesByName(measureName);
          const last = entries[entries.length - 1];
          if (last) {
            console.log(`[Nexus] client navigation: ${Math.round(last.duration)}ms`, { pathname: pathname || '/' });
          }
        } catch {
          // ignore
        }
      });
    });
  }, [pathname]);

  // Listen for event to close all screens menu (from SettingsView)
  useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const handleCloseAllScreensMenu = () => {
          setIsMobileMenuOpen(false);
      };
      
      window.addEventListener('closeAllScreensMenu', handleCloseAllScreensMenu);
      return () => {
          if (typeof window !== 'undefined') {
              window.removeEventListener('closeAllScreensMenu', handleCloseAllScreensMenu);
          }
      };
  }, []);

  useEffect(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !currentUser?.id) return;

      // Ask once per session; actual polling happens in useNotifications (DataContext)
      requestNotificationPermission();
  }, [currentUser?.id]);

  useEffect(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !currentUser?.id) return;
      if (!Array.isArray(notifications) || notifications.length === 0) return;

      notifications.forEach((notif) => {
          if (notif.serverType !== 'leave_request') return;
          const metadata = notif.metadata as Record<string, unknown> | undefined;
          if (!metadata) return;

          if (!metadata.isUrgent) return;
          if (!metadata.requiresPushNotification) return;
          if (notif.read) return;

          const key = String(notif.id);
          if (urgentLeavePushShownRef.current.has(key)) return;
          urgentLeavePushShownRef.current.add(key);

          showUrgentLeaveRequestNotification(
              typeof metadata.employeeName === 'string' ? metadata.employeeName : 'עובד',
              typeof metadata.leaveType === 'string' ? metadata.leaveType : 'other',
              typeof metadata.startDate === 'string' ? metadata.startDate : '',
              typeof metadata.endDate === 'string' ? metadata.endDate : ''
          );
      });
  }, [currentUser?.id, notifications]);

  // Celebration Effect
  useEffect(() => {
      if (activeCelebration) {
          const duration = 3 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: ReturnType<typeof setInterval> = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }, 250);

          return () => {
            clearInterval(interval);
            // confetti cleanup handled automatically
          };
      }
  }, [activeCelebration]);

  // Keyboard shortcuts
  useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const handleKeyDown = (e: KeyboardEvent) => {
          // Check for Ctrl+Shift+A (or Cmd+Shift+A on Mac) - Admin panel
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a' && !window.location.pathname.startsWith('/w/')) {
              // Only allow if user is super admin
              if (currentUser?.isSuperAdmin) {
                  e.preventDefault();
                  const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
                  if (orgSlug) {
                    const returnTo = `${window.location.pathname}${window.location.search || ''}`;
                    router.push(`/app/admin?returnTo=${encodeURIComponent(returnTo)}`);
                  }
              }
          }
          // Check for Cmd+K (or Ctrl+K) - Command Palette
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
              e.preventDefault();
              setCommandPaletteOpen(true);
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [currentUser?.isSuperAdmin, router, setCommandPaletteOpen]);

  const isActive = useCallback(
    (path: string) => {
      if (path === '/operations') {
        if (!orgSlug) return false;
        return location.pathname === `/w/${encodeURIComponent(orgSlug)}/operations`;
      }
      return location.pathname === toNexusPath(basePath, path);
    },
    [basePath, location.pathname, orgSlug]
  );
  
  // Filter notifications for current user only
  const hasUnread = notifications
    .filter((n: Notification) => n.recipientId === 'all' || n.recipientId === currentUser.id)
    .some((n: Notification) => !n.read);

  const headerCurrentUser = useMemo(() => {
    const base = (currentUser || { name: 'משתמש', role: '' }) as unknown as Record<string, unknown>;
    return {
      ...base,
      name: String(workspaceSystemIdentity?.name || base.name || 'משתמש'),
      role: String(workspaceSystemIdentity?.role || base.role || ''),
      avatar: String(workspaceSystemIdentity?.avatarUrl || base.avatar || ''),
    };
  }, [currentUser, workspaceSystemIdentity?.avatarUrl, workspaceSystemIdentity?.name, workspaceSystemIdentity?.role]);

  const togglePlusMenu = () => { setIsMobileMenuOpen(false); setIsPlusMenuOpen(!isPlusMenuOpen); };
  const toggleMobileMenu = () => { setIsPlusMenuOpen(false); setIsMobileMenuOpen(!isMobileMenuOpen); };
  const handleVoiceClick = () => {
    setIsPlusMenuOpen(false);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus:open-voice-recorder'));
      }
    } catch {
      // ignore
    }
  };
  const handleTaskClick = () => { setIsPlusMenuOpen(false); openCreateTask(); };
  const handleNavClick = useCallback(
    (path: string) => {
      setIsMobileMenuOpen(false);
      navigate(path);
    },
    [navigate]
  );

  // Get task from tasks array, or fetch from API if not found
  const [currentOpenedTask, setCurrentOpenedTask] = useState<Task | null>(null);
  const [isFetchingTask, setIsFetchingTask] = useState(false);
  const fetchedTaskIdRef = useRef<string | null>(null);
  
  // Update currentOpenedTask when tasks array changes (if task is already opened)
  useEffect(() => {
    if (openedTaskId && !isFetchingTask) {
      const foundTask = tasks.find((t: Task) => t.id === openedTaskId);
      if (foundTask) {
        setCurrentOpenedTask(foundTask);
      }
    }
  }, [tasks, openedTaskId, isFetchingTask]);
  
  useEffect(() => {
    if (!openedTaskId) {
      setCurrentOpenedTask(null);
      setIsFetchingTask(false);
      fetchedTaskIdRef.current = null;
      return;
    }
    
    // Don't refetch if we already fetched this task
    if (fetchedTaskIdRef.current === openedTaskId) {
      return;
    }
    
    // First try to find in local tasks array
    const foundTask = tasks.find((t: Task) => t.id === openedTaskId);
    if (foundTask) {
      setCurrentOpenedTask(foundTask);
      fetchedTaskIdRef.current = openedTaskId;
      return;
    }
    
    // If not found, fetch from API (only once per task)
    setIsFetchingTask(true);
    
    {
      const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
      (async () => {
        try {
          if (!orgSlug) {
            throw new Error('Missing orgSlug');
          }
          const res = await listNexusTasks({ orgId: orgSlug, taskId: openedTaskId });
          const task = Array.isArray(res?.tasks) ? res.tasks[0] : null;
          if (task) {
            setCurrentOpenedTask(task);
            fetchedTaskIdRef.current = openedTaskId;
          } else {
            setCurrentOpenedTask(null);
          }
        } catch (err) {
          console.error('[Layout] Error fetching task:', err);
          setCurrentOpenedTask(null);
        } finally {
          setIsFetchingTask(false);
        }
      })();
    }
  }, [openedTaskId]); // Only depend on openedTaskId to prevent loops

  // IMPORTANT: Filter Nav Items based on Permissions AND Enabled Modules AND System Flags
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
        // Super admins bypass solo mode and see /team always
        if (isSoloMode && item.path === '/team' && !isSuperAdmin) return false;

        // 0. Check System Flags (Global Override)
        if (item.screenId) {
            const flag = organization.systemFlags?.[item.screenId];
            if (flag === 'hidden' && !isSuperAdmin) return false;
        }

        // 1. Check Module Availability (Tenant Feature Flag) — super admins see all
        if (item.moduleId && !organization.enabledModules.includes(item.moduleId) && !isSuperAdmin) {
            return false;
        }

        // 2. Check User Role Permissions — super admins bypass
        if (isSuperAdmin) return true;
        switch (item.path) {
            case '/team': return hasPermission('manage_team');
            case '/reports': return true;
            case '/clients': return hasPermission('view_crm');
            case '/assets': return hasPermission('view_assets');
            case '/settings': return true;
            case '/trash': return true; 
            default: return true; 
        }
    });
  }, [hasPermission, organization.enabledModules, organization.systemFlags, isSoloMode, isSuperAdmin]);

  // Allow opening Voice Recorder from any main-content component without prop drilling.
  // Trigger: window.dispatchEvent(new CustomEvent('nexus:open-voice-recorder'))
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setIsVoiceRecorderOpen(true);
    };

    window.addEventListener('nexus:open-voice-recorder', handler as EventListener);
    return () => {
      window.removeEventListener('nexus:open-voice-recorder', handler as EventListener);
    };
  }, []);

  // Reset scroll position when navigating to a new page
  useLayoutEffect(() => {
    // Reset immediately before render using ref
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Also reset after animation completes (double check)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
      }
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    }, 200); // After animation duration

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  // Command Palette handlers
  const commandPaletteNavItems = useMemo(
    () =>
      filteredNavItems.map((item) => ({
        id: item.path,
        label: item.label,
        icon: item.icon,
      })),
    [filteredNavItems]
  );

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  const handleSelectLead = (lead: unknown) => {
    navigate('/leads');
    // Optionally, you could open a lead detail modal here
  };

  // If it's Shabbat, show Shabbat screen instead of normal layout.
  // IMPORTANT: must be placed after all hooks to avoid hook order mismatches.
  if (!shabbatLoading && isShabbat && isShabbatProtected) {
    return <ShabbatScreen />;
  }

  const moduleStyle = useMemo(
    () =>
      ({
        '--os-accent': moduleDef.theme.accent,
        '--os-bg': moduleDef.theme.background,
      }) as React.CSSProperties,
    [moduleDef]
  );

  return (
    <div
      style={moduleStyle}
      data-module={moduleDef.key}
      className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 font-sans overflow-hidden relative"
      dir="rtl"
    >
      {isMounted && <DynamicFavicon />}
      {isMounted && <TutorialOverlay />}
      {isMounted && (
        <CommandPalette 
          isOpen={isCommandPaletteOpen || false}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={handleNavigate}
          onSelectLead={handleSelectLead}
          leads={[]}
          navItems={commandPaletteNavItems}
          moduleKey={moduleDef.key}
          hideLeads
          hideAssets
        />
      )}
      {isMounted && <ToastContainer toasts={toasts} removeToast={removeToast} />}
      
      <ModuleBackground moduleKey="nexus" />

      {isMounted && (
        <LayoutModals
          showMorningBrief={showMorningBrief}
          allowMorningBrief={allowMorningBrief}
          isVoiceRecorderOpen={isVoiceRecorderOpen}
          setIsVoiceRecorderOpen={setIsVoiceRecorderOpen}
          isCreateTaskOpen={isCreateTaskOpen}
          closeCreateTask={closeCreateTask}
          taskToComplete={taskToComplete}
          isSupportModalOpen={isSupportModalOpen}
          currentOpenedTask={currentOpenedTask}
          openedTaskId={openedTaskId}
          tasks={tasks}
          closeTask={closeTask}
          incomingCall={incomingCall}
          dismissCall={dismissCall}
          navigate={navigate}
          lastDeletedTask={lastDeletedTask}
          undoDelete={undoDelete}
        />
      )}

      <MemoSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        organization={organization}
        hasPermission={hasPermission}
        filteredNavItems={filteredNavItems}
        isActive={isActive}
        navigate={navigate}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <MemoHeader
          location={location}
          currentDate={currentDate}
          organization={organization}
          currentUser={headerCurrentUser}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          hasUnread={hasUnread}
          setCommandPaletteOpen={setCommandPaletteOpen}
          navigate={navigate}
          openSupport={openSupport}
        />

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 min-h-0 touch-pan-y" id="main-scroll-container" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col min-h-0 pb-36 md:pb-0">
            {children}
          </div>
        </main>

        {isMounted && (
          <MobileMenu
            isPlusMenuOpen={isPlusMenuOpen}
            setIsPlusMenuOpen={setIsPlusMenuOpen}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            handleVoiceClick={handleVoiceClick}
            handleTaskClick={handleTaskClick}
            handleNavClick={handleNavClick}
            togglePlusMenu={togglePlusMenu}
            toggleMobileMenu={toggleMobileMenu}
            filteredNavItems={filteredNavItems}
            isActive={isActive}
            hasPermission={hasPermission}
            organization={organization}
            allowMorningBrief={allowMorningBrief}
            setShowMorningBrief={setShowMorningBrief}
            openSupport={openSupport}
            startTutorial={startTutorial}
            navigate={navigate}
            plusGradient="from-slate-900 to-slate-700"
          />
        )}
      </main>
    </div>
  );
};
