'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientPortal from '@/components/client-os-full/components/ClientPortal';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function ClientClientPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = useMemo(() => {
    const id = searchParams?.get('clientId');
    return id ? String(id) : null;
  }, [searchParams]);

  if (!clientId) {
    return null;
  }

  return <ClientPortal clientId={clientId} onBack={() => router.back()} />;
}
