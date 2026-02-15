import React from 'react';

// Providers
import type { SocialInitialData, SocialNavigationItem } from '@/lib/services/social-service';
import SocialShellClient from '@/components/social/SocialShellClient';

export default function SocialShell({
  orgSlug,
  isTeamEnabled,
  children,
  initialSocialData,
  initialNavigationMenu,
  initialCurrentUser,
  initialOrganization,
}: {
  orgSlug: string;
  isTeamEnabled?: boolean;
  children: React.ReactNode;
  initialSocialData?: SocialInitialData;
  initialNavigationMenu?: SocialNavigationItem[];
  initialCurrentUser?: unknown;
  initialOrganization?: unknown;
}) {
  return (
    <SocialShellClient
      orgSlug={orgSlug}
      isTeamEnabled={isTeamEnabled}
      initialSocialData={initialSocialData}
      initialNavigationMenu={initialNavigationMenu}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
    >
      {children}
    </SocialShellClient>
  );
}
