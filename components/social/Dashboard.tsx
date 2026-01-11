/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, TrendingUp, Wallet, ChevronDown } from 'lucide-react';
import { joinPath } from '@/lib/os/social-routing';
import DashboardActionsClient from '@/components/social/dashboard/DashboardActionsClient';
import DashboardTasksClient from '@/components/social/dashboard/DashboardTasksClient';
import { useApp } from '@/contexts/AppContext';

type StrategicContentItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  module_id: string;
};

export default function Dashboard({ orgSlug }: { orgSlug: string }) {
  const basePath = `/w/${orgSlug}/social`;
  const { clients, posts } = useApp();
  const [isScriptsOpen, setIsScriptsOpen] = useState(false);
  const [scripts, setScripts] = useState<StrategicContentItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/strategic-content?module_id=social', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data?.items) ? (data.items as StrategicContentItem[]) : [];
        setScripts(items.filter((i) => i.category === 'scripts'));
      } catch {
        // ignore
      }
    };

    load();
  }, []);

  const counters = useMemo(() => {
    const list = Array.isArray(posts) ? (posts as any[]) : [];
    const statusCount = (s: string) => list.filter((p: any) => String(p.status || '').toLowerCase() === s).length;
    return {
      postsTotal: list.length,
      postsDraft: statusCount('draft'),
      postsScheduled: statusCount('scheduled'),
      postsPublished: statusCount('published'),
    };
  }, [posts]);

  const todayPostsCount = (Array.isArray(posts) ? posts : []).filter((p: any) => {
    if (!p?.scheduledAt) return false;
    const d = new Date(p.scheduledAt);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  return (
    <div id="operational-center" className="max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 pb-10 text-right">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black mb-2">ברוך הבא! 👋</h1>
          <p className="text-sm md:text-base font-bold text-white/90 max-w-2xl">
            יש לך {todayPostsCount} פוסטים מתוכננים להיום ו-{counters?.postsScheduled ?? 0} פוסטים מתוזמנים.
          </p>
        </div>

      <div>
        <button
          type="button"
          onClick={() => setIsScriptsOpen((v) => !v)}
          className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">בנק תסריטי הזהב</h2>
              <p className="text-sm font-bold text-slate-400 mt-1">תסריטים מוכנים לשימוש שמייצרים סמכות</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ChevronDown size={18} className={isScriptsOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </div>
          </div>

          {isScriptsOpen && (
            <div className="mt-6 text-right">
              {scripts.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <div className="text-sm font-black text-slate-900">{item.title}</div>
                  <div className="text-sm font-bold text-slate-700 mt-3 whitespace-pre-line leading-relaxed">{item.content}</div>
                </div>
              ))}
              {!scripts.length && (
                <div className="text-sm font-bold text-slate-500">אין תסריטים זמינים כרגע.</div>
              )}
            </div>
          )}
        </button>
      </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <DashboardActionsClient hrefMachine={joinPath(basePath, '/machine')} />

        <Link
          href={joinPath(basePath, '/calendar')}
          className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Calendar className="text-purple-600" size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">לוח שנה</h3>
          <p className="text-sm font-bold text-slate-400">צפה בלוח השידורים</p>
        </Link>

        <Link
          href={joinPath(basePath, '/clients')}
          className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="text-green-600" size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">לקוחות</h3>
          <p className="text-sm font-bold text-slate-400">{clients.length} לקוחות פעילים</p>
        </Link>

        <Link
          href={joinPath(basePath, '/analytics')}
          className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="text-orange-600" size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">אנליטיקה</h3>
          <p className="text-sm font-bold text-slate-400">צפה בביצועים</p>
        </Link>
        
        <Link
          id="collection-button"
          href={joinPath(basePath, '/collection')}
          className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Wallet className="text-red-600" size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">גבייה</h3>
          <p className="text-sm font-bold text-slate-400">ניהול תשלומים</p>
        </Link>
      </div>

      {/* Clients Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-black text-slate-900">לקוחות פעילים</h2>
          <Link
            href={joinPath(basePath, '/clients')}
            className="text-blue-600 font-black text-sm hover:text-blue-700"
          >
            צפה בכולם →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.slice(0, 6).map((client) => (
            <Link
              key={client.id}
              href={joinPath(basePath, `/workspace?clientId=${encodeURIComponent(String(client.id))}`)}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={client.avatar} 
                  className="w-16 h-16 rounded-2xl object-cover group-hover:scale-110 transition-transform" 
                  alt={client.companyName}
                />
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900">{client.companyName}</h3>
                  <p className="text-sm font-bold text-slate-400">{client.postingRhythm}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${client.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-bold text-slate-600">{client.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <DashboardTasksClient />
    </div>
  );
}

