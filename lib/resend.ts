import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

// Initialize Resend client
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Helper to check if Resend is configured
export function isResendConfigured(): boolean {
  return !!resendApiKey && !!resend;
}

