'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, TrendingUp, FileText, BarChart, Plug, Settings, Menu, X, Search, Bell } from 'lucide-react';
import { useAuth } from '../system/contexts/AuthContext';
import { useToast } from '../system/contexts/ToastContext';
import { useOnClickOutside } from '../system/hooks/useOnClickOutside';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { buildDocumentTitle } from '@/lib/room-branding';

// Import placeholder components
import InvoicesView from './invoices/InvoicesView';
import ReportsView from './ReportsView';
import IntegrationsView from './integrations/IntegrationsView';
import OverviewView from './OverviewView';

const FinanceBootScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center z-50">
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-500/30 animate-bounce">
          <CreditCard size={48} strokeWidth={1.5} />
        </div>
        <div className="w-64 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mt-6 text-[10px] font-bold text-emerald-300 uppercase tracking-[0.3em] animate-pulse">מתניע כספת דיגיטלית...</p>
      </div>
    </div>
  );
};

const FinanceOSApp: React.FC<{ initialFinanceOverview?: any }> = ({ initialFinanceOverview }) => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { pathname } = useRoomBranding();
  const [booted, setBooted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(profileRef, () => setIsProfileOpen(false));

  const onBootComplete = useCallback(() => {
    setBooted(true);
    sessionStorage.setItem('finance_booted', 'true');
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('finance_booted');
    if (saved === 'true') {
      setBooted(true);
    }
  }, []);

  const navItems = [
    { id: 'overview', label: 'סקירה כללית', icon: TrendingUp },
    { id: 'invoices', label: 'חשבוניות', icon: FileText },
    { id: 'reports', label: 'דוחות', icon: BarChart },
    { id: 'integrations', label: 'אינטגרציות', icon: Plug },
    { id: 'settings', label: 'הגדרות', icon: Settings }
  ];

  const activeNavItem = navItems.find(item => item.id === activeTab);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = buildDocumentTitle({ pathname, screenName: activeNavItem?.label || null });
  }, [activeNavItem?.label, pathname]);

  if (!user) {
    return <div className="p-8 text-center">נדרש התחברות</div>;
  }

  if (!booted) {
    return <FinanceBootScreen onComplete={onBootComplete} />;
  }

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

  const avatarValue = String(user?.avatar ?? '').trim();
  const hasValidAvatarSrc =
    !!avatarValue &&
    (avatarValue.startsWith('http') || avatarValue.startsWith('data:') || avatarValue.startsWith('/'));

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView initialFinanceOverview={initialFinanceOverview} />;
      case 'invoices':
        return <InvoicesView />;
      case 'reports':
        return <ReportsView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return (
          <div className="p-8 text-center">
            <Settings className="mx-auto mb-4 text-slate-500" size={48} />
            <h2 className="text-2xl font-bold mb-2">הגדרות</h2>
            <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
          </div>
        );
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          logout={logout}
          navItems={navItems}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{activeNavItem?.label || 'Finance'}</h1>
              <p className="text-xs text-slate-500">ניהול כספים מקצועי</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-slate-100">
              <Search size={20} />
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-100 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold overflow-hidden">
                  {hasValidAvatarSrc ? (
                    <img src={avatarValue} alt={safeUserName} className="w-full h-full object-cover" />
                  ) : (
                    safeUserName.charAt(0)
                  )}
                </div>
                <span className="hidden md:block font-medium text-sm">{safeUserName}</span>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
                  >
                    <button
                      onClick={logout}
                      className="w-full px-4 py-3 text-right text-sm text-slate-600 hover:bg-slate-50"
                    >
                      התנתק
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                user={user}
                logout={logout}
                mobile={true}
                onClose={() => setIsMobileMenuOpen(false)}
                navItems={navItems}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceOSApp;

