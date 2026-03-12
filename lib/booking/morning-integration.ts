/**
 * Booking Integration Service - Morning (Green Invoice)
 * MISRAD AI - Automatic invoicing for booking payments
 * 
 * @module lib/booking/morning-integration
 */

import { prisma } from '@/lib/prisma';
import { createAppInvoice } from '@/lib/services/app-billing';
import { getErrorMessage } from '@/lib/shared/unknown';

/**
 * מפיק חשבונית אוטומטית עבור תשלום על תור
 * @param appointmentId - מזהה התור
 */
export async function createBookingInvoice(appointmentId: string): Promise<{ success: boolean; invoiceNumber?: string; pdfUrl?: string; error?: string }> {
  try {
    const appointment = await prisma.bookingAppointment.findUnique({
      where: { id: appointmentId },
      include: {
        payment: true,
        service: true,
        organization: true,
      },
    });

    if (!appointment || !appointment.payment) {
      return { success: false, error: 'תור או תשלום לא נמצאו' };
    }

    if (appointment.payment.status !== 'completed') {
      return { success: false, error: 'התשלום טרם הושלם' };
    }

    // הפקת חשבונית דרך השירות הקיים
    // אנחנו משתמשים ב-createAppInvoice כבסיס, אך כאן זה עבור הלקוח של הארגון
    // במערכת האמיתית, ייתכן שנרצה להשתמש ב-API KEY של הארגון עצמו אם הוא מוגדר
    const result = await createAppInvoice(appointment.organizationId, {
      description: `תשלום עבור ${appointment.service.name} - ${appointment.customerName}`,
      items: [
        {
          description: appointment.service.name,
          quantity: 1,
          price: Number(appointment.payment.amount),
          vatRate: 17, // ניתן למשוך מהגדרות הארגון בעתיד
        }
      ]
    });

    if (result.success && result.invoiceNumber) {
      // עדכון התשלום עם מספר החשבונית ולינק ל-PDF אם קיים
      await prisma.bookingPayment.update({
        where: { id: appointment.payment.id },
        data: {
          transactionId: `${appointment.payment.transactionId} | Invoice: ${result.invoiceNumber}`,
          // אם נרצה לשמור את ה-URL של החשבונית, אפשר להוסיף שדה בסכמה או לשמור ב-metadata
        },
      });

      return { success: true, invoiceNumber: result.invoiceNumber, pdfUrl: result.pdfUrl };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('Error in createBookingInvoice:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
