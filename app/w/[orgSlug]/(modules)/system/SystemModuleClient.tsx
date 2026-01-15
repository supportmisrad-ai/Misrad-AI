'use client';

import React from 'react';
import { OSModuleProvider } from '@/contexts/OSModuleContext';
import SystemApp from '@/components/system/SystemApp';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';

export default function SystemModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialTab,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialTab?: string;
}) {
  const { isShabbat, isLoading } = useShabbat();

  if (!isLoading && isShabbat) {
    return <ShabbatScreen />;
  }

  return (
    <OSModuleProvider initialModule="system">
      <SystemApp
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
        initialTab={initialTab}
      />
    </OSModuleProvider>
  );
}
