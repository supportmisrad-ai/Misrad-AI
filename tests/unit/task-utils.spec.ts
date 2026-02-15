import { test, expect } from '@playwright/test';

import { normalizeTaskStatus, normalizeTaskPriority } from '@/lib/task-utils';

test.describe('task-utils', () => {
  test('normalizeTaskStatus - exact matches', async () => {
    expect(normalizeTaskStatus('todo')).toBe('todo');
    expect(normalizeTaskStatus('in_progress')).toBe('in_progress');
    expect(normalizeTaskStatus('review')).toBe('review');
    expect(normalizeTaskStatus('done')).toBe('done');
  });

  test('normalizeTaskStatus - fuzzy matches', async () => {
    expect(normalizeTaskStatus('In Progress')).toBe('in_progress');
    expect(normalizeTaskStatus('Review Pending')).toBe('review');
    expect(normalizeTaskStatus('waiting for client')).toBe('review');
    expect(normalizeTaskStatus('Done!')).toBe('done');
    expect(normalizeTaskStatus('completed')).toBe('done');
  });

  test('normalizeTaskStatus - fallback to todo', async () => {
    expect(normalizeTaskStatus('')).toBe('todo');
    expect(normalizeTaskStatus('unknown')).toBe('todo');
  });

  test('normalizeTaskPriority - exact matches', async () => {
    expect(normalizeTaskPriority('low')).toBe('low');
    expect(normalizeTaskPriority('medium')).toBe('medium');
    expect(normalizeTaskPriority('high')).toBe('high');
  });

  test('normalizeTaskPriority - fuzzy matches', async () => {
    expect(normalizeTaskPriority('Low Priority')).toBe('low');
    expect(normalizeTaskPriority('HIGH')).toBe('high');
  });

  test('normalizeTaskPriority - fallback to medium', async () => {
    expect(normalizeTaskPriority('')).toBe('medium');
    expect(normalizeTaskPriority('unknown')).toBe('medium');
  });
});
