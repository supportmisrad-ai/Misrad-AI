import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const testimonials = await prisma.landing_testimonials.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        name: true,
        role: true,
        company: true,
        content: true,
        rating: true,
        image_url: true,
        video_url: true,
        cover_image_url: true,
        sort_order: true,
      },
    });

    return NextResponse.json({ 
      testimonials: testimonials.map(t => ({
        id: t.id,
        name: t.name,
        role: t.role,
        company: t.company,
        content: t.content,
        rating: t.rating,
        imageUrl: t.image_url,
        videoUrl: t.video_url,
        coverImageUrl: t.cover_image_url,
        sortOrder: t.sort_order,
      }))
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { action, testimonial, testimonials } = body;

    if (action === 'create') {
      const created = await prisma.landing_testimonials.create({
        data: {
          name: testimonial.name,
          role: testimonial.role,
          company: testimonial.company,
          content: testimonial.content,
          rating: testimonial.rating || 5,
          image_url: testimonial.imageUrl,
          video_url: testimonial.videoUrl,
          cover_image_url: testimonial.coverImageUrl,
          sort_order: testimonial.sortOrder || 0,
        },
      });
      return NextResponse.json({ success: true, testimonial: created });
    }

    if (action === 'update') {
      const updated = await prisma.landing_testimonials.update({
        where: { id: testimonial.id },
        data: {
          name: testimonial.name,
          role: testimonial.role,
          company: testimonial.company,
          content: testimonial.content,
          rating: testimonial.rating,
          image_url: testimonial.imageUrl,
          video_url: testimonial.videoUrl,
          cover_image_url: testimonial.coverImageUrl,
          sort_order: testimonial.sortOrder,
        },
      });
      return NextResponse.json({ success: true, testimonial: updated });
    }

    if (action === 'delete') {
      await prisma.landing_testimonials.delete({
        where: { id: testimonial.id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder' && testimonials) {
      await Promise.all(
        testimonials.map((t: any, index: number) =>
          prisma.landing_testimonials.update({
            where: { id: t.id },
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
    console.error('Error saving testimonials:', error);
    const status = error instanceof Error && error.message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json(
      { error: 'Failed to save testimonials' },
      { status }
    );
  }
}
