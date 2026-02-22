import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma, { queryRawOrgScopedSql } from '@/lib/prisma';
import { cronGuard } from '@/lib/api-cron-guard';
import { sendEmail } from '@/lib/email-sender';
import { sendWebPushNotificationToEmails } from '@/lib/server/web-push';
import { getBaseUrl } from '@/lib/utils';
import { generateBaseEmailTemplate } from '@/lib/email-templates';

/**
 * CRON: Generate & send monthly attendance reports
 *
 * Runs on the 1st of every month at 08:00 Israel time.
 * For each organization with has_operations=true:
 *   1. Finds all users with time entries in the previous month
 *   2. Generates a monthly report for each user
 *   3. Sends email + push notification with link to PDF
 *
 * Schedule: 0 6 1 * *  (06:00 UTC = 08:00 Israel)
 */

async function generateAndSendReports(request: NextRequest): Promise<Response> {
  const now = new Date();
  // Previous month
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = targetMonth === 12
    ? `${targetYear + 1}-01-01`
    : `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;

  const HEBREW_MONTHS: Record<number, string> = {
    1: 'ינואר', 2: 'פברואר', 3: 'מרץ', 4: 'אפריל',
    5: 'מאי', 6: 'יוני', 7: 'יולי', 8: 'אוגוסט',
    9: 'ספטמבר', 10: 'אוקטובר', 11: 'נובמבר', 12: 'דצמבר',
  };
  const monthName = HEBREW_MONTHS[targetMonth] || String(targetMonth);

  // Find all organizations with operations enabled
  const orgs = await prisma.organization.findMany({
    where: { has_operations: true },
    select: { id: true, name: true, slug: true },
  });

  let totalGenerated = 0;
  let totalSentEmail = 0;
  let totalSentPush = 0;
  const errors: string[] = [];

  for (const org of orgs) {
    try {
      // Get salary config for this org
      const config = await prisma.attendanceSalaryConfig.findUnique({
        where: { organizationId: org.id },
      });

      const standardDailyHours = config ? Number(config.standardDailyHours) : 9;
      const breakMinutesPerDay = config?.breakMinutesPerDay ?? 24;
      const paidBreak = config?.paidBreak ?? true;
      const overtime125After = config?.overtime125After ?? 0;
      const overtime150After = config?.overtime150After ?? 120;
      const overtime175After = config?.overtime175After ?? 0;
      const overtime200After = config?.overtime200After ?? 180;

      // Find all users with time entries in this month for this org
      const userRows = await queryRawOrgScopedSql<Array<{ user_id: string }>>(prisma, {
        organizationId: org.id,
        reason: 'cron_attendance_monthly_users',
        sql: Prisma.sql`
          SELECT DISTINCT user_id
          FROM nexus_time_entries
          WHERE organization_id = ${org.id}::uuid
            AND date >= ${startDate}::date
            AND date < ${endDate}::date
            AND voided_at IS NULL
        `,
      });

      const userIds = (Array.isArray(userRows) ? userRows : []).map((r) => String(r.user_id));

      for (const userId of userIds) {
        try {
          // Get time entries
          const entries = await queryRawOrgScopedSql<Array<{
            id: string;
            start_time: Date | string;
            end_time: Date | string | null;
            duration_minutes: number | null;
            date: Date | string;
            note: string | null;
          }>>(prisma, {
            organizationId: org.id,
            reason: 'cron_attendance_monthly_entries',
            sql: Prisma.sql`
              SELECT id, start_time, end_time, duration_minutes, date, note
              FROM nexus_time_entries
              WHERE organization_id = ${org.id}::uuid
                AND user_id = ${userId}::uuid
                AND date >= ${startDate}::date
                AND date < ${endDate}::date
                AND voided_at IS NULL
              ORDER BY date ASC, start_time ASC
            `,
          });

          if (!Array.isArray(entries) || entries.length === 0) continue;

          // Get user info
          const [orgUser, nexusUser] = await Promise.all([
            prisma.organizationUser.findUnique({
              where: { id: userId },
              select: { full_name: true, email: true },
            }),
            prisma.nexusUser.findFirst({
              where: { organizationId: org.id, id: userId },
              select: { name: true, department: true },
            }),
          ]);

          const employeeName = nexusUser?.name || orgUser?.full_name || 'עובד';
          const department = nexusUser?.department || null;
          const userEmail = orgUser?.email || null;

          // Group entries by date and calculate
          const byDate = new Map<string, typeof entries>();
          for (const entry of entries) {
            const d = new Date(String(entry.date)).toISOString().split('T')[0];
            if (!byDate.has(d)) byDate.set(d, []);
            byDate.get(d)!.push(entry);
          }

          const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
          let totalPresenceDays = 0;
          let totalPresenceMinutes = 0;
          let totalBreakMinutes = 0;
          let totalRegular = 0;
          let totalOT125 = 0;
          let totalOT150 = 0;
          let totalOT175 = 0;
          let totalOT200 = 0;
          let totalAbsence = 0;
          let totalStandardDays = 0;

          const dailyBreakdown: Array<Record<string, unknown>> = [];

          const HEBREW_DAYS: Record<number, string> = {
            0: 'א׳', 1: 'ב׳', 2: 'ג׳', 3: 'ד׳', 4: 'ה׳', 5: 'שישי', 6: 'שבת',
          };

          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(dateStr + 'T00:00:00Z');
            const dayOfWeek = dateObj.getUTCDay();
            const isWorkDay = dayOfWeek >= 0 && dayOfWeek <= 4;
            if (isWorkDay) totalStandardDays++;

            const dayEntries = byDate.get(dateStr) || [];

            if (dayEntries.length === 0) {
              dailyBreakdown.push({
                date: dateStr, dayOfWeek: HEBREW_DAYS[dayOfWeek] || '', totalMinutes: 0,
                breakMinutes: 0, netMinutes: 0, regularMinutes: 0,
                overtime125: 0, overtime150: 0, overtime175: 0, overtime200: 0,
                startTime: null, endTime: null, note: null, event: null,
              });
              if (isWorkDay) totalAbsence += Math.round(standardDailyHours * 60);
              continue;
            }

            let dayTotal = 0;
            let firstStart: string | null = null;
            let lastEnd: string | null = null;

            for (const entry of dayEntries) {
              const startMs = new Date(String(entry.start_time)).getTime();
              const endMs = entry.end_time ? new Date(String(entry.end_time)).getTime() : null;
              const dur = entry.duration_minutes ?? (endMs && endMs > startMs ? Math.round((endMs - startMs) / 60000) : 0);
              dayTotal += dur;

              const st = new Date(String(entry.start_time)).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
              const et = entry.end_time ? new Date(String(entry.end_time)).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' }) : null;
              if (!firstStart || st < firstStart) firstStart = st;
              if (et && (!lastEnd || et > lastEnd)) lastEnd = et;
            }

            totalPresenceDays++;
            totalPresenceMinutes += dayTotal;

            // Overtime calc
            const netMinutes = Math.max(0, dayTotal - breakMinutesPerDay);
            const stdMin = Math.round(standardDailyHours * 60);
            totalBreakMinutes += breakMinutesPerDay;

            let regular = netMinutes;
            let ot125 = 0, ot150 = 0, ot175 = 0, ot200 = 0;

            if (netMinutes > stdMin) {
              regular = stdMin;
              let remaining = netMinutes - stdMin;

              const tiers = [
                { after: overtime125After || 0, rate: 125, min: 0 },
                { after: overtime150After, rate: 150, min: 0 },
                { after: overtime175After, rate: 175, min: 0 },
                { after: overtime200After, rate: 200, min: 0 },
              ].filter((t) => t.after > 0 || t.rate === 125).sort((a, b) => a.after - b.after);

              for (let i = 0; i < tiers.length && remaining > 0; i++) {
                const next = i + 1 < tiers.length ? tiers[i + 1].after : Infinity;
                const cap = next === Infinity ? remaining : Math.max(0, next - tiers[i].after);
                const alloc = Math.min(remaining, cap);
                tiers[i].min = alloc;
                remaining -= alloc;
              }

              ot125 = tiers.find((t) => t.rate === 125)?.min ?? 0;
              ot150 = tiers.find((t) => t.rate === 150)?.min ?? 0;
              ot175 = tiers.find((t) => t.rate === 175)?.min ?? 0;
              ot200 = tiers.find((t) => t.rate === 200)?.min ?? 0;
            }

            totalRegular += regular;
            totalOT125 += ot125;
            totalOT150 += ot150;
            totalOT175 += ot175;
            totalOT200 += ot200;

            dailyBreakdown.push({
              date: dateStr, dayOfWeek: HEBREW_DAYS[dayOfWeek] || '',
              totalMinutes: dayTotal, breakMinutes: breakMinutesPerDay, netMinutes,
              regularMinutes: regular, overtime125: ot125, overtime150: ot150,
              overtime175: ot175, overtime200: ot200,
              startTime: firstStart, endTime: lastEnd, note: null, event: null,
            });
          }

          const standardMinutes = totalStandardDays * Math.round(standardDailyHours * 60);
          const paidBreakMinutes = paidBreak ? totalBreakMinutes : 0;
          const totalPayableMinutes = totalRegular + totalOT125 + totalOT150 + totalOT175 + totalOT200 + paidBreakMinutes;

          // Upsert report
          const report = await prisma.attendanceMonthlyReport.upsert({
            where: {
              organizationId_userId_year_month: {
                organizationId: org.id,
                userId,
                year: targetYear,
                month: targetMonth,
              },
            },
            create: {
              organizationId: org.id,
              userId,
              year: targetYear,
              month: targetMonth,
              employeeName,
              department,
              standardDailyHours,
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
            update: {
              employeeName,
              department,
              standardDailyHours,
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

          totalGenerated++;

          // Send email notification
          if (userEmail) {
            try {
              const baseUrl = getBaseUrl();
              const pdfUrl = `${baseUrl}/api/attendance-report-pdf/${report.id}?orgSlug=${encodeURIComponent(org.slug || org.id)}`;
              const reportsPageUrl = org.slug
                ? `${baseUrl}/w/${encodeURIComponent(org.slug)}/operations/attendance-reports`
                : pdfUrl;

              const minutesToHHMM = (min: number) => {
                const h = Math.floor(Math.abs(min) / 60);
                const m = Math.abs(min) % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              };

              const emailHtml = generateBaseEmailTemplate({
                headerTitle: `דוח נוכחות ${monthName} ${targetYear}`,
                headerSubtitle: org.name,
                bodyContent: `
                  <div style="font-size:18px;font-weight:900;color:#0f172a;margin-bottom:12px;">שלום ${employeeName},</div>
                  <div style="font-size:16px;line-height:1.8;color:#334155;margin-bottom:16px;">
                    דוח הנוכחות החודשי שלך עבור <strong>${monthName} ${targetYear}</strong> מוכן.
                  </div>
                  <div style="margin:20px 0;padding:20px 24px;background:#f8fafc;border-radius:14px;border:2px solid #e2e8f0;">
                    <table role="presentation" style="width:100%;" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;"><span style="color:#64748b;font-size:13px;font-weight:700;">ימי נוכחות:</span></td>
                        <td style="padding:8px 0;text-align:left;"><span style="font-size:15px;font-weight:900;color:#0f172a;">${totalPresenceDays} מתוך ${totalStandardDays}</span></td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;"><span style="color:#64748b;font-size:13px;font-weight:700;">שעות לתשלום:</span></td>
                        <td style="padding:8px 0;text-align:left;"><span style="font-size:15px;font-weight:900;color:#6366f1;">${minutesToHHMM(totalPayableMinutes)}</span></td>
                      </tr>
                      ${totalOT125 + totalOT150 + totalOT175 + totalOT200 > 0 ? `
                      <tr>
                        <td style="padding:8px 0;"><span style="color:#64748b;font-size:13px;font-weight:700;">שעות נוספות:</span></td>
                        <td style="padding:8px 0;text-align:left;"><span style="font-size:15px;font-weight:900;color:#059669;">${minutesToHHMM(totalOT125 + totalOT150 + totalOT175 + totalOT200)}</span></td>
                      </tr>` : ''}
                    </table>
                  </div>
                  <div style="text-align:center;margin:28px 0 8px;">
                    <a href="${reportsPageUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:15px;font-weight:800;text-decoration:none;border-radius:14px;box-shadow:0 4px 16px rgba(99,102,241,0.3);">צפה בדוח המלא</a>
                  </div>
                `,
              });

              await sendEmail({
                emailTypeId: 'attendance_monthly_report',
                to: userEmail,
                subject: `דוח נוכחות ${monthName} ${targetYear} — ${org.name}`,
                html: emailHtml,
              });

              // Mark as sent
              await prisma.attendanceMonthlyReport.update({
                where: { id: report.id },
                data: { sentAt: new Date(), sentViaEmail: true },
              });

              totalSentEmail++;
            } catch (emailErr: unknown) {
              errors.push(`email:${userId}@${org.id}: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`);
            }

            // Send push notification
            try {
              await sendWebPushNotificationToEmails({
                organizationId: org.id,
                emails: [userEmail],
                payload: {
                  title: `דוח נוכחות ${monthName} ${targetYear}`,
                  body: `הדוח החודשי שלך מוכן — ${totalPresenceDays} ימי נוכחות`,
                  url: org.slug
                    ? `/w/${encodeURIComponent(org.slug)}/operations/attendance-reports`
                    : '/me',
                  tag: `attendance-report-${targetYear}-${targetMonth}`,
                  category: 'system',
                },
              });

              await prisma.attendanceMonthlyReport.update({
                where: { id: report.id },
                data: { sentViaPush: true },
              });

              totalSentPush++;
            } catch {
              // Push failures are non-critical
            }
          }
        } catch (userErr: unknown) {
          errors.push(`user:${userId}@${org.id}: ${userErr instanceof Error ? userErr.message : String(userErr)}`);
        }
      }
    } catch (orgErr: unknown) {
      errors.push(`org:${org.id}: ${orgErr instanceof Error ? orgErr.message : String(orgErr)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    period: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
    organizations: orgs.length,
    generated: totalGenerated,
    sentEmail: totalSentEmail,
    sentPush: totalSentPush,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export const POST = cronGuard(generateAndSendReports);
