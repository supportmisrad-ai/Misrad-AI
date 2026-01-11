'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell } from 'lucide-react';
import { Avatar } from '../Avatar';
import { RoomSwitcher } from './RoomSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';

type Organization = {
  name: string;
  logo?: string | null;
};

type CurrentUser = {
  name: string;
  role?: string | null;
  avatar?: string | null;
  email?: string | null;
};

export default function NexusHeader({
  title,
  subtitle,
  organization,
  currentUser,
  showRoomSwitcher = true,
  showNotifications = true,
  profileHref = '/app#/me',
  onOpenCommandPaletteAction,
}: {
  title?: string;
  subtitle?: string;
  organization: Organization;
  currentUser: CurrentUser;
  showRoomSwitcher?: boolean;
  showNotifications?: boolean;
  profileHref?: string;
  onOpenCommandPaletteAction?: () => void;
}) {
  const { RoomIcon, room } = useRoomBranding();

  const openCommandPalette = onOpenCommandPaletteAction;

  const isProbablyTokenOrId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.length > 40) return true;
    if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return true;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) return true;
    return false;
  };

  const safeOrgName = isProbablyTokenOrId(organization.name) ? 'Workspace' : organization.name;
  const safeUserName = isProbablyTokenOrId(currentUser.name)
    ? (currentUser.email?.split('@')[0] || 'משתמש')
    : currentUser.name;

  return (
    <header className="h-20 md:h-24 flex items-center justify-between px-4 md:px-8 z-40 sticky top-0">
      <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-white overflow-hidden border border-gray-100 shadow-sm">
          {organization.logo ? (
            <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            room === 'nexus' ? <img src="/icons/nexus-icon.svg" alt="Nexus" className="w-full h-full object-cover" /> : (RoomIcon ? <RoomIcon size={18} className="text-gray-900" /> : null)
          )}
        </div>
        <span className="font-bold text-lg text-gray-900 truncate">{safeOrgName}</span>
      </div>

      <div className="hidden md:flex flex-col justify-center">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">{title || 'לוח בקרה'}</h2>
        {subtitle ? (
          <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 md:gap-5 relative bg-white/40 backdrop-blur-xl p-1 pr-1.5 md:p-2 rounded-full border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] shrink-0 ml-2">
        {showRoomSwitcher ? <div className="hidden md:flex items-center gap-2"><RoomSwitcher /></div> : null}

        <button
          id="command-search-btn"
          onClick={() => openCommandPalette?.()}
          className="p-2 rounded-full hover:bg-white/50 text-gray-600 transition-colors"
          title="חיפוש (Cmd+K)"
          type="button"
        >
          <Search size={18} />
        </button>

        {showNotifications ? (
          <button
            id="notification-trigger"
            className="relative p-2 rounded-full transition-colors hover:bg-white/50 text-gray-600"
            aria-label="התראות"
            type="button"
          >
            <Bell size={18} />
          </button>
        ) : null}

        <div className="w-px h-6 bg-gray-400/20 hidden md:block"></div>

        <Link
          id="user-profile-btn"
          href={profileHref}
          className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-white/50"
        >
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-gray-900 leading-none" suppressHydrationWarning>
              {safeUserName}
            </p>
            <p className="text-[10px] text-gray-500 font-medium" suppressHydrationWarning>
              {currentUser.role || ''}
            </p>
          </div>
          <Avatar
            src={currentUser.avatar || undefined}
            alt="Profile"
            name={safeUserName}
            size="md"
            className="border-2 border-white shadow-sm"
          />
        </Link>
      </div>
    </header>
  );
}
