'use client';

import React, { useEffect, useState } from 'react';
import Layout from './ui/Layout';
import Dashboard from './Dashboard';
import ClientView from './ClientView';
import ClientPortal from '@/components/client-portal/components/ClientPortal';
import { ClientProvider } from '@/components/client-portal/context/ClientContext';
import { ToastManager } from '@/components/client-portal/components/ui/ToastManager';

const DEFAULT_VIEW = 'dashboard';

const ClientOSAdminApp: React.FC = () => {
  const [currentView, setCurrentView] = useState(DEFAULT_VIEW);
  const [portalClientId, setPortalClientId] = useState<string | null>(null);

  const openPortal = (clientId: string) => {
    setPortalClientId(clientId);
    setCurrentView('client-portal');
  };

  useEffect(() => {
    const handlePortalOpen = (e: any) => openPortal(e.detail);
    window.addEventListener('open-client-portal', handlePortalOpen);
    return () => window.removeEventListener('open-client-portal', handlePortalOpen);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientView />;
      case 'client-portal':
        return <ClientPortal clientId={portalClientId || '1'} onBack={() => setCurrentView('clients')} />;
      default:
        return <Dashboard />;
    }
  };

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
      <Layout activeView={currentView} onNavigate={setCurrentView}>
        {renderView()}
      </Layout>
      <ToastManager />
    </ClientProvider>
  );
};

export default ClientOSAdminApp;
