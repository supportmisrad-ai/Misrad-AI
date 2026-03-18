'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { getHebrewYearLetters } from '@/lib/hebrew-calendar';
import {
  generateMonthlyReport,
  generateAllMonthlyReports,
  listMonthlyReports,
} from '@/app/actions/attendance-reports';
import type { MonthlyReportData } from '@/types/attendance-reports';

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const HEBREW_MONTHS: Record<number, string> = {
  1: 'ינואר', 2: 'פברואר', 3: 'מרץ', 4: 'אפריל',
  5: 'מאי', 6: 'יוני', 7: 'יולי', 8: 'אוגוסט',
  9: 'ספטמבר', 10: 'אוקטובר', 11: 'נובמבר', 12: 'דצמבר',
};

function getInitialYearMonth() {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return { year, month };
}

export function AttendanceReportsView() {
  const pathname = usePathname();
  const orgSlug = useMemo(() => getWorkspaceOrgSlugFromPathname(pathname), [pathname]);

  const initial = useMemo(() => getInitialYearMonth(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [reports, setReports] = useState<MonthlyReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedReport, setSelectedReport] = useState<MonthlyReportData | null>(null);

  const monthLabel = useMemo(() => {
    const date = new Date(year, month - 1, 1);
    const hebrewYear = getHebrewYearLetters(date);
    return `${HEBREW_MONTHS[month] || month} ${year} (ה'${hebrewYear})`;
  }, [month, year]);

  const slug = orgSlug ?? '';

  const loadReports = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const data = await listMonthlyReports(slug, { year, month });
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [slug, year, month]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleGenerateMy = async () => {
    if (!slug) return;
    setIsGenerating(true);
    setMessage('');
    try {
      const report = await generateMonthlyReport(slug, { year, month });
      setMessage(`דוח נוצר בהצלחה עבור ${report.employeeName}`);
      const data = await listMonthlyReports(slug, { year, month });
      setReports(data);
    } catch (e: unknown) {
      setMessage(`שגיאה: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!slug) return;
    setIsGeneratingAll(true);
    setMessage('');
    try {
      const result = await generateAllMonthlyReports(slug, { year, month });
      setMessage(`נוצרו ${result.generated} דוחות${result.errors.length > 0 ? ` (${result.errors.length} שגיאות)` : ''}`);
      const data = await listMonthlyReports(slug, { year, month });
      setReports(data);
    } catch (e: unknown) {
      setMessage(`שגיאה: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await listMonthlyReports(slug, { year, month });
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openPdf = (reportId: string) => {
    window.open(`/api/attendance-report-pdf/${reportId}?orgSlug=${encodeURIComponent(slug)}`, '_blank');
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6" dir="rtl">

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronRight size={20} />
        </button>

        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-sky-600" />
          <span className="text-lg font-black text-slate-900">{monthLabel}</span>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl hover:bg-slate-100 transition"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleGenerateMy}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-500 text-white font-black text-sm hover:bg-sky-600 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          צור דוח שלי
        </button>

        <button
          onClick={handleGenerateAll}
          disabled={isGeneratingAll}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {isGeneratingAll ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
          צור דוחות לכל העובדים
        </button>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          רענן
        </button>
      </div>

      {message ? (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
          {message}
        </div>
      ) : null}

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-sky-500" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <div className="text-lg font-black text-slate-400">אין דוחות לחודש זה</div>
          <div className="text-sm text-slate-400 mt-1">לחץ על &quot;צור דוח שלי&quot; או &quot;צור דוחות לכל העובדים&quot;</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`bg-white rounded-2xl border-2 transition cursor-pointer ${
                selectedReport?.id === report.id
                  ? 'border-sky-400 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
              onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
            >
              {/* Report Card Header */}
              <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                    <Clock size={20} className="text-sky-600" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900">{report.employeeName}</div>
                    <div className="text-xs text-slate-500">
                      {report.department ? `${report.department} · ` : ''}
                      {report.totalPresenceDays} ימי נוכחות מתוך {report.totalStandardDays}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 font-bold">שעות נוכחות</div>
                    <div className="font-black text-slate-900 tabular-nums">{minutesToHHMM(report.totalPresenceMinutes)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 font-bold">לתשלום</div>
                    <div className="font-black text-sky-600 tabular-nums">{minutesToHHMM(report.totalPayableMinutes)}</div>
                  </div>
                  {report.overtime125Minutes + report.overtime150Minutes + report.overtime175Minutes + report.overtime200Minutes > 0 ? (
                    <div className="text-center">
                      <div className="text-xs text-slate-400 font-bold">נוספות</div>
                      <div className="font-black text-emerald-600 tabular-nums">
                        {minutesToHHMM(report.overtime125Minutes + report.overtime150Minutes + report.overtime175Minutes + report.overtime200Minutes)}
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPdf(report.id);
                    }}
                    className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition"
                    title="הורד דוח PDF"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedReport?.id === report.id ? (
                <div className="border-t border-slate-100 p-4 md:p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <StatCard label="רגילות" value={minutesToHHMM(report.regularMinutes)} />
                    <StatCard label="125%" value={minutesToHHMM(report.overtime125Minutes)} color="text-emerald-600" />
                    <StatCard label="150%" value={minutesToHHMM(report.overtime150Minutes)} color="text-amber-600" />
                    <StatCard label="200%" value={minutesToHHMM(report.overtime200Minutes)} color="text-purple-600" />
                    <StatCard label="הפסקות" value={minutesToHHMM(report.totalBreakMinutes)} />
                    <StatCard label="חוסר" value={minutesToHHMM(report.absenceMinutes)} color="text-rose-600" />
                    <StatCard label="תקן יומי" value={`${report.standardDailyHours}h`} />
                    <StatCard label="שעות תקן" value={minutesToHHMM(report.totalStandardMinutes)} />
                  </div>

                  {/* Daily Breakdown Table */}
                  {report.dailyBreakdown.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="px-3 py-2 text-center font-bold">תאריך</th>
                            <th className="px-3 py-2 text-center font-bold">יום</th>
                            <th className="px-3 py-2 text-center font-bold">כניסה</th>
                            <th className="px-3 py-2 text-center font-bold">יציאה</th>
                            <th className="px-3 py-2 text-center font-bold">סה&quot;כ</th>
                            <th className="px-3 py-2 text-center font-bold">רגילות</th>
                            <th className="px-3 py-2 text-center font-bold">125%</th>
                            <th className="px-3 py-2 text-center font-bold">150%</th>
                            <th className="px-3 py-2 text-center font-bold">200%</th>
                            <th className="px-3 py-2 text-center font-bold">הערה</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.dailyBreakdown.map((day, idx) => {
                            const isWeekend = day.dayOfWeek === 'שישי' || day.dayOfWeek === 'שבת';
                            const hasData = day.totalMinutes > 0;
                            return (
                              <tr
                                key={idx}
                                className={
                                  isWeekend
                                    ? 'bg-slate-50'
                                    : hasData
                                      ? 'bg-white hover:bg-slate-50'
                                      : 'bg-rose-50/50'
                                }
                              >
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 font-bold">
                                  {day.date.split('-').reverse().join('/')}
                                </td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100">{day.dayOfWeek}</td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 font-semibold">{day.startTime || ''}</td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 font-semibold">{day.endTime || ''}</td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 font-bold">
                                  {day.totalMinutes > 0 ? minutesToHHMM(day.totalMinutes) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100">
                                  {day.regularMinutes > 0 ? minutesToHHMM(day.regularMinutes) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 text-emerald-600 font-semibold">
                                  {day.overtime125 > 0 ? minutesToHHMM(day.overtime125) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 text-amber-600 font-semibold">
                                  {day.overtime150 > 0 ? minutesToHHMM(day.overtime150) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 text-purple-600 font-semibold">
                                  {day.overtime200 > 0 ? minutesToHHMM(day.overtime200) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-center border-b border-slate-100 text-slate-400 truncate max-w-[120px]">
                                  {day.event || day.note || ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-black tabular-nums mt-0.5 ${color || 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
