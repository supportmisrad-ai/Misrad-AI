'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, PenTool, Sun, Settings, Headphones, Sparkles, Home, CheckSquare, Plus, Briefcase, User, SquareMousePointer } from 'lucide-react';
import { NAV_ITEMS, getMobileGridStyles } from './layout.types';
import OSAppSwitcher from '../shared/OSAppSwitcher';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { PermissionId } from '@/types';

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
  hasPermission: (permission: PermissionId) => boolean;
  organization: {
    enabledModules: string[];
    systemFlags?: Record<string, string>;
  };
  allowMorningBrief: boolean;
  setShowMorningBrief: (show: boolean) => void;
  openSupport: () => void;
  startTutorial: () => void;
  navigate: (path: string, options?: Record<string, unknown>) => void;
  plusGradient?: string;
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
  allowMorningBrief,
  setShowMorningBrief,
  openSupport,
  startTutorial,
  navigate,
  plusGradient,
}) => {
  const hasCrm = hasPermission('view_crm') && organization.enabledModules.includes('crm') && organization.systemFlags?.['clients'] !== 'hidden';

  // Compute a single active bottom-nav ID to guarantee mutual exclusivity.
  // Priority: page match first, then menu/settings state.
  const activeBottomId: string | null = (() => {
    if (isActive('/tasks')) return 'tasks';
    if (hasCrm ? isActive('/clients') : isActive('/me')) return 'clients';
    if (isActive('/')) return 'home';
    if (isMobileMenuOpen) return 'menu';
    if (isActive('/settings')) return 'menu';
    return null;
  })();

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
                <span className="text-xs font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/20">פקודה קולית</span>
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
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50"></div>
              <div className="space-y-6">
                {/* Morning Brief - Full Width */}
                {allowMorningBrief ? (
                  <div className="grid grid-cols-1 gap-4">
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
                ) : null}

                {/* Separator */}
                {allowMorningBrief ? <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div> : null}

                {/* Primary Navigation Items (including Calendar) */}
                <div className="grid grid-cols-4 gap-4">
                  {filteredNavItems
                    .filter(item => {
                      if (item.path === '/' || item.path === '/tasks') return false;
                      if (item.path === '/clients' && hasPermission('view_crm') && organization.enabledModules.includes('crm') && organization.systemFlags?.['clients'] !== 'hidden') return false;
                      if (item.path === '/settings') return false;
                      return true;
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

      <MobileBottomNav
        className={isPlusMenuOpen ? 'z-[60]' : 'z-40'}
        rightItems={[
          {
            id: 'home',
            label: 'לוח בקרה',
            icon: Home,
            active: activeBottomId === 'home',
            onClick: () => handleNavClick('/'),
          },
          {
            id: 'tasks',
            label: 'משימות',
            icon: CheckSquare,
            active: activeBottomId === 'tasks',
            onClick: () => handleNavClick('/tasks'),
          },
        ]}
        leftItems={[
          {
            id: 'clients',
            label: hasCrm ? 'לקוחות' : 'פרופיל',
            icon: hasCrm ? Briefcase : User,
            active: activeBottomId === 'clients',
            onClick: () => hasCrm ? handleNavClick('/clients') : handleNavClick('/me'),
          },
          {
            id: 'menu',
            label: 'תפריט',
            icon: SquareMousePointer,
            active: activeBottomId === 'menu',
            onClick: () => toggleMobileMenu(),
          },
        ]}
        onPlusClickAction={togglePlusMenu}
        plusAriaLabel={isPlusMenuOpen ? 'סגור תפריט' : 'פתח תפריט'}
        plusActive={isPlusMenuOpen}
        plusGradient={plusGradient}
      />
    </>
  );
};

