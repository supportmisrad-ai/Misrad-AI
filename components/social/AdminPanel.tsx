'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, DollarSign, Users, Zap, Activity, ArrowRight, RefreshCw, Key, Wallet, PieChart, Eye, Lock, Unlock, Settings, Cpu, AlertTriangle, UserPlus, Bell, Wrench, CreditCard, FileText, Trash2, RotateCcw, Brain, Flag, TrendingUp, Mail, Search, Filter, Edit, Ban, Gift, AlertCircle, CheckCircle2, XCircle, MessageSquare, Building2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { GlobalSystemMetrics, ClientStatus, UserRole } from '@/types/social';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { 
  getSystemMetrics, 
  updateClientStatus, 
  toggleClientAccess, 
  refreshSystemData,
  getAPIHealthStatus,
  getSecurityAuditLog,
  impersonateUser
} from '@/app/actions/admin';
import {
  getLiveKPIs,
  getAllUsers,
  banUser,
  grantProAccess,
  getDeletedItems,
  restoreDeletedItem,
  hardDeleteItem,
  getFeatureUsageAnalytics,
  getFeatureFlags,
  updateFeatureFlags,
  sendChurnEmail,
} from '@/app/actions/admin-cockpit';
import {
  getAllPayments,
  updatePaymentOrderStatus,
  updateInvoiceStatus,
} from '@/app/actions/admin-payments';
import {
  sendNotification,
  getNotificationHistory,
} from '@/app/actions/admin-notifications';
import {
  getMaintenanceInfo,
  createBackup,
  runSystemCleanup,
  updateSystemSettings,
} from '@/app/actions/admin-maintenance';
import {
  getUserDetails,
  updateUserProfile,
} from '@/app/actions/admin-users';
import {
  getAllSiteContent,
  bulkUpdateSiteContent,
} from '@/app/actions/admin-site-content';
import {
  getAllNavigationItems,
  updateNavigationMenu,
} from '@/app/actions/admin-navigation';
import { canAccessAdminPanel } from '@/lib/rbac';
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

export default function AdminPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);
  const { clients, addToast, setClients, userRole, isCheckingRole, setActiveClientId } = useApp();
  const hasAccess = canAccessAdminPanel(userRole);
  const [activeTab, setActiveTab] = useState<'pulse' | 'overview' | 'users' | 'recycle' | 'intelligence' | 'flags' | 'clients' | 'organizations' | 'payments' | 'system' | 'notifications' | 'maintenance' | 'cms' | 'navigation'>('pulse');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<GlobalSystemMetrics & { trends?: any }>({
    totalMRR: 0,
    activeSubscriptions: 0,
    overdueInvoicesCount: 0,
    apiHealthScore: 100,
    geminiTokenUsage: 0,
    newClientsThisMonth: 0,
    trends: {},
  });
  const [apiHealth, setApiHealth] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveKPIs, setLiveKPIs] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [deletedItems, setDeletedItems] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'banned' | 'churned'>('all');
  const [payments, setPayments] = useState<any>(null);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [auditOffset, setAuditOffset] = useState(0);
  const [notificationsOffset, setNotificationsOffset] = useState(0);
  const pageSize = 25;
  const [maintenanceInfo, setMaintenanceInfo] = useState<any>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [siteContent, setSiteContent] = useState<any>(null);
  const [navigationItems, setNavigationItems] = useState<any[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});

  // Check access when role is loaded (only if checking is complete and no access)
  useEffect(() => {
    if (!isCheckingRole && !hasAccess) {
      addToast('אין לך הרשאה לגשת לפאנל ניהול', 'error');
      setTimeout(() => router.push(joinPath(basePath, '/dashboard')), 2000);
    }
  }, [isCheckingRole, hasAccess, addToast, router, basePath]);

  // Load only critical data initially. Everything else loads lazily by tab.
  useEffect(() => {
    if (!hasAccess) return;
    if (loadedTabs['__boot__']) return;
    setLoadedTabs(prev => ({ ...prev, __boot__: true }));

    Promise.all([
      loadMetrics(),
      loadLiveKPIs(),
      loadPayments(),
    ]).catch(() => {
      // ignore - individual loaders already handle errors
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  const pendingVerificationCount = useMemo(() => {
    const orders = payments?.subscriptionOrders || [];
    return orders.filter((o: any) => o?.status === 'pending_verification').length;
  }, [payments]);

  const didToastPendingRef = useRef(false);
  useEffect(() => {
    if (!hasAccess) return;
    if (pendingVerificationCount > 0 && !didToastPendingRef.current) {
      didToastPendingRef.current = true;
      addToast(`יש ${pendingVerificationCount} תשלומים שממתינים לאישור`, 'info');
    }
    if (pendingVerificationCount === 0) {
      didToastPendingRef.current = false;
    }
  }, [addToast, hasAccess, pendingVerificationCount]);

  useEffect(() => {
    if (!hasAccess) return;
    if (loadedTabs[activeTab]) return;

    setLoadedTabs(prev => ({ ...prev, [activeTab]: true }));

    if (activeTab === 'system') {
      Promise.all([
        loadHealthStatus(),
        loadAuditLog(),
      ]).catch(() => {
        // ignore
      });
      return;
    }

    if (activeTab === 'users') {
      loadAllUsers();
      return;
    }

    if (activeTab === 'recycle') {
      loadDeletedItems();
      return;
    }

    if (activeTab === 'intelligence') {
      loadAnalytics();
      return;
    }

    if (activeTab === 'flags') {
      loadFeatureFlags();
      return;
    }

    if (activeTab === 'payments') {
      loadPayments();
      return;
    }

    if (activeTab === 'notifications') {
      loadNotificationHistory();
      return;
    }

    if (activeTab === 'maintenance') {
      loadMaintenanceInfo();
      return;
    }

    if (activeTab === 'cms') {
      loadSiteContent();
      return;
    }

    if (activeTab === 'navigation') {
      loadNavigationMenu();
      return;
    }
  }, [activeTab, hasAccess, loadedTabs]);

  useEffect(() => {
    if (!hasAccess) return;
    if (activeTab === 'system' && loadedTabs['system']) {
      loadAuditLog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditOffset]);

  useEffect(() => {
    if (!hasAccess) return;
    if (activeTab === 'notifications' && loadedTabs['notifications']) {
      loadNotificationHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOffset]);

  const loadMetrics = async () => {
    const result = await getSystemMetrics();
    if (result.success && result.data) {
      setMetrics(result.data);
    }
  };

  const loadHealthStatus = async () => {
    const result = await getAPIHealthStatus();
    if (result.success && result.data) {
      setApiHealth(result.data);
    }
  };

  const loadAuditLog = async () => {
    const result = await getSecurityAuditLog({ limit: pageSize, offset: auditOffset });
    if (result.success && result.data) {
      setAuditLog(result.data);
    }
  };

  const loadLiveKPIs = async () => {
    const result = await getLiveKPIs();
    if (result.success && result.data) {
      setLiveKPIs(result.data);
    }
  };

  const loadAllUsers = async () => {
    const result = await getAllUsers();
    if (result.success && result.data) {
      setAllUsers(result.data);
    }
  };

  const loadDeletedItems = async () => {
    const result = await getDeletedItems();
    if (result.success && result.data) {
      setDeletedItems(result.data);
    }
  };

  const loadAnalytics = async () => {
    const result = await getFeatureUsageAnalytics();
    if (result.success && result.data) {
      setAnalytics(result.data);
    }
  };

  const loadFeatureFlags = async () => {
    const result = await getFeatureFlags();
    if (result.success && result.data) {
      setFeatureFlags(result.data);
    }
  };

  const loadPayments = async () => {
    const result = await getAllPayments();
    if (result.success && result.data) {
      setPayments(result.data);
    }
  };

  const loadNotificationHistory = async () => {
    const result = await getNotificationHistory({ limit: pageSize, offset: notificationsOffset });
    if (result.success && result.data) {
      setNotificationHistory(result.data);
    }
  };

  const loadMaintenanceInfo = async () => {
    const result = await getMaintenanceInfo();
    if (result.success && result.data) {
      setMaintenanceInfo(result.data);
    }
  };

  const loadSiteContent = async () => {
    const result = await getAllSiteContent();
    if (result.success && result.data) {
      setSiteContent(result.data);
    }
  };

  const loadNavigationMenu = async () => {
    const result = await getAllNavigationItems();
    if (result.success && result.data) {
      setNavigationItems(result.data);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const result = await refreshSystemData();
    if (result.success) {
      await loadMetrics();
      addToast('נתוני המערכת סונכרנו מחדש.', 'success');
    } else {
      addToast(result.error || 'שגיאה ברענון נתונים', 'error');
    }
    setIsRefreshing(false);
  };

  const handleUpdateClientStatus = async (clientId: string, status: ClientStatus) => {
    const result = await updateClientStatus(clientId, status);
    if (result.success) {
      // Update local state
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, status } : c));
      addToast(`סטטוס הלקוח עודכן ל-${status}`, 'success');
      await loadMetrics(); // Refresh metrics
    } else {
      addToast(result.error || 'שגיאה בעדכון סטטוס', 'error');
    }
  };

  const handleToggleAccess = async (clientId: string, isBlocked: boolean) => {
    const result = await toggleClientAccess(clientId, !isBlocked);
    if (result.success) {
      const newStatus: ClientStatus = isBlocked ? 'Active' : 'Overdue';
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));
      addToast(isBlocked ? 'הלקוח שוחרר מחסימה' : 'הלקוח נחסם', 'success');
      await loadMetrics();
    } else {
      addToast(result.error || 'שגיאה בחסימה/שחרור', 'error');
    }
  };

  const handleImpersonate = async (clientId: string) => {
    const result = await impersonateUser(clientId);
    if (result.success) {
      // Set active client and navigate to workspace
      setActiveClientId(clientId);
      router.push(joinPath(basePath, '/workspace'));
      addToast('נכנסת למצב התחזות - אתה רואה את המערכת כפי שהלקוח רואה אותה', 'success');
    } else {
      addToast(result.error || 'שגיאה בכניסה כמשתמש', 'error');
    }
  };

  const handleEditUserProfile = async (userId: string) => {
    const result = await getUserDetails(userId);
    if (result.success && result.data) {
      setEditingUser(result.data);
      setIsEditProfileModalOpen(true);
    } else {
      addToast('שגיאה בטעינת פרטי משתמש', 'error');
    }
  };

  const handleSaveUserProfile = async (updates: any) => {
    if (!editingUser) return;
    
    const result = await updateUserProfile(editingUser.id, updates);
    if (result.success) {
      addToast('פרופיל המשתמש עודכן בהצלחה', 'success');
      setIsEditProfileModalOpen(false);
      setEditingUser(null);
      loadAllUsers();
    } else {
      addToast(result.error || 'שגיאה בעדכון פרופיל', 'error');
    }
  };

  const filteredClients = clients.filter(c => 
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading while checking role
  if (isCheckingRole) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
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
            onRefresh={loadPayments}
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
            deletedItems={deletedItems}
            onRefresh={loadDeletedItems}
            addToast={addToast}
          />
        )}
        {activeTab === 'intelligence' && (
          <IntelligenceTab
            key="intelligence"
            analytics={analytics}
            onRefresh={loadAnalytics}
            addToast={addToast}
          />
        )}
        {activeTab === 'flags' && (
          <FlagsTab
            key="flags"
            featureFlags={featureFlags}
            setFeatureFlags={setFeatureFlags}
            onRefresh={loadFeatureFlags}
            addToast={addToast}
          />
        )}
        {activeTab === 'maintenance' && (
          <MaintenanceTab
            key="maintenance"
            maintenanceInfo={maintenanceInfo}
            onRefresh={loadMaintenanceInfo}
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
            onRefresh={loadSiteContent}
            addToast={addToast}
          />
        )}
        {activeTab === 'navigation' && (
          <NavigationTab
            key="navigation"
            navigationItems={navigationItems}
            setNavigationItems={setNavigationItems}
            onRefresh={loadNavigationMenu}
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

