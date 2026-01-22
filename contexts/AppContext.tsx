'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Client, SocialPost, SocialTask, TeamMember, AIOpportunity, ClientRequest, ManagerRequest, PaymentOrder, AgencyServiceConfig, Conversation, Idea, UserRole } from '@/types/social';
import { DEFAULT_PLATFORM_CONFIGS, MARKETPLACE_ADDONS } from '@/lib/constants';
import { getClients } from '@/app/actions/clients';
import { getCampaigns } from '@/app/actions/campaigns';
import { getTasks } from '@/app/actions/tasks';
import { getPosts } from '@/app/actions/posts';
import { getIdeas } from '@/app/actions/ideas';
import { getClientRequests, getManagerRequests } from '@/app/actions/requests';
import { getTeamMembers } from '@/app/actions/team';
import { getConversations } from '@/app/actions/conversations';
import { getUserRole } from '@/lib/rbac';
import { 
  fetchActivePlatforms
} from '@/lib/services/supabaseService';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import type { SocialInitialData } from '@/lib/services/social-service';

const userRoleCache = new Map<string, { role: UserRole; timestamp: number }>();

export type View = 'landing-page' | 'pricing' | 'auth' | 'legal' | 'dashboard' | 'machine' | 'calendar' | 'workspace' | 'campaigns' | 'analytics' | 'inbox' | 'settings' | 'all-clients' | 'profile' | 'client-portal' | 'onboarding-portal' | 'checkout' | 'agency-insights' | 'collection' | 'team' | 'admin-panel';
export type SettingsSubView = 'main' | 'security' | 'social' | 'notifications' | 'automation' | 'pricing' | 'integrations' | 'infrastructure' | 'team_management' | 'updates';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  // Auth - Now using Clerk
  isAuthenticated: boolean;
  user: ReturnType<typeof useUser>['user'] | null;
  isLoaded: boolean;
  
  // User Role
  userRole: UserRole;
  isCheckingRole: boolean;
  
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export type AppProviderProps = {
  children: ReactNode;
  initialSocialData?: SocialInitialData;
};

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  initialSocialData,
}) => {
  const { user, isLoaded } = useUser();
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
  // IMPORTANT: Initialize from cache immediately (synchronous) for instant UI
  // Rule: Load from cache on mount for instant display, then refresh in background
  const [userRole, setUserRole] = useState<UserRole>('team_member'); // Default to team_member (not 'client')
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  
  // IMPORTANT: Load role from cache IMMEDIATELY when user loads (synchronous check)
  // This ensures instant UI - no delays, no waiting
  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setIsCheckingRole(false);
      setUserRole('team_member'); // Default to team_member
      return;
    }
    
    // CRITICAL: Check cache synchronously for instant UI
    // This must happen immediately, not async
    const cached = userRoleCache.get(String(user.id));
    if (cached) {
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        // Set role immediately from cache - instant UI!
        setUserRole(cached.role);
        setIsCheckingRole(false); // Not checking - we have cache
        // Continue to refresh in background (see checkRole below) but UI is already updated
        return; // Exit early - we have cache, UI is updated
      }
    }
    
    // If no cache, we need to check (but UI will show admin items optimistically)
    // isCheckingRole stays true, which means admin items will show
  }, [isLoaded, user?.id]);
  
  const [isClientMode, setIsClientMode] = useState(false);
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [isTeamManagementEnabled, setIsTeamManagementEnabled] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!effectiveOrgSlug) {
          setIsTeamManagementEnabled(false);
          return;
        }

        const res = await fetch('/api/workspaces', { cache: 'no-store' });
        if (!res.ok) {
          setIsTeamManagementEnabled(false);
          return;
        }

        const data = await res.json().catch(() => null);
        const workspaces = (data?.workspaces || []) as Array<{ slug: string; id: string; entitlements?: Record<string, boolean>; capabilities?: { isTeamManagementEnabled?: boolean } }>;
        const ws = workspaces.find((w) => String(w.slug) === String(effectiveOrgSlug) || String(w.id) === String(effectiveOrgSlug));
        const capTeamEnabled = ws?.capabilities?.isTeamManagementEnabled;
        if (typeof capTeamEnabled === 'boolean') {
          setIsTeamManagementEnabled(Boolean(capTeamEnabled));
          return;
        }

        const ent = ws?.entitlements;
        setIsTeamManagementEnabled(Boolean(ent?.nexus));
      } catch {
        setIsTeamManagementEnabled(false);
      }
    };

    run();
  }, [effectiveOrgSlug]);
  
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCampaignWizardOpen, setIsCampaignWizardOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  const [clients, setClients] = useState<Client[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.clients as any) : []));
  const [pinnedClientIds, setPinnedClientIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.posts as any) : []));
  const [tasks, setTasks] = useState<SocialTask[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.tasks as any) : []));
  const [team, setTeam] = useState<TeamMember[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.team as any) : []));
  const [clientRequests, setClientRequests] = useState<ClientRequest[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.clientRequests as any) : []));
  const [managerRequests, setManagerRequests] = useState<ManagerRequest[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.managerRequests as any) : []));
  const [conversations, setConversations] = useState<Conversation[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.conversations as any) : []));
  const [ideas, setIdeas] = useState<Idea[]>(() => (initialSocialData && hasInitialDataForOrg(initialSocialData) ? (initialSocialData.ideas as any) : []));
  const [isLoadingData, setIsLoadingData] = useState(() => !(initialSocialData && hasInitialDataForOrg(initialSocialData)));
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const loadOnceKeyRef = useRef<string | null>(null);

  const initialDataAppliedRef = useRef(false);
  useEffect(() => {
    if (initialDataAppliedRef.current) return;
    if (!initialSocialData) return;
    if (!hasInitialDataForOrg(initialSocialData)) return;

    initialDataAppliedRef.current = true;

    if (Array.isArray(initialSocialData.clients)) {
      setClients(initialSocialData.clients as any);
      if (initialSocialData.clients.length > 0) {
        setPinnedClientIds((initialSocialData.clients as any).slice(0, 2).map((c: any) => c.id));
      }
    }
    if (Array.isArray(initialSocialData.team)) setTeam(initialSocialData.team as any);
    if (Array.isArray(initialSocialData.posts)) setPosts(initialSocialData.posts as any);
    if (Array.isArray(initialSocialData.tasks)) setTasks(initialSocialData.tasks as any);
    if (Array.isArray(initialSocialData.conversations)) setConversations(initialSocialData.conversations as any);
    if (Array.isArray(initialSocialData.clientRequests)) setClientRequests(initialSocialData.clientRequests as any);
    if (Array.isArray(initialSocialData.managerRequests)) setManagerRequests(initialSocialData.managerRequests as any);
    if (Array.isArray(initialSocialData.ideas)) setIdeas(initialSocialData.ideas as any);

    setIsLoadingData(false);
  }, [initialSocialData, effectiveOrgSlug]);
  
  const [platformConfigs, setPlatformConfigs] = useState<AgencyServiceConfig[]>(DEFAULT_PLATFORM_CONFIGS);
  const [marketplaceAddons, setMarketplaceAddons] = useState<AgencyServiceConfig[]>(MARKETPLACE_ADDONS);
  
  const [activeDraft, setActiveDraft] = useState<AIOpportunity | null>(null);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<{ order: PaymentOrder; client: Client } | null>(null);
  const [editingTask, setEditingTask] = useState<SocialTask | null>(null);
  
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
  
  // Sync user profile image with Google when it changes
  useEffect(() => {
    const syncProfileImage = async () => {
      if (!user?.id || !user?.imageUrl || !isLoaded) {
        return;
      }

      try {
        // Update profile image in Supabase via Server Action
        const { getOrCreateSupabaseUserAction } = await import('@/app/actions/users');
        await getOrCreateSupabaseUserAction(
          user.id,
          user.emailAddresses[0]?.emailAddress,
          user.fullName || undefined,
          user.imageUrl
        );
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
        // Only show loading if we don't have cache
        const cached = userRoleCache.get(String(user.id));
        const hasValidCache = Boolean(cached && (() => {
          const CACHE_DURATION = 5 * 60 * 1000;
          return Date.now() - cached.timestamp < CACHE_DURATION;
        })());
        
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
          userRoleCache.set(String(user.id), { role, timestamp: Date.now() });
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
      const { isSupabaseConfigured } = await import('@/lib/supabase-client');
      if (!isSupabaseConfigured()) {
        console.error('Supabase not configured');
        throw new Error('Supabase not configured');
      }
      
      // Fetch all data in parallel using Server Actions
      // Optimized: Fetch only critical data first, then secondary data
      
      // 1. Critical data for initial render (Clients, Team)
      const [clientsResult, teamResult] = await Promise.all([
        // When in workspace route -> pass orgId as second arg (source of truth)
        workspaceOrgId
          ? getClients(user?.id || undefined, workspaceOrgId)
          : getClients(user?.id || undefined),
        getTeamMembers(),
      ]);

      if (!isMountedRef.current) return;

      // Handle clients result
      let clientsWithPlatforms: Client[] = [];
      if (clientsResult.success && clientsResult.data) {
        // Fetch active platforms for each client - Limit concurrency
        // Optimized: Parallelize but not all at once if too many clients
        const clients = clientsResult.data;
        clientsWithPlatforms = await Promise.all(
          clients.map(async (client: Client) => {
            try {
              const platforms = await fetchActivePlatforms(client.id);
              return { ...client, activePlatforms: platforms as any };
            } catch (e) {
              return client; // Fallback if platforms fetch fails
            }
          })
        );
        
        if (isMountedRef.current) {
          setClients(clientsWithPlatforms);
          if (clientsWithPlatforms.length > 0) {
            setPinnedClientIds(clientsWithPlatforms.slice(0, 2).map((c: Client) => c.id));
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
        workspaceOrgId ? getPosts(undefined, workspaceOrgId) : getPosts(),
        getTasks(),
        getConversations(),
        getClientRequests(),
        getManagerRequests(),
        getIdeas(),
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
  }, [user, addToast, workspaceOrgId]);

  // Load data from Supabase when authenticated (only once, not on every navigation)
  useEffect(() => {
    isMountedRef.current = true;
    
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
    if (activeClientId) {
      getIdeas(activeClientId).then(result => {
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
  }, [activeClientId]);

  return (
    <AppContext.Provider value={{
      isAuthenticated,
      user,
      isLoaded,
      userRole,
      isCheckingRole,
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

