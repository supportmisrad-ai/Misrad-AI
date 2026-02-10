import 'server-only';

import { createErrorResponse } from '@/lib/errorHandler';
import prisma from '@/lib/prisma';

export async function getContentByKey(
  page: 'landing' | 'pricing' | 'legal',
  section: string,
  key: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const row = await prisma.socialMediaSiteContent.findFirst({
      where: { page: String(page), section: String(section), key: String(key) },
      select: { content: true },
    });

    if (!row?.content) {
      return { success: true, data: null };
    }

    try {
      return { success: true, data: JSON.parse(String(row.content ?? '')) };
    } catch {
      return { success: true, data: row.content };
    }
  } catch (error) {
    const res = createErrorResponse(error, 'שגיאה בטעינת תוכן');
    return { success: false, error: res.error };
  }
}
