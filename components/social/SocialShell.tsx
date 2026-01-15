import React from 'react';

// Providers
import type { SocialInitialData, SocialNavigationItem } from '@/lib/services/social-service';
import SocialShellClient from '@/components/social/SocialShellClient';

export default function SocialShell({
  children,
  initialSocialData,
  initialNavigationMenu,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  initialSocialData?: SocialInitialData;
  initialNavigationMenu?: SocialNavigationItem[];
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  return (
    <SocialShellClient
      initialSocialData={initialSocialData}
      initialNavigationMenu={initialNavigationMenu}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
    >
      {children}
    </SocialShellClient>
  );
}
