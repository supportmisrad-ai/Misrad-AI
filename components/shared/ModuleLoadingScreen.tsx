'use client';

import React from 'react';

const MODULE_THEMES: Record<string, { gradient: string; shadow: string; label: string }> = {
  nexus: { gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/30', label: 'ניהול, משימות וצוות' },
  system: { gradient: 'from-[#A21D3C] to-[#881337]', shadow: 'shadow-rose-500/30', label: 'מכירות' },
  social: { gradient: 'from-indigo-600 via-purple-600 to-pink-600', shadow: 'shadow-purple-500/30', label: 'שיווק' },
  finance: { gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30', label: 'כספים' },
  client: { gradient: 'from-[#EAD7A1] via-[#C5A572] to-[#B45309]', shadow: 'shadow-amber-500/30', label: 'מעקב לקוחות' },
  operations: { gradient: 'from-sky-500 to-cyan-600', shadow: 'shadow-sky-500/30', label: 'תפעול' },
  support: { gradient: 'from-violet-500 to-fuchsia-600', shadow: 'shadow-violet-500/30', label: 'תמיכה' },
  admin: { gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30', label: 'ניהול מערכת' },
  default: { gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30', label: 'MISRAD AI' },
};

export function ModuleLoadingScreen({ moduleKey }: { moduleKey?: string }) {
  const theme = MODULE_THEMES[moduleKey || 'default'] || MODULE_THEMES.default;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br ${theme.gradient} rounded-full blur-[180px] opacity-20 animate-pulse`} />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-white/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className={`w-20 h-20 rounded-[22px] bg-gradient-to-br ${theme.gradient} flex items-center justify-center mb-8 ${theme.shadow} shadow-2xl`}>
          <div className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
        </div>

        <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden mb-6">
          <div className={`h-full bg-gradient-to-r ${theme.gradient} rounded-full animate-loading-bar`} />
        </div>

        <p className="text-sm font-semibold text-white/70">{theme.label}</p>
        <p className="mt-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] animate-pulse">טוען...</p>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 w-24 bg-slate-100 rounded-lg mb-3" />
              <div className="h-8 w-16 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
          <div className="h-5 w-32 bg-slate-100 rounded-lg mb-4" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
              <div className="h-10 w-10 bg-slate-100 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-slate-100 rounded-lg mb-2" />
                <div className="h-3 w-1/2 bg-slate-50 rounded-lg" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MinimalLoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">טוען...</p>
      </div>
    </div>
  );
}
