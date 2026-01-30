import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!resendApiKey) {
  if (!IS_PROD) console.warn('Email service is not configured.');
}

// Initialize Resend client
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Helper to check if Resend is configured
export function isResendConfigured(): boolean {
  return !!resendApiKey && !!resend;
}

