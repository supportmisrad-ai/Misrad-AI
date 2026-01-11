'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Users, Calendar, BookOpen, Lightbulb, Globe, Menu, X, Search, Bell } from 'lucide-react';
import { useAuth } from '../system/contexts/AuthContext';
import { useToast } from '../system/contexts/ToastContext';
import { useOnClickOutside } from '../system/hooks/useOnClickOutside';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

// Import placeholder components
import ClientsView from './clients/ClientsView';
import SessionsView from './sessions/SessionsView';
import GroupsView from './groups/GroupsView';
import ProgramsView from './programs/ProgramsView';
import InsightsView from './insights/InsightsView';
import ClientPortalView from './portal/ClientPortalView';

const ClientBootScreen = ({ onComplete }: { onComplete: () => void }) => {
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
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 flex items-center justify-center z-50">
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-amber-500/30 animate-bounce">
          <GraduationCap size={48} strokeWidth={1.5} />
        </div>
        <div className="w-64 h-1.5 bg-amber-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mt-6 text-[10px] font-bold text-amber-300 uppercase tracking-[0.3em] animate-pulse">מתניע קליניקה דיגיטלית...</p>
      </div>
    </div>
  );
};

const ClientOSApp = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [booted, setBooted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('clients');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(profileRef, () => setIsProfileOpen(false));

  useEffect(() => {
    const saved = sessionStorage.getItem('client_booted');
    if (saved === 'true') {
      setBooted(true);
    }
  }, []);

  const navItems = [
    { id: 'clients', label: 'לקוחות', icon: Users },
    { id: 'sessions', label: 'פגישות', icon: Calendar },
    { id: 'groups', label: 'קבוצות', icon: Users },
    { id: 'programs', label: 'תוכניות', icon: BookOpen },
    { id: 'insights', label: 'תובנות', icon: Lightbulb },
    { id: 'portal', label: 'פורטל לקוח', icon: Globe }
  ];

  if (!user) {
    return <div className="p-8 text-center">נדרש התחברות</div>;
  }

  if (!booted) {
    return <ClientBootScreen onComplete={() => { setBooted(true); sessionStorage.setItem('client_booted', 'true'); }} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return <ClientsView />;
      case 'sessions':
        return <SessionsView />;
      case 'groups':
        return <GroupsView />;
      case 'programs':
        return <ProgramsView />;
      case 'insights':
        return <InsightsView />;
      case 'portal':
        return <ClientPortalView />;
      default:
        return <ClientsView />;
    }
  };

  const activeNavItem = navItems.find(item => item.id === activeTab);

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
              <h1 className="text-xl font-bold text-slate-900">{activeNavItem?.label || 'Client'}</h1>
              <p className="text-xs text-slate-500">ניהול לקוחות מקצועי</p>
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
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                  {user.avatar || user.name.charAt(0)}
                </div>
                <span className="hidden md:block font-medium text-sm">{user.name}</span>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
                  >
                    <a
                      href="/app#/me"
                      className="block w-full px-4 py-3 text-right text-sm text-slate-600 hover:bg-slate-50"
                    >
                      פרופיל וחשבון
                    </a>
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

export default ClientOSApp;

