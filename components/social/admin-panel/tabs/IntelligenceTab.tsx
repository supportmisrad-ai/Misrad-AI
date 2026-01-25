'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Brain, MessageSquare, Users, Mail } from 'lucide-react';
import { sendChurnEmail } from '@/app/actions/admin-cockpit';
import { Button } from '@/components/ui/button';

interface IntelligenceTabProps {
  analytics: any;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function IntelligenceTab({ analytics, onRefresh, addToast }: IntelligenceTabProps) {
  return (
    <motion.div key="intelligence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-6 shadow-md">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <TrendingUp className="text-indigo-500" size={24}/> שימוש בפיצ'רים
          </h3>
          <div className="flex flex-col gap-4">
            <div className="p-6 bg-indigo-50 rounded-xl">
              <p className="text-sm font-black text-slate-900 mb-2">כפתורים הכי נלחצים</p>
              <p className="text-xs text-slate-600">נתונים נאספים מלוגי פעילות</p>
              <p className="text-2xl font-black text-indigo-600 mt-2">
                {analytics?.buttonClicks?.length || 0} לחיצות
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-6 shadow-md">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <Brain className="text-purple-500" size={24}/> שביעות רצון מ-AI
          </h3>
          <div className="flex flex-col gap-4">
            <div className="p-6 bg-purple-50 rounded-xl">
              <p className="text-sm font-black text-slate-900 mb-2">שיעור שביעות רצון</p>
              <p className="text-2xl font-black text-purple-600 mt-2">
                {analytics?.aiSatisfaction?.satisfactionRate?.toFixed(1) || 0}%
              </p>
              <div className="flex gap-4 mt-4 text-xs">
                <span className="text-emerald-600 font-black">העתק: {analytics?.aiSatisfaction?.copied || 0}</span>
                <span className="text-rose-600 font-black">נסה שוב: {analytics?.aiSatisfaction?.retried || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-6 shadow-md">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <MessageSquare className="text-blue-500" size={24}/> משוב משתמשים
          </h3>
          <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
            {(analytics?.feedback || []).length > 0 ? (
              analytics.feedback.map((fb: any, i: number) => (
                <div key={i} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm font-black text-slate-900">{fb.message || fb.feedback || 'משוב'}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">
                    {new Date(fb.created_at).toLocaleString('he-IL')}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p className="font-bold">אין משוב</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 p-10 rounded-3xl flex flex-col gap-6 shadow-md">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <Users className="text-rose-500" size={24}/> ניתוח נטישה (Churn)
          </h3>
          <div className="flex flex-col gap-4">
            <div className="p-6 bg-rose-50 rounded-xl">
              <p className="text-sm font-black text-slate-900 mb-2">משתמשים שלא התחברו שבוע</p>
              <p className="text-2xl font-black text-rose-600 mt-2">
                {analytics?.churnedUsers?.length || 0}
              </p>
              <Button
                type="button"
                onClick={async () => {
                  const userIds = analytics?.churnedUsers?.map((u: any) => u.id) || [];
                  if (userIds.length > 0) {
                    const result = await sendChurnEmail(userIds);
                    if (result.success) {
                      addToast(`נשלחו ${userIds.length} מיילים`, 'success');
                    }
                  }
                }}
                className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg font-black text-sm hover:bg-rose-600 transition-all"
              >
                <Mail size={16} className="inline mr-2"/> שלח מייל "מתגעגעים"
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {(analytics?.churnedUsers || []).slice(0, 5).map((user: any, i: number) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg mb-2">
                  <p className="text-sm font-black text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.daysSinceActive} ימים ללא פעילות</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

