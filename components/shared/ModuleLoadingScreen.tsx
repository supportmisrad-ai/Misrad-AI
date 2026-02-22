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

function getColors(moduleKey?: string) {
  return MODULE_COLORS[moduleKey || 'default'] || MODULE_COLORS.default;
}

const shimmerStyle = `@keyframes shimmer { 100% { transform: translateX(100%); } }`;

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

/* ─── Full-screen loading (sidebar+header+content) — used only on initial module entry ─── */
export function ModuleLoadingScreen({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);

  return (
    <div className="min-h-screen flex" dir="rtl" style={{ backgroundColor: c.bg }}>
      <style>{shimmerStyle}</style>
      <div className="hidden md:flex flex-col w-[72px] border-l border-slate-200/60 py-4 items-center gap-3"
           style={{ backgroundColor: c.sidebar }}>
        <ShimmerBlock className="rounded-[14px]" style={{ width: 44, height: 44, backgroundColor: c.accentLight }} />
        <div className="w-8 border-b border-slate-200/60 my-1" />
        {[1, 2, 3, 4, 5].map(i => (
          <ShimmerBlock key={i} className="rounded-xl" style={{ width: 38, height: 38, backgroundColor: i === 1 ? c.accentLight : '#E2E8F0' }} />
        ))}
      </div>
      <div className="flex-1 flex flex-col min-h-screen">
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
        <div className="flex-1 p-4 md:p-6">
          <DashboardContentSkeleton moduleKey={moduleKey} />
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
      <style>{shimmerStyle}</style>
      <div className="flex flex-col items-center gap-5">
        <ShimmerBlock className="rounded-[18px]" style={{ width: 64, height: 64, backgroundColor: '#E2E8F0' }} />
        <ShimmerBlock className="rounded-full" style={{ width: 120, height: 12, backgroundColor: '#E2E8F0' }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Content-area-only skeletons — NO sidebar / header
   These render inside the persistent shell's {children} slot.
   ═══════════════════════════════════════════════════════════════ */

export function DashboardContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-lg" style={{ width: 48, height: 24, backgroundColor: i === 1 ? c.accentLight : '#F1F5F9' }} />
            <ShimmerBlock className="rounded-full" style={{ width: 56, height: 8, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 16, backgroundColor: c.accentLight }} />
          <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 160, backgroundColor: '#F1F5F9' }} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 16, backgroundColor: c.accentLight }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <ShimmerBlock className="rounded-full shrink-0" style={{ width: 32, height: 32, backgroundColor: '#F1F5F9' }} />
              <div className="flex-1 space-y-1.5">
                <ShimmerBlock className="rounded-md" style={{ width: `${55 + (i % 3) * 15}%`, height: 11, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-md" style={{ width: `${30 + (i % 2) * 20}%`, height: 9, backgroundColor: '#F8FAFC' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100">
          <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 16, backgroundColor: c.accentLight }} />
          <div className="flex-1" />
          <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 28, backgroundColor: '#F1F5F9' }} />
        </div>
        {[1, 2, 3].map(i => (
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
  );
}

export function ListContentSkeleton({ moduleKey, rows = 8 }: { moduleKey?: string; rows?: number }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between gap-3">
        <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 28, backgroundColor: c.accentLight }} />
        <div className="flex items-center gap-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 100, height: 36, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 110, height: 36, backgroundColor: c.accentLight }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ShimmerBlock className="rounded-xl" style={{ width: 200, height: 36, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 80, height: 36, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 80, height: 36, backgroundColor: '#F1F5F9' }} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          {[100, 140, 100, 80, 60].map((w, i) => (
            <ShimmerBlock key={i} className="rounded-md" style={{ width: w, height: 12, backgroundColor: '#E2E8F0' }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0">
            <ShimmerBlock className="rounded-xl shrink-0" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
            <div className="flex-1 space-y-2">
              <ShimmerBlock className="rounded-md" style={{ width: `${50 + (i % 4) * 12}%`, height: 12, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-md" style={{ width: `${25 + (i % 3) * 15}%`, height: 10, backgroundColor: '#F8FAFC' }} />
            </div>
            <ShimmerBlock className="rounded-full shrink-0" style={{ width: 64, height: 24, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md shrink-0 hidden md:block" style={{ width: 80, height: 12, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanContentSkeleton({ moduleKey, columns = 5 }: { moduleKey?: string; columns?: number }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between gap-3">
        <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 28, backgroundColor: c.accentLight }} />
        <div className="flex items-center gap-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 100, height: 36, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: columns }).map((_, col) => (
          <div key={col} className="flex-shrink-0 w-[260px] md:w-[280px] space-y-3">
            <div className="flex items-center justify-between px-2">
              <ShimmerBlock className="rounded-lg" style={{ width: 80 + (col % 3) * 20, height: 16, backgroundColor: c.accentLight }} />
              <ShimmerBlock className="rounded-full" style={{ width: 24, height: 24, backgroundColor: '#F1F5F9' }} />
            </div>
            {Array.from({ length: 3 - (col % 2) }).map((_, card) => (
              <div key={card} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <ShimmerBlock className="rounded-md" style={{ width: `${70 + (card % 2) * 20}%`, height: 13, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-md" style={{ width: `${40 + (card % 3) * 15}%`, height: 10, backgroundColor: '#F8FAFC' }} />
                <div className="flex items-center justify-between pt-1">
                  <ShimmerBlock className="rounded-full" style={{ width: 56, height: 20, backgroundColor: '#F1F5F9' }} />
                  <ShimmerBlock className="rounded-full" style={{ width: 24, height: 24, backgroundColor: '#F1F5F9' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 24, backgroundColor: c.accentLight }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
        </div>
        <div className="flex items-center gap-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 80, height: 32, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 80, height: 32, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 80, height: 32, backgroundColor: '#F1F5F9' }} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d) => (
            <div key={d} className="text-center py-3 text-xs font-bold text-slate-400 border-l border-slate-50 last:border-0">{d}</div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-slate-50 last:border-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="min-h-[80px] md:min-h-[100px] p-2 border-l border-slate-50 last:border-0 space-y-1">
                <ShimmerBlock className="rounded-md" style={{ width: 20, height: 16, backgroundColor: '#F1F5F9' }} />
                {(week * 7 + day) % 4 === 0 && (
                  <ShimmerBlock className="rounded-md" style={{ width: '90%', height: 18, backgroundColor: c.accentLight }} />
                )}
                {(week * 7 + day) % 5 === 1 && (
                  <ShimmerBlock className="rounded-md" style={{ width: '75%', height: 18, backgroundColor: '#F1F5F9' }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center gap-4">
        <ShimmerBlock className="rounded-full" style={{ width: 72, height: 72, backgroundColor: '#F1F5F9' }} />
        <div className="space-y-2">
          <ShimmerBlock className="rounded-lg" style={{ width: 160, height: 20, backgroundColor: c.accentLight }} />
          <ShimmerBlock className="rounded-md" style={{ width: 100, height: 14, backgroundColor: '#F1F5F9' }} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 18, backgroundColor: c.accentLight }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 40, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2">
              <ShimmerBlock className="rounded-md" style={{ width: 70, height: 12, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 40, backgroundColor: '#F8FAFC' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 18, backgroundColor: c.accentLight }} />
        {[1, 2].map(i => (
          <div key={i} className="space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: 90, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 40, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 28, backgroundColor: c.accentLight }} />
      <div className="flex gap-3 border-b border-slate-100 pb-1">
        {[80, 100, 70, 90].map((w, i) => (
          <ShimmerBlock key={i} className="rounded-t-lg" style={{ width: w, height: 32, backgroundColor: i === 0 ? c.accentLight : '#F1F5F9' }} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 16, backgroundColor: c.accentLight }} />
          <div className="flex items-center justify-between py-3 border-b border-slate-50">
            <div className="space-y-1.5">
              <ShimmerBlock className="rounded-md" style={{ width: 130, height: 13, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-md" style={{ width: 200, height: 10, backgroundColor: '#F8FAFC' }} />
            </div>
            <ShimmerBlock className="rounded-full" style={{ width: 44, height: 24, backgroundColor: '#F1F5F9' }} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="space-y-1.5">
              <ShimmerBlock className="rounded-md" style={{ width: 110, height: 13, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-md" style={{ width: 180, height: 10, backgroundColor: '#F8FAFC' }} />
            </div>
            <ShimmerBlock className="rounded-full" style={{ width: 44, height: 24, backgroundColor: '#F1F5F9' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between">
        <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 28, backgroundColor: c.accentLight }} />
        <div className="flex gap-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 100, height: 32, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 100, height: 32, backgroundColor: '#F1F5F9' }} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-lg" style={{ width: 48, height: 24, backgroundColor: i === 1 ? c.accentLight : '#F1F5F9' }} />
            <ShimmerBlock className="rounded-full" style={{ width: 56, height: 8, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 16, backgroundColor: c.accentLight }} />
            <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 200, backgroundColor: '#F1F5F9' }} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 16, backgroundColor: c.accentLight }} />
        <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 260, backgroundColor: '#F1F5F9' }} />
      </div>
    </div>
  );
}

export function InboxContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="flex h-[calc(100vh-10rem)] rounded-2xl border border-slate-100 overflow-hidden bg-white animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="w-80 border-l border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 36, backgroundColor: '#F1F5F9' }} />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 ${i === 0 ? 'bg-slate-50' : ''}`}>
              <ShimmerBlock className="rounded-full shrink-0" style={{ width: 40, height: 40, backgroundColor: i === 0 ? c.accentLight : '#F1F5F9' }} />
              <div className="flex-1 space-y-1.5 min-w-0">
                <ShimmerBlock className="rounded-md" style={{ width: `${60 + (i % 3) * 15}%`, height: 12, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-md" style={{ width: `${40 + (i % 2) * 20}%`, height: 10, backgroundColor: '#F8FAFC' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <ShimmerBlock className="rounded-full" style={{ width: 40, height: 40, backgroundColor: '#F1F5F9' }} />
          <div className="space-y-1.5">
            <ShimmerBlock className="rounded-md" style={{ width: 120, height: 14, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: 80, height: 10, backgroundColor: '#F8FAFC' }} />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <ShimmerBlock className="rounded-2xl" style={{ width: `${40 + (i % 3) * 10}%`, height: 48, backgroundColor: i % 2 === 0 ? '#F1F5F9' : c.accentLight }} />
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100">
          <ShimmerBlock className="rounded-2xl" style={{ width: '100%', height: 44, backgroundColor: '#F8FAFC' }} />
        </div>
      </div>
    </div>
  );
}

export function DetailContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center gap-3">
        <ShimmerBlock className="rounded-xl" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-lg" style={{ width: 200, height: 24, backgroundColor: c.accentLight }} />
        <div className="flex-1" />
        <ShimmerBlock className="rounded-xl" style={{ width: 100, height: 36, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 100, height: 36, backgroundColor: c.accentLight }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <ShimmerBlock className="rounded-md" style={{ width: 80, height: 12, backgroundColor: '#E2E8F0' }} />
              <ShimmerBlock className="rounded-md" style={{ width: `${40 + (i % 3) * 20}%`, height: 12, backgroundColor: '#F1F5F9' }} />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 16, backgroundColor: c.accentLight }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2 py-2">
              <ShimmerBlock className="rounded-full" style={{ width: 28, height: 28, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-md" style={{ width: `${50 + i * 10}%`, height: 12, backgroundColor: '#F1F5F9' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationsContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-4 max-w-2xl animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 28, backgroundColor: c.accentLight }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${i < 2 ? 'bg-white border-slate-100' : 'bg-slate-50/50 border-slate-50'}`}>
          <ShimmerBlock className="rounded-full shrink-0" style={{ width: 36, height: 36, backgroundColor: i < 2 ? c.accentLight : '#F1F5F9' }} />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: `${55 + (i % 3) * 15}%`, height: 13, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: `${35 + (i % 2) * 20}%`, height: 10, backgroundColor: '#F8FAFC' }} />
          </div>
          <ShimmerBlock className="rounded-md shrink-0" style={{ width: 50, height: 10, backgroundColor: '#F8FAFC' }} />
        </div>
      ))}
    </div>
  );
}

export function TasksContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between gap-3">
        <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 28, backgroundColor: c.accentLight }} />
        <div className="flex items-center gap-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 120, height: 36, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 110, height: 36, backgroundColor: c.accentLight }} />
        </div>
      </div>
      <div className="flex gap-2">
        {['הכל', 'ממתין', 'בביצוע', 'הושלם'].map((t, i) => (
          <ShimmerBlock key={t} className="rounded-full" style={{ width: 70, height: 32, backgroundColor: i === 0 ? c.accentLight : '#F1F5F9' }} />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
            <ShimmerBlock className="rounded-lg shrink-0" style={{ width: 20, height: 20, backgroundColor: '#F1F5F9' }} />
            <div className="flex-1 space-y-2">
              <ShimmerBlock className="rounded-md" style={{ width: `${50 + (i % 3) * 15}%`, height: 13, backgroundColor: '#F1F5F9' }} />
              <div className="flex items-center gap-2">
                <ShimmerBlock className="rounded-full" style={{ width: 60, height: 18, backgroundColor: '#F8FAFC' }} />
                <ShimmerBlock className="rounded-full" style={{ width: 70, height: 18, backgroundColor: '#F8FAFC' }} />
              </div>
            </div>
            <ShimmerBlock className="rounded-full shrink-0" style={{ width: 28, height: 28, backgroundColor: '#F1F5F9' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InvoicesContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between gap-3">
        <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 28, backgroundColor: c.accentLight }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 130, height: 36, backgroundColor: c.accentLight }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: 60, height: 22, backgroundColor: i === 1 ? c.accentLight : '#F1F5F9' }} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          {[60, 120, 80, 100, 80, 80].map((w, i) => (
            <ShimmerBlock key={i} className="rounded-md" style={{ width: w, height: 12, backgroundColor: '#E2E8F0' }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0">
            <ShimmerBlock className="rounded-md shrink-0" style={{ width: 50, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: `${50 + (i % 3) * 15}%`, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md shrink-0" style={{ width: 70, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-full shrink-0" style={{ width: 64, height: 22, backgroundColor: i < 2 ? c.accentLight : '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md shrink-0" style={{ width: 70, height: 12, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DialerContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <ShimmerBlock className="rounded-full" style={{ width: 96, height: 96, backgroundColor: c.accentLight }} />
      <ShimmerBlock className="rounded-lg" style={{ width: 180, height: 20, backgroundColor: '#F1F5F9' }} />
      <ShimmerBlock className="rounded-xl" style={{ width: 280, height: 48, backgroundColor: '#F1F5F9' }} />
      <div className="grid grid-cols-3 gap-4 pt-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <ShimmerBlock key={i} className="rounded-2xl" style={{ width: 64, height: 64, backgroundColor: '#F1F5F9' }} />
        ))}
      </div>
      <div className="flex gap-4 pt-4">
        <ShimmerBlock className="rounded-full" style={{ width: 56, height: 56, backgroundColor: c.accentLight }} />
        <ShimmerBlock className="rounded-full" style={{ width: 56, height: 56, backgroundColor: '#FEE2E2' }} />
      </div>
    </div>
  );
}

export function HubContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 28, backgroundColor: c.accentLight }} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 flex flex-col items-center">
            <ShimmerBlock className="rounded-2xl" style={{ width: 48, height: 48, backgroundColor: i < 2 ? c.accentLight : '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: 80, height: 14, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: 100, height: 10, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewFormContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 max-w-3xl animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center gap-3">
        <ShimmerBlock className="rounded-xl" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-lg" style={{ width: 160, height: 24, backgroundColor: c.accentLight }} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: 90, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 42, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2">
              <ShimmerBlock className="rounded-md" style={{ width: 70, height: 12, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 42, backgroundColor: '#F8FAFC' }} />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <ShimmerBlock className="rounded-md" style={{ width: 60, height: 12, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 100, backgroundColor: '#F8FAFC' }} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <ShimmerBlock className="rounded-xl" style={{ width: 80, height: 40, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: 120, height: 40, backgroundColor: c.accentLight }} />
        </div>
      </div>
    </div>
  );
}

export function ContentMachineContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between">
        <ShimmerBlock className="rounded-lg" style={{ width: 140, height: 28, backgroundColor: c.accentLight }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 120, height: 36, backgroundColor: c.accentLight }} />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {['הכל', 'טיוטה', 'מתוזמן', 'פורסם'].map((t, i) => (
          <ShimmerBlock key={t} className="rounded-full" style={{ width: 75, height: 32, backgroundColor: i === 0 ? c.accentLight : '#F1F5F9' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <ShimmerBlock style={{ width: '100%', height: 160, backgroundColor: '#F1F5F9' }} />
            <div className="p-4 space-y-3">
              <ShimmerBlock className="rounded-md" style={{ width: `${60 + (i % 3) * 15}%`, height: 14, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-md" style={{ width: `${40 + (i % 2) * 20}%`, height: 10, backgroundColor: '#F8FAFC' }} />
              <div className="flex items-center justify-between pt-1">
                <ShimmerBlock className="rounded-full" style={{ width: 60, height: 20, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-md" style={{ width: 70, height: 10, backgroundColor: '#F8FAFC' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between">
        <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 28, backgroundColor: c.accentLight }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 130, height: 36, backgroundColor: c.accentLight }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
            <ShimmerBlock className="rounded-full shrink-0" style={{ width: 48, height: 48, backgroundColor: i < 2 ? c.accentLight : '#F1F5F9' }} />
            <div className="flex-1 space-y-2">
              <ShimmerBlock className="rounded-md" style={{ width: `${60 + (i % 3) * 15}%`, height: 14, backgroundColor: '#F1F5F9' }} />
              <ShimmerBlock className="rounded-md" style={{ width: `${30 + (i % 2) * 20}%`, height: 10, backgroundColor: '#F8FAFC' }} />
            </div>
            <ShimmerBlock className="rounded-full shrink-0" style={{ width: 60, height: 24, backgroundColor: '#F1F5F9' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkflowsContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <style>{shimmerStyle}</style>
      <div className="flex items-center justify-between">
        <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 28, backgroundColor: c.accentLight }} />
        <ShimmerBlock className="rounded-xl" style={{ width: 140, height: 36, backgroundColor: c.accentLight }} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
          <ShimmerBlock className="rounded-xl shrink-0" style={{ width: 44, height: 44, backgroundColor: i === 0 ? c.accentLight : '#F1F5F9' }} />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: `${45 + (i % 3) * 15}%`, height: 14, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: `${30 + (i % 2) * 20}%`, height: 10, backgroundColor: '#F8FAFC' }} />
          </div>
          <ShimmerBlock className="rounded-full shrink-0" style={{ width: 70, height: 28, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-xl shrink-0" style={{ width: 44, height: 24, backgroundColor: '#F1F5F9' }} />
        </div>
      ))}
    </div>
  );
}
