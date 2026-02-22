'use server';

import { Prisma } from '@prisma/client';
import prisma, { queryRawOrgScopedSql } from '@/lib/prisma';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { hasPermission } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Types ──────────────────────────────────────────────────────────

export type DailySummaryEntry = {
  date: string;
  dayOfWeek: string;
  dayHebrew: string;
  startTime: string | null;
  endTime: string | null;
  totalMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  regularMinutes: number;
  overtime125: number;
  overtime150: number;
  overtime175: number;
  overtime200: number;
  note: string | null;
  event: string | null;
};

export type MonthlyReportData = {
  id: string;
  year: number;
  month: number;
  employeeName: string;
  employeeNumber: string | null;
  department: string | null;
  standardDailyHours: number;
  totalPresenceDays: number;
  totalStandardDays: number;
  totalPresenceMinutes: number;
  totalStandardMinutes: number;
  totalBreakMinutes: number;
  paidBreakMinutes: number;
  totalPayableMinutes: number;
  regularMinutes: number;
  overtime100Minutes: number;
  overtime125Minutes: number;
  overtime150Minutes: number;
  overtime175Minutes: number;
  overtime200Minutes: number;
  absenceMinutes: number;
  dailyBreakdown: DailySummaryEntry[];
  events: Record<string, string> | null;
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string | null;
};

export type SalaryConfig = {
  standardDailyHours: number;
  breakMinutesPerDay: number;
  paidBreak: boolean;
  overtime125After: number;
  overtime150After: number;
  overtime175After: number;
  overtime200After: number;
};

// ─── Hebrew Day Names ───────────────────────────────────────────────

const HEBREW_DAYS: Record<number, string> = {
  0: 'א׳',
  1: 'ב׳',
  2: 'ג׳',
  3: 'ד׳',
  4: 'ה׳',
  5: 'שישי',
  6: 'שבת',
};

const HEBREW_DAY_NAMES: Record<number, string> = {
  0: 'יום ראשון',
  1: 'יום שני',
  2: 'יום שלישי',
  3: 'יום רביעי',
  4: 'יום חמישי',
  5: 'יום שישי',
  6: 'שבת',
};

// ─── Salary Config ──────────────────────────────────────────────────

export async function getSalaryConfig(orgSlugOrId: string): Promise<SalaryConfig> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;

  const config = await prisma.attendanceSalaryConfig.findUnique({
    where: { organizationId: String(workspace.id) },
  });

  if (!config) {
    return {
      standardDailyHours: 9,
      breakMinutesPerDay: 24,
      paidBreak: true,
      overtime125After: 0,
      overtime150After: 120,
      overtime175After: 0,
      overtime200After: 180,
    };
  }

  return {
    standardDailyHours: Number(config.standardDailyHours),
    breakMinutesPerDay: config.breakMinutesPerDay,
    paidBreak: config.paidBreak,
    overtime125After: config.overtime125After,
    overtime150After: config.overtime150After,
    overtime175After: config.overtime175After,
    overtime200After: config.overtime200After,
  };
}

export async function updateSalaryConfig(
  orgSlugOrId: string,
  data: Partial<SalaryConfig>
): Promise<SalaryConfig> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const canManage = await hasPermission('manage_team');
  if (!canManage) throw new Error('Forbidden');

  const config = await prisma.attendanceSalaryConfig.upsert({
    where: { organizationId: String(workspace.id) },
    create: {
      organizationId: String(workspace.id),
      standardDailyHours: data.standardDailyHours ?? 9,
      breakMinutesPerDay: data.breakMinutesPerDay ?? 24,
      paidBreak: data.paidBreak ?? true,
      overtime125After: data.overtime125After ?? 0,
      overtime150After: data.overtime150After ?? 120,
      overtime175After: data.overtime175After ?? 0,
      overtime200After: data.overtime200After ?? 180,
    },
    update: {
      ...(data.standardDailyHours !== undefined && { standardDailyHours: data.standardDailyHours }),
      ...(data.breakMinutesPerDay !== undefined && { breakMinutesPerDay: data.breakMinutesPerDay }),
      ...(data.paidBreak !== undefined && { paidBreak: data.paidBreak }),
      ...(data.overtime125After !== undefined && { overtime125After: data.overtime125After }),
      ...(data.overtime150After !== undefined && { overtime150After: data.overtime150After }),
      ...(data.overtime175After !== undefined && { overtime175After: data.overtime175After }),
      ...(data.overtime200After !== undefined && { overtime200After: data.overtime200After }),
    },
  });

  revalidatePath('/', 'layout');

  return {
    standardDailyHours: Number(config.standardDailyHours),
    breakMinutesPerDay: config.breakMinutesPerDay,
    paidBreak: config.paidBreak,
    overtime125After: config.overtime125After,
    overtime150After: config.overtime150After,
    overtime175After: config.overtime175After,
    overtime200After: config.overtime200After,
  };
}

// ─── Daily Summary ──────────────────────────────────────────────────

type RawTimeEntry = {
  id: string;
  start_time: Date | string;
  end_time: Date | string | null;
  duration_minutes: number | null;
  date: Date | string;
  note: string | null;
};

export async function getDailySummary(
  orgSlugOrId: string,
  dateStr?: string
): Promise<{
  date: string;
  entries: Array<{
    id: string;
    startTime: string;
    endTime: string | null;
    durationMinutes: number;
    note: string | null;
  }>;
  totalMinutes: number;
  totalHoursFormatted: string;
}> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;

  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const rows = await queryRawOrgScopedSql<RawTimeEntry[]>(prisma, {
    organizationId: String(workspace.id),
    reason: 'attendance_daily_summary',
    sql: Prisma.sql`
      SELECT id, start_time, end_time, duration_minutes, date, note
      FROM nexus_time_entries
      WHERE organization_id = ${String(workspace.id)}::uuid
        AND user_id = ${String(dbUser.id)}::uuid
        AND date = ${targetDate}::date
        AND voided_at IS NULL
      ORDER BY start_time ASC
    `,
  });

  const entries = (Array.isArray(rows) ? rows : []).map((r) => {
    const startMs = new Date(String(r.start_time)).getTime();
    const endMs = r.end_time ? new Date(String(r.end_time)).getTime() : Date.now();
    const dur = r.duration_minutes ?? (endMs > startMs ? Math.round((endMs - startMs) / 60000) : 0);
    return {
      id: String(r.id),
      startTime: new Date(String(r.start_time)).toISOString(),
      endTime: r.end_time ? new Date(String(r.end_time)).toISOString() : null,
      durationMinutes: dur,
      note: r.note ?? null,
    };
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return {
    date: targetDate,
    entries,
    totalMinutes,
    totalHoursFormatted: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`,
  };
}

// ─── Overtime Calculation (Israeli Labor Law) ───────────────────────

function calculateOvertimeBreakdown(
  totalMinutes: number,
  config: SalaryConfig
): {
  regularMinutes: number;
  overtime125: number;
  overtime150: number;
  overtime175: number;
  overtime200: number;
  breakMinutes: number;
  netMinutes: number;
} {
  const breakMinutes = config.breakMinutesPerDay;
  const netMinutes = Math.max(0, totalMinutes - breakMinutes);
  const standardMinutes = Math.round(config.standardDailyHours * 60);

  if (netMinutes <= standardMinutes) {
    return {
      regularMinutes: netMinutes,
      overtime125: 0,
      overtime150: 0,
      overtime175: 0,
      overtime200: 0,
      breakMinutes,
      netMinutes,
    };
  }

  const overtimeTotal = netMinutes - standardMinutes;
  let remaining = overtimeTotal;

  // Israeli law: first 2 hours at 125%, next at 150%, etc.
  // Config allows customization per org
  const tiers = [
    { after: config.overtime125After, rate: 125, minutes: 0 },
    { after: config.overtime150After, rate: 150, minutes: 0 },
    { after: config.overtime175After, rate: 175, minutes: 0 },
    { after: config.overtime200After, rate: 200, minutes: 0 },
  ].filter((t) => t.after > 0 || t.rate === 125);

  // Sort by threshold ascending
  tiers.sort((a, b) => a.after - b.after);

  for (let i = 0; i < tiers.length && remaining > 0; i++) {
    const currentThreshold = tiers[i].after;
    const nextThreshold = i + 1 < tiers.length ? tiers[i + 1].after : Infinity;
    const tierCapacity = nextThreshold === Infinity ? remaining : Math.max(0, nextThreshold - currentThreshold);
    const allocated = Math.min(remaining, tierCapacity);
    tiers[i].minutes = allocated;
    remaining -= allocated;
  }

  const findTier = (rate: number) => tiers.find((t) => t.rate === rate)?.minutes ?? 0;

  return {
    regularMinutes: standardMinutes,
    overtime125: findTier(125),
    overtime150: findTier(150),
    overtime175: findTier(175),
    overtime200: findTier(200),
    breakMinutes,
    netMinutes,
  };
}

// ─── Generate Monthly Report ────────────────────────────────────────

export async function generateMonthlyReport(
  orgSlugOrId: string,
  params: {
    userId?: string;
    year: number;
    month: number;
  }
): Promise<MonthlyReportData> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;
  const canManage = await hasPermission('manage_team');

  const targetUserId = params.userId && params.userId !== String(dbUser.id)
    ? (canManage ? params.userId : (() => { throw new Error('Forbidden'); })())
    : String(dbUser.id);

  const config = await getSalaryConfig(orgSlugOrId);

  // Get user info: OrganizationUser has full_name, NexusUser has department
  const [orgUser, nexusUser] = await Promise.all([
    prisma.organizationUser.findUnique({
      where: { id: targetUserId },
      select: { full_name: true, email: true },
    }),
    prisma.nexusUser.findFirst({
      where: { organizationId: String(workspace.id), id: targetUserId },
      select: { name: true, department: true },
    }),
  ]);

  const employeeName = nexusUser?.name || orgUser?.full_name || 'עובד';
  const department = nexusUser?.department || null;
  const employeeNumber: string | null = null;

  // Get all time entries for the month
  const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
  const endDate = params.month === 12
    ? `${params.year + 1}-01-01`
    : `${params.year}-${String(params.month + 1).padStart(2, '0')}-01`;

  const rows = await queryRawOrgScopedSql<RawTimeEntry[]>(prisma, {
    organizationId: String(workspace.id),
    reason: 'attendance_monthly_report',
    sql: Prisma.sql`
      SELECT id, start_time, end_time, duration_minutes, date, note
      FROM nexus_time_entries
      WHERE organization_id = ${String(workspace.id)}::uuid
        AND user_id = ${targetUserId}::uuid
        AND date >= ${startDate}::date
        AND date < ${endDate}::date
        AND voided_at IS NULL
      ORDER BY date ASC, start_time ASC
    `,
  });

  const entries = Array.isArray(rows) ? rows : [];

  // Group by date
  const byDate = new Map<string, RawTimeEntry[]>();
  for (const entry of entries) {
    const d = new Date(String(entry.date)).toISOString().split('T')[0];
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(entry);
  }

  // Calculate days in month
  const daysInMonth = new Date(params.year, params.month, 0).getDate();

  // Build daily breakdown
  const dailyBreakdown: DailySummaryEntry[] = [];
  let totalPresenceDays = 0;
  let totalPresenceMinutes = 0;
  let totalBreakMinutes = 0;
  let totalRegular = 0;
  let totalOT125 = 0;
  let totalOT150 = 0;
  let totalOT175 = 0;
  let totalOT200 = 0;
  let totalAbsence = 0;

  // Count standard working days (Sun-Thu)
  let totalStandardDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${params.year}-${String(params.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();
    const isWorkDay = dayOfWeek >= 0 && dayOfWeek <= 4; // Sun-Thu
    const isFriday = dayOfWeek === 5;
    const isSaturday = dayOfWeek === 6;

    if (isWorkDay) totalStandardDays++;

    const dayEntries = byDate.get(dateStr) || [];

    if (dayEntries.length === 0) {
      dailyBreakdown.push({
        date: dateStr,
        dayOfWeek: HEBREW_DAYS[dayOfWeek] ?? '',
        dayHebrew: HEBREW_DAY_NAMES[dayOfWeek] ?? '',
        startTime: null,
        endTime: null,
        totalMinutes: 0,
        breakMinutes: 0,
        netMinutes: 0,
        regularMinutes: 0,
        overtime125: 0,
        overtime150: 0,
        overtime175: 0,
        overtime200: 0,
        note: null,
        event: isFriday ? 'יום שישי' : isSaturday ? 'שבת' : isWorkDay ? null : null,
      });

      if (isWorkDay) {
        totalAbsence += Math.round(config.standardDailyHours * 60);
      }
      continue;
    }

    // Calculate total minutes for the day
    let dayTotalMinutes = 0;
    let firstStart: string | null = null;
    let lastEnd: string | null = null;
    const notes: string[] = [];

    for (const entry of dayEntries) {
      const startMs = new Date(String(entry.start_time)).getTime();
      const endMs = entry.end_time ? new Date(String(entry.end_time)).getTime() : null;
      const dur = entry.duration_minutes ?? (endMs && endMs > startMs ? Math.round((endMs - startMs) / 60000) : 0);
      dayTotalMinutes += dur;

      const startTimeStr = new Date(String(entry.start_time)).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
      const endTimeStr = entry.end_time
        ? new Date(String(entry.end_time)).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
        : null;

      if (!firstStart || startTimeStr < firstStart) firstStart = startTimeStr;
      if (endTimeStr && (!lastEnd || endTimeStr > lastEnd)) lastEnd = endTimeStr;
      if (entry.note) notes.push(String(entry.note));
    }

    totalPresenceDays++;
    totalPresenceMinutes += dayTotalMinutes;

    const breakdown = calculateOvertimeBreakdown(dayTotalMinutes, config);
    totalBreakMinutes += breakdown.breakMinutes;
    totalRegular += breakdown.regularMinutes;
    totalOT125 += breakdown.overtime125;
    totalOT150 += breakdown.overtime150;
    totalOT175 += breakdown.overtime175;
    totalOT200 += breakdown.overtime200;

    dailyBreakdown.push({
      date: dateStr,
      dayOfWeek: HEBREW_DAYS[dayOfWeek] ?? '',
      dayHebrew: HEBREW_DAY_NAMES[dayOfWeek] ?? '',
      startTime: firstStart,
      endTime: lastEnd,
      totalMinutes: dayTotalMinutes,
      breakMinutes: breakdown.breakMinutes,
      netMinutes: breakdown.netMinutes,
      regularMinutes: breakdown.regularMinutes,
      overtime125: breakdown.overtime125,
      overtime150: breakdown.overtime150,
      overtime175: breakdown.overtime175,
      overtime200: breakdown.overtime200,
      note: notes.length > 0 ? notes.join('; ') : null,
      event: isFriday ? 'יום שישי' : isSaturday ? 'שבת' : null,
    });
  }

  const standardMinutes = totalStandardDays * Math.round(config.standardDailyHours * 60);
  const paidBreakMinutes = config.paidBreak ? totalBreakMinutes : 0;
  const totalPayableMinutes = totalRegular + totalOT125 + totalOT150 + totalOT175 + totalOT200 + paidBreakMinutes;

  // Upsert the report
  const report = await prisma.attendanceMonthlyReport.upsert({
    where: {
      organizationId_userId_year_month: {
        organizationId: String(workspace.id),
        userId: targetUserId,
        year: params.year,
        month: params.month,
      },
    },
    create: {
      organizationId: String(workspace.id),
      userId: targetUserId,
      year: params.year,
      month: params.month,
      employeeName,
      employeeNumber,
      department,
      standardDailyHours: config.standardDailyHours,
      totalPresenceDays,
      totalStandardDays,
      totalPresenceMinutes,
      totalStandardMinutes: standardMinutes,
      totalBreakMinutes,
      paidBreakMinutes,
      totalPayableMinutes,
      regularMinutes: totalRegular,
      overtime100Minutes: 0,
      overtime125Minutes: totalOT125,
      overtime150Minutes: totalOT150,
      overtime175Minutes: totalOT175,
      overtime200Minutes: totalOT200,
      absenceMinutes: totalAbsence,
      dailyBreakdown: dailyBreakdown as unknown as Prisma.InputJsonValue,
      events: Prisma.JsonNull,
    },
    update: {
      employeeName,
      employeeNumber,
      department,
      standardDailyHours: config.standardDailyHours,
      totalPresenceDays,
      totalStandardDays,
      totalPresenceMinutes,
      totalStandardMinutes: standardMinutes,
      totalBreakMinutes,
      paidBreakMinutes,
      totalPayableMinutes,
      regularMinutes: totalRegular,
      overtime100Minutes: 0,
      overtime125Minutes: totalOT125,
      overtime150Minutes: totalOT150,
      overtime175Minutes: totalOT175,
      overtime200Minutes: totalOT200,
      absenceMinutes: totalAbsence,
      dailyBreakdown: dailyBreakdown as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/', 'layout');

  return {
    id: String(report.id),
    year: report.year,
    month: report.month,
    employeeName: report.employeeName,
    employeeNumber: report.employeeNumber,
    department: report.department,
    standardDailyHours: Number(report.standardDailyHours),
    totalPresenceDays: report.totalPresenceDays,
    totalStandardDays: report.totalStandardDays,
    totalPresenceMinutes: report.totalPresenceMinutes,
    totalStandardMinutes: report.totalStandardMinutes,
    totalBreakMinutes: report.totalBreakMinutes,
    paidBreakMinutes: report.paidBreakMinutes,
    totalPayableMinutes: report.totalPayableMinutes,
    regularMinutes: report.regularMinutes,
    overtime100Minutes: report.overtime100Minutes,
    overtime125Minutes: report.overtime125Minutes,
    overtime150Minutes: report.overtime150Minutes,
    overtime175Minutes: report.overtime175Minutes,
    overtime200Minutes: report.overtime200Minutes,
    absenceMinutes: report.absenceMinutes,
    dailyBreakdown: dailyBreakdown,
    events: null,
    pdfUrl: report.pdfUrl,
    sentAt: report.sentAt?.toISOString() ?? null,
    createdAt: report.createdAt?.toISOString() ?? null,
  };
}

// ─── List Monthly Reports ───────────────────────────────────────────

export async function listMonthlyReports(
  orgSlugOrId: string,
  params?: { year?: number; month?: number; userId?: string }
): Promise<MonthlyReportData[]> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;
  const canManage = await hasPermission('manage_team');

  const where: Record<string, unknown> = {
    organizationId: String(workspace.id),
  };

  if (params?.year) where.year = params.year;
  if (params?.month) where.month = params.month;

  if (params?.userId && params.userId !== String(dbUser.id)) {
    if (!canManage) throw new Error('Forbidden');
    where.userId = params.userId;
  } else if (!canManage) {
    where.userId = String(dbUser.id);
  }

  const reports = await prisma.attendanceMonthlyReport.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { employeeName: 'asc' }],
    take: 100,
  });

  return reports.map((r: typeof reports[number]) => ({
    id: String(r.id),
    year: r.year,
    month: r.month,
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    department: r.department,
    standardDailyHours: Number(r.standardDailyHours),
    totalPresenceDays: r.totalPresenceDays,
    totalStandardDays: r.totalStandardDays,
    totalPresenceMinutes: r.totalPresenceMinutes,
    totalStandardMinutes: r.totalStandardMinutes,
    totalBreakMinutes: r.totalBreakMinutes,
    paidBreakMinutes: r.paidBreakMinutes,
    totalPayableMinutes: r.totalPayableMinutes,
    regularMinutes: r.regularMinutes,
    overtime100Minutes: r.overtime100Minutes,
    overtime125Minutes: r.overtime125Minutes,
    overtime150Minutes: r.overtime150Minutes,
    overtime175Minutes: r.overtime175Minutes,
    overtime200Minutes: r.overtime200Minutes,
    absenceMinutes: r.absenceMinutes,
    dailyBreakdown: Array.isArray(r.dailyBreakdown) ? (r.dailyBreakdown as unknown as DailySummaryEntry[]) : [],
    events: r.events as Record<string, string> | null,
    pdfUrl: r.pdfUrl,
    sentAt: r.sentAt?.toISOString() ?? null,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));
}

// ─── Get Single Report ──────────────────────────────────────────────

export async function getMonthlyReport(
  orgSlugOrId: string,
  reportId: string
): Promise<MonthlyReportData | null> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const dbUser = resolved.user;
  const canManage = await hasPermission('manage_team');

  const r = await prisma.attendanceMonthlyReport.findFirst({
    where: {
      id: reportId,
      organizationId: String(workspace.id),
    },
  });

  if (!r) return null;

  if (r.userId !== String(dbUser.id) && !canManage) {
    throw new Error('Forbidden');
  }

  return {
    id: String(r.id),
    year: r.year,
    month: r.month,
    employeeName: r.employeeName,
    employeeNumber: r.employeeNumber,
    department: r.department,
    standardDailyHours: Number(r.standardDailyHours),
    totalPresenceDays: r.totalPresenceDays,
    totalStandardDays: r.totalStandardDays,
    totalPresenceMinutes: r.totalPresenceMinutes,
    totalStandardMinutes: r.totalStandardMinutes,
    totalBreakMinutes: r.totalBreakMinutes,
    paidBreakMinutes: r.paidBreakMinutes,
    totalPayableMinutes: r.totalPayableMinutes,
    regularMinutes: r.regularMinutes,
    overtime100Minutes: r.overtime100Minutes,
    overtime125Minutes: r.overtime125Minutes,
    overtime150Minutes: r.overtime150Minutes,
    overtime175Minutes: r.overtime175Minutes,
    overtime200Minutes: r.overtime200Minutes,
    absenceMinutes: r.absenceMinutes,
    dailyBreakdown: Array.isArray(r.dailyBreakdown) ? (r.dailyBreakdown as unknown as DailySummaryEntry[]) : [],
    events: r.events as Record<string, string> | null,
    pdfUrl: r.pdfUrl,
    sentAt: r.sentAt?.toISOString() ?? null,
    createdAt: r.createdAt?.toISOString() ?? null,
  };
}

// ─── Generate Reports for All Users in Org ──────────────────────────

export async function generateAllMonthlyReports(
  orgSlugOrId: string,
  params: { year: number; month: number }
): Promise<{ generated: number; errors: string[] }> {
  const resolved = await resolveWorkspaceCurrentUserForApi(String(orgSlugOrId));
  const workspace = resolved.workspace;
  const canManage = await hasPermission('manage_team');
  if (!canManage) throw new Error('Forbidden');

  // Get all users with time entries in this month
  const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
  const endDate = params.month === 12
    ? `${params.year + 1}-01-01`
    : `${params.year}-${String(params.month + 1).padStart(2, '0')}-01`;

  const userRows = await queryRawOrgScopedSql<Array<{ user_id: string }>>(prisma, {
    organizationId: String(workspace.id),
    reason: 'attendance_monthly_all_users',
    sql: Prisma.sql`
      SELECT DISTINCT user_id
      FROM nexus_time_entries
      WHERE organization_id = ${String(workspace.id)}::uuid
        AND date >= ${startDate}::date
        AND date < ${endDate}::date
        AND voided_at IS NULL
    `,
  });

  const userIds = (Array.isArray(userRows) ? userRows : []).map((r) => String(r.user_id));
  let generated = 0;
  const errors: string[] = [];

  for (const uid of userIds) {
    try {
      await generateMonthlyReport(orgSlugOrId, {
        userId: uid,
        year: params.year,
        month: params.month,
      });
      generated++;
    } catch (e: unknown) {
      errors.push(`${uid}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  revalidatePath('/', 'layout');
  return { generated, errors };
}
