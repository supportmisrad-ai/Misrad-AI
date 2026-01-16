'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DataProvider } from '@/context/DataContext';
import { Layout } from '@/components/Layout';
import { ScreenGuard } from '@/components/ScreenGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { SystemLayout } from '@/components/system/SystemLayout';
import { DashboardView } from '@/views/DashboardView';
import { MeView } from '@/views/MeView';
import { TasksView } from '@/views/TasksView';
import { CalendarView } from '@/views/CalendarView';
import { ClientsView } from '@/views/ClientsView';
import { TeamView } from '@/views/TeamView';
import { ReportsView } from '@/views/ReportsView';
import { AssetsView } from '@/views/AssetsView';
import GlobalProfileHub from '@/components/profile/GlobalProfileHub';
import { RecycleBinView } from '@/views/RecycleBinView';
import { IntelligenceView } from '@/views/IntelligenceView';
import { ModuleGuard } from '@/components/ModuleGuard';
import { SaaSAdminView } from '@/views/SaaSAdminView';
import { SalesDashboard } from '@/views/SalesDashboard';
import { SalesPipeline } from '@/views/SalesPipeline';
import { SalesTargets } from '@/views/SalesTargets';
import { getNexusBasePath } from '@/lib/os/nexus-routing';

export function NexusWorkspaceApp({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialOwnerDashboard?: any;
} = {}) {
  const pathname = usePathname();
  const basePath = getNexusBasePath(pathname);
  const relative = pathname?.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname || '/';

  const render = () => {
    switch (relative) {
      case '/':
        return (
          <Layout>
            <ScreenGuard id="dashboard">
              <MeView />
            </ScreenGuard>
          </Layout>
        );
      case '/dashboard':
        return (
          <Layout>
            <ScreenGuard id="dashboard">
              <DashboardView initialOwnerDashboard={initialOwnerDashboard} />
            </ScreenGuard>
          </Layout>
        );
      case '/tasks':
        return (
          <Layout>
            <ScreenGuard id="tasks">
              <TasksView />
            </ScreenGuard>
          </Layout>
        );
      case '/calendar':
        return (
          <Layout>
            <ScreenGuard id="calendar">
              <CalendarView />
            </ScreenGuard>
          </Layout>
        );
      case '/clients':
        return (
          <Layout>
            <ScreenGuard id="clients">
              <ClientsView />
            </ScreenGuard>
          </Layout>
        );
      case '/team':
        return (
          <Layout>
            <ScreenGuard id="team">
              <ModuleGuard moduleId="team">
                <TeamView />
              </ModuleGuard>
            </ScreenGuard>
          </Layout>
        );
      case '/users':
        return (
          <Layout>
            <ScreenGuard id="team">
              <ModuleGuard moduleId="team">
                <TeamView />
              </ModuleGuard>
            </ScreenGuard>
          </Layout>
        );
      case '/reports':
        return (
          <Layout>
            <ScreenGuard id="reports">
              <ModuleGuard moduleId="finance">
                <ReportsView />
              </ModuleGuard>
            </ScreenGuard>
          </Layout>
        );
      case '/assets':
        return (
          <Layout>
            <ScreenGuard id="assets">
              <AssetsView />
            </ScreenGuard>
          </Layout>
        );
      case '/trash':
        return (
          <Layout>
            <ScreenGuard id="trash">
              <RecycleBinView />
            </ScreenGuard>
          </Layout>
        );
      case '/settings':
        return (
          <Layout>
            <GlobalProfileHub defaultOrigin="nexus" defaultDrawer="profile" />
          </Layout>
        );
      case '/me':
        return (
          <Layout>
            <ScreenGuard id="dashboard">
              <MeView />
            </ScreenGuard>
          </Layout>
        );
      case '/hub':
        return (
          <Layout>
            <GlobalProfileHub defaultOrigin="nexus" defaultDrawer="profile" />
          </Layout>
        );
      case '/brain':
        return (
          <Layout>
            <ScreenGuard id="brain">
              <IntelligenceView />
            </ScreenGuard>
          </Layout>
        );
      case '/admin':
        return (
          <AdminGuard>
            <SaaSAdminView />
          </AdminGuard>
        );
      case '/sales':
        return (
          <SystemLayout>
            <SalesDashboard />
          </SystemLayout>
        );
      case '/sales/pipeline':
        return (
          <SystemLayout>
            <SalesPipeline />
          </SystemLayout>
        );
      case '/sales/targets':
        return (
          <SystemLayout>
            <SalesTargets />
          </SystemLayout>
        );
      default:
        return (
          <Layout>
            <ScreenGuard id="dashboard">
              <MeView />
            </ScreenGuard>
          </Layout>
        );
    }
  };

  return (
    <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
      {render()}
    </DataProvider>
  );
}
