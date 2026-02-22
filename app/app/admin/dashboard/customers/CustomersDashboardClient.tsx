'use client';

import React, { useMemo } from 'react';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CircleCheck,
  CircleX,
  CircleAlert,
  DollarSign,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import type { OrganizationWithOwner } from '@/app/actions/admin-organizations';

type CustomersDashboardClientProps = {
  organizations: OrganizationWithOwner[];
  error: string | null;
};

type DashboardStats = {
  totalCustomers: number;
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  canceledOrganizations: number;
  avgOrganizationsPerCustomer: number;
  recentSignups: number;
  expiringTrials: number;
};

export default function CustomersDashboardClient({ organizations, error }: CustomersDashboardClientProps) {
  const stats = useMemo<DashboardStats>(() => {
    if (!organizations.length) {
      return {
        totalCustomers: 0,
        totalOrganizations: 0,
        activeOrganizations: 0,
        trialOrganizations: 0,
        canceledOrganizations: 0,
        avgOrganizationsPerCustomer: 0,
        recentSignups: 0,
        expiringTrials: 0,
      };
    }

    // Group by owner
    const ownerIds = new Set<string>();
    organizations.forEach(org => {
      if (org.owner_id) ownerIds.add(org.owner_id);
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const active = organizations.filter(o => o.subscription_status === 'active').length;
    const trial = organizations.filter(o => o.subscription_status === 'trial').length;
    const canceled = organizations.filter(o => o.subscription_status === 'canceled').length;
    
    const recentSignups = organizations.filter(org => {
      if (!org.created_at) return false;
      const createdDate = new Date(org.created_at);
      return createdDate >= sevenDaysAgo;
    }).length;

    const expiringTrials = organizations.filter(org => {
      if (org.subscription_status !== 'trial' || !org.trial_start_date) return false;
      const trialStart = new Date(org.trial_start_date);
      const trialDays = org.trial_days || 7;
      const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);
      return trialEnd <= threeDaysFromNow && trialEnd >= now;
    }).length;

    return {
      totalCustomers: ownerIds.size,
      totalOrganizations: organizations.length,
      activeOrganizations: active,
      trialOrganizations: trial,
      canceledOrganizations: canceled,
      avgOrganizationsPerCustomer: ownerIds.size > 0 ? organizations.length / ownerIds.size : 0,
      recentSignups,
      expiringTrials,
    };
  }, [organizations]);

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <AdminPageHeader title="דשבורד לקוחות" subtitle="מדדי לקוחות וארגונים" icon={Users} />
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
          שגיאה בטעינת נתונים: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader 
        title="דשבורד לקוחות" 
        subtitle="מדדי לקוחות, ארגונים ומנויים"
        icon={Users}
      />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">סה"כ לקוחות</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-2xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">בעלי ארגונים</p>
        </div>

        {/* Total Organizations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">סה"כ ארגונים</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalOrganizations}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-2xl">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            ממוצע: {stats.avgOrganizationsPerCustomer.toFixed(1)} לכל לקוח
          </p>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">ארגונים פעילים</p>
              <p className="text-3xl font-black text-green-600 mt-1">{stats.activeOrganizations}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-2xl">
              <CircleCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.totalOrganizations > 0 
              ? `${((stats.activeOrganizations / stats.totalOrganizations) * 100).toFixed(0)}% מהארגונים`
              : '0%'
            }
          </p>
        </div>

        {/* Trial Organizations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">ניסיון</p>
              <p className="text-3xl font-black text-yellow-600 mt-1">{stats.trialOrganizations}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-2xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats.totalOrganizations > 0 
              ? `${((stats.trialOrganizations / stats.totalOrganizations) * 100).toFixed(0)}% מהארגונים`
              : '0%'
            }
          </p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Recent Signups */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-500 truncate">הרשמות ב-7 ימים</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.recentSignups}</p>
            </div>
          </div>
        </div>

        {/* Expiring Trials */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded shrink-0">
              <CircleAlert className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-slate-500 truncate">ניסיון מסתיים ב-3 ימים</p>
              <p className="text-xl md:text-2xl font-black text-orange-600">{stats.expiringTrials}</p>
            </div>
          </div>
        </div>

        {/* Canceled */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded shrink-0">
              <CircleX className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-slate-500 truncate">מבוטלים</p>
              <p className="text-xl md:text-2xl font-black text-red-600">{stats.canceledOrganizations}</p>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded shrink-0">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm text-slate-500 truncate">שיעור המרה</p>
              <p className="text-xl md:text-2xl font-black text-green-600">
                {stats.trialOrganizations + stats.activeOrganizations > 0
                  ? `${((stats.activeOrganizations / (stats.trialOrganizations + stats.activeOrganizations)) * 100).toFixed(0)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">התפלגות סטטוס ארגונים</h3>
        <div className="space-y-3">
          {/* Active */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">פעילים</span>
              <span className="font-black text-green-600">{stats.activeOrganizations}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ 
                  width: `${stats.totalOrganizations > 0 ? (stats.activeOrganizations / stats.totalOrganizations) * 100 : 0}%` 
                }}
              />
            </div>
          </div>

          {/* Trial */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">ניסיון</span>
              <span className="font-black text-yellow-600">{stats.trialOrganizations}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ 
                  width: `${stats.totalOrganizations > 0 ? (stats.trialOrganizations / stats.totalOrganizations) * 100 : 0}%` 
                }}
              />
            </div>
          </div>

          {/* Canceled */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">מבוטלים</span>
              <span className="font-black text-red-600">{stats.canceledOrganizations}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ 
                  width: `${stats.totalOrganizations > 0 ? (stats.canceledOrganizations / stats.totalOrganizations) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">פעולות מהירות</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Link 
            href="/app/admin/customers"
            className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-shadow"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-slate-900">ניהול לקוחות</p>
              <p className="text-sm text-slate-500">צפייה וניהול כל הלקוחות</p>
            </div>
          </Link>

          <Link 
            href="/app/admin/organizations"
            className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-shadow"
          >
            <Building2 className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-slate-900">ניהול ארגונים</p>
              <p className="text-sm text-slate-500">צפייה וניהול ארגונים</p>
            </div>
          </Link>

          <Link 
            href="/app/admin/billing-management"
            className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-md transition-shadow"
          >
            <DollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-slate-900">ניהול חיובים</p>
              <p className="text-sm text-slate-500">מעקב אחר תשלומים</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
