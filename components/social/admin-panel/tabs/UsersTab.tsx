'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Eye, Ban, Gift, Edit } from 'lucide-react';
import { banUser, grantProAccess } from '@/app/actions/admin-cockpit';
import { getUserDetails } from '@/app/actions/admin-users';
import { Button } from '@/components/ui/button';

interface UsersTabProps {
  allUsers: Record<string, unknown>[];
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  userFilter: 'all' | 'active' | 'banned' | 'churned';
  setUserFilter: (filter: 'all' | 'active' | 'banned' | 'churned') => void;
  onAddUser: () => void;
  onEditUser: (userId: string) => void;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function UsersTab({
  allUsers,
  userSearchQuery,
  setUserSearchQuery,
  userFilter,
  setUserFilter,
  onAddUser,
  onEditUser,
  onRefresh,
  addToast,
}: UsersTabProps) {
  return (
    <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">משתמשים</h3>
            <p className="text-sm text-slate-600">שליטה מלאה על כל משתמשי המערכת</p>
          </div>
          <div className="flex gap-4">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(String(e.target.value) as 'all' | 'active' | 'banned' | 'churned')}
              className="bg-white border border-indigo-200 rounded-xl px-4 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">הכל</option>
              <option value="active">פעילים</option>
              <option value="banned">חסומים</option>
              <option value="churned">נטשו</option>
            </select>
            <input 
              placeholder="חפש משתמש..." 
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="bg-white border border-indigo-200 rounded-xl px-6 py-2 text-slate-900 text-sm outline-none focus:border-indigo-400 text-right shadow-sm w-64" 
            />
            <Button
              onClick={onAddUser}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl font-black text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md flex items-center gap-2"
            >
              <UserPlus size={18} />
              הוסף משתמש
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-indigo-100">
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">שם</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">אימייל</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">תאריך הרשמה</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">חבילה</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">פעילות אחרונה</th>
                <th className="p-8 text-[10px] font-black text-slate-600 uppercase">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {allUsers
                .filter(u => {
                  const matchesSearch = !userSearchQuery || 
                    String(u.name ?? '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    String(u.email ?? '').toLowerCase().includes(userSearchQuery.toLowerCase());
                  const matchesFilter = userFilter === 'all' || 
                    (userFilter === 'active' && !u.isBanned) ||
                    (userFilter === 'banned' && Boolean(u.isBanned)) ||
                    (userFilter === 'churned' && u.lastActivity && new Date(String(u.lastActivity)) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
                  return matchesSearch && matchesFilter;
                })
                .map(user => (
                <tr key={String(user.id)} className="border-b border-indigo-50 hover:bg-indigo-50/50 transition-colors group">
                  <td className="p-8">
                    <p className="font-black text-slate-900">{String(user.name ?? '')}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-sm font-bold text-slate-600">{String(user.email ?? '')}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-sm text-slate-600">{new Date(String(user.registeredAt ?? '')).toLocaleDateString('he-IL')}</p>
                  </td>
                  <td className="p-8">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                      user.plan === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.plan === 'pro' ? 'PRO' : 'Free'}
                    </span>
                  </td>
                  <td className="p-8">
                    <p className="text-sm text-slate-600">
                      {user.lastActivity ? new Date(String(user.lastActivity)).toLocaleDateString('he-IL') : 'מעולם לא'}
                    </p>
                  </td>
                  <td className="p-8">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        onClick={async () => {
                          addToast('תכונת התחזות למשתמשים תושם בקרוב', 'info');
                        }}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 bg-indigo-100 text-indigo-600 border-indigo-100 hover:bg-indigo-500 hover:text-white" 
                        title="התחזות (Impersonate)"
                        aria-label="התחזות"
                      >
                        <Eye size={16}/>
                      </Button>
                      <Button
                        onClick={async () => {
                          if (confirm(`האם אתה בטוח שברצונך לחסום את ${String(user.name ?? '')}?`)) {
                            const result = await banUser(String(user.id), 'חסימה ידנית על ידי אדמין');
                            if (result.success) {
                              addToast('משתמש נחסם', 'success');
                              onRefresh();
                            }
                          }
                        }}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 bg-rose-100 text-rose-600 border-rose-100 hover:bg-rose-500 hover:text-white" 
                        title="חסום (Ban)"
                        aria-label="חסום"
                      >
                        <Ban size={16}/>
                      </Button>
                      {user.plan !== 'pro' && (
                        <Button
                          onClick={async () => {
                            const result = await grantProAccess(String(user.id));
                            if (result.success) {
                              addToast('משתמש שודרג ל-PRO', 'success');
                              onRefresh();
                            }
                          }}
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 bg-purple-100 text-purple-600 border-purple-100 hover:bg-purple-500 hover:text-white" 
                          title="שדרג ל-PRO"
                          aria-label="שדרג ל-PRO"
                        >
                          <Gift size={16}/>
                        </Button>
                      )}
                      <Button
                        onClick={() => onEditUser(String(user.id))}
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 bg-slate-100 text-slate-600 border-slate-100 hover:bg-indigo-500 hover:text-white" 
                        title="ערוך משתמש"
                        aria-label="ערוך משתמש"
                      >
                        <Edit size={16}/>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allUsers.length === 0 && (
            <div className="text-center py-20">
              <UserPlus className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
              <p className="text-slate-600 font-bold">אין משתמשים</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

