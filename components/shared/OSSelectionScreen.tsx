'use client';

import React from 'react';
import { OSModuleInfo, OS_MODULES } from '../../types/os-modules';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { OS_METADATA } from '@/lib/metadata';

interface OSSelectionScreenProps {
  purchasedModules: OSModuleInfo[];
  onSelectOS: (module: OSModuleInfo) => void;
  orgSlug?: string;
}

/**
 * מסך בחירת OS - מציג את כל ה-OS שנרכשו ומאפשר למשתמש לבחור
 * עיצוב: "villa with 5 rooms" - המשתמש בוחר לאיזה חדר להיכנס
 */
export const OSSelectionScreen: React.FC<OSSelectionScreenProps> = ({
  purchasedModules,
  onSelectOS,
  orgSlug: orgSlugProp,
}) => {
  const router = useRouter();

  const resolveVillaRoute = (route: string): string => {
    if (!route.includes('[orgSlug]')) return route;
    const orgSlug = orgSlugProp ? String(orgSlugProp) : null;
    if (orgSlug && orgSlug.length > 0) {
      return route.replace('[orgSlug]', encodeURIComponent(orgSlug));
    }
    if (typeof window === 'undefined') return '/';
    const pathname = window.location.pathname || '';
    if (!pathname.startsWith('/w/')) return '/';
    const parts = pathname.split('/').filter(Boolean);
    const fallbackOrgSlug = parts[1] ? String(parts[1]) : '';
    if (!fallbackOrgSlug) return '/';
    return route.replace('[orgSlug]', encodeURIComponent(fallbackOrgSlug));
  };

  const handleSelectOS = async (module: OSModuleInfo) => {
    onSelectOS(module);

    try {
      await fetch('/api/os/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enable: [module.id] }),
      });
    } catch {
      // Ignore
    }

    // Navigate directly to OS (no login needed - user is already logged in)
    router.push(resolveVillaRoute(module.route));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" dir="rtl">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[640px] h-[640px] bg-indigo-500/15 rounded-full blur-[140px] animate-blob"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[640px] h-[640px] bg-fuchsia-500/10 rounded-full blur-[140px] animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 z-0 opacity-[0.02]"
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-2xl overflow-hidden ring-1 ring-white/10 p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              ברוכים הבאים
            </h1>
            <p className="text-slate-600 text-lg font-bold">
              בחרו את המערכת שבה תרצו להיכנס
            </p>
          </div>

          {/* OS Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {purchasedModules.map((module, index) => {
              const Icon = module.icon;
              const logoSrc = (OS_METADATA as any)?.[module.id]?.icon ?? null;
              return (
                <motion.button
                  key={module.id}
                  onClick={() => handleSelectOS(module)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    group relative p-4 md:p-5 rounded-3xl border transition-all duration-300
                    bg-white/60 backdrop-blur-2xl border-white/60
                    hover:bg-white/80 hover:border-white/80 hover:shadow-[0_18px_55px_-20px_rgba(0,0,0,0.35)]
                    text-center
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mx-auto mb-3
                      ${logoSrc ? 'bg-white/70 border border-white/70' : `bg-gradient-to-br ${module.gradient}`}
                      shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] group-hover:shadow-[0_18px_45px_-20px_rgba(0,0,0,0.75)] transition-shadow
                    `}
                  >
                    {logoSrc ? (
                      <img src={logoSrc} alt={module.name} className="w-9 h-9 md:w-10 md:h-10 object-contain" />
                    ) : (
                      <Icon size={32} className="text-white" />
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-sm md:text-base font-black text-slate-900 leading-none">
                    {module.name}
                  </h3>
                  <div className="mt-1 text-[10px] md:text-[11px] text-slate-500 font-black leading-none">
                    {module.nameHebrew}
                  </div>
                  <p className="mt-1 text-[10px] md:text-[11px] text-slate-500 font-bold transition-colors line-clamp-1">
                    {module.description}
                  </p>

                  {/* Arrow Indicator */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-white/60 border border-white/60 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 12L2 8L6 4M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700"/>
                      </svg>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/40 text-center">
            <p className="text-xs text-slate-500 font-bold">
              {purchasedModules.length} מתוך {OS_MODULES.length} מערכות פעילות
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

