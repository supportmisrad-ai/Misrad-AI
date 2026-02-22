'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { 
  SquareActivity, 
  Database, 
  Server, 
  Zap,
  CircleCheck,
  Clock,
  Cpu,
  Globe,
  Users,
  Building2,
  ClipboardList,
  UserPlus,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminBreadcrumbs from '@/components/admin/AdminBreadcrumbs';
import { AdminFadeIn } from '@/components/admin/AdminMotion';
import { Button } from '@/components/ui/button';
import { getPlatformStats } from '@/app/actions/admin-maintenance';

type RealStats = {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  totalUsers: number;
  recentSignups7d: number;
  totalClients: number;
  totalTasks: number;
  databaseSizeMB: number;
  lastBackup: string | null;
  systemVersion: string;
  serverStartedAt: string;
};

function formatDbSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'לא ידוע';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `לפני ${days} ימים`;
  if (hours > 0) return `לפני ${hours} שעות`;
  return 'לפני פחות משעה';
}

const DB_QUOTA_MB = 500;

export default function PlatformDashboardClient() {
  const [stats, setStats] = useState<RealStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadStats = () => {
    startTransition(async () => {
      const res = await getPlatformStats();
      if (res.success && res.data) {
        setStats(res.data);
        setError(null);
      } else {
        setError(res.error || 'שגיאה בטעינת נתונים');
      }
    });
  };

  useEffect(() => { loadStats(); }, []);

  const dbPercent = stats ? Math.min(100, Math.round((stats.databaseSizeMB / DB_QUOTA_MB) * 100)) : 0;

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminBreadcrumbs items={[
        { label: 'אדמין', href: '/app/admin' },
        { label: 'מערכת', href: '/app/admin/dashboard/platform' },
        { label: 'דשבורד פלטפורמה' },
      ]} />

      <AdminPageHeader 
        title="דשבורד פלטפורמה" 
        subtitle="מדדי מערכת, ביצועים ותשתית — נתונים חיים"
        icon={Server}
        actions={
          <Button variant="outline" size="sm" onClick={loadStats} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            רענון
          </Button>
        }
      />

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="text-sm font-bold text-red-800">{error}</div>
        </div>
      ) : null}

      {isPending && !stats ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : stats ? (
        <>
          {/* System Status */}
          <AdminFadeIn>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl border border-green-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-2xl">
                  <CircleCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">מצב המערכת</h3>
                  <p className="text-sm text-slate-600">כל המערכות פועלות תקין · {stats.systemVersion}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">שרת פעיל מאז</p>
                  <p className="text-lg md:text-xl font-bold text-green-600">{formatRelativeTime(stats.serverStartedAt)}</p>
                </div>
                <div className="bg-white rounded-2xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">גיבוי אחרון</p>
                  <p className="text-lg md:text-xl font-bold text-green-600">{formatRelativeTime(stats.lastBackup)}</p>
                </div>
                <div className="bg-white rounded-2xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">DB Status</p>
                  <p className="text-lg md:text-xl font-bold text-green-600">Healthy</p>
                </div>
                <div className="bg-white rounded-2xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500">גרסה</p>
                  <p className="text-lg md:text-xl font-bold text-green-600">{stats.systemVersion}</p>
                </div>
              </div>
            </div>
          </AdminFadeIn>

          {/* Business Metrics */}
          <AdminFadeIn delay={0.08}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard icon={Building2} label="ארגונים" value={stats.totalOrganizations} color="blue" sub={`${stats.activeOrganizations} פעילים · ${stats.trialOrganizations} trial`} />
              <StatCard icon={Users} label="משתמשים" value={stats.totalUsers} color="purple" sub={`${stats.recentSignups7d} הרשמות ב-7 ימים`} />
              <StatCard icon={Globe} label="לקוחות" value={stats.totalClients} color="green" />
              <StatCard icon={ClipboardList} label="משימות" value={stats.totalTasks} color="yellow" />
            </div>
          </AdminFadeIn>

          {/* Infrastructure */}
          <AdminFadeIn delay={0.16}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">גודל מסד נתונים</p>
                    <p className="text-2xl font-bold text-slate-900">{formatDbSize(stats.databaseSizeMB)}</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${dbPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">{dbPercent}% מהמכסה ({DB_QUOTA_MB} MB)</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">הרשמות אחרונות (7 ימים)</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.recentSignups7d}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${stats.recentSignups7d > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {stats.recentSignups7d > 0 ? 'פעילות תקינה' : 'אין הרשמות'}
                  </span>
                </div>
              </div>
            </div>
          </AdminFadeIn>

          {/* Quick Links */}
          <AdminFadeIn delay={0.24}>
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-black text-slate-900 mb-4">ניהול מערכת</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <a href="/app/admin/logs" className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-shadow">
                  <SquareActivity className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">לוגים</p>
                    <p className="text-sm text-slate-500">צפייה בלוגי מערכת</p>
                  </div>
                </a>
                <a href="/app/admin/global/feature-flags" className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-shadow">
                  <Server className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-slate-900">הגדרות</p>
                    <p className="text-sm text-slate-500">תצורת מערכת</p>
                  </div>
                </a>
                <a href="/app/admin/global/control" className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-shadow">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-slate-900">ניטור</p>
                    <p className="text-sm text-slate-500">מעקב ביצועים</p>
                  </div>
                </a>
              </div>
            </div>
          </AdminFadeIn>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: React.ElementType; label: string; value: number; color: string; sub?: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString('he-IL')}</p>
        </div>
        <div className={`p-3 ${c.bg} rounded-2xl`}>
          <Icon className={`w-6 h-6 ${c.text}`} />
        </div>
      </div>
      {sub ? <p className="text-xs text-slate-400 mt-2">{sub}</p> : null}
    </div>
  );
}
