'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Target } from 'lucide-react';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { CallAnalysisProvider } from '@/components/system/contexts/CallAnalysisContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import { SystemHeader } from '@/components/system/SystemHeader';
import Sidebar from '@/components/system/Sidebar';
import { NAV_ITEMS } from '@/components/system/constants';

const SHELL_TABS = new Set(['sales_leads', 'sales_pipeline', 'calendar', 'dialer']);

const SystemShellContext = createContext<{ orgSlug: string; currentUser: any } | null>(null);

export function useSystemShell() {
  const ctx = useContext(SystemShellContext);
  if (!ctx) {
    throw new Error('useSystemShell must be used within SystemShellGateClient');
  }
  return ctx;
}

function tabFromPathname(pathname: string | null | undefined) {
  if (!pathname) return null;
  const parts = pathname.split('/').filter(Boolean);
  const systemIndex = parts.indexOf('system');
  if (systemIndex === -1) return null;
  return parts[systemIndex + 1] || null;
}

export default function SystemShellGateClient({
  children,
  orgSlug,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = useMemo(() => tabFromPathname(pathname), [pathname]);

  const shouldWrapWithShell = activeTab ? SHELL_TABS.has(activeTab) : false;
  if (!shouldWrapWithShell) {
    return <>{children}</>;
  }

  const contentOverflowClass = activeTab === 'sales_pipeline' ? 'overflow-hidden' : 'overflow-y-auto';

  const title = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'System';
  const currentDate = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const headerName = String(initialCurrentUser?.name || 'משתמש');
  const headerEmail = String(initialCurrentUser?.email || `${String(initialCurrentUser?.id || 'user')}@system.os`);

  const avatarUrl = String(initialCurrentUser?.avatar || '');
  const hasValidAvatarSrc =
    !!avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:') || avatarUrl.startsWith('/'));

  const roleLabel = initialCurrentUser?.isSuperAdmin
    ? 'סופר אדמין'
    : String(initialCurrentUser?.role || 'משתמש');

  return (
    <SystemShellContext.Provider value={{ orgSlug, currentUser: initialCurrentUser }}>
      <ToastProvider>
        <CallAnalysisProvider>
          <BrandProvider initialBrandName={String(initialOrganization?.name || 'system.OS')} initialBrandLogo={initialOrganization?.logo || null}>
            <div className="flex h-screen w-full bg-[var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
              <div className="hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shrink-0 z-30 h-screen relative">
                <Sidebar
                  activeTab={String(activeTab)}
                  user={initialCurrentUser}
                  logout={() => {}}
                  isSuperAdmin={Boolean(initialCurrentUser?.isSuperAdmin)}
                  isTenantAdmin={false}
                />
              </div>

              <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                <SystemHeader
                  title={title}
                  currentDate={currentDate}
                  brand={{
                    name: String(initialOrganization?.name || 'System'),
                    logoUrl: null,
                    fallbackIcon: (
                      <div className="w-full h-full bg-gradient-to-br from-rose-600 to-indigo-600 flex items-center justify-center">
                        <Target size={18} className="text-white" strokeWidth={2.5} />
                      </div>
                    ),
                  }}
                  isWorkspaceRoute={true}
                  onOpenCommandPaletteAction={() => {}}
                  onNavigateToNotificationsAction={() => router.push(`/w/${encodeURIComponent(orgSlug)}/system/notifications_center`)}
                  onProfileClickAction={() => router.push(`/w/${encodeURIComponent(orgSlug)}/system/me`)}
                  user={{ name: headerName, email: headerEmail }}
                  roleLabel={roleLabel}
                  avatarUrl={avatarUrl}
                  hasValidAvatarSrc={hasValidAvatarSrc}
                />

                <div
                  className={`flex-1 ${contentOverflowClass} no-scrollbar p-4 md:p-8 min-h-0 touch-pan-y touch-pan-x`}
                  id="main-scroll-container"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {children}
                </div>
              </main>
            </div>
          </BrandProvider>
        </CallAnalysisProvider>
      </ToastProvider>
    </SystemShellContext.Provider>
  );
}
