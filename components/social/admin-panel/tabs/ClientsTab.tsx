'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Lock, Unlock, Settings } from 'lucide-react';

interface ClientsTabProps {
  filteredClients: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onImpersonate: (clientId: string) => void;
  onToggleAccess: (clientId: string, isBlocked: boolean) => void;
  onOpenWorkspace: (clientId: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ClientsTab({
  filteredClients,
  searchQuery,
  setSearchQuery,
  onImpersonate,
  onToggleAccess,
  onOpenWorkspace,
  addToast,
}: ClientsTabProps) {
  return (
    <motion.div key="clients" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">לקוחות</h3>
            <p className="text-sm text-slate-600">לקוחות שהסוכנות מטפלת בהם (לא משתמשי מערכת)</p>
          </div>
          <div className="flex gap-4">
            <input 
              placeholder="חפש לקוח..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-indigo-200 rounded-xl px-6 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition-all text-right shadow-sm" 
            />
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-indigo-100">
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">לקוח / מותג</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">סוג חבילה</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">סטטוס תשלום</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">פעולות מהירות</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr key={client.id} className="border-b border-indigo-50 hover:bg-indigo-50/50 transition-colors group">
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <img src={client.avatar} className="w-12 h-12 rounded-2xl border border-indigo-200 shadow-sm" alt={client.companyName} />
                      <div>
                        <p className="font-black text-slate-900">{client.companyName}</p>
                        <p className="text-[10px] font-bold text-slate-500">{client.email || 'אין דוא"ל'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase">
                      {client.plan === 'starter' ? 'מתחיל' : client.plan === 'pro' ? 'מקצוען' : 'סוכנות'}
                    </span>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${client.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase ${client.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {client.paymentStatus === 'paid' ? 'שולם' : 'בפיגור'}
                      </span>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => onImpersonate(client.id)} 
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-500 hover:text-white transition-all" 
                        title="התחזות למשתמש"
                      >
                        <Eye size={16}/>
                      </button>
                      <button 
                        onClick={() => onToggleAccess(client.id, client.status === 'Overdue')} 
                        className={`p-2 rounded-lg transition-all ${client.status === 'Overdue' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white' : 'bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white'}`} 
                        title={client.status === 'Overdue' ? 'שחרר חסימה' : 'חסום גישה'}
                      >
                        {client.status === 'Overdue' ? <Unlock size={16}/> : <Lock size={16}/>}
                      </button>
                      <button 
                        onClick={() => onOpenWorkspace(client.id)}
                        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-500 hover:text-white transition-all" 
                        title="פתח סביבת עבודה"
                      >
                        <Settings size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

