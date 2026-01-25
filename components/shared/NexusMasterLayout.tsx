'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { Avatar } from '@/components/Avatar';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';

export default function NexusMasterLayout({
  title,
  workspace,
  user,
  profileHref,
  children,
}: {
  title: string;
  workspace: { name: string; logoUrl?: string | null };
  user: { name: string; role?: string | null; avatarUrl?: string | null };
  profileHref: string;
  children: React.ReactNode;
}) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  const avatarSlot = useMemo(
    () => (
      <Avatar
        src={user.avatarUrl || null}
        alt={user.name}
        name={user.name}
        size="md"
        rounded="full"
        className="border-2 border-white shadow-sm"
      />
    ),
    [user.avatarUrl, user.name]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[520px] h-[520px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] bg-purple-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>

      <SharedHeader
        title={title}
        subtitle={null}
        currentDate={currentDate || ' '}
        mobileBrand={{
          name: workspace.name,
          logoUrl: workspace.logoUrl || null,
          badgeIcon: <OSModuleIcon moduleKey="nexus" size={10} className="text-slate-900" />,
        }}
        onOpenCommandPaletteAction={undefined}
        onOpenSupportAction={undefined}
        actionsSlot={<ModuleHelpVideos moduleKey="nexus" />}
        switcherSlot={null}
        notificationsSlot={null}
        user={{ name: user.name, role: user.role || null }}
        onProfileClickAction={undefined}
        profileHref={profileHref}
        userAvatarSlot={avatarSlot}
        profileSlot={undefined}
        className="bg-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-10">{children}</div>
    </div>
  );
}
