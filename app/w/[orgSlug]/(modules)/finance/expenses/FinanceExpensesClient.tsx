'use client';

import React, { useMemo, useCallback } from 'react';
import { BarChart3, Clock, Users, ShieldAlert, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { FinanceExpensesData, FinanceExpensesUserRow } from '@/lib/services/finance-service';

const MONTH_NAMES_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

function exportExpensesCSV(expenses: FinanceExpensesData) {
  const BOM = '\uFEFF';
  const header = ['עובד', 'שעות', 'כניסות', 'עלות מוערכת'];
  const rows = expenses.users.map((u) => [
    String(u.user?.name || '—'),
    Number(u.totalHours || 0).toFixed(1),
    String(Number(u.entriesCount || 0)),
    String(Math.round(Number(u.estimatedCost || 0))),
  ]);
  rows.push(['', '', '', '']);
  rows.push(['עלות עבודה', '', '', String(Math.round(expenses.totalLaborCost || 0))]);
  rows.push(['הוצאות ישירות', '', '', String(Math.round(expenses.totalDirectExpenses || 0))]);
  rows.push(['סה״כ', '', '', String(Math.round(expenses.totalExpenses || 0))]);
  const csv = BOM + [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number): string {
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

export default function FinanceExpensesClient(props: { expenses: FinanceExpensesData | null; initialFrom?: string; initialTo?: string }) {
  const expenses = props.expenses;
  const router = useRouter();
  const pathname = usePathname();

  const currentFrom = useMemo(() => {
    if (props.initialFrom) return new Date(props.initialFrom);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [props.initialFrom]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">הוצאות</h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {MONTH_NAMES_HE[currentFrom.getMonth()]} {currentFrom.getFullYear()} · עלות עבודה והוצאות ישירות
          </p>
        </div>
        <div className="flex items-center gap-2">
          {expenses && expenses.users.length > 0 && (
            <button
              onClick={() => exportExpensesCSV(expenses)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition-colors"
            >
              <Download size={14} />
              ייצוא CSV
            </button>
          )}
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
      </div>

      {!expenses ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="text-rose-600" size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">אין הרשאה לצפייה</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            נדרשת הרשאת "צפייה בכספים" כדי לגשת לנתוני ההוצאות.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-blue-500" />
                <div className="text-xs font-black text-slate-500">עלות עבודה</div>
              </div>
              <div className="text-2xl font-black text-slate-900">{formatCurrency(expenses.totalLaborCost || 0)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-amber-500" />
                <div className="text-xs font-black text-slate-500">הוצאות ישירות</div>
              </div>
              <div className="text-2xl font-black text-slate-900">{formatCurrency(expenses.totalDirectExpenses || 0)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
              <div className="text-xs font-black text-slate-400 mb-2">סה״כ הוצאות</div>
              <div className="text-2xl font-black">{formatCurrency(expenses.totalExpenses || 0)}</div>
            </div>
          </div>

          {expenses.users.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="text-slate-400" size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">אין נתוני עובדים</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                כאשר עובדים ירשמו שעות עבודה, הפירוט יופיע כאן.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                <div className="text-sm font-black text-slate-800">פירוט לפי עובדים</div>
                {expenses.users.map((u: FinanceExpensesUserRow) => (
                  <div key={String(u.user?.id)} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600">
                          {String(u.user?.name || '?').charAt(0)}
                        </div>
                        <div className="text-sm font-black text-slate-900">{String(u.user?.name || '—')}</div>
                      </div>
                      <div className="text-sm font-black text-slate-900">{formatCurrency(Number(u.estimatedCost || 0))}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{Number(u.totalHours || 0).toFixed(1)} שעות</span>
                      <span>{Number(u.entriesCount || 0)} כניסות</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                  <div className="text-sm font-black text-slate-800">פירוט לפי עובדים</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right">
                    <thead className="bg-white border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-600">עובד</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-600">שעות</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-600">כניסות</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-600">עלות מוערכת</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.users.map((u: FinanceExpensesUserRow) => (
                        <tr key={String(u.user?.id)} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600">
                                {String(u.user?.name || '?').charAt(0)}
                              </div>
                              <span className="text-sm font-black text-slate-900">{String(u.user?.name || '—')}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-700">{Number(u.totalHours || 0).toFixed(1)}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-700">{Number(u.entriesCount || 0).toLocaleString('he-IL')}</td>
                          <td className="px-5 py-3.5 text-sm font-black text-slate-900">{formatCurrency(Number(u.estimatedCost || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
