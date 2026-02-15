import { test, expect } from '@playwright/test';

import {
  asObject,
  getErrorMessage,
  asObjectLoose,
  getUnknownErrorMessage,
  getErrorMessageOr,
  getErrorMessageFromErrorOr,
  getUnknownErrorMessageOrUnexpected,
} from '@/lib/shared/unknown';

test.describe('shared/unknown utilities', () => {
  test('asObject returns object for plain objects', async () => {
    expect(asObject({ a: 1 })).toEqual({ a: 1 });
  });

  test('asObject returns null for non-objects', async () => {
    expect(asObject(null)).toBeNull();
    expect(asObject(undefined)).toBeNull();
    expect(asObject('string')).toBeNull();
    expect(asObject(42)).toBeNull();
    expect(asObject(true)).toBeNull();
  });

  test('asObject returns null for arrays', async () => {
    expect(asObject([1, 2, 3])).toBeNull();
  });

  test('asObjectLoose returns object for arrays too', async () => {
    expect(asObjectLoose({ a: 1 })).toEqual({ a: 1 });
    expect(asObjectLoose([1, 2])).toBeTruthy();
    expect(asObjectLoose(null)).toBeNull();
    expect(asObjectLoose(undefined)).toBeNull();
    expect(asObjectLoose('str')).toBeNull();
  });

  test('getErrorMessage extracts from Error', async () => {
    expect(getErrorMessage(new Error('test'))).toBe('test');
  });

  test('getErrorMessage handles string', async () => {
    expect(getErrorMessage('direct')).toBe('direct');
  });

  test('getErrorMessage handles object with message', async () => {
    expect(getErrorMessage({ message: 'obj' })).toBe('obj');
  });

  test('getErrorMessage returns empty for unknown', async () => {
    expect(getErrorMessage(42)).toBe('');
    expect(getErrorMessage(null)).toBe('');
    expect(getErrorMessage(undefined)).toBe('');
  });

  test('getUnknownErrorMessage returns null for empty', async () => {
    expect(getUnknownErrorMessage(42)).toBeNull();
    expect(getUnknownErrorMessage(new Error('x'))).toBe('x');
  });

  test('getErrorMessageOr uses fallback', async () => {
    expect(getErrorMessageOr(null, 'fallback')).toBe('fallback');
    expect(getErrorMessageOr(new Error('real'), 'fallback')).toBe('real');
  });

  test('getErrorMessageFromErrorOr uses fallback for non-Error', async () => {
    expect(getErrorMessageFromErrorOr('not-error', 'fb')).toBe('fb');
    expect(getErrorMessageFromErrorOr(new Error('err'), 'fb')).toBe('err');
  });

  test('getUnknownErrorMessageOrUnexpected returns Hebrew fallback', async () => {
    expect(getUnknownErrorMessageOrUnexpected(null)).toBe('שגיאה לא צפויה');
    expect(getUnknownErrorMessageOrUnexpected(new Error('x'))).toBe('x');
  });
});
