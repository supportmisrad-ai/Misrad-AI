'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { getUnreadUpdatesCount } from '@/app/actions/updates';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { getSocialBasePath, joinPath, parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { Skeleton } from '@/components/ui/skeletons';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import type { OSModuleKey } from '@/lib/os/modules/types';

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
  'agency-insights': 'תובנות',
  'admin-panel': 'ניהול מערכת',
};

// Map pathname to view name
const getViewFromPath = (pathname: string): string => {
  const base = getSocialBasePath(pathname);
  if (pathname === base) return 'dashboard';
  const sub = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  const map: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/clients': 'all-clients',
    '/calendar': 'calendar',
    '/inbox': 'inbox',
    '/workspace': 'workspace',
    '/machine': 'machine',
    '/campaigns': 'campaigns',
    '/analytics': 'analytics',
    '/team': 'team',
    '/collection': 'collection',
    '/agency-insights': 'agency-insights',
    '/admin': 'admin-panel',
    '/settings': 'settings',
    '/me': 'profile',
  };
  return map[sub] || 'dashboard';
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const currentView = getViewFromPath(pathname);
  const { activeClient, setIsCommandPaletteOpen, setIsNotificationCenterOpen, setIsHelpModalOpen } = useApp();
  const { isLoaded, isSignedIn, user } = useUser();
  const [hasMounted, setHasMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const { title, roomName, gradient } = useRoomBranding();
  const workspaceInfo = parseWorkspaceRoute(pathname);
  const isWorkspaceSocial = Boolean(workspaceInfo.orgSlug && workspaceInfo.module === 'social');
  const basePath = getSocialBasePath(pathname);
  const [isScrolled, setIsScrolled] = useState(false);

  const unreadPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadInFlightRef = useRef(false);
  const unreadFailureCountRef = useRef(0);

  const { identity: systemIdentity } = useWorkspaceSystemIdentity(workspaceInfo.orgSlug || null, {
    name: user?.fullName ?? user?.username ?? null,
    role: null,
    avatarUrl: user?.imageUrl ?? null,
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const el = document.getElementById('main-scroll-container');
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
  }, [title]);

  // Sync profile image with user.imageUrl from Clerk (which syncs with Google)
  useEffect(() => {
    if (user?.imageUrl) {
      setProfileImageUrl(user.imageUrl);
    } else {
      setProfileImageUrl(null);
    }
  }, [user?.imageUrl]);

  const loadUnreadCount = useCallback(async () => {
    if (!isSignedIn) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (unreadInFlightRef.current) return;
    unreadInFlightRef.current = true;

    try {
      const result = await getUnreadUpdatesCount();
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count);
      }
      unreadFailureCountRef.current = 0;
    } catch (error: unknown) {
      unreadFailureCountRef.current += 1;
      // Silently handle network errors (common during dev server restarts)
      // Only log if it's not a network/fetch error
      if (error instanceof Error && error.message && !error.message.includes('Failed to fetch') && !error.message.includes('fetch')) {
        console.error('Error loading unread count:', error);
      }
      // Keep current count on error, don't reset to 0
    } finally {
      unreadInFlightRef.current = false;
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;

    const clearScheduled = () => {
      if (unreadPollTimeoutRef.current) {
        clearTimeout(unreadPollTimeoutRef.current);
        unreadPollTimeoutRef.current = null;
      }
    };

    const computeDelayMs = () => {
      const base = 5 * 60 * 1000;
      const backoff = Math.min(30 * 60 * 1000, base * Math.pow(2, unreadFailureCountRef.current));
      return Math.max(base, backoff);
    };

    const scheduleNext = (delayMs: number) => {
      clearScheduled();
      unreadPollTimeoutRef.current = setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const tick = async () => {
      if (cancelled) return;

      await loadUnreadCount();
      if (cancelled) return;

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        scheduleNext(60_000);
        return;
      }

      scheduleNext(computeDelayMs());
    };

    void tick();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        unreadFailureCountRef.current = 0;
        void tick();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      clearScheduled();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [isSignedIn, loadUnreadCount]);

  const currentDate = useMemo(() => {
    if (!hasMounted) return '';
    try {
      return new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  }, [hasMounted]);

  const headerClassName = isScrolled
    ? 'bg-white md:bg-white/55 md:backdrop-blur-xl border-b border-gray-200 md:border-white/40 transition-colors duration-200'
    : 'bg-white md:bg-white/30 md:backdrop-blur-xl border-b border-transparent transition-colors duration-200';

  const switcherSlot = (
    <div className="flex items-center gap-2">
      {activeClient && currentView !== 'dashboard' && currentView !== 'all-clients' ? (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-white/40">
          <div
            className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${gradient || 'from-indigo-600 via-purple-600 to-pink-600'}`}
          />
          <span className="text-xs font-bold text-slate-700 truncate max-w-[160px]" suppressHydrationWarning>
            {activeClient.companyName}
          </span>
        </div>
      ) : null}
      {isWorkspaceSocial ? <WorkspaceSwitcher /> : <RoomSwitcher />}
    </div>
  );

  const notificationsSlot = (
    <>
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

      {!hasMounted || !isLoaded ? (
        <Skeleton className="md:hidden w-9 h-9 rounded-full bg-white/40 border-2 border-white" />
      ) : isSignedIn && user ? (
        <button
          onClick={() => {
            router.push(joinPath(basePath, `/me`));
          }}
          className={`md:hidden w-9 h-9 rounded-full bg-gradient-to-br ${
            gradient || 'from-indigo-600 via-purple-600 to-pink-600'
          } flex items-center justify-center text-white text-xs font-black shadow-md border-2 border-white overflow-hidden`}
          aria-label="פרופיל"
          type="button"
        >
          {systemIdentity?.avatarUrl || profileImageUrl || user.imageUrl ? (
            <img
              src={systemIdentity?.avatarUrl || profileImageUrl || user.imageUrl || ''}
              alt={systemIdentity?.name || user.fullName || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            (systemIdentity?.name || user.firstName || user.fullName || user.emailAddresses[0]?.emailAddress || 'U').charAt(0).toUpperCase()
          )}
        </button>
      ) : null}
    </>
  );

  const profileSlot = !hasMounted || !isLoaded ? (
    <div className="flex items-center gap-3">
      <Skeleton className="hidden md:block w-32 h-9 rounded-xl bg-white/40 border border-white/30" />
      <Skeleton className="w-10 h-10 rounded-full bg-white/40 border-2 border-white" />
    </div>
  ) : isSignedIn && user ? (
    <div className="hidden md:block">
      <button
        onClick={() => router.push(joinPath(basePath, `/me`))}
        className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-white/50"
        type="button"
        aria-label="פרופיל"
      >
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-gray-900 leading-none" suppressHydrationWarning>
            {systemIdentity?.name || user.firstName || user.fullName || user.emailAddresses[0]?.emailAddress || 'משתמש'}
          </p>
          <p className="text-[10px] text-gray-500 font-medium" suppressHydrationWarning>
            {systemIdentity?.role || 'מנהל סושיאל'}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${
            gradient || 'from-indigo-600 via-purple-600 to-pink-600'
          } flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white overflow-hidden`}
        >
          {systemIdentity?.avatarUrl || profileImageUrl || user.imageUrl ? (
            <img
              src={systemIdentity?.avatarUrl || profileImageUrl || user.imageUrl || ''}
              alt={systemIdentity?.name || user.fullName || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            (systemIdentity?.name || user.firstName || user.fullName || user.emailAddresses[0]?.emailAddress || 'U')
              .charAt(0)
              .toUpperCase()
          )}
        </div>
      </button>
    </div>
  ) : (
    <button
      onClick={() => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)}
      className="px-5 py-2 rounded-full bg-white/70 border border-white/50 text-slate-700 font-bold text-sm hover:bg-white/90 transition-colors"
      type="button"
    >
      התחבר
    </button>
  );

  const mobileBrand = {
    name: 'Social',
    logoUrl: null,
    fallbackIcon: <OSModuleSquircleIcon moduleKey="social" boxSize={32} iconSize={16} className="shadow-none" />,
    badgeModuleKey: 'social' as OSModuleKey,
  };

  return (
    <SharedHeader
      title={titles[currentView] || 'סושיאל'}
      subtitle={null}
      currentDate={currentDate}
      mobileBrand={mobileBrand}
      onOpenCommandPaletteAction={() => setIsCommandPaletteOpen(true)}
      onOpenSupportAction={() => setIsHelpModalOpen(true)}
      actionsSlot={<ModuleHelpVideos moduleKey="social" />}
      switcherSlot={switcherSlot}
      notificationsSlot={notificationsSlot}
      user={{ name: systemIdentity?.name || roomName || 'Social', role: systemIdentity?.role || null }}
      onProfileClickAction={undefined}
      userAvatarSlot={null}
      profileSlot={profileSlot}
      className={headerClassName}
    />
  );
}
