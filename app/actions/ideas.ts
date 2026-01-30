'use server';

import { auth } from '@clerk/nextjs/server';
import { Idea } from '@/types/social';
import { translateError } from '@/lib/errorTranslations';
import { uploadFile } from './files';
import prisma from '@/lib/prisma';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getUnknownErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

async function resolveOrganizationIdForCurrentUser(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const socialUser = await prisma.social_users.findUnique({
      where: { clerk_user_id: String(userId) },
      select: { organization_id: true },
    });
    const orgId = (socialUser as any)?.organization_id;
    return orgId ? String(orgId) : null;
  } catch {
    return null;
  }
}

async function assertClientInOrganization(params: { clientId: string; organizationId: string }): Promise<void> {
  const row = await prisma.clients.findFirst({
    where: { id: String(params.clientId), organization_id: String(params.organizationId) } as any,
    select: { id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }
}

async function assertIdeaInOrganization(params: { ideaId: string; organizationId: string }): Promise<{ clientId: string }>
{
  const idea = await prisma.social_ideas.findFirst({
    where: { id: String(params.ideaId), organizationId: String(params.organizationId) } as any,
    select: { id: true, client_id: true },
  });

  if (!idea?.id) {
    throw new Error('Forbidden');
  }

  return { clientId: String((idea as any).client_id ?? '') };
}

/**
 * Server Action: Get all ideas
 */
export async function getIdeas(clientId?: string): Promise<{ success: boolean; data?: Idea[]; error?: string }> {
  try {
    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: true, data: [] };
    }

    const ideasRows = await prisma.social_ideas.findMany({
      where: {
        organizationId,
        ...(clientId ? { client_id: String(clientId) } : {}),
      } as any,
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

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    await assertClientInOrganization({ clientId: ideaData.clientId, organizationId });

    // Upload media file if provided
    let mediaUrl = ideaData.mediaUrl;
    if (ideaData.mediaFile) {
      const uploadResult = await uploadFile(
        ideaData.mediaFile,
        `idea-${Date.now()}.${ideaData.mediaFile.type.split('/')[1] || 'jpg'}`,
        'ideas'
      );
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error || 'שגיאה בהעלאת המדיה' };
      }
      
      mediaUrl = uploadResult.url;
    }

    // Insert idea
    let idea: any = null;
    try {
      idea = await prisma.social_ideas.create({
        data: {
          organizationId,
          client_id: String(ideaData.clientId),
          text: `${ideaData.title}\n\n${ideaData.description}`.trim(),
        } as any,
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

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertIdeaInOrganization({ ideaId, organizationId });

    // Upload new media file if provided
    let mediaUrl = updates.mediaUrl;
    if (updates.mediaFile) {
      const uploadResult = await uploadFile(
        updates.mediaFile,
        `idea-${Date.now()}.${updates.mediaFile.type.split('/')[1] || 'jpg'}`,
        'ideas'
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
        where: { id: String(ideaId), organizationId: String(organizationId), client_id: String(scoped.clientId) } as any,
        data: updateData as any,
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
    const result = await getIdeas();
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
export async function deleteIdea(ideaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'לא מחובר' };
    }

    const organizationId = await resolveOrganizationIdForCurrentUser();
    if (!organizationId) {
      return { success: false, error: 'Forbidden' };
    }

    const scoped = await assertIdeaInOrganization({ ideaId, organizationId });

    try {
      const res = await prisma.social_ideas.deleteMany({
        where: { id: String(ideaId), organizationId: String(organizationId), client_id: String(scoped.clientId) } as any,
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

