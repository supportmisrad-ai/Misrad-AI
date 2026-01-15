
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, BrainCircuit, Settings, Sparkles, MessageSquareQuote, ChevronRight, ClipboardList, GitMerge, Search, Bell, Plus, Menu, X, LogOut, User, Mail, Layers } from 'lucide-react';
import NotificationsPanel from '../NotificationsPanel';
import { Notification } from '../../types';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { useNexus } from '../../context/ClientContext';
import { usePathname } from 'next/navigation';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import { getMyProfile } from '@/app/actions/profiles';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  const pathname = usePathname();
  const { notifications: contextNotifications } = useNexus();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(contextNotifications);
  const { title, roomName, roomNameHebrew, RoomIcon, gradient, room } = useRoomBranding();
  const isWorkspaceRoute = Boolean(pathname?.startsWith('/w/'));

  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);
  const [profileIdentity, setProfileIdentity] = useState<{ name: string | null; role: string | null } | null>(null);

  const userLabel = useMemo(() => {
    const userData = (typeof window !== 'undefined' ? ((window as any).__CLIENT_OS_USER__ as any) : null);
    const rawName = userData?.identity?.name || userData?.name || '';
    const rawRole = userData?.identity?.role || userData?.role || '';
    const name = String(rawName || '').trim();
    const roleLabel = String(rawRole || '').trim();
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
      : '';
    return { name: name || null, roleLabel: roleLabel || null, initials: initials || null };
  }, []);

  const displayInitials = useMemo(() => {
    const name = String(profileIdentity?.name || userLabel.name || '').trim();
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
      : '';
    return initials || userLabel.initials || null;
  }, [profileIdentity?.name, userLabel.initials, userLabel.name]);

  useEffect(() => {
    const load = async () => {
      if (!orgSlug) {
        setProfileIdentity(null);
        return;
      }
      try {
        const res = await getMyProfile({ orgSlug });
        if (!res.success || !res.data?.profile) return;
        const p: any = res.data.profile;
        setProfileIdentity({
          name: p.full_name ? String(p.full_name) : null,
          role: p.role ? String(p.role) : null,
        });
      } catch {
        // Best-effort
      }
    };

    load();
  }, [orgSlug]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
  }, [title]);

  // Sync notifications from context
  useEffect(() => {
    setNotifications(contextNotifications);
  }, [contextNotifications]);

  // Org-level feature flags (temporary hardcoded). Later: load from system_settings.system_flags.
  const featureFlags: Record<string, boolean> = {
    email: true,
    workflows: false,
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id?: string) => {
      if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } else {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
  };

  const handleDismiss = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
      setNotifications([]);
  };

  const ALL_NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'ראשי' },
    { id: 'clients', icon: Users, label: 'לקוחות' },
    { id: 'cycles', icon: Layers, label: 'מחזורים' },
    { id: 'email', icon: Mail, label: 'דואר' },
    { id: 'workflows', icon: GitMerge, label: 'תהליכים' },
    { id: 'forms', icon: ClipboardList, label: 'טפסים' },
    { id: 'feedback', icon: MessageSquareQuote, label: 'משובים' },
    { id: 'intelligence', icon: BrainCircuit, label: 'פענוח' },
    { id: 'analyzer', icon: Sparkles, label: 'ניתוח' },
  ];

  const navItems = ALL_NAV_ITEMS.filter((item) => featureFlags[item.id] !== false);

  const ALL_MOBILE_EXTRA_ITEMS = [
      { id: 'cycles', icon: Layers, label: 'מחזורים', desc: 'ניהול קבוצות לקוחות' },
      { id: 'email', icon: Mail, label: 'דואר', desc: 'מרכז תקשורת ו-AI' },
      { id: 'workflows', icon: GitMerge, label: 'תהליכים', desc: 'בניית שיטות עבודה' },
      { id: 'forms', icon: ClipboardList, label: 'טפסים', desc: 'שאלונים וקליטת לקוח' },
      { id: 'feedback', icon: MessageSquareQuote, label: 'משובים', desc: 'סקרים ו-NPS' },
      { id: 'analyzer', icon: Sparkles, label: 'ניתוח טקסט', desc: 'בדיקת שיחות חופשית' },
      { id: 'settings', icon: Settings, label: 'הגדרות', desc: 'ניהול המערכת' },
  ];

  const mobileExtraItems = ALL_MOBILE_EXTRA_ITEMS.filter((item) => featureFlags[item.id] !== false);

  const mobileNavItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'בית' },
      { id: 'clients', icon: Users, label: 'לקוחות' },
      { id: 'ADD_ACTION', icon: Plus, label: 'פעולה' },
      { id: 'intelligence', icon: BrainCircuit, label: 'AI' },
      { id: 'MENU', icon: Menu, label: 'תפריט' },
  ];

  const triggerCommand = () => {
      window.dispatchEvent(new CustomEvent('open-nexus-command'));
  };

  const handleMobileNavClick = (id: string) => {
      if (id === 'MENU') {
          setIsMobileMenuOpen(true);
      } else if (id === 'ADD_ACTION') {
          triggerCommand();
      } else {
          onNavigate(id);
      }
  };

  const handleDrawerNav = (id: string) => {
      onNavigate(id);
      setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-nexus-primary font-sans bg-nexus-bg">
      
      {/* SIDEBAR */}
      <aside 
        className="hidden lg:flex w-72 flex-shrink-0 flex-col justify-between py-4 z-20 relative pt-safe pl-safe custom-scrollbar"
        tabIndex={0}
        aria-label="Main Navigation"
        role="navigation"
      >
        <div className="relative h-full rounded-[2.5rem] bg-nexus-primary shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#C5A572 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

          <div className="relative z-10 flex flex-col h-full py-8">
            <div className="px-8 mb-10 flex items-center gap-4 flex-shrink-0">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${room === 'client' ? 'from-nexus-accent to-[#A38650]' : (gradient || 'from-nexus-accent to-[#A38650]')} flex items-center justify-center text-white font-display font-bold text-xl shadow-glow-gold border border-white/10`}>
                {room === 'client' ? 'C' : RoomIcon ? <RoomIcon size={20} /> : 'C'}
              </div>
              <div className="flex flex-col">
                  <span className="font-display font-semibold text-2xl tracking-tight text-white leading-none">{room === 'client' ? 'Client.os' : (roomNameHebrew || roomName || 'פורטל הצלחת לקוח')}</span>
                  <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase mt-1">{room === 'client' ? 'Nexus client' : (roomName || 'Misrad OS - מערכת צמיחה')}</span>
              </div>
            </div>

            <nav className="px-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar scroll-fade-v">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative border focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/20
                      ${isActive 
                        ? 'bg-white/10 text-white shadow-lg backdrop-blur-md border-white/5' 
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {isActive && (
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-nexus-accent rounded-r-full shadow-[0_0_10px_rgba(197,165,114,0.5)]"></div>
                    )}
                    <Icon size={20} className={`relative z-10 transition-colors ${isActive ? 'text-nexus-accent' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    <span className="text-base font-medium relative z-10 tracking-wide">{item.label}</span>
                    {isActive && <ChevronRight size={16} className="mr-auto text-nexus-accent opacity-70" />}
                  </button>
                );
              })}
            </nav>

            <div className="px-4 mt-auto relative z-10 flex-shrink-0 pb-safe">
              <button 
                  onClick={() => onNavigate('settings')}
                  aria-label="הגדרות"
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 border focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/20
                  ${activeView === 'settings' 
                      ? 'bg-white/10 text-white border-white/5 shadow-lg backdrop-blur-md' 
                      : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}
                  `}
              >
                  <Settings size={20} className={activeView === 'settings' ? 'text-nexus-accent' : 'text-gray-500'} />
                  <span className="text-base font-medium">הגדרות</span>
              </button>

              <div className="mt-4 pt-4 border-t border-white/10">
                <OSAppSwitcher mode="inlineGrid" compact={true} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-nexus-bg">
          <header className="flex-shrink-0 h-20 lg:h-24 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 bg-nexus-bg/50 backdrop-blur-sm lg:bg-transparent pt-safe">
              <div className="lg:hidden flex items-center gap-2">
                 <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient || 'from-nexus-primary to-nexus-primary'} flex items-center justify-center text-white font-display font-bold shadow-md`}>{RoomIcon ? <RoomIcon size={18} /> : 'C'}</div>
                 <span className="font-bold text-nexus-primary">{roomName || 'Misrad OS - מערכת צמיחה'}</span>
              </div>
              <div className="hidden lg:block"></div>
              
              <div className="flex items-center gap-4 lg:gap-6">
                  <div className="hidden lg:flex items-center gap-2">
                    {isWorkspaceRoute ? <WorkspaceSwitcher /> : <RoomSwitcher />}
                  </div>
                  <AttendanceMiniStatus />
                  <button 
                    onClick={triggerCommand}
                    className="p-2 text-gray-400 hover:text-nexus-primary hover:bg-white/50 rounded-xl transition-all no-tap-highlight"
                    title="חיפוש (Cmd+K)"
                    aria-label="Search"
                  >
                      <Search size={22} />
                  </button>

                  <button 
                    onClick={() => setIsNotificationsOpen(true)}
                    className="p-2 text-gray-400 hover:text-nexus-primary hover:bg-white/50 rounded-xl transition-all relative no-tap-highlight"
                    aria-label={`${unreadCount} notifications`}
                  >
                      <Bell size={22} />
                      {unreadCount > 0 && (
                          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-signal-danger rounded-full border-2 border-nexus-bg animate-pulse"></span>
                      )}
                  </button>

                  <div className="hidden lg:block h-8 w-px bg-gray-200"></div>

                  <div 
                    onClick={() => onNavigate('me')}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity no-tap-highlight group"
                    role="button"
                    aria-label="User profile"
                  >
                        <div className="text-right hidden lg:block">
                            <div className="text-sm font-bold text-nexus-primary group-hover:text-nexus-accent transition-colors">{profileIdentity?.name || userLabel.name || '—'}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{profileIdentity?.role || userLabel.roleLabel || '—'}</div>
                        </div>
                        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border-2 border-white shadow-lg flex items-center justify-center text-sm text-white font-bold group-hover:ring-2 group-hover:ring-nexus-accent/50 transition-all">
                            {displayInitials || '—'}
                        </div>
                  </div>
              </div>
          </header>

          <main 
            id="main-scroll-container"
            className="flex-1 overflow-y-auto relative custom-scrollbar scroll-fade-v pb-24 lg:pb-0"
            role="main"
            tabIndex={0}
          >
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
            <div className="p-4 lg:p-10 pt-2 lg:pt-4 h-full max-w-[1800px] mx-auto relative z-10">
              {children}
            </div>
          </main>
      </div>

      {/* MOBILE NAV */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(80px+env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 px-6 pb-safe pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex justify-between items-start"
        aria-label="Mobile Navigation"
      >
          {mobileNavItems.map((item) => {
              if (item.id === 'ADD_ACTION') {
                  return (
                      <button 
                          key={item.id}
                          onClick={triggerCommand}
                          aria-label="Quick Action"
                          className="relative -top-6 w-14 h-14 bg-nexus-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-nexus-primary/40 active:scale-95 transition-transform border-4 border-white/50 bg-clip-padding no-tap-highlight"
                      >
                          <Plus size={28} />
                      </button>
                  )
              }

              const isActive = activeView === item.id || (item.id === 'MENU' && isMobileMenuOpen);
              const Icon = item.icon;
              
              return (
                  <button
                      key={item.id}
                      onClick={() => handleMobileNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex flex-col items-center justify-center gap-1 w-14 h-14 transition-all no-tap-highlight
                          ${isActive ? 'text-nexus-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                      <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-nexus-primary/10' : 'bg-transparent'}`}>
                          <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={`text-[10px] font-bold ${isActive ? 'text-nexus-primary' : 'text-gray-400'}`}>
                          {item.label}
                      </span>
                  </button>
              )
          })}
      </nav>

      {/* DRAWER */}
      {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-nexus-bg animate-fade-in flex flex-col no-scrollbar overflow-y-auto pt-safe pb-safe" role="dialog" aria-modal="true" aria-label="Full menu">
              <div className="sticky top-0 bg-nexus-bg/90 backdrop-blur-md p-6 flex justify-between items-center z-10">
                  <div>
                      <h2 className="text-2xl font-display font-bold text-nexus-primary">תפריט מלא</h2>
                      <p className="text-xs text-gray-500">כל מה שלא נכנס למטה</p>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-gray-500 active:scale-90 transition-transform"
                  >
                      <X size={20} />
                  </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 pb-32">
                  {mobileExtraItems.map((item) => (
                      <button
                          key={item.id}
                          onClick={() => handleDrawerNav(item.id)}
                          className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3 active:scale-[0.98] transition-all"
                      >
                          <div className="w-12 h-12 bg-nexus-bg rounded-xl flex items-center justify-center text-nexus-primary">
                              <item.icon size={24} />
                          </div>
                          <div>
                              <span className="block font-bold text-gray-900">{item.label}</span>
                              <span className="text-[10px] text-gray-500">{item.desc}</span>
                          </div>
                      </button>
                  ))}
                  
                  <div 
                    onClick={() => handleDrawerNav('me')}
                    className="col-span-2 mt-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
                    role="button"
                  >
                      <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">JD</div>
                      <div className="flex-1">
                          <span className="block font-bold text-gray-900">John Doe</span>
                          <span className="text-xs text-gray-500">צפה בפרופיל אישי</span>
                      </div>
                      <div className="p-2 text-gray-400 bg-gray-50 rounded-lg">
                          <ChevronRight size={20} className="rotate-180" />
                      </div>
                  </div>
              </div>
          </div>
      )}

      <NotificationsPanel 
         isOpen={isNotificationsOpen} 
         onClose={() => setIsNotificationsOpen(false)} 
         notifications={notifications}
         onMarkAsRead={handleMarkAsRead}
         onDismiss={handleDismiss}
         onClearAll={handleClearAll}
      />
    </div>
  );
};

export default Layout;
