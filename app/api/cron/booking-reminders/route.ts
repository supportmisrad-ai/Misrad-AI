import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/server/logger';
import { sendBookingReminderEmail } from '@/lib/emails/booking-reminders';
import { cronGuard } from '@/lib/api-cron-guard';
import { cronConnectionGuard } from '@/lib/api-cron-connection-guard';
import prisma from '@/lib/prisma';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

/**
 * Cron Job API Route: Send booking appointment reminders
 *
 * Security: Protected by cronGuard (CRON_SECRET + tenant isolation global_admin)
 *
 * Recommended schedule: Every hour (0 * * * *)
 */
async function handler(_request: NextRequest) {
  try {
    logger.info('booking-reminders-cron', 'Starting booking reminders job');

    const now = new Date();
    const result = await withTenantIsolationContext(
      {
        source: 'app/api/cron/booking-reminders',
        reason: 'cron_booking_reminders',
        mode: 'global_admin',
        isSuperAdmin: true,
        suppressReporting: true,
      },
      async () => {
        // Find all pending reminders that should be sent now
        // Reminders scheduled within the last hour (to catch any that might have been missed)
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const pendingReminders = await prisma.bookingReminder.findMany({
          where: {
            status: 'pending',
            scheduledFor: {
              lte: now,
              gte: oneHourAgo,
            },
            type: 'email',
          },
        });

        logger.info('booking-reminders-cron', `Found ${pendingReminders.length} pending reminders`);

        const results = [];

        for (const reminder of pendingReminders) {
          // Fetch appointment separately with all needed relations
          const appointment = await prisma.bookingAppointment.findUnique({
            where: { id: reminder.appointmentId },
            include: {
              provider: true,
              service: true,
              link: true,
            },
          });

          if (!appointment) {
            logger.warn('booking-reminders-cron', 'Appointment not found', {
              reminderId: reminder.id,
              appointmentId: reminder.appointmentId,
            });
            await prisma.bookingReminder.update({
              where: { id: reminder.id },
              data: { status: 'failed' },
            });
            continue;
          }

          // Skip if appointment is cancelled or completed
          if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            await prisma.bookingReminder.update({
              where: { id: reminder.id },
              data: { status: 'sent', sentAt: now },
            });
            continue;
          }

          // Get recipient email - from appointment customerEmail
          const recipientEmail = appointment.customerEmail;
          if (!recipientEmail) {
            logger.warn('booking-reminders-cron', 'No recipient email found', {
              reminderId: reminder.id,
              appointmentId: appointment.id,
            });
            await prisma.bookingReminder.update({
              where: { id: reminder.id },
              data: { status: 'failed' },
            });
            continue;
          }

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const apt = appointment as any;
            const link = apt.link || {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lnk = link as any;

            // Build location details
            const locationDetails = {
              zoomUrl: lnk?.zoom_join_url,
              meetUrl: lnk?.meet_url,
              phone: lnk?.phone_number,
              address: lnk?.address,
            };

            // Send reminder email
            const emailResult = await sendBookingReminderEmail({
              toEmail: recipientEmail,
              customerName: apt?.customer_name,
              serviceName: apt?.service?.name || 'פגישה',
              providerName: apt?.provider?.name || 'נותן שירות',
              appointmentDate: new Date(apt?.start_time),
              durationMinutes: apt?.service?.duration_minutes || 30,
              locationType: lnk?.location_type || 'zoom',
              locationDetails,
              cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://misrad-ai.com'}/booking/cancel/${appointment.id}`,
              rescheduleUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://misrad-ai.com'}/booking/reschedule/${appointment.id}`,
            });

            if (emailResult.success) {
              // Update reminder status to sent
              await prisma.bookingReminder.update({
                where: { id: reminder.id },
                data: {
                  status: 'sent',
                  sentAt: now,
                },
              });

              results.push({
                reminderId: reminder.id,
                appointmentId: appointment.id,
                status: 'sent',
              });

              logger.info('booking-reminders-cron', 'Reminder sent successfully', {
                reminderId: reminder.id,
                appointmentId: appointment.id,
                recipient: recipientEmail,
              });
            } else {
              await prisma.bookingReminder.update({
                where: { id: reminder.id },
                data: { status: 'failed' },
              });

              results.push({
                reminderId: reminder.id,
                appointmentId: appointment.id,
                status: 'failed',
                error: emailResult.error,
              });

              logger.warn('booking-reminders-cron', 'Failed to send reminder', {
                reminderId: reminder.id,
                error: emailResult.error,
              });
            }
          } catch (error) {
            logger.error('booking-reminders-cron', 'Error sending reminder', {
              reminderId: reminder.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            await prisma.bookingReminder.update({
              where: { id: reminder.id },
              data: { status: 'failed' },
            });

            results.push({
              reminderId: reminder.id,
              appointmentId: appointment.id,
              status: 'error',
            });
          }
        }

        return {
          totalChecked: pendingReminders.length,
          sent: results.filter(r => r.status === 'sent').length,
          failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
          results,
        };
      }
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    logger.error('booking-reminders-cron', 'Unexpected error in cron job', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export const GET = cronGuard(cronConnectionGuard(handler, { critical: false, maxConcurrent: 3 }));
export const POST = cronGuard(cronConnectionGuard(handler, { critical: false, maxConcurrent: 3 }));

export const dynamic = 'force-dynamic';
export const revalidate = 0;
