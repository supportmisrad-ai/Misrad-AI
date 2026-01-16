'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { getNexusBasePath, getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import NexusCard from '@/components/shared/NexusCard';
import { CreditCard, GraduationCap, Megaphone, Target } from 'lucide-react';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { LockedModuleUpgradeModal } from '@/components/shared/LockedModuleUpgradeModal';

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
  const router = useRouter();
  const basePath = getNexusBasePath(pathname);
  const relative = pathname?.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname || '/';
  const orgSlug = getWorkspaceOrgIdFromPathname(pathname);

  const [locked, setLocked] = React.useState<OSModuleKey | null>(null);

  const kpis = (initialOwnerDashboard as any)?.kpis ?? null;
  const entitlements = (initialOwnerDashboard as any)?.entitlements ?? kpis?.entitlements ?? null;
  const systemMetric = kpis?.system?.leadsTotal ?? null;
  const socialMetric = kpis?.social?.postsScheduled ?? kpis?.social?.postsTotal ?? null;
  const financeMetric = kpis?.finance?.totalHours ?? kpis?.finance?.totalMinutes ?? null;
  const clientMetric = kpis?.client?.clientsTotal ?? null;

  const openModule = (module: OSModuleKey) => {
    if (!orgSlug) return;
    if (module !== 'nexus' && entitlements && !entitlements[module]) {
      setLocked(module);
      return;
    }
    router.push(`/w/${encodeURIComponent(orgSlug)}/${module}`);
  };

  const render = () => {
    switch (relative) {
      case '/':
        return (
          <Layout>
            <ScreenGuard id="dashboard">
              <div className="px-6 pt-6">
                <div className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Lobby</div>
                <h1 className="text-3xl font-black text-slate-900 mt-2">מפקדה</h1>
                <p className="text-sm text-slate-600 mt-2">מרכז שליטה שמחבר את כל המודולים יחד</p>

                <div className="mt-10">
                  <div className="text-sm font-black text-slate-700 mb-4">Power Tiles</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <NexusCard
                      title="System"
                      subtitle="מכונת המכירות"
                      icon={Target}
                      metric={systemMetric}
                      metricLabel="לידים"
                      onClickAction={() => openModule('system')}
                      className="min-h-[132px]"
                    />

                    <NexusCard
                      title="Finance"
                      subtitle="שומר הרווחים"
                      icon={CreditCard}
                      metric={financeMetric}
                      metricLabel={kpis?.finance?.locked ? 'אין הרשאה' : 'שעות'}
                      onClickAction={() => openModule('finance')}
                      className="min-h-[132px]"
                    />

                    <NexusCard
                      title="Client"
                      subtitle="פורטל הצלחת לקוח"
                      icon={GraduationCap}
                      metric={clientMetric}
                      metricLabel="לקוחות"
                      onClickAction={() => openModule('client')}
                      className="min-h-[132px]"
                    />

                    <NexusCard
                      title="Social"
                      subtitle="שיווק שמייצר סמכות"
                      icon={Megaphone}
                      metric={socialMetric}
                      metricLabel="מתוזמנים"
                      onClickAction={() => openModule('social')}
                      className="min-h-[132px]"
                    />
                  </div>
                </div>

                <LockedModuleUpgradeModal module={locked} onCloseAction={() => setLocked(null)} />
              </div>
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
              <MeView basePathOverride={basePath} />
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
