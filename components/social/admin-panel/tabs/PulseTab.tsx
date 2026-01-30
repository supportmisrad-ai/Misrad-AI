'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Users, Wallet, Cpu, AlertCircle, ShieldCheck, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PulseTabProps {
  liveKPIs: any;
  metrics: any;
}

export default function PulseTab({ liveKPIs, metrics }: PulseTabProps) {
  return (
    <motion.div key="pulse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {[
          { 
            label: 'משתמשים נרשמו היום', 
            val: liveKPIs?.usersRegisteredToday || 0, 
            trend: `+${liveKPIs?.usersRegisteredThisWeek || 0} השבוע`, 
            icon: UserPlus, 
            color: 'text-blue-400' 
          },
          { 
            label: 'לקוחות פעילים (Online)', 
            val: liveKPIs?.activeClientsOnline || 0, 
            trend: 'עכשיו', 
            icon: Users, 
            color: 'text-emerald-400' 
          },
          { 
            label: 'MRR (הכנסה חודשית)', 
            val: `₪${(liveKPIs?.totalMRR || metrics?.totalMRR || 0).toLocaleString()}`, 
            trend: metrics?.trends?.mrr ? `${metrics.trends.mrr > 0 ? '+' : ''}${metrics.trends.mrr}%` : '+0%', 
            icon: Wallet, 
            color: 'text-green-400' 
          },
          { 
            label: 'עלות AI יומית', 
            val: `$${(liveKPIs?.dailyAICost || 0).toFixed(2)}`, 
            trend: `${((metrics?.geminiTokenUsage || 0) / 1000000).toFixed(1)}M טוקנים`, 
            icon: Cpu, 
            color: 'text-purple-400' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-8 rounded-3xl flex flex-col gap-4 relative overflow-hidden group shadow-md hover:shadow-xl transition-all">
            <div className="flex items-center justify-between relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 ${String((stat as any)?.color ?? '').replace('text-', 'text-').replace('green-400', 'emerald-500').replace('blue-400', 'indigo-500').replace('red-400', 'rose-500').replace('purple-400', 'purple-500')}`}>
                <stat.icon size={24}/>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200`}>
                {stat.trend}
              </span>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stat.val}</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-6 shadow-md">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <AlertCircle className="text-rose-500" size={24}/> שגיאות קריטיות
          </h3>
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {(liveKPIs?.criticalErrors || []).length > 0 ? (
              liveKPIs.criticalErrors.map((error: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                  <XCircle className="text-rose-500 flex-shrink-0" size={20}/>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">{error.action || 'שגיאה לא ידועה'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{new Date(error.created_at).toLocaleString('he-IL')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2"/>
                <p className="font-bold">אין שגיאות קריטיות</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-6 shadow-md">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <ShieldCheck className="text-amber-500" size={24}/> התראות אבטחה
          </h3>
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {(liveKPIs?.securityAlerts || []).length > 0 ? (
              liveKPIs.securityAlerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertTriangle className="text-amber-500 flex-shrink-0" size={20}/>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900">{alert.action || 'התראה לא ידועה'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{new Date(alert.created_at).toLocaleString('he-IL')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2"/>
                <p className="font-bold">אין התראות אבטחה</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

