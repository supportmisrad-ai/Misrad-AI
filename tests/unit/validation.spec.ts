import { test, expect } from '@playwright/test';

import {
  createClientSchema,
  createPostSchema,
  createTaskSchema,
  createCampaignSchema,
  createIdeaSchema,
  createPaymentOrderSchema,
  validateWithSchema,
  getValidationErrors,
} from '@/lib/validation';

test.describe('validation schemas', () => {
  test('createClientSchema - valid input', async () => {
    const r = validateWithSchema(createClientSchema, {
      name: 'לקוח חדש',
      companyName: 'חברה בע"מ',
    });
    expect(r.success).toBe(true);
  });

  test('createClientSchema - name too short', async () => {
    const r = validateWithSchema(createClientSchema, {
      name: 'x',
      companyName: 'חברה בע"מ',
    });
    expect(r.success).toBe(false);
  });

  test('createClientSchema - invalid email', async () => {
    const r = validateWithSchema(createClientSchema, {
      name: 'לקוח',
      companyName: 'חברה',
      email: 'not-email',
    });
    expect(r.success).toBe(false);
  });

  test('createClientSchema - invalid hex color', async () => {
    const r = validateWithSchema(createClientSchema, {
      name: 'לקוח',
      companyName: 'חברה',
      color: 'red',
    });
    expect(r.success).toBe(false);
  });

  test('createClientSchema - valid hex color', async () => {
    const r = validateWithSchema(createClientSchema, {
      name: 'לקוח',
      companyName: 'חברה',
      color: '#FF5733',
    });
    expect(r.success).toBe(true);
  });

  test('createPostSchema - requires at least one platform', async () => {
    const r = validateWithSchema(createPostSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test post',
      platforms: [],
    });
    expect(r.success).toBe(false);
  });

  test('createPostSchema - valid post', async () => {
    const r = validateWithSchema(createPostSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Test post',
      platforms: ['facebook', 'instagram'],
    });
    expect(r.success).toBe(true);
  });

  test('createTaskSchema - valid task', async () => {
    const r = validateWithSchema(createTaskSchema, {
      title: 'משימה חדשה',
      dueDate: '2026-03-01',
    });
    expect(r.success).toBe(true);
  });

  test('createTaskSchema - invalid date format', async () => {
    const r = validateWithSchema(createTaskSchema, {
      title: 'משימה',
      dueDate: '01/03/2026',
    });
    expect(r.success).toBe(false);
  });

  test('createCampaignSchema - valid campaign', async () => {
    const r = validateWithSchema(createCampaignSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'קמפיין חדש',
      budget: 5000,
    });
    expect(r.success).toBe(true);
  });

  test('createCampaignSchema - negative budget rejected', async () => {
    const r = validateWithSchema(createCampaignSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'קמפיין',
      budget: -100,
    });
    expect(r.success).toBe(false);
  });

  test('createIdeaSchema - empty text rejected', async () => {
    const r = validateWithSchema(createIdeaSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      text: '',
    });
    expect(r.success).toBe(false);
  });

  test('createPaymentOrderSchema - zero amount rejected', async () => {
    const r = validateWithSchema(createPaymentOrderSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 0,
    });
    expect(r.success).toBe(false);
  });

  test('createPaymentOrderSchema - valid order', async () => {
    const r = validateWithSchema(createPaymentOrderSchema, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100,
    });
    expect(r.success).toBe(true);
  });

  test('getValidationErrors extracts messages', async () => {
    const r = validateWithSchema(createClientSchema, { name: '', companyName: '' });
    expect(r.success).toBe(false);
    if (!r.success && r.errors) {
      const msgs = getValidationErrors(r.errors);
      expect(msgs.length).toBeGreaterThan(0);
    }
  });

  test('validateWithSchema returns Hebrew error for non-ZodError', async () => {
    const badSchema = {
      parse: () => { throw 'not-zod'; },
    };
    const r = validateWithSchema(badSchema as never, {});
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toContain('validation');
    }
  });
});
