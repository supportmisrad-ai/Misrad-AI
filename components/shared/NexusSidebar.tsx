'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

export type NexusNavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

type Organization = {
  name: string;
  logo?: string | null;
};

export default function NexusSidebar({
  organization,
  navItems,
  hideLogoSubtitle = false,
}: {
  organization: Organization;
  navItems: NexusNavItem[];
  hideLogoSubtitle?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { roomName } = useRoomBranding();

  const filteredNavItems = useMemo(() => navItems, [navItems]);

  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname === path;
  };

  const navigate = (path: string) => {
    router.push(path);
  };

  return (
    <aside
      className={`hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isSidebarOpen ? 'w-72' : 'w-24'} p-4 z-30 h-screen relative`}
    >
      <div
        id="main-sidebar"
        className={`flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/40 overflow-hidden transition-all duration-500 ${isSidebarOpen ? 'px-4' : 'px-2 items-center'}`}
      >
        <div className={`flex items-center justify-between py-8 ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
          {isSidebarOpen ? (
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => router.push('/workspaces')}
                type="button"
                className="flex items-center gap-3 text-right cursor-pointer rounded-2xl px-1.5 py-1 transition-colors hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                aria-label="מעבר בין עסקים"
                title="מעבר בין עסקים"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-white overflow-hidden border border-gray-100">
                  {organization.logo ? (
                    <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" suppressHydrationWarning />
                  ) : (
                    <OSModuleSquircleIcon moduleKey="nexus" boxSize={40} iconSize={18} className="shadow-none" />
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span
                    className="font-bold text-lg tracking-tight text-gray-900 block leading-none truncate"
                    title={organization.name}
                    suppressHydrationWarning
                  >
                    {organization.name}
                  </span>
                  {!hideLogoSubtitle ? (
                    <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">{roomName || 'MISRAD AI - מערכת צמיחה'}</span>
                  ) : null}
                </div>
              </button>

              <div className="w-full">
                <WorkspaceSwitcher className="w-full" />
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-gray-100">
              {organization.logo ? (
                <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" suppressHydrationWarning />
              ) : (
                <OSModuleSquircleIcon moduleKey="nexus" boxSize={40} iconSize={18} className="shadow-none" />
              )}
            </div>
          )}

          {isSidebarOpen ? (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 hover:bg-white/60 rounded-lg"
              aria-label="סגור תפריט צד"
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mt-4 text-gray-400 hover:text-gray-900 transition-colors p-1.5 hover:bg-white/60 rounded-lg"
              aria-label="פתח תפריט צד"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-1.5 mt-2 overflow-y-auto no-scrollbar">
          {filteredNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-150 group relative
                ${isActive(item.path) ? 'text-gray-900 shadow-sm font-bold' : 'text-gray-500 hover:bg-white/50 hover:text-gray-900'}
                ${!isSidebarOpen && 'justify-center px-0 aspect-square'}`}
              aria-label={item.label}
              type="button"
            >
              {isActive(item.path) ? (
                <motion.div
                  layoutId="activeTabClient"
                  className="absolute inset-0 rounded-2xl z-0 bg-white/70 border border-white/60"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              ) : null}
              <span className="relative z-10 flex items-center justify-center w-5 h-5">
                <item.icon
                  size={20}
                  strokeWidth={isActive(item.path) ? 2.5 : 2}
                  className={isActive(item.path) ? 'text-gray-900' : 'text-current'}
                />
              </span>
              {isSidebarOpen ? <span className="relative z-10">{item.label}</span> : null}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}
