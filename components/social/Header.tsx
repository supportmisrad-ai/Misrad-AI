'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { getUnreadUpdatesCount } from '@/app/actions/updates';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import { getSocialBasePath, joinPath, parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';

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
  const { title, roomNameHebrew, gradient } = useRoomBranding();
  const workspaceInfo = parseWorkspaceRoute(pathname);
  const isWorkspaceSocial = Boolean(workspaceInfo.orgSlug && workspaceInfo.module === 'social');
  const basePath = getSocialBasePath(pathname);
  const [isScrolled, setIsScrolled] = useState(false);

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

  useEffect(() => {
    if (isSignedIn) {
      loadUnreadCount();
      // Refresh every 5 minutes
      const interval = setInterval(loadUnreadCount, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isSignedIn]);

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadUpdatesCount();
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count);
      }
    } catch (error: any) {
      // Silently handle network errors (common during dev server restarts)
      // Only log if it's not a network/fetch error
      if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('fetch')) {
        console.error('Error loading unread count:', error);
      }
      // Keep current count on error, don't reset to 0
    }
  };

  const currentDate = useMemo(() => {
    if (!hasMounted) return '';
    try {
      return new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  }, [hasMounted]);

  const headerClassName = isScrolled
    ? 'bg-white/55 backdrop-blur-xl border-b border-white/40 transition-colors duration-200'
    : 'bg-white/30 backdrop-blur-xl border-b border-transparent transition-colors duration-200';

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
    <div className="flex items-center gap-2">
      <AttendanceMiniStatus />
      <button
        onClick={() => setIsNotificationCenterOpen(true)}
        className="relative p-2 rounded-full transition-colors hover:bg-white/50 text-gray-600"
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
        <div className="md:hidden w-9 h-9 rounded-full bg-white/40 border-2 border-white animate-pulse" />
      ) : isSignedIn && user ? (
        <button
          onClick={() => {
            router.push(joinPath(basePath, `/me${systemIdentity?.needsProfileCompletion ? '?edit=profile' : ''}`));
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
    </div>
  );

  const profileSlot = !hasMounted || !isLoaded ? (
    <div className="flex items-center gap-3">
      <div className="hidden md:block w-32 h-9 rounded-xl bg-white/40 border border-white/30 animate-pulse" />
      <div className="w-10 h-10 rounded-full bg-white/40 border-2 border-white animate-pulse" />
    </div>
  ) : isSignedIn && user ? (
    <div className="hidden md:block">
      <button
        onClick={() =>
          router.push(joinPath(basePath, `/me${systemIdentity?.needsProfileCompletion ? '?edit=profile' : ''}`))
        }
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
    name: 'Social OS',
    logoUrl: null,
    fallbackIcon: (
      <div className={`w-full h-full flex items-center justify-center text-white text-xs font-black bg-gradient-to-br ${gradient || 'from-indigo-600 via-purple-600 to-pink-600'}`}>
        S
      </div>
    ),
  };

  return (
    <SharedHeader
      title={titles[currentView] || 'סושיאל'}
      subtitle={null}
      currentDate={currentDate}
      mobileBrand={mobileBrand}
      onOpenCommandPaletteAction={() => setIsCommandPaletteOpen(true)}
      onOpenSupportAction={() => setIsHelpModalOpen(true)}
      switcherSlot={switcherSlot}
      notificationsSlot={notificationsSlot}
      user={{ name: systemIdentity?.name || roomNameHebrew || 'סושיאל', role: systemIdentity?.role || null }}
      onProfileClickAction={undefined}
      userAvatarSlot={null}
      profileSlot={profileSlot}
      className={headerClassName}
    />
  );
}
