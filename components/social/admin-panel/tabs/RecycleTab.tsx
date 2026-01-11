'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw } from 'lucide-react';
import { restoreDeletedItem, hardDeleteItem } from '@/app/actions/admin-cockpit';

interface RecycleTabProps {
  deletedItems: any[];
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function RecycleTab({ deletedItems, onRefresh, addToast }: RecycleTabProps) {
  return (
    <motion.div key="recycle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">פריטים שנמחקו</h3>
            <p className="text-sm text-slate-600">כל הפריטים שנמחקו במערכת - ניתן להחזיר</p>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-indigo-100">
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">סוג</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">שם</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">לקוח</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">נמחק על ידי</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">תאריך מחיקה</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {deletedItems.map(item => (
                <tr key={item.id} className="border-b border-indigo-50 hover:bg-indigo-50/50 transition-colors group">
                  <td className="p-8">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                      item.type === 'post' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'post' ? 'פוסט' : 'לקוח'}
                    </span>
                  </td>
                  <td className="p-8">
                    <p className="font-black text-slate-900">{item.name}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-sm text-slate-600">{item.clientName}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-sm text-slate-600">{item.deletedBy}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-sm text-slate-600">{new Date(item.deletedAt).toLocaleString('he-IL')}</p>
                  </td>
                  <td className="p-8">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={async () => {
                          const result = await restoreDeletedItem(item.id, item.type);
                          if (result.success) {
                            addToast('פריט הוחזר בהצלחה', 'success');
                            onRefresh();
                          }
                        }}
                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" 
                        title="החזר (Restore)"
                      >
                        <RotateCcw size={16}/>
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`האם אתה בטוח שברצונך למחוק את ${item.name} לנצח? פעולה זו בלתי הפיכה!`)) {
                            const result = await hardDeleteItem(item.id, item.type);
                            if (result.success) {
                              addToast('פריט נמחק לנצח', 'success');
                              onRefresh();
                            }
                          }
                        }}
                        className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-all" 
                        title="מחק לנצח (Hard Delete)"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deletedItems.length === 0 && (
            <div className="text-center py-20">
              <Trash2 className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <p className="text-slate-600 font-bold">אין פריטים שנמחקו</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

