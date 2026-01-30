'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationsTabProps {
  notificationHistory: any[];
  onSendNotification: () => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
}

export default function NotificationsTab({
  notificationHistory,
  onSendNotification,
  onPrevPage,
  onNextPage,
  disablePrev,
  disableNext,
}: NotificationsTabProps) {
  return (
    <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">התראות</h3>
            <p className="text-sm text-slate-600">שליחת התראות למשתמשים ולקוחות</p>
          </div>
          <Button
            onClick={onSendNotification}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl font-black text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"
          >
            שליחה חדשה
          </Button>
        </div>
        <div className="p-10">
          <div className="flex flex-col gap-6">
            <h4 className="text-xl font-black text-slate-900">היסטוריית התראות</h4>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={onPrevPage}
                disabled={disablePrev}
                variant="outline"
                size="sm"
                className="h-9"
              >
                הקודם
              </Button>
              <Button
                onClick={onNextPage}
                disabled={disableNext}
                variant="outline"
                size="sm"
                className="h-9"
              >
                הבא
              </Button>
            </div>
            <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
              {notificationHistory.length > 0 ? (
                notificationHistory.map((notif: any, i: number) => (
                  <div key={i} className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-black text-slate-900 mb-1">{notif.title || notif.action || 'התראה'}</p>
                        <p className="text-sm text-slate-600 mb-2">{notif.message || notif.action || ''}</p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {new Date(notif.created_at).toLocaleString('he-IL')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                        notif.type === 'error' ? 'bg-rose-100 text-rose-700' :
                        notif.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                        notif.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {notif.type || 'info'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-indigo-300 mx-auto mb-2" />
                  <p className="text-slate-600 font-bold">אין התראות</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

