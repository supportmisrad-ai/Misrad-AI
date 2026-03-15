'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Client, SocialPost, SocialTask, TeamMember, AIOpportunity, ClientRequest, ManagerRequest, PaymentOrder, AgencyServiceConfig, Conversation, Idea, UserRole } from '@/types/social';
import { DEFAULT_PLATFORM_CONFIGS, MARKETPLACE_ADDONS } from '@/lib/constants';
import { getClientByIdForWorkspace, getClientsPage } from '@/app/actions/clients';
import { getCampaigns } from '@/app/actions/campaigns';
import { getTasks } from '@/app/actions/tasks';
import { getPosts } from '@/app/actions/posts';
import { getIdeas } from '@/app/actions/ideas';
import { getClientRequests, getManagerRequests } from '@/app/actions/requests';
import { getTeamMembers } from '@/app/actions/team';
import { getConversations } from '@/app/actions/conversations';
import { getUserRole } from '@/lib/rbac';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import type { SocialInitialData } from '@/lib/services/social-service';

// ✅ SECURITY FIX: Removed global userRoleCache
// Global cache is dangerous in SSR and multi-tab scenarios - causes user data leakage
// Each AppContext instance now uses its own local state cache

type ClientsPageResult = Awaited<ReturnType<typeof getClientsPage>>;

export type SettingsSubView =
  | 'main'
  | 'security'
  | 'social'
  | 'notifications'
  | 'automation'
  | 'pricing'
  | 'integrations'
  | 'infrastructure'
  | 'team_management'
  | 'updates';

type AppContextType = {
  // Auth - Now using Clerk
  isAuthenticated: boolean;
  user: ReturnType<typeof useUser>['user'] | null;
  isLoaded: boolean;
  
  // User Role
  userRole: UserRole;
  isCheckingRole: boolean;

  // Org
  orgSlug: string | null;
  
  // Views
  settingsSubView: SettingsSubView;
  setSettingsSubView: (view: SettingsSubView) => void;
  
  // UI State
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (value: boolean) => void;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (value: boolean) => void;
  isTourActive: boolean;
  setIsTourActive: (value: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (value: boolean) => void;
  
  // Client Mode
  isClientMode: boolean;
  setIsClientMode: (value: boolean) => void;
  isOnboardingMode: boolean;
  setIsOnboardingMode: (value: boolean) => void;
  isTeamManagementEnabled: boolean;
  setIsTeamManagementEnabled: (value: boolean) => void;
  
  // Modals
  isAddClientModalOpen: boolean;
  setIsAddClientModalOpen: (value: boolean) => void;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (value: boolean) => void;
  isCampaignWizardOpen: boolean;
  setIsCampaignWizardOpen: (value: boolean) => void;
  isReportModalOpen: boolean;
  setIsReportModalOpen: (value: boolean) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (value: boolean) => void;
  isTaskModalOpen: boolean;
  setIsTaskModalOpen: (value: boolean) => void;
  
  // Data
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  pinnedClientIds: string[];
  setPinnedClientIds: React.Dispatch<React.SetStateAction<string[]>>;
  posts: SocialPost[];
  setPosts: React.Dispatch<React.SetStateAction<SocialPost[]>>;
  tasks: SocialTask[];
  setTasks: React.Dispatch<React.SetStateAction<SocialTask[]>>;
  team: TeamMember[];
  setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  clientRequests: ClientRequest[];
  setClientRequests: React.Dispatch<React.SetStateAction<ClientRequest[]>>;
  managerRequests: ManagerRequest[];
  setManagerRequests: React.Dispatch<React.SetStateAction<ManagerRequest[]>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  ideas: Idea[];
  setIdeas: React.Dispatch<React.SetStateAction<Idea[]>>;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  platformConfigs: AgencyServiceConfig[];
  setPlatformConfigs: React.Dispatch<React.SetStateAction<AgencyServiceConfig[]>>;
  marketplaceAddons: AgencyServiceConfig[];
  setMarketplaceAddons: React.Dispatch<React.SetStateAction<AgencyServiceConfig[]>>;
  
  // Active State
  activeDraft: AIOpportunity | null;
  setActiveDraft: React.Dispatch<React.SetStateAction<AIOpportunity | null>>;
  activeClientId: string | null;
  setActiveClientId: React.Dispatch<React.SetStateAction<string | null>>;
  activeCheckout: { order: PaymentOrder; client: Client } | null;
  setActiveCheckout: React.Dispatch<React.SetStateAction<{ order: PaymentOrder; client: Client } | null>>;
  editingTask: SocialTask | null;
  setEditingTask: React.Dispatch<React.SetStateAction<SocialTask | null>>;
  
  // Helpers
  activeClient: Client | undefined;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  handleToggleTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export type AppProviderProps = {
  children: ReactNode;
  initialSocialData?: SocialInitialData;
  initialIsTeamEnabled?: boolean;
};

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  initialSocialData,
  initialIsTeamEnabled,
}) => {
  let clerkUser: ReturnType<typeof useUser>['user'] | null = null;
  let clerkIsLoaded = true;

  try {
    const clerk = useUser();
    clerkUser = clerk.user;
    clerkIsLoaded = clerk.isLoaded;
  } catch {
    clerkUser = null;
    clerkIsLoaded = true;
  }

  const user = clerkUser;
  const isLoaded = clerkIsLoaded;
  const isAuthenticated = !!user && isLoaded;
  const pathname = usePathname();
  const workspaceRoute = parseWorkspaceRoute(pathname);
  const workspaceOrgId = workspaceRoute.orgSlug && workspaceRoute.module === 'social' ? workspaceRoute.orgSlug : null;

  // Source of truth:
  // - Prefer URL orgSlug when present.
  // - Fallback to server-provided initialSocialData orgSlug on first paint to prevent client refetch.
  const effectiveOrgSlug =
    (typeof workspaceOrgId === 'string' && workspaceOrgId.length > 0
      ? workspaceOrgId
      : (initialSocialData?.orgSlug || null));

  const hasInitialDataForOrg = (data?: SocialInitialData) => {
    if (!effectiveOrgSlug) return false;
    return Boolean(data && data.orgSlug === effectiveOrgSlug);
  };
  
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>('main');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  // User role state - shared across all components
  // ✅ SECURITY FIX: Use local state cache instead of global cache
  const [userRole, setUserRole] = useState<UserRole>('team_member');
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [roleCache, setRoleCache] = useState<{
    userId: string;
    role: UserRole;
    timestamp: number;
  } | null>(null);

  // Load role from local cache or fetch fresh
  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setIsCheckingRole(false);
      setUserRole('team_member');
      return;
    }

    // ✅ Check local state cache (per-instance, not global)
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    if (roleCache &&
        roleCache.userId === user.id &&
        Date.now() - roleCache.timestamp < CACHE_DURATION) {
      // Use cached role
      setUserRole(roleCache.role);
      setIsCheckingRole(false);
      return;
    }

    // No valid cache - need to fetch (continues in checkRole below)
  }, [isLoaded, user?.id, roleCache]);
  
  const [isClientMode, setIsClientMode] = useState(false);
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [isTeamManagementEnabled, setIsTeamManagementEnabled] = useState(false);

  useEffect(() => {
    if (typeof initialIsTeamEnabled === 'boolean') {
      setIsTeamManagementEnabled(initialIsTeamEnabled);
    }
  }, [initialIsTeamEnabled]);
  
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCampaignWizardOpen, setIsCampaignWizardOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  const [clients, setClients] = useState<Client[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.clients : []));
  const [pinnedClientIds, setPinnedClientIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.posts : []));
  const [tasks, setTasks] = useState<SocialTask[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.tasks : []));
  const [team, setTeam] = useState<TeamMember[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.team : []));
  const [clientRequests, setClientRequests] = useState<ClientRequest[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.clientRequests : []));
  const [managerRequests, setManagerRequests] = useState<ManagerRequest[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.managerRequests : []));
  const [conversations, setConversations] = useState<Conversation[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.conversations : []));
  const [ideas, setIdeas] = useState<Idea[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? initialSocialData.ideas : []));
  const [isLoadingData, setIsLoadingData] = useState(() => !(initialSocialData && hasInitialDataForOrg(initialSocialData)));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [platformConfigs, setPlatformConfigs] = useState<AgencyServiceConfig[]>(DEFAULT_PLATFORM_CONFIGS);
  const [marketplaceAddons, setMarketplaceAddons] = useState<AgencyServiceConfig[]>(MARKETPLACE_ADDONS);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const loadOnceKeyRef = useRef<string | null>(null);

  const [activeDraft, setActiveDraft] = useState<AIOpportunity | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const key = effectiveOrgSlug ? `social_activeClientId_${effectiveOrgSlug}` : 'social_activeClientId';
      return localStorage.getItem(key) || null;
    } catch { return null; }
  });

  const [activeCheckout, setActiveCheckout] = useState<{ order: PaymentOrder; client: Client } | null>(null);
  const [editingTask, setEditingTask] = useState<SocialTask | null>(null);
  
  // Persist activeClientId to localStorage when it changes
  useEffect(() => {
    try {
      const key = effectiveOrgSlug ? `social_activeClientId_${effectiveOrgSlug}` : 'social_activeClientId';
      if (activeClientId) {
        localStorage.setItem(key, activeClientId);
      } else {
        localStorage.removeItem(key);
      }
    } catch { /* SSR/privacy guard */ }
  }, [activeClientId, effectiveOrgSlug]);

  // Auto-select first client if none selected and clients are loaded
  useEffect(() => {
    if (!activeClientId && clients.length > 0) {
      setActiveClientId(clients[0].id);
    }
  }, [activeClientId, clients]);

  const activeClient = clients.find(c => c.id === activeClientId);
  
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'todo' ? 'completed' : 'todo' } : t));
    const task = tasks.find(t => t.id === id);
    if (task && task.status === 'todo') {
      addToast('המשימה סומנה כבוצעה! ✨');
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    addToast('המשימה נמחקה');
  };
  
  // Sync user profile image with Google — once per browser session, not every mount.
  // Uses sessionStorage to avoid repeated server action calls on every navigation.
  useEffect(() => {
    const syncProfileImage = async () => {
      if (!user?.id || !user?.imageUrl || !isLoaded) {
        return;
      }

      const syncKey = `profile_sync_${user.id}`;
      try {
        const lastSync = sessionStorage.getItem(syncKey);
        if (lastSync) return;
      } catch { /* SSR/privacy guard */ }

      try {
        const { getOrCreateSupabaseUserAction } = await import('@/app/actions/users');
        await getOrCreateSupabaseUserAction(
          user.id,
          user.emailAddresses[0]?.emailAddress,
          user.fullName || undefined,
          user.imageUrl
        );
        try { sessionStorage.setItem(syncKey, '1'); } catch { /* ignore */ }
      } catch (error) {
        console.error('[AppContext] Error syncing profile image:', error);
      }
    };

    syncProfileImage();
  }, [user?.id, user?.imageUrl, isLoaded]);

  // Fetch user role once when user is authenticated (refresh in background even if cache exists)
  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id || !isLoaded) {
        setIsCheckingRole(false);
        setUserRole((prev) => (prev === 'team_member' ? prev : 'team_member')); // Default to team_member
        return;
      }

      try {
        // ✅ SECURITY FIX: Use local state cache instead of global cache
        // Only show loading if we don't have cache
        const CACHE_DURATION = 5 * 60 * 1000;
        const hasValidCache = Boolean(roleCache &&
          roleCache.userId === user.id &&
          Date.now() - roleCache.timestamp < CACHE_DURATION);

        if (hasValidCache) {
          // Cache is the source of truth for this session.
          // Avoid background refresh to prevent repeated role calls/rerenders.
          if (isMountedRef.current) {
            setIsCheckingRole((prev) => (prev === false ? prev : false));
          }
          return;
        }

        setIsCheckingRole(true);
        
        const role = await getUserRole(
          user.id,
          user.emailAddresses[0]?.emailAddress,
          user.fullName || undefined,
          user.imageUrl || undefined
        );
        if (isMountedRef.current) {
          setUserRole((prev) => (prev === role ? prev : role));
          setIsCheckingRole((prev) => (prev === false ? prev : false));
          // ✅ SECURITY FIX: Use local state cache instead of global cache
          setRoleCache({ userId: user.id, role, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('[AppContext] Error checking user role:', error);
        if (isMountedRef.current) {
          setUserRole((prev) => (prev === 'team_member' ? prev : 'team_member')); // Default to team_member
          setIsCheckingRole((prev) => (prev === false ? prev : false));
        }
      }
    };

    checkRole();
  }, [user?.id, isLoaded]);

  // Note: Authentication-based navigation is now handled by Next.js routing
  // No need for currentView state management

  // Load data from Supabase when authenticated
  const loadDataFromSupabase = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      
      // Don't load data if user is not authenticated
      if (!user?.id) {
        return;
      }
      
      setIsLoadingData(true);
      
      // Check if Supabase is configured
      const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      if (!hasUrl || !hasAnonKey) {
        console.error('Supabase not configured');
        throw new Error('Supabase not configured');
      }
      
      // Fetch all data in parallel using Server Actions
      // Optimized: Fetch only critical data first, then secondary data
      
      // 1. Critical data for initial render (Clients, Team)
      const emptyClientsPageResult: ClientsPageResult = {
        success: true,
        data: { clients: [], nextCursor: null, hasMore: false },
      };

      const [clientsResult, teamResult] = await Promise.all([
        (() => {
          const orgSlug = effectiveOrgSlug || workspaceOrgId;
          return orgSlug ? getClientsPage({ orgSlug, pageSize: 200 }) : Promise.resolve(emptyClientsPageResult);
        })(),
        effectiveOrgSlug ? getTeamMembers(effectiveOrgSlug) : Promise.resolve({ success: true, data: [] }),
      ]);

      if (!isMountedRef.current) return;

      // Handle clients result
      if (clientsResult.success) {
        const clients = clientsResult.data.clients;
        if (isMountedRef.current) {
          setClients(clients);
          if (clients.length > 0) {
            setPinnedClientIds(clients.slice(0, 2).map((c: Client) => c.id));
          }
        }
      } else {
        if (isMountedRef.current) setClients([]);
        console.error('[AppContext] Failed to fetch clients:', clientsResult.error);
      }

      // Handle team result
      if (isMountedRef.current) {
        if (teamResult.success && teamResult.data) {
          setTeam(teamResult.data);
        } else {
          setTeam([]);
        }
        
        // OPTIMIZATION: Set loading to false immediately after critical data is loaded
        // This allows the UI to render the dashboard structure while secondary data loads in background
        setIsLoadingData(false);
      }

      // 2. Secondary data - fetch in background without blocking
      // This allows the UI to be responsive faster
      Promise.all([
        effectiveOrgSlug ? getPosts({ orgSlug: effectiveOrgSlug }) : Promise.resolve({ success: true, data: [] }),
        getTasks(effectiveOrgSlug || undefined),
        effectiveOrgSlug ? getConversations(effectiveOrgSlug) : Promise.resolve({ success: true, data: [] }),
        effectiveOrgSlug ? getClientRequests(effectiveOrgSlug) : Promise.resolve({ success: true, data: [] }),
        effectiveOrgSlug ? getManagerRequests(effectiveOrgSlug) : Promise.resolve({ success: true, data: [] }),
        effectiveOrgSlug ? getIdeas(effectiveOrgSlug) : Promise.resolve({ success: true, data: [] }),
      ]).then(([
        postsResult,
        tasksResult,
        conversationsResult,
        clientRequestsResult,
        managerRequestsResult,
        ideasResult,
      ]) => {
        if (!isMountedRef.current) return;

        if (postsResult.success && postsResult.data) setPosts(postsResult.data);
        if (tasksResult.success && tasksResult.data) setTasks(tasksResult.data);
        if (conversationsResult.success && conversationsResult.data) setConversations(conversationsResult.data);
        if (clientRequestsResult.success && clientRequestsResult.data) setClientRequests(clientRequestsResult.data);
        if (managerRequestsResult.success && managerRequestsResult.data) setManagerRequests(managerRequestsResult.data);
        if (ideasResult.success && ideasResult.data) setIdeas(ideasResult.data);
        
        // No need to set isLoadingData(false) here as it's already done
      }).catch((error: unknown) => {
        console.error('[AppContext] Error loading secondary data:', error);
        // We don't block the UI for secondary data errors
      });
      
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      // NO FALLBACK TO MOCK DATA - Force real data connection
      // If Supabase is not configured or fails, show empty state
      if (isMountedRef.current) {
        setClients([]);
        setPinnedClientIds([]);
        setPosts([]);
        setTasks([]);
        setTeam([]);
        setClientRequests([]);
        setManagerRequests([]);
        setConversations([]);
        setIdeas([]);
        
        // Show error toast
        addToast('שגיאה בטעינת נתונים. ודא ש-Supabase מוגדר נכון.', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingData(false);
      }
    }
  }, [user, addToast, workspaceOrgId, effectiveOrgSlug]);

  // Load data from Supabase when authenticated (only once, not on every navigation)
  useEffect(() => {
    isMountedRef.current = true;
    // If server already provided initial data for this org, avoid client refetch.
    if (initialSocialData && hasInitialDataForOrg(initialSocialData)) {
      if (isMountedRef.current) {
        setIsLoadingData(false);
      }
      if (isAuthenticated && user) {
        const key = `${user.id}:${workspaceOrgId || 'global'}`;
        loadOnceKeyRef.current = key;
      }
      return () => {
        isMountedRef.current = false;
      };
    }
    
    // Only load once per (userId, workspaceOrgId) key to avoid render loops
    if (isAuthenticated && user) {
      const key = `${user.id}:${workspaceOrgId || 'global'}`;
      if (loadOnceKeyRef.current !== key) {
        loadOnceKeyRef.current = key;
        loadDataFromSupabase();
      }
    } else if (!isAuthenticated) {
      // NO MOCK DATA - Show empty state if not authenticated
      if (isMountedRef.current) {
        setClients([]);
        setPinnedClientIds([]);
        setPosts([]);
        setTasks([]);
        setTeam([]);
        setClientRequests([]);
        setManagerRequests([]);
        setConversations([]);
        setIdeas([]);
        setIsLoadingData(false);
      }
    }
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, workspaceOrgId, initialSocialData]);

  // Load ideas when active client changes
  useEffect(() => {
    // If server already provided initial data for this org, avoid client fetching on route changes.
    if (initialSocialData && hasInitialDataForOrg(initialSocialData)) {
      return;
    }
    if (activeClientId && effectiveOrgSlug) {
      getIdeas(effectiveOrgSlug, activeClientId).then(result => {
        if (isMountedRef.current) {
          if (result.success && result.data) {
            setIdeas(result.data);
          } else {
            setIdeas([]);
          }
        }
      }).catch(console.error);
    } else {
      if (isMountedRef.current) {
        setIdeas([]);
      }
    }
  }, [activeClientId, effectiveOrgSlug]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!activeClientId) return;
        if (!effectiveOrgSlug) return;
        const exists = Array.isArray(clients) && clients.some((c) => String(c.id) === String(activeClientId));
        if (exists) return;

        const res = await getClientByIdForWorkspace({ orgSlug: effectiveOrgSlug, clientId: activeClientId });
        if (!res.success || !res.data) return;

        if (!isMountedRef.current) return;
        setClients((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const already = list.some((c) => String(c.id) === String(res.data.id));
          if (already) return list;
          return [res.data, ...list];
        });
      } catch {
        // ignore
      }
    };

    run();
  }, [activeClientId, effectiveOrgSlug, clients, setClients]);

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      user,
      isLoaded,
      userRole,
      isCheckingRole,
      orgSlug: effectiveOrgSlug,
      settingsSubView,
      setSettingsSubView,
      isSidebarOpen,
      setIsSidebarOpen,
      isCommandPaletteOpen,
      setIsCommandPaletteOpen,
      isNotificationCenterOpen,
      setIsNotificationCenterOpen,
      isTourActive,
      setIsTourActive,
      isHelpModalOpen,
      setIsHelpModalOpen,
      isClientMode,
      setIsClientMode,
      isOnboardingMode,
      setIsOnboardingMode,
      isTeamManagementEnabled,
      setIsTeamManagementEnabled,
      isAddClientModalOpen,
      setIsAddClientModalOpen,
      isInviteModalOpen,
      setIsInviteModalOpen,
      isCampaignWizardOpen,
      setIsCampaignWizardOpen,
      isReportModalOpen,
      setIsReportModalOpen,
      isPaymentModalOpen,
      setIsPaymentModalOpen,
      isTaskModalOpen,
      setIsTaskModalOpen,
      clients,
      setClients,
      pinnedClientIds,
      setPinnedClientIds,
      posts,
      setPosts,
      tasks,
      setTasks,
      team,
      setTeam,
      clientRequests,
      setClientRequests,
      managerRequests,
      setManagerRequests,
      conversations,
      setConversations,
      ideas,
      setIdeas,
      toasts,
      setToasts,
      platformConfigs,
      setPlatformConfigs,
      marketplaceAddons,
      setMarketplaceAddons,
      activeDraft,
      setActiveDraft,
      activeClientId,
      setActiveClientId,
      activeCheckout,
      setActiveCheckout,
      editingTask,
      setEditingTask,
      activeClient,
      addToast,
      handleToggleTask,
      handleDeleteTask,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

