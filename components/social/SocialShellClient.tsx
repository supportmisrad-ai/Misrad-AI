'use client';

import React, { Suspense, useMemo, useState } from 'react';
import ToastContainer from '@/components/social/ToastContainer';
import AddClientModal from '@/components/social/modals/AddClientModal';
import InviteClientModal from '@/components/social/modals/InviteClientModal';
import PaymentLinkModal from '@/components/social/modals/PaymentLinkModal';
import TaskModal from '@/components/social/modals/TaskModal';
import CampaignWizard from '@/components/social/modals/CampaignWizard';
import ReportModal from '@/components/social/modals/ReportModal';
import HelpModal from '@/components/social/modals/HelpModal';
import CommandPalette from '@/components/social/CommandPalette';
import NotificationCenter from '@/components/social/NotificationCenter';
import ShabbatScreen from '@/components/social/ShabbatScreen';
import Header from '@/components/social/Header';
import OnboardingTour from '@/components/social/OnboardingTour';
import { useShabbat } from '@/hooks/useShabbat';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AppWindow, BarChart3, Calendar, Home, LayoutGrid, Megaphone, Plus, Settings, TrendingUp, User, Users, MessageSquare, X, Sparkles, Wallet } from 'lucide-react';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';

import { AppProvider } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import type { SocialInitialData, SocialNavigationItem } from '@/lib/services/social-service';

function SocialShellContent({
  children,
  basePath,
}: {
  children: React.ReactNode;
  basePath: string;
}) {
  const { isTourActive, setIsTourActive } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (suffix: string) => {
    const full = joinPath(basePath, suffix);
    return (pathname || '') === full;
  };

  const navigate = (suffix: string) => {
    router.push(joinPath(basePath, suffix));
  };

  const bottomNavItems = useMemo(
    () => [
      { id: 'dashboard', label: 'דשבורד', suffix: '/dashboard', icon: Home },
      { id: 'clients', label: 'לקוחות', suffix: '/clients', icon: Users },
      { id: 'machine', label: 'Machine', suffix: '/machine', icon: Sparkles },
      { id: 'calendar', label: 'יומן', suffix: '/calendar', icon: Calendar },
    ],
    []
  );

  const menuItems = useMemo(
    () => [
      { id: 'inbox', label: 'הודעות', suffix: '/inbox', icon: MessageSquare },
      { id: 'workspace', label: 'סביבת עבודה', suffix: '/workspace', icon: LayoutGrid },
      { id: 'campaigns', label: 'קמפיינים', suffix: '/campaigns', icon: Megaphone },
      { id: 'analytics', label: 'אנליטיקה', suffix: '/analytics', icon: BarChart3 },
      { id: 'team', label: 'צוות', suffix: '/team', icon: Users },
      { id: 'collection', label: 'גבייה', suffix: '/collection', icon: Wallet },
      { id: 'agency-insights', label: 'תובנות', suffix: '/agency-insights', icon: TrendingUp },
      { id: 'settings', label: 'הגדרות', suffix: '/settings', icon: Settings },
      { id: 'profile', label: 'פרופיל', suffix: '/profile', icon: User },
    ],
    []
  );

  const getMobileGridStyles = (suffix: string, active: boolean) => {
    if (active) return 'bg-slate-800 text-white shadow-xl scale-105 ring-2 ring-slate-700/30 border-slate-800';
    switch (suffix) {
      case '/dashboard':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case '/clients':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case '/calendar':
        return 'bg-red-50 text-red-600 border-red-100';
      case '/inbox':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case '/machine':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case '/campaigns':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case '/analytics':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100';
      case '/collection':
        return 'bg-green-50 text-green-700 border-green-100';
      case '/agency-insights':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case '/settings':
      case '/profile':
      case '/workspace':
      case '/team':
      default:
        return 'bg-slate-200 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        <Header />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 w-full relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </main>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                const shouldClose = info.offset.y > 110 || info.velocity.y > 900;
                if (shouldClose) setIsMobileMenuOpen(false);
              }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-[101] p-6 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] border-t border-white/50"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-50"></div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-lg font-black text-slate-900">תפריט</div>
                  <div className="text-xs text-slate-500 font-bold">מסכים ומודולים</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-4">
                  {menuItems
                    .filter((i) => !bottomNavItems.some((b) => b.suffix === i.suffix))
                    .map((item) => {
                      const active = isActive(item.suffix);
                      const Icon = item.icon;
                      const style = getMobileGridStyles(item.suffix, active);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigate(item.suffix);
                            setIsMobileMenuOpen(false);
                          }}
                          className="flex flex-col items-center gap-2 group"
                          aria-label={item.label}
                          type="button"
                        >
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md border ${style} ${
                              active ? 'shadow-slate-800/30' : 'shadow-slate-200/60'
                            }`}
                          >
                            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                          </div>
                          <span
                            className={`text-[10px] font-bold text-center leading-tight transition-colors ${
                              active ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                <div className="space-y-3">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">מודולים</div>
                  <OSAppSwitcher mode="inlineGrid" compact={true} />
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] h-16 shadow-[0_8px_30px_rgba(0,0,0,0.1)] px-2 sm:px-4 flex items-center justify-evenly transition-all duration-300 z-40">
        {bottomNavItems.slice(0, 2).map((item) => {
          const active = isActive(item.suffix);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.suffix)}
              className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
                active
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
              }`}
              aria-label={item.label}
              type="button"
            >
              <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={active ? 2.5 : 2} />
            </button>
          );
        })}

        <div className="relative -top-6 z-50">
          <button
            onClick={() => navigate('/machine')}
            aria-label="יצירת פוסט"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 border-[4px] sm:border-[5px] border-[#f1f5f9] group relative overflow-hidden bg-nexus-gradient hover:scale-105"
            type="button"
          >
            <Plus size={26} className="sm:w-[30px] sm:h-[30px] text-white drop-shadow-md" strokeWidth={2.5} />
          </button>
        </div>

        {bottomNavItems.slice(2, 4).map((item) => {
          const active = isActive(item.suffix);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.suffix)}
              className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
                active
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
              }`}
              aria-label={item.label}
              type="button"
            >
              <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={active ? 2.5 : 2} />
            </button>
          );
        })}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl transition-all duration-200 ${
            isMobileMenuOpen
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'bg-white text-gray-500 border border-gray-100 shadow-sm hover:bg-gray-50 hover:border-gray-200'
          }`}
          aria-label="תפריט"
          type="button"
        >
          <AppWindow size={18} className="sm:w-5 sm:h-5" strokeWidth={2} />
        </button>
      </nav>

      <ToastContainer />
      <CommandPalette />
      <NotificationCenter />
      <AddClientModal />
      <InviteClientModal />
      <PaymentLinkModal />
      <TaskModal />
      <CampaignWizard />
      <ReportModal />
      <HelpModal />
      <OnboardingTour isOpen={isTourActive} onClose={() => setIsTourActive(false)} />
    </>
  );
}

export default function SocialShellClient({
  children,
  initialSocialData,
  initialNavigationMenu,
}: {
  children: React.ReactNode;
  initialSocialData?: SocialInitialData;
  initialNavigationMenu?: SocialNavigationItem[];
}) {
  const { shabbatTimes } = useShabbat();

  const pathname = usePathname();
  const basePath = getSocialBasePath(pathname);

  if (shabbatTimes?.isShabbat) {
    return <ShabbatScreen />;
  }

  return (
    <AppProvider initialSocialData={initialSocialData}>
      <AuthProvider>
        <ToastProvider>
          <BrandProvider>
            <SocialShellContent basePath={basePath}>
              {children}
            </SocialShellContent>
          </BrandProvider>
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  );
}
