'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  CircleCheck,
  CircleAlert,
  CreditCard,
  Building2,
  Mail,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import type { BusinessClientInvoice } from '@/app/actions/business-client-billing';

interface BusinessClientBillingPortalProps {
  businessClientId: string;
  businessClientName: string;
  organizationName: string;
  invoices: BusinessClientInvoice[];
  token: string;
}

const INVOICE_STATUS_MAP = {
  pending: { label: 'ממתין לתשלום', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'שולם', color: 'bg-green-50 text-green-700 border-green-200' },
  overdue: { label: 'באיחור', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'בוטל', color: 'bg-gray-50 text-gray-500 border-gray-200' },
} as const;

function InvoiceRow({ invoice }: { invoice: BusinessClientInvoice }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = INVOICE_STATUS_MAP[invoice.status] ?? INVOICE_STATUS_MAP.pending;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm">חשבונית #{invoice.invoiceNumber}</p>
            {invoice.description && (
              <p className="text-xs text-gray-500 truncate max-w-xs">{invoice.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-black text-gray-900">
            ₪{invoice.amount.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
          </span>
          <span className={`px-2 py-0.5 text-xs font-bold border rounded-lg ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(invoice.createdAt).toLocaleDateString('he-IL')}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">תאריך לתשלום</p>
                <p className="font-bold text-gray-800">{new Date(invoice.dueDate).toLocaleDateString('he-IL')}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">שולם ב</p>
                <p className="font-bold text-gray-800">{new Date(invoice.paidAt).toLocaleDateString('he-IL')}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">מטבע</p>
              <p className="font-bold text-gray-800">{invoice.currency}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {invoice.paymentUrl && invoice.status === 'pending' && (
              <a
                href={invoice.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                תשלום עכשיו
              </a>
            )}
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-300 transition-colors"
              >
                <Download className="w-4 h-4" />
                הורדת PDF
              </a>
            )}
            {invoice.invoiceUrl && !invoice.pdfUrl && (
              <a
                href={invoice.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                צפייה בחשבונית
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BusinessClientBillingPortal({
  businessClientName,
  organizationName,
  invoices,
}: BusinessClientBillingPortalProps) {
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-gray-900 mb-1">פורטל חשבוניות</h1>
              <p className="text-lg font-bold text-blue-600">{businessClientName}</p>
              <p className="text-sm text-gray-500 mt-1">ספק: {organizationName}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-500">סה"כ חשבוניות</p>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-black text-gray-900">{invoices.length}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-500">ממתין לתשלום</p>
              <CircleAlert className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-amber-600">{pendingInvoices.length}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-500">סה"כ שולם</p>
              <CircleCheck className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-black text-green-600">
              ₪{totalPaid.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Pending Invoices Alert */}
        {pendingInvoices.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-black text-amber-900 flex items-center gap-2">
              <CircleAlert className="w-5 h-5 text-amber-600" />
              ממתין לתשלום ({pendingInvoices.length})
            </h2>
            <div className="space-y-3">
              {pendingInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-xl border border-amber-200 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">חשבונית #{invoice.invoiceNumber}</p>
                      {invoice.description && (
                        <p className="text-xs text-gray-500 truncate">{invoice.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-gray-900">₪{invoice.amount.toLocaleString()}</span>
                    {invoice.paymentUrl && (
                      <a
                        href={invoice.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors whitespace-nowrap"
                      >
                        שלם עכשיו
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              כל החשבוניות
              <span className="text-sm font-medium text-gray-400">({invoices.length})</span>
            </h2>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">אין חשבוניות להצגה</p>
              <p className="text-sm text-gray-400 mt-1">חשבוניות יופיעו כאן לאחר שיישלחו</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Mail className="w-4 h-4" />
            <span>שאלות? צור קשר:</span>
            <a href="mailto:billing@misrad-ai.com" className="text-blue-600 hover:underline font-medium">
              billing@misrad-ai.com
            </a>
          </div>
          <p className="text-xs text-gray-400">
            פורטל מאובטח ומוצפן. קישור תקף ל-7 ימים.
          </p>
        </div>
      </div>
    </div>
  );
}
