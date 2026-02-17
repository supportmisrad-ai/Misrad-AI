'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SquareActivity, ShieldCheck, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SystemTabProps {
  apiHealth: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
  onPrevAuditPage?: () => void;
  onNextAuditPage?: () => void;
  disablePrevAudit?: boolean;
  disableNextAudit?: boolean;
}

export default function SystemTab({
  apiHealth,
  auditLog,
  onPrevAuditPage,
  onNextAuditPage,
  disablePrevAudit,
  disableNextAudit,
}: SystemTabProps) {
  return (
    <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-8 shadow-md">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">חיבורים חיצוניים <SquareActivity className="text-emerald-500" size={24}/></h3>
        <div className="flex flex-col gap-4">
          {(apiHealth.length > 0 ? apiHealth : [
            { name: 'מערכת תשלומים', status: 'תקין', latency: '132ms' },
            { name: 'ממשק מורנינג/חשבונית ירוקה', status: 'תקין', latency: '210ms' },
            { name: 'ממשק וואטסאפ', status: 'תקין', latency: '45ms' },
            { name: 'ממשק גוגל לעסקים', status: 'תקין', latency: '89ms' },
            { name: 'ממשק טיקטוק עסקי', status: 'תחזוקה', latency: '-' },
            { name: 'מנוע בינה מלאכותית (Gemini)', status: 'תקין', latency: '420ms' },
            { name: 'שער תשתית Social', status: 'תקין', latency: '12ms' },
          ]).map((api, i) => (
            <div key={i} className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${api.status === 'תקין' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : api.status === 'תחזוקה' ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                <span className="font-black text-slate-700">{String(api.name)}</span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-500 uppercase">{String(api.status)}</p>
                <p className="text-xs font-black text-slate-900">{String(api.latency)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-8 shadow-md">
        <h3 className="text-xl font-black text-slate-900">אירועי מערכת</h3>
        <div className="flex gap-2 justify-end">
          <Button
            onClick={onPrevAuditPage}
            disabled={disablePrevAudit}
            variant="outline"
            size="sm"
            className="h-9"
          >
            הקודם
          </Button>
          <Button
            onClick={onNextAuditPage}
            disabled={disableNextAudit}
            variant="outline"
            size="sm"
            className="h-9"
          >
            הבא
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {(auditLog.length > 0 ? auditLog.map((log) => {
            const action = String(log.action ?? '');
            const user = String(log.user ?? '');
            const time = String(log.time ?? '');
            return {
              action,
              user,
              time,
              icon: action.includes('חסימה') ? Lock : action.includes('התחברות') ? ShieldCheck : Zap,
              color: action.includes('חסימה') ? 'text-rose-500' : action.includes('התחברות') ? 'text-indigo-500' : 'text-amber-500',
              bgColor: action.includes('חסימה') ? 'bg-rose-50' : action.includes('התחברות') ? 'bg-indigo-50' : 'bg-amber-50',
            };
          }) : []).map((log, i) => {
            const Icon = log.icon;
            return (
              <div key={i} className="flex items-center gap-6 p-4 border-b border-indigo-100 last:border-0 group hover:bg-indigo-50/50 rounded-xl transition-colors">
                <div className={`p-3 ${log.bgColor || 'bg-indigo-50'} rounded-xl ${log.color}`}>
                  <Icon size={18}/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{log.action}</p>
                  <p className="text-[10px] font-bold text-slate-500">{log.user} • {log.time}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] font-black text-slate-400 group-hover:text-indigo-600 uppercase"
                >
                  פרטים
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

