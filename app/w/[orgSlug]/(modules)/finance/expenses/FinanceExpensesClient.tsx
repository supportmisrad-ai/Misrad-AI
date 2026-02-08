'use client';

import React from 'react';
import type { FinanceExpensesData, FinanceExpensesUserRow } from '@/lib/services/finance-service';

export default function FinanceExpensesClient(props: { expenses: FinanceExpensesData | null }) {
  const expenses = props.expenses;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <div className="text-2xl font-black text-slate-900">הוצאות</div>
        <div className="text-sm font-bold text-slate-500 mt-1">עלות עבודה (time entries) + direct_expenses מלקוחות</div>
      </div>

      {!expenses ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-slate-900 font-black">אין הרשאה לצפייה</div>
          <div className="text-sm text-slate-600 mt-2">נדרש permission: view_financials</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-xs font-black text-slate-500">עלות עבודה (Labor)</div>
              <div className="text-3xl font-black text-slate-900 mt-2">₪{Math.round(expenses.totalLaborCost || 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-xs font-black text-slate-500">הוצאות ישירות (Clients)</div>
              <div className="text-3xl font-black text-slate-900 mt-2">₪{Math.round(expenses.totalDirectExpenses || 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="text-xs font-black text-slate-500">סה״כ הוצאות</div>
              <div className="text-3xl font-black text-slate-900 mt-2">₪{Math.round(expenses.totalExpenses || 0).toLocaleString('he-IL')}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="text-sm font-black text-slate-800">פירוט לפי עובדים</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-right">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">עובד</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">דקות</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">שעות</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">כניסות</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">עלות מוערכת</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.users.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={5}>
                        אין נתונים
                      </td>
                    </tr>
                  ) : (
                    expenses.users.map((u: FinanceExpensesUserRow) => (
                      <tr key={String(u.user?.id)} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-black text-slate-900">{String(u.user?.name || '—')}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{Number(u.totalMinutes || 0).toLocaleString('he-IL')}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{Number(u.totalHours || 0).toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{Number(u.entriesCount || 0).toLocaleString('he-IL')}</td>
                        <td className="px-4 py-3 text-sm font-black text-slate-900">₪{Math.round(Number(u.estimatedCost || 0)).toLocaleString('he-IL')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
