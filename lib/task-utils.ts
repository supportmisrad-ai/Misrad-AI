/**
 * Task utilities - shared functions for task normalization
 */

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export function normalizeTaskStatus(value: string): TaskStatus {
  const v = String(value || '').toLowerCase();
  if (v === 'todo' || v === 'in_progress' || v === 'review' || v === 'done') return v;
  if (v.includes('in progress')) return 'in_progress';
  if (v.includes('review') || v.includes('waiting')) return 'review';
  if (v.includes('done') || v.includes('completed')) return 'done';
  return 'todo';
}

export function normalizeTaskPriority(value: string): TaskPriority {
  const v = String(value || '').toLowerCase();
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  if (v.includes('low')) return 'low';
  if (v.includes('high')) return 'high';
  return 'medium';
}
