'use client';

import React from 'react';
import { ArrowRight, RefreshCw, Key, ExternalLink, Moon } from 'lucide-react';
import { AdminTab } from './types';
import { usePathname, useRouter } from 'next/navigation';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';
import { Button } from '@/components/ui/button';

interface AdminPanelLayoutProps {
  activeTab: AdminTab;
  tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; badgeCount?: number }>;
  onTabChange: (tab: AdminTab) => void;
  onBackToDashboard: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  embedded?: boolean;
  children: React.ReactNode;
}

export default function AdminPanelLayout({
  activeTab,
  tabs,
  onTabChange,
  onBackToDashboard,
  onRefresh,
  isRefreshing,
  embedded = false,
  children,
}: AdminPanelLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleOpenLinksHub = () => {
    router.push('/app/admin/global/links');
  };
  return (
    <div
      className={`w-full ${
        embedded
          ? 'min-h-[70vh] bg-gradient-to-br from-indigo-50 via-white to-purple-50'
          : 'fixed inset-0 h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50'
      } text-slate-900 flex flex-col md:flex-row relative overflow-hidden`}
      dir="rtl"
    >
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[150px]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[200px]"></div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden relative z-10 bg-white border-b border-indigo-200 shrink-0">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-slate-900">ניהול מערכת</h1>
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded text-[8px] font-black uppercase tracking-widest">מנהל</span>
          </div>
          <div className="flex items-center gap-1">
            <Button onClick={onRefresh} disabled={isRefreshing} variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-600">
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin opacity-60' : undefined} />
            </Button>
            <Button onClick={onBackToDashboard} variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-600">
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-none">
          <nav className="flex gap-1.5 px-4 pb-3 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                      : 'text-slate-600 bg-white/60 hover:bg-indigo-50'
                  }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{tab.label}</span>
                  {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 ? (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
                      {tab.badgeCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white/90 backdrop-blur-sm border-l border-indigo-200 flex-col relative z-10 flex-shrink-0 shadow-xl">
        <div className="p-6 border-b border-indigo-100">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">ניהול מערכת</h1>
            <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded text-[9px] font-black uppercase tracking-widest">מנהל</span>
          </div>
          <p className="text-xs text-slate-600 font-bold">שליטה מלאה על המערכת</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="flex flex-col gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  variant="ghost"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-right ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200' 
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0"/>
                  <span className="flex-1">{tab.label}</span>
                  {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {tab.badgeCount}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-indigo-100">
          <Button
            onClick={handleOpenLinksHub}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-200/50 mb-2"
          >
            <ExternalLink size={18}/>
            <span>מרכז קישורים ומשאבים</span>
          </Button>
          <Button
            onClick={() => {
              const basePath = getSocialBasePath(pathname);
              router.push(joinPath(basePath, '/admin/shabbat-preview'));
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200/50 mb-2"
          >
            <Moon size={18}/>
            <span>תצוגה מקדימה - מצב שבת</span>
          </Button>
          <Button
            onClick={onBackToDashboard}
            variant="ghost"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
          >
            <ArrowRight size={18}/>
            <span>חזור לדף הבית</span>
          </Button>
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="ghost"
            className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={18} className={isRefreshing ? 'opacity-60' : undefined}/>
            <span>{isRefreshing ? 'מרענן...' : 'רענון'}</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        <header className="hidden md:block flex-shrink-0 px-8 pt-6 pb-4">
          <h2 className="text-3xl font-black tracking-tighter text-slate-900">
            {tabs.find(t => t.id === activeTab)?.label || 'ניהול מערכת'}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 pt-4 md:pt-0 min-h-0">
          {children}
        </div>
        
        <footer className="hidden md:flex mt-auto pt-8 pb-8 border-t border-indigo-200 flex-col md:flex-row justify-between items-center gap-4 relative z-10 w-full px-8 flex-shrink-0 bg-gradient-to-br from-indigo-50/50 via-white/50 to-purple-50/50 backdrop-blur-sm">
          <div className="flex items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> בסיס נתונים: מיועל</span>
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> גרסה: v2.4.12-admin</span>
            <span className="flex items-center gap-2 text-indigo-600"><Key size={12}/> חיבור מוצפן פעיל</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500"> 2025 Social | פאנל ניהול פנימי | גישה מוגבלת</p>
        </footer>
      </main>
    </div>
  );
}
