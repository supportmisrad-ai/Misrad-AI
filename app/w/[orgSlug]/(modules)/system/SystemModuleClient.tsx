'use client';

import React from 'react';
import { OSModuleProvider } from '@/contexts/OSModuleContext';
import SystemApp from '@/components/system/SystemApp';

export default function SystemModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialTab,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialTab?: string;
}) {
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
