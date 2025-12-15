
import React, { useState, useEffect } from 'react';
import { NavItem, ModuleId } from '../types';
import { LayoutDashboard, Users, Calendar, User, Plus, Bell, ChevronRight, ChevronLeft, Mic, RotateCcw, FolderOpen, X, PenTool, Briefcase, Clock, Phone, ExternalLink, Sun, CheckSquare, Home, Settings, BarChart, Grid, LogOut, BrainCircuit, Sparkles, Zap, ArrowUpRight, Search, PieChart, Shield, Trash2, Headphones, Globe, Video } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandPalette } from './CommandPalette';
import { useData } from '../context/DataContext';
import { MorningBriefing } from './MorningBriefing';
import { NotificationsPanel } from './NotificationsPanel';
import { VoiceRecorder } from './VoiceRecorder';
import { CreateTaskModal } from './CreateTaskModal';
import { ToastContainer } from './ToastContainer';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskCompletionModal } from './TaskCompletionModal';
import { SupportModal } from './SupportModal';
import { TutorialOverlay } from './TutorialOverlay';
import confetti from 'canvas-confetti';

interface LayoutProps {
  children?: React.ReactNode;
}

// Updated with module links and screen IDs
const NAV_ITEMS: NavItem[] = [
  { label: 'לוח בקרה', path: '/', icon: Home, screenId: 'dashboard' }, 
  { label: 'משימות', path: '/tasks', icon: CheckSquare, screenId: 'tasks' }, 
  { label: 'יומן', path: '/calendar', icon: Calendar, screenId: 'calendar' }, 
  { label: 'לקוחות', path: '/clients', icon: Briefcase, moduleId: 'crm', screenId: 'clients' }, 
  { label: 'ניהול עומסים', path: '/team', icon: BarChart, moduleId: 'team', screenId: 'team' },
  { label: 'דוחות ומדדים', path: '/reports', icon: PieChart, moduleId: 'finance', screenId: 'reports' }, 
  { label: 'נכסים ותיקיות', path: '/assets', icon: FolderOpen, screenId: 'assets' },
  { label: 'סל מיחזור', path: '/trash', icon: Trash2, screenId: 'trash' },
  { label: 'הגדרות ופיצ׳רים', path: '/settings', icon: Settings }, 
];

// Define primary navigation paths to determine where to place the separator
const PRIMARY_NAV_PATHS = ['/', '/tasks', '/calendar', '/clients'];

const getMobileGridStyles = (path: string, isActive: boolean) => {
    if (isActive) return 'bg-black text-white shadow-xl scale-105 ring-2 ring-black/10';
    switch (path) {
        case '/': return 'bg-slate-100 text-slate-600';
        case '/tasks': return 'bg-blue-50 text-blue-600';
        case '/clients': return 'bg-emerald-50 text-emerald-600';
        case '/calendar': return 'bg-red-50 text-red-600';
        case '/team': return 'bg-orange-50 text-orange-600';
        case '/reports': return 'bg-indigo-50 text-indigo-600';
        case '/assets': return 'bg-amber-50 text-amber-600';
        case '/trash': return 'bg-red-50 text-red-600';
        case '/settings': return 'bg-gray-100 text-gray-500';
        case '/brain': return 'bg-indigo-50 text-indigo-600'; 
        default: return 'bg-gray-50 text-gray-500';
    }
};

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showMorningBrief, setShowMorningBrief, notifications, lastDeletedTask, undoDelete, currentUser, isCreateTaskOpen, openCreateTask, closeCreateTask, incomingCall, dismissCall, toasts, removeToast, openedTaskId, closeTask, tasks, hasPermission, setCommandPaletteOpen, organization, taskToComplete, isSupportModalOpen, openSupport, activeCelebration } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- CONTENT PROTECTION LOGIC ---
  useEffect(() => {
      // 1. Disable Right Click (Context Menu)
      const handleContextMenu = (e: MouseEvent) => {
          e.preventDefault();
      };

      // 2. Disable Copy Shortcuts (Ctrl+C, Ctrl+P, Ctrl+S, etc)
      const handleKeyDown = (e: KeyboardEvent) => {
          if (
              (e.ctrlKey || e.metaKey) && 
              (e.key === 'c' || e.key === 'C' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')
          ) {
              e.preventDefault();
          }
      };

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
          document.removeEventListener('contextmenu', handleContextMenu);
          document.removeEventListener('keydown', handleKeyDown);
      };
  }, []);

  // Celebration Effect
  useEffect(() => {
      if (activeCelebration) {
          const duration = 3 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }, 250);
      }
  }, [activeCelebration]);

  const isActive = (path: string) => location.pathname === path;
  
  // Filter notifications for current user only
  const hasUnread = notifications
    .filter(n => n.recipientId === 'all' || n.recipientId === currentUser.id)
    .some(n => !n.read);

  const togglePlusMenu = () => { setIsMobileMenuOpen(false); setIsPlusMenuOpen(!isPlusMenuOpen); };
  const toggleMobileMenu = () => { setIsPlusMenuOpen(false); setIsMobileMenuOpen(!isMobileMenuOpen); };
  const handleVoiceClick = () => { setIsPlusMenuOpen(false); setIsVoiceRecorderOpen(true); };
  const handleTaskClick = () => { setIsPlusMenuOpen(false); openCreateTask(); };
  const handleNavClick = (path: string) => { setIsMobileMenuOpen(false); navigate(path); };

  const currentOpenedTask = openedTaskId ? tasks.find(t => t.id === openedTaskId) : null;

  // IMPORTANT: Filter Nav Items based on Permissions AND Enabled Modules AND System Flags
  const filteredNavItems = NAV_ITEMS.filter(item => {
      // 0. Check System Flags (Global Override)
      if (item.screenId) {
          const flag = organization.systemFlags?.[item.screenId];
          if (flag === 'hidden') return false; // Hide completely
      }

      // 1. Check Module Availability (Tenant Feature Flag)
      if (item.moduleId && !organization.enabledModules.includes(item.moduleId)) {
          return false;
      }

      // 2. Check User Role Permissions
      switch (item.path) {
          case '/team': return hasPermission('manage_team');
          case '/reports': return true;
          case '/clients': return hasPermission('view_crm');
          case '/assets': return hasPermission('view_assets');
          case '/settings': return true;
          case '/trash': return true; 
          default: return true; 
      }
  });

  const openExternalSales = () => {
      window.open('https://sales.nexus-os.co', '_blank');
  };

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
      <TutorialOverlay />
      <CommandPalette />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] animate-blob mix-blend-multiply filter"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-200/40 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply filter"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-pink-200/40 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply filter"></div>
      </div>

      <AnimatePresence>{showMorningBrief && <MorningBriefing />}</AnimatePresence>
      <AnimatePresence>{isVoiceRecorderOpen && <VoiceRecorder onClose={() => setIsVoiceRecorderOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{isCreateTaskOpen && <CreateTaskModal onClose={closeCreateTask} />}</AnimatePresence>
      <AnimatePresence>{taskToComplete && <TaskCompletionModal />}</AnimatePresence>
      <AnimatePresence>{isSupportModalOpen && <SupportModal />}</AnimatePresence>
      
      <AnimatePresence>
        {currentOpenedTask && (
            <TaskDetailModal task={currentOpenedTask} onClose={closeTask} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {incomingCall && (
            <motion.div
                initial={{ opacity: 0, y: -50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -50, x: '-50%' }}
                className="fixed top-6 left-1/2 z-[100] bg-gray-900/90 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl w-[90vw] max-w-sm flex items-center gap-4 border border-white/10"
            >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-green-500/30">
                    <Phone size={24} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-0.5">שיחה נכנסת...</p>
                    <h3 className="text-lg font-bold leading-tight">{incomingCall.callerName}</h3>
                    {incomingCall.isClient && <p className="text-xs text-gray-400">{incomingCall.company} • לקוח קיים</p>}
                </div>
                <div className="flex gap-2">
                     <button onClick={() => { dismissCall(); navigate('/clients'); }} className="bg-white text-black p-2 rounded-full hover:bg-gray-200 transition-colors"><ExternalLink size={20} /></button>
                     <button onClick={dismissCall} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"><X size={20} /></button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastDeletedTask && (
            <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-28 left-4 right-4 md:top-28 md:left-auto md:right-8 md:w-96 z-[100] bg-gray-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10"
            >
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">הועבר לארכיון</span>
                    <span className="text-sm font-bold truncate">{lastDeletedTask.title}</span>
                </div>
                <button onClick={undoDelete} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm">
                    <RotateCcw size={14} /> בטל
                </button>
            </motion.div>
        )}
      </AnimatePresence>

      <aside className={`hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isSidebarOpen ? 'w-80' : 'w-32'} p-4 z-30 h-screen relative`}>
        <div id="main-sidebar" className={`flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-white/40 overflow-hidden transition-all duration-500 ${isSidebarOpen ? 'px-4' : 'px-2 items-center'}`}>
            <div className={`flex items-center justify-between py-8 ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
            {isSidebarOpen ? (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-gray-400/20 bg-white overflow-hidden border border-gray-100">
                        {organization.logo ? (
                            <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full opacity-90" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight text-gray-900 block leading-none truncate max-w-[190px]" title={organization.name}>
                            {organization.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Nexus OS</span>
                    </div>
                </div>
            ) : (
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden border border-gray-100">
                    {organization.logo ? (
                        <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-full opacity-90" />
                        </div>
                    )}
                </div>
            )}
            {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-black transition-colors p-1.5 hover:bg-black/5 rounded-lg"><ChevronRight size={18} /></button>}
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="mt-4 text-gray-400 hover:text-black transition-colors p-1.5 hover:bg-black/5 rounded-lg"><ChevronLeft size={20} /></button>}
            </div>

            <nav className="flex-1 space-y-1.5 mt-2 overflow-y-auto no-scrollbar">
            {filteredNavItems.map((item, index) => {
                const prevItem = index > 0 ? filteredNavItems[index - 1] : null;
                const isCurrentSecondary = !PRIMARY_NAV_PATHS.includes(item.path);
                const isPrevPrimary = prevItem && PRIMARY_NAV_PATHS.includes(prevItem.path);
                const showSeparator = isCurrentSecondary && isPrevPrimary;

                return (
                <React.Fragment key={item.path}>
                    {showSeparator && (
                        <div className={`shrink-0 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent ${isSidebarOpen ? 'mx-6 my-4' : 'mx-2 my-3'}`}></div>
                    )}
                    <button
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all duration-300 group relative
                            ${isActive(item.path) 
                            ? 'text-white shadow-lg shadow-gray-900/20' 
                            : 'text-gray-500 hover:bg-white/50 hover:text-gray-900'
                        } ${!isSidebarOpen && 'justify-center px-0 aspect-square'}`}
                    >
                        {isActive(item.path) && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute inset-0 rounded-2xl z-0 bg-black"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center justify-center w-5 h-5">
                            <item.icon size={20} strokeWidth={isActive(item.path) ? 2.5 : 2} className={isActive(item.path) ? 'text-white' : 'text-current'} />
                        </span>
                        {isSidebarOpen && <span className="relative z-10">{item.label}</span>}
                    </button>
                </React.Fragment>
            )})}
            </nav>

            <div className="mt-auto space-y-3 pt-4 border-t border-gray-200/30 mb-4">
                <div className={`flex gap-2 ${!isSidebarOpen ? 'flex-col' : ''}`}>
                    {/* SaaS Admin Link */}
                    {currentUser.isSuperAdmin && (
                        <button 
                            onClick={() => navigate('/admin')}
                            className={`flex items-center justify-center gap-2 text-white bg-slate-900 hover:bg-slate-800 rounded-2xl font-bold transition-all border border-slate-700 group ${!isSidebarOpen ? 'w-full aspect-square p-2' : 'flex-1 py-3 px-2 text-xs'}`} 
                            title="SaaS Admin"
                        >
                            <Shield size={18} className="text-indigo-400" />
                            {isSidebarOpen && <span>Admin</span>}
                        </button>
                    )}

                    {organization.enabledModules.includes('crm') && (hasPermission('view_financials') || hasPermission('view_crm')) && (
                        <button 
                            onClick={openExternalSales}
                            className={`flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-900 rounded-2xl font-bold transition-all border border-emerald-100/50 group ${!isSidebarOpen ? 'w-full aspect-square p-2' : 'flex-1 py-3 px-2 text-xs'}`} 
                            title="External Sales System"
                        >
                            <ExternalLink size={18} className="text-emerald-600" />
                            {isSidebarOpen && <span>Sales</span>}
                        </button>
                    )}

                    {organization.enabledModules.includes('ai') && organization.systemFlags?.['brain'] !== 'hidden' && (
                    <button 
                        onClick={() => navigate('/brain')}
                        className={`relative overflow-hidden group rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                        ${isActive('/brain') ? 'text-white shadow-lg shadow-indigo-500/20' : 'text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-100/50'} 
                        ${!isSidebarOpen ? 'w-full aspect-square p-2' : 'flex-1 py-3 px-2 text-xs'}
                        `}
                        title="Nexus AI"
                    >
                        {isActive('/brain') && (
                            <motion.div 
                                layoutId="activeTabBottom"
                                className="absolute inset-0 z-0 bg-gradient-to-r from-indigo-600 to-violet-600"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                            <Sparkles size={18} className={isActive('/brain') ? 'text-white' : 'text-indigo-600'} />
                            {isSidebarOpen && <span>AI</span>}
                        </span>
                    </button>
                    )}
                </div>

                <div className={`flex gap-2 items-center ${!isSidebarOpen ? 'flex-col' : ''}`}>
                    <button 
                        onClick={() => openSupport()} 
                        className={`flex items-center justify-center gap-3 text-slate-600 hover:bg-slate-100 rounded-2xl transition-all ${!isSidebarOpen ? 'w-full aspect-square p-2' : 'flex-1 py-2.5 text-sm font-bold border border-transparent hover:border-slate-200'}`} 
                        title="תמיכה"
                    >
                        <Headphones size={20} />
                        {isSidebarOpen && <span>תמיכה</span>}
                    </button>
                    <button onClick={() => setShowMorningBrief(true)} className={`w-full flex items-center justify-center gap-3 text-orange-700 bg-orange-50/50 border border-orange-100/50 hover:bg-orange-100 hover:text-orange-800 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all ${!isSidebarOpen && 'p-2'}`} title="תדריך בוקר">
                        <Sun size={20} />
                        {isSidebarOpen && <span>תדריך</span>}
                    </button>
                </div>

                <div className={`flex gap-2 ${!isSidebarOpen ? 'flex-col-reverse' : ''}`}>
                     <button 
                        onClick={() => setIsVoiceRecorderOpen(true)} 
                        className={`flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-2xl transition-all border border-red-100 ${!isSidebarOpen ? 'w-full aspect-square' : 'w-12 h-12 shrink-0'}`} 
                        title="הקלטה מהירה"
                    >
                        <Mic size={20} />
                    </button>

                    <button 
                        id="create-task-btn"
                        onClick={() => openCreateTask()} 
                        className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] border border-slate-700/50 hover:border-slate-600 transition-all duration-300 active:scale-[0.98] group relative overflow-hidden ${!isSidebarOpen ? 'w-full aspect-square p-0' : 'px-4 h-12'}`}
                    >
                        {/* Dynamic sheen */}
                        <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                        
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300 text-indigo-400 group-hover:text-white" />
                        
                        {isSidebarOpen && <span className="font-bold text-sm tracking-wide text-slate-100 group-hover:text-white">משימה חדשה</span>}
                    </button>
                </div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="h-20 md:h-24 flex items-center justify-between px-4 md:px-8 z-40 sticky top-0">
          <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-white overflow-hidden border border-gray-100 shadow-sm">
                {organization.logo ? (
                    <img src={organization.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                )}
            </div>
            <span className="font-bold text-lg text-gray-900 truncate">{organization.name}</span>
          </div>

          <div className="hidden md:flex flex-col justify-center">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {location.pathname === '/brain' ? 'Nexus AI' : (NAV_ITEMS.find(i => i.path === location.pathname)?.label || 'לוח בקרה')}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
                {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="flex items-center gap-1 md:gap-5 relative bg-white/40 backdrop-blur-xl p-1 pr-1.5 md:p-2 rounded-full border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] shrink-0 ml-2">
            <button 
                id="command-search-btn"
                onClick={() => setCommandPaletteOpen(true)}
                className="p-2 rounded-full hover:bg-white/50 text-gray-600 transition-colors"
                title="חיפוש (Cmd+K)"
            >
                <Search size={18} />
            </button>

            <button 
                id="notification-trigger"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative p-2 rounded-full transition-colors ${isNotificationsOpen ? 'bg-black text-white' : 'hover:bg-white/50 text-gray-600'}`}
            >
              <Bell size={18} />
              {hasUnread && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
            <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

            <div className="w-px h-6 bg-gray-400/20 hidden md:block"></div>

            <button 
                id="user-profile-btn"
                onClick={() => navigate('/me')} 
                className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-white/50"
            >
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-900 leading-none">{currentUser.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{currentUser.role}</p>
                </div>
                <img src={currentUser.avatar} alt="Profile" className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white shadow-sm object-cover" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8" id="main-scroll-container">
          <AnimatePresence mode='wait'>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="min-h-full flex flex-col pb-48 md:pb-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Action Menu Overlay */}
        <AnimatePresence>
            {isPlusMenuOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[45] backdrop-blur-sm md:hidden"
                        onClick={() => setIsPlusMenuOpen(false)}
                    />
                    <div className="fixed bottom-24 left-0 right-0 z-[50] flex justify-center gap-8 md:hidden pointer-events-none">
                         <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.05 }}
                            className="flex flex-col items-center gap-2 pointer-events-auto"
                         >
                            <button 
                                onClick={handleVoiceClick}
                                className="w-16 h-16 bg-red-500 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all ring-4 ring-white/20"
                            >
                                <Mic size={32} />
                            </button>
                            <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">הקלטה</span>
                         </motion.div>

                         <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.8 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="flex flex-col items-center gap-2 pointer-events-auto"
                         >
                            <button 
                                onClick={handleTaskClick}
                                className="w-16 h-16 bg-white text-slate-900 rounded-2xl shadow-xl flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all ring-4 ring-white/20"
                            >
                                <PenTool size={32} />
                            </button>
                            <span className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">משימה</span>
                         </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {isMobileMenuOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-40 p-6 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-white/50">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50"></div>
                        <div className="grid grid-cols-4 gap-4">
                            {filteredNavItems.map((item) => {
                                const isActiveItem = isActive(item.path);
                                const itemStyle = getMobileGridStyles(item.path, isActiveItem);
                                return (
                                    <React.Fragment key={item.path}>
                                        {item.path === '/settings' && (
                                            <div className="col-span-4 h-px bg-gray-200/50 my-2 w-full"></div>
                                        )}
                                        <button onClick={() => handleNavClick(item.path)} className="flex flex-col items-center gap-2 group">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${itemStyle}`}>
                                                <item.icon size={22} strokeWidth={2} />
                                            </div>
                                            <span className={`text-[10px] font-medium text-center leading-tight transition-colors ${isActiveItem ? 'text-black font-bold' : 'text-gray-500'}`}>{item.label}</span>
                                        </button>
                                    </React.Fragment>
                                )
                            })}
                             
                             {organization.enabledModules.includes('ai') && organization.systemFlags?.['brain'] !== 'hidden' && (
                             <button onClick={() => handleNavClick('/brain')} className="flex flex-col items-center gap-2 group">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${getMobileGridStyles('/brain', isActive('/brain'))}`}>
                                        <Sparkles size={22} strokeWidth={2} />
                                    </div>
                                    <span className={`text-[10px] font-medium text-center leading-tight ${isActive('/brain') ? 'text-black font-bold' : 'text-gray-500'}`}>Nexus AI</span>
                                </button>
                             )}
                                
                                <button onClick={() => { setShowMorningBrief(true); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-2 group">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-600 border border-orange-100/50 shadow-sm active:scale-95 transition-transform relative">
                                        <Sun size={22} strokeWidth={2} />
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-medium text-center leading-tight text-gray-500">תדריך</span>
                                </button>

                                {organization.enabledModules.includes('crm') && (hasPermission('view_financials') || hasPermission('view_crm')) && (
                                <button onClick={() => { openExternalSales(); setIsMobileMenuOpen(false); }} className="flex flex-col items-center gap-2 group">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm active:scale-95 transition-transform">
                                        <ExternalLink size={22} strokeWidth={2} />
                                    </div>
                                    <span className="text-[10px] font-medium text-center leading-tight text-gray-500">Sales</span>
                                </button>
                                )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        <nav className={`md:hidden fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] h-16 shadow-[0_8px_30px_rgba(0,0,0,0.1)] px-4 flex items-center justify-between transition-all duration-300 ${isPlusMenuOpen ? 'z-[60]' : 'z-40'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)', marginBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="flex items-center gap-6 pl-2">
                  <button onClick={() => handleNavClick('/')} className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive('/') ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}><Home size={20} strokeWidth={isActive('/') ? 2.5 : 2} /></button>
                  <button onClick={() => handleNavClick('/tasks')} className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive('/tasks') ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}><CheckSquare size={20} strokeWidth={isActive('/tasks') ? 2.5 : 2} /></button>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                  <button 
                    onClick={togglePlusMenu} 
                    className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 border-[5px] border-[#f1f5f9] group relative overflow-hidden z-50 ${
                        isPlusMenuOpen 
                        ? 'bg-slate-900 rotate-45 scale-90' 
                        : 'bg-gradient-to-br from-slate-800 to-black hover:scale-105'
                    }`}
                  >
                      {/* Subtle inner gradient/glow */}
                      <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-100 transition-opacity ${isPlusMenuOpen ? 'opacity-0' : ''}`}></div>
                      
                      <Plus size={30} className="text-white drop-shadow-md" strokeWidth={2.5} />
                  </button>
              </div>
              <div className="flex items-center gap-6 pr-2">
                  {hasPermission('view_crm') && organization.enabledModules.includes('crm') && organization.systemFlags?.['clients'] !== 'hidden' ? (
                      <button onClick={() => handleNavClick('/clients')} className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive('/clients') ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}><Briefcase size={20} strokeWidth={isActive('/clients') ? 2.5 : 2} /></button>
                  ) : (
                      <button onClick={() => handleNavClick('/me')} className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${isActive('/me') ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}><User size={20} strokeWidth={isActive('/me') ? 2.5 : 2} /></button>
                  )}
                  <button onClick={toggleMobileMenu} className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all ${isMobileMenuOpen ? 'bg-black text-white shadow-lg' : 'text-gray-400'}`}><Grid size={20} strokeWidth={isMobileMenuOpen ? 2.5 : 2} /></button>
              </div>
        </nav>
      </main>
    </div>
  );
};
