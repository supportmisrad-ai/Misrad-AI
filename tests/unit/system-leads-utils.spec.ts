import { test, expect } from '@playwright/test';

import {
  decodeSystemLeadsCursor,
  encodeSystemLeadsCursor,
  parseFollowUpDateFromHebrew,
} from '@/lib/server/system-leads-utils.pure';

test.describe('system-leads-utils', () => {
  test('encode/decode cursor roundtrip', async () => {
    const input = { createdAt: new Date('2026-02-01T12:34:56.000Z').toISOString(), id: 'abc' };
    const encoded = encodeSystemLeadsCursor(input);
    const decoded = decodeSystemLeadsCursor(encoded);
    expect(decoded).toEqual(input);
  });

  test('decode invalid cursor returns null', async () => {
    expect(decodeSystemLeadsCursor('')).toBeNull();
    expect(decodeSystemLeadsCursor('not-base64')).toBeNull();
    expect(decodeSystemLeadsCursor(Buffer.from('{"id":"x"}', 'utf8').toString('base64'))).toBeNull();
  });

  test('parseFollowUpDateFromHebrew - tomorrow', async () => {
    const now = new Date('2026-02-08T08:00:00.000Z');
    const res = parseFollowUpDateFromHebrew('תדבר איתי מחר', now);
    expect(res).toBeTruthy();
    const expected = new Date(now);
    expected.setUTCDate(expected.getUTCDate() + 1);
    expected.setUTCHours(10, 0, 0, 0);
    expect(res!.date.getTime()).toBe(expected.getTime());
  });

  test('parseFollowUpDateFromHebrew - today', async () => {
    const now = new Date('2026-02-08T08:00:00.000Z');
    const res = parseFollowUpDateFromHebrew('תחזור אליי היום', now);
    expect(res).toBeTruthy();
    const expected = new Date(now);
    expected.setUTCHours(16, 0, 0, 0);
    expect(res!.date.getTime()).toBe(expected.getTime());
  });

  test('parseFollowUpDateFromHebrew - weekday requires talk-to-me phrase', async () => {
    const now = new Date('2026-02-08T08:00:00.000Z');
    const res = parseFollowUpDateFromHebrew('ביום שני', now);
    expect(res).toBeNull();
  });
});
