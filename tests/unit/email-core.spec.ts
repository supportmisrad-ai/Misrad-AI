import { test, expect } from '@playwright/test';

import {
  resolveSupportFromEmail,
  splitSupportRecipients,
  getErrorField,
  getErrorName,
  getErrorCode,
  getResendClient,
  resolveRecipientEmail,
  resolveAdminNotificationRecipients,
} from '@/lib/emails/core';

test.describe('email core utilities', () => {
  test('resolveSupportFromEmail returns env var or default', () => {
    const result = resolveSupportFromEmail();
    expect(typeof result).toBe('string');
    expect(result).toContain('@');
  });

  test('splitSupportRecipients splits comma-separated emails', () => {
    expect(splitSupportRecipients('a@b.com,c@d.com')).toEqual(['a@b.com', 'c@d.com']);
    expect(splitSupportRecipients('a@b.com , c@d.com , ')).toEqual(['a@b.com', 'c@d.com']);
    expect(splitSupportRecipients('')).toEqual([]);
    expect(splitSupportRecipients('single@email.com')).toEqual(['single@email.com']);
  });

  test('getErrorField extracts string field from error object', () => {
    expect(getErrorField({ name: 'TestError', code: '42' }, 'name')).toBe('TestError');
    expect(getErrorField({ name: 'TestError' }, 'code')).toBe('');
    expect(getErrorField(null, 'name')).toBe('');
    expect(getErrorField(undefined, 'name')).toBe('');
    expect(getErrorField('string error', 'name')).toBe('');
  });

  test('getErrorName returns error name', () => {
    expect(getErrorName(new Error('test'))).toBe('Error');
    expect(getErrorName(new TypeError('test'))).toBe('TypeError');
    expect(getErrorName({ name: 'CustomError' })).toBe('CustomError');
    expect(getErrorName(null)).toBe('');
    expect(getErrorName('string')).toBe('');
  });

  test('getErrorCode returns error code', () => {
    expect(getErrorCode({ code: 'ENOENT' })).toBe('ENOENT');
    expect(getErrorCode({ code: 42 })).toBe(''); // not a string
    expect(getErrorCode({})).toBe('');
    expect(getErrorCode(null)).toBe('');
  });

  test('getResendClient returns null when API key is missing', () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const client = getResendClient();
      expect(client).toBeNull();
    } finally {
      if (originalKey) process.env.RESEND_API_KEY = originalKey;
    }
  });

  test('resolveRecipientEmail returns original when no override', () => {
    const originalOverride = process.env.RESEND_TEST_TO;
    delete process.env.RESEND_TEST_TO;
    try {
      expect(resolveRecipientEmail('user@example.com')).toBe('user@example.com');
    } finally {
      if (originalOverride) process.env.RESEND_TEST_TO = originalOverride;
    }
  });

  test('resolveRecipientEmail returns override when set', () => {
    const originalOverride = process.env.RESEND_TEST_TO;
    process.env.RESEND_TEST_TO = 'test@override.com';
    try {
      expect(resolveRecipientEmail('user@example.com')).toBe('test@override.com');
    } finally {
      if (originalOverride) {
        process.env.RESEND_TEST_TO = originalOverride;
      } else {
        delete process.env.RESEND_TEST_TO;
      }
    }
  });

  test('resolveAdminNotificationRecipients returns array', () => {
    const result = resolveAdminNotificationRecipients();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const email of result) {
      expect(typeof email).toBe('string');
      expect(email).toContain('@');
    }
  });
});
