'use client';

import React, { useEffect, useMemo, useState } from 'react';
import TasksView from '@/components/nexus/TasksView';
import type { Task, TaskPriority, TaskStatus } from '@/components/system/types';
import type { Task as NexusTask } from '@/types';
import { createNexusTaskByOrgSlug, updateNexusTaskByOrgSlug } from '@/app/actions/nexus';
import { useToast } from '@/components/system/contexts/ToastContext';
import { useAuth } from '@/components/system/contexts/AuthContext';

function normalizeTaskPriority(value: string): TaskPriority {
  const v = String(value || '').toLowerCase();
  if (v === 'low' || v === 'medium' || v === 'high' || v === 'critical') return v;
  return 'medium';
}

function normalizeTaskStatus(value: string): TaskStatus {
  const v = String(value || '').toLowerCase();
  if (v === 'todo' || v === 'in_progress' || v === 'review' || v === 'done') return v;
  if (v.includes('in progress')) return 'in_progress';
  if (v.includes('review') || v.includes('waiting')) return 'review';
  if (v.includes('done') || v.includes('completed')) return 'done';
  return 'todo';
}

function mapNexusTaskToUiTask(row: NexusTask): Task {
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

export default function SystemTasksClient({
  orgSlug,
  initialTasks,
}: {
  orgSlug: string;
  initialTasks: NexusTask[];
}) {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(() => (initialTasks || []).map(mapNexusTaskToUiTask));

  const tasksSorted = useMemo(() => {
    return [...tasks].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }, [tasks]);

  const handleAddTask = async (task: Task) => {
    try {
      const created = await createNexusTaskByOrgSlug({
        orgSlug,
        input: {
          title: task.title,
          description: task.description ?? '',
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          assigneeIds: [task.assigneeId],
          tags: task.tags,
          dueDate: task.dueDate.toISOString().slice(0, 10),
          timeSpent: 0,
          isTimerRunning: false,
          messages: [],
          createdAt: new Date().toISOString(),
        } as any,
      });

      setTasks((prev) => [mapNexusTaskToUiTask(created), ...prev]);
      addToast('המשימה נוצרה', 'success');
    } catch (e: any) {
      addToast(e?.message || 'שגיאה ביצירת משימה', 'error');
      return;
    }
    addToast('המשימה נוצרה', 'success');
  };

  const createNewTaskFromShell = () => {
    const assigneeId = user?.id ? String(user.id) : '';
    if (!assigneeId) {
      addToast('לא ניתן ליצור משימה ללא משתמש מחובר', 'error');
      return;
    }

    void handleAddTask({
      id: `new_task_${Date.now()}`,
      title: 'משימה חדשה',
      description: '',
      assigneeId,
      dueDate: new Date(),
      priority: 'medium',
      status: 'todo',
      tags: ['כללי'],
    });
  };

  useEffect(() => {
    const onNewTask = () => createNewTaskFromShell();

    if (typeof window !== 'undefined') {
      window.addEventListener('system:new-task', onNewTask as any);

      const pending = window.sessionStorage?.getItem('system:pending-action');
      if (pending === 'new-task') {
        window.sessionStorage?.removeItem('system:pending-action');
        setTimeout(() => createNewTaskFromShell(), 50);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('system:new-task', onNewTask as any);
      }
    };
  }, [user?.id]);

  const handleUpdateTask = async (task: Task) => {
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
          priority: task.priority,
          status: task.status,
          tags: task.tags,
        } as any,
      });

      const mapped = mapNexusTaskToUiTask(updated);
      setTasks((prev) => prev.map((t) => (String(t.id) === String(mapped.id) ? mapped : t)));
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בעדכון משימה', 'error');
      return;
    }
  };

  return <TasksView tasks={tasksSorted} onAddTask={(t) => void handleAddTask(t)} onUpdateTask={(t) => void handleUpdateTask(t)} />;
}
