'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, LayoutGroup } from 'framer-motion';
import { Target, BarChart2, Video, Users, LogOut, Settings, HelpCircle, LayoutGrid } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

export const NAV_ITEMS = [
    { id: 'dashboard', label: 'סקירה כללית', icon: LayoutGrid, path: '/client-os' },
    { id: 'meetings', label: 'פגישות וניתוח', icon: Video, path: '/client-os/meetings' },
    { id: 'clients', label: 'ניהול לקוחות', icon: Users, path: '/client-os/clients' },
];

const SECONDARY_NAV = [
    { id: 'settings', label: 'הגדרות', icon: Settings, path: '/client-os/hub' },
    { id: 'support', label: 'תמיכה', icon: HelpCircle, path: '/client-os/support' },
];

interface SidebarProps {
  user: {
    name?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const pathname = usePathname();

  function getOrgSlugFromPathname(p: string | null | undefined): string | null {
    if (!p) return null;
    if (!p.startsWith('/w/')) return null;
    const parts = p.split('/').filter(Boolean);
    return parts[1] ? String(parts[1]) : null;
  }

  const orgSlug = React.useMemo(() => getOrgSlugFromPathname(pathname), [pathname]);
  const clientBasePath = React.useMemo(() => {
    if (!orgSlug) return null;
    return `/w/${encodeURIComponent(String(orgSlug))}/client`;
  }, [orgSlug]);
  const isClientHubRoute = Boolean(clientBasePath && pathname && pathname.startsWith(`${clientBasePath}/hub`));

  const mapToClientPath = (legacyPath: string): string => {
    if (!clientBasePath) return legacyPath;
    if (legacyPath === '/client-os') return clientBasePath;
    if (legacyPath === '/client-os/hub') {
      const from = pathname || clientBasePath;
      return `${clientBasePath}/hub?origin=client&drawer=client&from=${encodeURIComponent(from)}`;
    }
    if (legacyPath.startsWith('/client-os/')) return clientBasePath;
    return legacyPath;
  };

  return (
    <aside 
      className="hidden md:flex flex-col h-[calc(100vh-2rem)] w-[280px] bg-white/60 backdrop-blur-2xl border border-white/40 shadow-luxury fixed right-4 top-4 bottom-4 z-50 rounded-[2.5rem] overflow-hidden transition-all duration-500"
      role="navigation"
      aria-label="Side Navigation"
    >
      
      {/* Brand Header */}
      <div className="h-[100px] flex items-center px-8 flex-shrink-0">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-nexus-gradient text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20 overflow-hidden logo-box">
                <Target size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
                <h1 className="text-xl font-black text-gray-900 leading-none tracking-tight">Client</h1>
                <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mt-1">Standalone</span>
            </div>
         </div>
      </div>

      {/* Navigation */}
      <LayoutGroup>
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-8 custom-scrollbar">
            <div className="space-y-1">
                <div className="px-4 mb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">תפריט ראשי</span>
                </div>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const itemPath = mapToClientPath(item.path);
                    const isActive = pathname === itemPath || (itemPath !== mapToClientPath('/client-os') && pathname?.startsWith(itemPath));
                    
                    return (
                        <Link
                            key={item.id}
                            href={itemPath}
                            className={`w-full flex items-center relative px-4 py-3.5 transition-all duration-300 group rounded-2xl ${
                                isActive 
                                  ? 'text-white font-bold' 
                                  : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-900'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav-bg"
                                    className="absolute inset-0 bg-nexus-gradient rounded-2xl shadow-xl shadow-primary/20"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            
                            <div className="relative z-10 flex items-center gap-4">
                                <Icon size={20} strokeWidth={isActive ? 3 : 2} className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
                                <span className="text-sm tracking-tight">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div className="space-y-1">
                <div className="px-4 mb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">מערכת</span>
                </div>
                {SECONDARY_NAV.map((item) => {
                    const Icon = item.icon;
                    const itemPath = mapToClientPath(item.path);
                    const isActive = item.id === 'settings' ? isClientHubRoute : pathname === itemPath;
                    
                    return (
                        <Link
                            key={item.id}
                            href={itemPath}
                            className={`w-full flex items-center relative px-4 py-3 transition-all duration-300 group rounded-2xl ${
                                isActive 
                                  ? 'text-white font-bold' 
                                  : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-900'
                            }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav-bg"
                                    className="absolute inset-0 bg-nexus-gradient rounded-2xl"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            
                            <div className="relative z-10 flex items-center gap-4">
                                <Icon size={18} strokeWidth={2} className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
                                <span className="text-xs font-bold tracking-tight">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
      </LayoutGroup>

      {/* User Footer */}
      <div className="px-4 pb-6 pt-4 border-t border-slate-100">
         <div className="flex items-center gap-4 p-4 rounded-[2rem] bg-slate-50 border border-slate-200 shadow-sm transition-all group overflow-hidden hover:bg-white hover:shadow-md transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-bold text-slate-700 border border-slate-200 shadow-sm shrink-0 overflow-hidden ring-2 ring-white ring-offset-2 ring-offset-slate-100">
                {user.image ? (
                    <img src={user.image} alt={user.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm font-bold text-slate-700">{(user.name?.[0] || 'U')}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate leading-tight">{user.name || 'משתמש'}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-bold mt-0.5">{user.role === 'admin' || user.role === 'super_admin' ? 'מנהל מערכת' : 'חבר צוות'}</p>
            </div>
            <SignOutButton>
                <button className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title="התנתק">
                    <LogOut size={18} />
                </button>
            </SignOutButton>
         </div>
      </div>
    </aside>
  );
};

