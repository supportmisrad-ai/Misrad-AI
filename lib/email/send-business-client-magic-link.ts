/**
 * Send Business Client Magic Link Email
 * Wrapper function to send magic link emails to business clients
 */

import { businessClientMagicLinkEmail } from '@/lib/email-templates/business-client-magic-link';

interface SendMagicLinkParams {
  to: string;
  businessClientName: string;
  organizationName: string;
  magicLink: string;
  expiresAt: Date;
}

export async function sendBusinessClientMagicLinkEmail(params: SendMagicLinkParams): Promise<boolean> {
  try {
    const emailContent = businessClientMagicLinkEmail({
      businessClientName: params.businessClientName,
      organizationName: params.organizationName,
      magicLink: params.magicLink,
      expiresAt: params.expiresAt,
    });

    // TODO: Replace with actual email service (Resend, SendGrid, etc.)
    // For now, log to console
    console.log('📧 Sending Magic Link Email:');
    console.log('To:', params.to);
    console.log('Subject:', emailContent.subject);
    console.log('Link:', params.magicLink);
    
    // Placeholder for actual email sending
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: params.to,
    //     subject: emailContent.subject,
    //     html: emailContent.html,
    //     text: emailContent.text,
    //   }),
    // });
    
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}
