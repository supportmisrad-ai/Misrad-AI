import type { Task, TaskPriority, TaskStatus } from '@/components/system/types';
import { Priority, Status, type Task as NexusTask } from '@/types';
import { normalizeTaskStatus, normalizeTaskPriority } from '@/lib/task-utils';

export function mapNexusTaskToUiTask(row: NexusTask): Task {
  const due = row.dueDate ? new Date(String(row.dueDate)) : new Date();
  const dueDate = Number.isNaN(due.getTime()) ? new Date() : due;

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description == null ? undefined : String(row.description),
    assigneeId: String(row.assigneeId || (Array.isArray(row.assigneeIds) ? row.assigneeIds[0] : '') || ''),
    dueDate,
    priority: normalizeTaskPriority(String(row.priority || 'medium')),
    status: normalizeTaskStatus(String(row.status || 'todo')),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)).filter(Boolean) : [],
  };
}

export function toNexusPriority(value: TaskPriority): Priority {
  const v = String(value || '').toLowerCase();
  if (v === 'low') return Priority.LOW;
  if (v === 'high') return Priority.HIGH;
  if (v === 'critical') return Priority.URGENT;
  return Priority.MEDIUM;
}

export function toNexusStatus(value: TaskStatus): Status {
  const v = String(value || '').toLowerCase();
  if (v === 'in_progress') return Status.IN_PROGRESS;
  if (v === 'review') return Status.WAITING;
  if (v === 'done') return Status.DONE;
  return Status.TODO;
}
