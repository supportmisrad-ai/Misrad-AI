'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, Bell, Brain, Building2, CreditCard, FileText, Flag, PieChart, RefreshCw, Settings, Trash2, TrendingUp, UserPlus, Users, Wrench, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { joinPath } from '@/lib/os/social-routing';
import { sendNotification } from '@/app/actions/admin-notifications';
import { Skeleton } from '@/components/ui/skeletons';
import AddUserModal from './modals/AddUserModal';
import { 
  AdminPanelLayout,
  PulseTab,
  OverviewTab,
  UsersTab,
  ClientsTab,
  PaymentsTab,
  NotificationsTab,
  RecycleTab,
  IntelligenceTab,
  FlagsTab,
  OrganizationsTab,
  SystemTab,
  MaintenanceTab,
  CMSTab,
  NavigationTab,
} from './admin-panel';
import { AdminTab } from './admin-panel/types';
import { useAdminPanelController } from './admin-panel/useAdminPanelController';

export default function AdminPanel() {
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

  // Show loading while checking role
  if (isCheckingRole) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-slate-700 font-bold">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center p-12 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl max-w-md border border-indigo-100">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-4">גישה נדחתה</h2>
          <p className="text-slate-600 mb-6">אין לך הרשאה לגשת לפאנל ניהול המערכת.</p>
          <button
            onClick={() => router.push(joinPath(basePath, '/dashboard'))}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
          >
            חזור לדף הבית
          </button>
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
    { id: 'system', label: 'מצב מערכת', icon: Activity },
    { id: 'maintenance', label: 'תחזוקה', icon: Wrench },
    { id: 'cms', label: 'תוכן האתר', icon: FileText },
    { id: 'navigation', label: 'תפריט ניווט', icon: Settings },
  ];

  return (
    <AdminPanelLayout
      activeTab={activeTab}
      tabs={tabs}
      onTabChange={(tab) => setActiveTab(tab)}
      onBackToDashboard={() => router.push(joinPath(basePath, '/dashboard'))}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'pulse' && (
          <PulseTab key="pulse" liveKPIs={liveKPIs} metrics={metrics} />
        )}
        {activeTab === 'overview' && (
          <OverviewTab key="overview" metrics={metrics} />
        )}
        {activeTab === 'users' && (
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
        )}
        {activeTab === 'clients' && (
          <ClientsTab
            key="clients"
            filteredClients={filteredClients}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onImpersonate={handleImpersonate}
            onToggleAccess={handleToggleAccess}
            onOpenWorkspace={(clientId) => {
              setActiveClientId(clientId);
              router.push(joinPath(basePath, '/workspace'));
              addToast('פתח את סביבת העבודה של הלקוח', 'success');
            }}
            addToast={addToast}
          />
        )}
        {activeTab === 'organizations' && (
          <OrganizationsTab key="organizations" />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab
            key="payments"
            payments={payments}
            addToast={addToast}
            onRefresh={() => controller.loadPayments()}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab
            key="notifications"
            notificationHistory={notificationHistory}
            onSendNotification={() => setIsNotificationModalOpen(true)}
            onPrevPage={() => setNotificationsOffset((v) => Math.max(0, v - pageSize))}
            onNextPage={() => setNotificationsOffset((v) => v + pageSize)}
            disablePrev={notificationsOffset === 0}
            disableNext={notificationHistory.length < pageSize}
          />
        )}
        {activeTab === 'recycle' && (
          <RecycleTab
            key="recycle"
            deletedItems={controller.deletedItems}
            onRefresh={() => controller.loadDeletedItems()}
            addToast={addToast}
          />
        )}
        {activeTab === 'intelligence' && (
          <IntelligenceTab
            key="intelligence"
            analytics={controller.analytics}
            onRefresh={() => controller.loadAnalytics()}
            addToast={addToast}
          />
        )}
        {activeTab === 'flags' && (
          <FlagsTab
            key="flags"
            featureFlags={controller.featureFlags}
            setFeatureFlags={controller.setFeatureFlags}
            onRefresh={() => controller.loadFeatureFlags()}
            addToast={addToast}
          />
        )}
        {activeTab === 'maintenance' && (
          <MaintenanceTab
            key="maintenance"
            maintenanceInfo={maintenanceInfo}
            onRefresh={() => controller.loadMaintenanceInfo()}
            addToast={addToast}
          />
        )}
        {activeTab === 'system' && (
          <SystemTab
            key="system"
            apiHealth={apiHealth}
            auditLog={auditLog}
            onPrevAuditPage={() => setAuditOffset((v) => Math.max(0, v - pageSize))}
            onNextAuditPage={() => setAuditOffset((v) => v + pageSize)}
            disablePrevAudit={auditOffset === 0}
            disableNextAudit={auditLog.length < pageSize}
          />
        )}
        {activeTab === 'cms' && (
          <CMSTab
            key="cms"
            siteContent={siteContent}
            onRefresh={() => controller.loadSiteContent()}
            addToast={addToast}
          />
        )}
        {activeTab === 'navigation' && (
          <NavigationTab
            key="navigation"
            navigationItems={navigationItems}
            setNavigationItems={setNavigationItems}
            onRefresh={() => controller.loadNavigationMenu()}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsEditProfileModalOpen(false)}>
          <div className="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900">עריכת פרופיל משתמש</h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XCircle size={24} className="text-slate-600" />
              </button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            handleSaveUserProfile({
              name: String(formData.get('name') ?? ''),
              email: String(formData.get('email') ?? ''),
              role: String(formData.get('role') ?? ''),
              clientId: String(formData.get('clientId') ?? ''),
              status: String(formData.get('status') ?? ''),
            });
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">שם</label>
              <input
                type="text"
                name="name"
                defaultValue={editingUser.name}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">אימייל</label>
              <input
                type="email"
                name="email"
                defaultValue={editingUser.email}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">תפקיד</label>
              <select
                name="role"
                defaultValue={editingUser.role}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
              >
                <option value="admin">מנהל</option>
                <option value="account_manager">מנהל חשבונות</option>
                <option value="content_creator">יוצר תוכן</option>
                <option value="designer">מעצב</option>
                <option value="client">לקוח</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">חבילה</label>
              <select
                name="plan"
                defaultValue={editingUser.plan}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
              >
                <option value="free">חינם</option>
                <option value="pro">PRO</option>
              </select>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl font-black hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                שמור שינויים
              </button>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition-all"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Send Notification Modal */}
      {isNotificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsNotificationModalOpen(false)}>
          <div className="bg-white rounded-3xl p-10 max-w-2xl w-full" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900">שליחת התראה חדשה</h3>
              <button onClick={() => setIsNotificationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <XCircle size={24} className="text-slate-600" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const result = await sendNotification(
                  String(formData.get('targetType') ?? '') as 'user' | 'client' | 'all',
                  formData.get('targetId') ? String(formData.get('targetId')) : null,
                  String(formData.get('title') ?? ''),
                  String(formData.get('message') ?? ''),
                  String(formData.get('type') ?? '') as 'info' | 'success' | 'warning' | 'error'
                );
                if (result.success) {
                  addToast('התראה נשלחה בהצלחה', 'success');
                  setIsNotificationModalOpen(false);
                } else {
                  addToast(result.error || 'שגיאה בשליחת התראה', 'error');
                }
              }}
              className="flex flex-col gap-6"
            >
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">סוג יעד</label>
                <select
                  name="targetType"
                  defaultValue="all"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                >
                  <option value="all">כל המשתמשים</option>
                  <option value="user">משתמש ספציפי</option>
                  <option value="client">לקוח ספציפי</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">Target ID</label>
                <input
                  type="text"
                  name="targetId"
                  placeholder="(אופציונלי)"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">כותרת</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">הודעה</label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2">סוג התראה</label>
                <select
                  name="type"
                  defaultValue="info"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-indigo-400"
                >
                  <option value="info">מידע</option>
                  <option value="warning">אזהרה</option>
                  <option value="error">שגיאה</option>
                  <option value="success">הצלחה</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl font-black hover:from-indigo-600 hover:to-purple-600 transition-all"
                >
                  שלח התראה
                </button>
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition-all"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={() => {
          loadAllUsers();
          addToast('משתמש נוצר בהצלחה', 'success');
        }}
      />
    </AdminPanelLayout>
  );
}

