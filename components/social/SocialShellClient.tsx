'use client';

import React, { useMemo } from 'react';
import ShabbatScreen from '@/components/social/ShabbatScreen';
import SocialFrame from '@/components/social/SocialFrame';
import { useShabbat } from '@/hooks/useShabbat';

import { AppProvider } from '@/contexts/AppContext';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import type { SocialInitialData, SocialNavigationItem } from '@/lib/services/social-service';
import { DataProvider } from '@/context/DataContext';
import type { User, OrganizationProfile } from '@/types';

import { SocialSessionProvider } from '@/contexts/SocialSessionContext';
import { SocialUIProvider } from '@/contexts/SocialUIContext';
import { SocialDataProvider } from '@/contexts/SocialDataContext';

export default function SocialShellClient({
  children,
  orgSlug,
  isTeamEnabled,
  initialSocialData,
  initialNavigationMenu: _initialNavigationMenu,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  orgSlug: string;
  isTeamEnabled?: boolean;
  initialSocialData?: SocialInitialData;
  initialNavigationMenu?: SocialNavigationItem[];
  initialCurrentUser?: unknown;
  initialOrganization?: unknown;
}) {
  const { shabbatTimes } = useShabbat();

  const isShabbatProtected = (initialOrganization as { isShabbatProtected?: boolean } | undefined)?.isShabbatProtected !== false;

  const basePath = useMemo(() => `/w/${encodeURIComponent(orgSlug)}/social`, [orgSlug]);

  if (isShabbatProtected && shabbatTimes?.isShabbat) {
    return <ShabbatScreen />;
  }

  return (
    <ReactQueryProvider>
      <AppProvider initialSocialData={initialSocialData}>
        <AuthProvider>
          <ToastProvider>
            <BrandProvider>
              <DataProvider initialCurrentUser={initialCurrentUser as User | undefined} initialOrganization={initialOrganization as Partial<OrganizationProfile> | undefined}>
                <SocialSessionProvider>
                  <SocialUIProvider>
                    <SocialDataProvider>
                      <SocialFrame
                        basePath={basePath}
                        orgSlug={orgSlug}
                        isTeamEnabled={isTeamEnabled}
                        initialOrganization={initialOrganization as Partial<OrganizationProfile> | null | undefined}
                        initialCurrentUser={initialCurrentUser as { name?: string | null; role?: string | null; avatarUrl?: string | null } | null | undefined}
                      >
                        {children}
                      </SocialFrame>
                    </SocialDataProvider>
                  </SocialUIProvider>
                </SocialSessionProvider>
              </DataProvider>
            </BrandProvider>
          </ToastProvider>
        </AuthProvider>
      </AppProvider>
    </ReactQueryProvider>
  );
}
