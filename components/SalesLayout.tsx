
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Kanban, Trophy, ArrowRight, Zap, Target, LogOut, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';

interface SalesLayoutProps {
  children?: React.ReactNode;
}

export const SalesLayout = ({ children }: SalesLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, notifications } = useData();

  const isActive = (path: string) => location.pathname === path;
  
  // Filter notifications for current user only
  const hasUnread = notifications
    .filter(n => n.recipientId === 'all' || n.recipientId === currentUser.id)
    .some(n => !n.read);
  
  const navItems = [
      { path: '/sales', label: 'לוח בקרה', icon: LayoutDashboard },
      { path: '/sales/pipeline', label: 'צנרת עסקאות', icon: Kanban },
      { path: '/sales/targets', label: 'יעדים', icon: Target },
  ];

  return (
    <div className="flex h-screen w-full bg-[#020617] text-slate-200 font-sans overflow-hidden selection:bg-emerald-500/30" dir="rtl">
        {/* Sidebar */}
        <aside className="w-64 border-l border-slate-800 bg-[#020617] flex flex-col p-4 relative z-20">
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-4 py-6 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <Zap className="text-black" size={20} fill="currentColor" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight leading-none">Sales OS</h1>
                    <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mt-1">מרכז השליטה</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1">
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden ${
                            isActive(item.path) 
                            ? 'text-white bg-white/5 border border-white/10 shadow-lg' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {isActive(item.path) && (
                            <motion.div 
                                layoutId="salesActiveTab"
                                className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"
                            />
                        )}
                        <item.icon size={20} className={isActive(item.path) ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'} />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* User Profile */}
            <div className="mt-auto border-t border-slate-800 pt-4 px-2">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-700" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider">ביצועי שיא</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center gap-2 mt-4 text-xs font-bold text-slate-500 hover:text-white transition-colors py-2"
                >
                    <ArrowRight size={14} className="rotate-180" /> חזרה ל-Nexus OS
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            {/* Ambient Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

            <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <span>/</span>
                    <span className="text-white font-bold">{navItems.find(i => isActive(i.path))?.label}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        נתונים בזמן אמת
                    </div>
                    <button className="text-slate-400 hover:text-white relative">
                        <Bell size={20} />
                        {hasUnread && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">
                {children}
            </div>
        </main>
    </div>
  );
};
