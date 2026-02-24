'use client';

import React from 'react';
import { MessageSquare, Clock, Zap, Bell, Users, ArrowLeft } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Avatar } from '@/components/Avatar';

export default function Inbox() {
  const { clients, conversations } = useApp();

  const hasConversations = conversations.length > 0;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-32" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-slate-900">תיבת הודעות</h1>
        <p className="text-sm font-bold text-slate-400">ניהול שיחות עם לקוחות ממקום אחד</p>
      </div>

      {/* Development Notice */}
      <section className="bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 p-8 md:p-12 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          <div className="lg:col-span-3 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20">
                <MessageSquare size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">תיבת הודעות מאוחדת</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              ריכוז כל השיחות עם הלקוחות — בקרוב
            </h2>
            <p className="text-sm md:text-base font-bold text-white/80 leading-relaxed">
              הפיצ׳ר הזה נמצא בפיתוח פעיל. כשיושק, תוכלו לנהל את כל ההודעות מהלקוחות
              שלכם במקום אחד — בקשות חומרים, אישורים, משובים ועדכונים.
            </p>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            {[
              { icon: Bell, text: 'התראות על הודעות חדשות בזמן אמת' },
              { icon: Users, text: 'שיחה ישירה עם לקוחות דרך הפורטל' },
              { icon: Zap, text: 'תגובות מהירות עם תבניות חכמות' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <p className="text-xs font-black">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Current State — conversation log (read-only) */}
      {hasConversations && (
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-slate-400" />
              <h3 className="text-xl font-black text-slate-800">היסטוריית שיחות</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl">
              {conversations.length} שיחות
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {conversations.map(conv => {
              const client = clients.find(c => c.id === conv.clientId);
              return (
                <div
                  key={conv.id}
                  className="p-6 flex items-center gap-5 hover:bg-slate-50/50 transition-all"
                >
                  <Avatar
                    src={String(conv.userAvatar || '')}
                    name={String(conv.userName || '')}
                    alt={String(conv.userName || '')}
                    size="md"
                    rounded="xl"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-sm text-slate-900 truncate">{conv.userName}</p>
                      {client && (
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg truncate">
                          {client.companyName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 line-clamp-1">{conv.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 capitalize bg-slate-50 px-2.5 py-1 rounded-lg">{conv.platform}</span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasConversations && (
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-xl p-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={36} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">אין שיחות עדיין</h3>
          <p className="text-sm font-bold text-slate-400 max-w-md mx-auto leading-relaxed">
            כשלקוחות ישלחו הודעות דרך הפורטל או יגיבו על בקשות — הן יופיעו כאן.
            בינתיים, ניתן לתקשר עם לקוחות דרך טאב ״הודעות״ בסביבת העבודה של כל לקוח.
          </p>
        </div>
      )}
    </div>
  );
}
