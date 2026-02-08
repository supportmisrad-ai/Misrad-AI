import { test, expect } from '@playwright/test';

import {
  isUserOnlineFromRow,
  parseDateOnlyToDate,
  parseJson,
  parseLastSeenToDate,
  parseTimeHHmmToDate,
  safeToInputJsonValue,
  toDateOnlyStringMaybe,
  toInputJsonValue,
  toNumberMaybe,
  toTimeHHmmStringMaybe,
} from '@/app/actions/nexus/_internal/utils.pure';

import { mapTimeEntryRow, mapUserRow, toTaskDto } from '@/app/actions/nexus/_internal/mappers.pure';

test.describe('nexus internal utils.pure', () => {
  test('parseJson', async () => {
    expect(parseJson(undefined)).toBeUndefined();
    expect(parseJson(null)).toBeUndefined();
    expect(parseJson('')).toBeUndefined();
    expect(parseJson('not-json')).toBeUndefined();

    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson({ a: 1 })).toEqual({ a: 1 });
    expect(parseJson([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test('toInputJsonValue primitives and objects', async () => {
    expect(toInputJsonValue(undefined)).toEqual({});
    expect(toInputJsonValue(null)).toEqual({});
    expect(toInputJsonValue('x')).toBe('x');
    expect(toInputJsonValue(true)).toBe(true);
    expect(toInputJsonValue(NaN)).toBe(0);
    expect(toInputJsonValue(Infinity)).toBe(0);

    const d = new Date('2026-02-08T01:02:03.000Z');
    expect(toInputJsonValue(d)).toBe('2026-02-08T01:02:03.000Z');

    expect(toInputJsonValue([1, 'a', null])).toEqual([1, 'a', {}]);
    expect(toInputJsonValue({ a: 1, b: undefined, c: null })).toEqual({ a: 1, b: {}, c: {} });
    expect(toInputJsonValue(Symbol('x'))).toEqual({});
  });

  test('safeToInputJsonValue returns {} for cyclic objects', async () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(safeToInputJsonValue(obj)).toEqual({});
  });

  test('toNumberMaybe', async () => {
    expect(toNumberMaybe(undefined)).toBeUndefined();
    expect(toNumberMaybe(null)).toBeUndefined();
    expect(toNumberMaybe(5)).toBe(5);
    expect(toNumberMaybe(' 7 ')).toBe(7);
    expect(toNumberMaybe('x')).toBeUndefined();

    expect(
      toNumberMaybe({
        toNumber() {
          return 9;
        },
      })
    ).toBe(9);

    expect(
      toNumberMaybe({
        toNumber() {
          throw new Error('no');
        },
      })
    ).toBeUndefined();
  });

  test('date parsing helpers', async () => {
    expect(parseDateOnlyToDate('2026-02-08')?.toISOString()).toBe('2026-02-08T00:00:00.000Z');
    expect(parseTimeHHmmToDate('9:05')?.toISOString()).toBe('1970-01-01T09:05:00.000Z');

    const d = new Date('2026-02-08T12:34:56.000Z');
    expect(toDateOnlyStringMaybe(d)).toBe('2026-02-08');
    expect(toTimeHHmmStringMaybe('09:05:00')).toBe('09:05');
    expect(toTimeHHmmStringMaybe('9:05')).toBe('9:05');
  });

  test('isUserOnlineFromRow TTL and fallback', async () => {
    const now = new Date('2026-02-08T12:00:00.000Z');

    expect(isUserOnlineFromRow({ online: true }, now)).toBe(true);
    expect(isUserOnlineFromRow({ online: false }, now)).toBe(false);

    expect(isUserOnlineFromRow({ lastSeenAt: '2026-02-08T11:59:30.000Z', online: false }, now)).toBe(true);
    expect(isUserOnlineFromRow({ last_seen_at: '2026-02-08T11:57:00.000Z', online: true }, now)).toBe(false);
  });

  test('parseLastSeenToDate', async () => {
    expect(parseLastSeenToDate(undefined)).toBeNull();
    expect(parseLastSeenToDate('not-a-date')).toBeNull();
    expect(parseLastSeenToDate('2026-02-08T12:00:00.000Z')?.toISOString()).toBe('2026-02-08T12:00:00.000Z');
  });
});

test.describe('nexus internal mappers.pure', () => {
  test('mapUserRow basics and coercions', async () => {
    const now = new Date('2026-02-08T12:00:00.000Z');
    const row = {
      id: 'u1',
      email: 'a@b.com',
      role: 'עובד',
      department: null,
      avatar: 'x',
      online: false,
      lastSeenAt: new Date('2026-02-08T11:59:30.000Z'),
      capacity: '3',
      organization_id: 'org1',
      hourly_rate: '25',
      monthly_salary: 'not-a-number',
    };

    const u = mapUserRow(row);
    expect(u.id).toBe('u1');
    expect(u.name).toBe('a@b.com');
    expect(u.organizationId).toBe('org1');
    expect(u.tenantId).toBe('org1');
    expect(u.department).toBeUndefined();
    expect(u.hourlyRate).toBe(25);
    expect(u.monthlySalary).toBeUndefined();

    const online = isUserOnlineFromRow(row as unknown as Record<string, unknown>, now);
    expect(u.online).toBe(online);
  });

  test('toTaskDto message parsing', async () => {
    const t1 = toTaskDto({
      id: 't1',
      title: 'x',
      status: 'Open',
      messages: '["a"]',
      created_at: '2026-02-08T12:00:00.000Z',
    });
    expect(t1.messages).toEqual(['a']);

    const t2 = toTaskDto({
      id: 't2',
      title: 'x',
      status: 'Open',
      messages: 'not-json',
      created_at: '2026-02-08T12:00:00.000Z',
    });
    expect(t2.messages).toEqual([]);

    const t3 = toTaskDto({
      id: 't3',
      title: 'x',
      status: 'Open',
      messages: ['a', 'b'],
      completion_details: '{"a":1}',
      created_at: '2026-02-08T12:00:00.000Z',
    });
    expect(t3.messages).toEqual(['a', 'b']);
    expect(t3.completionDetails).toEqual({ a: 1 });
  });

  test('mapTimeEntryRow', async () => {
    const e = mapTimeEntryRow({
      id: 'e1',
      user_id: 'u1',
      start_time: new Date('2026-02-08T10:00:00.000Z'),
      end_time: '2026-02-08T11:00:00.000Z',
      date: '2026-02-08',
      duration_minutes: '60',
      void_reason: null,
    });

    expect(e.id).toBe('e1');
    expect(e.userId).toBe('u1');
    expect(e.startTime).toBe('2026-02-08T10:00:00.000Z');
    expect(e.endTime).toBe('2026-02-08T11:00:00.000Z');
    expect(e.date).toBe('2026-02-08');
    expect(e.durationMinutes).toBe(60);
    expect(e.voidReason).toBeNull();
  });
});
