'use server';

import prisma from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { getErrorMessage } from '@/lib/shared/unknown';

export async function submitRating(params: {
  organizationId: string;
  rating: number;
  feedback?: string;
  googleClicked?: boolean;
  source?: string;
}): Promise<{ success: boolean; error?: string; alreadyRated?: boolean }> {
  try {
    const clerk = await currentUser();
    if (!clerk?.id) {
      return { success: false, error: 'לא מחובר' };
    }

    if (params.rating < 1 || params.rating > 5) {
      return { success: false, error: 'דירוג חייב להיות בין 1 ל-5' };
    }

    // Find the user
    const user = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerk.id },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: 'משתמש לא נמצא' };
    }

    // Check if already rated
    const existing = await prisma.customerRating.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: params.organizationId,
          user_id: user.id,
        },
      },
    });

    if (existing) {
      return { success: false, error: 'כבר דירגת', alreadyRated: true };
    }

    // Create the rating
    await prisma.customerRating.create({
      data: {
        organization_id: params.organizationId,
        user_id: user.id,
        rating: params.rating,
        feedback: params.feedback?.trim() || null,
        google_clicked: params.googleClicked || false,
        source: params.source || 'in_app',
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('[Rating] Error submitting rating:', getErrorMessage(error));
    return { success: false, error: 'שגיאה בשליחת הדירוג' };
  }
}

export async function getMyRating(organizationId: string): Promise<{
  rating: number | null;
  feedback: string | null;
  googleClicked: boolean;
} | null> {
  try {
    const clerk = await currentUser();
    if (!clerk?.id) return null;

    const user = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: clerk.id },
      select: { id: true },
    });

    if (!user) return null;

    const existing = await prisma.customerRating.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: user.id,
        },
      },
      select: { rating: true, feedback: true, google_clicked: true },
    });

    if (!existing) return null;

    return {
      rating: existing.rating,
      feedback: existing.feedback,
      googleClicked: existing.google_clicked,
    };
  } catch {
    return null;
  }
}

export async function getOrganizationRatings(organizationId: string): Promise<{
  averageRating: number;
  totalRatings: number;
  distribution: Record<number, number>;
}> {
  try {
    const ratings = await prisma.customerRating.findMany({
      where: { organization_id: organizationId },
      select: { rating: true },
    });

    if (ratings.length === 0) {
      return { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of ratings) {
      sum += r.rating;
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    return {
      averageRating: Math.round((sum / ratings.length) * 10) / 10,
      totalRatings: ratings.length,
      distribution,
    };
  } catch {
    return { averageRating: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
}
