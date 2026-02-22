'use client';

import React, { useState, useCallback } from 'react';
import { ExternalLink, FileText, Receipt, Plus, Download } from 'lucide-react';
import type { FinanceInvoice } from '@/lib/services/finance-service';
import { CreateInvoiceModal } from '@/components/CreateInvoiceModal';
import { useToast } from '@/components/system/contexts/ToastContext';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid: { label: 'שולם', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAID: { label: 'שולם', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'ממתין', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING: { label: 'ממתין', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'באיחור', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  OVERDUE: { label: 'באיחור', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  draft: { label: 'טיוטה', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  DRAFT: { label: 'טיוטה', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  cancelled: { label: 'בוטל', className: 'bg-slate-50 text-slate-400 border-slate-200' },
};

function getStatusBadge(status: string) {
  const s = STATUS_MAP[status] || { label: status || '—', className: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black border ${s.className}`}>
      {s.label}
    </span>
  );
}

function getStatusLabel(status: string): string {
  return STATUS_MAP[status]?.label || status || '—';
}

function exportInvoicesCSV(invoices: FinanceInvoice[]) {
  const BOM = '\uFEFF';
  const header = ['מספר', 'לקוח', 'תאריך', 'לתשלום עד', 'סכום', 'סטטוס'];
  const rows = invoices.map((inv) => [
    inv.number || inv.id,
    inv.clientName || '',
    inv.date || '',
    inv.dueDate || '',
    String(Number(inv.amount || 0)),
    getStatusLabel(inv.status),
  ]);
  const csv = BOM + [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanceInvoicesClient(props: { invoices: FinanceInvoice[] }) {
  const invoices = Array.isArray(props.invoices) ? props.invoices : [];
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const { addToast } = useToast();

  const handleCreateSuccess = useCallback((url: string) => {
    addToast('חשבונית נוצרה בהצלחה!', 'success');
    setIsCreateOpen(false);
    setShowClientForm(false);
    setClientName('');
    setClientEmail('');
    if (url) window.open(url, '_blank');
  }, [addToast]);

  const handleStartCreate = () => {
    setShowClientForm(true);
  };

  const handleClientSubmit = () => {
    if (!clientName.trim()) return;
    setShowClientForm(false);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">חשבוניות</h2>
          <p className="text-sm font-bold text-slate-500 mt-1">רשימת כל החשבוניות בארגון</p>
        </div>
        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <button
              onClick={() => exportInvoicesCSV(invoices)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition-colors"
            >
              <Download size={14} />
              ייצוא CSV
            </button>
          )}
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus size={14} />
            צור חשבונית
          </button>
        </div>
      </div>

      {/* Client Name Pre-Form */}
      {showClientForm && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-4">פרטי לקוח לחשבונית</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">שם לקוח *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="שם הלקוח או החברה"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onKeyDown={(e) => e.key === 'Enter' && handleClientSubmit()}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 mb-1.5">אימייל (אופציונלי)</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                onKeyDown={(e) => e.key === 'Enter' && handleClientSubmit()}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleClientSubmit}
              disabled={!clientName.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              המשך ליצירת חשבונית
            </button>
            <button
              onClick={() => { setShowClientForm(false); setClientName(''); setClientEmail(''); }}
              className="px-4 py-2 rounded-xl text-slate-500 text-xs font-black hover:bg-slate-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {invoices.length === 0 && !showClientForm ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="text-amber-600" size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">אין חשבוניות עדיין</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
            צרו חשבונית ראשונה או חברו אינטגרציה (Morning / חשבונית ירוקה).
          </p>
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors"
          >
            <Plus size={16} />
            צור חשבונית ראשונה
          </button>
        </div>
      ) : invoices.length > 0 ? (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-slate-900">#{inv.number || inv.id}</div>
                  {getStatusBadge(inv.status)}
                </div>
                {inv.clientName && (
                  <div className="text-sm text-slate-700">{inv.clientName}</div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">{inv.date || '—'}</div>
                  <div className="text-lg font-black text-slate-900">₪{Number(inv.amount || 0).toLocaleString('he-IL')}</div>
                </div>
                {inv.downloadUrl && (
                  <a
                    href={inv.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black hover:bg-indigo-100 transition-colors"
                  >
                    <ExternalLink size={14} />
                    פתח חשבונית
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">מספר</th>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">לקוח</th>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">תאריך</th>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">לתשלום עד</th>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">סכום</th>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">סטטוס</th>
                    <th className="px-5 py-3.5 text-xs font-black text-slate-600">קובץ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-black text-slate-900">{inv.number || inv.id}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-700">{inv.clientName || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{inv.date || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{inv.dueDate || '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-black text-slate-900">₪{Number(inv.amount || 0).toLocaleString('he-IL')}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(inv.status)}</td>
                      <td className="px-5 py-3.5 text-sm">
                        {inv.downloadUrl ? (
                          <a
                            href={inv.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black hover:bg-indigo-100 transition-colors"
                          >
                            <ExternalLink size={14} />
                            פתח
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                            <FileText size={14} />
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setClientName(''); setClientEmail(''); }}
        onSuccess={handleCreateSuccess}
        clientName={clientName}
        clientEmail={clientEmail || undefined}
      />
    </div>
  );
}
