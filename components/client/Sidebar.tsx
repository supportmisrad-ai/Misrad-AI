'use client';

import React from 'react';
import { X, LogOut } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useBrand } from '../system/contexts/BrandContext';
import { BusinessSwitcher } from '../BusinessSwitcher';
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
  const { brandName } = useBrand();

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
            <div className="flex items-center gap-4 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nexus-accent to-[#A38650] flex items-center justify-center text-white font-display font-bold text-xl shadow-glow-gold border border-white/10">
                  C
                </div>
                <div className="flex flex-col">
                    <span className="font-display font-semibold text-2xl tracking-tight text-slate-900 leading-none">Client</span>
                    <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-1">Misrad client</span>
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
                                    className={`w-full flex items-center relative px-6 py-3.5 transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-amber-500 border-2 ${
                                        isActive 
                                          ? 'border-transparent' 
                                          : 'border-transparent hover:bg-slate-50/80 rounded-2xl'
                                    }`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-nav-bg-client"
                                            className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl shadow-amber-500/20"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    
                                    <div className={`relative z-10 flex items-center gap-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                                        <Icon size={20} strokeWidth={isActive ? 3 : 2} className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}`} />
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
                    <span className="text-sm font-bold text-slate-700">{user.name?.charAt(0) || 'U'}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-bold mt-0.5">{user.role === 'admin' ? 'הבוס' : 'סוכן'}</p>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" aria-label="התנתק מהמערכת">
                <LogOut size={18} />
            </button>
         </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'ClientSidebar';

export default Sidebar;

