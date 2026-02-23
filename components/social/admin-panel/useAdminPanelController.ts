'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClientStatus, GlobalSystemMetrics } from '@/types/social';
import {
  getSystemMetrics,
  refreshSystemData,
  getAPIHealthStatus,
  getSecurityAuditLog,
  impersonateUser,
  updateClientStatus,
  toggleClientAccess,
} from '@/app/actions/admin';
import { getAllNavigationItems, type NavigationItem } from '@/app/actions/admin-navigation';
import {
  getFeatureFlags,
  getFeatureUsageAnalytics,
  getAllUsers,
  getDeletedItems,
  getLiveKPIs,
} from '@/app/actions/admin-cockpit';
import { getAllPayments } from '@/app/actions/admin-payments';
import { getNotificationHistory } from '@/app/actions/admin-notifications';
import { getMaintenanceInfo } from '@/app/actions/admin-maintenance';
import { getUserDetails, updateUserProfile } from '@/app/actions/admin-users';
import { getAllSiteContent } from '@/app/actions/admin-site-content';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { canAccessAdminPanel } from '@/lib/rbac';

export function useAdminPanelController() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);
  const { clients, setClients, setActiveClientId, addToast, userRole, isCheckingRole, orgSlug } = useApp();
  const hasAccess = canAccessAdminPanel(userRole);

  const [activeTab, setActiveTab] = useState<
    | 'pulse'
    | 'overview'
    | 'users'
    | 'recycle'
    | 'intelligence'
    | 'flags'
    | 'clients'
    | 'organizations'
    | 'payments'
    | 'system'
    | 'notifications'
    | 'maintenance'
    | 'cms'
    | 'navigation'
  >('pulse');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<GlobalSystemMetrics & { trends?: Record<string, unknown> }>({
    totalMRR: 0,
    activeSubscriptions: 0,
    overdueInvoicesCount: 0,
    apiHealthScore: 100,
    geminiTokenUsage: 0,
    newClientsThisMonth: 0,
    trends: {},
  });

  const [apiHealth, setApiHealth] = useState<Record<string, unknown>[]>([]);
  const [auditLog, setAuditLog] = useState<Record<string, unknown>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveKPIs, setLiveKPIs] = useState<Record<string, unknown> | null>(null);
  const [allUsers, setAllUsers] = useState<Record<string, unknown>[]>([]);
  const [deletedItems, setDeletedItems] = useState<Record<string, unknown>[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, unknown> | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'banned' | 'churned'>('all');
  const [payments, setPayments] = useState<Record<string, unknown> | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<Record<string, unknown>[]>([]);
  const [auditOffset, setAuditOffset] = useState(0);
  const [notificationsOffset, setNotificationsOffset] = useState(0);
  const pageSize = 25;
  const [maintenanceInfo, setMaintenanceInfo] = useState<Record<string, unknown> | null>(null);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const [siteContent, setSiteContent] = useState<Record<string, unknown> | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});

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
    const resolvedOrgSlug = String(orgSlug || '').trim();
    if (!resolvedOrgSlug) {
      setNotificationHistory([]);
      return;
    }
    const result = await getNotificationHistory({ orgSlug: resolvedOrgSlug, limit: pageSize, offset: notificationsOffset });
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

  // Load only critical data initially. Everything else loads lazily by tab.
  useEffect(() => {
    if (!hasAccess) return;
    if (loadedTabs['__boot__']) return;
    setLoadedTabs((prev) => ({ ...prev, __boot__: true }));

    Promise.all([loadMetrics(), loadLiveKPIs(), loadPayments()]).catch(() => {
      // ignore
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  const pendingVerificationCount = useMemo(() => {
    const orders = (Array.isArray(payments?.subscriptionOrders) ? payments.subscriptionOrders : []) as Record<string, unknown>[];
    return orders.filter((o) => o?.status === 'pending_verification').length;
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

    setLoadedTabs((prev) => ({ ...prev, [activeTab]: true }));

    if (activeTab === 'system') {
      Promise.all([loadHealthStatus(), loadAuditLog()]).catch(() => {
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
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status } : c)));
      addToast(`סטטוס הלקוח עודכן ל-${status}`, 'success');
      await loadMetrics();
    } else {
      addToast(result.error || 'שגיאה בעדכון סטטוס', 'error');
    }
  };

  const handleToggleAccess = async (clientId: string, isBlocked: boolean) => {
    const result = await toggleClientAccess(clientId, !isBlocked);
    if (result.success) {
      const newStatus: ClientStatus = isBlocked ? 'Active' : 'Overdue';
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c)));
      addToast(isBlocked ? 'הלקוח שוחרר מחסימה' : 'הלקוח נחסם', 'success');
      await loadMetrics();
    } else {
      addToast(result.error || 'שגיאה בחסימה/שחרור', 'error');
    }
  };

  const handleImpersonate = async (clientId: string) => {
    const result = await impersonateUser(clientId);
    if (result.success) {
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

  const handleSaveUserProfile = async (updates: unknown) => {
    if (!editingUser) return;

    const result = await updateUserProfile(String(editingUser.id), updates as Record<string, unknown>);
    if (result.success) {
      addToast('פרופיל המשתמש עודכן בהצלחה', 'success');
      setIsEditProfileModalOpen(false);
      setEditingUser(null);
      loadAllUsers();
    } else {
      addToast(result.error || 'שגיאה בעדכון פרופיל', 'error');
    }
  };

  const filteredClients = clients.filter((c) => {
    const co = c as unknown as Record<string, unknown>;
    return String(co.companyName || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    String(co.email || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  return {
    basePath,
    hasAccess,
    isCheckingRole,
    pageSize,
    activeTab,
    setActiveTab,
    isRefreshing,
    metrics,
    apiHealth,
    auditLog,
    searchQuery,
    setSearchQuery,
    liveKPIs,
    allUsers,
    deletedItems,
    analytics,
    featureFlags,
    setFeatureFlags,
    userSearchQuery,
    setUserSearchQuery,
    userFilter,
    setUserFilter,
    payments,
    notificationHistory,
    auditOffset,
    setAuditOffset,
    notificationsOffset,
    setNotificationsOffset,
    maintenanceInfo,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    editingUser,
    setEditingUser,
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    isAddUserModalOpen,
    setIsAddUserModalOpen,
    siteContent,
    navigationItems,
    setNavigationItems,
    filteredClients,
    handleRefresh,
    handleUpdateClientStatus,
    handleToggleAccess,
    handleImpersonate,
    handleEditUserProfile,
    handleSaveUserProfile,
    loadAllUsers,
    loadPayments,
    loadMetrics,
    loadAuditLog,
    loadNotificationHistory,
    loadDeletedItems,
    loadAnalytics,
    loadFeatureFlags,
    loadMaintenanceInfo,
    loadSiteContent,
    loadNavigationMenu,
    setPayments,
    pendingVerificationCount,
  };
}
