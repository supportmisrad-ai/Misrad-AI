'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Users, Zap, Sparkles, Wallet, Target, Clock, AlertTriangle, ThumbsUp, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getGlobalAgencyAuditAction } from '@/app/actions/ai-actions';
import { Skeleton, SkeletonGrid } from '@/components/ui/skeletons';
import { motion } from 'framer-motion';

export default function AgencyInsightsView() {
  const { clients, team, addToast } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [auditText, setAuditText] = useState<string | null>(null);

  const totalRevenue = clients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
  const totalMinutes = clients.reduce((sum, c) => sum + (c.businessMetrics.timeSpentMinutes || 0), 0);
  const totalStaffCost = team.reduce((sum, m) => sum + (m.monthlySalary || (m.hourlyRate || 0) * 160), 0);
  const netProfit = totalRevenue - totalStaffCost;

  // Lead & Performance KPIs (derived from client data)
  const kpis = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'Active');
    const pendingClients = clients.filter(c => c.status === 'Pending Payment' || c.status === 'Onboarding');
    const overdueClients = clients.filter(c => c.status === 'Overdue');
    const avgMonthlyFee = activeClients.length > 0 ? activeClients.reduce((s, c) => s + (c.monthlyFee || 0), 0) / activeClients.length : 0;
    const avgTimePerClient = activeClients.length > 0 ? totalMinutes / activeClients.length : 0;
    const revenuePerHour = totalMinutes > 0 ? (totalRevenue / (totalMinutes / 60)) : 0;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const conversionRate = clients.length > 0 ? (activeClients.length / clients.length) * 100 : 0;

    return {
      activeClients: activeClients.length,
      pendingClients: pendingClients.length,
      overdueClients: overdueClients.length,
      avgMonthlyFee: Math.round(avgMonthlyFee),
      avgTimePerClient: Math.round(avgTimePerClient),
      revenuePerHour: Math.round(revenuePerHour),
      profitMargin: Math.round(profitMargin),
      conversionRate: Math.round(conversionRate),
      teamSize: team.length,
      clientsPerMember: team.length > 0 ? Math.round(activeClients.length / team.length * 10) / 10 : 0,
    };
  }, [clients, team, totalRevenue, totalMinutes, netProfit]);

  const handleRunAudit = async () => {
    setIsAnalyzing(true);
    const result = await getGlobalAgencyAuditAction(clients, team);
    setAuditText(result);
    setIsAnalyzing(false);
    addToast('ניתוח ה-AI הסתיים בהצלחה!');
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 md:gap-10 pb-20 animate-in fade-in" dir="rtl">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 md:p-10 rounded-3xl md:rounded-[48px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.15),transparent_70%)]"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="flex flex-col gap-3 md:gap-4 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="p-2.5 bg-indigo-500/30 rounded-2xl border border-indigo-400/30"><Sparkles size={20} className="text-indigo-300"/></div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">מערכת ניתוח עסקית AI</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">מרכז השליטה של המנהל</h2>
            <p className="text-sm text-slate-300 font-bold leading-relaxed">
              ניתוח בזמן אמת של רווחיות, ביצועים, לידים ותפוקה.
            </p>
            <button
              onClick={handleRunAudit}
              disabled={isAnalyzing}
              className="bg-white text-slate-900 py-3 px-6 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 w-full md:w-auto hover:bg-indigo-50 transition-all disabled:opacity-60"
            >
              <Zap size={18} />
              {isAnalyzing ? 'Gemini מנתח נתונים...' : 'עדכן ניתוח AI'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'הכנסה גולמית', val: `₪${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-white', trend: '+12%', up: true },
              { label: 'עלויות צוות', val: `₪${totalStaffCost.toLocaleString()}`, icon: Wallet, color: 'text-rose-300', trend: null, up: false },
              { label: 'רווח נקי', val: `₪${netProfit.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-300', trend: `${kpis.profitMargin}%`, up: netProfit > 0 },
              { label: 'לקוחות פעילים', val: kpis.activeClients, icon: Users, color: 'text-indigo-300', trend: null, up: true },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 border border-white/20 p-4 rounded-2xl flex flex-col gap-2 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <stat.icon className={stat.color} size={16}/>
                  {stat.trend && (
                    <span className={`text-[9px] font-black flex items-center gap-0.5 ${stat.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stat.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {stat.trend}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/60 uppercase">{stat.label}</p>
                  <p className={`text-lg font-black ${stat.color}`}>{stat.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance KPIs Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'אחוז סגירה', value: `${kpis.conversionRate}%`, icon: Target, color: 'bg-emerald-50 text-emerald-600', desc: 'מכלל הלקוחות' },
          { label: 'הכנסה לשעה', value: `₪${kpis.revenuePerHour}`, icon: Clock, color: 'bg-blue-50 text-blue-600', desc: 'ממוצע לשעת עבודה' },
          { label: 'לקוחות באיחור', value: kpis.overdueClients, icon: AlertTriangle, color: kpis.overdueClients > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400', desc: 'דורשים טיפול' },
          { label: 'לקוחות ממתינים', value: kpis.pendingClients, icon: ThumbsUp, color: 'bg-amber-50 text-amber-600', desc: 'בתהליך הצטרפות' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${kpi.color}`}>
              <kpi.icon size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs font-black text-slate-600 mt-1">{kpi.label}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{kpi.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Team Efficiency + Client Health */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Efficiency */}
        <div className="bg-white p-8 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart3 size={22} /></div>
            <div>
              <h3 className="text-lg font-black">יעילות הצוות</h3>
              <p className="text-xs font-bold text-slate-400">מדדי תפוקה וניצולת</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'לקוחות לאיש צוות', value: kpis.clientsPerMember, max: 10 },
              { label: 'דקות ממוצעות ללקוח', value: kpis.avgTimePerClient, max: 500 },
              { label: 'שולי רווח', value: kpis.profitMargin, max: 100, suffix: '%' },
            ].map((metric, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-slate-700">{metric.label}</span>
                  <span className="text-sm font-black text-slate-900">{metric.value}{metric.suffix || ''}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((metric.value / metric.max) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className={`h-full rounded-full ${
                      metric.value / metric.max > 0.7 ? 'bg-emerald-500' :
                      metric.value / metric.max > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Health Distribution */}
        <div className="bg-white p-8 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Users size={22} /></div>
            <div>
              <h3 className="text-lg font-black">בריאות לקוחות</h3>
              <p className="text-xs font-bold text-slate-400">התפלגות סטטוסים</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'פעילים', count: kpis.activeClients, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
              { label: 'בהצטרפות', count: kpis.pendingClients, color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
              { label: 'באיחור תשלום', count: kpis.overdueClients, color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
            ].map((status, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl ${status.bgColor}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                  <span className={`text-sm font-black ${status.textColor}`}>{status.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-black ${status.textColor}`}>{status.count}</span>
                  {clients.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      ({Math.round((status.count / clients.length) * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden flex">
              {clients.length > 0 && (
                <>
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(kpis.activeClients / clients.length) * 100}%` }}></div>
                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${(kpis.pendingClients / clients.length) * 100}%` }}></div>
                  <div className="bg-red-500 h-full transition-all" style={{ width: `${(kpis.overdueClients / clients.length) * 100}%` }}></div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AI Insights */}
      <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-6 md:gap-8">
        <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">המלצות ותובנות AI <Sparkles className="text-blue-600" size={24}/></h3>
        <div className="bg-slate-50 p-6 md:p-10 rounded-2xl md:rounded-[32px] border border-slate-200 text-base md:text-lg font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
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
          ) : auditText || 'לחץ על "עדכן ניתוח AI" כדי לקבל תובנות מעמיקות על רווחיות, לידים, התנגדויות ודפוסי ביצועים.'}
        </div>
      </div>
    </div>
  );
}

