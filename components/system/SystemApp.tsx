'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LogOut, X, Search, CalendarDays, UserPlus, Kanban, Plus, Play, Sparkles, Home, Megaphone, Settings, FileText, Target, AppWindow, PhoneCall } from 'lucide-react';
import { Lead, PipelineStage, Activity as LeadActivity, WebhookLog, CalendarEvent, Task, ContentItem, Student, HandoverData, Campaign, Invoice } from './types';
import { NAV_ITEMS, INITIAL_CAMPAIGNS, INITIAL_AGENTS, INITIAL_TASKS, INITIAL_CONTENT, INITIAL_STUDENTS, INITIAL_INVOICES } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { CallAnalysisProvider } from './contexts/CallAnalysisContext';
import { BrandProvider } from './contexts/BrandContext';
import useLocalStorage from './hooks/useLocalStorage';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomSwitcher } from '../shared/RoomSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useBrand } from './contexts/BrandContext';
import { SystemHeader } from './SystemHeader';
import Sidebar from './Sidebar';
import LeadsHub from './LeadsHub';
import LoginView from './LoginView';
import { ErrorBoundary } from './ErrorBoundary';
import WorkspaceHub from './WorkspaceHub';
import LeadModal from './LeadModal';
import NewLeadModal from './NewLeadModal';
import CalendarView from './system.os/components/CalendarView';
import NewMeetingModal from './NewMeetingModal';
import HandoverDialog from './HandoverDialog';
import MarketingView from './MarketingView';
import CommandPalette from './CommandPalette';
import FocusModeView from './FocusModeView';
import FinanceView from './FinanceView';
import NotificationsView from './NotificationsView';
import HeadquartersView from '../nexus/HeadquartersView';
import OperationsHub from './OperationsHub';
import SystemHub from './SystemHub';
import ReportsView from './ReportsView';
import CatalogView from './CatalogView';
import ClientPortalView from './ClientPortalView';
import PersonalAreaView from './PersonalAreaView';
import CommunicationView from './CommunicationView';
import TasksView from '../nexus/TasksView';
import AIAnalyticsView from './AIAnalyticsView';
import DataConnectivityView from './DataConnectivityView';
import GlobalProfileHub from '@/components/profile/GlobalProfileHub';
import { getMyProfile } from '@/app/actions/profiles';
import { getSystemLeads, type SystemLeadDTO } from '@/app/actions/system-leads';
import { DataProvider } from '@/context/DataContext';
import { MeView } from '@/views/MeView';
import { mapDtoToLead } from './utils/mapDtoToLead';

declare const confetti: any;

type StrategicContentItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  module_id: string;
};

const SystemBootScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let timeoutId: any = null;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          timeoutId = setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 30);

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen bg-[#F8FAFC] flex flex-col items-center justify-center z-[100] overflow-hidden overscroll-none touch-none">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] animate-blob pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="w-24 h-24 bg-nexus-gradient rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-rose-500/30 animate-bounce">
          <Target size={48} strokeWidth={1.5} />
        </div>
        <div className="w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-nexus-gradient transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">מתניע מנועים...</p>
      </div>
    </div>
  );
};

const TAB_IDS = new Set([
  'workspace',
  'sales_pipeline',
  'sales_leads',
  'calendar',
  'comms',
  'dialer',
  'tasks',
  'mkt_campaigns',
  'mkt_content',
  'mkt_forms',
  'mkt_partners',
  'finance',
  'quotes',
  'products',
  'operations',
  'reports',
  'headquarters',
  'system',
  'me',
  'hub',
  'personal_area',
  'notifications_center',
  'focus_mode',
  'data_connectivity',
  'ai_analytics',
  'settings',
]);

const tabFromPathname = (pathname: string | null | undefined) => {
  if (!pathname) return null;
  const parts = pathname.split('/').filter(Boolean);
  const systemIndex = parts.indexOf('system');
  if (systemIndex === -1) return null;
  const candidate = parts[systemIndex + 1] || null;
  if (!candidate) return null;
  return TAB_IDS.has(candidate) ? candidate : null;
};

const SystemOSApp = ({
  initialTab,
  initialCurrentUser,
  initialOrganization,
}: {
  initialTab?: string;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) => {
  const { user, logout, isLoading, isSuperAdmin, isTenantAdmin, tenantId } = useAuth();
  const { addToast } = useToast();
  const { title } = useRoomBranding();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWorkspaceRoute = Boolean(pathname?.startsWith('/w/'));
  const { brandName, brandLogo } = useBrand();
  
  const [isMounted, setIsMounted] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('nexus_booted') === 'true';
        setBooted(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = tabFromPathname(pathname);
    if (fromUrl) return fromUrl;
    if (initialTab && TAB_IDS.has(initialTab)) return initialTab;
    return 'workspace';
  }); 

  const [meProfile, setMeProfile] = useState<{
    fullName: string;
    role: string | null;
    avatarUrl: string | null;
    phone: string | null;
    location: string | null;
    bio: string | null;
  } | null>(null);

  const basePath = useMemo(() => {
    const parts = (pathname || '').split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    const orgSlug = wIndex !== -1 ? parts[wIndex + 1] : null;
    return orgSlug ? `/w/${orgSlug}/system` : null;
  }, [pathname]);

  const orgSlug = useMemo(() => {
    const parts = (pathname || '').split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    return wIndex !== -1 ? (parts[wIndex + 1] || null) : null;
  }, [pathname]);

  useEffect(() => {
    const load = async () => {
      if (!orgSlug) return;
      try {
        const res = await getMyProfile({ orgSlug });
        if (!res.success || !res.data?.profile) return;
        const p: any = res.data.profile;
        setMeProfile({
          fullName: String(p.full_name || user?.name || 'החשבון שלי'),
          role: p.role ? String(p.role) : null,
          avatarUrl: p.avatar_url ? String(p.avatar_url) : null,
          phone: p.phone ? String(p.phone) : null,
          location: p.location ? String(p.location) : null,
          bio: p.bio ? String(p.bio) : null,
        });
      } catch {
        // Best-effort
      }
    };
    load();
  }, [orgSlug, user?.name]);

  const navigateToTab = (tabId: string) => {
    if (!basePath) return;
    const from = pathname || `${basePath}/workspace`;
    if (tabId === 'me') {
      router.push(`${basePath}/me`);
      return;
    }
    if (tabId === 'personal_area') {
      router.push(`${basePath}/hub?origin=system&drawer=profile&from=${encodeURIComponent(from)}`);
      return;
    }
    if (tabId === 'system' || tabId === 'settings') {
      router.push(`${basePath}/hub?origin=system&drawer=system&from=${encodeURIComponent(from)}`);
      return;
    }
    router.push(`${basePath}/${tabId}`);
  };
  const [viewMode, setViewMode] = useState<'admin' | 'portal'>('admin');
  const [activePortalClient, setActivePortalClient] = useState<Lead | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isCloserOpen, setIsCloserOpen] = useState(false);
  const [closerItems, setCloserItems] = useState<StrategicContentItem[]>([]);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const [showAdminNextActionCard, setShowAdminNextActionCard] = useState(false);
  const adminNextActionStorageKey = useMemo(() => {
    const key = tenantId || 'global';
    return `system_admin_first_action_done_${key}`;
  }, [tenantId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!user?.id) {
      setShowAdminNextActionCard(false);
      return;
    }

    const isAdmin = Boolean(isSuperAdmin || isTenantAdmin);
    if (!isAdmin) {
      setShowAdminNextActionCard(false);
      return;
    }

    const alreadyDone = localStorage.getItem(adminNextActionStorageKey) === 'true';
    setShowAdminNextActionCard(!alreadyDone);
  }, [adminNextActionStorageKey, isSuperAdmin, isTenantAdmin, user?.id]);

  const dismissAdminNextActionCard = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(adminNextActionStorageKey, 'true');
      }
    } catch {
      // ignore
    }
    setShowAdminNextActionCard(false);
  };

  const [leads, setLeads] = useState<Lead[]>([]);
  const [storedTasks, setStoredTasks] = useLocalStorage<Task[]>('sales_os_tasks_v1', []);
  const [storedContent, setStoredContent] = useLocalStorage<ContentItem[]>('sales_os_content_v1', []);
  const [storedStudents, setStoredStudents] = useLocalStorage<Student[]>('sales_os_students_v1', []);
  const [storedCampaigns, setStoredCampaigns] = useLocalStorage<Campaign[]>('sales_os_campaigns_v1', []);
  const [storedInvoices, setStoredInvoices] = useLocalStorage<Invoice[]>('sales_os_invoices_v1', []);
  
  const [storedEvents, setStoredEvents] = useLocalStorage<CalendarEvent[]>('sales_os_events_v1', []);

  const tasks = useMemo(() => {
      return storedTasks.map(t => ({
          ...t,
          dueDate: new Date(t.dueDate)
      }));
  }, [storedTasks]);

  useEffect(() => {
    const load = async () => {
      if (!orgSlug) return;
      try {
        const rows = await getSystemLeads(orgSlug);
        const mapped = Array.isArray(rows) ? rows.map(mapDtoToLead) : [];
        setLeads(mapped);
      } catch {
        setLeads([]);
        addToast('שגיאה בטעינת לידים', 'error');
      }
    };
    load();
  }, [addToast, orgSlug]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);
  const [pendingWonLead, setPendingWonLead] = useState<Lead | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [meetingModalPreselectId, setMeetingModalPreselectId] = useState<string>('');
  
  const calendarEvents = storedEvents;
  const setCalendarEvents = setStoredEvents;

  const goldenPayload = useMemo(() => {
    if (!pendingWonLead) return null;
    return {
      client_id: pendingWonLead.id,
      company_name: pendingWonLead.company || pendingWonLead.name,
      contact_person: {
        name: pendingWonLead.name,
        phone: pendingWonLead.phone,
        email: pendingWonLead.email,
        role: "Primary Contact"
      },
      deal_details: {
        package_type: pendingWonLead.productInterest || 'General Consulting',
        value: pendingWonLead.value,
        currency: "ILS",
        start_date: new Date().toISOString().split('T')[0]
      },
      sales_notes: pendingWonLead.activities.filter(a => a.type === 'note' || a.type === 'call').slice(0, 3).map(a => a.content).join('; ') || "No specific sales notes",
      source: pendingWonLead.source
    };
  }, [pendingWonLead]);

  useEffect(() => {
      if (typeof document === 'undefined') return;
      document.title = title;
  }, [title]);

  useEffect(() => {
    const fromUrl = tabFromPathname(pathname);
    if (fromUrl && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
  }, [pathname, activeTab]);

  useEffect(() => {
    const leadIdFromUrl = searchParams?.get('leadId');
    if (!leadIdFromUrl) return;
    const match = leads.find((l) => String(l.id) === String(leadIdFromUrl));
    if (!match) return;
    setSelectedLead(match);
  }, [leads, searchParams]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (user) setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true });
  }, [user]);

  useEffect(() => {
    if (!isCloserOpen) return;
    const load = async () => {
      try {
        const res = await fetch('/api/strategic-content?module_id=system', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data?.items) ? (data.items as StrategicContentItem[]) : [];
        setCloserItems(items.filter((i) => i.category === 'sales_mastery' || i.category === 'objections'));
      } catch {
        // ignore
      }
    };
    load();
  }, [isCloserOpen]);

  const mobileMenuItems = useMemo(() => {
    const bottomNavIds = new Set(['workspace', 'sales_pipeline', 'mkt_campaigns']);
    const baseItems = NAV_ITEMS.filter((item) => !bottomNavIds.has(item.id) && item.id !== 'dialer');

    const headquartersItem = baseItems.find((i) => i.id === 'headquarters');
    const withoutHeadquarters = baseItems.filter((i) => i.id !== 'headquarters');

    if (!headquartersItem) return baseItems;

    const ordered: typeof baseItems = [];
    let inserted = false;
    for (const item of withoutHeadquarters) {
      ordered.push(item);
      if (!inserted && item.id === 'comms') {
        ordered.push(headquartersItem);
        inserted = true;
      }
    }

    if (!inserted) ordered.push(headquartersItem);
    return ordered;
  }, []);

  const togglePlusMenu = () => {
    setIsMobileMenuOpen(false);
    setIsPlusMenuOpen((open) => !open);
  };

  const openMobileMenu = () => {
    setIsPlusMenuOpen(false);
    setIsMobileMenuOpen(true);
  };

  const handlePlusLeadClick = () => {
    setIsPlusMenuOpen(false);
    setShowNewLeadModal(true);
  };

  const handlePlusDialerClick = () => {
    setIsPlusMenuOpen(false);
    navigateToTab('dialer');
  };

  // All hooks must be called before any early returns
  const activeNavItem = NAV_ITEMS.find(n => n.id === activeTab);
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  // Early returns after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">טוען System...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginView />;

  // Prevent hydration mismatch by keeping SSR + first client render identical.
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">טוען System...</p>
        </div>
      </div>
    );
  }

  if (!booted) {
    return (
      <SystemBootScreen
        onComplete={() => {
          setBooted(true);
          try {
            if (typeof window !== 'undefined') sessionStorage.setItem('nexus_booted', 'true');
          } catch {
            // ignore
          }
        }}
      />
    );
  }

  const handleStatusChange = async (leadId: string, newStatus: PipelineStage) => {
    if (newStatus === 'won') {
        const lead = leads.find(l => l.id === leadId);
        if (lead && lead.status !== 'won') {
            setPendingWonLead(lead);
            setShowHandoverDialog(true);
            return;
        }
    }
    setLeads(prevLeads => prevLeads.map(lead => {
        if (lead.id === leadId) return { ...lead, status: newStatus, lastContact: new Date() };
        return lead;
    }));
  };

  const handleSaveNewLead = (newLead: Lead) => {
      setLeads(prev => [newLead, ...prev]);
      addToast("ליד נוצר", 'success');
  };

  const handleHandoverConfirm = (handoverData: HandoverData) => {
    if (!pendingWonLead || !goldenPayload) return;
    if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#A21D3C', '#3730A3', '#ffffff'] });

    setLeads(prev => prev.map(l => l.id === pendingWonLead.id ? { 
      ...l, status: 'won', lastContact: new Date(), activities: [{ id: Date.now().toString(), type: 'system', content: 'עסקה נסגרה. Handover בוצע.', timestamp: new Date() }, ...l.activities],
      handover: handoverData
    } : l));

    setShowHandoverDialog(false);
    setPendingWonLead(null);
    addToast("מזל טוב! תיק לקוח נפתח.", 'success');
  };

  const handleAddActivity = (leadId: string, activity: LeadActivity) => {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, activities: [activity, ...l.activities], lastContact: new Date() } : l));
      if (activity.type !== 'system') addToast("נשמר");
  };

  const handleScheduleMeeting = (leadId?: string) => {
      setMeetingModalPreselectId(leadId || '');
      setShowNewMeetingModal(true);
  };

  const handleSaveMeeting = (newMeeting: CalendarEvent) => {
      setCalendarEvents([...calendarEvents, newMeeting]);
      addToast("הפגישה נוספה לאירועים");
      setShowNewMeetingModal(false);
  };

  const handleUpdateTask = (updatedTask: Task) => {
      setStoredTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (updatedTask.status === 'done') addToast("סיימת משימה, אלוף!", 'success');
  };

  const handleOpenClientPortal = (lead: Lead) => {
    const email = String((lead as any)?.email || '').trim();
    if (!email) {
      addToast('לא ניתן לפתוח פורטל לקוח כי לליד אין אימייל.', 'warning');
      return;
    }
    setActivePortalClient(lead);
    setViewMode('portal');
    addToast('עברת למצב לקוח', 'info');
  };
  const handleExitPortal = () => { setViewMode('admin'); setActivePortalClient(null); };

  const isProbablyTokenOrId = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return true;
      if (trimmed.length > 40) return true;
      if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return true;
      if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) return true;
      return false;
  };

  const safeUserName = isProbablyTokenOrId(user.name)
    ? (user.email?.split('@')[0] || 'משתמש')
    : user.name;

  const avatarValue = String((user as any)?.avatar ?? '').trim();
  const headerAvatarUrl = String(meProfile?.avatarUrl || avatarValue || '').trim();
  const hasValidAvatarSrc =
    !!headerAvatarUrl &&
    (headerAvatarUrl.startsWith('http') || headerAvatarUrl.startsWith('data:') || headerAvatarUrl.startsWith('/'));

  const roleLabel = isSuperAdmin ? 'סופר אדמין' : isTenantAdmin ? 'אדמין ארגון' : user.role === 'admin' ? 'מנהל' : 'סוכן';
  const headerName = meProfile?.fullName || safeUserName;
  const headerRoleLabel = meProfile?.role || roleLabel;

  // Early return after all hooks
  if (viewMode === 'portal' && activePortalClient) return <ClientPortalView client={activePortalClient} onExit={handleExitPortal} />;

  const getMobileMenuItemStyle = (tabId: string, isActive: boolean) => {
    if (isActive) {
      return 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 border-slate-900';
    }
    switch (tabId) {
      case 'tasks':
        return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100';
      case 'calendar':
        return 'bg-red-50 text-red-700 hover:bg-red-100 border-red-100';
      case 'comms':
      case 'dialer':
        return 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100';
      case 'sales_leads':
      case 'sales_pipeline':
        return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100';
      case 'mkt_content':
      case 'mkt_forms':
      case 'mkt_partners':
      case 'mkt_campaigns':
        return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100';
      case 'finance':
      case 'quotes':
      case 'products':
        return 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100';
      case 'reports':
      case 'headquarters':
      case 'operations':
      case 'data_connectivity':
      case 'ai_analytics':
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
      case 'personal_area':
      case 'notifications_center':
      case 'system':
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';
    }
  };

  const getHeaderActions = () => {
      switch(activeTab) {
          case 'workspace':
          case 'sales_pipeline':
          case 'sales_leads':
              return null;
case 'finance':
case 'quotes':
    return (
        <button onClick={() => addToast('תנועה כספית', 'info')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
            <FileText size={16} /> <span className="hidden md:inline">תנועה כספית</span>
        </button>
    );
case 'products':
    return (
        <button onClick={() => addToast('מוצר חדש', 'info')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
            <Plus size={16} /> <span className="hidden md:inline">מוצר חדש</span>
        </button>
    );
case 'dialer':
    return (
        <button onClick={() => addToast('חייג מספר', 'info')} className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2">
            <Play size={16} /> <span className="hidden md:inline">חיוג מהיר</span>
        </button>
    );
          case 'mkt_campaigns':
              return (
                  <button onClick={() => setShowNewLeadModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                      <Megaphone size={16} /> <span className="hidden md:inline">קמפיין חדש</span>
                  </button>
              );
          case 'calendar':
              return (
                <button onClick={() => setShowNewMeetingModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                    <Plus size={16} /> <span className="hidden md:inline">פגישה חדשה</span>
                </button>
              );
          case 'tasks':
              return (
                <button onClick={() => addToast('יצירת משימה אינה זמינה כרגע', 'info')} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                    <Plus size={16} /> <span className="hidden md:inline">משימה חדשה</span>
                </button>
              );
          default:
              return null;
      }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-[100px] animate-blob mix-blend-multiply filter"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply filter"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply filter"></div>
      </div>

      <div className="hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] shrink-0 z-30 h-screen relative">
        <Sidebar activeTab={activeTab} user={user} logout={logout} isSuperAdmin={isSuperAdmin} isTenantAdmin={isTenantAdmin} />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <SystemHeader
          title={activeNavItem?.label || 'לוח בקרה'}
          currentDate={currentDate || 'טוען...'}
          brand={{
            name: brandName,
            logoUrl: null,
            fallbackIcon: (
              <div className="w-full h-full bg-gradient-to-br from-rose-600 to-indigo-600 flex items-center justify-center">
                <Target size={18} className="text-white" strokeWidth={2.5} />
              </div>
            ),
          }}
          isWorkspaceRoute={isWorkspaceRoute}
          onOpenCommandPaletteAction={() => setIsCommandPaletteOpen(true)}
          onNavigateToNotificationsAction={() => navigateToTab('notifications_center')}
          onProfileClickAction={() => {
            if (basePath) {
              router.push(`${basePath}/me`);
            } else {
              router.push('/me');
            }
          }}
          user={{ name: headerName, email: user.email || `${user.id}@system.os` }}
          roleLabel={headerRoleLabel}
          avatarUrl={headerAvatarUrl}
          hasValidAvatarSrc={hasValidAvatarSrc}
        />

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 min-h-0 touch-pan-y" id="main-scroll-container" style={{ WebkitOverflowScrolling: 'touch' }}>
          <ErrorBoundary>
            <div className="max-w-[1920px] mx-auto">
              {showAdminNextActionCard ? (
                <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">הצעד הבא</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">הגדרה ראשונה של המערכת</div>
                    <div className="text-sm text-slate-500 mt-1">מומלץ להתחיל מהגדרות: צוות, הרשאות, ואוטומציות בסיסיות.</div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={dismissAdminNextActionCard}
                      className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      סגור
                    </button>
                    <button
                      onClick={() => {
                        navigateToTab('settings');
                        dismissAdminNextActionCard();
                      }}
                      className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-nexus-accent transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <Settings size={16} /> פתח הגדרות
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Page Header with Title and Actions - Hidden in System, title is in header */}
              <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div className="flex gap-3">
                  {getHeaderActions()}
                </div>
              </div>

              <AnimatePresence mode='wait'>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
                  className="flex flex-col min-h-0 pb-16 md:pb-0"
                >
                              {activeTab === 'workspace' && (
                                  <WorkspaceHub leads={leads} content={storedContent} students={storedStudents} campaigns={storedCampaigns} tasks={tasks} events={calendarEvents} onLeadClick={setSelectedLead} onNavigate={setActiveTab} onQuickAction={setActiveTab} onAddEvent={handleSaveMeeting} onNewMeetingClick={() => setShowNewMeetingModal(true)} onAddActivity={handleAddActivity} onUpdateTask={handleUpdateTask} onAddTask={(t) => setStoredTasks(p => [t, ...p])} />
                              )}
                              {activeTab === 'me' && (
                                <div className="w-full">
                                  <DataProvider initialCurrentUser={initialCurrentUser} initialOrganization={initialOrganization}>
                                    <MeView
                                      basePathOverride={basePath ? String(basePath) : undefined}
                                      moduleCards={
                                        basePath
                                          ? [
                                              {
                                                title: 'לידים',
                                                subtitle: 'צינור מכירות וניהול פניות',
                                                href: `${basePath}/sales_leads`,
                                                iconId: 'target',
                                              },
                                              {
                                                title: 'הגדרות מערכת',
                                                subtitle: 'תצורה, שדות ואוטומציות',
                                                href: `${basePath}/hub?origin=system&drawer=system&from=${encodeURIComponent(
                                                  `${basePath}/me`
                                                )}`,
                                                iconId: 'settings',
                                              },
                                            ]
                                          : undefined
                                      }
                                    />
                                  </DataProvider>
                                </div>
                              )}
                              {(activeTab === 'sales_pipeline' || activeTab === 'sales_leads') && (
                                  <LeadsHub leads={leads} onLeadClick={setSelectedLead} onStatusChange={handleStatusChange} initialTab={activeTab === 'sales_pipeline' ? 'pipeline' : 'list'} />
                              )}
                              {activeTab === 'calendar' && (
                                <CalendarView leads={leads} events={calendarEvents} onAddEvent={handleSaveMeeting} onNewMeetingClick={() => setShowNewMeetingModal(true)} />
                              )}
                              {activeTab === 'comms' && (
                                <CommunicationView leads={leads} onAddActivity={handleAddActivity} onAddTask={(t) => setStoredTasks(p => [t, ...p])} user={user} />
                              )}
                              {activeTab === 'dialer' && (
                                <CommunicationView leads={leads} onAddActivity={handleAddActivity} onAddTask={(t) => setStoredTasks(p => [t, ...p])} user={user} />
                              )}
{activeTab === 'tasks' && (
  <TasksView tasks={tasks} onUpdateTask={handleUpdateTask} onAddTask={(t) => setStoredTasks(p => [t, ...p])} />
)}
{activeTab === 'mkt_campaigns' && <MarketingView campaigns={storedCampaigns} content={storedContent} onUpdateContent={(c) => setStoredContent(p => p.map(i => i.id === c.id ? c : i))} onAddContent={(c) => setStoredContent(p => [c, ...p])} onAddCampaign={(c) => setStoredCampaigns(p => [c, ...p])} onUpdateCampaign={(c) => setStoredCampaigns(p => p.map(i => i.id === c.id ? c : i))} onDeleteCampaign={(id) => setStoredCampaigns(p => p.filter(i => i.id !== id))} initialTab="campaigns" />}
{activeTab === 'mkt_content' && <MarketingView campaigns={storedCampaigns} content={storedContent} onUpdateContent={(c) => setStoredContent(p => p.map(i => i.id === c.id ? c : i))} onAddContent={(c) => setStoredContent(p => [c, ...p])} onAddCampaign={(c) => setStoredCampaigns(p => [c, ...p])} onUpdateCampaign={(c) => setStoredCampaigns(p => p.map(i => i.id === c.id ? c : i))} onDeleteCampaign={(id) => setStoredCampaigns(p => p.filter(i => i.id !== id))} initialTab="content" />}
{activeTab === 'mkt_forms' && <MarketingView campaigns={storedCampaigns} content={storedContent} onUpdateContent={(c) => setStoredContent(p => p.map(i => i.id === c.id ? c : i))} onAddContent={(c) => setStoredContent(p => [c, ...p])} onAddCampaign={(c) => setStoredCampaigns(p => [c, ...p])} onUpdateCampaign={(c) => setStoredCampaigns(p => p.map(i => i.id === c.id ? c : i))} onDeleteCampaign={(id) => setStoredCampaigns(p => p.filter(i => i.id !== id))} initialTab="forms" />}
{activeTab === 'mkt_partners' && <MarketingView campaigns={storedCampaigns} content={storedContent} onUpdateContent={(c) => setStoredContent(p => p.map(i => i.id === c.id ? c : i))} onAddContent={(c) => setStoredContent(p => [c, ...p])} onAddCampaign={(c) => setStoredCampaigns(p => [c, ...p])} onUpdateCampaign={(c) => setStoredCampaigns(p => p.map(i => i.id === c.id ? c : i))} onDeleteCampaign={(id) => setStoredCampaigns(p => p.filter(i => i.id !== id))} initialTab="partners" />}
{activeTab === 'finance' && <FinanceView invoices={storedInvoices} onAddInvoice={(i) => setStoredInvoices(p => [i, ...p])} onUpdateInvoice={(i) => setStoredInvoices(p => p.map(inv => inv.id === i.id ? i : inv))} leads={leads} initialTab="invoices" />}
{activeTab === 'quotes' && <FinanceView invoices={storedInvoices} onAddInvoice={(i) => setStoredInvoices(p => [i, ...p])} onUpdateInvoice={(i) => setStoredInvoices(p => p.map(inv => inv.id === i.id ? i : inv))} leads={leads} initialTab="invoices" />}
{activeTab === 'products' && <CatalogView />}
                              {activeTab === 'operations' && <OperationsHub students={storedStudents} leads={leads} onUpdateStudent={(s) => setStoredStudents(p => p.map(i => i.id === s.id ? s : i))} />}
                              {activeTab === 'reports' && <ReportsView leads={leads} campaigns={storedCampaigns} tasks={tasks} />}
                              {activeTab === 'headquarters' && <HeadquartersView onAddTask={(t) => setStoredTasks(p => [t, ...p])} leads={leads} />}
                              {activeTab === 'system' && (
                                <SystemHub 
                                  logs={webhookLogs} 
                                  leads={leads} 
                                  agents={INITIAL_AGENTS}
                                  onAddTask={(t) => setStoredTasks(p => [t, ...p])}
                                  onAddActivity={handleAddActivity}
                                />
                              )}
                              {activeTab === 'hub' && (
                                <GlobalProfileHub defaultOrigin="system" defaultDrawer="system" />
                              )}
                              {activeTab === 'personal_area' && <PersonalAreaView leads={leads} tasks={tasks} />}
                              {activeTab === 'notifications_center' && <NotificationsView />}
                              {activeTab === 'focus_mode' && <FocusModeView />}
                              {activeTab === 'data_connectivity' && <DataConnectivityView />}
                              {activeTab === 'ai_analytics' && <AIAnalyticsView leads={leads} campaigns={storedCampaigns} tasks={tasks} invoices={storedInvoices} />}
                  {activeTab === 'settings' && (
                    <GlobalProfileHub defaultOrigin="system" defaultDrawer="system" />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ErrorBoundary>
        </div>

        <div className="fixed bottom-6 left-6 z-[60]">
          <button
            type="button"
            onClick={() => setIsCloserOpen(true)}
            className="h-12 px-5 rounded-2xl bg-slate-900 text-white font-black shadow-lg shadow-slate-900/20 flex items-center gap-2"
          >
            <FileText size={18} /> עוזר סגירה
          </button>
        </div>

        {isCloserOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setIsCloserOpen(false)}>
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-black text-slate-900">עוזר סגירה בזמן אמת</div>
                  <div className="text-xs text-slate-500 font-bold">תסריט מכירה + טיפול בהתנגדויות</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCloserOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {closerItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                    <div className="text-sm font-black text-slate-900">{item.title}</div>
                    <div className="text-sm font-bold text-slate-700 mt-3 whitespace-pre-line leading-relaxed">{item.content}</div>
                  </div>
                ))}
                {!closerItems.length && (
                  <div className="text-sm font-bold text-slate-500">טוען תכנים...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[45] backdrop-blur-sm md:hidden"
              onClick={() => setIsPlusMenuOpen(false)}
            />

            <div className="fixed bottom-28 left-0 right-0 z-[50] flex justify-center gap-4 sm:gap-6 md:hidden pointer-events-none px-4">
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.05 }}
                className="flex flex-col items-center gap-2.5 pointer-events-auto"
              >
                <button
                  onClick={handlePlusDialerClick}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all duration-200 border border-emerald-400/20"
                  aria-label="חייגן"
                  type="button"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <PhoneCall size={24} className="sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">חייגן</span>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex flex-col items-center gap-2.5 pointer-events-auto"
              >
                <button
                  onClick={handlePlusLeadClick}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-nexus-gradient text-white rounded-2xl shadow-lg shadow-black/20 flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all duration-200 border border-white/20"
                  aria-label="הוספת ליד"
                  type="button"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <UserPlus size={24} className="sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">הוספת ליד</span>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                const shouldClose = info.offset.y > 110 || info.velocity.y > 900;
                if (shouldClose) setIsMobileMenuOpen(false);
              }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-[101] p-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] border-t border-white/50"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-50"></div>
              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-4">
                  {mobileMenuItems
                    .filter((item) => item.id !== 'system')
                    .map((item) => {
                      const isActiveItem = activeTab === item.id;
                      const Icon = item.icon;
                      const itemStyle = getMobileMenuItemStyle(item.id, isActiveItem);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigateToTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex flex-col items-center gap-2 group"
                          aria-label={item.label}
                          type="button"
                        >
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md border ${itemStyle} ${
                              isActiveItem ? 'shadow-slate-900/20' : 'shadow-slate-200/60'
                            }`}
                          >
                            <Icon size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
                          </div>
                          <span
                            className={`text-[10px] font-bold text-center leading-tight transition-colors ${
                              isActiveItem ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                {(() => {
                  const settingsItem = mobileMenuItems.find((i) => i.id === 'system');
                  if (!settingsItem) return null;
                  const isActiveItem = activeTab === settingsItem.id;
                  const Icon = settingsItem.icon;
                  const itemStyle = getMobileMenuItemStyle(settingsItem.id, isActiveItem);
                  return (
                    <button
                      onClick={() => {
                        navigateToTab(settingsItem.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl transition-all duration-200 shadow-md border ${itemStyle} ${
                        isActiveItem ? 'shadow-slate-900/20' : 'shadow-slate-200/60'
                      }`}
                      aria-label={settingsItem.label}
                      type="button"
                    >
                      <Icon size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
                      <span className={`text-sm font-black ${isActiveItem ? 'text-white' : 'text-slate-800'}`}>{settingsItem.label}</span>
                    </button>
                  );
                })()}

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                <div className="space-y-3">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">מודולים</div>
                  <OSAppSwitcher mode="inlineGrid" compact={true} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] h-16 shadow-[0_8px_30px_rgba(0,0,0,0.1)] px-2 sm:px-4 flex items-center justify-evenly transition-all duration-300 ${isPlusMenuOpen ? 'z-[60]' : 'z-40'}`}>
        <button 
          onClick={() => navigateToTab('workspace')} 
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            activeTab === 'workspace' 
              ? 'bg-black text-white shadow-lg shadow-black/20' 
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`} 
          aria-label="דף הבית"
        >
          <Home size={18} className="sm:w-5 sm:h-5" strokeWidth={activeTab === 'workspace' ? 2.5 : 2} />
        </button>
        
        <button 
          onClick={() => navigateToTab('sales_pipeline')} 
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            activeTab === 'sales_pipeline' 
              ? 'bg-black text-white shadow-lg shadow-black/20' 
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`} 
          aria-label="מכירות"
        >
          <Kanban size={18} className="sm:w-5 sm:h-5" strokeWidth={activeTab === 'sales_pipeline' ? 2.5 : 2} />
        </button>
        
        <div className="relative -top-6 z-50">
          <button 
            onClick={togglePlusMenu}
            aria-label={isPlusMenuOpen ? 'סגור פעולות' : 'פתח פעולות'}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 border-[4px] sm:border-[5px] border-[#f1f5f9] group relative overflow-hidden ${
              'bg-nexus-gradient hover:scale-105'
            }`}
          >
            <Plus size={26} className={`sm:w-[30px] sm:h-[30px] text-white drop-shadow-md transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} strokeWidth={2.5} />
          </button>
        </div>
        
        <button 
          onClick={() => navigateToTab('mkt_campaigns')} 
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            activeTab === 'mkt_campaigns' 
              ? 'bg-black text-white shadow-lg shadow-black/20' 
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`} 
          aria-label="שיווק"
        >
          <Megaphone size={18} className="sm:w-5 sm:h-5" strokeWidth={activeTab === 'mkt_campaigns' ? 2.5 : 2} />
        </button>
        
        <button 
          onClick={openMobileMenu}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            isMobileMenuOpen
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`}
          aria-label="תפריט"
        >
          <AppWindow size={18} className="sm:w-5 sm:h-5" strokeWidth={2} />
        </button>
      </nav>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={navigateToTab} onSelectLead={setSelectedLead} leads={leads} />
      {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} onAddActivity={handleAddActivity} onScheduleMeeting={handleScheduleMeeting} onOpenClientPortal={() => handleOpenClientPortal(selectedLead)} onAddTask={(t) => setStoredTasks(p => [t, ...p])} />}
      {showNewLeadModal && <NewLeadModal onClose={() => setShowNewLeadModal(false)} onSave={handleSaveNewLead} />}
      {showNewMeetingModal && <NewMeetingModal leads={leads} initialLeadId={meetingModalPreselectId} onClose={() => setShowNewMeetingModal(false)} onSave={handleSaveMeeting} />}
      {showHandoverDialog && pendingWonLead && goldenPayload && <HandoverDialog lead={pendingWonLead} payload={goldenPayload} onClose={() => { setShowHandoverDialog(false); setPendingWonLead(null); }} onConfirm={handleHandoverConfirm} />}
    </div>
  );
}

export default function SystemApp({
  initialCurrentUser,
  initialOrganization,
  initialTab,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialTab?: string;
}) {
  return (
    <ErrorBoundary>
      <AuthProvider initialCurrentUser={initialCurrentUser}>
        <ToastProvider>
          <CallAnalysisProvider>
            <BrandProvider
              initialBrandName={String(initialOrganization?.name || 'system.OS')}
              initialBrandLogo={initialOrganization?.logo || null}
            >
               <SystemOSApp
                 initialTab={initialTab}
                 initialCurrentUser={initialCurrentUser}
                 initialOrganization={initialOrganization}
               />
            </BrandProvider>
          </CallAnalysisProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

