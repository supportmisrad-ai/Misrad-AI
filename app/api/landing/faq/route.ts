import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const faqs = await prisma.landing_faq.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        question: true,
        answer: true,
        video_url: true,
        cover_image_url: true,
        sort_order: true,
      },
    });

    return NextResponse.json({ 
      faqs: faqs.map(f => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        videoUrl: f.video_url,
        coverImageUrl: f.cover_image_url,
        sortOrder: f.sort_order,
      }))
    });
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQ' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { action, faq, faqs } = body;

    if (action === 'create') {
      const created = await prisma.landing_faq.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          video_url: faq.videoUrl,
          cover_image_url: faq.coverImageUrl,
          sort_order: faq.sortOrder || 0,
        },
      });
      return NextResponse.json({ success: true, faq: created });
    }

    if (action === 'update') {
      const updated = await prisma.landing_faq.update({
        where: { id: faq.id },
        data: {
          question: faq.question,
          answer: faq.answer,
          video_url: faq.videoUrl,
          cover_image_url: faq.coverImageUrl,
          sort_order: faq.sortOrder,
        },
      });
      return NextResponse.json({ success: true, faq: updated });
    }

    if (action === 'delete') {
      await prisma.landing_faq.delete({
        where: { id: faq.id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder' && faqs) {
      await Promise.all(
        faqs.map((f: any, index: number) =>
          prisma.landing_faq.update({
            where: { id: f.id },
            data: { sort_order: index },
          })
        )
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error saving FAQ:', error);
    const status = error instanceof Error && error.message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json(
      { error: 'Failed to save FAQ' },
      { status }
    );
  }
}
