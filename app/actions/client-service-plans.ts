'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export async function createServicePlan(params: {
  orgId: string;
  clientId: string;
  title: string;
  description?: string;
}) {
  const { orgId, clientId, title, description } = params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const plan = await prisma.misradServicePlan.create({
    data: {
      organization_id: workspace.id,
      client_id: clientId,
      title,
      description,
      status: 'ACTIVE',
    },
  });

  revalidatePath('/', 'layout');
  return plan;
}

export async function createServicePhase(params: {
  orgId: string;
  planId: string;
  title: string;
  description?: string;
  order: number;
}) {
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

  revalidatePath('/', 'layout');
  return phase;
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

  revalidatePath('/', 'layout');
  return template;
}

export async function createDefaultServicePlanForClient(params: {
  orgId: string;
  clientId: string;
  businessType: string;
}) {
  const { orgId, clientId, businessType } = params;
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

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

  revalidatePath('/', 'layout');
  return plan;
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
