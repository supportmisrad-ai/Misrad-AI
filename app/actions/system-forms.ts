'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

export type SystemFormDTO = {
  id: string;
  title: string;
  description: string;
  category: string;
  is_active: boolean;
  created_at: string;
  responses_count: number;
  steps_count: number;
};

export async function getSystemFormsAction(orgSlug: string): Promise<{ forms: SystemFormDTO[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('getSystemFormsAction', workspace.id);

    const templates = await prisma.misradFormTemplate.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { responses: true, steps: true },
        },
      },
    });

    return {
      forms: templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        is_active: t.isActive,
        created_at: t.created_at.toISOString(),
        responses_count: t._count.responses,
        steps_count: t._count.steps,
      })),
    };
  } catch (err) {
    console.error('[getSystemFormsAction]', err);
    return { forms: [], error: String(err) };
  }
}

export async function createSystemFormAction(orgSlug: string, data: {
  title: string;
  description?: string;
  category?: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('createSystemFormAction', workspace.id);

    const template = await prisma.misradFormTemplate.create({
      data: {
        organization_id: organizationId,
        title: data.title,
        description: data.description || '',
        category: (data.category as any) || 'ONBOARDING',
        isActive: true,
      },
    });

    revalidatePath(`/w/${orgSlug}/system/forms`, 'page');
    return { id: template.id };
  } catch (err) {
    console.error('[createSystemFormAction]', err);
    return { error: String(err) };
  }
}

export async function toggleFormActiveAction(orgSlug: string, formId: string, isActive: boolean): Promise<{ error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('toggleFormActiveAction', workspace.id);

    await prisma.misradFormTemplate.update({
      where: { id: formId },
      data: { isActive },
    });

    revalidatePath(`/w/${orgSlug}/system/forms`, 'page');
    return {};
  } catch (err) {
    console.error('[toggleFormActiveAction]', err);
    return { error: String(err) };
  }
}

export async function deleteSystemFormAction(orgSlug: string, formId: string): Promise<{ error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('deleteSystemFormAction', workspace.id);

    await prisma.misradFormTemplate.delete({ where: { id: formId } });

    revalidatePath(`/w/${orgSlug}/system/forms`, 'page');
    return {};
  } catch (err) {
    console.error('[deleteSystemFormAction]', err);
    return { error: String(err) };
  }
}
