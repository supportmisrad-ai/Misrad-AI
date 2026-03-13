'use client';

import React, { useMemo, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { DataProvider } from '@/context/DataContext';
import { Layout } from '@/components/Layout';
import { ScreenGuard } from '@/components/ScreenGuard';
import { AdminGuard } from '@/components/AdminGuard';
import { ModuleGuard } from '@/components/ModuleGuard';
import { getNexusBasePath } from '@/lib/os/nexus-routing';
import type { OrganizationProfile, User, Task } from '@/types';

// Dynamic imports for all views - reduces initial bundle size by ~60%
const DashboardView = dynamic(() => import('../../views/DashboardView').then(m => m.DashboardView), { ssr: false });
const TasksView = dynamic(() => import('../../views/TasksView').then(m => m.TasksView), { ssr: false });
const CalendarView = dynamic(() => import('../../views/CalendarView').then(m => m.CalendarView), { ssr: false });
const ClientsView = dynamic(() => import('../../views/ClientsView').then(m => m.ClientsView), { ssr: false });
const TeamView = dynamic(() => import('../../views/TeamView').then(m => m.TeamView), { ssr: false });
const ReportsView = dynamic(() => import('../../views/ReportsView').then(m => m.ReportsView), { ssr: false });
const AssetsView = dynamic(() => import('../../views/AssetsView').then(m => m.AssetsView), { ssr: false });
const SettingsView = dynamic(() => import('../../views/SettingsView').then(m => m.SettingsView), { ssr: false });
const MeView = dynamic(() => import('../../views/MeView').then(m => m.MeView), { ssr: false });
const RecycleBinView = dynamic(() => import('../../views/RecycleBinView').then(m => m.RecycleBinView), { ssr: false });
const IntelligenceView = dynamic(() => import('../../views/IntelligenceView').then(m => m.IntelligenceView), { ssr: false });
const AttendanceReportsView = dynamic(() => import('../../views/AttendanceReportsView').then(m => m.AttendanceReportsView), { ssr: false });

export function NexusWorkspaceApp({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
  initialOnboardingTemplateKey,
  initialBillingItems,
  initialTasks,
}: {
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
  initialOwnerDashboard?: unknown;
  initialOnboardingTemplateKey?: string | null;
  initialBillingItems?: unknown[] | null;
  initialTasks?: Task[];
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
              <DashboardView
                initialOwnerDashboard={initialOwnerDashboard}
                initialOnboardingTemplateKey={initialOnboardingTemplateKey}
                initialBillingItems={initialBillingItems}
              />
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
            <Suspense fallback={null}>
              <MeView />
            </Suspense>
          </Layout>
        );
      case '/attendance-reports':
        return (
          <Layout>
            <ScreenGuard id="attendance-reports">
              <AttendanceReportsView />
            </ScreenGuard>
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
      default:
        return (
          <Layout>
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-6" dir="rtl">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">🔍</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">העמוד לא נמצא</h2>
              <p className="text-slate-500 mb-6 max-w-xs">הנתיב שחיפשת לא קיים במערכת.</p>
              <button
                onClick={() => {
                  const p = pathname || '';
                  const b = getNexusBasePath(p);
                  window.location.href = b || '/';
                }}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                חזרה ללוח הבקרה
              </button>
            </div>
          </Layout>
        );
    }
  };

  const content = useMemo(() => render(), [relative, initialOwnerDashboard, initialOnboardingTemplateKey, initialBillingItems]);

  return (
    <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization} initialTasks={initialTasks}>
      <div 
        key={relative}
        className="flex-1 min-h-0 animate-fade-in"
      >
        {content}
      </div>
    </DataProvider>
  );
}
