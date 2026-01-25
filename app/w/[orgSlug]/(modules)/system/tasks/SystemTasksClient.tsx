'use client';

import React, { useEffect, useMemo, useState } from 'react';
import TasksView from '@/components/nexus/TasksView';
import type { Task, TaskPriority, TaskStatus } from '@/components/system/types';
import type { SystemTaskDTO } from '@/app/actions/system-tasks';
import { createSystemTask, updateSystemTask } from '@/app/actions/system-tasks';
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
  return 'todo';
}

function mapTaskDto(dto: SystemTaskDTO): Task {
  const due = new Date(String(dto.due_date || ''));
  const dueDate = Number.isNaN(due.getTime()) ? new Date() : due;

  return {
    id: String(dto.id),
    title: String(dto.title || ''),
    description: dto.description == null ? undefined : String(dto.description),
    assigneeId: String(dto.assignee_id || ''),
    dueDate,
    priority: normalizeTaskPriority(String(dto.priority || '')),
    status: normalizeTaskStatus(String(dto.status || '')),
    tags: Array.isArray(dto.tags) ? dto.tags.map((t) => String(t)).filter(Boolean) : [],
  };
}

export default function SystemTasksClient({
  orgSlug,
  initialTasks,
}: {
  orgSlug: string;
  initialTasks: SystemTaskDTO[];
}) {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(() => (initialTasks || []).map(mapTaskDto));

  const tasksSorted = useMemo(() => {
    return [...tasks].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }, [tasks]);

  const handleAddTask = async (task: Task) => {
    const res = await createSystemTask({
      orgSlug,
      input: {
        title: task.title,
        description: task.description ?? null,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate.toISOString(),
        priority: task.priority,
        status: task.status,
        tags: task.tags,
      },
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה ביצירת משימה', 'error');
      return;
    }

    const created = mapTaskDto(res.task);
    setTasks((prev) => [created, ...prev]);
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
    const res = await updateSystemTask({
      orgSlug,
      taskId: String(task.id),
      patch: {
        title: task.title,
        description: task.description ?? null,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate.toISOString(),
        priority: task.priority,
        status: task.status,
        tags: task.tags,
      },
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה בעדכון משימה', 'error');
      return;
    }

    const updated = mapTaskDto(res.task);
    setTasks((prev) => prev.map((t) => (String(t.id) === String(updated.id) ? updated : t)));
  };

  return <TasksView tasks={tasksSorted} onAddTask={(t) => void handleAddTask(t)} onUpdateTask={(t) => void handleUpdateTask(t)} />;
}
