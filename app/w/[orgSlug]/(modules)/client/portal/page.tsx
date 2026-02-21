'use client';

import React from 'react';
import { ClientProvider } from '@/components/client-portal/context/ClientContext';
import ClientPortal from '@/components/client-portal/components/ClientPortal';
import { ToastManager } from '@/components/client-portal/components/ui/ToastManager';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


export default function ClientPortalPage() {
  return (
    <ClientProvider>
      <ClientPortal />
      <ToastManager />
    </ClientProvider>
  );
}
