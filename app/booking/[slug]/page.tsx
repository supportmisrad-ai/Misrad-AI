import { Suspense } from 'react';
import { PublicBookingPage } from '@/components/booking/PublicBookingPage';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { AvailabilityEngine } from '@/lib/booking/availability-engine';
import type { TimeSlot, BookingService } from '@/types/booking';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingLinkPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch link with all related data
  const link = await prisma.bookingLink.findUnique({
    where: { slug, isActive: true },
    include: {
      provider: true,
      services: {
        include: {
          service: true,
        },
      },
    },
  });

  if (!link) {
    notFound();
  }

  // Get available slots for next 14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

  const availableSlots: TimeSlot[] = [];
  
  // Get service duration
  const serviceDuration = link.services[0]?.service.durationMinutes || 30;
  
  // Get slots for each day
  for (let d = new Date(today); d <= twoWeeksLater; d.setDate(d.getDate() + 1)) {
    const result = await AvailabilityEngine.getAvailableSlots(
      link.providerId,
      new Date(d),
      serviceDuration
    );
    if (result.success && result.slots) {
      availableSlots.push(...result.slots);
    }
  }

  // Mock social proof (in production, this would be real data)
  const socialProof = {
    currentlyViewing: Math.floor(Math.random() * 5) + 1,
    recentlyBooked: [
      { name: 'יוסי כ.', timeAgo: '5 דקות' },
      { name: 'מיכל ל.', timeAgo: '12 דקות' },
    ],
    slotsRemainingToday: availableSlots.filter((s: TimeSlot) => {
      const slotDate = new Date(s.startTime);
      return slotDate.toDateString() === today.toDateString();
    }).length,
  };

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <PublicBookingPage
        link={link as any}
        provider={{
          id: link.provider.id,
          name: link.provider.name,
          avatar: link.provider.avatar,
        }}
        services={link.services.map((s: { service: BookingService }) => ({
          id: s.service.id,
          name: s.service.name,
          durationMinutes: s.service.durationMinutes,
          priceAmount: s.service.priceAmount ? Number(s.service.priceAmount) : undefined,
          requiresPayment: s.service.requiresPayment,
        }))}
        availableSlots={availableSlots}
        socialProof={socialProof}
        onVerifyOTP={async (phone, email, otp) => {
          'use server';
          // TODO: Implement OTP verification
          console.log('Verify OTP:', { phone, email, otp });
          return true;
        }}
        onSendOTP={async (phone, email) => {
          'use server';
          // TODO: Implement OTP sending
          console.log('Send OTP:', { phone, email });
          return true;
        }}
        onBook={async (data) => {
          'use server';
          // TODO: Implement booking
          console.log('Book:', data);
          
          // דוגמה להפקת חשבונית אוטומטית (במציאות זה יקרה לאחר אישור תשלום)
          // const invoice = await createBookingInvoice(newAppointmentId);
          // return { success: true, pdfUrl: invoice.pdfUrl };
          
          return { success: true };
        }}
      />
    </Suspense>
  );
}
