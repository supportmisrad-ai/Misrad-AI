/**
 * Validation schemas using Zod
 * Used for validating inputs in Server Actions
 */

import { z } from 'zod';
import { SocialPlatform, ClientStatus, PostStatus, PricingPlan } from '@/types/social';

// Client validation schemas
export const createClientSchema = z.object({
  name: z.string().min(2, 'שם חייב להכיל לפחות 2 תווים').max(100),
  companyName: z.string().min(2, 'שם חברה חייב להכיל לפחות 2 תווים').max(100),
  businessId: z.string().optional(),
  phone: z.string().regex(/^[0-9\-+\s()]+$/, 'מספר טלפון לא תקין').optional(),
  email: z.string().email('כתובת אימייל לא תקינה').optional(),
  brandVoice: z.string().max(500).optional(),
  postingRhythm: z.string().max(100).optional(),
  status: z.enum(['Active', 'Paused', 'Archived', 'Pending Payment', 'Onboarding', 'Overdue']).optional(),
  plan: z.enum(['starter', 'pro', 'agency', 'custom']).optional(),
  monthlyFee: z.number().min(0).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'צבע חייב להיות בפורמט hex (#RRGGBB)').optional(),
});

export const updateClientSchema = createClientSchema.partial();

// Post validation schemas
export const createPostSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין'),
  content: z.string().min(1, 'תוכן הפוסט לא יכול להיות ריק').max(5000, 'תוכן הפוסט ארוך מדי'),
  platforms: z.array(z.enum([
    'facebook', 'instagram', 'linkedin', 'tiktok', 'twitter', 
    'google', 'whatsapp', 'threads', 'youtube', 'pinterest', 'portal'
  ] as const)).min(1, 'יש לבחור לפחות פלטפורמה אחת'),
  mediaUrl: z.string().url('URL לא תקין').optional(),
  scheduledAt: z.string().datetime('תאריך לא תקין').optional(),
  status: z.enum(['draft', 'internal_review', 'scheduled', 'published', 'failed', 'pending_approval']).optional(),
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string().uuid('ID פוסט לא תקין'),
});

// Task validation schemas
export const createTaskSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין').optional(),
  title: z.string().min(1, 'כותרת לא יכולה להיות ריקה').max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD'),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['todo', 'completed', 'in_progress']).optional(),
  type: z.enum(['approval', 'message', 'creative', 'general', 'payment']).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid('ID משימה לא תקין'),
});

// Campaign validation schemas
export const createCampaignSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין'),
  name: z.string().min(1, 'שם קמפיין לא יכול להיות ריק').max(200),
  objective: z.enum(['sales', 'traffic', 'awareness', 'engagement']).optional(),
  budget: z.number().min(0, 'תקציב חייב להיות חיובי'),
  status: z.enum(['active', 'paused', 'completed', 'draft']).optional(),
});

// Integration validation schemas
export const saveMorningCredentialsSchema = z.object({
  apiKey: z.string().min(10, 'מפתח API חייב להכיל לפחות 10 תווים'),
});

// Idea validation schemas
export const createIdeaSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין'),
  text: z.string().min(1, 'רעיון לא יכול להיות ריק').max(1000),
});

// Request validation schemas
export const createClientRequestSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין'),
  type: z.enum(['media', 'text', 'campaign']),
  content: z.string().min(1, 'תוכן לא יכול להיות ריק').max(5000),
  mediaUrl: z.string().url('URL לא תקין').optional(),
});

export const createManagerRequestSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין'),
  title: z.string().min(1, 'כותרת לא יכולה להיות ריקה').max(200),
  description: z.string().min(1, 'תיאור לא יכול להיות ריק').max(2000),
  type: z.enum(['media', 'info', 'feedback']),
});

// Payment validation schemas
export const createPaymentOrderSchema = z.object({
  clientId: z.string().uuid('ID לקוח לא תקין'),
  amount: z.number().min(0.01, 'סכום חייב להיות גדול מ-0'),
  description: z.string().max(500).optional(),
  installmentsAllowed: z.union([z.literal(1), z.literal(2)]).optional(),
});

// Helper function to validate and return errors in Hebrew
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; errors?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Get first error message in Hebrew
      const firstError = error.issues[0];
      const errorMessage = firstError?.message || 'שגיאת validation';
      return { success: false, error: errorMessage, errors: error };
    }
    return { success: false, error: 'שגיאת validation לא צפויה' };
  }
}

// Helper to get all validation errors
export function getValidationErrors(error: z.ZodError): string[] {
  return error.issues.map(e => e.message);
}

