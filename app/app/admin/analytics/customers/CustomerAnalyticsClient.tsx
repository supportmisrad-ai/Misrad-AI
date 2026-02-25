'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2, Users, Crown, TrendingUp, DollarSign, Activity,
  CheckCircle2, AlertTriangle, Clock, Sparkles, Info, ShieldAlert,
  BarChart3, UserPlus, Package, Layers, ChevronDown, ChevronUp,
  Search, Filter, BrainCircuit,
} from 'lucide-react';
import type {
  CustomerAnalyticsOverview, CustomerActivityEntry, AIGeneratedInsight,
  RealtimeActivity,
} from '@/app/actions/admin-analytics-ai';

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return `₪${(cents / 100).toFixed(2)}`;
}

function formatMoney(amount: number): string {
  return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('he-IL');
}

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  } catch {
    return iso;
  }
}

const PLAN_LABELS: Record<string, string> = {
  solo: 'Solo',
  the_closer: 'The Closer',
  the_authority: 'The Authority',
  the_operator: 'The Operator',
  the_empire: 'The Empire',
  the_mentor: 'The Mentor',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  trial: 'ניסיון',
  cancelled: 'מבוטל',
  suspended: 'מושהה',
  expired: 'פג תוקף',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  trial: 'bg-blue-50 text-blue-600',
  cancelled: 'bg-rose-50 text-rose-600',
  suspended: 'bg-amber-50 text-amber-600',
  expired: 'bg-slate-100 text-slate-500',
};

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({ label, value, icon, sub, color = 'slate' }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string;
  color?: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan' | 'purple';
}) {
  const colors: Record<string, string> = {
    slate: 'from-slate-50 to-slate-100 border-slate-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200',
    amber: 'from-amber-50 to-amber-100 border-amber-200',
    rose: 'from-rose-50 to-rose-100 border-rose-200',
    violet: 'from-violet-50 to-violet-100 border-violet-200',
    cyan: 'from-cyan-50 to-cyan-100 border-cyan-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
  };
  const iconColors: Record<string, string> = {
    slate: 'text-slate-600 bg-slate-200/50',
    blue: 'text-blue-600 bg-blue-200/50',
    emerald: 'text-emerald-600 bg-emerald-200/50',
    amber: 'text-amber-600 bg-amber-200/50',
    rose: 'text-rose-600 bg-rose-200/50',
    violet: 'text-violet-600 bg-violet-200/50',
    cyan: 'text-cyan-600 bg-cyan-200/50',
    purple: 'text-purple-600 bg-purple-200/50',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 flex items-start gap-4 transition-all hover:shadow-md`}>
      <div className={`p-2.5 rounded-xl ${iconColors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-slate-500 mb-1">{label}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
        {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Mini Bar Chart ───────────────────────────────────────────────

function MiniBarChart({ data, height = 120 }: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-md transition-all ${d.color || 'bg-blue-400'}`}
            style={{ height: `${Math.max((d.value / max) * 100, 2)}%`, minHeight: 2 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[9px] font-bold text-slate-400 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────

function ProgressBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Insight Card ─────────────────────────────────────────────────

function InsightCard({ insight }: { insight: AIGeneratedInsight }) {
  const config: Record<string, { bg: string; border: string; icon: React.ReactNode; iconBg: string }> = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: <Info size={16} />, iconBg: 'bg-blue-100 text-blue-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle size={16} />, iconBg: 'bg-amber-100 text-amber-600' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 size={16} />, iconBg: 'bg-emerald-100 text-emerald-600' },
    danger: { bg: 'bg-rose-50', border: 'border-rose-200', icon: <ShieldAlert size={16} />, iconBg: 'bg-rose-100 text-rose-600' },
  };
  const c = config[insight.type] || config.info;

  return (
    <div className={`${c.bg} ${c.border} border rounded-2xl p-4 flex items-start gap-3`}>
      <div className={`p-1.5 rounded-lg ${c.iconBg} shrink-0`}>{c.icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-black text-slate-900">{insight.title}</div>
        <div className="text-xs font-bold text-slate-600 mt-0.5">{insight.description}</div>
      </div>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────

type Tab = 'live' | 'overview' | 'organizations' | 'modules' | 'insights';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'live', label: 'פעילות חיה', icon: <Activity size={16} /> },
  { key: 'overview', label: 'סקירה כללית', icon: <BarChart3 size={16} /> },
  { key: 'organizations', label: 'ארגונים', icon: <Building2 size={16} /> },
  { key: 'modules', label: 'מודולים וחבילות', icon: <Package size={16} /> },
  { key: 'insights', label: 'תובנות AI', icon: <Sparkles size={16} /> },
];

// ── Main Component ───────────────────────────────────────────────

export default function CustomerAnalyticsClient({
  overview,
  activity,
  insights,
  realtime,
  error,
}: {
  overview: CustomerAnalyticsOverview | null;
  activity: CustomerActivityEntry[];
  insights: AIGeneratedInsight[];
  realtime: RealtimeActivity | null;
  error: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('live');

  if (error && !overview) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
        <div className="text-rose-600 font-black text-lg mb-2">שגיאה בטעינת נתונים</div>
        <div className="text-rose-500 font-bold text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">אנליטיקס לקוחות</h1>
              <p className="text-sm font-bold text-slate-500 mt-0.5">ניתוח מלא של ארגונים, משתמשים, מודולים ושימוש ב-AI</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-blue-100 rounded-lg text-xs font-black text-blue-700">
            90 ימים אחרונים
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && <LiveTab realtime={realtime} />}
      {activeTab === 'overview' && overview && <OverviewTab overview={overview} />}
      {activeTab === 'organizations' && <OrganizationsTab activity={activity} overview={overview} />}
      {activeTab === 'modules' && overview && <ModulesTab overview={overview} />}
      {activeTab === 'insights' && <InsightsTab insights={insights} overview={overview} />}
    </div>
  );
}

// ── Live Tab ─────────────────────────────────────────────────────

function LiveTab({ realtime }: { realtime: RealtimeActivity | null }) {
  if (!realtime) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <div className="text-slate-400 font-bold">אין נתוני פעילות חיה</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
        <span className="text-sm font-black text-emerald-600">פעילות בזמן אמת</span>
        <span className="text-xs font-bold text-slate-400">(15 דקות אחרונות)</span>
      </div>

      {/* Realtime KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-black text-emerald-600">משתמשי AI מחוברים</span>
          </div>
          <div className="text-5xl font-black text-emerald-700">{realtime.activeUsersNow}</div>
          <div className="text-[11px] font-bold text-emerald-500 mt-1">ב-{realtime.activeOrgsNow} ארגונים</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="text-xs font-black text-blue-600">ארגונים פעילים</span>
          </div>
          <div className="text-5xl font-black text-blue-700">{realtime.activeOrgsNow}</div>
          <div className="text-[11px] font-bold text-blue-500 mt-1">השתמשו ב-AI ב-15 דק׳ אחרונות</div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
            </span>
            <span className="text-xs font-black text-violet-600">מבקרי אתר</span>
          </div>
          <div className="text-5xl font-black text-violet-700">{realtime.activeSiteVisitorsNow}</div>
          <div className="text-[11px] font-bold text-violet-500 mt-1">גולשים פעילים באתר</div>
        </div>
      </div>

      {/* 24-Hour Activity Graph */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-1">פעילות 24 שעות אחרונות</h3>
        <p className="text-xs font-bold text-slate-500 mb-4">בקשות AI ומבקרי אתר לפי שעה</p>

        {realtime.hourlyActivity.length > 0 ? (
          <div className="space-y-4">
            {/* AI Requests bars */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded bg-violet-400" />
                <span className="text-xs font-black text-slate-600">בקשות AI</span>
              </div>
              <HourlyBarChart
                data={realtime.hourlyActivity.map((h) => ({
                  label: h.hour.replace(':00', ''),
                  value: h.aiRequests,
                  color: 'bg-violet-400',
                }))}
                height={140}
              />
            </div>

            {/* Site Visitors bars */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded bg-blue-400" />
                <span className="text-xs font-black text-slate-600">מבקרי אתר</span>
              </div>
              <HourlyBarChart
                data={realtime.hourlyActivity.map((h) => ({
                  label: h.hour.replace(':00', ''),
                  value: h.siteVisitors,
                  color: 'bg-blue-400',
                }))}
                height={100}
              />
            </div>

            {/* Unique Users bars */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded bg-emerald-400" />
                <span className="text-xs font-black text-slate-600">משתמשי AI ייחודיים</span>
              </div>
              <HourlyBarChart
                data={realtime.hourlyActivity.map((h) => ({
                  label: h.hour.replace(':00', ''),
                  value: h.uniqueUsers,
                  color: 'bg-emerald-400',
                }))}
                height={80}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 font-bold py-12">אין נתונים ב-24 השעות האחרונות</div>
        )}
      </div>

      {/* Recent Active Users */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-1">משתמשים פעילים עכשיו</h3>
        <p className="text-xs font-bold text-slate-500 mb-4">משתמשים שביצעו בקשת AI ב-15 דקות אחרונות</p>

        {realtime.recentActiveUsers.length > 0 ? (
          <div className="space-y-3">
            {realtime.recentActiveUsers.map((user) => (
              <div key={user.userId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                  {(user.userName || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">
                    {user.userName || user.email || user.userId.slice(0, 12)}
                  </div>
                  <div className="flex gap-3 text-[11px] font-bold text-slate-500">
                    <span>{user.orgName}</span>
                    {user.email && user.userName && <span className="truncate">{user.email}</span>}
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="relative flex h-2 w-2 mr-auto">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 font-bold py-8">אין משתמשים פעילים כרגע</div>
        )}
      </div>
    </div>
  );
}

function HourlyBarChart({ data, height = 120 }: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
            {d.label}:00 — {d.value}
          </div>
          <div
            className={`w-full rounded-t-sm transition-all hover:opacity-80 ${d.color || 'bg-blue-400'}`}
            style={{ height: `${Math.max((d.value / max) * 100, 1)}%`, minHeight: 1 }}
          />
          {i % 3 === 0 && (
            <span className="text-[8px] font-bold text-slate-400">{d.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────

function OverviewTab({ overview }: { overview: CustomerAnalyticsOverview }) {
  const signupChartData = useMemo(() => {
    const last14 = overview.dailySignups.slice(-14);
    return last14.map((d) => ({
      label: formatDate(d.date),
      value: d.count,
      color: 'bg-blue-400',
    }));
  }, [overview.dailySignups]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="סה״כ ארגונים"
          value={formatNumber(overview.totalOrganizations)}
          icon={<Building2 size={20} />}
          color="blue"
        />
        <StatCard
          label="ארגונים פעילים"
          value={formatNumber(overview.activeOrganizations)}
          icon={<CheckCircle2 size={20} />}
          sub={`${overview.totalOrganizations > 0 ? Math.round((overview.activeOrganizations / overview.totalOrganizations) * 100) : 0}% מהכלל`}
          color="emerald"
        />
        <StatCard
          label="בתקופת ניסיון"
          value={formatNumber(overview.trialOrganizations)}
          icon={<Clock size={20} />}
          color="amber"
        />
        <StatCard
          label="מבוטלים"
          value={formatNumber(overview.cancelledOrganizations)}
          icon={<AlertTriangle size={20} />}
          color="rose"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="סה״כ משתמשים"
          value={formatNumber(overview.totalUsers)}
          icon={<Users size={20} />}
          sub={`ממוצע ${overview.avgUsersPerOrg} לארגון`}
          color="violet"
        />
        <StatCard
          label="אנשי צוות"
          value={formatNumber(overview.totalTeamMembers)}
          icon={<UserPlus size={20} />}
          color="cyan"
        />
        <StatCard
          label="MRR כולל"
          value={formatMoney(overview.totalMRR)}
          icon={<DollarSign size={20} />}
          sub={`ARR: ${formatMoney(overview.totalMRR * 12)}`}
          color="emerald"
        />
        <StatCard
          label="משתמשים לארגון"
          value={overview.avgUsersPerOrg}
          icon={<TrendingUp size={20} />}
          color="slate"
        />
      </div>

      {/* Signups Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">ארגונים חדשים (14 ימים אחרונים)</h3>
        {signupChartData.length > 0 && signupChartData.some((d) => d.value > 0) ? (
          <MiniBarChart data={signupChartData} height={160} />
        ) : (
          <div className="text-center text-slate-400 font-bold py-12">אין נתונים עדיין</div>
        )}
      </div>

      {/* Status & Plan Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">התפלגות סטטוס</h3>
          <div className="space-y-3">
            {overview.statusDistribution.map((s) => {
              const maxS = overview.statusDistribution[0]?.count || 1;
              const barColors: Record<string, string> = {
                active: 'bg-emerald-400',
                trial: 'bg-blue-400',
                cancelled: 'bg-rose-400',
                suspended: 'bg-amber-400',
              };
              return (
                <div key={s.status} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[s.status] || s.status}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatNumber(s.count)}</span>
                  </div>
                  <ProgressBar value={s.count} max={maxS} color={barColors[s.status] || 'bg-slate-400'} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">התפלגות חבילות</h3>
          <div className="space-y-3">
            {overview.planDistribution.map((p) => {
              const maxP = overview.planDistribution[0]?.count || 1;
              return (
                <div key={p.plan} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">
                      {PLAN_LABELS[p.plan] || p.plan}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">{p.percentage}%</span>
                      <span className="text-sm font-black text-slate-900">{formatNumber(p.count)}</span>
                    </div>
                  </div>
                  <ProgressBar value={p.count} max={maxP} color="bg-violet-400" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Organizations */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">ארגונים מובילים (לפי שימוש AI)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right px-4 py-2 font-black text-slate-600 text-xs">#</th>
                <th className="text-right px-4 py-2 font-black text-slate-600 text-xs">ארגון</th>
                <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">חבילה</th>
                <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">סטטוס</th>
                <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">משתמשים</th>
                <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">מודולים</th>
                <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">בקשות AI</th>
                <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">עלות AI</th>
              </tr>
            </thead>
            <tbody>
              {overview.topOrganizations.slice(0, 10).map((org, i) => (
                <tr key={org.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-black text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{org.name}</div>
                    <div className="text-[11px] font-bold text-slate-400">{timeAgo(org.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                      {PLAN_LABELS[org.plan || ''] || org.plan || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[org.status || ''] || 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[org.status || ''] || org.status || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-slate-900">{org.usersCount}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-600">{org.modulesCount}</td>
                  <td className="px-4 py-3 text-center font-black text-slate-900">{formatNumber(org.aiRequestsCount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-black text-emerald-600">
                      {formatCurrency(org.aiCostCents)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">ארגונים אחרונים</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {overview.recentOrganizations.map((org) => (
            <div key={org.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-sm">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{org.name}</div>
                  <span className="text-xs font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                    {PLAN_LABELS[org.plan || ''] || org.plan || '-'}
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-[11px] font-bold text-slate-500">
                {org.ownerName && <div>בעלים: {org.ownerName}</div>}
                {org.ownerEmail && <div className="truncate">{org.ownerEmail}</div>}
                <div>{formatDateTime(org.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Organizations Tab ────────────────────────────────────────────

function OrganizationsTab({ activity, overview }: { activity: CustomerActivityEntry[]; overview: CustomerAnalyticsOverview | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'users' | 'ai' | 'created'>('ai');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...activity];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) =>
        o.orgName.toLowerCase().includes(q) ||
        (o.ownerName || '').toLowerCase().includes(q) ||
        (o.ownerEmail || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    switch (sortBy) {
      case 'name': result.sort((a, b) => a.orgName.localeCompare(b.orgName)); break;
      case 'users': result.sort((a, b) => b.usersCount - a.usersCount); break;
      case 'ai': result.sort((a, b) => b.aiRequestsLast30d - a.aiRequestsLast30d); break;
      case 'created': result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    }

    return result;
  }, [activity, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש ארגון, בעלים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {[
            { key: 'all', label: 'הכל' },
            { key: 'active', label: 'פעיל' },
            { key: 'trial', label: 'ניסיון' },
            { key: 'cancelled', label: 'מבוטל' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatusFilter(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                statusFilter === opt.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">מיין:</span>
          {[
            { key: 'ai' as const, label: 'שימוש AI' },
            { key: 'users' as const, label: 'משתמשים' },
            { key: 'created' as const, label: 'תאריך' },
            { key: 'name' as const, label: 'שם' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                sortBy === opt.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs font-bold text-slate-400">{filtered.length} ארגונים</div>

      {/* Organizations List */}
      <div className="space-y-3">
        {filtered.length > 0 ? filtered.map((org) => {
          const isExpanded = expandedOrg === org.orgId;
          return (
            <div key={org.orgId} className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all hover:shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedOrg(isExpanded ? null : org.orgId)}
                className="w-full flex items-center justify-between p-5 text-right"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                    {org.orgName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">{org.orgName}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[org.status || ''] || 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[org.status || ''] || org.status || '-'}
                      </span>
                      <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        {PLAN_LABELS[org.plan || ''] || org.plan || '-'}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-[11px] font-bold text-slate-400">
                      <span>{org.usersCount} משתמשים</span>
                      <span>{org.teamMembersCount} אנשי צוות</span>
                      <span>{org.activeModules.length} מודולים</span>
                      <span className="text-violet-500">{formatNumber(org.aiRequestsLast30d)} בקשות AI</span>
                      {org.aiCostLast30d > 0 && (
                        <span className="text-emerald-500">{formatCurrency(org.aiCostLast30d)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">בעלים</div>
                      <div className="text-sm font-black text-slate-900">{org.ownerName || 'לא ידוע'}</div>
                      {org.ownerEmail && <div className="text-[11px] font-bold text-slate-500 truncate">{org.ownerEmail}</div>}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">תאריך הקמה</div>
                      <div className="text-sm font-black text-slate-900">{formatDateTime(org.createdAt)}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">פעילות AI אחרונה</div>
                      <div className="text-sm font-black text-slate-900">
                        {org.lastAiActivity ? timeAgo(org.lastAiActivity) : 'אין פעילות'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">עלות AI (30 ימים)</div>
                      <div className="text-sm font-black text-emerald-600">{formatCurrency(org.aiCostLast30d)}</div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs font-black text-slate-600 mb-2">מודולים פעילים:</div>
                    <div className="flex flex-wrap gap-2">
                      {org.activeModules.length > 0 ? org.activeModules.map((mod) => (
                        <span key={mod} className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                          {mod}
                        </span>
                      )) : (
                        <span className="text-xs font-bold text-slate-400">אין מודולים פעילים</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
            אין ארגונים להצגה
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modules Tab ──────────────────────────────────────────────────

function ModulesTab({ overview }: { overview: CustomerAnalyticsOverview }) {
  return (
    <div className="space-y-6">
      {/* Module Distribution */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-1">אימוץ מודולים</h3>
        <p className="text-xs font-bold text-slate-500 mb-4">כמה ארגונים משתמשים בכל מודול</p>
        <div className="space-y-4">
          {overview.moduleDistribution.map((m) => (
            <div key={m.module} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Layers size={16} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-black text-slate-900">{m.module}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">{m.percentage}%</span>
                  <span className="text-lg font-black text-slate-900">{formatNumber(m.count)}</span>
                </div>
              </div>
              <ProgressBar value={m.count} max={overview.totalOrganizations} color="bg-blue-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-1">התפלגות חבילות</h3>
        <p className="text-xs font-bold text-slate-500 mb-4">כמה ארגונים בכל חבילה</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {overview.planDistribution.map((p) => {
            const planColors: Record<string, string> = {
              solo: 'from-slate-50 to-slate-100 border-slate-200',
              the_closer: 'from-blue-50 to-blue-100 border-blue-200',
              the_authority: 'from-violet-50 to-violet-100 border-violet-200',
              the_operator: 'from-amber-50 to-amber-100 border-amber-200',
              the_empire: 'from-emerald-50 to-emerald-100 border-emerald-200',
              the_mentor: 'from-purple-50 to-purple-100 border-purple-200',
            };
            return (
              <div key={p.plan} className={`bg-gradient-to-br ${planColors[p.plan] || 'from-slate-50 to-slate-100 border-slate-200'} border rounded-2xl p-5 text-center`}>
                <div className="text-xs font-bold text-slate-500 mb-1">{PLAN_LABELS[p.plan] || p.plan}</div>
                <div className="text-3xl font-black text-slate-900">{formatNumber(p.count)}</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">{p.percentage}% מהכלל</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Usage by Plan */}
      {overview.moduleUsageByPlan.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-1">מודולים לפי חבילה</h3>
          <p className="text-xs font-bold text-slate-500 mb-4">כמה ארגונים משתמשים בכל מודול, מפולח לפי חבילה</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right px-4 py-2 font-black text-slate-600 text-xs">חבילה</th>
                  <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">Nexus</th>
                  <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">Social</th>
                  <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">System</th>
                  <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">Finance</th>
                  <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">Client</th>
                  <th className="text-center px-4 py-2 font-black text-slate-600 text-xs">Operations</th>
                </tr>
              </thead>
              <tbody>
                {overview.moduleUsageByPlan.map((row) => (
                  <tr key={row.plan} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-black text-slate-800">
                      {PLAN_LABELS[row.plan] || row.plan}
                    </td>
                    {['nexus', 'social', 'system', 'finance', 'client', 'operations'].map((mod) => (
                      <td key={mod} className="px-4 py-3 text-center">
                        <span className={`text-xs font-black ${
                          (row.modules[mod] || 0) > 0 ? 'text-blue-600' : 'text-slate-300'
                        }`}>
                          {row.modules[mod] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Insights Tab ─────────────────────────────────────────────────

function InsightsTab({ insights, overview }: { insights: AIGeneratedInsight[]; overview: CustomerAnalyticsOverview | null }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">תובנות חכמות</h2>
          <p className="text-xs font-bold text-slate-500">ניתוח אוטומטי על לקוחות, מודולים ושימוש ב-AI</p>
        </div>
      </div>

      {insights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="text-slate-400 font-bold">אין מספיק נתונים ליצירת תובנות</div>
        </div>
      )}

      {/* Quick Summary */}
      {overview && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-black mb-4">סיכום מצב לקוחות</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400">ארגונים</div>
              <div className="text-xl font-black">{formatNumber(overview.totalOrganizations)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">פעילים</div>
              <div className="text-xl font-black text-emerald-400">{formatNumber(overview.activeOrganizations)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">MRR</div>
              <div className="text-xl font-black text-blue-400">{formatMoney(overview.totalMRR)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">משתמשים</div>
              <div className="text-xl font-black text-violet-400">{formatNumber(overview.totalUsers)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
