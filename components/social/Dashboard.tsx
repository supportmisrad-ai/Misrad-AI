/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, TrendingUp, Wallet, ChevronDown } from 'lucide-react';
import { joinPath } from '@/lib/os/social-routing';
import DashboardActionsClient from '@/components/social/dashboard/DashboardActionsClient';
import DashboardTasksClient from '@/components/social/dashboard/DashboardTasksClient';
import { useApp } from '@/contexts/AppContext';
import { useUser } from '@clerk/nextjs';

type StrategicContentItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  module_id: string;
};

export default function Dashboard({
  orgSlug,
  initialScripts,
}: {
  orgSlug: string;
  initialScripts?: StrategicContentItem[];
}) {
  const basePath = `/w/${orgSlug}/social`;
  const { clients, posts } = useApp();
  const { isLoaded, isSignedIn, user } = useUser();
  const [hasMounted, setHasMounted] = useState(false);
  const [isScriptsOpen, setIsScriptsOpen] = useState(false);
  const [scripts, setScripts] = useState<StrategicContentItem[]>(() => (Array.isArray(initialScripts) ? initialScripts : []));

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (Array.isArray(initialScripts) && initialScripts.length > 0) return;
    const load = async () => {
      try {
        const res = await fetch('/api/strategic-content?module_id=social&category=scripts', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data?.items) ? (data.items as StrategicContentItem[]) : [];
        setScripts(items);
      } catch {
        // ignore
      }
    };

    load();
  }, [initialScripts]);

  const counters = useMemo(() => {
    const list = Array.isArray(posts) ? (posts as unknown[]) : [];
    const statusCount = (s: string) => list.filter((p: unknown) => {
      const post = p as Record<string, unknown>;
      return String(post.status || '').toLowerCase() === s;
    }).length;
    return {
      postsTotal: list.length,
      postsDraft: statusCount('draft'),
      postsScheduled: statusCount('scheduled'),
      postsPublished: statusCount('published'),
    };
  }, [posts]);

  const todayPostsCount = (Array.isArray(posts) ? posts : []).filter((p: unknown) => {
    const post = p as Record<string, unknown>;
    if (!post.scheduledAt) return false;
    const d = new Date(post.scheduledAt as string);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  const greeting = useMemo(() => {
    if (!hasMounted) return '';
    const h = new Date().getHours();
    if (h < 12) return 'בוקר טוב';
    if (h < 18) return 'צהריים טובים';
    return 'ערב טוב';
  }, [hasMounted]);

  const firstName = useMemo(() => {
    if (!hasMounted || !isLoaded || !isSignedIn || !user) return '';
    const fromFirst = user.firstName?.trim();
    if (fromFirst) return fromFirst;
    const fromFull = user.fullName?.trim();
    if (fromFull) return fromFull.split(' ')[0] || '';
    const email = user.emailAddresses?.[0]?.emailAddress;
    return email ? email.split('@')[0] : '';
  }, [hasMounted, isLoaded, isSignedIn, user]);

  return (
    <div id="operational-center" className="max-w-6xl mx-auto flex flex-col gap-6 md:gap-8 pb-10 text-right">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-5 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-xl md:text-3xl font-black mb-1" suppressHydrationWarning>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm font-bold text-white/90 max-w-2xl" suppressHydrationWarning>
            היום יש {todayPostsCount} פוסטים מתוכננים
          </p>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setIsScriptsOpen((v) => !v)}
          className="w-full bg-white p-5 md:p-6 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900">בנק תסריטים</h2>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
        <DashboardActionsClient hrefMachine={joinPath(basePath, '/machine')} />

        <Link
          href={joinPath(basePath, '/calendar')}
          className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
            <Calendar className="text-purple-600" size={28} />
          </div>
          <h3 className="text-base md:text-xl font-black text-slate-900">לוח שנה</h3>
        </Link>

        <Link
          href={joinPath(basePath, '/clients')}
          className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
            <Users className="text-green-600" size={28} />
          </div>
          <h3 className="text-base md:text-xl font-black text-slate-900">לקוחות</h3>
        </Link>

        <Link
          href={joinPath(basePath, '/analytics')}
          className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="text-orange-600" size={28} />
          </div>
          <h3 className="text-base md:text-xl font-black text-slate-900">אנליטיקה</h3>
        </Link>
        
        <Link
          id="collection-button"
          href={joinPath(basePath, '/collection')}
          className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
            <Wallet className="text-red-600" size={28} />
          </div>
          <h3 className="text-base md:text-xl font-black text-slate-900">גבייה</h3>
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
              href={joinPath(basePath, `/workspace?clientId=${encodeURIComponent(String(client.id))}&clientName=${encodeURIComponent(String(client.companyName || ''))}`)}
              className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                {String(client.avatar || '').trim() ? (
                  <img
                    src={String(client.avatar)}
                    className="w-16 h-16 rounded-2xl object-cover group-hover:scale-110 transition-transform"
                    alt={client.companyName}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xl">
                    {String(client.companyName || 'L').charAt(0)}
                  </div>
                )}
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

