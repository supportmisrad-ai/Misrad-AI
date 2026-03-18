import { NextRequest, NextResponse } from 'next/server';
import prisma, { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';
import { aggregateOrgSnapshot } from '@/lib/services/ai/cross-module-aggregator';
import { TRUTH_ENFORCEMENT_SYSTEM_PREFIX, validateReportTruthfulness, labelDataForPrompt } from '@/lib/services/ai/truth-enforcement';
import { AIService } from '@/lib/services/ai/AIService';
import { Type } from '@google/genai';
import { cronGuard } from '@/lib/api-cron-guard';
import { cronConnectionGuard } from '@/lib/api-cron-connection-guard';
import { asObject } from '@/lib/shared/unknown';
import { sendEmail } from '@/lib/email-sender';
import { generateAiMonthlyReportReadyEmailHTML } from '@/lib/email-generators';
import { getBaseUrl } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 120;

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * AI Monthly Digest CRON
 * 
 * Runs at end of each month. For each active org:
 * 1. Aggregates cross-module snapshot
 * 2. Generates AI analysis for admin (org-wide)
 * 3. Generates AI analysis for each employee (personal scope)
 * 4. Saves to ai_periodic_reports
 * 5. Sends email notification with link (NOT data)
 * 
 * TRUTH ENFORCEMENT:
 * - All data comes from aggregateOrgSnapshot (DB queries only)
 * - AI prompt explicitly instructs: "base analysis ONLY on provided data"
 * - dataSource field tracks which tables were queried
 * - AI response includes confidence level
 */

const ADMIN_REPORT_PROMPT = `אתה אנליסט BI בכיר. נתח את הנתונים הבאים ותן דוח חודשי למנכ"ל.

${TRUTH_ENFORCEMENT_SYSTEM_PREFIX}

הנתונים:
{{DATA}}

תן תשובה בפורמט JSON:
{
  "summary": "סיכום מנהלים ב-3-5 משפטים",
  "score": 0-100 (ציון בריאות ארגוני על בסיס הנתונים),
  "insights": [{"title": "...", "description": "...", "severity": "critical|warning|positive|info", "confidence": "high|medium|low"}],
  "recommendations": [{"title": "...", "description": "...", "priority": "high|medium|low"}],
  "truthStatement": "הצהרת אמת: כל הנתונים בדוח זה מבוססים על... (ציין מקורות)"
}`;

const EMPLOYEE_REPORT_PROMPT = `אתה מנהל משאבי אנוש מנוסה. נתח את הנתונים האישיים של העובד ותן דוח חודשי.

${TRUTH_ENFORCEMENT_SYSTEM_PREFIX}

כלל נוסף: התמקד במשימות ובביצועים — לעולם אל תזכיר שכר, בונוסים או נתונים פיננסיים. טון מעודד אך כנה.

הנתונים:
{{DATA}}

תן תשובה בפורמט JSON:
{
  "summary": "סיכום אישי ב-2-3 משפטים",
  "score": 0-100,
  "insights": [{"title": "...", "description": "...", "severity": "positive|warning|info", "confidence": "high|medium|low"}],
  "recommendations": [{"title": "...", "description": "...", "priority": "high|medium|low"}]
}`;

function getPeriodLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

interface ReportAIResult {
  summary?: string;
  score?: number;
  insights?: unknown[];
  recommendations?: unknown[];
  truthStatement?: string;
}

async function generateReport(
  ai: AIService,
  prompt: string,
  data: unknown,
  featureKey: string,
  organizationId: string,
): Promise<ReportAIResult> {
  const filledPrompt = prompt.replace('{{DATA}}', JSON.stringify(data, null, 2));

  const out = await ai.generateJson<ReportAIResult>({
    featureKey,
    organizationId,
    prompt: filledPrompt,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        score: { type: Type.NUMBER },
        insights: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              severity: { type: Type.STRING },
              confidence: { type: Type.STRING },
            },
          },
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING },
            },
          },
        },
        truthStatement: { type: Type.STRING },
      },
    },
  });

  return (out.result as ReportAIResult) || {};
}

async function POSTHandler(req: NextRequest) {
  try {
    const periodLabel = getPeriodLabel();

    // Get all active orgs
    const orgs = await prisma.organization.findMany({
      where: { subscription_status: 'active' },
      select: { id: true, slug: true, name: true },
    });

    let processed = 0;
    let errors = 0;

    for (const org of orgs) {
      try {
        const orgId = String(org.id);

        // Check if report already exists for this period
        const existingRows = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
          organizationId: orgId,
          reason: 'cron_check_existing_report',
          query: `SELECT id FROM ai_periodic_reports WHERE organization_id = $1::uuid AND report_type = 'monthly' AND period_label = $2 AND role_scope = 'admin' LIMIT 1`,
          values: [orgId, periodLabel],
        });

        if (Array.isArray(existingRows) && existingRows.length > 0) {
          continue; // Already generated
        }

        // Aggregate snapshot
        const snapshot = await aggregateOrgSnapshot(orgId);

        // Generate admin report
        const ai = AIService.getInstance();
        const adminResult = await generateReport(
          ai,
          ADMIN_REPORT_PROMPT,
          snapshot,
          'reports.monthly.admin',
          orgId,
        );

        const dataSources = [
          'system_leads', 'client_clients', 'misrad_invoices',
          'nexus_billing_items', 'operations_work_orders',
          'nexus_tasks', 'organization_users', 'ai_chat_sessions',
        ];

        // Save admin report
        await executeRawOrgScoped(prisma, {
          organizationId: orgId,
          reason: 'cron_save_admin_monthly_report',
          query: `
            INSERT INTO ai_periodic_reports (
              organization_id, user_id, report_type, period_label, role_scope,
              snapshot, ai_summary, ai_insights, ai_score, ai_recommendations,
              data_sources, generated_by
            ) VALUES (
              $1::uuid, NULL, 'monthly', $2, 'admin',
              $3::jsonb, $4, $5::jsonb, $6, $7::jsonb,
              $8::jsonb, 'system'
            )
          `,
          values: [
            orgId,
            periodLabel,
            JSON.stringify(snapshot),
            adminResult.summary || 'לא ניתן היה להפיק סיכום',
            JSON.stringify(adminResult.insights || []),
            adminResult.score ?? 0,
            JSON.stringify(adminResult.recommendations || []),
            JSON.stringify(dataSources),
          ],
        });

        // Generate employee reports for each org member
        const members = await prisma.organizationUser.findMany({
          where: { organization_id: orgId },
          select: { clerk_user_id: true, role: true },
        });

        for (const member of members) {
          try {
            const userId = String(member.clerk_user_id);

            // Get personal task stats
            const taskRows = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
              organizationId: orgId,
              reason: 'cron_employee_task_stats',
              query: `
                SELECT
                  COUNT(*) FILTER (WHERE lower(status) IN ('done','completed')) AS completed,
                  COUNT(*) FILTER (WHERE lower(status) NOT IN ('done','completed')) AS pending,
                  COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < NOW() AND lower(status) NOT IN ('done','completed')) AS overdue
                FROM nexus_tasks
                WHERE organization_id = $1::uuid
                  AND (assignee_ids @> ARRAY[$2]::text[] OR created_by = $2)
              `,
              values: [orgId, userId],
            });

            const ts = asObject(Array.isArray(taskRows) ? taskRows[0] : null) ?? {};
            const personalData = {
              tasksCompleted: Number(ts.completed || 0),
              tasksPending: Number(ts.pending || 0),
              tasksOverdue: Number(ts.overdue || 0),
              periodLabel,
            };

            const employeeResult = await generateReport(
              ai,
              EMPLOYEE_REPORT_PROMPT,
              personalData,
              'reports.monthly.employee',
              orgId,
            );

            await executeRawOrgScoped(prisma, {
              organizationId: orgId,
              reason: 'cron_save_employee_monthly_report',
              query: `
                INSERT INTO ai_periodic_reports (
                  organization_id, user_id, report_type, period_label, role_scope,
                  snapshot, ai_summary, ai_insights, ai_score, ai_recommendations,
                  data_sources, generated_by
                ) VALUES (
                  $1::uuid, $2, 'monthly', $3, 'employee',
                  $4::jsonb, $5, $6::jsonb, $7, $8::jsonb,
                  $9::jsonb, 'system'
                )
              `,
              values: [
                orgId,
                userId,
                periodLabel,
                JSON.stringify(personalData),
                employeeResult.summary || 'לא ניתן היה להפיק סיכום',
                JSON.stringify(employeeResult.insights || []),
                employeeResult.score ?? 0,
                JSON.stringify(employeeResult.recommendations || []),
                JSON.stringify(['nexus_tasks']),
              ],
            });
          } catch (memberErr) {
            if (!IS_PROD) console.error(`[ai-monthly-digest] Error for member ${member.clerk_user_id}:`, memberErr);
          }
        }

        // Send email notification to admin members
        try {
          const adminMembers = members.filter(m => {
            const role = String(m.role || '').toLowerCase();
            return role === 'admin' || role === 'ceo' || role === 'owner' || role === 'super_admin';
          });

          if (adminMembers.length > 0) {
            const baseUrl = getBaseUrl();
            const reportUrl = `${baseUrl}/w/${encodeURIComponent(org.slug || '')}/nexus/ai-reports`;

            for (const admin of adminMembers) {
              try {
                // Resolve admin email from profiles
                const profileRows = await queryRawOrgScoped<Array<Record<string, unknown>>>(prisma, {
                  organizationId: orgId,
                  reason: 'cron_resolve_admin_email',
                  query: `SELECT email, first_name FROM profiles WHERE clerk_user_id = $1 LIMIT 1`,
                  values: [String(admin.clerk_user_id)],
                });
                const profile = asObject(Array.isArray(profileRows) ? profileRows[0] : null);
                const adminEmail = profile?.email ? String(profile.email) : null;
                if (!adminEmail) continue;

                const adminName = profile?.first_name ? String(profile.first_name) : null;

                const emailHtml = await generateAiMonthlyReportReadyEmailHTML({
                  adminName,
                  organizationName: org.name || '',
                  periodLabel,
                  score: adminResult.score ?? 0,
                  summary: adminResult.summary || 'לא ניתן היה להפיק סיכום',
                  insightCount: Array.isArray(adminResult.insights) ? adminResult.insights.length : 0,
                  recommendationCount: Array.isArray(adminResult.recommendations) ? adminResult.recommendations.length : 0,
                  reportUrl,
                });

                await sendEmail({
                  emailTypeId: 'ai_monthly_report_ready',
                  to: adminEmail,
                  subject: `דוח AI חודשי ${periodLabel} — ${org.name}`,
                  html: emailHtml,
                });
              } catch (adminEmailErr: unknown) {
                if (!IS_PROD) console.error(`[ai-monthly-digest] Email error for admin ${admin.clerk_user_id}:`, adminEmailErr);
              }
            }
          }
        } catch (emailBatchErr: unknown) {
          if (!IS_PROD) console.error(`[ai-monthly-digest] Email batch error for org ${org.slug}:`, emailBatchErr);
        }

        processed++;
      } catch (orgErr) {
        errors++;
        if (!IS_PROD) console.error(`[ai-monthly-digest] Error for org ${org.slug}:`, orgErr);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      totalOrgs: orgs.length,
      periodLabel,
    });
  } catch (err) {
    console.error('[ai-monthly-digest] Fatal error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const POST = cronGuard(cronConnectionGuard(POSTHandler, { critical: false, maxConcurrent: 2 }));
