'use client';

import React from 'react';

interface UnifiedLoadingShellProps {
  moduleKey?: string;
  stage?: 'initial' | 'shell' | 'content';
}

const MODULE_COLORS: Record<string, { bg: string; accent: string; accentLight: string; text: string }> = {
  nexus:      { bg: '#F8FAFC', accent: '#3730A3', accentLight: '#E0E7FF', text: '#1e293b' },
  system:     { bg: '#F8FAFC', accent: '#A21D3C', accentLight: '#FFE4E6', text: '#1e293b' },
  social:     { bg: '#F8FAFC', accent: '#7C3AED', accentLight: '#EDE9FE', text: '#1e293b' },
  finance:    { bg: '#F8FAFC', accent: '#059669', accentLight: '#D1FAE5', text: '#1e293b' },
  client:     { bg: '#F5F5F7', accent: '#B45309', accentLight: '#FEF3C7', text: '#1e293b' },
  operations: { bg: '#F8FAFC', accent: '#0EA5E9', accentLight: '#E0F2FE', text: '#1e293b' },
  default:    { bg: '#F8FAFC', accent: '#475569', accentLight: '#E2E8F0', text: '#1e293b' },
};

function getColors(moduleKey?: string) {
  return MODULE_COLORS[moduleKey || 'default'] || MODULE_COLORS.default;
}

// shimmer animation
const shimmerStyle = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .shimmer {
    animation: shimmer 1.5s infinite;
  }
  .pulse-slow {
    animation: pulse 2s ease-in-out infinite;
  }
`;

// Shimmer block component
function ShimmerBlock({ 
  className = '', 
  style = {} 
}: { 
  className?: string; 
  style?: React.CSSProperties 
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <div 
        className="absolute inset-0 shimmer"
        style={{ 
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
        }} 
      />
    </div>
  );
}

// Stage 1: Immediate minimal shell (appears instantly)
function InitialShell({ c }: { c: ReturnType<typeof getColors> }) {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: c.bg }}
    >
      <style>{shimmerStyle}</style>
      {/* Pulsing dot indicator */}
      <div className="flex flex-col items-center gap-4">
        <div 
          className="w-3 h-3 rounded-full pulse-slow"
          style={{ backgroundColor: c.accent }}
        />
      </div>
    </div>
  );
}

// Stage 2: Shell with sidebar structure (appears quickly)
function ShellStructure({ c, moduleKey }: { c: ReturnType<typeof getColors>; moduleKey?: string }) {
  return (
    <div 
      className="flex h-screen w-full overflow-hidden"
      style={{ backgroundColor: c.bg }}
      dir="rtl"
    >
      <style>{shimmerStyle}</style>
      
      {/* Sidebar skeleton - desktop */}
      <div 
        className="hidden md:flex flex-col w-[260px] shrink-0 border-l p-4 gap-4"
        style={{ 
          backgroundColor: c.bg,
          borderColor: `${c.accent}20`,
        }}
      >
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <ShimmerBlock 
            className="rounded-xl shrink-0" 
            style={{ width: 40, height: 40, backgroundColor: c.accentLight }} 
          />
          <div className="flex-1 space-y-2">
            <ShimmerBlock 
              className="rounded-md" 
              style={{ width: '60%', height: 12, backgroundColor: c.accentLight }} 
            />
          </div>
        </div>
        
        {/* Nav items */}
        <div className="flex-1 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: i === 1 ? c.accentLight : 'transparent' }}
            >
              <ShimmerBlock 
                className="rounded-lg shrink-0" 
                style={{ width: 20, height: 20, backgroundColor: i === 1 ? `${c.accent}30` : '#E2E8F0' }} 
              />
              <ShimmerBlock 
                className="rounded-md" 
                style={{ width: `${50 + i * 10}%`, height: 10, backgroundColor: i === 1 ? `${c.accent}20` : '#E2E8F0' }} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0"
          style={{ height: 64, borderBottom: `1px solid ${c.accent}15` }}
        >
          <div className="flex items-center gap-3">
            <ShimmerBlock 
              className="rounded-xl md:hidden shrink-0" 
              style={{ width: 32, height: 32, backgroundColor: c.accentLight }} 
            />
            <ShimmerBlock 
              className="rounded-md" 
              style={{ width: 100, height: 12, backgroundColor: c.accentLight }} 
            />
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBlock 
              className="rounded-full" 
              style={{ width: 36, height: 36, backgroundColor: '#E2E8F0' }} 
            />
          </div>
        </div>

        {/* Content area - minimal */}
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Title area */}
            <div className="mb-6">
              <ShimmerBlock 
                className="rounded-lg mb-2" 
                style={{ width: 200, height: 24, backgroundColor: c.accentLight }} 
              />
              <ShimmerBlock 
                className="rounded-md" 
                style={{ width: 300, height: 12, backgroundColor: '#E2E8F0' }} 
              />
            </div>
            
            {/* Content grid placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: 'white', border: `1px solid ${c.accent}10` }}
              >
                <ShimmerBlock className="rounded-lg" style={{ width: '60%', height: 12, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-lg" style={{ width: 40, height: 24, backgroundColor: c.accentLight }} />
              </div>
              <div 
                className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: 'white', border: `1px solid ${c.accent}10` }}
              >
                <ShimmerBlock className="rounded-lg" style={{ width: '60%', height: 12, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-lg" style={{ width: 40, height: 24, backgroundColor: '#F1F5F9' }} />
              </div>
              <div 
                className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: 'white', border: `1px solid ${c.accent}10` }}
              >
                <ShimmerBlock className="rounded-lg" style={{ width: '60%', height: 12, backgroundColor: '#F1F5F9' }} />
                <ShimmerBlock className="rounded-lg" style={{ width: 40, height: 24, backgroundColor: '#F1F5F9' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component that adapts based on loading stage
export function UnifiedLoadingShell({ moduleKey = 'default', stage = 'shell' }: UnifiedLoadingShellProps) {
  const c = getColors(moduleKey);
  
  if (stage === 'initial') {
    return <InitialShell c={c} />;
  }
  
  return <ShellStructure c={c} moduleKey={moduleKey} />;
}

// Backwards compatibility exports
export const ModuleLoadingScreen = UnifiedLoadingShell;
export const PageLoadingSkeleton = () => <UnifiedLoadingShell moduleKey="admin" stage="shell" />;
export const MinimalLoadingSpinner = () => <UnifiedLoadingShell stage="initial" />;

// Content skeletons for Suspense boundaries
export function DashboardContentSkeleton({ moduleKey }: { moduleKey?: string }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: 'white', border: `1px solid ${c.accent}10` }}
          >
            <ShimmerBlock className="rounded-lg" style={{ width: 80, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-lg" style={{ width: 48, height: 24, backgroundColor: i === 1 ? c.accentLight : '#F1F5F9' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListContentSkeleton({ moduleKey, rows = 6 }: { moduleKey?: string; rows?: number }) {
  const c = getColors(moduleKey);
  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {[1, 2].map(i => (
        <div 
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl"
          style={{ backgroundColor: 'white', border: `1px solid ${c.accent}10` }}
        >
          <ShimmerBlock className="rounded-lg shrink-0" style={{ width: 36, height: 36, backgroundColor: '#F1F5F9' }} />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="rounded-md" style={{ width: `${40 + i * 20}%`, height: 12, backgroundColor: '#F1F5F9' }} />
            <ShimmerBlock className="rounded-md" style={{ width: `${60 + i * 10}%`, height: 10, backgroundColor: '#F8FAFC' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
