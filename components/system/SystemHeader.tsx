'use client';

import React, { useEffect, useState } from 'react';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';

export function SystemHeader({
  title,
  currentDate,
  brand,
  isWorkspaceRoute,
  onOpenCommandPaletteAction,
  onNavigateToNotificationsAction,
  user,
  roleLabel,
  avatarUrl,
  hasValidAvatarSrc,
  isProfileOpen,
  onToggleProfileOpenAction,
  profileRef,
  onNavigateToPersonalAreaAction,
  onNavigateToSystemSettingsAction,
  onLogoutAction,
}: {
  title: string;
  currentDate: string;
  brand: {
    name: string;
    logoUrl?: string | null;
    fallbackIcon?: React.ReactNode;
  };
  isWorkspaceRoute: boolean;
  onOpenCommandPaletteAction: () => void;
  onNavigateToNotificationsAction: () => void;
  user: {
    name: string;
    email?: string | null;
  };
  roleLabel: string;
  avatarUrl: string;
  hasValidAvatarSrc: boolean;
  isProfileOpen: boolean;
  onToggleProfileOpenAction: () => void;
  profileRef: React.RefObject<HTMLDivElement | null>;
  onNavigateToPersonalAreaAction: () => void;
  onNavigateToSystemSettingsAction: () => void;
  onLogoutAction: () => void;
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = document.getElementById('main-scroll-container');
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const headerClassName = isScrolled
    ? 'bg-transparent backdrop-blur-xl border-b border-white/30 transition-colors duration-200'
    : 'bg-transparent transition-colors duration-200';

  const profileSlot = (
    <div className="relative hidden md:block" ref={profileRef}>
      <button
        onClick={onToggleProfileOpenAction}
        className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-white/50"
        type="button"
        aria-label="תפריט פרופיל"
      >
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-gray-900 leading-none" suppressHydrationWarning>
            {user.name}
          </p>
          <p className="text-[10px] text-gray-500 font-medium" suppressHydrationWarning>
            {roleLabel}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-nexus-gradient flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white overflow-hidden">
          {hasValidAvatarSrc ? (
            <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name.charAt(0)
          )}
        </div>
      </button>

      <AnimatePresence>
        {isProfileOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white/90 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-2xl p-2 z-50 origin-top-left ring-1 ring-slate-900/5 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">מחובר כ-</p>
              <p className="font-bold text-slate-800">{user.email || 'user@system.os'}</p>
            </div>
            <div className="space-y-1">
              <button
                onClick={onNavigateToPersonalAreaAction}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors text-sm font-bold"
                type="button"
              >
                <User size={16} /> פרופיל אישי
              </button>
              <button
                onClick={onNavigateToSystemSettingsAction}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors text-sm font-bold"
                type="button"
              >
                <Settings size={16} /> הגדרות
              </button>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <button
                onClick={onLogoutAction}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors text-sm font-bold"
                type="button"
              >
                <LogOut size={16} /> יציאה
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  const notificationsSlot = (
    <div className="flex items-center gap-2">
      <button
        onClick={onNavigateToNotificationsAction}
        className="relative p-2 rounded-full transition-colors hover:bg-white/50 text-gray-600"
        aria-label="התראות"
        type="button"
      >
        <Bell size={18} />
      </button>
      <button
        onClick={onNavigateToPersonalAreaAction}
        className="md:hidden w-9 h-9 rounded-full bg-nexus-gradient flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white overflow-hidden"
        aria-label="פרופיל"
        type="button"
      >
        {hasValidAvatarSrc ? (
          <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          user.name.charAt(0)
        )}
      </button>
    </div>
  );

  const switcherSlot = (
    <div className="flex items-center gap-2">
      {isWorkspaceRoute ? <WorkspaceSwitcher /> : <RoomSwitcher />}
    </div>
  );

  return (
    <SharedHeader
      title={title}
      subtitle={null}
      currentDate={currentDate}
      mobileBrand={brand}
      onOpenCommandPaletteAction={onOpenCommandPaletteAction}
      onOpenSupportAction={undefined}
      switcherSlot={switcherSlot}
      notificationsSlot={notificationsSlot}
      user={{ name: user.name, role: roleLabel }}
      onProfileClickAction={undefined}
      userAvatarSlot={null}
      profileSlot={profileSlot}
      className={headerClassName}
    />
  );
}
