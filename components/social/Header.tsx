'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { getUnreadUpdatesCount } from '@/app/actions/updates';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { getSocialBasePath, joinPath, parseWorkspaceRoute } from '@/lib/os/social-routing';

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
    '/profile': 'profile',
  };
  return map[sub] || 'dashboard';
};

export default function Header() {
  const pathname = usePathname();
  const currentView = getViewFromPath(pathname);
  const { activeClient, setIsCommandPaletteOpen, setIsNotificationCenterOpen, user } = useApp();
  const { isSignedIn } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const { title } = useRoomBranding();
  const workspaceInfo = parseWorkspaceRoute(pathname);
  const isWorkspaceSocial = Boolean(workspaceInfo.orgSlug && workspaceInfo.module === 'social');
  const basePath = getSocialBasePath(pathname);

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

  return (
    <header className="h-20 bg-white/60 backdrop-blur-2xl border-b border-white/40 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {activeClient && currentView !== 'dashboard' && currentView !== 'all-clients' && (
          <div className="flex items-center gap-3 ml-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <img src={activeClient.avatar} className="w-8 h-8 rounded-lg" alt="" />
            <span className="font-black text-sm">{activeClient.companyName}</span>
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">{titles[currentView] || 'סושיאל OS'}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button 
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center bg-white/60 backdrop-blur-2xl rounded-full px-4 py-2 md:w-64 border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] group hover:bg-white/80 transition-all"
        >
          <Search size={18} className="text-slate-400 group-hover:text-slate-600" />
          <span className="hidden md:block text-slate-400 font-bold text-sm px-3 text-right w-full">חפש לקוח או פוסט</span>
        </button>

        <div className="hidden md:flex items-center gap-2">
          {isWorkspaceSocial ? <WorkspaceSwitcher /> : <RoomSwitcher />}
        </div>
        
        <button 
          onClick={() => setIsNotificationCenterOpen(true)}
          className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
        >
          <Bell size={22} />
          {unreadCount > 0 ? (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>

        <div className="flex items-center gap-3 border-r pr-6 border-slate-200">
          {isSignedIn && user ? (
            <>
              <div className="text-left hidden md:block">
                <p className="text-sm font-bold">{user.firstName || user.fullName || user.emailAddresses[0]?.emailAddress || 'משתמש'}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black">מנהל סושיאל</p>
              </div>
              <Link href={joinPath(basePath, '/profile')} scroll={false} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg overflow-hidden font-black border-2 border-white">
                {profileImageUrl || user.imageUrl ? (
                  <img
                    src={profileImageUrl || user.imageUrl || ''}
                    alt={user.fullName || 'User'}
                    className="w-full h-full object-cover"
                    onError={() => setProfileImageUrl(null)} // Fallback if image fails to load
                  />
                ) : (
                  <span className="text-xs">{(user.firstName || user.emailAddresses[0]?.emailAddress || 'U').charAt(0).toUpperCase()}</span>
                )}
              </Link>
              <SignOutButton>
                <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="התנתק">
                  <LogOut size={20} />
                </button>
              </SignOutButton>
            </>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <User size={18} /> התחבר
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

