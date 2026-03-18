'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export async function createServicePlan(params: {
  orgId: string;
  clientId: string;
  title: string;
  description?: string;
}) {
  try {
    const { orgId, clientId, title, description } = params;
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

    // Validate client exists before creating plan
    const client = await prisma.misradClient.findFirst({
      where: {
        id: clientId,
        organizationId: workspace.id,
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found in organization ${workspace.id}`);
    }

    const plan = await prisma.misradServicePlan.create({
      data: {
        organization_id: workspace.id,
        client_id: clientId,
        title,
        description,
        status: 'ACTIVE',
      },
    });

    return plan;
  } catch (error) {
    console.error('[createServicePlan] Error:', error);
    throw error;
  }
}

export async function createServicePhase(params: {
  orgId: string;
  planId: string;
  title: string;
  description?: string;
  order: number;
}) {
  try {
    const { orgId, planId, title, description, order } = params;
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

    const phase = await prisma.misradServicePhase.create({
      data: {
        organization_id: workspace.id,
        plan_id: planId,
        title,
        description,
        order,
        status: 'PENDING',
      },
    });

    return phase;
  } catch (error) {
    console.error('[createServicePhase] Error:', error);
    throw error;
  }
}

export async function createMeetingTemplate(params: {
  orgId: string;
  phaseId: string;
  title: string;
  description?: string;
  agenda: string[];
  successCriteria: string[];
  aiPromptHint?: string;
}) {
  try {
    const { orgId, phaseId, title, description, agenda, successCriteria, aiPromptHint } = params;
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

    const template = await prisma.misradMeetingTemplate.create({
      data: {
        organization_id: workspace.id,
        phase_id: phaseId,
        title,
        description,
        agenda,
        successCriteria,
        aiPromptHint,
      },
    });

    return template;
  } catch (error) {
    console.error('[createMeetingTemplate] Error:', error);
    throw error;
  }
}

export async function createDefaultServicePlanForClient(params: {
  orgId: string;
  clientId: string;
  businessType: string;
}) {
  try {
    const { orgId, clientId, businessType } = params;
    // Log entry for debugging
    console.log('[createDefaultServicePlanForClient] Starting', { orgId, clientId, businessType });

    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

    // Validate client exists before creating plan
    const client = await prisma.misradClient.findFirst({
      where: {
        id: clientId,
        organizationId: workspace.id,
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found in organization ${workspace.id}`);
    }

    // הגדרת שלבים ברירת מחדל לפי סוג העסק (כרגע גנרי, אפשר להרחיב)
    const defaultPhases = [
      {
        title: 'שלב האבחון וההיכרות',
        order: 1,
        templates: [
          { title: 'פגישת התנעה ואבחון', agenda: ['הכרת העסק', 'מיפוי קשיים', 'קביעת יעדים'], successCriteria: ['יעדים ברורים', 'חיבור אישי'] }
        ]
      },
      {
        title: 'שלב האסטרטגיה',
        order: 2,
        templates: [
          { title: 'בניית תוכנית עבודה', agenda: ['הצגת אסטרטגיה', 'לו״ז עבודה', 'תקציב'], successCriteria: ['אישור תוכנית', 'הבנת הצעדים הבאים'] }
        ]
      },
      {
        title: 'שלב היישום והצמיחה',
        order: 3,
        templates: [
          { title: 'מעקב שבועי ודיוקים', agenda: ['בדיקת ביצועים', 'פתרון חסמים', 'עדכונים'], successCriteria: ['התקדמות במשימות'] }
        ]
      }
    ];

    const plan = await prisma.misradServicePlan.create({
      data: {
        organization_id: workspace.id,
        client_id: clientId,
        title: `תוכנית ליווי - ${businessType}`,
        description: 'תוכנית ליווי מובנית לתוצאות מקסימליות',
        status: 'ACTIVE',
        phases: {
          create: defaultPhases.map(p => ({
            organization_id: workspace.id,
            title: p.title,
            order: p.order,
            status: 'PENDING',
            templates: {
              create: p.templates.map(t => ({
                organization_id: workspace.id,
                title: t.title,
                agenda: t.agenda,
                successCriteria: t.successCriteria
              }))
            }
          }))
        }
      },
      include: {
        phases: {
          include: {
            meetings: true,
            templates: true
          }
        }
      }
    });

    console.log('[createDefaultServicePlanForClient] Success', { planId: plan.id });
    
    // The client component (ClientView) updates local state immediately upon success.
    
    return plan;
  } catch (error) {
    console.error('[createDefaultServicePlanForClient] Error:', error);
    throw error;
  }
}

export async function getClientServicePlans(orgId: string, clientId: string) {
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  return await prisma.misradServicePlan.findMany({
    where: {
      organization_id: workspace.id,
      client_id: clientId,
    },
    include: {
      phases: {
        orderBy: { order: 'asc' },
        include: {
          meetings: {
            orderBy: { created_at: 'desc' },
            include: {
              analysis: true,
            }
          },
          templates: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}
