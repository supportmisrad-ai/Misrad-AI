'use client';

import React, { useMemo, useState } from 'react';
import { LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { useApp } from '@/contexts/AppContext';
import AccountShell, { type AccountShellSection } from '@/components/account/AccountShell';
import ProfileView from '@/components/social/ProfileView';
import Settings from '@/components/social/Settings';
import { usePathname } from 'next/navigation';

export default function SocialAccountPage() {
  const pathname = usePathname();
  const { user } = useUser();
  const { user: appUser } = useApp();

  const [activeSectionId, setActiveSectionId] = useState<'profile' | 'settings'>(() => {
    const p = pathname || '';
    if (p.endsWith('/settings')) return 'settings';
    return 'profile';
  });

  const shellUser = useMemo(
    () => ({
      name:
        appUser?.fullName ||
        appUser?.firstName ||
        user?.fullName ||
        user?.firstName ||
        user?.username ||
        (user?.primaryEmailAddress?.emailAddress?.split('@')[0] ?? 'משתמש'),
      email: appUser?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || null,
      role: null,
      avatarUrl: appUser?.imageUrl || user?.imageUrl || null,
    }),
    [appUser, user]
  );

  const sections = useMemo(
    (): AccountShellSection[] => [
      {
        id: 'profile',
        label: 'פרופיל',
        icon: UserIcon,
        content: <ProfileView />,
      },
      {
        id: 'settings',
        label: 'הגדרות',
        icon: SettingsIcon,
        content: <Settings />,
      },
    ],
    []
  );

  return (
    <AccountShell
      title="חשבון - Social"
      user={shellUser}
      activeSectionId={activeSectionId}
      onSectionChangeAction={(id) => setActiveSectionId(id as 'profile' | 'settings')}
      sections={sections}
      headerActions={
        <SignOutButton>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white/80 border border-slate-200 text-slate-600 font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <LogOut size={16} /> התנתק
          </button>
        </SignOutButton>
      }
    />
  );
}
