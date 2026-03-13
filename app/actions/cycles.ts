'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/events/event-bus';

// Helper to get organization from session
async function getCurrentOrganizationId(): Promise<string | null> {
  const session = await auth();
  const orgId = session.sessionClaims?.org_id as string | undefined;
  return orgId || null;
}

// ═══════════════════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════════════════

const cycleSchema = z.object({
  name: z.string().min(1, 'שם המחזור נדרש').max(100),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['RECRUITING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('RECRUITING'),
  whatsappGroupLink: z.string().optional(),
  slackChannelLink: z.string().optional(),
});

const taskSchema = z.object({
  cycleId: z.string().uuid(),
  title: z.string().min(1, 'כותרת המשימה נדרשת').max(200),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
});

const assetSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().min(1, 'שם הקובץ נדרש'),
  category: z.string().default('GENERAL'),
  fileUrl: z.string().url('קישור קובץ לא תקין'),
  fileType: z.string(),
  sizeBytes: z.number().optional(),
});

// ═══════════════════════════════════════════════════════════════════
// Cycle CRUD Actions
// ═══════════════════════════════════════════════════════════════════

export async function getCycles() {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const cycles = await prisma.clientCycle.findMany({
      where: { organizationId },
      include: {
        clients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                company_name: true,
                avatar: true,
              },
            },
          },
        },
        tasks: {
          include: {
            completions: true,
          },
        },
        assets: true,
        _count: {
          select: {
            clients: true,
            tasks: true,
            assets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: cycles };
  } catch (error) {
    console.error('Error fetching cycles:', error);
    return { success: false, error: 'Failed to fetch cycles' };
  }
}

export async function getCycleById(cycleId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const cycle = await prisma.clientCycle.findFirst({
      where: { id: cycleId, organizationId },
      include: {
        clients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                company_name: true,
                avatar: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        tasks: {
          include: {
            completions: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        assets: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!cycle) return { success: false, error: 'Cycle not found' };

    return { success: true, data: cycle };
  } catch (error) {
    console.error('Error fetching cycle:', error);
    return { success: false, error: 'Failed to fetch cycle' };
  }
}

export async function createCycle(data: z.infer<typeof cycleSchema>) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  const validated = cycleSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const cycle = await prisma.clientCycle.create({
      data: {
        ...validated.data,
        organizationId,
        createdBy: userId,
        startDate: validated.data.startDate ? new Date(validated.data.startDate) : null,
        endDate: validated.data.endDate ? new Date(validated.data.endDate) : null,
      },
    });

    revalidatePath('/w/[orgSlug]/client/(app)/hub');
    return { success: true, data: cycle };
  } catch (error) {
    console.error('Error creating cycle:', error);
    return { success: false, error: 'Failed to create cycle' };
  }
}

export async function updateCycle(cycleId: string, data: Partial<z.infer<typeof cycleSchema>>) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const existing = await prisma.clientCycle.findFirst({
      where: { id: cycleId, organizationId },
    });

    if (!existing) return { success: false, error: 'Cycle not found' };

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const cycle = await prisma.clientCycle.update({
      where: { id: cycleId },
      data: updateData,
    });

    revalidatePath('/w/[orgSlug]/client/(app)/hub');
    return { success: true, data: cycle };
  } catch (error) {
    console.error('Error updating cycle:', error);
    return { success: false, error: 'Failed to update cycle' };
  }
}

export async function deleteCycle(cycleId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const existing = await prisma.clientCycle.findFirst({
      where: { id: cycleId, organizationId },
    });

    if (!existing) return { success: false, error: 'Cycle not found' };

    await prisma.clientCycle.delete({
      where: { id: cycleId },
    });

    revalidatePath('/w/[orgSlug]/client/(app)/hub');
    return { success: true };
  } catch (error) {
    console.error('Error deleting cycle:', error);
    return { success: false, error: 'Failed to delete cycle' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Cycle Client Management
// ═══════════════════════════════════════════════════════════════════

export async function addClientToCycle(cycleId: string, clientId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const cycle = await prisma.clientCycle.findFirst({
      where: { id: cycleId, organizationId },
    });

    if (!cycle) return { success: false, error: 'Cycle not found' };

    const existing = await prisma.cycleClient.findUnique({
      where: {
        cycleId_clientId: {
          cycleId,
          clientId,
        },
      },
    });

    if (existing) return { success: false, error: 'Client already in cycle' };

    const cycleClient = await prisma.cycleClient.create({
      data: {
        cycleId,
        clientId,
      },
    });

    return { success: true, data: cycleClient };
  } catch (error) {
    console.error('Error adding client to cycle:', error);
    return { success: false, error: 'Failed to add client to cycle' };
  }
}

export async function removeClientFromCycle(cycleId: string, clientId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const cycle = await prisma.clientCycle.findFirst({
      where: { id: cycleId, organizationId },
    });

    if (!cycle) return { success: false, error: 'Cycle not found' };

    await prisma.cycleClient.delete({
      where: {
        cycleId_clientId: {
          cycleId,
          clientId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing client from cycle:', error);
    return { success: false, error: 'Failed to remove client from cycle' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Cycle Task Management
// ═══════════════════════════════════════════════════════════════════

export async function createTask(data: z.infer<typeof taskSchema>) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  const validated = taskSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const cycle = await prisma.clientCycle.findFirst({
      where: { id: validated.data.cycleId, organizationId },
    });

    if (!cycle) return { success: false, error: 'Cycle not found' };

    const task = await prisma.cycleTask.create({
      data: {
        ...validated.data,
        createdBy: userId,
        dueDate: validated.data.dueDate ? new Date(validated.data.dueDate) : null,
      },
    });

    return { success: true, data: task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: 'Failed to create task' };
  }
}

export async function completeTask(taskId: string, clientId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    const existing = await prisma.cycleTaskCompletion.findUnique({
      where: {
        taskId_clientId: {
          taskId,
          clientId,
        },
      },
    });

    if (existing) return { success: false, error: 'Task already completed' };

    const completion = await prisma.cycleTaskCompletion.create({
      data: {
        taskId,
        clientId,
        completedBy: userId,
      },
    });

    // 🏛️ AI Tower: Emit event for Watchtower processing (fire-and-forget)
    const organizationId = await getCurrentOrganizationId();
    if (organizationId) {
      eventBus.emitSimple(
        'TASK_COMPLETED',
        {
          taskId,
          userId,
          organizationId,
        },
        organizationId,
        userId,
        'cycles.ts:completeTask'
      ).catch(() => {
        // Fail silently - don't block user flow for AI processing
      });
    }

    return { success: true, data: completion };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false, error: 'Failed to complete task' };
  }
}

export async function uncompleteTask(taskId: string, clientId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.cycleTaskCompletion.delete({
      where: {
        taskId_clientId: {
          taskId,
          clientId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error uncompleting task:', error);
    return { success: false, error: 'Failed to uncomplete task' };
  }
}

export async function deleteTask(taskId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const task = await prisma.cycleTask.findFirst({
      where: {
        id: taskId,
        cycle: {
          organizationId,
        },
      },
    });

    if (!task) return { success: false, error: 'Task not found' };

    await prisma.cycleTask.delete({
      where: { id: taskId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: 'Failed to delete task' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Cycle Asset Management
// ═══════════════════════════════════════════════════════════════════

export async function createAsset(data: z.infer<typeof assetSchema>) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  const validated = assetSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  try {
    const cycle = await prisma.clientCycle.findFirst({
      where: { id: validated.data.cycleId, organizationId },
    });

    if (!cycle) return { success: false, error: 'Cycle not found' };

    const asset = await prisma.cycleAsset.create({
      data: {
        ...validated.data,
        uploadedBy: userId,
      },
    });

    return { success: true, data: asset };
  } catch (error) {
    console.error('Error creating asset:', error);
    return { success: false, error: 'Failed to create asset' };
  }
}

export async function deleteAsset(assetId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) return { success: false, error: 'No organization' };

  try {
    const asset = await prisma.cycleAsset.findFirst({
      where: {
        id: assetId,
        cycle: {
          organizationId,
        },
      },
    });

    if (!asset) return { success: false, error: 'Asset not found' };

    await prisma.cycleAsset.delete({
      where: { id: assetId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, error: 'Failed to delete asset' };
  }
}
