'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Task } from '@/components/system/types';
import { type Task as NexusTask } from '@/types';
import { createNexusTaskByOrgSlug, updateNexusTaskByOrgSlug } from '@/app/actions/nexus';
import { mapNexusTaskToUiTask, toNexusPriority, toNexusStatus } from '@/components/system/utils/mapTask';
import { getErrorMessage } from '@/lib/shared/unknown';

interface UseSystemTasksOptions {
  orgSlug: string;
  initialTasks: NexusTask[];
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export function useSystemTasks({ orgSlug, initialTasks, onError, onSuccess }: UseSystemTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>(() => (initialTasks || []).map(mapNexusTaskToUiTask));

  const tasksSorted = useMemo(
    () => [...tasks].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()),
    [tasks],
  );

  const handleAddTask = useCallback(
    async (task: Task) => {
      try {
        const created = await createNexusTaskByOrgSlug({
          orgSlug,
          input: {
            title: task.title,
            description: task.description ?? '',
            status: toNexusStatus(task.status),
            priority: toNexusPriority(task.priority),
            assigneeId: task.assigneeId,
            assigneeIds: [task.assigneeId],
            tags: task.tags,
            dueDate: task.dueDate.toISOString().slice(0, 10),
            timeSpent: 0,
            isTimerRunning: false,
            messages: [],
            createdAt: new Date().toISOString(),
          },
        });

        const next = mapNexusTaskToUiTask(created);
        setTasks((prev) => [next, ...prev]);
        onSuccess?.('המשימה נוצרה');
      } catch (e: unknown) {
        onError?.(getErrorMessage(e) || 'שגיאה ביצירת משימה');
      }
    },
    [orgSlug, onError, onSuccess],
  );

  const handleUpdateTask = useCallback(
    async (task: Task) => {
      const prevTasks = tasks;
      setTasks((prev) => prev.map((t) => (String(t.id) === String(task.id) ? task : t)));

      try {
        const updated = await updateNexusTaskByOrgSlug({
          orgSlug,
          taskId: String(task.id),
          updates: {
            title: task.title,
            description: task.description ?? '',
            assigneeId: task.assigneeId,
            assigneeIds: [task.assigneeId],
            dueDate: task.dueDate.toISOString().slice(0, 10),
            priority: toNexusPriority(task.priority),
            status: toNexusStatus(task.status),
            tags: task.tags,
          },
        });

        const next = mapNexusTaskToUiTask(updated);
        setTasks((prev) => prev.map((t) => (String(t.id) === String(next.id) ? next : t)));
      } catch (e: unknown) {
        setTasks(prevTasks);
        onError?.(getErrorMessage(e) || 'שגיאה בעדכון משימה');
      }
    },
    [orgSlug, tasks, onError],
  );

  return { tasks, tasksSorted, handleAddTask, handleUpdateTask };
}
