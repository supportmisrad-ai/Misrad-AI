import 'server-only';
import prisma from '@/lib/prisma';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isMissingColumnError(error: unknown): boolean {
  const obj = asObject(error) ?? {};
  const code = typeof obj.code === 'string' ? obj.code : '';
  const message = typeof obj.message === 'string' ? obj.message.toLowerCase() : '';
  return code === '42703' || message.includes('column') && message.includes('does not exist');
}

type FinanceUserLite = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  paymentType?: string;
  hourlyRate?: number;
  monthlySalary?: number;
};

type FinanceTimeEntryLite = {
  id: string;
  organizationId: string;
  userId: string;
  durationMinutes: number | null;
  date: Date;
};

type FinanceInvoiceLite = {
  amount: unknown;
  status: unknown;
  date: unknown;
  dateAt: unknown;
};

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
    const rows = await prisma.nexusUser.findMany({
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
  const dateFrom = params.dateRange?.from;
  const dateTo = params.dateRange?.to;
  const dateFromDate = parseDateOnlyToDate(dateFrom);
  const dateToDate = parseDateOnlyToDate(dateTo);

  const timeEntries: FinanceTimeEntryLite[] = [];
  const pageSize = 1000;
  for (let page = 0; ; page += 1) {
    const skip = page * pageSize;
    const rows = await prisma.nexusTimeEntry.findMany({
      where: {
        organizationId: params.organizationId,
        ...(dateFromDate ? { date: { gte: dateFromDate } } : {}),
        ...(dateToDate ? { date: { lte: dateToDate } } : {}),
        ...(params.userId ? { userId: String(params.userId) } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        durationMinutes: true,
        date: true,
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip,
      take: pageSize,
    });

    if (rows.length === 0) break;
    timeEntries.push(...rows);
    if (rows.length < pageSize) break;
  }

  const invoicesRows: FinanceInvoiceLite[] = await prisma.misradInvoice.findMany({
    where: {
      organization_id: params.organizationId,
      ...(dateFromDate ? { dateAt: { gte: dateFromDate } } : {}),
      ...(dateToDate ? { dateAt: { lte: dateToDate } } : {}),
    },
    select: {
      amount: true,
      status: true,
      date: true,
      dateAt: true,
    },
    take: 5000,
  });

  const entries = Array.isArray(timeEntries) ? timeEntries : [];
  const invoices = invoicesRows;

  const userIds = Array.from(new Set(entries.map((e) => String(e.userId)).filter(Boolean)));
  const dbUsers = await selectUsersInWorkspaceByIds({
    organizationId: params.organizationId,
    userIds,
  });
  const usersById = new Map<string, FinanceUserLite>(dbUsers.map((u) => [String(u.id), u]));

  const totalsByUser = new Map<string, { totalMinutes: number; entriesCount: number }>();
  const totalsByDate = new Map<string, { totalMinutes: number }>();

  for (const entry of entries) {
    const uid = String(entry.userId || '');
    if (!uid) continue;

    const minutes = Number(entry.durationMinutes || 0);
    const current = totalsByUser.get(uid) ?? { totalMinutes: 0, entriesCount: 0 };
    current.totalMinutes += minutes;
    current.entriesCount += 1;
    totalsByUser.set(uid, current);

    const entryDate = toDateOnlyString(entry.date);
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
    ? usersAggregates.filter((u) => String(u.user?.department || '') === String(params.department))
    : usersAggregates;

  const totalCost = scopedUsers.reduce((sum, u) => sum + Number(u.estimatedCost || 0), 0);

  const paidInvoices = invoices.filter((i) => String(i?.status || '').toUpperCase() === 'PAID');
  const openInvoices = invoices.filter((i) => {
    const s = String(i?.status || '').toUpperCase();
    return s === 'PENDING' || s === 'OVERDUE';
  });
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + Number(i?.amount || 0), 0);
  const pendingReceivables = openInvoices.reduce((sum, i) => sum + Number(i?.amount || 0), 0);
  const openInvoicesCount = openInvoices.length;

  const chart: FinanceChartPoint[] = Array.from(totalsByDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, totals]) => {
      const totalHours = totals.totalMinutes / 60;
      const totalHoursAll = entries.reduce((acc, e) => acc + Number(e.durationMinutes || 0), 0) / 60 || 1;
      const avgHourlyCost = totalCost > 0 && entries.length > 0 ? totalCost / totalHoursAll : 0;
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
}

export async function getFinanceInvoices(params: {
  organizationId: string;
  limit?: number;
}): Promise<FinanceInvoice[]> {
  const limit = params.limit ?? 250;

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

  const timeEntries = await prisma.nexusTimeEntry.findMany({
    where: {
      organizationId: params.organizationId,
      ...(dateFromDate ? { date: { gte: dateFromDate } } : {}),
      ...(dateToDate ? { date: { lte: dateToDate } } : {}),
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      durationMinutes: true,
      date: true,
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: 5000,
  });

  const entries = Array.isArray(timeEntries) ? timeEntries : [];

  const userIds = Array.from(new Set(entries.map((e) => String(e.userId)).filter(Boolean)));
  const dbUsers = await selectUsersInWorkspaceByIds({
    organizationId: params.organizationId,
    userIds,
  });
  const usersById = new Map<string, FinanceUserLite>(dbUsers.map((u) => [String(u.id), u]));

  const totalsByUser = new Map<string, { totalMinutes: number; entriesCount: number }>();
  for (const entry of entries) {
    const uid = String(entry.userId || '');
    if (!uid) continue;

    const minutes = Number(entry.durationMinutes || 0);
    const current = totalsByUser.get(uid) ?? { totalMinutes: 0, entriesCount: 0 };
    current.totalMinutes += minutes;
    current.entriesCount += 1;
    totalsByUser.set(uid, current);
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

  const clientsRows = await prisma.misradClient.findMany({
    where: { organizationId: params.organizationId },
    select: { directExpenses: true },
    take: 5000,
  });

  const totalDirectExpenses = clientsRows.reduce(
    (sum, row) => sum + Number(row.directExpenses ?? 0),
    0
  );

  return {
    organizationId: params.organizationId,
    totalLaborCost,
    totalDirectExpenses,
    totalExpenses: totalLaborCost + totalDirectExpenses,
    users: scopedUsers,
  };
}
