'use client';

import React, { useState, useEffect } from 'react';
import Layout from './components/ui/Layout';
import Dashboard from './components/Dashboard';
import ClientView from './components/ClientView';
import MeetingIntelligence from './components/MeetingIntelligence';
import MeetingAnalyzer from './components/MeetingAnalyzer';
import FeedbackLoop from './components/FeedbackLoop';
import Settings from './components/Settings';
import LoginScreen from './components/LoginScreen';
import { FormsManager } from './components/FormsManager';
import WorkflowBuilder from './components/WorkflowBuilder';
import NexusCommand from './components/NexusCommand';
import NexusComposer from './components/NexusComposer';
import PersonalArea from './components/PersonalArea';
import ClientPortal from './components/ClientPortal';
import CyclesManager from './components/CyclesManager';
import { GlobalProcessor } from './components/GlobalProcessor';
import { EmailCenter } from './components/EmailCenter';
import { ToastManager } from './components/ui/ToastManager';
import { ClientProvider } from './context/ClientContext';

const App: React.FC<{ userData?: unknown }> = ({ userData }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(userData));
  const [currentView, setCurrentView] = useState('dashboard');
  const [showComposer, setShowComposer] = useState(false);
  const [selectedClientIdForComposer, setSelectedClientIdForComposer] = useState<string | null>(null);
  const [portalClientId, setPortalClientId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__CLIENT_OS_USER__ = userData;
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
    setCurrentView(view);
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
      case 'settings':
        return <Settings />;
      case 'personal':
        return <PersonalArea />;
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
        <Layout activeView={currentView} onNavigate={setCurrentView}>
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
};

export default App;
