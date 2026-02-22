import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceCurrentUserForApi } from '@/lib/server/workspaceUser';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { hasPermission } from '@/lib/auth';
import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { getBaseUrl } from '@/lib/utils';
import { resolveStorageUrlMaybeServiceRole } from '@/lib/services/operations/storage';
import type { DailySummaryEntry } from '@/app/actions/attendance-reports';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> | { reportId: string } }
) {
  try {
    const { reportId } = await params;
    const orgSlug = request.nextUrl.searchParams.get('orgSlug');
    if (!orgSlug || !reportId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    await requireWorkspaceAccessByOrgSlugApi(orgSlug);

    const resolved = await resolveWorkspaceCurrentUserForApi(orgSlug);
    const workspace = resolved.workspace;
    const dbUser = resolved.user;
    const canManage = await hasPermission('manage_team');

    enterTenantIsolationContext({
      source: 'attendance_report_pdf',
      mode: 'global_admin',
      isSuperAdmin: true,
    });

    const report = await prisma.attendanceMonthlyReport.findFirst({
      where: {
        id: reportId,
        organizationId: String(workspace.id),
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.userId !== String(dbUser.id) && !canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get org logo
    let orgLogoUrl = '';
    try {
      const signedLogo = await resolveStorageUrlMaybeServiceRole(workspace.logo, 3600, { organizationId: workspace.id });
      orgLogoUrl = signedLogo || '';
    } catch {
      // ignore
    }

    const misradLogoUrl = `${getBaseUrl()}/icons/misrad-icon-192.png`;
    const dailyBreakdown: DailySummaryEntry[] = Array.isArray(report.dailyBreakdown)
      ? (report.dailyBreakdown as unknown as DailySummaryEntry[])
      : [];

    const monthName = HEBREW_MONTHS[report.month] || String(report.month);

    // Build HTML
    const html = generateReportHTML({
      report: {
        employeeName: report.employeeName,
        employeeNumber: report.employeeNumber || '',
        department: report.department || '',
        year: report.year,
        month: report.month,
        monthName,
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
      },
      dailyBreakdown,
      orgName: workspace.name,
      orgLogoUrl,
      misradLogoUrl,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="attendance-report-${report.year}-${String(report.month).padStart(2, '0')}-${report.employeeName}.html"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function generateReportHTML(params: {
  report: {
    employeeName: string;
    employeeNumber: string;
    department: string;
    year: number;
    month: number;
    monthName: string;
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
  };
  dailyBreakdown: DailySummaryEntry[];
  orgName: string;
  orgLogoUrl: string;
  misradLogoUrl: string;
}): string {
  const { report: r, dailyBreakdown, orgName, orgLogoUrl, misradLogoUrl } = params;

  const dailyRows = dailyBreakdown.map((day) => {
    const isFriday = day.dayOfWeek === 'שישי' || day.event === 'יום שישי';
    const isSaturday = day.dayOfWeek === 'שבת' || day.event === 'שבת';
    const isWeekend = isFriday || isSaturday;
    const bgColor = isWeekend ? '#f8fafc' : (day.totalMinutes > 0 ? '#ffffff' : '#fef2f2');
    const dateFormatted = day.date.split('-').reverse().join('/');

    return `<tr style="background:${bgColor};">
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;font-weight:700;">${dateFormatted}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${day.dayOfWeek}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;font-weight:600;">${day.startTime || ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;font-weight:600;">${day.endTime || ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${day.totalMinutes > 0 ? minutesToHHMM(day.totalMinutes) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${day.breakMinutes > 0 ? minutesToHHMM(day.breakMinutes) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;font-weight:700;">${day.netMinutes > 0 ? minutesToHHMM(day.netMinutes) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;">${day.regularMinutes > 0 ? minutesToHHMM(day.regularMinutes) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#059669;">${day.overtime125 > 0 ? minutesToHHMM(day.overtime125) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#d97706;">${day.overtime150 > 0 ? minutesToHHMM(day.overtime150) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#dc2626;">${day.overtime175 > 0 ? minutesToHHMM(day.overtime175) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:12px;color:#7c3aed;">${day.overtime200 > 0 ? minutesToHHMM(day.overtime200) : ''}</td>
      <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;">${day.event || day.note || ''}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דו"ח חודשי מפורט לעובד - ${r.monthName} ${r.year}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; }
      .no-print { display: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%);
      padding: 28px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header img { width: 52px; height: 52px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.3); }
    .header h1 { color: #fff; font-size: 22px; font-weight: 900; margin: 0; }
    .header .subtitle { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 4px; }
    .info-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      padding: 20px 32px;
      background: #f1f5f9;
      border-bottom: 2px solid #e2e8f0;
    }
    .info-item { text-align: center; }
    .info-label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    .table-wrap { padding: 16px 24px 24px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      background: #0f172a;
      color: #fff;
      padding: 10px 8px;
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      border: 1px solid #1e293b;
      white-space: nowrap;
    }
    .summary-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 24px 32px;
      border-top: 2px solid #e2e8f0;
    }
    .summary-box {
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .summary-box h3 { font-size: 14px; font-weight: 900; color: #0f172a; margin: 0 0 12px; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #64748b; font-weight: 600; }
    .summary-value { font-weight: 800; color: #0f172a; }
    .footer {
      padding: 20px 32px;
      background: #f8fafc;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .signature-box {
      border-top: 2px solid #cbd5e1;
      width: 180px;
      text-align: center;
      padding-top: 8px;
      font-size: 12px;
      color: #64748b;
      font-weight: 700;
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      border: none;
      padding: 14px 28px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(99,102,241,0.35);
      z-index: 100;
    }
    .print-btn:hover { transform: scale(1.02); }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ הדפס / שמור PDF</button>

  <div class="container">
    <div class="header">
      <div class="header-right">
        ${orgLogoUrl ? `<img src="${orgLogoUrl}" alt="${orgName}" />` : ''}
        <div>
          <h1>דו"ח חודשי מפורט לעובד - ${r.month}/${r.year}</h1>
          <div class="subtitle">${orgName}</div>
        </div>
      </div>
      <div class="header-left">
        <img src="${misradLogoUrl}" alt="MISRAD AI" />
      </div>
    </div>

    <div class="info-bar">
      <div class="info-item">
        <div class="info-label">שם העובד</div>
        <div class="info-value">${r.employeeName}</div>
      </div>
      ${r.employeeNumber ? `<div class="info-item"><div class="info-label">מס׳ בשכר</div><div class="info-value">${r.employeeNumber}</div></div>` : ''}
      ${r.department ? `<div class="info-item"><div class="info-label">מחלקה</div><div class="info-value">${r.department}</div></div>` : ''}
      <div class="info-item">
        <div class="info-label">תקן</div>
        <div class="info-value">${r.standardDailyHours} שעות</div>
      </div>
      <div class="info-item">
        <div class="info-label">חודש</div>
        <div class="info-value">${r.monthName} ${r.year}</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>תאריך</th>
            <th>יום</th>
            <th>כניסה</th>
            <th>יציאה</th>
            <th>סה"כ</th>
            <th>הפסקה</th>
            <th>תקן</th>
            <th>רגילות</th>
            <th>125%</th>
            <th>150%</th>
            <th>175%</th>
            <th>200%</th>
            <th>הערה</th>
          </tr>
        </thead>
        <tbody>
          ${dailyRows}
        </tbody>
        <tfoot>
          <tr style="background:#0f172a;color:#fff;font-weight:900;">
            <td colspan="4" style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;">סה"כ</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;">${minutesToHHMM(r.totalPresenceMinutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;">${minutesToHHMM(r.totalBreakMinutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;">${minutesToHHMM(r.totalPayableMinutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;">${minutesToHHMM(r.regularMinutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;color:#34d399;">${minutesToHHMM(r.overtime125Minutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;color:#fbbf24;">${minutesToHHMM(r.overtime150Minutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;color:#f87171;">${minutesToHHMM(r.overtime175Minutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;text-align:center;font-size:13px;color:#a78bfa;">${minutesToHHMM(r.overtime200Minutes)}</td>
            <td style="padding:10px 8px;border:1px solid #1e293b;"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="summary-section">
      <div class="summary-box">
        <h3>נתונים כלליים</h3>
        <div class="summary-row"><span class="summary-label">ימי נוכחות</span><span class="summary-value">${r.totalPresenceDays}</span></div>
        <div class="summary-row"><span class="summary-label">ימי תקן</span><span class="summary-value">${r.totalStandardDays}</span></div>
        <div class="summary-row"><span class="summary-label">שעות נוכחות</span><span class="summary-value">${minutesToHHMM(r.totalPresenceMinutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות תקן</span><span class="summary-value">${minutesToHHMM(r.totalStandardMinutes)}</span></div>
        <div class="summary-row"><span class="summary-label">הפסקות</span><span class="summary-value">${minutesToHHMM(r.totalBreakMinutes)}</span></div>
        <div class="summary-row"><span class="summary-label">הפסקות לתשלום</span><span class="summary-value">${minutesToHHMM(r.paidBreakMinutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות לתשלום</span><span class="summary-value" style="color:#6366f1;font-size:16px;">${minutesToHHMM(r.totalPayableMinutes)}</span></div>
      </div>
      <div class="summary-box">
        <h3>שעות לתשלום</h3>
        <div class="summary-row"><span class="summary-label">רגילות</span><span class="summary-value">${minutesToHHMM(r.regularMinutes)}</span></div>
        <div class="summary-row"><span class="summary-label">זמן חוסר</span><span class="summary-value">${minutesToHHMM(r.absenceMinutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות 100%</span><span class="summary-value">${minutesToHHMM(r.overtime100Minutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות 125%</span><span class="summary-value" style="color:#059669;">${minutesToHHMM(r.overtime125Minutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות 150%</span><span class="summary-value" style="color:#d97706;">${minutesToHHMM(r.overtime150Minutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות 175%</span><span class="summary-value" style="color:#dc2626;">${minutesToHHMM(r.overtime175Minutes)}</span></div>
        <div class="summary-row"><span class="summary-label">שעות 200%</span><span class="summary-value" style="color:#7c3aed;">${minutesToHHMM(r.overtime200Minutes)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div class="signature-box">חתימת עובד:</div>
      <div style="font-size:11px;color:#94a3b8;text-align:center;">
        הופק אוטומטית ע"י MISRAD AI<br/>
        ${new Date().toLocaleDateString('he-IL')}
      </div>
      <div class="signature-box">חתימת מעביד:</div>
    </div>
  </div>
</body>
</html>`;
}
