'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Trash2 } from 'lucide-react';
import { createBackup, runSystemCleanup } from '@/app/actions/admin-maintenance';
import { Button } from '@/components/ui/button';

interface MaintenanceTabProps {
  maintenanceInfo: any;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function MaintenanceTab({ maintenanceInfo, onRefresh, addToast }: MaintenanceTabProps) {
  return (
    <motion.div key="maintenance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">תחזוקה</h3>
            <p className="text-sm text-slate-600">גיבויים, עדכונים, הגדרות מערכת</p>
          </div>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-8">
            {/* System Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-sm font-black text-slate-600 mb-1">גרסת מערכת</p>
                <p className="text-2xl font-black text-indigo-600">{maintenanceInfo?.systemVersion || 'v2.4.12-admin'}</p>
              </div>
              <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-sm font-black text-slate-600 mb-1">גודל בסיס נתונים</p>
                <p className="text-2xl font-black text-purple-600">{maintenanceInfo?.databaseSize || 'לא זמין'}</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm font-black text-slate-600 mb-1">גיבוי אחרון</p>
                <p className="text-lg font-black text-emerald-600">
                  {maintenanceInfo?.lastBackup 
                    ? new Date(maintenanceInfo.lastBackup).toLocaleString('he-IL')
                    : 'מעולם לא'}
                </p>
              </div>
              <div className="p-6 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm font-black text-slate-600 mb-1">זמן פעילות</p>
                <p className="text-lg font-black text-amber-600">
                  {maintenanceInfo?.uptime 
                    ? `${Math.floor(maintenanceInfo.uptime / (24 * 60 * 60 * 1000))} ימים`
                    : '7 ימים'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <h4 className="text-xl font-black text-slate-900">פעולות תחזוקה</h4>
              
              <Button
                type="button"
                onClick={async () => {
                  if (confirm('האם אתה בטוח שברצונך ליצור גיבוי? זה עלול לקחת כמה דקות.')) {
                    const result = await createBackup();
                    if (result.success) {
                      addToast('גיבוי נוצר בהצלחה', 'success');
                      onRefresh();
                    } else {
                      addToast(result.error || 'שגיאה ביצירת גיבוי', 'error');
                    }
                  }
                }}
                variant="outline"
                className="w-full h-auto p-6 bg-indigo-50 hover:bg-indigo-100 rounded-xl border-indigo-200 text-right transition-all justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900 mb-1">יצירת גיבוי</p>
                    <p className="text-sm text-slate-600">צור גיבוי מלא של בסיס הנתונים</p>
                  </div>
                  <RefreshCw size={24} className="text-indigo-600" />
                </div>
              </Button>

              <Button
                type="button"
                onClick={async () => {
                  if (confirm('האם אתה בטוח שברצונך להריץ ניקוי מערכת? זה ימחק רשומות ישנות (מעל 90 יום).')) {
                    const result = await runSystemCleanup();
                    if (result.success) {
                      addToast(`ניקוי הושלם: נמחקו ${result.cleanedItems || 0} רשומות`, 'success');
                    } else {
                      addToast(result.error || 'שגיאה בניקוי מערכת', 'error');
                    }
                  }
                }}
                variant="outline"
                className="w-full h-auto p-6 bg-purple-50 hover:bg-purple-100 rounded-xl border-purple-200 text-right transition-all justify-between"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900 mb-1">ניקוי מערכת</p>
                    <p className="text-sm text-slate-600">מחק רשומות ישנות (מעל 90 יום)</p>
                  </div>
                  <Trash2 size={24} className="text-purple-600" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

