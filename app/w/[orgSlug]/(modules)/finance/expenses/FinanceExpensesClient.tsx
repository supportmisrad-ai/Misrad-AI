'use client';

import React from 'react';
import { BarChart3, Clock, Users, ShieldAlert } from 'lucide-react';
import type { FinanceExpensesData, FinanceExpensesUserRow } from '@/lib/services/finance-service';

function formatCurrency(value: number): string {
  return `₪${Math.round(value).toLocaleString('he-IL')}`;
}

export default function FinanceExpensesClient(props: { expenses: FinanceExpensesData | null }) {
  const expenses = props.expenses;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">הוצאות</h2>
        <p className="text-sm font-bold text-slate-500 mt-1">עלות עבודה והוצאות ישירות של הארגון</p>
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
