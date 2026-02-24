'use client';

import React, { useEffect } from 'react';
import TasksBoardView from '@/components/shared/TasksBoardView';
import { type Task as NexusTask } from '@/types';
import { useToast } from '@/components/system/contexts/ToastContext';
import { useAuth } from '@/components/system/contexts/AuthContext';
import { useSystemTasks } from '@/hooks/useSystemTasks';

export default function SystemTasksClient({
  orgSlug,
  initialTasks,
}: {
  orgSlug: string;
  initialTasks: NexusTask[];
}) {
  const { addToast } = useToast();
  const { user } = useAuth();

  const { tasksSorted, handleAddTask, handleUpdateTask } = useSystemTasks({
    orgSlug,
    initialTasks,
    onError: (msg) => addToast(msg, 'error'),
    onSuccess: (msg) => addToast(msg, 'success'),
  });

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
    const onNewTask: EventListener = () => createNewTaskFromShell();

    if (typeof window !== 'undefined') {
      window.addEventListener('system:new-task', onNewTask);

      const pending = window.sessionStorage?.getItem('system:pending-action');
      if (pending === 'new-task') {
        window.sessionStorage?.removeItem('system:pending-action');
        setTimeout(() => createNewTaskFromShell(), 50);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('system:new-task', onNewTask);
      }
    };
  }, [user?.id]);

  return <TasksBoardView tasks={tasksSorted} onAddTask={(t) => void handleAddTask(t)} onUpdateTask={(t) => void handleUpdateTask(t)} />;
}
