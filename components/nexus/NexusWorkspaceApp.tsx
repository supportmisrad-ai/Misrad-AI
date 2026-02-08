'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DataProvider } from '@/context/DataContext';
import { Layout } from '@/components/Layout';
import { ScreenGuard } from '@/components/ScreenGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { SystemLayout } from '@/components/system/SystemLayout';
import { DashboardView } from '@/views/DashboardView';
import { TasksView } from '@/views/TasksView';
import { CalendarView } from '@/views/CalendarView';
import { ClientsView } from '@/views/ClientsView';
import { TeamView } from '@/views/TeamView';
import { ReportsView } from '@/views/ReportsView';
import { AssetsView } from '@/views/AssetsView';
import { SettingsView } from '@/views/SettingsView';
import { MeView } from '@/views/MeView';
import { RecycleBinView } from '@/views/RecycleBinView';
import { IntelligenceView } from '@/views/IntelligenceView';
import { ModuleGuard } from '@/components/ModuleGuard';
import { SalesDashboard } from '@/views/SalesDashboard';
import { SalesPipeline } from '@/views/SalesPipeline';
import { SalesTargets } from '@/views/SalesTargets';
import { getNexusBasePath } from '@/lib/os/nexus-routing';
import type { OrganizationProfile, User } from '@/types';

export function NexusWorkspaceApp({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
}: {
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
  initialOwnerDashboard?: unknown;
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
              <TeamView />
            </ScreenGuard>
          </Layout>
        );
      case '/users':
        return (
          <Layout>
            <ScreenGuard id="team">
              <TeamView />
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
            <SettingsView />
          </Layout>
        );
      case '/me':
        return (
          <Layout>
            <MeView />
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
            <div className="p-6" dir="rtl">
              <div className="max-w-xl rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="text-lg font-black text-slate-900">מסוף ניהול</div>
                <div className="text-sm text-slate-600 mt-2">
                  מסוף הניהול המלא עבר לנתיב החדש.
                </div>
                <div className="mt-4">
                  <Link
                    href="/app/admin"
                    className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
                  >
                    מעבר למסוף החדש
                  </Link>
                </div>
              </div>
            </div>
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
              <DashboardView initialOwnerDashboard={initialOwnerDashboard} />
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
