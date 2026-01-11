import 'server-only';
import { createClient } from '@/lib/supabase';
import { getUsers } from '@/lib/db';

export type FinanceDateRange = {
  from?: string;
  to?: string;
};

export type FinanceUserAggregate = {
  user: any;
  totalHours: number;
  totalMinutes: number;
  estimatedCost: number;
  entriesCount: number;
};

export type FinanceChartPoint = {
  date: string;
  totalMinutes: number;
  totalHours: number;
  estimatedCost: number;
};

export type FinanceOverviewData = {
  users: FinanceUserAggregate[];
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  organizationId: string;
  chart: FinanceChartPoint[];
};

export async function getFinanceOverviewData(params: {
  organizationId: string;
  userId?: string | null;
  department?: string | null;
  dateRange?: FinanceDateRange;
}): Promise<FinanceOverviewData> {
  const supabase = createClient();

  let timeEntriesQuery = supabase
    .from('nexus_time_entries')
    .select('id,organization_id,user_id,duration_minutes,date')
    .eq('organization_id', params.organizationId)
    .order('date', { ascending: false })
    .limit(2000);

  const dateFrom = params.dateRange?.from;
  const dateTo = params.dateRange?.to;

  if (dateFrom) {
    timeEntriesQuery = timeEntriesQuery.gte('date', dateFrom);
  }
  if (dateTo) {
    timeEntriesQuery = timeEntriesQuery.lte('date', dateTo);
  }
  if (params.userId) {
    timeEntriesQuery = timeEntriesQuery.eq('user_id', params.userId);
  }

  const { data: timeEntries, error: timeEntriesError } = await timeEntriesQuery;
  if (timeEntriesError) {
    throw new Error(timeEntriesError.message);
  }

  const entries = Array.isArray(timeEntries) ? timeEntries : [];

  const userIds = Array.from(new Set(entries.map((e: any) => String(e.user_id)).filter(Boolean)));
  const dbUsers = userIds.length > 0 ? await getUsers() : [];
  const usersById = new Map<string, any>(dbUsers.map((u: any) => [String(u.id), u]));

  const totalsByUser = new Map<string, { totalMinutes: number; entriesCount: number }>();
  const totalsByDate = new Map<string, { totalMinutes: number }>();

  for (const entry of entries) {
    const uid = String((entry as any).user_id || '');
    if (!uid) continue;

    const minutes = Number((entry as any).duration_minutes || 0);
    const current = totalsByUser.get(uid) ?? { totalMinutes: 0, entriesCount: 0 };
    current.totalMinutes += minutes;
    current.entriesCount += 1;
    totalsByUser.set(uid, current);

    const entryDate = String((entry as any).date || '');
    if (entryDate) {
      const byDate = totalsByDate.get(entryDate) ?? { totalMinutes: 0 };
      byDate.totalMinutes += minutes;
      totalsByDate.set(entryDate, byDate);
    }
  }

  const usersAggregates: FinanceUserAggregate[] = Array.from(totalsByUser.entries()).map(([uid, totals]) => {
    const u = usersById.get(uid);
    const totalHours = totals.totalMinutes / 60;
    let estimatedCost = 0;

    if (u?.paymentType === 'hourly') {
      estimatedCost = totalHours * Number(u?.hourlyRate || 0);
    } else if (u?.paymentType === 'monthly') {
      estimatedCost = Number(u?.monthlySalary || 0);
    }

    return {
      user: u ?? { id: uid, name: 'Unknown', role: 'עובד', department: null },
      totalHours,
      totalMinutes: totals.totalMinutes,
      estimatedCost,
      entriesCount: totals.entriesCount,
    };
  });

  const scopedUsers = params.department
    ? usersAggregates.filter((u: any) => String(u.user?.department || '') === String(params.department))
    : usersAggregates;

  const totalCost = scopedUsers.reduce((sum: number, u: any) => sum + Number(u.estimatedCost || 0), 0);

  const chart: FinanceChartPoint[] = Array.from(totalsByDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, totals]) => {
      const totalHours = totals.totalMinutes / 60;
      const estimatedCost = totalHours * (totalCost > 0 && entries.length > 0 ? totalCost / (entries.reduce((acc: number, e: any) => acc + Number(e.duration_minutes || 0), 0) / 60 || 1) : 0);
      return {
        date,
        totalMinutes: totals.totalMinutes,
        totalHours,
        estimatedCost,
      };
    });

  return {
    users: scopedUsers,
    totalRevenue: 0,
    totalCost,
    netProfit: 0 - totalCost,
    organizationId: params.organizationId,
    chart,
  };
}
