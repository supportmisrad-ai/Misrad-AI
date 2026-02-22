'use client';

import React, { useEffect, useState } from 'react';
import { 
  SquareActivity, 
  Database, 
  Server, 
  Zap,
  TriangleAlert,
  CircleCheck,
  TrendingUp,
  Clock,
  HardDrive,
  Cpu,
  Globe
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type PlatformStats = {
  uptime: string;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  activeConnections: number;
  dbSize: string;
  cacheHitRate: number;
  lastDeployment: string;
};

export default function PlatformDashboardClient() {
  const [stats, setStats] = useState<PlatformStats>({
    uptime: '99.9%',
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    activeConnections: 0,
    dbSize: 'N/A',
    cacheHitRate: 0,
    lastDeployment: new Date().toISOString(),
  });

  useEffect(() => {
    // Simulate loading platform stats
    // In production, fetch from monitoring service (e.g., Datadog, New Relic)
    setStats({
      uptime: '99.9%',
      totalRequests: 1250000,
      avgResponseTime: 120,
      errorRate: 0.05,
      activeConnections: 45,
      dbSize: '2.4 GB',
      cacheHitRate: 94.2,
      lastDeployment: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    });
  }, []);

  const getLastDeploymentText = () => {
    const deployDate = new Date(stats.lastDeployment);
    const now = new Date();
    const diffMs = now.getTime() - deployDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `לפני ${diffDays} ימים`;
    if (diffHours > 0) return `לפני ${diffHours} שעות`;
    return 'לפני פחות משעה';
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader 
        title="דשבורד פלטפורמה" 
        subtitle="מדדי מערכת, ביצועים ותשתית"
        icon={Server}
      />

      {/* System Status */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CircleCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">מצב המערכת</h3>
            <p className="text-sm text-gray-600">כל המערכות פועלות תקין</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">Uptime</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">{stats.uptime}</p>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">שרתים פעילים</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">3/3</p>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">DB Status</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">Healthy</p>
          </div>
          <div className="bg-white rounded-lg p-3 md:p-4">
            <p className="text-xs md:text-sm text-gray-500">Cache Status</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">Active</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Requests */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">סה"כ בקשות (24h)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {(stats.totalRequests / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <SquareActivity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ~{Math.round(stats.totalRequests / 24)} בקשות לשעה
          </p>
        </div>

        {/* Response Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">זמן תגובה ממוצע</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgResponseTime}ms</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            12% שיפור מאתמול
          </p>
        </div>

        {/* Error Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">שיעור שגיאות</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.errorRate}%</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TriangleAlert className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            תקין - מתחת לסף {stats.errorRate < 0.1 ? '✓' : ''}
          </p>
        </div>

        {/* Active Connections */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">חיבורים פעילים</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeConnections}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">משתמשים מחוברים כעת</p>
        </div>
      </div>

      {/* Infrastructure Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        {/* Database Size */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">גודל מסד נתונים</p>
              <p className="text-2xl font-bold text-gray-900">{stats.dbSize}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">35% מהמכסה</p>
        </div>

        {/* Cache Hit Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded">
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cacheHitRate}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.cacheHitRate}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">יעילות מצוינת</p>
        </div>

        {/* Last Deployment */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">פריסה אחרונה</p>
              <p className="text-2xl font-bold text-gray-900">{getLastDeploymentText()}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            {new Date(stats.lastDeployment).toLocaleString('he-IL')}
          </p>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          שימוש במשאבים
        </h3>
        <div className="space-y-4">
          {/* CPU Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">CPU</span>
              <span className="font-semibold text-gray-900">23%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: '23%' }} />
            </div>
          </div>

          {/* Memory Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">זיכרון</span>
              <span className="font-semibold text-gray-900">64%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-purple-500 h-3 rounded-full transition-all" style={{ width: '64%' }} />
            </div>
          </div>

          {/* Disk Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">דיסק</span>
              <span className="font-semibold text-gray-900">41%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: '41%' }} />
            </div>
          </div>

          {/* Network Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">רשת</span>
              <span className="font-semibold text-gray-900">18%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-yellow-500 h-3 rounded-full transition-all" style={{ width: '18%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ניהול מערכת</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <a 
            href="/app/admin/logs"
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <SquareActivity className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">לוגים</p>
              <p className="text-sm text-gray-500">צפייה בלוגי מערכת</p>
            </div>
          </a>

          <a 
            href="/app/admin/global/feature-flags"
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <Server className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">הגדרות</p>
              <p className="text-sm text-gray-500">תצורת מערכת</p>
            </div>
          </a>

          <a 
            href="/app/admin/global/control"
            className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <Zap className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-gray-900">ניטור</p>
              <p className="text-sm text-gray-500">מעקב ביצועים</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
