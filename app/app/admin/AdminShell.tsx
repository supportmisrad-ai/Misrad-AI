'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Building2, Users, Sparkles, ScrollText, Monitor, Server, SlidersHorizontal, Globe, LifeBuoy } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { useData } from '@/context/DataContext';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { Avatar } from '@/components/Avatar';
import CommandPalette from '@/components/CommandPalette';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';

function isActivePath(pathname: string, href: string) {
  if (href === '/app/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const {
    currentUser,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    openSupport,
    leads,
  } = useData();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };

    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true } as any);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  const navItems = useMemo(
    () => [
      { href: '/app/admin', label: 'דשבורד', icon: LayoutGrid },
      { href: '/app/admin/global', label: 'גלובלי', icon: Globe },
      { href: '/app/admin/modules', label: 'מודולים', icon: SlidersHorizontal },
      { href: '/app/admin/social', label: 'Social Admin', icon: Users },
      { href: '/app/admin/organizations', label: 'ארגונים', icon: Building2 },
      { href: '/app/admin/users', label: 'משתמשים', icon: Users },
      { href: '/app/admin/tenants', label: 'Tenants', icon: Server },
      { href: '/app/admin/system-flags', label: 'System Flags', icon: SlidersHorizontal },
      { href: '/app/admin/support', label: 'תמיכה', icon: LifeBuoy },
      { href: '/app/admin/landing/logo', label: 'Landing', icon: Globe },
      { href: '/app/admin/ai', label: 'AI', icon: Sparkles },
      { href: '/app/admin/legacy', label: 'ניהול מתקדם (Legacy)', icon: Monitor },
      { href: '/app/admin/logs', label: 'לוגים', icon: ScrollText },
    ],
    []
  );

  const userName = String(currentUser?.name || 'Admin');
  const userRole = currentUser?.role ? String(currentUser.role) : null;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="p-5 border-b border-slate-200">
            <div className="text-lg font-black text-slate-900">ענן משרד</div>
            <div className="text-xs font-bold text-slate-500 mt-1">ניהול מערכת</div>
          </div>

          <nav className="p-3 flex-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <Avatar src={currentUser?.avatar || null} name={userName} size="md" rounded="full" />
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate" suppressHydrationWarning>
                  {userName}
                </div>
                <div className="text-[10px] font-bold text-slate-500 truncate" suppressHydrationWarning>
                  {userRole || ''}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <SharedHeader
            title="ענן משרד"
            subtitle="Super Admin"
            currentDate={new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            mobileBrand={{ name: 'ענן משרד', badgeIcon: <OSModuleIcon moduleKey="system" size={10} className="text-slate-900" /> }}
            onOpenCommandPaletteAction={() => setCommandPaletteOpen(true)}
            onOpenSupportAction={() => openSupport?.()}
            user={{ name: userName, role: userRole }}
            userAvatarSlot={<Avatar src={currentUser?.avatar || null} name={userName} size="md" rounded="full" />}
            className="bg-white border-b border-slate-200"
          />

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </div>
        </main>

        <CommandPalette
          isOpen={Boolean(isCommandPaletteOpen)}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={(_tabId) => setCommandPaletteOpen(false)}
          onSelectLead={(_lead) => setCommandPaletteOpen(false)}
          leads={Array.isArray(leads) ? leads : []}
        />
      </div>
    </AdminGuard>
  );
}
