import React from 'react';

const MODULE_COLORS: Record<string, { bg: string; accent: string; accentLight: string; sidebar: string }> = {
  nexus:      { bg: '#F8FAFC', accent: '#3730A3', accentLight: '#E0E7FF', sidebar: '#EEF2FF' },
  system:     { bg: '#F8FAFC', accent: '#A21D3C', accentLight: '#FFE4E6', sidebar: '#FFF1F2' },
  social:     { bg: '#F8FAFC', accent: '#7C3AED', accentLight: '#EDE9FE', sidebar: '#F5F3FF' },
  finance:    { bg: '#F8FAFC', accent: '#059669', accentLight: '#D1FAE5', sidebar: '#ECFDF5' },
  client:     { bg: '#F5F5F7', accent: '#B45309', accentLight: '#FEF3C7', sidebar: '#FFFBEB' },
  operations: { bg: '#F8FAFC', accent: '#0EA5E9', accentLight: '#E0F2FE', sidebar: '#F0F9FF' },
  support:    { bg: '#F8FAFC', accent: '#7C3AED', accentLight: '#EDE9FE', sidebar: '#F5F3FF' },
  admin:      { bg: '#F8FAFC', accent: '#475569', accentLight: '#E2E8F0', sidebar: '#F1F5F9' },
  default:    { bg: '#F8FAFC', accent: '#475569', accentLight: '#E2E8F0', sidebar: '#F1F5F9' },
};

function ShimmerBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden ${className || ''}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
    </div>
  );
}

export function ModuleLoadingScreen({ moduleKey }: { moduleKey?: string }) {
  const c = MODULE_COLORS[moduleKey || 'default'] || MODULE_COLORS.default;

  return (
    <div className="min-h-screen flex" dir="rtl" style={{ backgroundColor: c.bg }}>
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Sidebar skeleton — hidden on mobile */}
      <div className="hidden md:flex flex-col w-[72px] border-l border-slate-200/60 py-4 items-center gap-3"
           style={{ backgroundColor: c.sidebar }}>
        <ShimmerBlock className="rounded-[14px]" style={{ width: 44, height: 44, backgroundColor: c.accentLight }} />
        <div className="w-8 border-b border-slate-200/60 my-1" />
        {[1, 2, 3, 4, 5].map(i => (
          <ShimmerBlock key={i} className="rounded-xl" style={{ width: 38, height: 38, backgroundColor: i === 1 ? c.accentLight : '#E2E8F0' }} />
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar skeleton */}
        <div className="h-14 border-b border-slate-200/60 flex items-center justify-between px-4 md:px-6 bg-white/60">
          <div className="flex items-center gap-3">
            <ShimmerBlock className="rounded-lg md:hidden" style={{ width: 36, height: 36, backgroundColor: c.accentLight }} />
            <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 24, backgroundColor: c.accentLight }} />
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBlock className="rounded-full" style={{ width: 32, height: 32, backgroundColor: '#E2E8F0' }} />
            <ShimmerBlock className="rounded-full" style={{ width: 32, height: 32, backgroundColor: '#E2E8F0' }} />
          </div>
        </div>

        {/* Page content skeleton */}
        <div className="flex-1 p-4 md:p-6 space-y-5">
          {/* Page title */}
          <div className="flex items-center gap-3">
            <ShimmerBlock className="rounded-lg" style={{ width: 160, height: 28, backgroundColor: c.accentLight }} />
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-lg" style={{ width: 48, height: 24, backgroundColor: i === 1 ? c.accentLight : '#F1F5F9' }} />
                <ShimmerBlock className="rounded-full" style={{ width: 56, height: 8, backgroundColor: '#F8FAFC' }} />
              </div>
            ))}
          </div>

          {/* Content area — list/table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100">
              <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 16, backgroundColor: c.accentLight }} />
              <div className="flex-1" />
              <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 28, backgroundColor: '#F1F5F9' }} />
            </div>
            {/* Table rows */}
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0">
                <ShimmerBlock className="rounded-xl shrink-0" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
                <div className="flex-1 space-y-2">
                  <ShimmerBlock className="rounded-md" style={{ width: `${60 + (i % 3) * 15}%`, height: 12, backgroundColor: '#F1F5F9' }} />
                  <ShimmerBlock className="rounded-md" style={{ width: `${30 + (i % 2) * 20}%`, height: 10, backgroundColor: '#F8FAFC' }} />
                </div>
                <ShimmerBlock className="rounded-full shrink-0" style={{ width: 56, height: 22, backgroundColor: '#F1F5F9' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return <ModuleLoadingScreen moduleKey="admin" />;
}

export function MinimalLoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" dir="rtl">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
      <div className="flex flex-col items-center gap-5">
        <ShimmerBlock className="rounded-[18px]" style={{ width: 64, height: 64, backgroundColor: '#E2E8F0' }} />
        <ShimmerBlock className="rounded-full" style={{ width: 120, height: 12, backgroundColor: '#E2E8F0' }} />
      </div>
    </div>
  );
}
