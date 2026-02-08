import 'server-only';
import prisma from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

function isMissingColumnError(error: unknown): boolean {
  const obj = asObject(error) ?? {};
  const code = typeof obj.code === 'string' ? obj.code : '';
  const message = typeof obj.message === 'string' ? obj.message.toLowerCase() : '';
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function isSchemaMismatchError(error: unknown): boolean {
  const obj = asObject(error) ?? {};
  const code = String(obj.code ?? '').toUpperCase();
  const msg = getErrorMessage(error).toLowerCase();
  return (
    code === 'P2021' ||
    code === 'P2022' ||
    code === '42P01' ||
    code === '42703' ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('column') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

const ALLOW_SCHEMA_FALLBACKS =
  String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true' ||
  String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

type FinanceUserLite = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  paymentType?: string;
  hourlyRate?: number;
  monthlySalary?: number;
};

function toNumberSafe(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  const obj = asObject(v);
  const toNumber = obj?.toNumber;
  if (typeof toNumber === 'function') {
    const n = Number(toNumber.call(v));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDateOnlyToDate(value?: string): Date | undefined {
  const s = String(value || '').trim();
  if (!s) return undefined;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function toDateOnlyString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return String(value);
  return value.toISOString().slice(0, 10);
}

async function selectUsersInWorkspaceByIds(params: {
  organizationId: string;
  userIds: string[];
}): Promise<FinanceUserLite[]> {
  const ids = (params.userIds || []).map((x) => String(x)).filter(Boolean);
  if (ids.length === 0) return [];

  const out: FinanceUserLite[] = [];
  const chunkSize = 500;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    let rows: Array<{
      id: string;
      name: string | null;
      role: string | null;
      department: string | null;
      paymentType: string | null;
      hourlyRate: unknown;
      monthlySalary: unknown;
    }> = [];

    try {
      rows = await prisma.nexusUser.findMany({
        where: {
          id: { in: chunk },
          organizationId: params.organizationId,
        },
        select: {
          id: true,
          name: true,
          role: true,
          department: true,
          paymentType: true,
          hourlyRate: true,
          monthlySalary: true,
        },
      });
    } catch (error: unknown) {
      if (isMissingColumnError(error) && ALLOW_SCHEMA_FALLBACKS) {
        console.warn('[finance-service] nexusUser columns missing; fallback to minimal select', {
          message: getErrorMessage(error),
        });
        const minimalRows = await prisma.nexusUser.findMany({
          where: {
            id: { in: chunk },
            organizationId: params.organizationId,
          },
          select: {
            id: true,
            name: true,
            role: true,
            department: true,
          },
        });

        rows = minimalRows.map((r) => ({
          id: r.id,
          name: r.name,
          role: r.role,
          department: r.department,
          paymentType: null,
          hourlyRate: null,
          monthlySalary: null,
        }));
      } else {
        throw error;
      }
    }

    out.push(
      ...rows.map((row) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? 'Unknown'),
        role: String(row.role ?? 'עובד'),
        department: row.department ?? null,
        paymentType: row.paymentType ?? undefined,
        hourlyRate: row.hourlyRate !== undefined && row.hourlyRate !== null ? Number(row.hourlyRate) : undefined,
        monthlySalary: row.monthlySalary !== undefined && row.monthlySalary !== null ? Number(row.monthlySalary) : undefined,
      }))
    );
  }

  return out;
}

export type FinanceDateRange = {
  from?: string;
  to?: string;
};

export type FinanceUserAggregate = {
  user: FinanceUserLite;
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
  openInvoicesCount: number;
  pendingReceivables: number;
  organizationId: string;
  chart: FinanceChartPoint[];
};

export type FinanceInvoice = {
  id: string;
  number: string;
  amount: number;
  date: string;
  dueDate: string;
  status: string;
  downloadUrl: string;
  clientName: string | null;
};

export type FinanceExpensesUserRow = {
  user: FinanceUserLite;
  totalMinutes: number;
  totalHours: number;
  estimatedCost: number;
  entriesCount: number;
};

export type FinanceExpensesData = {
  organizationId: string;
  totalLaborCost: number;
  totalDirectExpenses: number;
  totalExpenses: number;
  users: FinanceExpensesUserRow[];
};

export async function getFinanceOverviewData(params: {
  organizationId: string;
  userId?: string | null;
  department?: string | null;
  dateRange?: FinanceDateRange;
}): Promise<FinanceOverviewData> {
  try {
    const dateFrom = params.dateRange?.from;
    const dateTo = params.dateRange?.to;
    const dateFromDate = parseDateOnlyToDate(dateFrom);
    const dateToDate = parseDateOnlyToDate(dateTo);

    const whereEntries = {
      organizationId: params.organizationId,
      ...(dateFromDate ? { date: { gte: dateFromDate } } : {}),
      ...(dateToDate ? { date: { lte: dateToDate } } : {}),
      ...(params.userId ? { userId: String(params.userId) } : {}),
    };

    let byUserRows: unknown = [];
    let byDateRows: unknown = [];
    let invoicesAggRows: unknown = [];
    try {
      [byUserRows, byDateRows, invoicesAggRows] = await Promise.all([
        prisma.nexusTimeEntry.groupBy({
          by: ['userId'],
          where: whereEntries,
          _sum: { durationMinutes: true },
          _count: { _all: true },
        }),
        prisma.nexusTimeEntry.groupBy({
          by: ['date'],
          where: whereEntries,
          _sum: { durationMinutes: true },
        }),
        prisma.misradInvoice.groupBy({
          by: ['status'],
          where: {
            organization_id: params.organizationId,
            ...(dateFromDate ? { dateAt: { gte: dateFromDate } } : {}),
            ...(dateToDate ? { dateAt: { lte: dateToDate } } : {}),
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ]);
    } catch (error: unknown) {
      if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
        console.warn('[finance-service] getFinanceOverviewData failed (schema mismatch; fallback to empty)', {
          message: getErrorMessage(error),
        });
        return {
          users: [],
          totalRevenue: 0,
          totalCost: 0,
          netProfit: 0,
          openInvoicesCount: 0,
          pendingReceivables: 0,
          organizationId: params.organizationId,
          chart: [],
        };
      }
      throw error;
    }

    const byUser = Array.isArray(byUserRows) ? byUserRows : [];
    const byDate = Array.isArray(byDateRows) ? byDateRows : [];
    const invoicesAgg = Array.isArray(invoicesAggRows) ? invoicesAggRows : [];

    const userIds = Array.from(new Set(byUser.map((e) => String(e.userId)).filter(Boolean)));
    const dbUsers = await selectUsersInWorkspaceByIds({
      organizationId: params.organizationId,
      userIds,
    });
    const usersById = new Map<string, FinanceUserLite>(dbUsers.map((u) => [String(u.id), u]));

    const totalsByUser = new Map<string, { totalMinutes: number; entriesCount: number }>();
    const totalsByDate = new Map<string, { totalMinutes: number }>();

    for (const row of byUser) {
      const uid = String(row.userId || '').trim();
      if (!uid) continue;
      const minutes = toNumberSafe(row._sum?.durationMinutes);
      const count = toNumberSafe(row._count?._all);
      totalsByUser.set(uid, { totalMinutes: minutes, entriesCount: count });
    }

    for (const row of byDate) {
      const rowObj = asObject(row) ?? {};
      const dateRaw = rowObj.date;
      const dateStr = toDateOnlyString(dateRaw instanceof Date || typeof dateRaw === 'string' ? dateRaw : undefined);
      if (!dateStr) continue;
      const minutes = toNumberSafe(row._sum?.durationMinutes);
      totalsByDate.set(dateStr, { totalMinutes: minutes });
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
      ? usersAggregates.filter((u) => String(u.user?.department || '') === String(params.department))
      : usersAggregates;

    const totalCost = scopedUsers.reduce((sum, u) => sum + Number(u.estimatedCost || 0), 0);

    const paidStatuses = new Set(['PAID', 'paid']);
    const openStatuses = new Set(['PENDING', 'pending', 'OVERDUE', 'overdue']);

    let totalRevenue = 0;
    let pendingReceivables = 0;
    let openInvoicesCount = 0;
    for (const row of invoicesAgg) {
      const rowObj = asObject(row) ?? {};
      const status = typeof rowObj.status === 'string' ? rowObj.status : String(rowObj.status ?? '');
      const sumAmount = toNumberSafe(row._sum?.amount);
      const count = toNumberSafe(row._count?._all);
      if (paidStatuses.has(status)) {
        totalRevenue += sumAmount;
      }
      if (openStatuses.has(status)) {
        pendingReceivables += sumAmount;
        openInvoicesCount += count;
      }
    }

    const entriesCountAll = Array.from(totalsByUser.values()).reduce((acc, v) => acc + Number(v.entriesCount || 0), 0);
    const totalMinutesAll = Array.from(totalsByDate.values()).reduce((acc, v) => acc + Number(v.totalMinutes || 0), 0);
    const totalHoursAll = totalMinutesAll / 60 || 1;
    const avgHourlyCost = totalCost > 0 && entriesCountAll > 0 ? totalCost / totalHoursAll : 0;

    const chart: FinanceChartPoint[] = Array.from(totalsByDate.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, totals]) => {
        const totalHours = totals.totalMinutes / 60;
        const estimatedCost = totalHours * avgHourlyCost;
        return {
          date,
          totalMinutes: totals.totalMinutes,
          totalHours,
          estimatedCost,
        };
      });

    return {
      users: scopedUsers,
      totalRevenue,
      totalCost,
      netProfit: totalRevenue - totalCost,
      openInvoicesCount,
      pendingReceivables,
      organizationId: params.organizationId,
      chart,
    };
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      console.warn('[finance-service] getFinanceOverviewData failed (schema mismatch; fallback to empty)', {
        message: getErrorMessage(error),
      });
      return {
        users: [],
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        openInvoicesCount: 0,
        pendingReceivables: 0,
        organizationId: params.organizationId,
        chart: [],
      };
    }
    throw error;
  }
}

export async function getFinanceInvoices(params: {
  organizationId: string;
  limit?: number;
}): Promise<FinanceInvoice[]> {
  try {
    const limit = Math.min(200, Math.max(1, Math.floor(params.limit ?? 200)));

    const rows = await prisma.misradInvoice.findMany({
      where: { organization_id: params.organizationId },
      include: { client: { select: { name: true } } },
      orderBy: [{ dateAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: String(row.id),
      number: String(row.number ?? ''),
      amount: Number(row.amount ?? 0),
      date: String(row.date ?? ''),
      dueDate: String(row.dueDate ?? ''),
      status: String(row.status ?? ''),
      downloadUrl: String(row.downloadUrl ?? ''),
      clientName: row.client?.name ? String(row.client.name) : null,
    }));
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      console.warn('[finance-service] getFinanceInvoices failed (schema mismatch; fallback to empty)', {
        message: getErrorMessage(error),
      });
      return [];
    }
    throw error;
  }
}

export async function getFinanceExpensesData(params: {
  organizationId: string;
  dateRange?: FinanceDateRange;
  department?: string | null;
}): Promise<FinanceExpensesData> {
  const dateFrom = params.dateRange?.from;
  const dateTo = params.dateRange?.to;
  const dateFromDate = parseDateOnlyToDate(dateFrom);
  const dateToDate = parseDateOnlyToDate(dateTo);

  const whereEntries = {
    organizationId: params.organizationId,
    ...(dateFromDate ? { date: { gte: dateFromDate } } : {}),
    ...(dateToDate ? { date: { lte: dateToDate } } : {}),
  };

  let byUserRows: unknown = [];
  try {
    byUserRows = await prisma.nexusTimeEntry.groupBy({
      by: ['userId'],
      where: whereEntries,
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      console.warn('[finance-service] getFinanceExpensesData failed (schema mismatch; fallback to empty)', {
        message: getErrorMessage(error),
      });
      return {
        organizationId: params.organizationId,
        totalLaborCost: 0,
        totalDirectExpenses: 0,
        totalExpenses: 0,
        users: [],
      };
    }
    throw error;
  }

  const byUser = Array.isArray(byUserRows) ? byUserRows : [];

  const userIds = Array.from(new Set(byUser.map((e) => String(e.userId)).filter(Boolean)));
  const dbUsers = await selectUsersInWorkspaceByIds({
    organizationId: params.organizationId,
    userIds,
  });
  const usersById = new Map<string, FinanceUserLite>(dbUsers.map((u) => [String(u.id), u]));

  const totalsByUser = new Map<string, { totalMinutes: number; entriesCount: number }>();
  for (const row of byUser) {
    const uid = String(row.userId || '').trim();
    if (!uid) continue;
    const minutes = toNumberSafe(row._sum?.durationMinutes);
    const count = toNumberSafe(row._count?._all);
    totalsByUser.set(uid, { totalMinutes: minutes, entriesCount: count });
  }

  const usersAggregates: FinanceExpensesUserRow[] = Array.from(totalsByUser.entries()).map(([uid, totals]) => {
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
    ? usersAggregates.filter((u) => String(u.user?.department || '') === String(params.department))
    : usersAggregates;

  const totalLaborCost = scopedUsers.reduce((sum, u) => sum + Number(u.estimatedCost || 0), 0);

  let totalDirectExpenses = 0;
  try {
    const directExpensesAgg = await prisma.misradClient.aggregate({
      where: { organizationId: params.organizationId },
      _sum: { directExpenses: true },
    });
    totalDirectExpenses = toNumberSafe(directExpensesAgg._sum?.directExpenses);
  } catch (error: unknown) {
    if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
      console.warn('[finance-service] misradClient directExpenses missing; fallback to 0', {
        message: getErrorMessage(error),
      });
      totalDirectExpenses = 0;
    } else {
      throw error;
    }
  }

  return {
    organizationId: params.organizationId,
    totalLaborCost,
    totalDirectExpenses,
    totalExpenses: totalLaborCost + totalDirectExpenses,
    users: scopedUsers,
  };
}
