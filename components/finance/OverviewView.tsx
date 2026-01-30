'use client';

import React from 'react';
import { TrendingUp, DollarSign, FileText, AlertCircle } from 'lucide-react';

const OverviewView: React.FC<{ initialFinanceOverview?: any }> = ({ initialFinanceOverview }) => {
  const totalRevenue = Number(initialFinanceOverview?.totalRevenue || 0);
  const totalCost = Number(initialFinanceOverview?.totalCost || 0);
  const netProfit = Number(initialFinanceOverview?.netProfit || 0);
  const openInvoicesCount = Number(initialFinanceOverview?.openInvoicesCount || 0);
  const pendingReceivables = Number(initialFinanceOverview?.pendingReceivables || 0);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">סקירה כספית</h2>
          <p className="text-slate-500">מבט כללי על המצב הכספי</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-emerald-600" size={24} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">₪{totalRevenue.toFixed(0)}</div>
            <div className="text-sm text-slate-500">הכנסות החודש</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">₪{totalCost.toFixed(0)}</div>
            <div className="text-sm text-slate-500">הוצאות החודש</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <FileText className="text-amber-600" size={24} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{openInvoicesCount.toFixed(0)}</div>
            <div className="text-sm text-slate-500">חשבוניות פתוחות</div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="text-rose-600" size={24} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">₪{pendingReceivables.toFixed(0)}</div>
            <div className="text-sm text-slate-500">ממתין לתשלום</div>
          </div>
        </div>

        {/* Placeholder Message */}
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <TrendingUp className="mx-auto mb-4 text-emerald-500" size={48} />
          <h3 className="text-xl font-bold text-slate-900 mb-2">ברוכים הבאים ל-Finance</h3>
          <p className="text-slate-500 mb-6">חברו אינטגרציה כדי להתחיל לנהל את הכספים שלכם</p>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            חיבור אינטגרציה
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewView;

