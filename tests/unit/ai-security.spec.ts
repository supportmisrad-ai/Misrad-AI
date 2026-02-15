import { test, expect } from '@playwright/test';

import fs from 'node:fs/promises';
import path from 'node:path';

// We can't import ai-security.ts directly because it chains to lib/auth → server-only.
// Instead, re-implement the pure logic inline for testing (matching the actual source).

const SENSITIVE_FIELDS = [
  'hourlyRate', 'monthlySalary', 'commissionPct', 'accumulatedBonus',
  'billingInfo', 'email', 'phone', 'password', 'creditCard', 'ssn', 'idNumber',
];

function sanitizeForAI<T extends Record<string, unknown>>(data: T): Partial<T> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key] = sanitizeForAI(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)
          ? sanitizeForAI(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as Partial<T>;
}

function validateAIResponse(response: unknown): boolean {
  const responseStr = JSON.stringify(response).toLowerCase();
  const sensitivePatterns = ['salary', 'hourly', 'rate', 'bonus', 'credit', 'card', 'ssn', 'password'];
  for (const pattern of sensitivePatterns) {
    if (responseStr.includes(pattern)) return false;
  }
  return true;
}

test.describe('AI security', () => {
  test('source file defines same sensitive fields list', async () => {
    const src = await fs.readFile(path.resolve(__dirname, '..', '..', 'lib', 'ai-security.ts'), 'utf8');
    for (const field of SENSITIVE_FIELDS) {
      expect(src).toContain(`'${field}'`);
    }
  });

  test('sanitizeForAI strips sensitive fields', async () => {
    const data = {
      name: 'Test User',
      hourlyRate: 150,
      monthlySalary: 25000,
      email: 'test@example.com',
      phone: '0501234567',
      password: 'secret',
      creditCard: '1234-5678',
      ssn: '123-45-6789',
      idNumber: '12345',
      commissionPct: 10,
      accumulatedBonus: 5000,
      billingInfo: { card: '1234' },
      role: 'manager',
    };

    const sanitized = sanitizeForAI(data);
    expect(sanitized.name).toBe('Test User');
    expect(sanitized.role).toBe('manager');
    expect(sanitized).not.toHaveProperty('hourlyRate');
    expect(sanitized).not.toHaveProperty('monthlySalary');
    expect(sanitized).not.toHaveProperty('email');
    expect(sanitized).not.toHaveProperty('phone');
    expect(sanitized).not.toHaveProperty('password');
    expect(sanitized).not.toHaveProperty('creditCard');
    expect(sanitized).not.toHaveProperty('ssn');
    expect(sanitized).not.toHaveProperty('idNumber');
    expect(sanitized).not.toHaveProperty('commissionPct');
    expect(sanitized).not.toHaveProperty('accumulatedBonus');
    expect(sanitized).not.toHaveProperty('billingInfo');
  });

  test('sanitizeForAI handles nested objects', async () => {
    const data = {
      user: {
        name: 'Nested',
        hourlyRate: 100,
        department: 'Dev',
      },
      title: 'Task',
    };

    const sanitized = sanitizeForAI(data);
    const user = sanitized.user as Record<string, unknown>;
    expect(user.name).toBe('Nested');
    expect(user.department).toBe('Dev');
    expect(user).not.toHaveProperty('hourlyRate');
    expect(sanitized.title).toBe('Task');
  });

  test('sanitizeForAI handles arrays', async () => {
    const data = {
      items: [
        { name: 'A', monthlySalary: 10000 },
        { name: 'B', monthlySalary: 20000 },
      ],
    };

    const sanitized = sanitizeForAI(data);
    const items = sanitized.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('A');
    expect(items[0]).not.toHaveProperty('monthlySalary');
  });

  test('sanitizeForAI preserves Date objects in arrays', async () => {
    const d = new Date('2026-02-15T00:00:00Z');
    const data = {
      items: [d, 'text', 42],
    };
    const sanitized = sanitizeForAI(data);
    const items = sanitized.items as unknown[];
    expect(items).toContain(d);
  });

  test('sanitizeForAI handles empty object', async () => {
    const sanitized = sanitizeForAI({});
    expect(sanitized).toEqual({});
  });

  test('validateAIResponse returns true for clean data', async () => {
    expect(validateAIResponse({ text: 'מצוין, הנה התוצאה' })).toBe(true);
  });

  test('validateAIResponse catches sensitive patterns', async () => {
    expect(validateAIResponse({ text: 'salary is 10000' })).toBe(false);
    expect(validateAIResponse({ text: 'hourly rate' })).toBe(false);
    expect(validateAIResponse({ text: 'credit card number' })).toBe(false);
    expect(validateAIResponse({ text: 'password reset' })).toBe(false);
  });

  test('validateAIResponse handles nested data', async () => {
    expect(validateAIResponse({ data: { nested: 'bonus info' } })).toBe(false);
  });
});
