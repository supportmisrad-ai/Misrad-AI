'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { updateFeatureFlags } from '@/app/actions/admin-cockpit';

interface FlagsTabProps {
  featureFlags: any;
  setFeatureFlags: (flags: any) => void;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function FlagsTab({ featureFlags, setFeatureFlags, onRefresh, addToast }: FlagsTabProps) {
  return (
    <motion.div key="flags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">הגדרות מערכת</h3>
            <p className="text-sm text-slate-600">שליטה במערכת בלי לגעת בקוד</p>
          </div>
        </div>
        <div className="p-10 flex flex-col gap-8">
          <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <div>
              <h4 className="font-black text-slate-900 mb-1">מצב תחזוקה (Maintenance Mode)</h4>
              <p className="text-sm text-slate-600">כפתור שמוריד את האתר ומציג הודעת "משדרגים" לכולם</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.maintenanceMode || false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ maintenanceMode: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'מצב תחזוקה הופעל' : 'מצב תחזוקה בוטל', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-6 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <h4 className="font-black text-slate-900 mb-1">הפעל AI (Toggle AI)</h4>
              <p className="text-sm text-slate-600">אם נגמר התקציב ב-Gemini או שיש באג, אתה מכבה את ה-AI לכולם</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.aiEnabled !== false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ aiEnabled: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'AI הופעל' : 'AI בוטל', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="font-black text-slate-900 mb-4">הודעה מתפרצת (Banner)</h4>
            <p className="text-sm text-slate-600 mb-4">שדה טקסט שבו אתה כותב הודעה שמופיעה לכל המשתמשים בראש המסך</p>
            <textarea
              value={featureFlags?.bannerMessage || ''}
              onChange={(e) => {
                setFeatureFlags((prev: any) => ({ ...prev, bannerMessage: e.target.value }));
              }}
              onBlur={async (e) => {
                const result = await updateFeatureFlags({ bannerMessage: e.target.value || null });
                if (result.success) {
                  addToast('הודעה עודכנה', 'success');
                }
              }}
              placeholder="לדוגמה: שימו לב! פיצ'ר חדש עלה..."
              className="w-full p-4 bg-white border border-blue-200 rounded-xl text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 resize-none"
              rows={3}
            />
            <button
              onClick={async () => {
                const result = await updateFeatureFlags({ bannerMessage: null });
                if (result.success) {
                  addToast('הודעה נמחקה', 'success');
                  onRefresh();
                }
              }}
              className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg font-black text-sm hover:bg-rose-600 transition-all"
            >
              מחק הודעה
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

