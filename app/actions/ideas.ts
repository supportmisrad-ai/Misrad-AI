'use server';

import { auth } from '@clerk/nextjs/server';
import { Idea } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { Prisma, type social_ideas } from '@prisma/client';
import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

async function requireOrganizationIdForOrgSlug(orgSlug: string): Promise<string> {
  const resolvedOrgSlug = String(orgSlug || '').trim();
  if (!resolvedOrgSlug) {
    throw new Error('Missing orgSlug');
  }
  const workspace = await requireWorkspaceAccessByOrgSlugApi(resolvedOrgSlug);
  return String(workspace.id);
}

async function assertClientInOrganization(params: { clientId: string; organizationId: string }): Promise<void> {
  const row = await prisma.clients.findFirst({
    where: {
      id: String(params.clientId),
      organization_id: String(params.organizationId),
    } satisfies Prisma.clientsWhereInput,
    select: { id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }
}

async function assertIdeaInOrganization(params: { ideaId: string; organizationId: string }): Promise<{ clientId: string }>
{
  const idea = await prisma.socialMediaIdea.findFirst({
    where: {
      id: String(params.ideaId),
      organizationId: String(params.organizationId),
    } satisfies Prisma.SocialMediaIdeaWhereInput,
    select: { id: true, client_id: true },
  });

  if (!idea?.id) {
    throw new Error('Forbidden');
  }

  return { clientId: String(idea.client_id ?? '') };
}

/**
 * Server Action: Get all ideas
 */
export async function getIdeas(
  orgSlug: string,
  clientId?: string
): Promise<{ success: boolean; data?: Idea[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const ideasRows = await prisma.socialMediaIdea.findMany({
      where: {
        organizationId,
        ...(clientId ? { client_id: String(clientId) } : {}),
      } satisfies Prisma.SocialMediaIdeaWhereInput,
      orderBy: { created_at: 'desc' },
    });

    const list: unknown[] = Array.isArray(ideasRows) ? (ideasRows as unknown[]) : [];
    const ideas: Idea[] = list.map((idea) => {
      const obj = asObject(idea) ?? {};
      const createdAt = obj.created_at instanceof Date ? obj.created_at.toISOString() : String(obj.created_at ?? '');
      return {
        id: String(obj.id ?? ''),
        clientId: String(obj.client_id ?? ''),
        text: obj.text == null ? undefined : String(obj.text),
        createdAt,
      };
    });

    return { success: true, data: ideas };
  } catch (error: unknown) {
    console.error('Error in getIdeas:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בטעינת רעיונות'),
    };
  }
}

/**
 * Server Action: Create a new idea
 */
export async function createIdea(
  ideaData: {
    orgSlug: string;
    clientId: string;
    title: string;
    description: string;
    category: string;
    mediaFile?: File | Blob;
    mediaUrl?: string;
  }
): Promise<{ success: boolean; data?: Idea; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(ideaData.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    await assertClientInOrganization({ clientId: ideaData.clientId, organizationId });

    // Upload media file if provided
    let mediaUrl = ideaData.mediaUrl;
    if (ideaData.mediaFile) {
      const uploadResult = await uploadFile(
        ideaData.mediaFile,
        `idea-${Date.now()}.${ideaData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'ideas',
        ideaData.orgSlug
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Insert idea
    let idea: social_ideas | null = null;
    try {
      idea = await prisma.social_ideas.create({
        data: {
          organizationId,
          client_id: String(ideaData.clientId),
          text: `${ideaData.title}\n\n${ideaData.description}`.trim(),
        } satisfies Prisma.social_ideasCreateInput,
      });
    } catch (ideaError: unknown) {
      console.error('Error creating idea:', ideaError);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(ideaError) || 'שגיאה ביצירת רעיון'),
      };
    }

    const formattedIdea: Idea = {
      id: String((asObject(idea) ?? {}).id ?? ''),
      clientId: String((asObject(idea) ?? {}).client_id ?? ''),
      text: (asObject(idea) ?? {}).text == null ? undefined : String((asObject(idea) ?? {}).text),
      createdAt:
        (asObject(idea) ?? {}).created_at instanceof Date
          ? ((asObject(idea) ?? {}).created_at as Date).toISOString()
          : String((asObject(idea) ?? {}).created_at ?? ''),
    };

    return { success: true, data: formattedIdea };
  } catch (error: unknown) {
    console.error('Error in createIdea:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה ביצירת רעיון'),
    };
  }
}

/**
 * Server Action: Update an idea
 */
export async function updateIdea(
  ideaId: string,
  updates: {
    orgSlug: string;
    title?: string;
    description?: string;
    category?: string;
    mediaFile?: File | Blob;
    mediaUrl?: string;
    status?: string;
  }
): Promise<{ success: boolean; data?: Idea; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(updates.orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertIdeaInOrganization({ ideaId, organizationId });

    // Upload new media file if provided
    let mediaUrl = updates.mediaUrl;
    if (updates.mediaFile) {
      const uploadResult = await uploadFile(
        updates.mediaFile,
        `idea-${Date.now()}.${updates.mediaFile.type.split('/')[1] || 'jpg'}`,
        'ideas',
        updates.orgSlug
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Update idea
    const updateData: Record<string, unknown> = {};
    // social_ideas schema supports only `text` + timestamps.
    // We keep backward-compat: merge title/description into a single text field.
    if (updates.title !== undefined || updates.description !== undefined) {
      const title = updates.title || '';
      const description = updates.description || '';
      updateData.text = `${title}\n\n${description}`.trim();
    }

    try {
      const res = await prisma.social_ideas.updateMany({
        where: {
          id: String(ideaId),
          organizationId: String(organizationId),
          client_id: String(scoped.clientId),
        },
        data: updateData,
      });

      if (!res?.count) {
        throw new Error('Forbidden');
      }
    } catch (updateError: unknown) {
      console.error('Error updating idea:', updateError);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(updateError) || 'שגיאה בעדכון רעיון'),
      };
    }

    // Fetch updated idea
    const result = await getIdeas(updates.orgSlug);
    if (result.success && result.data) {
      const updatedIdea = result.data.find(i => i.id === ideaId);
      if (updatedIdea) {
        return { success: true, data: updatedIdea };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in updateIdea:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה בעדכון רעיון'),
    };
  }
}

/**
 * Server Action: Delete an idea
 */
export async function deleteIdea(ideaId: string, orgSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    let organizationId: string;
    try {
      organizationId = await requireOrganizationIdForOrgSlug(orgSlug);
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertIdeaInOrganization({ ideaId, organizationId });

    try {
      const res = await prisma.social_ideas.deleteMany({
        where: {
          id: String(ideaId),
          organizationId: String(organizationId),
          client_id: String(scoped.clientId),
        } satisfies Prisma.SocialMediaIdeaWhereInput,
      });

      if (!res?.count) {
        throw new Error('Forbidden');
      }
    } catch (error: unknown) {
      console.error('Error deleting idea:', error);
      return {
        success: false,
        error: translateError(getUnknownErrorMessage(error) || 'שגיאה במחיקת רעיון'),
      };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Error in deleteIdea:', error);
    return {
      success: false,
      error: translateError(getUnknownErrorMessage(error) || 'שגיאה במחיקת רעיון'),
    };
  }
}

