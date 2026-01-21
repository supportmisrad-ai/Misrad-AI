'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LogOut, LayoutGrid, Menu, X, Zap, Search, CalendarDays, PhoneCall, BrainCircuit, Coffee, Megaphone, UserPlus, Kanban, ClipboardList, Map, Bot, Target, Webhook, Settings, Users, ChartBar, Bell, ChevronDown, Home, Briefcase, Plus, MoreHorizontal, Terminal, Activity, Cpu, Server, ChevronRight, User, FileText, CreditCard, Play, Sparkles, Phone, ShieldCheck, HeartPulse } from 'lucide-react';
import { Lead, PipelineStage, Activity as LeadActivity, WebhookLog, CalendarEvent, Task, ContentItem, Student, HandoverData, Campaign, Invoice } from './types';
import { NAV_ITEMS, NAV_GROUPS, INITIAL_LEADS, INITIAL_CAMPAIGNS, INITIAL_AGENTS, INITIAL_TASKS, INITIAL_CONTENT, INITIAL_STUDENTS, INITIAL_INVOICES } from './constants';
import LeadModal from './LeadModal';
import NewLeadModal from './NewLeadModal';
import HandoverDialog from './HandoverDialog';
import MarketingView from './MarketingView';
import CommandPalette from './CommandPalette';
import NewMeetingModal from './NewMeetingModal';
import FocusModeView from './FocusModeView';
import FinanceView from './FinanceView';
import NotificationsView from './NotificationsView';
import LeadsHub from './LeadsHub';
import HeadquartersView from '../nexus/HeadquartersView';
import WorkspaceHub from './WorkspaceHub';
import OperationsHub from './OperationsHub';
import SystemHub from './SystemHub';
import ReportsView from './ReportsView';
import ErrorBoundary from './ErrorBoundary';
import LoginView from './LoginView';
import ClientPortalView from './ClientPortalView';
import PersonalAreaView from './PersonalAreaView';
import Sidebar from './Sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { CallAnalysisProvider } from './contexts/CallAnalysisContext';
import { BrandProvider } from './contexts/BrandContext';
import useLocalStorage from './hooks/useLocalStorage';
import { useOnClickOutside } from './hooks/useOnClickOutside';
import { motion, AnimatePresence } from 'framer-motion';

declare const confetti: any;

const SystemBootScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(onComplete, 500);
                    return 100;
                }
                return prev + 5;
            });
        }, 30);
        return () => clearInterval(interval);
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

const SystemOSApp = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  
  const [booted, setBooted] = useState(() => {
      if (typeof window !== 'undefined') {
          return sessionStorage.getItem('nexus_booted') === 'true';
      }
      return false;
  });

  const [activeTab, setActiveTab] = useState('workspace'); 
  const [viewMode, setViewMode] = useState<'admin' | 'portal'>('admin');
  const [activePortalClient, setActivePortalClient] = useState<Lead | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(profileRef, () => setIsProfileOpen(false));

  const [storedLeads, setStoredLeads] = useLocalStorage<Lead[]>('sales_os_leads_v1', INITIAL_LEADS);
  const [storedTasks, setStoredTasks] = useLocalStorage<Task[]>('sales_os_tasks_v1', INITIAL_TASKS);
  const [storedContent, setStoredContent] = useLocalStorage<ContentItem[]>('sales_os_content_v1', INITIAL_CONTENT);
  const [storedStudents, setStoredStudents] = useLocalStorage<Student[]>('sales_os_students_v1', INITIAL_STUDENTS);
  const [storedCampaigns, setStoredCampaigns] = useLocalStorage<Campaign[]>('sales_os_campaigns_v1', INITIAL_CAMPAIGNS);
  const [storedInvoices, setStoredInvoices] = useLocalStorage<Invoice[]>('sales_os_invoices_v1', INITIAL_INVOICES);
  
  const [storedEvents, setStoredEvents] = useLocalStorage<CalendarEvent[]>('sales_os_events_v1', []);

  const leads = useMemo(() => {
      return storedLeads.map(l => ({
          ...l,
          lastContact: new Date(l.lastContact),
          createdAt: new Date(l.createdAt),
          subscriptionEndDate: l.subscriptionEndDate ? new Date(l.subscriptionEndDate) : undefined,
          activities: l.activities.map(a => ({...a, timestamp: new Date(a.timestamp)}))
      }));
  }, [storedLeads]);

  const tasks = useMemo(() => {
      return storedTasks.map(t => ({
          ...t,
          dueDate: new Date(t.dueDate)
      }));
  }, [storedTasks]);

  const setLeads = (newLeadsInput: Lead[] | ((prev: Lead[]) => Lead[])) => {
      if (typeof newLeadsInput === 'function') {
          setStoredLeads(newLeadsInput(leads));
      } else {
          setStoredLeads(newLeadsInput);
      }
  };

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
      if (user) {
          const label = NAV_ITEMS.find(n => n.id === activeTab)?.label || 'Growth CRM';
          document.title = `Sistem.OS | ${label}`;
      }
  }, [activeTab, user]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (user) setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [user]);

  if (!user) return <LoginView />;
  if (!booted) return <SystemBootScreen onComplete={() => { setBooted(true); sessionStorage.setItem('nexus_booted', 'true'); }} />;

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
      addToast("נקלט ליד", 'success');
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

  const handleOpenClientPortal = (lead: Lead) => { setActivePortalClient(lead); setViewMode('portal'); addToast('עברת למצב לקוח', 'info'); };
  const handleExitPortal = () => { setViewMode('admin'); setActivePortalClient(null); };

  if (viewMode === 'portal' && activePortalClient) return <ClientPortalView client={activePortalClient} onExit={handleExitPortal} />;

  const activeNavItem = NAV_ITEMS.find(n => n.id === activeTab);

  const getHeaderActions = () => {
      switch(activeTab) {
          case 'workspace':
          case 'sales_hub':
              return (
                  <button onClick={() => setShowNewLeadModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                      <UserPlus size={16} /> <span className="hidden md:inline">ליד חדש</span>
                  </button>
              );
          case 'finance':
              return (
                  <button onClick={() => addToast('פעולות כספיות', 'info')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
                      <FileText size={16} /> <span className="hidden md:inline">פעולה כספית</span>
                  </button>
              );
          case 'marketing':
              return (
                  <button onClick={() => setShowNewLeadModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                      <Megaphone size={16} /> <span className="hidden md:inline">קמפיין חדש</span>
                  </button>
              );
          default:
              return (
                  <button onClick={() => setShowNewLeadModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                      <Play size={16} /> <span className="hidden md:inline">פעולה</span>
                  </button>
              );
      }
  };

  return (
    <div className="app-layout font-sans text-onyx-900 bg-transparent">
      <div className="hidden md:block h-full shrink-0 z-50">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} logout={logout} />
      </div>

      <main className="main-content">
          {/* Header strictly for utility tools and profile - Simplified and Clean */}
          <header className="header mb-4 relative md:relative sticky top-0 z-40 bg-white/80 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none px-4 md:px-0 py-4 md:py-2 shadow-sm md:shadow-none border-b border-slate-200/50 md:border-none rounded-b-[32px] justify-end">
            <div className="flex items-center gap-2 md:gap-4 mt-0 justify-end w-full">
                <div className="hidden md:block">{getHeaderActions()}</div>

                <button onClick={() => setIsCommandPaletteOpen(true)} className="w-11 h-11 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-md border border-white/50 text-slate-400 hover:text-primary transition-all shrink-0" aria-label="חיפושים מהירים"><Search size={18} /></button>
                <button onClick={() => setActiveTab('notifications_center')} className="w-11 h-11 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-md border border-white/50 text-slate-400 hover:text-primary transition-all relative shrink-0" aria-label="התראות"><Bell size={18} /><span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span></button>

                <div className="relative hidden md:block" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-white/60 backdrop-blur-md border border-white/50 hover:bg-white transition-all shadow-sm group ml-2" aria-label="תפריט פרופיל">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-700 leading-tight">{user.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.role === 'admin' ? 'מנהל' : 'סוכן'}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-onyx-900 to-slate-800 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white group-hover:scale-105 transition-transform">{user.avatar}</div>
                    </button>
                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full left-0 mt-2 w-64 bg-white/90 backdrop-blur-xl border border-white/50 rounded-[32px] shadow-2xl p-2 z-50 origin-top-left ring-1 ring-slate-900/5 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 mb-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">מחובר כ-</p><p className="font-bold text-slate-800">{user.email || `${user.id}@nexus.os`}</p></div>
                                <div className="space-y-1"><button onClick={() => { setActiveTab('personal_area'); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors text-sm font-bold"><User size={16} /> פרופיל אישי</button><button onClick={() => { setActiveTab('system'); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors text-sm font-bold"><Settings size={16} /> הגדרות</button></div>
                                <div className="mt-2 pt-2 border-t border-slate-100"><button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors text-sm font-bold"><LogOut size={16} /> יציאה</button></div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
          </header>

          <div className="workspace custom-scrollbar relative">
              <ErrorBoundary>
                  <div className="max-w-[1920px] mx-auto min-h-full pb-20 md:pb-12">
                      {/* Page Header with Title and Actions - Clean Version */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 px-4 md:px-0 gap-4">
                          <div>
                              <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">
                                  {activeNavItem?.label || (activeTab === 'personal_area' ? 'אזור אישי' : 'לוח בקרה')}
                              </h2>
                          </div>
                          <div className="flex gap-3">
                              {/* Page-specific actions go here if needed, or stick to the global ones in header */}
                          </div>
                      </div>

                      <AnimatePresence mode='wait'>
                          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="h-full">
                              {activeTab === 'workspace' && (
                                  <WorkspaceHub leads={leads} content={storedContent} students={storedStudents} campaigns={storedCampaigns} tasks={tasks} events={calendarEvents} onLeadClick={setSelectedLead} onNavigate={setActiveTab} onQuickAction={setActiveTab} onAddEvent={handleSaveMeeting} onNewMeetingClick={() => setShowNewMeetingModal(true)} onAddActivity={handleAddActivity} onUpdateTask={handleUpdateTask} onAddTask={(t) => setStoredTasks(p => [t, ...p])} />
                              )}
                              {activeTab === 'sales_hub' && <LeadsHub leads={leads} onLeadClick={setSelectedLead} onStatusChange={handleStatusChange} />}
                              {activeTab === 'marketing' && <MarketingView campaigns={storedCampaigns} content={storedContent} onUpdateContent={(c) => setStoredContent(p => p.map(i => i.id === c.id ? c : i))} onAddContent={(c) => setStoredContent(p => [c, ...p])} onAddCampaign={(c) => setStoredCampaigns(p => [c, ...p])} onUpdateCampaign={(c) => setStoredCampaigns(p => p.map(i => i.id === c.id ? c : i))} onDeleteCampaign={(id) => setStoredCampaigns(p => p.filter(i => i.id !== id))} />}
                              {activeTab === 'finance' && <FinanceView invoices={storedInvoices} onAddInvoice={(i) => setStoredInvoices(p => [i, ...p])} />}
                              {activeTab === 'operations' && <OperationsHub students={storedStudents} leads={leads} onUpdateStudent={(s) => setStoredStudents(p => p.map(i => i.id === s.id ? s : i))} />}
                              {activeTab === 'reports' && <ReportsView leads={leads} campaigns={storedCampaigns} tasks={tasks} />}
                              {activeTab === 'headquarters' && <HeadquartersView onAddTask={(t) => setStoredTasks(p => [t, ...p])} leads={leads} />}
                              {activeTab === 'system' && <SystemHub logs={webhookLogs} leads={leads} agents={INITIAL_AGENTS} />}
                              {activeTab === 'personal_area' && <PersonalAreaView leads={leads} tasks={tasks} />}
                              {activeTab === 'notifications_center' && <NotificationsView />}
                              {activeTab === 'focus_mode' && <FocusModeView />}
                          </motion.div>
                      </AnimatePresence>
                  </div>
              </ErrorBoundary>
          </div>
      </main>

      {/* Proactive AI Pilot Button - Floating */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsCommandPaletteOpen(true)}
        className="fixed bottom-32 right-6 z-[60] w-14 h-14 bg-white text-indigo-600 rounded-full shadow-2xl flex items-center justify-center border-2 border-indigo-100 hover:border-indigo-400 transition-all group"
        aria-label="פתח עוזר חכם"
      >
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping group-hover:hidden"></div>
          <Sparkles size={24} className="group-hover:animate-spin-slow" />
      </motion.button>

      {/* Mobile Bottom Navigation - Rounded Icons */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 z-50 pb-6 pt-2 px-2 transition-all duration-300 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-[60px] relative">
              <button onClick={() => setActiveTab('workspace')} className={`p-3 rounded-full transition-colors ${activeTab === 'workspace' ? 'text-primary bg-rose-50' : 'text-slate-400'}`} aria-label="דף הבית"><Home size={24} /></button>
              <button onClick={() => setActiveTab('sales_hub')} className={`p-3 rounded-full transition-colors ${activeTab === 'sales_hub' ? 'text-primary bg-rose-50' : 'text-slate-400'}`} aria-label="מכירות"><Kanban size={24} /></button>

              <div className="relative -top-8">
                  <button onClick={() => setIsFabOpen(!isFabOpen)} className={`w-16 h-16 bg-nexus-gradient rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-500/30 border-[6px] border-slate-50 transition-all duration-300 ${isFabOpen ? 'rotate-[135deg]' : ''}`} aria-label="פעולות מהירות"><Plus size={32} /></button>
              </div>

              <button onClick={() => setActiveTab('marketing')} className={`p-3 rounded-full transition-colors ${activeTab === 'marketing' ? 'text-primary bg-rose-50' : 'text-slate-400'}`} aria-label="שיווק"><Megaphone size={24} /></button>
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 rounded-full text-slate-400 hover:text-slate-600 transition-colors" aria-label="תפריט"><Menu size={24} /></button>
          </div>
      </div>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={setActiveTab} onSelectLead={setSelectedLead} leads={leads} />
      {selectedLead && <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} onAddActivity={handleAddActivity} onScheduleMeeting={handleScheduleMeeting} onOpenClientPortal={() => handleOpenClientPortal(selectedLead)} onAddTask={(t) => setStoredTasks(p => [t, ...p])} />}
      {showNewLeadModal && <NewLeadModal onClose={() => setShowNewLeadModal(false)} onSave={handleSaveNewLead} />}
      {showNewMeetingModal && <NewMeetingModal leads={leads} initialLeadId={meetingModalPreselectId} onClose={() => setShowNewMeetingModal(false)} onSave={handleSaveMeeting} />}
      {showHandoverDialog && pendingWonLead && goldenPayload && <HandoverDialog lead={pendingWonLead} payload={goldenPayload} onClose={() => { setShowHandoverDialog(false); setPendingWonLead(null); }} onConfirm={handleHandoverConfirm} />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <CallAnalysisProvider>
            <BrandProvider>
               <SystemOSApp />
            </BrandProvider>
          </CallAnalysisProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;