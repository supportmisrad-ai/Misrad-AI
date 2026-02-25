'use client';

import React, { useState, useMemo } from 'react';
import {
  BrainCircuit, Zap, DollarSign, Clock, AlertTriangle, CheckCircle2,
  Users, Building2, TrendingUp, Activity, ChevronDown, ChevronUp,
  Info, ShieldAlert, Sparkles, BarChart3, Cpu, Filter,
} from 'lucide-react';
import type {
  AIUsageOverview, AIUsageLogEntry, AIGeneratedInsight,
} from '@/app/actions/admin-analytics-ai';

// ── Helpers ──────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return `₪${(cents / 100).toFixed(2)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} שנ׳`;
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  return `${min} דק׳ ${remainSec > 0 ? `${remainSec} שנ׳` : ''}`.trim();
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
            className={`w-full rounded-t-md transition-all ${d.color || 'bg-violet-400'}`}
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

function ProgressBar({ value, max, color = 'bg-violet-500' }: { value: number; max: number; color?: string }) {
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

type Tab = 'overview' | 'models' | 'logs' | 'insights';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'סקירה כללית', icon: <BarChart3 size={16} /> },
  { key: 'models', label: 'מודלים ופיצ׳רים', icon: <Cpu size={16} /> },
  { key: 'logs', label: 'לוגים', icon: <Activity size={16} /> },
  { key: 'insights', label: 'תובנות AI', icon: <Sparkles size={16} /> },
];

// ── Main Component ───────────────────────────────────────────────

export default function AIAnalyticsClient({
  overview,
  logs,
  insights,
  error,
}: {
  overview: AIUsageOverview | null;
  logs: AIUsageLogEntry[];
  insights: AIGeneratedInsight[];
  error: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-200">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">אנליטיקס AI</h1>
              <p className="text-sm font-bold text-slate-500 mt-0.5">ניתוח מלא של שימוש ב-AI: מודלים, עלויות, ביצועים ותובנות</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-violet-100 rounded-lg text-xs font-black text-violet-700">
            30 ימים אחרונים
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
      {activeTab === 'overview' && overview && <OverviewTab overview={overview} />}
      {activeTab === 'models' && overview && <ModelsTab overview={overview} />}
      {activeTab === 'logs' && <LogsTab logs={logs} />}
      {activeTab === 'insights' && <InsightsTab insights={insights} overview={overview} />}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────

function OverviewTab({ overview }: { overview: AIUsageOverview }) {
  const chartData = useMemo(() => {
    const last14 = overview.dailyUsage.slice(-14);
    return last14.map((d) => ({
      label: formatDate(d.date),
      value: d.requests,
    }));
  }, [overview.dailyUsage]);

  const costChartData = useMemo(() => {
    const last14 = overview.dailyUsage.slice(-14);
    return last14.map((d) => ({
      label: formatDate(d.date),
      value: d.costCents,
      color: 'bg-emerald-400',
    }));
  }, [overview.dailyUsage]);

  const hourlyData = useMemo(() => {
    return overview.hourlyDistribution.map((d) => ({
      label: `${d.hour}`,
      value: d.count,
      color: 'bg-cyan-400',
    }));
  }, [overview.hourlyDistribution]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="סה״כ בקשות AI"
          value={formatNumber(overview.totalRequests)}
          icon={<Zap size={20} />}
          color="violet"
        />
        <StatCard
          label="עלות כוללת"
          value={formatCurrency(overview.totalCostCents)}
          icon={<DollarSign size={20} />}
          color="emerald"
        />
        <StatCard
          label="זמן תגובה ממוצע"
          value={formatDuration(overview.avgLatencyMs)}
          icon={<Clock size={20} />}
          color="blue"
        />
        <StatCard
          label="אחוז הצלחה"
          value={`${overview.successRate}%`}
          icon={<CheckCircle2 size={20} />}
          sub={`${overview.errorCount} שגיאות`}
          color={overview.successRate >= 95 ? 'emerald' : overview.successRate >= 80 ? 'amber' : 'rose'}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="משתמשים ייחודיים"
          value={formatNumber(overview.uniqueUsers)}
          icon={<Users size={20} />}
          color="cyan"
        />
        <StatCard
          label="ארגונים"
          value={formatNumber(overview.uniqueOrganizations)}
          icon={<Building2 size={20} />}
          color="purple"
        />
        <StatCard
          label="עלות ממוצעת לבקשה"
          value={overview.totalRequests > 0 ? formatCurrency(Math.round(overview.totalCostCents / overview.totalRequests)) : '₪0'}
          icon={<TrendingUp size={20} />}
          color="slate"
        />
        <StatCard
          label="סוגי משימות"
          value={overview.taskKindBreakdown.length}
          icon={<Activity size={20} />}
          color="slate"
        />
      </div>

      {/* Daily Usage Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">בקשות יומיות (14 ימים)</h3>
          {chartData.length > 0 ? (
            <MiniBarChart data={chartData} height={160} />
          ) : (
            <div className="text-center text-slate-400 font-bold py-12">אין נתונים עדיין</div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">עלות יומית (14 ימים)</h3>
          {costChartData.length > 0 ? (
            <MiniBarChart data={costChartData} height={160} />
          ) : (
            <div className="text-center text-slate-400 font-bold py-12">אין נתונים עדיין</div>
          )}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">התפלגות שעתית</h3>
        {hourlyData.some((d) => d.value > 0) ? (
          <MiniBarChart data={hourlyData} height={120} />
        ) : (
          <div className="text-center text-slate-400 font-bold py-12">אין נתונים עדיין</div>
        )}
      </div>

      {/* Top Organizations & Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">ארגונים מובילים (לפי שימוש)</h3>
          <div className="space-y-3">
            {overview.topOrganizations.length > 0 ? overview.topOrganizations.map((org, i) => {
              const maxCount = overview.topOrganizations[0]?.count || 1;
              return (
                <div key={org.orgId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-400 w-5 text-center">{i + 1}</span>
                      <span className="text-sm font-bold text-slate-800 truncate">{org.orgName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-slate-500">{formatCurrency(org.costCents)}</span>
                      <span className="text-sm font-black text-slate-900">{org.count}</span>
                    </div>
                  </div>
                  <ProgressBar value={org.count} max={maxCount} color="bg-violet-400" />
                </div>
              );
            }) : (
              <div className="text-center text-slate-400 font-bold py-8">אין נתונים עדיין</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">משתמשים מובילים</h3>
          <div className="space-y-3">
            {overview.topUsers.length > 0 ? overview.topUsers.map((user, i) => {
              const maxCount = overview.topUsers[0]?.count || 1;
              return (
                <div key={user.userId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-400 w-5 text-center">{i + 1}</span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-800 truncate block">
                          {user.userName || user.email || user.userId.slice(0, 12)}
                        </span>
                        {user.email && user.userName && (
                          <span className="text-[11px] font-bold text-slate-400 truncate block">{user.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-slate-500">{formatCurrency(user.costCents)}</span>
                      <span className="text-sm font-black text-slate-900">{user.count}</span>
                    </div>
                  </div>
                  <ProgressBar value={user.count} max={maxCount} color="bg-cyan-400" />
                </div>
              );
            }) : (
              <div className="text-center text-slate-400 font-bold py-8">אין נתונים עדיין</div>
            )}
          </div>
        </div>
      </div>

      {/* Status & Task Kind */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">סטטוס בקשות</h3>
          <div className="space-y-3">
            {overview.statusBreakdown.map((s) => {
              const maxS = overview.statusBreakdown[0]?.count || 1;
              const statusLabels: Record<string, string> = { success: 'הצלחה', error: 'שגיאה', pending: 'ממתין' };
              const statusColors: Record<string, string> = { success: 'bg-emerald-400', error: 'bg-rose-400', pending: 'bg-amber-400' };
              return (
                <div key={s.status} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{statusLabels[s.status] || s.status}</span>
                    <span className="text-sm font-black text-slate-900">{formatNumber(s.count)}</span>
                  </div>
                  <ProgressBar value={s.count} max={maxS} color={statusColors[s.status] || 'bg-slate-400'} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">סוגי משימות</h3>
          <div className="space-y-3">
            {overview.taskKindBreakdown.length > 0 ? overview.taskKindBreakdown.slice(0, 10).map((t) => {
              const maxT = overview.taskKindBreakdown[0]?.count || 1;
              return (
                <div key={t.taskKind} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 truncate">{t.taskKind}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-slate-500">{formatCurrency(t.costCents)}</span>
                      <span className="text-sm font-black text-slate-900">{formatNumber(t.count)}</span>
                    </div>
                  </div>
                  <ProgressBar value={t.count} max={maxT} color="bg-purple-400" />
                </div>
              );
            }) : (
              <div className="text-center text-slate-400 font-bold py-8">אין נתונים עדיין</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Models Tab ───────────────────────────────────────────────────

function ModelsTab({ overview }: { overview: AIUsageOverview }) {
  return (
    <div className="space-y-6">
      {/* Models Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900">מודלים בשימוש</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">כל המודלים שהופעלו ב-30 ימים אחרונים</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-right px-5 py-3 font-black text-slate-600 text-xs">#</th>
                <th className="text-right px-5 py-3 font-black text-slate-600 text-xs">ספק</th>
                <th className="text-right px-5 py-3 font-black text-slate-600 text-xs">מודל</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">בקשות</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">עלות</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">זמן תגובה ממוצע</th>
              </tr>
            </thead>
            <tbody>
              {overview.topModels.length > 0 ? overview.topModels.map((model, i) => (
                <tr key={`${model.provider}-${model.model}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-black text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black bg-violet-50 text-violet-700 px-2.5 py-1 rounded-lg">
                      <Cpu size={12} />
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-800">{model.displayName || model.model}</div>
                    {model.displayName && (
                      <div className="text-[11px] font-bold text-slate-400 mt-0.5">{model.model}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center font-black text-slate-900">{formatNumber(model.count)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {formatCurrency(model.costCents)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                      model.avgLatencyMs > 5000 ? 'bg-amber-50 text-amber-600' :
                      model.avgLatencyMs > 10000 ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      <Clock size={11} />
                      {formatDuration(model.avgLatencyMs)}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-bold">
                    אין נתונים עדיין
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">פיצ׳רים בשימוש</h3>
        <div className="space-y-3">
          {overview.topFeatures.length > 0 ? overview.topFeatures.map((f, i) => {
            const maxF = overview.topFeatures[0]?.count || 1;
            return (
              <div key={f.featureKey} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-slate-400 w-5 text-center">{i + 1}</span>
                    <span className="text-sm font-bold text-slate-800 truncate">{f.featureKey}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-emerald-600">{formatCurrency(f.costCents)}</span>
                    <span className="text-sm font-black text-slate-900">{formatNumber(f.count)}</span>
                  </div>
                </div>
                <ProgressBar value={f.count} max={maxF} color="bg-violet-400" />
              </div>
            );
          }) : (
            <div className="text-center text-slate-400 font-bold py-8">אין נתונים עדיין</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Logs Tab ─────────────────────────────────────────────────────

function LogsTab({ logs }: { logs: AIUsageLogEntry[] }) {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    switch (filter) {
      case 'success': return logs.filter((l) => l.status === 'success');
      case 'error': return logs.filter((l) => l.status === 'error');
      default: return logs;
    }
  }, [logs, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        <span className="text-sm font-bold text-slate-500">סנן:</span>
        {[
          { key: 'all' as const, label: `הכל (${logs.length})` },
          { key: 'success' as const, label: `הצלחה (${logs.filter((l) => l.status === 'success').length})` },
          { key: 'error' as const, label: `שגיאות (${logs.filter((l) => l.status === 'error').length})` },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              filter === opt.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-right px-4 py-3 font-black text-slate-600 text-xs">זמן</th>
                <th className="text-right px-4 py-3 font-black text-slate-600 text-xs">ארגון</th>
                <th className="text-right px-4 py-3 font-black text-slate-600 text-xs">משתמש</th>
                <th className="text-right px-4 py-3 font-black text-slate-600 text-xs">פיצ׳ר</th>
                <th className="text-center px-4 py-3 font-black text-slate-600 text-xs">מודל</th>
                <th className="text-center px-4 py-3 font-black text-slate-600 text-xs">עלות</th>
                <th className="text-center px-4 py-3 font-black text-slate-600 text-xs">זמן</th>
                <th className="text-center px-4 py-3 font-black text-slate-600 text-xs">סטטוס</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                const isExpanded = expandedLog === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                        log.status === 'error' ? 'bg-rose-50/30' : ''
                      }`}
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-slate-600 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800 truncate max-w-[120px]">
                        {log.organizationName}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600 truncate max-w-[120px]">
                        {log.userName || log.userEmail || log.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">{log.featureKey}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                          {log.modelDisplayName || log.model}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-black text-emerald-600">
                        {formatCurrency(log.chargedCents)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">
                        {log.latencyMs ? formatDuration(log.latencyMs) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                          log.status === 'error' ? 'bg-rose-50 text-rose-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {log.status === 'success' ? 'הצלחה' : log.status === 'error' ? 'שגיאה' : log.status}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">ספק</div>
                              <div className="text-sm font-black text-slate-900">{log.provider}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">סוג משימה</div>
                              <div className="text-sm font-black text-slate-900">{log.taskKind}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">מודל מלא</div>
                              <div className="text-sm font-bold text-slate-900 truncate">{log.model}</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">מייל</div>
                              <div className="text-sm font-bold text-slate-900 truncate">{log.userEmail || 'לא ידוע'}</div>
                            </div>
                          </div>
                          {log.errorMessage && (
                            <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
                              <div className="text-[10px] font-bold text-rose-500 mb-1">הודעת שגיאה</div>
                              <div className="text-xs font-bold text-rose-700">{log.errorMessage}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-bold">
                    אין לוגים להצגה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Insights Tab ─────────────────────────────────────────────────

function InsightsTab({ insights, overview }: { insights: AIGeneratedInsight[]; overview: AIUsageOverview | null }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">תובנות אוטומטיות</h2>
          <p className="text-xs font-bold text-slate-500">ניתוח חכם על סמך נתוני השימוש ב-AI</p>
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
          <div className="text-xs font-bold text-slate-300 mt-2">נדרשים לפחות כמה ימים של שימוש</div>
        </div>
      )}

      {/* Quick Summary */}
      {overview && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-black mb-4">סיכום מהיר</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400">בקשות</div>
              <div className="text-xl font-black">{formatNumber(overview.totalRequests)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">עלות</div>
              <div className="text-xl font-black text-emerald-400">{formatCurrency(overview.totalCostCents)}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">הצלחה</div>
              <div className="text-xl font-black text-blue-400">{overview.successRate}%</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">זמן תגובה</div>
              <div className="text-xl font-black text-violet-400">{formatDuration(overview.avgLatencyMs)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
