'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Layout from '@/components/client-os-full/components/ui/Layout';
import NexusCommand from '@/components/client-os-full/components/NexusCommand';
import NexusComposer from '@/components/client-os-full/components/NexusComposer';
import { GlobalProcessor } from '@/components/client-os-full/components/GlobalProcessor';
import { ToastManager } from '@/components/client-os-full/components/ui/ToastManager';
import { ClientProvider } from '../context/ClientContext';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { useAuth } from '@clerk/nextjs';
import { createBrowserStorageClientWithClerk } from '@/lib/supabase-browser';
import type { Client, Meeting } from '@/components/client-os-full/types';
import type { ClientOSUserData } from '@/components/client-os-full/ClientOSApp';

type ClientOsIdentity = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string | null;
};

type ClientOsOrganization = {
  id?: string | null;
  name?: string | null;
  logo?: string | null;
};

type ClientOsWindow = Window & {
  __CLIENT_OS_USER__?: ClientOSUserData;
  supabaseForOrgLookup?: ReturnType<typeof createBrowserStorageClientWithClerk>;
};

export default function ClientOsAppLayoutClient({
  children,
  orgSlug,
  userData,
  initialCurrentUser: _initialCurrentUser,
  initialOrganization: _initialOrganization,
  initialOrgId,
  initialClients,
  initialMeetings,
}: {
  children: React.ReactNode;
  orgSlug: string;
  userData: ClientOSUserData;
  initialCurrentUser?: ClientOsIdentity | null;
  initialOrganization?: ClientOsOrganization | null;
  initialOrgId: string;
  initialClients?: Client[];
  initialMeetings?: Meeting[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { getToken } = useAuth();

  const supabase = useMemo(() => {
    return createBrowserStorageClientWithClerk(async () => {
      try {
        return await getToken({ template: 'supabase' });
      } catch {
        try {
          return await getToken();
        } catch {
          return null;
        }
      }
    });
  }, [getToken]);

  const [showComposer, setShowComposer] = useState(false);
  const [selectedClientIdForComposer, setSelectedClientIdForComposer] = useState<string | null>(null);

  const basePath = useMemo(() => {
    const info = parseWorkspaceRoute(pathname);
    if (info.orgSlug && info.module === 'client') {
      return `/w/${encodeURIComponent(info.orgSlug)}/client`;
    }
    return `/w/${encodeURIComponent(orgSlug)}/client`;
  }, [orgSlug, pathname]);

  const activeView = useMemo(() => {
    if (!pathname) return 'dashboard';
    if (!pathname.startsWith(basePath)) return 'dashboard';

    const tail = pathname.slice(basePath.length);
    const seg = tail
      .split('/')
      .filter(Boolean)
      .map(String)[0];

    if (!seg) return 'dashboard';
    if (seg === 'hub') return 'settings';
    return seg;
  }, [basePath, pathname]);

  const isClientPortalRoute = useMemo(() => {
    return Boolean(pathname && pathname.startsWith(`${basePath}/client-portal`));
  }, [basePath, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const clientWindow = window as ClientOsWindow;
    clientWindow.__CLIENT_OS_USER__ = userData;
    window.dispatchEvent(new CustomEvent('client-os-user-updated', { detail: userData }));
  }, [userData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const clientWindow = window as ClientOsWindow;
    if (clientWindow.supabaseForOrgLookup) return;
    clientWindow.supabaseForOrgLookup = supabase;
  }, [supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePortalOpen = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const clientId = event.detail as unknown;
      if (!clientId) return;
      router.push(`${basePath}/client-portal?clientId=${encodeURIComponent(String(clientId))}`);
    };

    const handleComposerOpen = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as { clientId?: string | number } | string | number | null | undefined;
      const clientId = typeof detail === 'object' && detail !== null ? detail.clientId ?? null : detail ?? null;
      if (clientId !== null && clientId !== undefined) {
        setSelectedClientIdForComposer(String(clientId));
      }
      setShowComposer(true);
    };

    window.addEventListener('open-client-portal', handlePortalOpen);
    window.addEventListener('open-nexus-composer', handleComposerOpen);
    return () => {
      window.removeEventListener('open-client-portal', handlePortalOpen);
      window.removeEventListener('open-nexus-composer', handleComposerOpen);
    };
  }, [basePath, router]);

  const navigate = (view: string) => {
    if (view === 'me') {
      router.push(`${basePath}/me`);
      return;
    }

    if (view === 'settings') {
      router.push(`${basePath}/hub`);
      return;
    }

    router.push(`${basePath}/${encodeURIComponent(view)}`);
  };

  const handleClientSelection = (clientId: string) => {
    router.push(`${basePath}/clients`);
    window.dispatchEvent(new CustomEvent('nexus-client-select', { detail: clientId }));
    setSelectedClientIdForComposer(clientId);
  };

  if (isClientPortalRoute) {
    return (
      <ClientProvider
        initialOrgId={initialOrgId}
        initialClients={initialClients}
        initialMeetings={initialMeetings}
      >
        {children}
        <ToastManager />
      </ClientProvider>
    );
  }

  return (
    <ClientProvider
      initialOrgId={initialOrgId}
      initialClients={initialClients}
      initialMeetings={initialMeetings}
    >
      <Layout activeView={activeView} onNavigate={navigate}>
        {children}
      </Layout>

      <NexusCommand onNavigate={navigate} onSelectClient={handleClientSelection} />

      <NexusComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        preselectedClientId={selectedClientIdForComposer}
      />

      <GlobalProcessor />
      <ToastManager />
    </ClientProvider>
  );
}
