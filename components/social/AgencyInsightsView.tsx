'use client';

import React, { useState } from 'react';
import { TrendingUp, DollarSign, Users, Zap, Sparkles, Wallet } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getGlobalAgencyAuditAction } from '@/app/actions/ai-actions';
import { Skeleton, SkeletonGrid } from '@/components/ui/skeletons';

export default function AgencyInsightsView() {
  const { clients, team, addToast } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [auditText, setAuditText] = useState<string | null>(null);

  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  const totalMinutes = clients.reduce((sum, c) => sum + (c.businessMetrics.timeSpentMinutes || 0), 0);
  const totalStaffCost = team.reduce((sum, m) => sum + (m.monthlySalary || (m.hourlyRate || 0) * 160), 0);
  const netProfit = totalRevenue - totalStaffCost;

  const handleRunAudit = async () => {
    setIsAnalyzing(true);
    const result = await getGlobalAgencyAuditAction(clients, team);
    setAuditText(result);
    setIsAnalyzing(false);
    addToast('ניתוח ה-AI הסתיים בהצלחה!');
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 md:gap-10 pb-20 animate-in fade-in" dir="rtl">
      <section className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 md:p-10 rounded-3xl text-white shadow-lg relative overflow-hidden group">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="flex flex-col gap-3 md:gap-4 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="p-2 bg-indigo-400 rounded-xl shadow-lg border border-indigo-300"><Sparkles size={18} className="text-white"/></div>
              <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest drop-shadow-sm">מערכת ניתוח עסקית AI</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white drop-shadow-lg">מרכז השליטה של המנהל</h2>
            <p className="text-sm text-white font-bold leading-relaxed drop-shadow-md">
              ניתוח בזמן אמת של רווחיות, עלויות שכר ותפוקה בכלל המשרד.
            </p>
            <button
              onClick={handleRunAudit}
              disabled={isAnalyzing}
              className="bg-white text-slate-900 py-3 rounded-xl font-black text-sm shadow-md flex items-center justify-center gap-2 w-full md:w-auto hover:bg-indigo-50 transition-all"
            >
              <Zap size={18} className={isAnalyzing ? 'opacity-60' : undefined} />
              {isAnalyzing ? 'Gemini מנתח נתונים...' : 'עדכן ניתוח AI פיננסי'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'הכנסה גולמית', val: `₪${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-white' },
              { label: 'עלויות שכר/צוות', val: `₪${totalStaffCost.toLocaleString()}`, icon: Wallet, color: 'text-rose-300' },
              { label: 'רווח נקי מוערך', val: `₪${netProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-300' },
              { label: 'לקוחות פעילים', val: clients.length, icon: Users, color: 'text-indigo-300' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/15 border border-white/30 p-4 rounded-xl flex flex-col gap-2 backdrop-blur-sm shadow-md">
                <stat.icon className={stat.color} size={16}/>
                <div>
                  <p className="text-[9px] font-black text-white/80 uppercase drop-shadow-sm">{stat.label}</p>
                  <p className={`text-lg font-black ${stat.color} drop-shadow-md`}>{stat.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[56px] border-2 border-slate-200 shadow-xl flex flex-col gap-6 md:gap-8">
        <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">המלצות ותובנות AI <Sparkles className="text-blue-600" size={24}/></h3>
        <div className="bg-slate-50 p-6 md:p-10 rounded-2xl md:rounded-[40px] border border-slate-200 italic text-base md:text-xl font-bold text-slate-700 leading-relaxed shadow-inner">
          {isAnalyzing ? (
            <div className="flex flex-col gap-6" dir="rtl">
              <div className="flex items-center justify-center">
                <Skeleton className="w-10 h-10 rounded-full bg-blue-200/60" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-[85%] rounded-2xl" />
                <Skeleton className="h-5 w-[92%] rounded-2xl" />
                <Skeleton className="h-5 w-[78%] rounded-2xl" />
              </div>
              <div className="bg-white/60 rounded-3xl border border-slate-200 p-6">
                <SkeletonGrid cards={2} columns={2} />
              </div>
            </div>
          ) : auditText || 'לחץ על עדכן ניתוח כדי לקבל תובנות על הרווחיות האמיתית של המשרד.'}
        </div>
      </div>
    </div>
  );
}

