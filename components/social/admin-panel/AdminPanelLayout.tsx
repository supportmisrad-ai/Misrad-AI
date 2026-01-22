'use client';

import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Key, ExternalLink, Copy, Check, Moon, X } from 'lucide-react';
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
  const [isMarketingLinksOpen, setIsMarketingLinksOpen] = useState(false);

  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  };

  const getMarketingLinks = () => {
    return [
      { label: 'Social · דף נחיתה', path: '/social' },
      { label: 'Pricing · מחירון', path: '/pricing' },
      { label: 'Subscribe · Checkout', path: '/subscribe/checkout' },
      { label: 'System · דף שיווק', path: '/system' },
      { label: 'Client · דף שיווק', path: '/client' },
    ];
  };

  const toAbsoluteUrl = (path: string) => {
    const base = getBaseUrl();
    if (!base) return path;
    return `${base}${path}`;
  };

  const handleCopyLink = async () => {
    const links = getMarketingLinks();
    const text = links.map((l) => `${l.label}: ${toAbsoluteUrl(l.path)}`).join('\n');
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleOpenLandingPage = () => {
    setIsMarketingLinksOpen(true);
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
            disabled={isRefreshing}
            className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={18} className={isRefreshing ? 'opacity-60' : undefined}/>
            <span>{isRefreshing ? 'מרענן...' : 'רענון'}</span>
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
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> בסיס נתונים: מיועל</span>
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> גרסה: v2.4.12-admin</span>
            <span className="flex items-center gap-2 text-indigo-600"><Key size={12}/> חיבור מוצפן פעיל</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500">© 2025 Social | פאנל ניהול פנימי | גישה מוגבלת</p>
        </footer>
      </main>

      {isMarketingLinksOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMarketingLinksOpen(false)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex flex-col">
                <h3 className="text-lg font-black text-slate-900">קישורים לדפי שיווק</h3>
                <p className="text-xs font-bold text-slate-500">פתיחה בטאב חדש</p>
              </div>
              <button
                onClick={() => setIsMarketingLinksOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-2">
                {getMarketingLinks().map((link) => (
                  <a
                    key={link.path}
                    href={link.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      const url = toAbsoluteUrl(link.path);
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink size={16} className="text-indigo-600" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{link.label}</div>
                      <div className="text-xs font-bold text-slate-500 truncate">{toAbsoluteUrl(link.path)}</div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <Copy size={16} />
                  <span>העתק הכל</span>
                </button>
                <button
                  onClick={() => setIsMarketingLinksOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-black text-xs bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

