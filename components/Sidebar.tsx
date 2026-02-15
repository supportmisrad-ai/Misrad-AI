'use client';

import React from 'react';
import { Target, X, LogOut, Layout, Building2, Cpu, Wallet, Map, Megaphone, BarChart3, Kanban, Users } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { NAV_GROUPS } from './system/constants';
import { useBrand } from '../contexts/BrandContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  user: { name?: string; role?: string; avatar?: string; id?: string };
  logout: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

const Sidebar = React.memo(({ activeTab, setActiveTab, user, logout, mobile = false, onClose }: SidebarProps) => {
  const { brandName, brandLogo } = useBrand();

  const handleNavClick = (id: string) => {
      setActiveTab(id);
      if (mobile && onClose) onClose();
  };

  return (
    <aside 
      className={`sidebar flex flex-col h-full ${mobile ? 'w-full max-w-[300px] shadow-none bg-white/95 backdrop-blur-xl border-l border-slate-100' : 'rounded-none md:rounded-r-[3rem] shadow-[4px_0_40px_rgba(0,0,0,0.03)] border-r border-white/40'}`}
      role="navigation"
      aria-label="Side Navigation"
    >
      
      {/* Brand Header */}
      <div className="h-[80px] md:h-[100px] flex items-center px-6 mb-2 flex-shrink-0 justify-between">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-nexus-gradient text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-rose-500/20 ring-1 ring-white/20 overflow-hidden text-center shrink-0">
                {brandLogo ? (
                    <img src={brandLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <Target size={24} strokeWidth={2} />
                )}
            </div>
            <div className="flex flex-col justify-center overflow-hidden">
                <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 leading-none tracking-tight font-sans truncate">{brandName}</h1>
                <span className="text-[10px] md:text-[11px] font-black text-slate-400 tracking-[0.25em] uppercase mt-1.5 ml-0.5">Nexus system</span>
            </div>
         </div>
         {mobile && onClose && (
             <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors" aria-label="סגור תפריט">
                 <X size={20} />
             </button>
         )}
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
                            const isWorkspace = item.id === 'workspace';
                            
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleNavClick(item.id)}
                                    className={`w-full flex items-center relative px-6 py-3.5 transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-primary border-2 ${
                                        isActive 
                                          ? 'border-transparent' 
                                          : isWorkspace 
                                            ? 'border-primary/20 bg-primary/5 rounded-2xl hover:border-transparent' 
                                            : 'border-transparent hover:bg-slate-50/80 rounded-2xl'
                                    }`}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-nav-bg"
                                            className="absolute inset-0 bg-nexus-gradient rounded-2xl shadow-xl shadow-rose-500/20"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    
                                    <div className={`relative z-10 flex items-center gap-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                                        <Icon size={20} strokeWidth={isActive ? 3 : 2} className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
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

      {/* User Footer */}
      <div className="px-6 pb-8 pt-4 border-t border-slate-100">
         <div className="flex items-center gap-4 p-4 rounded-[32px] bg-slate-50 border border-slate-200 shadow-sm transition-all group overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sm font-bold text-slate-700 border border-slate-200 shadow-sm shrink-0">
                {user.avatar}
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

export default Sidebar;
