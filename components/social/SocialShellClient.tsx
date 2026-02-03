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
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  const { shabbatTimes } = useShabbat();

  const basePath = useMemo(() => `/w/${encodeURIComponent(orgSlug)}/social`, [orgSlug]);

  if (shabbatTimes?.isShabbat) {
    return <ShabbatScreen />;
  }

  return (
    <ReactQueryProvider>
      <AppProvider initialSocialData={initialSocialData}>
        <AuthProvider>
          <ToastProvider>
            <BrandProvider>
              <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
                <SocialSessionProvider>
                  <SocialUIProvider>
                    <SocialDataProvider>
                      <SocialFrame
                        basePath={basePath}
                        orgSlug={orgSlug}
                        isTeamEnabled={isTeamEnabled}
                        initialOrganization={initialOrganization}
                        initialCurrentUser={initialCurrentUser}
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
