import React from 'react';

// Providers
import type { SocialInitialData, SocialNavigationItem } from '@/lib/services/social-service';
import SocialShellClient from '@/components/social/SocialShellClient';

export default function SocialShell({
  children,
  initialSocialData,
  initialNavigationMenu,
}: {
  children: React.ReactNode;
  initialSocialData?: SocialInitialData;
  initialNavigationMenu?: SocialNavigationItem[];
}) {
  return (
    <SocialShellClient initialSocialData={initialSocialData} initialNavigationMenu={initialNavigationMenu}>
      {children}
    </SocialShellClient>
  );
}
