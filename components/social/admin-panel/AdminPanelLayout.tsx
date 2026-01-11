'use client';

import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Key, ExternalLink, Copy, Check, Moon } from 'lucide-react';
import { AdminTab } from './types';
import { useApp } from '@/contexts/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';

interface AdminPanelLayoutProps {
  activeTab: AdminTab;
  tabs: Array<{ id: AdminTab; label: string; icon: any; badgeCount?: number }>;
  onTabChange: (tab: AdminTab) => void;
  onBackToDashboard: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  children: React.ReactNode;
}

export default function AdminPanelLayout({
  activeTab,
  tabs,
  onTabChange,
  onBackToDashboard,
  onRefresh,
  isRefreshing,
  children,
}: AdminPanelLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const getLandingPageUrl = () => {
    if (typeof window !== 'undefined') {
      // Get the base URL without any path or query params
      const baseUrl = window.location.origin;
      // Return clean landing page URL
      return baseUrl;
    }
    return '';
  };

  const handleCopyLink = async () => {
    const url = getLandingPageUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleOpenLandingPage = () => {
    const url = getLandingPageUrl();
    if (url) {
      window.open(url, '_blank');
    } else {
      router.push('/');
    }
  };
  return (
    <div className="fixed inset-0 w-full h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-900 flex relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-200/30 rounded-full blur-[150px]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/20 rounded-full blur-[200px]"></div>

      {/* Sidebar */}
      <aside className="w-64 bg-white/90 backdrop-blur-sm border-l border-indigo-200 flex flex-col relative z-10 flex-shrink-0 shadow-xl">
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
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
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
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-indigo-100">
          <button
            onClick={handleOpenLandingPage}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-200/50 mb-2"
          >
            <ExternalLink size={18}/>
            <span>קישור לדף הנחיתה</span>
          </button>
          <button
            onClick={() => {
              const basePath = getSocialBasePath(pathname);
              router.push(joinPath(basePath, '/admin/shabbat-preview'));
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200/50 mb-2"
          >
            <Moon size={18}/>
            <span>תצוגה מקדימה - מצב שבת</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all mb-2"
          >
            {copied ? (
              <>
                <Check size={18} className="text-emerald-500"/>
                <span className="text-emerald-500">הועתק!</span>
              </>
            ) : (
              <>
                <Copy size={18}/>
                <span>העתק קישור</span>
              </>
            )}
          </button>
          <button
            onClick={onBackToDashboard}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
          >
            <ArrowRight size={18}/>
            <span>חזור לדף הבית</span>
          </button>
          <button
            onClick={onRefresh}
            className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''}/>
            <span>רענון</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        <header className="flex-shrink-0 px-8 pt-6 pb-4">
          <h2 className="text-3xl font-black tracking-tighter text-slate-900">
            {tabs.find(t => t.id === activeTab)?.label || 'ניהול מערכת'}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-8 min-h-0">
          {children}
        </div>
        
        <footer className="mt-auto pt-8 pb-8 border-t border-indigo-200 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 w-full px-8 flex-shrink-0 bg-gradient-to-br from-indigo-50/50 via-white/50 to-purple-50/50 backdrop-blur-sm">
          <div className="flex items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> בסיס נתונים: מיועל</span>
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> גרסה: v2.4.12-admin</span>
            <span className="flex items-center gap-2 text-indigo-600"><Key size={12}/> חיבור מוצפן פעיל</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500">© 2025 Social | פאנל ניהול פנימי | גישה מוגבלת</p>
        </footer>
      </main>
    </div>
  );
}

