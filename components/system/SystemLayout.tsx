'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Kanban, Trophy, ArrowRight, Target, LogOut, Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { Notification } from '../../types';
import { RoomSwitcher } from '../shared/RoomSwitcher';
import { getNexusBasePath, toNexusPath } from '@/lib/os/nexus-routing';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';

interface SystemLayoutProps {
  children?: React.ReactNode;
}

export const SystemLayout = ({ children }: SystemLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getNexusBasePath(pathname);
  const { currentUser, notifications, organization } = useData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isShabbat } = useShabbat();
  const isShabbatProtected = (organization as { isShabbatProtected?: boolean } | null)?.isShabbatProtected !== false;

  const isActive = (path: string) => (pathname || '/') === toNexusPath(basePath, path);
  
  // Filter notifications for current user only
  const hasUnread = notifications
    .filter((n: Notification) => n.recipientId === 'all' || n.recipientId === currentUser.id)
    .some((n: Notification) => !n.read);
  
  const navItems = [
      { path: '/sales', label: 'לוח בקרה', icon: LayoutDashboard },
      { path: '/sales/pipeline', label: 'צנרת עסקאות', icon: Kanban },
      { path: '/sales/targets', label: 'יעדים', icon: Target },
  ];

  if (isShabbat && isShabbatProtected) {
    return <ShabbatScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-200 font-sans overflow-hidden selection:bg-rose-600/30" dir="rtl">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 border-l border-slate-800 bg-[#020617] flex-col p-4 relative z-20">
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-4 py-6 mb-4">
                <div className="w-12 h-12 bg-nexus-gradient text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-rose-500/20 ring-1 ring-white/20 overflow-hidden shrink-0">
                    <Target size={24} strokeWidth={2} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight leading-none">System</h1>
                    <p className="text-[10px] font-bold text-rose-500 tracking-widest uppercase mt-1">מרכז השליטה</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1">
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => router.push(toNexusPath(basePath, item.path))}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 group relative overflow-hidden ${
                            isActive(item.path) 
                            ? 'text-white bg-rose-600/20 border border-rose-600/30 shadow-lg shadow-rose-600/10 font-bold' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {isActive(item.path) && (
                            <motion.div 
                                layoutId="systemActiveTab"
                                className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.65)]"
                                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                            />
                        )}
                        <item.icon size={20} className={isActive(item.path) ? 'text-rose-400' : 'text-slate-600 group-hover:text-slate-400'} />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* User Profile */}
            <div className="mt-auto border-t border-slate-800 pt-4 px-2">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover border border-slate-700" suppressHydrationWarning />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate" suppressHydrationWarning>{currentUser.name}</p>
                        <p className="text-[10px] text-rose-500 uppercase font-bold tracking-wider">ביצועי שיא</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => router.push(toNexusPath(basePath, '/'))}
                    className="w-full flex items-center justify-center gap-2 mt-4 text-xs font-bold text-slate-500 hover:text-white transition-colors py-2"
                >
                    <ArrowRight size={14} className="rotate-180" /> חזרה ל-Nexus
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            {/* Ambient Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

            <header className="h-14 sm:h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 md:px-8 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm min-w-0">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white"
                    >
                        <Menu size={20} />
                    </button>
                    <span className="hidden sm:inline">/</span>
                    <span className="text-white font-bold truncate">{navItems.find(i => isActive(i.path))?.label}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <RoomSwitcher />
                    <div className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg bg-rose-600/10 border border-rose-600/20 flex items-center gap-1.5 sm:gap-2 text-rose-400 text-[10px] sm:text-xs font-bold font-mono">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.55)]"></div>
                        <span className="hidden sm:inline">נתונים בזמן אמת</span>
                        <span className="sm:hidden">זמן אמת</span>
                    </div>
                    <button className="text-slate-400 hover:text-white relative p-1.5 sm:p-0">
                        <Bell size={18} className="sm:w-5 sm:h-5" />
                        {hasUnread && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>}
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm md:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 bottom-0 w-64 bg-[#020617] border-l border-slate-800 z-50 flex flex-col md:hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-nexus-gradient text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-rose-500/20 ring-1 ring-white/20 overflow-hidden shrink-0">
                                        <Target size={24} strokeWidth={2} />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-black text-white tracking-tight leading-none">System</h1>
                                        <p className="text-[10px] font-bold text-rose-500 tracking-widest uppercase mt-0.5">מרכז השליטה</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            router.push(toNexusPath(basePath, item.path));
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                                            isActive(item.path) 
                                            ? 'text-white bg-rose-600/20 border border-rose-600/30 shadow-lg shadow-rose-600/10 font-bold' 
                                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <item.icon size={20} className={isActive(item.path) ? 'text-rose-400' : 'text-slate-600'} />
                                        {item.label}
                                    </button>
                                ))}
                            </nav>
                            <div className="border-t border-slate-800 p-4 space-y-3">
                                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                                        <p className="text-[10px] text-rose-500 uppercase font-bold tracking-wider">ביצועי שיא</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => {
                                        router.push(toNexusPath(basePath, '/'));
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-colors py-2"
                                >
                                    <ArrowRight size={14} className="rotate-180" /> חזרה ל-Nexus
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 z-10 custom-scrollbar">
                {children}
            </div>
        </main>
    </div>
  );
};

