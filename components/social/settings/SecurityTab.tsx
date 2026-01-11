'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface SecurityTabProps {
  onNotify: (msg: string) => void;
}

export default function SecurityTab({ onNotify }: SecurityTabProps) {
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    onNotify('הסיסמה עודכנה בהצלחה!');
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800">אבטחה וסיסמה</h2>
      </div>
      <div className="bg-white p-12 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-10 max-w-lg">
        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase mr-2">סיסמה נוכחית</label>
            <input type="password" placeholder="••••••••" className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 ring-blue-50" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase mr-2">סיסמה חדשה</label>
            <input type="password" placeholder="••••••••" className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 ring-blue-50" />
          </div>
          <button type="submit" className="bg-slate-900 text-white py-5 rounded-[24px] font-black shadow-xl hover:bg-black transition-all">עדכן סיסמה</button>
        </form>
        <div className="flex items-center gap-4 p-6 bg-green-50 rounded-[28px] border border-green-100 text-green-700">
          <ShieldCheck size={24} />
          <p className="text-xs font-bold">חשבונך מאובטח עם אימות דו-שלבי פעיל.</p>
        </div>
      </div>
    </motion.div>
  );
}

