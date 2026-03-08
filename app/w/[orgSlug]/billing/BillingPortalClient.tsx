'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  FileText,
  Download,
  ExternalLink,
  CircleCheck,
  CircleAlert,
  Clock,
  Calendar,
  Receipt,
  Wallet,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MyBillingData, BillingInvoice } from '@/app/actions/my-billing';
import { getMyBillingData } from '@/app/actions/my-billing';

interface BillingPortalClientProps {
  billingData: MyBillingData | null;
  orgSlug: string;
}

const STATUS_MAP = {
  trial: { label: 'תקופת ניסיון', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  active: { label: 'פעיל', color: 'bg-green-100 text-green-700 border-green-200', icon: CircleCheck },
  past_due: { label: 'תשלום באיחור', color: 'bg-red-100 text-red-700 border-red-200', icon: CircleAlert },
  cancelled: { label: 'בוטל', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: CircleAlert },
} as const;

const INVOICE_STATUS_MAP = {
  pending: { label: 'ממתין לתשלום', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'שולם', color: 'bg-green-50 text-green-700 border-green-200' },
  overdue: { label: 'באיחור', color: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'בוטל', color: 'bg-gray-50 text-gray-500 border-gray-200' },
} as const;

function InvoiceRow({ invoice }: { invoice: BillingInvoice }) {
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">נשלח למייל</p>
              <p className={`font-bold ${invoice.emailSent ? 'text-green-600' : 'text-gray-500'}`}>
                {invoice.emailSent ? 'כן ✓' : 'לא'}
              </p>
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

export default function BillingPortalClient({ billingData: initialData, orgSlug }: BillingPortalClientProps) {
  const [billingData, setBillingData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await getMyBillingData(orgSlug);
      if (result.success && result.data) {
        setBillingData(result.data);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (!billingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-sm">
          <CircleAlert className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">לא נמצאו נתוני חיוב</p>
          <p className="text-sm text-gray-400 mt-1">צור קשר עם התמיכה</p>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[billingData.subscriptionStatus] ?? STATUS_MAP.trial;
  const StatusIcon = statusInfo.icon;

  const pendingInvoices = billingData.invoices.filter((inv) => inv.status === 'pending');
  const paidInvoices = billingData.invoices.filter((inv) => inv.status === 'paid');
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">חיוב ותשלומים</h1>
            <p className="text-gray-500 mt-1">{billingData.organizationName}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subscription Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500">סטטוס מנוי</p>
              <StatusIcon className={`w-5 h-5 ${billingData.subscriptionStatus === 'active' ? 'text-green-600' : 'text-amber-500'}`} />
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {billingData.nextBillingDate && (
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                חידוש: {new Date(billingData.nextBillingDate).toLocaleDateString('he-IL')}
              </p>
            )}
          </div>

          {/* Current Balance */}
          <div className={`rounded-2xl border-2 shadow-sm p-6 ${
            billingData.balance >= 0
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500">יתרה נוכחית</p>
              <Wallet className={`w-5 h-5 ${billingData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <p className={`text-3xl font-black ${billingData.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ₪{billingData.balance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {billingData.balance >= 0 ? '✅ זכות בחשבון' : '⚠️ יתרת חוב'}
            </p>
          </div>

          {/* MRR */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500">תשלום חודשי</p>
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">
              ₪{billingData.mrr.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
            </p>
            {billingData.billingCycle && (
              <p className="text-xs text-gray-400 mt-2">
                {billingData.billingCycle === 'monthly' ? 'חיוב חודשי' : 'חיוב שנתי'}
              </p>
            )}
          </div>

          {/* Total Paid */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500">סה״כ שולם</p>
              <Wallet className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">
              ₪{totalPaid.toLocaleString('he-IL', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-400 mt-2">{paidInvoices.length} חשבוניות שולמו</p>
          </div>
        </div>

        {/* Billing Email */}
        {billingData.billingEmail && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <Mail className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500">חשבוניות נשלחות למייל</p>
              <p className="text-sm font-bold text-gray-800">{billingData.billingEmail}</p>
            </div>
          </div>
        )}

        {/* Pending Invoices - featured */}
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
              היסטוריית חשבוניות
              <span className="text-sm font-medium text-gray-400">({billingData.invoices.length})</span>
            </h2>
          </div>

          {billingData.invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">אין חשבוניות עדיין</p>
              <p className="text-sm text-gray-400 mt-1">חשבוניות יופיעו כאן לאחר שיישלחו</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {billingData.invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </div>

        {/* Support Note */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            שאלות לגבי החיוב?{' '}
            <a href="mailto:billing@misrad-ai.com" className="text-blue-600 hover:underline font-medium">
              billing@misrad-ai.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
