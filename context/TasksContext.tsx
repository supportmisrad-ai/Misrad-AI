'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import type { Task, User } from '../types';

// Re-export types for convenience
export type { Task };

// Define the shape of tasks context value (subset of useTasks return)
export interface TasksContextValue {
  // Task state
  tasks: Task[];
  trashTasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  
  // Task operations
  addTask: (task: Task, options?: { silent?: boolean }) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => Promise<void>;
  undoDelete: () => void;
  restoreTask: (id: string) => void;
  permanentlyDeleteTask: (id: string) => void;
  
  // Task timers
  toggleTimer: (taskId: string) => Promise<void>;
  
  // Task messages
  addMessage: (taskId: string, text: string, attachment?: unknown, type?: 'user' | 'system' | 'guest', taskOverride?: Task) => Promise<void>;
  updateMessage: (taskId: string, messageId: string, text: string, taskOverride?: Task) => Promise<void>;
  deleteMessage: (taskId: string, messageId: string, taskOverride?: Task) => Promise<void>;
  addGuestMessage: (taskId: string, text: string) => void;
  
  // Task completion
  confirmCompleteTask: (taskId: string, details: unknown) => void;
  cancelCompleteTask: () => void;
  taskToComplete: Task | null;
  setTaskToComplete: React.Dispatch<React.SetStateAction<Task | null>>;
  
  // Task workflow
  workflowStages: unknown[];
  setWorkflowStages: React.Dispatch<React.SetStateAction<unknown[]>>;
  
  // Task templates
  templates: unknown[];
  setTemplates: React.Dispatch<React.SetStateAction<unknown[]>>;
  addTemplate: (template: unknown) => void;
  removeTemplate: (id: string) => void;
  applyTemplate: (templateId: string, clientId?: string, clientName?: string) => void;
  
  // Voice tasks
  addVoiceTask: (audioBlob: Blob, analysis?: unknown) => void;
  
  // UI State
  openedTaskId: string | null;
  setOpenedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  isCreateTaskOpen: boolean;
  setIsCreateTaskOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createTaskDefaults: unknown | null;
  setCreateTaskDefaults: React.Dispatch<React.SetStateAction<unknown | null>>;
  openCreateTask: (defaults?: unknown) => void;
  openTask: (taskId: string) => void;
  closeTask: () => void;
  
  // Snooze
  snoozeTask: (taskId: string, newDate: string, reason: string) => void;
  
  // Guest actions
  approveTaskByGuest: (taskId: string) => void;
  
  // Last deleted
  lastDeletedTask: Task | null;
  setLastDeletedTask: React.Dispatch<React.SetStateAction<Task | null>>;
  
  // Calendar integration
  calendarEvents: unknown[];
  setCalendarEvents: React.Dispatch<React.SetStateAction<unknown[]>>;
  isCalendarConnected: boolean;
  setIsCalendarConnected: React.Dispatch<React.SetStateAction<boolean>>;
  isConnectingCalendar: boolean;
  setIsConnectingCalendar: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create context with undefined as initial value
const TasksContext = createContext<TasksContextValue | undefined>(undefined);

interface TasksProviderProps {
  children: ReactNode;
  currentUser: User;
  addNotification: (notification: unknown) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  initialTasks?: Task[];
}

export function TasksProvider({ 
  children, 
  currentUser, 
  addNotification, 
  addToast,
  initialTasks 
}: TasksProviderProps) {
  // Use the existing useTasks hook
  const taskManager = useTasks(currentUser, addNotification, addToast, initialTasks);
  
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => taskManager as unknown as TasksContextValue, [taskManager]);
  
  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// Custom hook for consuming tasks context
export function useTasksContext(): TasksContextValue {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasksContext must be used within a TasksProvider');
  }
  return context;
}

// Re-export for convenience
export { TasksContext };
