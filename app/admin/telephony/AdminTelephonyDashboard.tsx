'use client';

/**
 * Admin Telephony Dashboard - Main Reseller Management Interface
 * 
 * Features:
 * - Overview statistics (KPIs)
 * - Sub-accounts list with status
 * - Quick actions for provisioning
 * - Usage charts and billing summary
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeletons/Skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Phone, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  RefreshCw, 
  Building2,
  AlertCircle,
  Headphones,
  Activity
} from 'lucide-react';
import type { TelephonyDashboardStats, TelephonySubAccountSummary } from '@/types/voicenter-reseller';

interface DashboardData {
  stats: TelephonyDashboardStats;
  subAccounts: TelephonySubAccountSummary[];
}

export default function AdminTelephonyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/telephony/sub-accounts');
      if (!res.ok) throw new Error('Failed to fetch data');
      const result = await res.json();
      if (result.success) {
        // Transform to dashboard format
        const stats: TelephonyDashboardStats = {
          totalSubAccounts: result.data.total || 0,
          activeSubAccounts: result.data.active || 0,
          trialSubAccounts: result.data.trial || 0,
          suspendedSubAccounts: result.data.suspended || 0,
          totalExtensions: result.data.subAccounts.reduce((acc: number, sa: TelephonySubAccountSummary) => acc + sa.extensionCount, 0),
          activeExtensions: result.data.subAccounts.reduce((acc: number, sa: TelephonySubAccountSummary) => acc + sa.activeExtensions, 0),
          totalCallsToday: 0, // TODO: Add today stats to API
          totalCallsThisMonth: result.data.subAccounts.reduce((acc: number, sa: TelephonySubAccountSummary) => acc + sa.callsThisMonth, 0),
          totalDurationThisMonth: result.data.subAccounts.reduce((acc: number, sa: TelephonySubAccountSummary) => acc + sa.durationThisMonth, 0),
          projectedRevenueThisMonth: result.data.subAccounts.reduce((acc: number, sa: TelephonySubAccountSummary) => acc + sa.totalMonthlyCost, 0),
          outstandingBalance: 0, // TODO: Add billing stats
          callsTrend: 0,
          revenueTrend: 0,
        };
        setData({ stats, subAccounts: result.data.subAccounts });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'פעיל' },
      trial: { variant: 'secondary', label: 'ניסיון' },
      suspended: { variant: 'destructive', label: 'מושהה' },
      pending: { variant: 'outline', label: 'ממתין' },
      cancelled: { variant: 'destructive', label: 'מבוטל' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}ש ${mins}ד`;
    return `${mins} דקות`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchData} className="mt-4">
          <RefreshCw className="h-4 w-4 ml-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { stats, subAccounts } = data;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-cyan-600" />
            ניהול טלפוניה - Voicenter Reseller
          </h1>
          <p className="text-muted-foreground mt-1">
            ניהול תת-חשבונות, שלוחות, שימוש וחיוב
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 ml-2" />
            רענון
          </Button>
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            חשבון חדש
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              חשבונות פעילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubAccounts}</div>
            <div className="text-xs text-muted-foreground">
              מתוך {stats.totalSubAccounts} חשבונות
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              שלוחות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExtensions}</div>
            <div className="text-xs text-muted-foreground">
              {stats.activeExtensions} פעילות
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              שיחות החודש
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCallsThisMonth.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {formatDuration(stats.totalDurationThisMonth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              הכנסות צפויות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.projectedRevenueThisMonth)}
            </div>
            <div className="text-xs text-muted-foreground">
              החודש הנוכחי
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{stats.activeSubAccounts}</div>
          <div className="text-sm text-green-600">פעילים</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{stats.trialSubAccounts}</div>
          <div className="text-sm text-blue-600">בניסיון</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-700">{stats.totalSubAccounts - stats.activeSubAccounts - stats.trialSubAccounts - stats.suspendedSubAccounts}</div>
          <div className="text-sm text-amber-600">אחרים</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{stats.suspendedSubAccounts}</div>
          <div className="text-sm text-red-600">מושהים</div>
        </div>
      </div>

      {/* Sub-Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            חשבונות לקוחות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-right">
                  <th className="pb-3 pr-4 font-medium">חשבון</th>
                  <th className="pb-3 font-medium">ארגון</th>
                  <th className="pb-3 font-medium">סטטוס</th>
                  <th className="pb-3 font-medium">שלוחות</th>
                  <th className="pb-3 font-medium">שיחות החודש</th>
                  <th className="pb-3 font-medium">חיוב חודשי</th>
                  <th className="pb-3 font-medium">נוצר</th>
                  <th className="pb-3 pl-4 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {subAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      אין חשבונות טלפוניה עדיין. לחץ על "חשבון חדש" כדי להתחיל.
                    </td>
                  </tr>
                ) : (
                  subAccounts.map((account) => (
                    <tr key={account.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{account.accountName}</div>
                        <div className="text-xs text-muted-foreground">#{account.id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{account.organizationName}</div>
                        <div className="text-xs text-muted-foreground">{account.organizationSlug}</div>
                      </td>
                      <td className="py-3">{getStatusBadge(account.status)}</td>
                      <td className="py-3">
                        <div className="font-medium">{account.extensionCount}</div>
                        {account.activeExtensions > 0 && (
                          <div className="text-xs text-green-600">{account.activeExtensions} פעילות</div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{account.callsThisMonth.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{formatDuration(account.durationThisMonth)}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{formatCurrency(account.totalMonthlyCost)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(account.monthlyPlanFee)} בסיס
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(account.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            פרטים
                          </Button>
                          <Button variant="ghost" size="sm">
                            שלוחות
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Plus className="h-5 w-5 text-cyan-700" />
              </div>
              <h3 className="font-semibold">חשבון חדש</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              צור תת-חשבון חדש לארגון קיים
            </p>
            <Button className="w-full" size="sm">
              צור חשבון
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Headphones className="h-5 w-5 text-purple-700" />
              </div>
              <h3 className="font-semibold">ניהול שלוחות</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              צור, ערוך ונהל שלוחות בחשבונות
            </p>
            <Button variant="outline" className="w-full" size="sm">
              נהל שלוחות
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <h3 className="font-semibold">דוחות שימוש</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              צפה בדוחות CDR, ניתוח שיחות וחיוב
            </p>
            <Button variant="outline" className="w-full" size="sm">
              צפה בדוחות
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
