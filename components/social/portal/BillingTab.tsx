'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Download } from 'lucide-react';
import { Client, Invoice } from '@/types/social';

interface BillingTabProps {
  client: Client;
  invoices: Invoice[];
  onStartPayment: (amount: number, description: string) => void;
}

const BillingTab: React.FC<BillingTabProps> = ({ client, invoices, onStartPayment }) => {
  return (
    <motion.div key="billing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[24px] flex items-center justify-center"><CreditCard size={32} /></div>
          <div><h3 className="text-xl font-black">אמצעי תשלום</h3><p className="text-slate-400 font-bold">{client.savedCardThumbnail ? `כרטיס: ${client.savedCardThumbnail}` : 'אין כרטיס שמור'}</p></div>
        </div>
        <button onClick={() => onStartPayment(0.1, 'אימות אמצעי תשלום')} className="bg-slate-50 border border-slate-200 px-8 py-4 rounded-2xl font-black text-sm">עדכן אמצעי תשלום</button>
      </div>
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h3 className="text-xl font-black">חשבוניות</h3></div>
        <table className="w-full text-right">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase border-b border-slate-200">
            <tr><th className="px-8 py-4">מספר</th><th className="px-8 py-4">תאריך</th><th className="px-8 py-4">סכום</th><th className="px-8 py-4">סטטוס</th><th className="px-8 py-4"></th></tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50">
                <td className="px-8 py-6 font-black">{inv.id}</td>
                <td className="px-8 py-6 font-bold">{new Date(inv.date).toLocaleDateString('he-IL')}</td>
                <td className="px-8 py-6 font-black">₪{inv.amount.toLocaleString()}</td>
                <td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${inv.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{inv.status === 'paid' ? 'שולם' : 'בפיגור'}</span></td>
                <td className="px-8 py-6 text-left"><button className="text-slate-400 hover:text-blue-600"><Download size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default BillingTab;

