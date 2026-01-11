'use client';

import React from 'react';
import { CreditCard, X } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useBrand } from '../system/contexts/BrandContext';
import { BusinessSwitcher } from '../BusinessSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import OSAppSwitcher from '../shared/OSAppSwitcher';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  user: any;
  logout: () => void;
  mobile?: boolean;
  onClose?: () => void;
  navItems: Array<{ id: string; label: string; icon: React.ComponentType<any> }>;
}

const Sidebar = React.memo(({ activeTab, setActiveTab, user, logout, mobile = false, onClose, navItems }: SidebarProps) => {
  const { brandName, brandLogo } = useBrand();
  const { roomName, RoomIcon, gradient } = useRoomBranding();

  const isProbablyTokenOrId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.length > 40) return true;
    if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return true;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) return true;
    return false;
  };

  const safeUserName = isProbablyTokenOrId(String(user?.name ?? ''))
    ? (String(user?.email ?? '').split('@')[0] || 'משתמש')
    : String(user?.name ?? '');

  const handleNavClick = (id: string) => {
      setActiveTab(id);
      if (mobile && onClose) onClose();
  };

  // Group nav items - for now, all items are in one group without a title
  const NAV_GROUPS = [
    {
      title: '',
      items: navItems
    }
  ];

  return (
    <aside 
      className={`sidebar flex flex-col h-full ${mobile ? 'w-full max-w-[300px] shadow-none bg-white/95 backdrop-blur-xl border-l border-slate-100' : 'rounded-none md:rounded-r-[3rem] shadow-[4px_0_40px_rgba(0,0,0,0.03)] border-r border-white/40'}`}
      role="navigation"
      aria-label="Side Navigation"
    >
      
      {/* Brand Header */}
      <div className="px-6 mb-2 flex-shrink-0">
         <div className="h-[80px] md:h-[100px] flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${gradient || 'from-emerald-500 to-teal-600'} text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20 overflow-hidden text-center shrink-0`}>
                    {brandLogo ? (
                        <img src={brandLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        RoomIcon ? <RoomIcon size={22} /> : <CreditCard size={24} strokeWidth={2} />
                    )}
                </div>
                <div className="flex flex-col justify-center overflow-hidden">
                    <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 leading-none tracking-tight font-sans truncate">{brandName}</h1>
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 tracking-[0.25em] uppercase mt-1.5 ml-0.5">{roomName || 'Misrad OS - מערכת צמיחה'}</span>
                </div>
            </div>
            {mobile && onClose && (
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors" aria-label="סגור תפריט">
                    <X size={20} />
                </button>
            )}
         </div>
         <BusinessSwitcher currentTenantName={brandName} />
      </div>

      {/* Navigation - Pill Items */}
      <LayoutGroup>
        <nav className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar pb-8 pt-2" tabIndex={0}>
            {NAV_GROUPS.map((group, index) => (
                <div key={index} className="space-y-2">
                    {group.title && (
                        <div className="px-6 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.title}</span>
                        </div>
                    )}
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNavClick(item.id)}
                                    className={`w-full flex items-center relative px-6 py-3.5 transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 border-2 ${
                                        isActive 
                                          ? 'border-transparent' 
                                          : 'border-transparent hover:bg-slate-50/80 rounded-2xl'
                                    }`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-nav-bg-finance"
                                            className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/20"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    
                                    <div className={`relative z-10 flex items-center gap-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                                        <Icon size={20} strokeWidth={isActive ? 3 : 2} className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                                        <span className="text-sm font-bold tracking-tight">{item.label}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
      </LayoutGroup>

      {/* OS Module Switcher Grid */}
      <div className="px-6 pt-4 border-t border-slate-100">
        <OSAppSwitcher mode="inlineGrid" compact={true} />
      </div>

      {/* User Footer */}
      <div className="px-6 pb-8 pt-4 border-t border-slate-100">
         <div className="flex items-center gap-4 p-4 rounded-[32px] bg-slate-50 border border-slate-200 shadow-sm transition-all group overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm shrink-0 overflow-hidden flex items-center justify-center">
                {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:') || user.avatar.startsWith('/')) ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm font-bold text-slate-700">{safeUserName?.charAt(0) || 'U'}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{safeUserName}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-bold mt-0.5">{user.role === 'admin' ? 'הבוס' : 'סוכן'}</p>
            </div>
         </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'FinanceSidebar';

export default Sidebar;

