'use client';

import React, { useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, FileText, CircleAlert, Wallet, Users, BarChart3, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardTasksClient from '@/components/social/dashboard/DashboardTasksClient';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

type ChartPoint = {
  date: string;
  totalMinutes: number;
  totalHours: number;
  estimatedCost: number;
};

type UserAggregate = {
  user: { id: string; name: string; role: string; department: string | null };
  totalHours: number;
  totalMinutes: number;
  estimatedCost: number;
  entriesCount: number;
};

type OverviewData = {
  users: UserAggregate[];
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  openInvoicesCount: number;
  pendingReceivables: number;
  organizationId: string;
  chart: ChartPoint[];
};

function formatCurrency(value: number): string {
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

const MONTH_NAMES_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const OverviewView: React.FC<{ initialFinanceOverview?: unknown; initialFrom?: string; initialTo?: string }> = ({ initialFinanceOverview, initialFrom, initialTo }) => {
  const router = useRouter();
  const pathname = usePathname();
  const data = initialFinanceOverview as OverviewData | null | undefined;
  const totalRevenue = Number(data?.totalRevenue || 0);
  const totalCost = Number(data?.totalCost || 0);
  const netProfit = Number(data?.netProfit || 0);
  const openInvoicesCount = Number(data?.openInvoicesCount || 0);
  const pendingReceivables = Number(data?.pendingReceivables || 0);
  const chart = Array.isArray(data?.chart) ? data.chart : [];
  const users = Array.isArray(data?.users) ? data.users : [];

  const hasData = totalRevenue > 0 || totalCost > 0 || chart.length > 0 || users.length > 0;

  const currentFrom = useMemo(() => {
    if (initialFrom) return new Date(initialFrom);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [initialFrom]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return currentFrom.getFullYear() === now.getFullYear() && currentFrom.getMonth() === now.getMonth();
  }, [currentFrom]);

  const navigateMonth = useCallback((delta: number) => {
    const d = new Date(currentFrom.getFullYear(), currentFrom.getMonth() + delta, 1);
    const end = delta > 0 && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()
      ? new Date()
      : new Date(d.getFullYear(), d.getMonth() + 1, 0);
    router.push(`${pathname}?from=${d.toISOString().split('T')[0]}&to=${end.toISOString().split('T')[0]}`);
  }, [currentFrom, pathname, router]);

  const chartMax = useMemo(() => {
    if (!chart.length) return 1;
    return Math.max(...chart.map((p) => p.estimatedCost), 1);
  }, [chart]);

  const topUsers = useMemo(() => {
    return [...users].sort((a, b) => b.totalHours - a.totalHours).slice(0, 5);
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Month Picker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">סקירה כספית</h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {MONTH_NAMES_HE[currentFrom.getMonth()]} {currentFrom.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-900 transition-all"
            title="חודש קודם"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => navigateMonth(1)}
            disabled={isCurrentMonth}
            className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="חודש הבא"
          >
            <ChevronLeft size={18} />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={() => router.push(pathname)}
              className="mr-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black hover:bg-emerald-100 transition-colors"
            >
              החודש הנוכחי
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-emerald-600" size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs font-bold text-slate-500 mt-1">הכנסות החודש</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="text-blue-600" size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(totalCost)}</div>
          <div className="text-xs font-bold text-slate-500 mt-1">הוצאות החודש</div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm ${netProfit >= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              <Wallet className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} size={20} />
            </div>
          </div>
          <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(netProfit)}</div>
          <div className="text-xs font-bold text-slate-500 mt-1">רווח נקי</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <FileText className="text-amber-600" size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{openInvoicesCount}</div>
          <div className="text-xs font-bold text-slate-500 mt-1">חשבוניות פתוחות</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <CircleAlert className="text-rose-600" size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formatCurrency(pendingReceivables)}</div>
          <div className="text-xs font-bold text-slate-500 mt-1">ממתין לגבייה</div>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">עלות עבודה יומית</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">מבוסס על time entries ותעריף עובדים</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs font-bold text-slate-500">עלות מוערכת</span>
              </div>
            </div>

            {chart.length > 0 ? (
              <div className="flex items-end gap-1 h-48" dir="ltr">
                {chart.map((point, i) => {
                  const height = chartMax > 0 ? (point.estimatedCost / chartMax) * 100 : 0;
                  return (
                    <div key={point.date || i} className="flex-1 flex flex-col items-center gap-1 group" title={`${point.date}: ${formatCurrency(point.estimatedCost)}`}>
                      <div className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatCurrency(point.estimatedCost)}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:from-emerald-600 group-hover:to-emerald-500 min-h-[2px]"
                        style={{ height: `${Math.max(height, 1)}%` }}
                      />
                      <div className="text-[9px] font-bold text-slate-400 truncate w-full text-center">
                        {point.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 size={32} className="mx-auto mb-2 opacity-40" />
                  <div className="text-sm font-bold">אין נתוני עלות לתקופה זו</div>
                </div>
              </div>
            )}
          </div>

          {/* Top Users */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users size={18} className="text-slate-400" />
              <h3 className="text-lg font-black text-slate-900">עובדים מובילים</h3>
            </div>
            {topUsers.length > 0 ? (
              <div className="space-y-4">
                {topUsers.map((u, i) => (
                  <div key={String(u.user?.id || i)} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600">
                        {String(u.user?.name || '?').charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{String(u.user?.name || '—')}</div>
                        <div className="text-[10px] font-bold text-slate-400">{Number(u.totalHours || 0).toFixed(1)} שעות</div>
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-700">{formatCurrency(u.estimatedCost)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Users size={28} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm font-bold">אין נתוני עובדים</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <TrendingUp className="text-emerald-600" size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">מודול Finance מוכן לפעולה</h3>
          <p className="text-slate-500 mb-1 max-w-md mx-auto">
            כאן תראו תמונה כספית מלאה — הכנסות, הוצאות, רווח נקי ועלויות עובדים.
          </p>
          <p className="text-sm text-slate-400">
            התחילו ברישום שעות עבודה או בחיבור אינטגרציית חשבוניות.
          </p>
        </div>
      )}

      {/* Module Tasks */}
      <div className="mt-8">
        <DashboardTasksClient orgId={getWorkspaceOrgSlugFromPathname(pathname) || ''} module="finance" />
      </div>
    </div>
  );
};

export default OverviewView;
