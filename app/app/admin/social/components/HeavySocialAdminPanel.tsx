'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  SquareActivity,
  TriangleAlert,
  Bell,
  Brain,
  Building2,
  CreditCard,
  FileText,
  Flag,
  MoreHorizontal,
  PieChart,
  RefreshCw,
  Settings,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { joinPath } from '@/lib/os/social-routing';
import { Skeleton } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import AddUserModal from '@/components/social/modals/AddUserModal';
import AdminTabs from '@/components/admin/AdminTabs';
import PulseTab from '@/components/social/admin-panel/tabs/PulseTab';
import OverviewTab from '@/components/social/admin-panel/tabs/OverviewTab';
import UsersTab from '@/components/social/admin-panel/tabs/UsersTab';
import ClientsTab from '@/components/social/admin-panel/tabs/ClientsTab';
import PaymentsTab from '@/components/social/admin-panel/tabs/PaymentsTab';
import NotificationsTab from '@/components/social/admin-panel/tabs/NotificationsTab';
import RecycleTab from '@/components/social/admin-panel/tabs/RecycleTab';
import IntelligenceTab from '@/components/social/admin-panel/tabs/IntelligenceTab';
import FlagsTab from '@/components/social/admin-panel/tabs/FlagsTab';
import OrganizationsTab from '@/components/social/admin-panel/tabs/OrganizationsTab';
import SystemTab from '@/components/social/admin-panel/tabs/SystemTab';
import MaintenanceTab from '@/components/social/admin-panel/tabs/MaintenanceTab';
import CMSTab from '@/components/social/admin-panel/tabs/CMSTab';
import NavigationTab from '@/components/social/admin-panel/tabs/NavigationTab';
import { AdminTab } from '@/components/social/admin-panel/types';
import { useAdminPanelController } from '@/components/social/admin-panel/useAdminPanelController';

function HeavySocialAdminPanelInner() {
  const router = useRouter();
  const { addToast, setActiveClientId } = useApp();
  const controller = useAdminPanelController();

  const {
    basePath,
    hasAccess,
    isCheckingRole,
    activeTab,
    setActiveTab,
    isRefreshing,
    metrics,
    liveKPIs,
    allUsers,
    filteredClients,
    searchQuery,
    setSearchQuery,
    userSearchQuery,
    setUserSearchQuery,
    userFilter,
    setUserFilter,
    handleImpersonate,
    handleToggleAccess,
    loadAllUsers,
    handleEditUserProfile,
    payments,
    pendingVerificationCount,
    notificationHistory,
    setNotificationsOffset,
    notificationsOffset,
    auditLog,
    setAuditOffset,
    auditOffset,
    apiHealth,
    maintenanceInfo,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    editingUser,
    setEditingUser,
    handleSaveUserProfile,
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    isAddUserModalOpen,
    setIsAddUserModalOpen,
    siteContent,
    navigationItems,
    setNavigationItems,
    handleRefresh,
    pageSize,
  } = controller;

  if (isCheckingRole) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <div className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-slate-700 font-bold">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <div className="text-center p-12 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl max-w-md border border-slate-200">
          <TriangleAlert className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-4">גישה נדחתה</h2>
          <p className="text-slate-600 mb-6">אין לך הרשאה לגשת לפאנל ניהול המערכת.</p>
          <Button
            onClick={() => router.push(joinPath(basePath, '/dashboard'))}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md"
            type="button"
          >
            חזור לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: any; badgeCount?: number }> = [
    { id: 'pulse', label: 'סקירה כללית', icon: PieChart },
    { id: 'overview', label: 'לוח בקרה', icon: TrendingUp },
    { id: 'users', label: 'משתמשים', icon: UserPlus },
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'organizations', label: 'ארגונים', icon: Building2 },
    { id: 'payments', label: 'תשלומים', icon: CreditCard, badgeCount: pendingVerificationCount },
    { id: 'notifications', label: 'התראות', icon: Bell },
    { id: 'recycle', label: 'פריטים שנמחקו', icon: Trash2 },
    { id: 'intelligence', label: 'ניתוחים', icon: Brain },
    { id: 'flags', label: 'הגדרות', icon: Flag },
    { id: 'system', label: 'מצב מערכת', icon: SquareActivity },
    { id: 'maintenance', label: 'תחזוקה', icon: Wrench },
    { id: 'cms', label: 'תוכן האתר', icon: FileText },
    { id: 'navigation', label: 'תפריט ניווט', icon: Settings },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-2xl font-black text-slate-900">סושיאל · ניהול מתקדם</div>
          <div className="text-sm font-bold text-slate-500 mt-1">לוח ניהול גלובלי מתקדם (מכסות/תשלומים/מערכת/תוכן).</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button
            type="button"
            onClick={handleRefresh}
            variant="outline"
            className="gap-2 px-4 py-3"
            title="רענון"
          >
            <RefreshCw size={16} className={isRefreshing ? 'opacity-60' : undefined} />
            <span className="hidden sm:inline">רענון</span>
          </Button>
          <Button
            type="button"
            onClick={() => router.push(joinPath(basePath, '/dashboard'))}
            variant="outline"
            className="gap-2 px-4 py-3"
            title="לוח הבקרה"
          >
            <MoreHorizontal size={16} />
            <span className="hidden sm:inline">לוח הבקרה</span>
          </Button>
        </div>
      </div>

      <AdminTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={(next) => setActiveTab(next as AdminTab)}
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'pulse' ? <PulseTab key="pulse" liveKPIs={liveKPIs ?? {}} metrics={metrics} /> : null}
          {activeTab === 'overview' ? <OverviewTab key="overview" metrics={metrics} /> : null}

          {activeTab === 'users' ? (
            <UsersTab
              key="users"
              allUsers={allUsers}
              userSearchQuery={userSearchQuery}
              setUserSearchQuery={setUserSearchQuery}
              userFilter={userFilter}
              setUserFilter={setUserFilter}
              onAddUser={() => setIsAddUserModalOpen(true)}
              onEditUser={handleEditUserProfile}
              onRefresh={loadAllUsers}
              addToast={addToast}
            />
          ) : null}

          {activeTab === 'clients' ? (
            <ClientsTab
              key="clients"
              filteredClients={filteredClients}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onImpersonate={handleImpersonate}
              onToggleAccess={handleToggleAccess}
              onOpenWorkspace={(clientId: string) => {
                setActiveClientId(clientId);
                router.push(joinPath(basePath, '/workspace'));
                addToast('פתח את סביבת העבודה של הלקוח', 'success');
              }}
              addToast={addToast}
            />
          ) : null}

          {activeTab === 'organizations' ? <OrganizationsTab key="organizations" /> : null}

          {activeTab === 'payments' ? (
            <PaymentsTab key="payments" payments={payments} addToast={addToast} onRefresh={() => controller.loadPayments()} />
          ) : null}

          {activeTab === 'notifications' ? (
            <NotificationsTab
              key="notifications"
              notificationHistory={notificationHistory}
              onSendNotification={() => setIsNotificationModalOpen(true)}
              onPrevPage={() => setNotificationsOffset((v: number) => Math.max(0, v - pageSize))}
              onNextPage={() => setNotificationsOffset((v: number) => v + pageSize)}
              disablePrev={notificationsOffset === 0}
              disableNext={notificationHistory.length < pageSize}
            />
          ) : null}

          {activeTab === 'recycle' ? (
            <RecycleTab key="recycle" deletedItems={controller.deletedItems} onRefresh={() => controller.loadDeletedItems()} addToast={addToast} />
          ) : null}

          {activeTab === 'intelligence' ? (
            <IntelligenceTab key="intelligence" analytics={controller.analytics} onRefresh={() => controller.loadAnalytics()} addToast={addToast} />
          ) : null}

          {activeTab === 'flags' ? (
            <FlagsTab
              key="flags"
              featureFlags={controller.featureFlags}
              setFeatureFlags={controller.setFeatureFlags}
              onRefresh={() => controller.loadFeatureFlags()}
              addToast={addToast}
            />
          ) : null}

          {activeTab === 'maintenance' ? (
            <MaintenanceTab key="maintenance" maintenanceInfo={maintenanceInfo} onRefresh={() => controller.loadMaintenanceInfo()} addToast={addToast} />
          ) : null}

          {activeTab === 'system' ? (
            <SystemTab
              key="system"
              apiHealth={apiHealth}
              auditLog={auditLog}
              onPrevAuditPage={() => setAuditOffset((v: number) => Math.max(0, v - pageSize))}
              onNextAuditPage={() => setAuditOffset((v: number) => v + pageSize)}
              disablePrevAudit={auditOffset === 0}
              disableNextAudit={auditLog.length < pageSize}
            />
          ) : null}

          {activeTab === 'cms' ? (
            <CMSTab key="cms" siteContent={siteContent} onRefresh={() => controller.loadSiteContent()} addToast={addToast} />
          ) : null}

          {activeTab === 'navigation' ? (
            <NavigationTab
              key="navigation"
              navigationItems={navigationItems}
              setNavigationItems={setNavigationItems}
              onRefresh={() => controller.loadNavigationMenu()}
              addToast={addToast}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={() => {
          loadAllUsers();
          addToast('משתמש נוצר בהצלחה', 'success');
        }}
      />
    </div>
  );
}

export default function HeavySocialAdminPanel() {
  return (
    <AppProvider>
      <HeavySocialAdminPanelInner />
    </AppProvider>
  );
}
