'use client';

import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { FinanceInvoice } from '@/lib/services/finance-service';

export default function FinanceInvoicesClient(props: { invoices: FinanceInvoice[] }) {
  const invoices = Array.isArray(props.invoices) ? props.invoices : [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <div className="text-2xl font-black text-slate-900">חשבוניות</div>
        <div className="text-sm font-bold text-slate-500 mt-1">נתונים חיים מה-DB (misrad_invoices)</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-black text-slate-600">מספר</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">לקוח</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">תאריך</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">לתשלום עד</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">סכום</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">סטטוס</th>
                <th className="px-4 py-3 text-xs font-black text-slate-600">קובץ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={7}>
                    אין חשבוניות להצגה
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-black text-slate-900">{inv.number || inv.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{inv.clientName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{inv.date || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{inv.dueDate || '—'}</td>
                    <td className="px-4 py-3 text-sm font-black text-slate-900">₪{Number(inv.amount || 0).toLocaleString('he-IL')}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{inv.status || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {inv.downloadUrl ? (
                        <a
                          href={inv.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black hover:bg-indigo-100"
                        >
                          <ExternalLink size={16} />
                          פתח
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-slate-400 font-bold">
                          <FileText size={16} />
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
