import React from 'react';

/**
 * Full-shell skeleton for the System module layout Suspense fallback.
 * Shows sidebar + header + content skeleton immediately instead of
 * a blank screen with dots — eliminates the jarring transition.
 */

const shimmerStyle = `@keyframes shimmer { 100% { transform: translateX(100%); } }`;

function ShimmerBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative overflow-hidden ${className || ''}`} style={style}>
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
      />
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-l border-slate-100 bg-white/80 backdrop-blur-xl h-full">
      {/* Brand area */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <ShimmerBlock className="rounded-2xl shrink-0" style={{ width: 40, height: 40, backgroundColor: '#FFE4E6' }} />
        <div className="flex-1 space-y-1.5">
          <ShimmerBlock className="rounded-md" style={{ width: 100, height: 14, backgroundColor: '#F1F5F9' }} />
          <ShimmerBlock className="rounded-md" style={{ width: 60, height: 10, backgroundColor: '#F8FAFC' }} />
        </div>
      </div>

      {/* Switchers placeholder */}
      <div className="px-4 py-3 space-y-2">
        <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 36, backgroundColor: '#F8FAFC' }} />
        <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 36, backgroundColor: '#F8FAFC' }} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-hidden">
        {[
          { w: 80, active: true },
          { w: 60, active: false },
          { w: 90, active: false },
          { w: 70, active: false },
          { w: 55, active: false },
          { w: 85, active: false },
          { w: 65, active: false },
          { w: 75, active: false },
        ].map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${item.active ? 'bg-gradient-to-l from-[#A21D3C] to-[#3730A3]' : ''}`}
          >
            <ShimmerBlock
              className="rounded-lg shrink-0"
              style={{
                width: 20,
                height: 20,
                backgroundColor: item.active ? 'rgba(255,255,255,0.3)' : '#F1F5F9',
              }}
            />
            <ShimmerBlock
              className="rounded-md"
              style={{
                width: item.w,
                height: 12,
                backgroundColor: item.active ? 'rgba(255,255,255,0.3)' : '#F1F5F9',
              }}
            />
          </div>
        ))}

        {/* Section separator */}
        <div className="h-px bg-slate-100 my-2" />

        {[50, 70, 60].map((w, i) => (
          <div key={`sec-${i}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <ShimmerBlock className="rounded-lg shrink-0" style={{ width: 20, height: 20, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: w, height: 12, backgroundColor: '#F1F5F9' }} />
          </div>
        ))}
      </nav>

      {/* Bottom area */}
      <div className="px-4 py-4 border-t border-slate-100 space-y-3">
        <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 40, backgroundColor: '#F8FAFC' }} />
        <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 36, backgroundColor: '#FFE4E6' }} />
      </div>
    </aside>
  );
}

function HeaderSkeleton() {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 border-b border-slate-100/50 bg-transparent">
      {/* Right side: title */}
      <div className="flex items-center gap-3">
        <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 20, backgroundColor: '#FFE4E6' }} />
        <div className="w-px h-5 bg-slate-200 hidden md:block" />
        <ShimmerBlock className="rounded-md hidden md:block" style={{ width: 60, height: 14, backgroundColor: '#F1F5F9' }} />
      </div>

      {/* Left side: actions */}
      <div className="flex items-center gap-3">
        <ShimmerBlock className="rounded-xl hidden md:block" style={{ width: 100, height: 32, backgroundColor: '#F8FAFC' }} />
        <ShimmerBlock className="rounded-full" style={{ width: 32, height: 32, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-full" style={{ width: 32, height: 32, backgroundColor: '#F1F5F9' }} />
        <ShimmerBlock className="rounded-full" style={{ width: 36, height: 36, backgroundColor: '#FFE4E6' }} />
      </div>
    </header>
  );
}

function ContentSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 min-h-0 space-y-5 animate-in fade-in duration-200">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
            <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-lg" style={{ width: 48, height: 24, backgroundColor: i === 1 ? '#FFE4E6' : '#F1F5F9' }} />
            <ShimmerBlock className="rounded-full" style={{ width: 56, height: 8, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <ShimmerBlock className="rounded-lg" style={{ width: 120, height: 16, backgroundColor: '#FFE4E6' }} />
          <ShimmerBlock className="rounded-xl" style={{ width: '100%', height: 160, backgroundColor: '#F1F5F9' }} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 16, backgroundColor: '#FFE4E6' }} />
          {[1, 2, 3, 4].map((i) => (
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

      {/* Table section */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100">
          <ShimmerBlock className="rounded-lg" style={{ width: 100, height: 16, backgroundColor: '#FFE4E6' }} />
          <div className="flex-1" />
          <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 28, backgroundColor: '#F1F5F9' }} />
        </div>
        {[1, 2, 3].map((i) => (
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

function MobileBottomNavSkeleton() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-2">
        {[1, 2].map((i) => (
          <div key={`r-${i}`} className="flex flex-col items-center gap-1">
            <ShimmerBlock className="rounded-lg" style={{ width: 24, height: 24, backgroundColor: i === 1 ? '#FFE4E6' : '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: 32, height: 8, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#A21D3C] to-[#3730A3] opacity-30" />
        {[3, 4].map((i) => (
          <div key={`l-${i}`} className="flex flex-col items-center gap-1">
            <ShimmerBlock className="rounded-lg" style={{ width: 24, height: 24, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: 32, height: 8, backgroundColor: '#F8FAFC' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SystemShellSkeleton() {
  return (
    <div className="flex h-screen w-full bg-[var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
      <style>{shimmerStyle}</style>
      <SidebarSkeleton />
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative z-10">
        <HeaderSkeleton />
        <ContentSkeleton />
      </main>
      <MobileBottomNavSkeleton />
    </div>
  );
}
