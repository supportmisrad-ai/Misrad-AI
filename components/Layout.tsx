'use client';

import React, { useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Task, Notification } from '../types';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import CommandPalette from './CommandPalette';
import { useData } from '../context/DataContext';
import { getNexusBasePath, toNexusPath, getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import { getModuleDefinition } from '@/lib/os/modules/registry';
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

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const basePath: string = getNexusBasePath(pathname);
  const moduleDef = useMemo(() => getModuleDefinition('nexus'), []);
  const location = useMemo(() => ({ pathname: pathname || '/' }) as any, [pathname]);
  const navigate = useCallback(
    (path: string) => {
      const target = toNexusPath(basePath, path);
      router.push(target);
    },
    [basePath, router]
  );
  const mainScrollRef = useRef<HTMLElement>(null);
  const { showMorningBrief, setShowMorningBrief, notifications, lastDeletedTask, undoDelete, currentUser, isCreateTaskOpen, openCreateTask, closeCreateTask, incomingCall, dismissCall, toasts, removeToast, openedTaskId, closeTask, tasks, hasPermission, setCommandPaletteOpen, isCommandPaletteOpen, organization, taskToComplete, isSupportModalOpen, openSupport, activeCelebration, startTutorial, leads } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const notificationsInFlightRef = useRef(false);
  const notificationsFailureCountRef = useRef(0);
  
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('טוען...');
  const [isMounted, setIsMounted] = useState(false);
  
  // Check Shabbat status
  const { isShabbat, isLoading: shabbatLoading } = useShabbat();
  
  // Set current date on client side only to avoid hydration mismatch
  useEffect(() => {
      setIsMounted(true);
      setCurrentDate(new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  // Lightweight client navigation timing for internal Nexus route changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return;

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

  // Request notification permission and load notifications from DB
  useEffect(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !currentUser?.id) return;

      // If the API is failing repeatedly, stop polling to avoid spamming Vercel.
      if (notificationsFailureCountRef.current >= 3) return;

      // Request notification permission
      requestNotificationPermission();

      // Load notifications from database
      const controller = new AbortController();
      const loadNotifications = async () => {
          if (controller.signal.aborted) return;
          if (notificationsInFlightRef.current) return;
          notificationsInFlightRef.current = true;
          try {
              const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
              const response = await fetch('/api/notifications', {
                signal: controller.signal,
                headers: orgId ? { 'x-org-id': orgId } : undefined,
              });
              if (response.ok) {
                  const data = await response.json();
                  const userNotifications = data.notifications || [];
                  notificationsFailureCountRef.current = 0;
                  
                  // Check for urgent leave requests and show push notification
                  userNotifications.forEach((notif: any) => {
                      if (notif.type === 'leave_request' && 
                          notif.metadata?.isUrgent && 
                          notif.metadata?.requiresPushNotification &&
                          !notif.is_read) {
                          const metadata = notif.metadata;
                          showUrgentLeaveRequestNotification(
                              metadata.employeeName || 'עובד',
                              metadata.leaveType || 'other',
                              metadata.startDate || '',
                              metadata.endDate || ''
                          );
                      }
                  });
              }
          } catch (error: any) {
              if (controller.signal.aborted) return;
              if (error?.name === 'AbortError') return;
              if (String(error?.message || '').toLowerCase().includes('aborted')) return;
              // Silently handle network errors - don't spam console
              if (error?.name !== 'TypeError' || !error?.message?.includes('fetch')) {
              console.error('[Layout] Error loading notifications:', error);
              }
              notificationsFailureCountRef.current += 1;
          }
          finally {
              notificationsInFlightRef.current = false;
          }
      };

      loadNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => {
        try {
          controller.abort();
        } catch {
          // ignore
        }
        clearInterval(interval);
      };
  }, [currentUser?.id]);

  // Celebration Effect
  useEffect(() => {
      if (activeCelebration) {
          const duration = 3 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function() {
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
            try {
              (confetti as any).reset?.();
            } catch {
              // ignore
            }
          };
      }
  }, [activeCelebration]);

  // Keyboard shortcuts
  useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const handleKeyDown = (e: KeyboardEvent) => {
          // Check for Ctrl+Shift+A (or Cmd+Shift+A on Mac) - Admin panel
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
              // Only allow if user is super admin
              if (currentUser?.isSuperAdmin) {
                  e.preventDefault();
                  const orgSlug = getWorkspaceOrgIdFromPathname(window.location.pathname);
                  if (orgSlug) {
                    const returnTo = `${window.location.pathname}${window.location.search || ''}`;
                    try {
                      sessionStorage.setItem('saas_admin_return_to', returnTo);
                    } catch {
                      // ignore
                    }
                    router.push(`/w/${encodeURIComponent(orgSlug)}/admin?returnTo=${encodeURIComponent(returnTo)}`);
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

  const isActive = (path: string) => location.pathname === toNexusPath(basePath, path);
  
  // Filter notifications for current user only
  const hasUnread = notifications
    .filter((n: Notification) => n.recipientId === 'all' || n.recipientId === currentUser.id)
    .some((n: Notification) => !n.read);

  const togglePlusMenu = () => { setIsMobileMenuOpen(false); setIsPlusMenuOpen(!isPlusMenuOpen); };
  const toggleMobileMenu = () => { setIsPlusMenuOpen(false); setIsMobileMenuOpen(!isMobileMenuOpen); };
  const handleVoiceClick = () => { setIsPlusMenuOpen(false); setIsVoiceRecorderOpen(true); };
  const handleTaskClick = () => { setIsPlusMenuOpen(false); openCreateTask(); };
  const handleNavClick = (path: string) => { setIsMobileMenuOpen(false); navigate(path); };

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
      const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
      fetch(`/api/tasks?id=${openedTaskId}`, {
        headers: orgId ? { 'x-org-id': orgId } : undefined,
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(task => {
        if (task && !task.error) {
          setCurrentOpenedTask(task);
          fetchedTaskIdRef.current = openedTaskId;
        } else {
          console.error('[Layout] Failed to fetch task:', task);
          setCurrentOpenedTask(null);
        }
      })
      .catch(err => {
        console.error('[Layout] Error fetching task:', err);
        setCurrentOpenedTask(null);
      })
      .finally(() => {
        setIsFetchingTask(false);
      });
    }
  }, [openedTaskId]); // Only depend on openedTaskId to prevent loops

  // IMPORTANT: Filter Nav Items based on Permissions AND Enabled Modules AND System Flags
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
        // 0. Check System Flags (Global Override)
        if (item.screenId) {
            const flag = organization.systemFlags?.[item.screenId];
            if (flag === 'hidden') return false; // Hide completely
        }

        // 1. Check Module Availability (Tenant Feature Flag)
        if (item.moduleId && !organization.enabledModules.includes(item.moduleId)) {
            return false;
        }

        // 2. Check User Role Permissions
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
  }, [hasPermission, organization.enabledModules, organization.systemFlags]);

  // Allow opening Voice Recorder from any main-content component without prop drilling.
  // Trigger: window.dispatchEvent(new CustomEvent('nexus:open-voice-recorder'))
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setIsVoiceRecorderOpen(true);
    };

    window.addEventListener('nexus:open-voice-recorder', handler as any);
    return () => {
      window.removeEventListener('nexus:open-voice-recorder', handler as any);
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
  const handleNavigate = (tabId: string) => {
    const routeMap: Record<string, string> = {
      'dashboard': '/',
      'leads': '/leads',
      'clients': '/clients',
      'tasks': '/tasks',
      'assets': '/assets',
      'favorites': '/favorites',
      'support': '/support',
      'settings': '/settings',
    };
    const route = routeMap[tabId] || '/';
    navigate(route);
  };

  const handleSelectLead = (lead: any) => {
    navigate('/leads');
    // Optionally, you could open a lead detail modal here
  };

  // If it's Shabbat, show Shabbat screen instead of normal layout.
  // IMPORTANT: must be placed after all hooks to avoid hook order mismatches.
  if (!shabbatLoading && isShabbat) {
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
          leads={leads || []}
        />
      )}
      {isMounted && <ToastContainer toasts={toasts} removeToast={removeToast} />}
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] animate-blob mix-blend-multiply filter"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply filter"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-pink-200/40 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply filter"></div>
      </div>

      {isMounted && (
        <LayoutModals
          showMorningBrief={showMorningBrief}
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

      {isMounted ? (
        <MemoSidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          organization={organization}
          hasPermission={hasPermission}
          filteredNavItems={filteredNavItems}
          isActive={isActive}
          navigate={navigate}
        />
      ) : (
        <div className="hidden md:flex w-80 p-4 z-30 h-screen relative" aria-hidden />
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <MemoHeader
          location={location}
          currentDate={currentDate}
          organization={organization}
          currentUser={currentUser}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          hasUnread={hasUnread}
          setCommandPaletteOpen={setCommandPaletteOpen}
          navigate={navigate}
          openSupport={openSupport}
        />

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 min-h-0 touch-pan-y" id="main-scroll-container" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col min-h-0 pb-16 md:pb-0">
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
            setShowMorningBrief={setShowMorningBrief}
            openSupport={openSupport}
            startTutorial={startTutorial}
            navigate={navigate}
          />
        )}
      </main>
    </div>
  );
};
