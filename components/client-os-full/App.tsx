'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Layout from './components/ui/Layout';
import { ClientProvider } from './context/ClientContext';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { DataProvider } from '@/context/DataContext';
import type { OrganizationProfile, User } from '@/types';

// Dynamic imports for all views - reduces initial bundle size
const Dashboard = dynamic(() => import('./components/Dashboard'), { ssr: false });
const ClientView = dynamic(() => import('./components/ClientView'), { ssr: false });
const MeetingIntelligence = dynamic(() => import('./components/MeetingIntelligence'), { ssr: false });
const MeetingAnalyzer = dynamic(() => import('./components/MeetingAnalyzer'), { ssr: false });
const FeedbackLoop = dynamic(() => import('./components/FeedbackLoop'), { ssr: false });
const LoginScreen = dynamic(() => import('./components/LoginScreen'), { ssr: false });
const FormsManager = dynamic(() => import('./components/FormsManager').then(m => ({ default: m.FormsManager })), { ssr: false });
const WorkflowBuilder = dynamic(() => import('./components/WorkflowBuilder'), { ssr: false });
const NexusCommand = dynamic(() => import('./components/NexusCommand'), { ssr: false });
const NexusComposer = dynamic(() => import('./components/NexusComposer'), { ssr: false });
const ClientPortal = dynamic(() => import('./components/ClientPortal'), { ssr: false });
const CyclesManager = dynamic(() => import('./components/CyclesManager'), { ssr: false });
const GlobalProcessor = dynamic(() => import('./components/GlobalProcessor').then(m => ({ default: m.GlobalProcessor })), { ssr: false });
const EmailCenter = dynamic(() => import('./components/EmailCenter').then(m => ({ default: m.EmailCenter })), { ssr: false });
const ToastManager = dynamic(() => import('./components/ui/ToastManager').then(m => ({ default: m.ToastManager })), { ssr: false });
const MeView = dynamic(() => import('@/views/MeView').then(m => ({ default: m.MeView })), { ssr: false });
const Settings = dynamic(() => import('./components/Settings'), { ssr: false });

export default function App({
  userData,
  initialCurrentUser,
  initialOrganization,
}: {
  userData?: unknown;
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(userData));
  const [showComposer, setShowComposer] = useState(false);
  const [selectedClientIdForComposer, setSelectedClientIdForComposer] = useState<string | null>(null);
  const [portalClientId, setPortalClientId] = useState<string | null>(null);

  const basePath = useMemo(() => {
    const info = parseWorkspaceRoute(pathname);
    if (info.orgSlug && info.module === 'client') {
      return `/w/${encodeURIComponent(info.orgSlug)}/client`;
    }
    return '/client';
  }, [pathname]);

  const isHubRoute = Boolean(pathname && pathname.startsWith(`${basePath}/hub`));
  const isMeRoute = Boolean(pathname && pathname.startsWith(`${basePath}/me`));

  const initialView = useMemo(() => {
    if (isHubRoute) return 'settings';
    if (isMeRoute) return 'me';
    const tab = searchParams?.get('tab');
    const meetingId = searchParams?.get('meetingId');
    if (tab || meetingId) return 'clients';
    return 'dashboard';
  }, [isHubRoute, isMeRoute, searchParams]);

  const [currentView, setCurrentView] = useState(initialView);

  useEffect(() => {
    if (isHubRoute) return;
    const tab = searchParams?.get('tab');
    const meetingId = searchParams?.get('meetingId');
    if (!tab && !meetingId) return;
    if (currentView !== 'clients') {
      setCurrentView('clients');
    }
  }, [currentView, isHubRoute, searchParams]);

  useEffect(() => {
    if (isHubRoute && currentView !== 'settings') {
      setCurrentView('settings');
    }
  }, [currentView, isHubRoute]);

  useEffect(() => {
    if (!isHubRoute) return;
    const drawer = searchParams?.get('drawer');
    if (drawer !== 'client') return;
    router.replace(`${basePath}/hub`);
  }, [basePath, isHubRoute, router, searchParams]);

  useEffect(() => {
    if (isMeRoute && currentView !== 'me') {
      setCurrentView('me');
    }
  }, [currentView, isMeRoute]);

  useEffect(() => {
    if (!isMeRoute && currentView === 'me') {
      setCurrentView('dashboard');
    }
  }, [currentView, isMeRoute]);

  const navigate = (view: string) => {
    if (view === 'me') {
      router.push(`${basePath}/me`);
      return;
    }
    if (view === 'settings' || view === 'personal') {
      const from = pathname || basePath;
      router.push(`${basePath}/hub`);
      setCurrentView('settings');
      return;
    }
    setCurrentView(view);
  };

  useEffect(() => {
    if (currentView !== 'me') return;
    if (isMeRoute) return;
    router.push(`${basePath}/me`);
  }, [basePath, currentView, isMeRoute, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const clientWindow = window as Window & { __CLIENT_OS_USER__?: unknown };
      clientWindow.__CLIENT_OS_USER__ = userData;
      window.dispatchEvent(new CustomEvent('client-os-user-updated', { detail: userData }));
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      setIsAuthenticated(true);
    }
  }, [userData]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleCommandNavigation = (view: string) => {
    navigate(view);
  };

  const handleClientSelection = (clientId: string) => {
      setCurrentView('clients');
      window.dispatchEvent(new CustomEvent('nexus-client-select', { detail: clientId }));
      setSelectedClientIdForComposer(clientId);
  };

  const openPortal = (clientId: string) => {
      setPortalClientId(clientId);
      setCurrentView('client-portal');
  };

  // Global listener for opening portals
  useEffect(() => {
    const handlePortalOpen = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as unknown;
      if (detail === null || detail === undefined) return;
      openPortal(String(detail));
    };

    window.addEventListener('open-client-portal', handlePortalOpen);
    return () => window.removeEventListener('open-client-portal', handlePortalOpen);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientView />;
      case 'cycles':
        return <CyclesManager />;
      case 'email':
        return <EmailCenter />;
      case 'workflows':
        return <WorkflowBuilder />;
      case 'forms':
        return <FormsManager />;
      case 'feedback':
        return <FeedbackLoop />;
      case 'intelligence':
        return <MeetingIntelligence />;
      case 'analyzer':
        return <MeetingAnalyzer />;
      case 'me':
        return (
          <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
            <Suspense fallback={null}>
              <MeView
                basePathOverride={basePath}
                moduleCards={
                  basePath
                    ? [
                        {
                          title: 'הגדרות לקוחות',
                          subtitle: 'פורטל, אוטומציות וחיבורים',
                          href: `${basePath}/hub`,
                          iconId: 'settings',
                        },
                        {
                          title: 'לקוחות',
                          subtitle: 'רשימה, סטטוסים ופעולות',
                          href: `${basePath}?tab=clients`,
                          iconId: 'user',
                        },
                      ]
                    : undefined
                }
              />
            </Suspense>
          </DataProvider>
        );
      case 'settings':
        return <Settings />;
      case 'client-portal':
        return <ClientPortal clientId={portalClientId || '1'} onBack={() => setCurrentView('clients')} />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Hide main layout if we are in the client portal view (simulating a separate app)
  if (currentView === 'client-portal') {
      return (
          <ClientProvider>
            {renderView()}
            <ToastManager />
          </ClientProvider>
      );
  }

  return (
    <ClientProvider>
        <Layout activeView={currentView} onNavigate={navigate}>
          {renderView()}
        </Layout>
        
        <NexusCommand onNavigate={handleCommandNavigation} onSelectClient={handleClientSelection} />
        
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
