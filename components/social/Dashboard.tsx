/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, TrendingUp, Wallet } from 'lucide-react';
import { joinPath } from '@/lib/os/social-routing';
import { getClientStatusLabel, getClientStatusDotColor } from '@/lib/status-labels';
import DashboardActionsClient from '@/components/social/dashboard/DashboardActionsClient';
import DashboardTasksClient from '@/components/social/dashboard/DashboardTasksClient';
import ScriptsBank from '@/components/social/dashboard/ScriptsBank';
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
      <div className="bg-gradient-to-l from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-5 md:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-xl md:text-3xl font-bold mb-1" suppressHydrationWarning>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm font-medium text-white/90 max-w-2xl" suppressHydrationWarning>
            היום יש {todayPostsCount} פוסטים מתוכננים
          </p>
        </div>
      </div>

      <ScriptsBank scripts={scripts} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
        <DashboardActionsClient hrefMachine={joinPath(basePath, '/machine')} />

        <Link
          href={joinPath(basePath, '/calendar')}
          className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-right group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Calendar className="text-purple-600" size={24} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-900">לוח שנה</h3>
        </Link>

        <Link
          href={joinPath(basePath, '/clients')}
          className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-right group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Users className="text-green-600" size={24} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-900">לקוחות</h3>
        </Link>

        <Link
          href={joinPath(basePath, '/analytics')}
          className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-right group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <TrendingUp className="text-orange-600" size={24} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-900">אנליטיקה</h3>
        </Link>
        
        <Link
          id="collection-button"
          href={joinPath(basePath, '/collection')}
          className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-right group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Wallet className="text-red-600" size={24} />
          </div>
          <h3 className="text-sm md:text-base font-bold text-slate-900">גבייה</h3>
        </Link>
      </div>

      {/* Clients Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">לקוחות פעילים</h2>
          <Link
            href={joinPath(basePath, '/clients')}
            className="text-indigo-600 font-bold text-sm hover:text-indigo-700"
          >
            צפה בכולם →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.slice(0, 6).map((client) => (
            <Link
              key={client.id}
              href={joinPath(basePath, `/workspace?clientId=${encodeURIComponent(String(client.id))}&clientName=${encodeURIComponent(String(client.companyName || ''))}`)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center gap-4 mb-4">
                {String(client.avatar || '').trim() ? (
                  <img
                    src={String(client.avatar)}
                    className="w-12 h-12 rounded-xl object-cover"
                    alt={client.companyName}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                    {String(client.companyName || 'L').charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{client.companyName}</h3>
                  <p className="text-xs font-medium text-slate-500 truncate">{client.postingRhythm}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getClientStatusDotColor(client.status)}`}></div>
                <span className="text-[11px] font-bold text-slate-600">{getClientStatusLabel(client.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
        {/* Latest Activity Feed (Placeholder) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">פעילות אחרונה</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <TrendingUp size={32} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">אין פעילות להצגה כרגע</p>
          </div>
        </div>

        {/* Mini Tasks/Reminders (Placeholder) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">משימות</h3>
          </div>
          <DashboardTasksClient orgId={orgSlug} module="social" />
        </div>
      </div>
    </div>
  );
}
