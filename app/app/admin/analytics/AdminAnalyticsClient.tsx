'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3, Eye, Clock, MousePointer, Users, ArrowUpRight,
  Monitor, Smartphone, Tablet, Globe, TrendingUp, UserPlus,
  ChevronDown, ChevronUp, ExternalLink, Scroll, Route,
} from 'lucide-react';
import type {
  AnalyticsOverview, PageAnalytics, UserJourney, SignupRecord,
} from '@/app/actions/admin-analytics';

// ── Helpers ──────────────────────────────────────────────────────

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

function deviceIcon(type: string | null) {
  if (type === 'mobile') return <Smartphone size={14} />;
  if (type === 'tablet') return <Tablet size={14} />;
  return <Monitor size={14} />;
}

function truncatePath(path: string, max = 40): string {
  if (path.length <= max) return path;
  return path.slice(0, max - 3) + '...';
}

// ── Stat Card ────────────────────────────────────────────────────

function StatCard({ label, value, icon, sub, color = 'slate' }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string;
  color?: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const colors: Record<string, string> = {
    slate: 'from-slate-50 to-slate-100 border-slate-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200',
    amber: 'from-amber-50 to-amber-100 border-amber-200',
    rose: 'from-rose-50 to-rose-100 border-rose-200',
    violet: 'from-violet-50 to-violet-100 border-violet-200',
  };
  const iconColors: Record<string, string> = {
    slate: 'text-slate-600 bg-slate-200/50',
    blue: 'text-blue-600 bg-blue-200/50',
    emerald: 'text-emerald-600 bg-emerald-200/50',
    amber: 'text-amber-600 bg-amber-200/50',
    rose: 'text-rose-600 bg-rose-200/50',
    violet: 'text-violet-600 bg-violet-200/50',
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

// ── Tabs ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'pages' | 'journeys' | 'signups';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'סקירה כללית', icon: <BarChart3 size={16} /> },
  { key: 'pages', label: 'ניתוח דפים', icon: <Eye size={16} /> },
  { key: 'journeys', label: 'מסעות גולשים', icon: <Route size={16} /> },
  { key: 'signups', label: 'הרשמות', icon: <UserPlus size={16} /> },
];

// ── Main Component ───────────────────────────────────────────────

export default function AdminAnalyticsClient({
  overview,
  pages,
  journeys,
  signups,
  error,
}: {
  overview: AnalyticsOverview | null;
  pages: PageAnalytics[];
  journeys: UserJourney[];
  signups: SignupRecord[];
  error: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const [expandedSignup, setExpandedSignup] = useState<string | null>(null);

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
          <h1 className="text-2xl font-black text-slate-900">אנליטיקס אתר</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">ניתוח מלא של ביקורים, דפים, גלילה, מסעות גולשים והרשמות</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-black text-slate-600">
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
      {activeTab === 'pages' && <PagesTab pages={pages} />}
      {activeTab === 'journeys' && (
        <JourneysTab
          journeys={journeys}
          expandedJourney={expandedJourney}
          setExpandedJourney={setExpandedJourney}
        />
      )}
      {activeTab === 'signups' && (
        <SignupsTab
          signups={signups}
          expandedSignup={expandedSignup}
          setExpandedSignup={setExpandedSignup}
        />
      )}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────

function OverviewTab({ overview }: { overview: AnalyticsOverview }) {
  const chartData = useMemo(() => {
    const last14 = overview.dailyVisits.slice(-14);
    return last14.map((d) => ({
      label: formatDate(d.date),
      value: d.sessions,
    }));
  }, [overview.dailyVisits]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="סה״כ ביקורים"
          value={overview.totalSessions.toLocaleString('he-IL')}
          icon={<Eye size={20} />}
          color="blue"
        />
        <StatCard
          label="מבקרים ייחודיים"
          value={overview.uniqueVisitors.toLocaleString('he-IL')}
          icon={<Users size={20} />}
          color="violet"
        />
        <StatCard
          label="צפיות בדפים"
          value={overview.totalPageViews.toLocaleString('he-IL')}
          icon={<MousePointer size={20} />}
          sub={`ממוצע ${overview.avgPagesPerSession} לביקור`}
          color="emerald"
        />
        <StatCard
          label="הרשמות"
          value={overview.totalSignups.toLocaleString('he-IL')}
          icon={<UserPlus size={20} />}
          sub={overview.totalSessions > 0
            ? `${((overview.totalSignups / overview.totalSessions) * 100).toFixed(1)}% המרה`
            : undefined}
          color="amber"
        />
      </div>

      {/* Time & Scroll Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="זמן ממוצע בדף"
          value={formatDuration(overview.avgTimeOnPageMs)}
          icon={<Clock size={20} />}
          color="slate"
        />
        <StatCard
          label="גלילה ממוצעת"
          value={`${overview.avgScrollPct}%`}
          icon={<Scroll size={20} />}
          color="slate"
        />
        <StatCard
          label="דפים לביקור"
          value={overview.avgPagesPerSession}
          icon={<BarChart3 size={20} />}
          color="slate"
        />
        <StatCard
          label="מקורות שונים"
          value={overview.topReferrers.length}
          icon={<Globe size={20} />}
          color="slate"
        />
      </div>

      {/* Daily Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">ביקורים יומיים (14 ימים אחרונים)</h3>
        {chartData.length > 0 ? (
          <MiniBarChart data={chartData} height={160} />
        ) : (
          <div className="text-center text-slate-400 font-bold py-12">אין נתונים עדיין</div>
        )}
      </div>

      {/* Top Pages & Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">דפים מובילים</h3>
          <div className="space-y-3">
            {overview.topPages.length > 0 ? overview.topPages.slice(0, 10).map((page, i) => (
              <div key={page.path} className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate" title={page.path}>{page.path}</div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[11px] font-bold text-slate-400">{page.views} צפיות</span>
                    <span className="text-[11px] font-bold text-slate-400">{formatDuration(page.avgTimeMs)}</span>
                    <span className="text-[11px] font-bold text-slate-400">{page.avgScrollPct}% גלילה</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900">{page.views}</span>
              </div>
            )) : (
              <div className="text-center text-slate-400 font-bold py-8">אין נתונים עדיין</div>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">מקורות תנועה</h3>
          <div className="space-y-3">
            {overview.topReferrers.length > 0 ? overview.topReferrers.map((ref, i) => {
              const maxCount = overview.topReferrers[0]?.count || 1;
              return (
                <div key={ref.referrer} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-400 w-5 text-center">{i + 1}</span>
                      <span className="text-sm font-bold text-slate-800 truncate" title={ref.referrer}>
                        {ref.referrer === 'ישיר' ? '🔗 ישיר (Direct)' : ref.referrer}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 shrink-0">{ref.count}</span>
                  </div>
                  <ProgressBar value={ref.count} max={maxCount} color="bg-violet-400" />
                </div>
              );
            }) : (
              <div className="text-center text-slate-400 font-bold py-8">אין נתונים עדיין</div>
            )}
          </div>
        </div>
      </div>

      {/* Device & Browser */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">מכשירים</h3>
          <div className="space-y-3">
            {overview.deviceBreakdown.map((d) => {
              const maxD = overview.deviceBreakdown[0]?.count || 1;
              const labels: Record<string, string> = { desktop: 'מחשב', mobile: 'נייד', tablet: 'טאבלט' };
              return (
                <div key={d.device} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {deviceIcon(d.device)}
                      <span className="text-sm font-bold text-slate-800">{labels[d.device] || d.device}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{d.count}</span>
                  </div>
                  <ProgressBar value={d.count} max={maxD} color="bg-emerald-400" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">דפדפנים</h3>
          <div className="space-y-3">
            {overview.browserBreakdown.map((b) => {
              const maxB = overview.browserBreakdown[0]?.count || 1;
              return (
                <div key={b.browser} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{b.browser}</span>
                    <span className="text-sm font-black text-slate-900">{b.count}</span>
                  </div>
                  <ProgressBar value={b.count} max={maxB} color="bg-blue-400" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pages Tab ────────────────────────────────────────────────────

function PagesTab({ pages }: { pages: PageAnalytics[] }) {
  const [sortBy, setSortBy] = useState<'views' | 'time' | 'scroll' | 'bounce'>('views');

  const sortedPages = useMemo(() => {
    const sorted = [...pages];
    switch (sortBy) {
      case 'views': sorted.sort((a, b) => b.totalViews - a.totalViews); break;
      case 'time': sorted.sort((a, b) => b.avgTimeMs - a.avgTimeMs); break;
      case 'scroll': sorted.sort((a, b) => b.avgScrollPct - a.avgScrollPct); break;
      case 'bounce': sorted.sort((a, b) => b.bounceRate - a.bounceRate); break;
    }
    return sorted;
  }, [pages, sortBy]);

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-500">מיין לפי:</span>
        {[
          { key: 'views' as const, label: 'צפיות' },
          { key: 'time' as const, label: 'זמן' },
          { key: 'scroll' as const, label: 'גלילה' },
          { key: 'bounce' as const, label: 'Bounce' },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              sortBy === opt.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-right px-5 py-3 font-black text-slate-600 text-xs">#</th>
                <th className="text-right px-5 py-3 font-black text-slate-600 text-xs">דף</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">צפיות</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">מבקרים</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">זמן ממוצע</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">גלילה ממוצעת</th>
                <th className="text-center px-5 py-3 font-black text-slate-600 text-xs">Bounce Rate</th>
              </tr>
            </thead>
            <tbody>
              {sortedPages.length > 0 ? sortedPages.map((page, i) => (
                <tr key={page.path} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-black text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-800 truncate max-w-[300px]" title={page.path}>
                      {page.path}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center font-black text-slate-900">{page.totalViews}</td>
                  <td className="px-5 py-3 text-center font-bold text-slate-600">{page.uniqueVisitors}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Clock size={11} />
                      {formatDuration(page.avgTimeMs)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16">
                        <ProgressBar value={page.avgScrollPct} max={100} color="bg-emerald-400" />
                      </div>
                      <span className="text-xs font-black text-slate-600">{page.avgScrollPct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      page.bounceRate > 70 ? 'bg-rose-50 text-rose-600' :
                      page.bounceRate > 40 ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {page.bounceRate}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-bold">
                    אין נתונים עדיין
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

// ── Journeys Tab ─────────────────────────────────────────────────

function JourneysTab({
  journeys,
  expandedJourney,
  setExpandedJourney,
}: {
  journeys: UserJourney[];
  expandedJourney: string | null;
  setExpandedJourney: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'signups' | 'visitors'>('all');

  const filtered = useMemo(() => {
    switch (filter) {
      case 'signups': return journeys.filter((j) => j.signedUp);
      case 'visitors': return journeys.filter((j) => !j.signedUp);
      default: return journeys;
    }
  }, [journeys, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-500">סנן:</span>
        {[
          { key: 'all' as const, label: `הכל (${journeys.length})` },
          { key: 'signups' as const, label: `נרשמו (${journeys.filter((j) => j.signedUp).length})` },
          { key: 'visitors' as const, label: `לא נרשמו (${journeys.filter((j) => !j.signedUp).length})` },
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

      <div className="space-y-3">
        {filtered.length > 0 ? filtered.map((journey) => {
          const isExpanded = expandedJourney === journey.sessionId;
          return (
            <div
              key={journey.sessionId}
              className={`bg-white border rounded-2xl transition-all ${
                journey.signedUp ? 'border-emerald-200' : 'border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedJourney(isExpanded ? null : journey.sessionId)}
                className="w-full flex items-center justify-between p-5 text-right"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {deviceIcon(journey.device)}
                    <span className="text-xs font-bold text-slate-500">{journey.browser}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 truncate">{journey.landingPage || '/'}</span>
                      {journey.signedUp && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          <UserPlus size={10} />
                          נרשם
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-[11px] font-bold text-slate-400">
                      <span>{formatDateTime(journey.createdAt)}</span>
                      <span>{journey.totalPages} דפים</span>
                      <span>{formatDuration(journey.totalDurationMs)}</span>
                      {journey.referrer && <span className="truncate max-w-[150px]">מ: {journey.referrer}</span>}
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-3 py-3 text-xs font-bold">
                    {journey.utmSource && (
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">UTM Source: {journey.utmSource}</span>
                    )}
                    {journey.utmMedium && (
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">UTM Medium: {journey.utmMedium}</span>
                    )}
                    {journey.utmCampaign && (
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">UTM Campaign: {journey.utmCampaign}</span>
                    )}
                    {journey.referrer && (
                      <span className="bg-violet-50 text-violet-600 px-2 py-1 rounded-lg">Referrer: {journey.referrer}</span>
                    )}
                    {journey.signedUpAt && (
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">נרשם: {formatDateTime(journey.signedUpAt)}</span>
                    )}
                  </div>

                  {/* Page journey */}
                  <div className="space-y-0">
                    {journey.pages.map((page, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            i === 0 ? 'bg-blue-500' :
                            i === journey.pages.length - 1 && journey.signedUp ? 'bg-emerald-500' :
                            'bg-slate-300'
                          }`} />
                          {i < journey.pages.length - 1 && (
                            <div className="w-0.5 h-6 bg-slate-200" />
                          )}
                        </div>
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <span className="text-sm font-bold text-slate-800 truncate" title={page.path}>
                            {truncatePath(page.path)}
                          </span>
                          <div className="flex gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-400">
                              {formatDuration(page.timeMs)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              {page.scrollPct}% גלילה
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              {formatDateTime(page.enteredAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
            אין נתונים עדיין
          </div>
        )}
      </div>
    </div>
  );
}

// ── Signups Tab ──────────────────────────────────────────────────

function SignupsTab({
  signups,
  expandedSignup,
  setExpandedSignup,
}: {
  signups: SignupRecord[];
  expandedSignup: string | null;
  setExpandedSignup: (id: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-900">כל ההרשמות ({signups.length})</h3>
        <span className="text-xs font-bold text-slate-400">90 ימים אחרונים</span>
      </div>

      {signups.length > 0 ? (
        <div className="space-y-3">
          {signups.map((signup) => {
            const isExpanded = expandedSignup === signup.sessionId;
            return (
              <div key={signup.sessionId} className="bg-white border border-emerald-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSignup(isExpanded ? null : signup.sessionId)}
                  className="w-full flex items-center justify-between p-5 text-right"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                      {signup.userAvatar ? (
                        <img src={signup.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (signup.userName || signup.userEmail || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {signup.userName || signup.userEmail || signup.signupUserId}
                        </span>
                        {signup.organizationName && (
                          <span className="text-[11px] font-bold text-slate-400">
                            · {signup.organizationName}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-[11px] font-bold text-slate-400">
                        <span className="text-emerald-600">{formatDateTime(signup.signedUpAt)}</span>
                        <span className="flex items-center gap-1">{deviceIcon(signup.device)} {signup.browser}</span>
                        <span>{signup.totalPages} דפים</span>
                        <span>{formatDuration(signup.totalDurationMs)} באתר</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {signup.utmSource && (
                      <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {signup.utmSource}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-emerald-100">
                    {/* Details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">שעת הרשמה מדויקת</div>
                        <div className="text-sm font-black text-slate-900">{formatDateTime(signup.signedUpAt)}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">מקור</div>
                        <div className="text-sm font-black text-slate-900 truncate">{signup.referrer || 'ישיר'}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">דף נחיתה</div>
                        <div className="text-sm font-bold text-slate-900 truncate">{signup.landingPage || '/'}</div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">מערכת הפעלה</div>
                        <div className="text-sm font-bold text-slate-900">{signup.os || 'לא ידוע'}</div>
                      </div>
                    </div>

                    {/* UTM details */}
                    {(signup.utmSource || signup.utmMedium || signup.utmCampaign) && (
                      <div className="flex flex-wrap gap-2 py-2">
                        {signup.utmSource && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">Source: {signup.utmSource}</span>}
                        {signup.utmMedium && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">Medium: {signup.utmMedium}</span>}
                        {signup.utmCampaign && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">Campaign: {signup.utmCampaign}</span>}
                      </div>
                    )}

                    {/* Journey path */}
                    <div className="mt-3">
                      <div className="text-xs font-black text-slate-600 mb-2">מסע עד ההרשמה:</div>
                      <div className="flex flex-wrap gap-1">
                        {signup.journeyPages.map((page, i) => (
                          <React.Fragment key={i}>
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-bold">
                              {truncatePath(page.path, 25)}
                              <span className="text-slate-400">({formatDuration(page.timeMs)}, {page.scrollPct}%)</span>
                            </span>
                            {i < signup.journeyPages.length - 1 && (
                              <ArrowUpRight size={12} className="text-slate-300 self-center rotate-90" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-bold">
          אין הרשמות עדיין
        </div>
      )}
    </div>
  );
}
