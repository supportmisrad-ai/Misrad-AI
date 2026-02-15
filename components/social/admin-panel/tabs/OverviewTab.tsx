'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Users, ShieldCheck, Cpu } from 'lucide-react';
import type { GlobalSystemMetrics } from '@/types/social';

interface OverviewTabProps {
  metrics: GlobalSystemMetrics & { trends?: Record<string, unknown> };
}

export default function OverviewTab({ metrics }: OverviewTabProps) {
  return (
    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-10 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {[
          { 
            label: 'הכנסה חודשית חוזרת (MRR)', 
            val: `₪${(metrics?.totalMRR || 0).toLocaleString()}`, 
            trend: metrics?.trends?.mrr ? `${Number(metrics.trends.mrr) > 0 ? '+' : ''}${metrics.trends.mrr}%` : '+0%', 
            icon: Wallet, 
            color: 'text-green-400' 
          },
          { 
            label: 'מינויים פעילים', 
            val: metrics?.activeSubscriptions || 0, 
            trend: metrics?.trends?.subscriptions ? `${Number(metrics.trends.subscriptions) > 0 ? '+' : ''}${metrics.trends.subscriptions}` : '+0', 
            icon: Users, 
            color: 'text-blue-400' 
          },
          { 
            label: 'חובות פתוחים', 
            val: metrics?.overdueInvoicesCount || 0, 
            trend: metrics?.trends?.overdue ? `${Number(metrics.trends.overdue) > 0 ? '+' : ''}${metrics.trends.overdue}%` : '0%', 
            icon: ShieldCheck, 
            color: 'text-red-400' 
          },
          { 
            label: 'ניצול בינה מלאכותית', 
            val: `${((metrics?.geminiTokenUsage || 0) / 1000000).toFixed(1)}M`, 
            trend: '+12%', 
            icon: Cpu, 
            color: 'text-purple-400' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-8 rounded-3xl flex flex-col gap-4 relative overflow-hidden group shadow-md hover:shadow-xl transition-all">
            <div className="flex items-center justify-between relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 ${String(stat.color ?? '').replace('text-', 'text-').replace('green-400', 'emerald-500').replace('blue-400', 'indigo-500').replace('red-400', 'rose-500').replace('purple-400', 'purple-500')}`}>
                <stat.icon size={24}/>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>{stat.trend}</span>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stat.val}</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

