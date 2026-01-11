'use client';

import React, { useMemo, useState } from 'react';
import { Target, X } from 'lucide-react';
import { NAV_ITEMS } from './constants';
import { useBrand } from './contexts/BrandContext';
import { BusinessSwitcher } from '../BusinessSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { usePathname, useRouter } from 'next/navigation';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';

interface SidebarProps {
  activeTab: string;
  user: any;
  logout: () => void;
  mobile?: boolean;
  onClose?: () => void;
  currentOSModule?: 'system' | 'nexus' | 'social' | 'finance' | 'client';
  isSuperAdmin?: boolean;
  isTenantAdmin?: boolean;
}

const Sidebar = React.memo(({ activeTab, mobile = false, onClose }: SidebarProps) => {
  const { brandName, brandLogo } = useBrand();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { roomName, RoomIcon, room } = useRoomBranding();
  const pathname = usePathname();
  const router = useRouter();

  const basePath = useMemo(() => {
    const parts = (pathname || '').split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    const orgSlug = wIndex !== -1 ? parts[wIndex + 1] : null;
    return orgSlug ? `/w/${orgSlug}/system` : null;
  }, [pathname]);

  const isOpen = mobile ? true : isSidebarOpen;

  const PRIMARY_NAV_IDS = ['workspace', 'sales_pipeline', 'tasks', 'calendar'];

  const navItems = useMemo(
    () => NAV_ITEMS.map((i) => ({ path: i.id, label: i.label, icon: i.icon })),
    []
  );

  const fallbackIcon =
    room === 'system' ? (
      <img src="/icons/system-icon.svg" alt="System" className="w-full h-full object-cover" />
    ) : RoomIcon ? (
      <RoomIcon size={20} className="text-slate-900" />
    ) : (
      <Target size={20} className="text-slate-900" />
    );

  const onNavigate = (tabId: string) => {
    if (!basePath) return;
    router.push(`${basePath}/${tabId}`);
    if (mobile && onClose) onClose();
  };

  const systemSidebarNavVars = {
    '--os-sidebar-text': '#0F172A',
    '--os-sidebar-text-muted': '#64748B',
    '--os-sidebar-item-hover': 'rgba(248,250,252,0.80)',
    '--os-sidebar-active-bg': 'transparent',
    '--os-sidebar-active-bg-image': 'var(--nexus-gradient)',
    '--os-sidebar-active-ring': 'rgba(0,0,0,0)',
    '--os-sidebar-active-text': '#FFFFFF',
  } as React.CSSProperties;

  return (
    <div style={systemSidebarNavVars}>
      <SharedSidebar
        isOpen={isOpen}
        onSetOpenAction={(open) => {
          if (mobile) return;
          setIsSidebarOpen(open);
        }}
        brand={{
          name: brandName,
          logoUrl: brandLogo,
          fallbackIcon,
        }}
        brandSubtitle={roomName || 'מכונת המכירות'}
        onBrandClickAction={() => router.push('/workspaces')}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={brandName} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={navItems}
        primaryNavPaths={PRIMARY_NAV_IDS}
        isActiveAction={(tabId) => tabId === activeTab}
        onNavigateAction={onNavigate}
        bottomSlot={<OSAppSwitcher mode="inlineGrid" compact={true} className={isOpen ? '' : 'w-full'} />}
        showCollapseControls={false}
        containerClassName={
          mobile
            ? 'flex flex-col h-full w-full max-w-[320px] shadow-none bg-transparent border-l border-[color:var(--os-sidebar-border,rgba(255,255,255,0.40))]'
            : undefined
        }
      />
    </div>
  );
});

export default Sidebar;
