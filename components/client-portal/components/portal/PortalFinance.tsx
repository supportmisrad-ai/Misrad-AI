import React from 'react';
import { Wallet, CreditCard, Zap, Loader2, Receipt, Download, ShieldCheck, FileText, ExternalLink } from 'lucide-react';

interface PortalFinanceProps {
  client: any;
  isPaying: boolean;
  onSimulatePayment: () => void;
}

export const PortalFinance: React.FC<PortalFinanceProps> = ({ client, isPaying, onSimulatePayment }) => {
  return (
    <div className="animate-slide-up space-y-12 max-w-5xl mx-auto">
      <header>
        <div className="flex items-center gap-2 text-nexus-accent mb-2">
          <Wallet size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">Financial Portal</span>
        </div>
        <h2 className="text-4xl font-display font-bold text-slate-900">פיננסים והסכמים</h2>
        <p className="text-slate-500 mt-2 text-lg">ניהול חשבונות, תשלומים וחוזים במקום אחד.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl h-full flex flex-col">
            <div className="absolute top-0 right-0 w-48 h-48 bg-nexus-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 space-y-8 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">ריטיינר נוכחי</span>
                  <h3 className="text-3xl font-display font-black text-white">₪{client.monthlyRetainer.toLocaleString()}</h3>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-nexus-accent">
                  <CreditCard size={24} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">מועד חידוש:</span>
                  <span className="font-bold text-white">{client.nextRenewal}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">סטטוס מנוי:</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold">פעיל</span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">בנק שעות</h4>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">
                    {client.hoursLogged} <span className="text-sm text-slate-500 font-normal">שעות נוצלו</span>
                  </span>
                  <span className="text-xs text-slate-400">מתוך 60 שעות</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-nexus-accent h-full rounded-full" style={{ width: `${(client.hoursLogged / 60) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10">
              <button
                onClick={onSimulatePayment}
                disabled={isPaying}
                className="w-full py-4 bg-nexus-accent text-slate-900 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                {isPaying ? <Loader2 className="animate-spin" /> : <><Zap size={18} fill="currentColor" /> שלם עכשיו (QuickPay)</>}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2">
            <Receipt size={22} className="text-nexus-accent" /> חשבוניות אחרונות
          </h3>

          <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">מספר</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">תאריך</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">סכום</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">סטטוס</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {client.invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 font-mono text-sm font-bold">{inv.number}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">{inv.date}</td>
                    <td className="px-6 py-5 font-bold">₪{inv.amount.toLocaleString()}</td>
                    <td className="px-6 py-5">
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                          inv.status === 'PAID'
                            ? 'bg-green-50 text-green-600 border-green-100'
                            : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                        }`}
                      >
                        {inv.status === 'PAID' ? 'שולם' : 'ממתין'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-left">
                      <button className="p-2 text-slate-300 hover:text-nexus-primary transition-colors">
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-6">
            <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2 mb-4">
              <ShieldCheck size={22} className="text-blue-500" /> כספת הסכמים (Legal)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.agreements?.map((ag: any) => (
                <div
                  key={ag.id}
                  className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{ag.title}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">נחתם ב-{ag.signedDate}</span>
                    </div>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                    <ExternalLink size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
