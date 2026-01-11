'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, PenTool, Sun, Settings, Headphones, Sparkles, Home, CheckSquare, Plus, Briefcase, User, AppWindow } from 'lucide-react';
import { NAV_ITEMS, getMobileGridStyles } from './layout.types';
import OSAppSwitcher from '../shared/OSAppSwitcher';

interface MobileMenuProps {
  isPlusMenuOpen: boolean;
  setIsPlusMenuOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  handleVoiceClick: () => void;
  handleTaskClick: () => void;
  handleNavClick: (path: string) => void;
  togglePlusMenu: () => void;
  toggleMobileMenu: () => void;
  filteredNavItems: typeof NAV_ITEMS;
  isActive: (path: string) => boolean;
  hasPermission: (permission: string) => boolean;
  organization: {
    enabledModules: string[];
    systemFlags?: Record<string, string>;
  };
  setShowMorningBrief: (show: boolean) => void;
  openSupport: () => void;
  startTutorial: () => void;
  navigate: (path: string, options?: any) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isPlusMenuOpen,
  setIsPlusMenuOpen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleVoiceClick,
  handleTaskClick,
  handleNavClick,
  togglePlusMenu,
  toggleMobileMenu,
  filteredNavItems,
  isActive,
  hasPermission,
  organization,
  setShowMorningBrief,
  openSupport,
  startTutorial,
  navigate,
}) => {
  return (
    <>
      {/* Mobile Action Menu Overlay */}
      <AnimatePresence>
        {isPlusMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[45] backdrop-blur-sm md:hidden"
              onClick={() => setIsPlusMenuOpen(false)}
            />
            <div className="fixed bottom-28 left-0 right-0 z-[50] flex justify-center gap-4 sm:gap-6 md:hidden pointer-events-none px-4">
              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.05 }}
                className="flex flex-col items-center gap-2.5 pointer-events-auto"
              >
                <button 
                  onClick={handleVoiceClick}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center hover:from-red-600 hover:to-red-700 active:scale-95 transition-all duration-200 border border-red-400/20"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Mic size={24} className="sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">הקלטה</span>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex flex-col items-center gap-2.5 pointer-events-auto"
              >
                <button 
                  onClick={handleTaskClick}
                  className="group relative w-16 h-16 sm:w-20 sm:h-20 bg-white text-slate-900 rounded-2xl shadow-lg shadow-black/10 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all duration-200 border border-gray-200/60"
                  aria-label="צור משימה חדשה"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <PenTool size={24} className="sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">משימה</span>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                const shouldClose = info.offset.y > 110 || info.velocity.y > 900;
                if (shouldClose) setIsMobileMenuOpen(false);
              }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-[100] p-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-white/50"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50"></div>
              <div className="space-y-6">
                {/* Calendar & Morning Brief - Full Width */}
                <div className="grid grid-cols-2 gap-4">
                  {filteredNavItems
                    .filter(item => item.path === '/calendar')
                    .map((item) => {
                    const isActiveItem = isActive(item.path);
                    const itemStyle = getMobileGridStyles(item.path, isActiveItem);
                    return (
                      <button 
                        key={item.path}
                        onClick={() => handleNavClick(item.path)} 
                        className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 group shadow-md ${
                          isActiveItem 
                            ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/30' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-gray-200/50'
                        }`}
                        aria-label={item.label}
                      >
                        <item.icon size={24} strokeWidth={2} />
                        <span className={`text-sm font-bold ${isActiveItem ? 'text-white' : 'text-gray-700'}`}>{item.label}</span>
                      </button>
                    )
                  })}
                  <button 
                    onClick={() => { setShowMorningBrief(true); setIsMobileMenuOpen(false); }} 
                    className="relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl transition-all duration-200 bg-orange-50 text-orange-700 hover:bg-orange-100 shadow-md shadow-orange-200/50 group"
                    aria-label="תדריך בוקר"
                  >
                    <Sun size={24} strokeWidth={2} />
                    <span className="text-sm font-bold text-orange-700">תדריך בוקר</span>
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                    </span>
                  </button>
                </div>

                {/* Separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                {/* Primary Navigation Items */}
                <div className="grid grid-cols-4 gap-4">
                  {filteredNavItems
                    .filter(item => {
                      const isInBottomNav = item.path === '/' || 
                                            item.path === '/tasks' || 
                                            item.path === '/settings' ||
                                            item.path === '/brain' ||
                                            item.path === '/calendar' ||
                                            (item.path === '/clients' && hasPermission('view_crm') && organization.enabledModules.includes('crm') && organization.systemFlags?.['clients'] !== 'hidden');
                      return !isInBottomNav;
                    })
                    .map((item) => {
                    const isActiveItem = isActive(item.path);
                    const itemStyle = getMobileGridStyles(item.path, isActiveItem);
                    return (
                      <button 
                        key={item.path}
                        onClick={() => handleNavClick(item.path)} 
                        className="flex flex-col items-center gap-2 group"
                        aria-label={item.label}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md ${itemStyle} ${isActiveItem ? 'shadow-slate-800/30' : 'shadow-gray-200/50'}`}>
                          <item.icon size={22} strokeWidth={2} />
                        </div>
                        <span className={`text-[10px] font-medium text-center leading-tight transition-colors ${isActiveItem ? 'text-black font-bold' : 'text-gray-500'}`}>{item.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                {/* Settings - Full Width, Centered */}
                <div className="flex justify-center">
                  <button 
                    onClick={() => { 
                      setIsMobileMenuOpen(false); 
                      navigate('/settings?menu=1'); 
                    }} 
                    className={`flex items-center justify-center gap-3 w-full max-w-xs px-6 py-4 rounded-2xl transition-all duration-200 group shadow-md ${
                      isActive('/settings') 
                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/30' 
                        : 'bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-slate-300/50'
                    }`}
                    aria-label="הגדרות ופיצ'רים"
                  >
                    <Settings size={24} strokeWidth={2} />
                    <span className={`text-sm font-bold ${isActive('/settings') ? 'text-white' : 'text-slate-800'}`}>הגדרות ופיצ'רים</span>
                  </button>
                </div>

                {/* Separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                {/* OS Modules */}
                <div className="space-y-3">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">מודולים</div>
                  <OSAppSwitcher mode="inlineGrid" compact={true} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className={`md:hidden fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] h-16 shadow-[0_8px_30px_rgba(0,0,0,0.1)] px-2 sm:px-4 flex items-center justify-evenly transition-all duration-300 ${isPlusMenuOpen ? 'z-[60]' : 'z-40'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)', marginBottom: 'env(safe-area-inset-bottom)' }}>
        <button 
          onClick={() => handleNavClick('/')} 
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            isActive('/') 
              ? 'bg-black text-white shadow-lg shadow-black/20' 
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`} 
          aria-label="לוח בקרה"
        >
          <Home size={18} className="sm:w-5 sm:h-5" strokeWidth={isActive('/') ? 2.5 : 2} />
        </button>
        
        <button 
          onClick={() => handleNavClick('/tasks')} 
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            isActive('/tasks') 
              ? 'bg-black text-white shadow-lg shadow-black/20' 
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`} 
          aria-label="משימות"
        >
          <CheckSquare size={18} className="sm:w-5 sm:h-5" strokeWidth={isActive('/tasks') ? 2.5 : 2} />
        </button>
        
        <div className="relative -top-6 z-50">
          <button 
            onClick={togglePlusMenu} 
            aria-label={isPlusMenuOpen ? "סגור תפריט" : "פתח תפריט"}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 border-[4px] sm:border-[5px] border-[#f1f5f9] group relative overflow-hidden ${
              isPlusMenuOpen 
              ? 'bg-slate-900 rotate-45 scale-90' 
              : 'bg-gradient-to-br from-slate-800 to-black hover:scale-105'
            }`}
          >
            {/* Subtle inner gradient/glow */}
            <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 opacity-100 transition-opacity ${isPlusMenuOpen ? 'opacity-0' : ''}`}></div>
            
            <Plus size={26} className="sm:w-[30px] sm:h-[30px] text-white drop-shadow-md" strokeWidth={2.5} />
          </button>
        </div>
        
        {hasPermission('view_crm') && organization.enabledModules.includes('crm') && organization.systemFlags?.['clients'] !== 'hidden' ? (
          <button 
            onClick={() => handleNavClick('/clients')} 
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
              isActive('/clients') 
                ? 'bg-black text-white shadow-lg shadow-black/20' 
                : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
            }`} 
            aria-label="לקוחות"
          >
            <Briefcase size={18} className="sm:w-5 sm:h-5" strokeWidth={isActive('/clients') ? 2.5 : 2} />
          </button>
        ) : (
          <button 
            onClick={() => handleNavClick('/me')} 
            className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
              isActive('/me') 
                ? 'bg-black text-white shadow-lg shadow-black/20' 
                : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
            }`} 
            aria-label="פרופיל שלי"
          >
            <User size={18} className="sm:w-5 sm:h-5" strokeWidth={isActive('/me') ? 2.5 : 2} />
          </button>
        )}
        
        <button 
          onClick={() => {
            toggleMobileMenu();
          }} 
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 relative z-10 ${
            isActive('/settings') || isActive('/me') 
              ? 'bg-black text-white shadow-lg shadow-black/20' 
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`}
          aria-label="הגדרות ותפריט"
        >
          <AppWindow size={18} className="sm:w-5 sm:h-5" strokeWidth={isActive('/settings') || isActive('/me') ? 2.5 : 2} />
        </button>
      </nav>
    </>
  );
};

