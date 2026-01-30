'use client';

import React from 'react';
import { ClientProvider } from '@/components/client-portal/context/ClientContext';
import ClientPortal from '@/components/client-portal/components/ClientPortal';
import { ToastManager } from '@/components/client-portal/components/ui/ToastManager';

export const dynamic = 'force-dynamic';


export default function ClientPortalPage() {
  return (
    <ClientProvider>
      <ClientPortal />
      <ToastManager />
    </ClientProvider>
  );
}
