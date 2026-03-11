
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNexusNavigation } from '@/lib/os/nexus-routing';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { Priority, Task, Status, TaskCreationDefaults, User, Template, Client, WorkflowStage } from '../types';
import { Avatar } from '../components/Avatar';
import { useData } from '../context/DataContext';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeletons';
import { listNexusTasks, updateNexusTask } from '@/app/actions/nexus';
import { TaskItem } from '../components/nexus/TaskItem';
import { TaskCard } from '../components/nexus/TaskCard';
import { Filter, List, Kanban, Plus, Zap, Copy, ChevronDown, Layers, UserPlus, FileText, SquareCheck, Star, Users, Flag, Briefcase, Server, Settings, X, Check, FileUp } from 'lucide-react';
import SmartImportTasksDialog from '@/components/nexus/SmartImportTasksDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../constants';
import { CustomSelect } from '../components/CustomSelect';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { TasksStatusSheet, TasksBoardView, TasksFilterContent } from './tasks';

// Map string names to components for templates
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Layers': Layers,
    'UserPlus': UserPlus,
    'FileText': FileText,
    'SquareCheck': SquareCheck,
    'Star': Star,
    'Zap': Zap,
    'Server': Server
};

type GroupByOption = 'status' | 'assignee' | 'priority' | 'client';

export const TasksView: React.FC = () => {
  const { navigate, pathname } = useNexusNavigation();
  const { users, templates, applyTemplate, openCreateTask, workflowStages, openTask, clients, currentUser, hasPermission, addToast, tasks: contextTasks, toggleTimer: contextToggleTimer, replaceTasks: replaceContextTasks } = useData();
  const queryClient = useQueryClient();
  const orgSlug = useMemo(() => {
      return getWorkspaceOrgSlugFromPathname(pathname || '');
  }, [pathname]);

  const tasksQuery = useQuery({
      queryKey: ['nexus', 'tasks', orgSlug],
      queryFn: async () => {
          return listNexusTasks({ orgId: orgSlug as string });
      },
      enabled: Boolean(orgSlug),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: false,
      // Disable window-focus refetch: we manage cache manually via setQueryData on
      // mutations, so an automatic focus-refetch would race against optimistic state
      // and cause deleted/updated tasks to reappear briefly.
      refetchOnWindowFocus: false,
      retry: 1,
      placeholderData: keepPreviousData,
  });

  const refetchTasks = tasksQuery.refetch;

  const updateTaskMutation = useMutation({
      mutationFn: async (params: { taskId: string; updates: Partial<Task> }) => {
          if (!orgSlug) throw new Error('Missing orgSlug');
          const org = orgSlug;
          return updateNexusTask({ orgId: org, taskId: params.taskId, updates: params.updates });
      },
  });
  const [tasks, setTasks] = useState<Task[]>(contextTasks || []);
  const [cachedTasks, setCachedTasks] = useState<Task[]>(contextTasks || []);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // True only on the very first fetch when we have zero tasks to show
  const isInitialLoading = tasksQuery.isLoading && tasks.length === 0 && (!contextTasks || contextTasks.length === 0);

  // Track in-flight optimistic mutations so sync effects never overwrite them
  const pendingMutationsRef = useRef<Map<string, Partial<Task>>>(new Map());
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null); // Visual feedback
  const dragStartRef = useRef<{ taskId: string | null; time: number; x: number; y: number }>({ taskId: null, time: 0, x: 0, y: 0 });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Group By State
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);

  // Filter State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string | 'all'>('all');

  const templatesButtonRef = useRef<HTMLButtonElement>(null);
  const templatesDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const groupByButtonRef = useRef<HTMLButtonElement>(null);
  const groupByDropdownRef = useRef<HTMLDivElement>(null);

  // Positions for mobile portal dropdowns
  const [filterPosition, setFilterPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [groupByPosition, setGroupByPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [templatesPosition, setTemplatesPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
      return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  const isNarrow = isMobile || (typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  // Mobile Task Status Menu
  const [isTaskStatusSheetOpen, setIsTaskStatusSheetOpen] = useState(false);
  const [taskStatusSheetTaskId, setTaskStatusSheetTaskId] = useState<string | null>(null);

  // Check if mobile on mount and resize (debounced)
  useEffect(() => {
      let rafId = 0;
      const checkMobile = () => {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
              const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
              setIsMobile(mobile);
          });
      };
      checkMobile();
      if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => { window.removeEventListener('resize', checkMobile); cancelAnimationFrame(rafId); };
      }
  }, []);

  // Listen for TaskItem 3-dots status menu event (mobile)
  useEffect(() => {
      if (typeof window === 'undefined') return;

      const handler = (e: Event) => {
          const ce = e as CustomEvent;
          const taskId = ce?.detail?.taskId as string | undefined;
          if (!taskId) return;
          setTaskStatusSheetTaskId(taskId);
          setIsTaskStatusSheetOpen(true);
      };

      window.addEventListener('taskStatusMenu', handler as EventListener);
      return () => {
          window.removeEventListener('taskStatusMenu', handler as EventListener);
      };
  }, [isMobile]);

  const tasksRef = useRef<Task[]>(tasks);
  useEffect(() => {
      tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
      const next = tasksQuery.data?.tasks;
      if (Array.isArray(next)) {
          const pending = pendingMutationsRef.current;
          if (pending.size > 0) {
              // Merge: use server data but preserve in-flight optimistic fields
              const merged = next.map(t => {
                  const opt = pending.get(t.id);
                  return opt ? { ...t, ...opt } : t;
              });
              setTasks(merged);
              setCachedTasks(next);
              if (typeof replaceContextTasks === 'function') {
                  replaceContextTasks(merged);
              }
          } else {
              setTasks(next);
              setCachedTasks(next);
              if (typeof replaceContextTasks === 'function') {
                  replaceContextTasks(next);
              }
          }
      }
  }, [tasksQuery.data, replaceContextTasks]);

  // Sync with context tasks when they change (for immediate updates)
  // Use a ref to track last-known context identity and avoid redundant updates
  const lastContextRef = useRef(contextTasks);
  useEffect(() => {
      if (!contextTasks || contextTasks.length === 0) return;
      if (contextTasks === lastContextRef.current) return;
      lastContextRef.current = contextTasks;
      const pending = pendingMutationsRef.current;
      if (pending.size > 0) {
          // Merge: preserve in-flight optimistic fields on top of context data
          const merged = contextTasks.map(t => {
              const opt = pending.get(t.id);
              return opt ? { ...t, ...opt } : t;
          });
          setTasks(merged);
          setCachedTasks(contextTasks);
      } else {
          setTasks(contextTasks);
          setCachedTasks(contextTasks);
      }
  }, [contextTasks]);

  // Sync local list with global task events (TaskDetailModal uses DataContext actions)
  useEffect(() => {
      if (typeof window === 'undefined') return;

      const onDeleted = (e: Event) => {
          const ce = e as CustomEvent;
          const taskId = ce?.detail?.taskId as string | undefined;
          if (!taskId) return;
          setTasks(prev => prev.filter(t => t.id !== taskId));
          setCachedTasks(prev => prev.filter(t => t.id !== taskId));
          // Also evict from React Query cache so a stale background refetch
          // cannot restore the deleted task into local state.
          queryClient.setQueryData(
              ['nexus', 'tasks', orgSlug],
              (old: { tasks: Task[]; page: number; pageSize: number; hasMore: boolean } | undefined) => {
                  if (!old) return old;
                  return { ...old, tasks: old.tasks.filter((t: Task) => t.id !== taskId) };
              }
          );
      };

      const onRestored = (e: Event) => {
          const ce = e as CustomEvent;
          const task = ce?.detail?.task as Task | undefined;
          if (!task?.id) return;
          setTasks(prev => (prev.some(t => t.id === task.id) ? prev : [task, ...prev]));
          setCachedTasks(prev => (prev.some(t => t.id === task.id) ? prev : [task, ...prev]));
          // Restore in React Query cache (delete rollback scenario)
          queryClient.setQueryData(
              ['nexus', 'tasks', orgSlug],
              (old: { tasks: Task[]; page: number; pageSize: number; hasMore: boolean } | undefined) => {
                  if (!old) return old;
                  if (old.tasks.some((t: Task) => t.id === task.id)) return old;
                  return { ...old, tasks: [task, ...old.tasks] };
              }
          );
      };

      const onUpdated = (e: Event) => {
          const ce = e as CustomEvent;
          const taskId = ce?.detail?.taskId as string | undefined;
          const updates = ce?.detail?.updates as Partial<Task> | undefined;
          if (!taskId || !updates) return;
          setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
          setCachedTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
      };

      const onReplaceOptimistic = (e: Event) => {
          const ce = e as CustomEvent;
          const optimisticId = ce?.detail?.optimisticId as string | undefined;
          const realTask = ce?.detail?.realTask as Task | undefined;
          if (!optimisticId || !realTask) return;
          setTasks(prev => prev.map(t => (t.id === optimisticId ? { ...t, ...realTask } : t)));
          setCachedTasks(prev => prev.map(t => (t.id === optimisticId ? { ...t, ...realTask } : t)));
      };

      window.addEventListener('nexusTaskDeleted', onDeleted as EventListener);
      window.addEventListener('nexusTaskRestored', onRestored as EventListener);
      window.addEventListener('nexusTaskUpdated', onUpdated as EventListener);
      window.addEventListener('nexusTaskReplaceOptimistic', onReplaceOptimistic as EventListener);

      return () => {
          window.removeEventListener('nexusTaskDeleted', onDeleted as EventListener);
          window.removeEventListener('nexusTaskRestored', onRestored as EventListener);
          window.removeEventListener('nexusTaskUpdated', onUpdated as EventListener);
          window.removeEventListener('nexusTaskReplaceOptimistic', onReplaceOptimistic as EventListener);
      };
  }, []);

  // Show context tasks immediately while useQuery loads fresh data
  const replaceContextRef = useRef(replaceContextTasks);
  replaceContextRef.current = replaceContextTasks;
  useEffect(() => {
      if (!orgSlug) return;
      if (contextTasks && contextTasks.length > 0 && tasksRef.current.length === 0) {
          setTasks(contextTasks);
          setCachedTasks(contextTasks);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug]);


  // Wrapper for updateTask that updates local state and calls API
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
      // Register pending mutation BEFORE optimistic update — protects against sync overwrites
      pendingMutationsRef.current.set(taskId, { ...pendingMutationsRef.current.get(taskId), ...updates });

      // Optimistic update immediately
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      
      try {
          const updated = await updateTaskMutation.mutateAsync({ taskId, updates });
          // Clear pending — server confirmed the change
          pendingMutationsRef.current.delete(taskId);
          if (updated) {
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
              setCachedTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
              // Direct cache update instead of invalidation — no stale refetch race
              queryClient.setQueryData(['nexus', 'tasks', orgSlug], (old: { tasks: Task[]; page: number; pageSize: number; hasMore: boolean } | undefined) => {
                  if (!old) return old;
                  return { ...old, tasks: old.tasks.map(t => t.id === taskId ? { ...t, ...updated } : t) };
              });
          }
      } catch (error) {
          // Clear pending on error too
          pendingMutationsRef.current.delete(taskId);
          // Revert on error
          setTasks(prev => prev.map(t => {
              if (t.id === taskId) {
                  const originalTask = cachedTasks.find(ct => ct.id === taskId);
                  return originalTask || t;
              }
              return t;
          }));
          // Reload tasks on error to sync with server
          if (orgSlug) {
              const res = await tasksQuery.refetch();
              const newTasks = res.data?.tasks || [];
              setTasks(newTasks);
              setCachedTasks(newTasks);
          }
      }
  };

  // Delegate entirely to contextToggleTimer which owns its own optimistic update
  // + rollback + event dispatch. A second optimistic layer here caused a race:
  // on API failure, useTasks rollback fired nexusTaskUpdated, but the pending
  // mutation guard was still active and resurrected the optimistic value →
  // visible on/off/on/off flicker. Removing the extra layer fixes it.
  const handleToggleTimer = async (taskId: string) => {
      if (contextToggleTimer) {
          try {
              await contextToggleTimer(taskId);
          } catch {
              // contextToggleTimer handles rollback and error toast internally
          }
      }
  };

  // Handle status update from mobile menu
  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
      await updateTask(taskId, { status: newStatus });
  };

  // --- SCOPING LOGIC ---
  // Super Admin: system admin, sees everything across all tenants
  const isSuperAdmin = currentUser.isSuperAdmin === true;
  // Tenant Admin: CEO/Admin within their tenant, sees everything within their tenant
  const isTenantAdmin = !isSuperAdmin && isTenantAdminRole(currentUser.role);
  // Manager: has manage_team permission within tenant
  const isManager = hasPermission('manage_team');

  // Filter users for the dropdown based on scope
  // Super Admin and Tenant Admin see all users (within their scope)
  const scopedUsers = users.filter((u: User) => {
        // Always include current user
        if (u.id === currentUser.id) return true;
        // Super Admin sees everyone (all tenants)
        if (isSuperAdmin) return true;
        // Tenant Admin sees everyone within their tenant
        if (isTenantAdmin) return true;
        // Manager sees users in their department
        if (isManager) return u.department === currentUser.department;
        // Regular users see only themselves
        return false;
  });

  // Reset positions when dropdowns close
  useEffect(() => {
      if (!isFilterMenuOpen) {
          setFilterPosition(null);
      }
  }, [isFilterMenuOpen]);

  useEffect(() => {
      if (!isGroupByOpen) {
          setGroupByPosition(null);
      }
  }, [isGroupByOpen]);

  // Close Dropdowns on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          // Handle Templates Dropdown
          if (
              isTemplatesOpen &&
              templatesDropdownRef.current &&
              !templatesDropdownRef.current.contains(event.target as Node) &&
              templatesButtonRef.current &&
              !templatesButtonRef.current.contains(event.target as Node)
          ) {
              setIsTemplatesOpen(false);
          }
          
          // Handle Filter Dropdown
          if (
              isFilterMenuOpen &&
              filterDropdownRef.current &&
              !filterDropdownRef.current.contains(event.target as Node) &&
              filterButtonRef.current &&
              !filterButtonRef.current.contains(event.target as Node)
          ) {
              setIsFilterMenuOpen(false);
          }

          // Handle Group By Dropdown
          if (
              isGroupByOpen &&
              groupByDropdownRef.current &&
              !groupByDropdownRef.current.contains(event.target as Node) &&
              groupByButtonRef.current &&
              !groupByButtonRef.current.contains(event.target as Node)
          ) {
              setIsGroupByOpen(false);
          }
      };

      if (typeof document !== 'undefined' && (isTemplatesOpen || isFilterMenuOpen || isGroupByOpen)) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
          if (typeof document !== 'undefined') {
              document.removeEventListener('mousedown', handleClickOutside);
          }
      };
  }, [isTemplatesOpen, isFilterMenuOpen, isGroupByOpen]);

  const filteredTasks = useMemo(() => {
      // 1. Initial Scope Filtering
      let filtered = tasks.filter(t => {
          // Super Admin sees all tasks (all tenants)
          if (isSuperAdmin) return true;
          // Tenant Admin sees all tasks within their tenant
          if (isTenantAdmin) return true;
          // Manager sees tasks in their department
          if (isManager && t.department === currentUser.department) return true;
          // Employees see tasks assigned to them OR tasks they created
          return t.assigneeIds?.includes(currentUser.id) || t.assigneeId === currentUser.id || t.creatorId === currentUser.id;
      });
      
      // 2. Focus Mode
      if (isFocusMode) {
          filtered = filtered.filter(t => 
              t.assigneeIds?.includes(currentUser.id) && 
              t.status !== 'Done' && 
              t.status !== 'Canceled'
          ).sort((a, b) => {
              const priorityWeight = { [Priority.URGENT]: 4, [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
              return priorityWeight[b.priority] - priorityWeight[a.priority];
          });
      }

      // 3. User Selected Filters
      if (filterPriority !== 'all') {
          filtered = filtered.filter(t => t.priority === filterPriority);
      }
      if (filterAssignee !== 'all') {
          filtered = filtered.filter(t => t.assigneeIds?.includes(filterAssignee) || t.assigneeId === filterAssignee);
      }

      return filtered;
  }, [tasks, isSuperAdmin, isTenantAdmin, isManager, currentUser.department, currentUser.id, isFocusMode, filterPriority, filterAssignee]);

  const activeFiltersCount = (filterPriority !== 'all' ? 1 : 0) + (filterAssignee !== 'all' ? 1 : 0);

  // --- Grouping Logic (memoized) ---
  
  const columns = useMemo((): { id: string; title: string; color: string; avatar?: string }[] => {
      switch (groupBy) {
          case 'status':
              return workflowStages.map((s: WorkflowStage) => ({ id: s.id, title: s.name, color: s.color }));
          case 'assignee':
              return [
                  ...scopedUsers.map((u: User) => ({ id: u.id, title: u.name, color: 'bg-white border-gray-200 text-gray-900', avatar: u.avatar })),
                  { id: 'unassigned', title: 'לא משויך', color: 'bg-gray-50 border-gray-200 text-gray-500' }
              ];
          case 'priority':
              return (Object.values(Priority) as Priority[]).map(p => ({ 
                  id: p, 
                  title: PRIORITY_LABELS[p], 
                  color: (PRIORITY_COLORS[p] || '').replace('bg-', 'border-t-4 bg-white border-') // Custom style for priority cols
              }));
          case 'client':
              return [
                  ...clients.map((c: Client) => ({ id: c.id, title: c.companyName, color: 'bg-white border-gray-200 text-gray-900', avatar: c.avatar })),
                  { id: 'no-client', title: 'ללא לקוח (פנימי)', color: 'bg-gray-50 border-gray-200 text-gray-500' }
              ];
          default:
              return [];
      }
  }, [groupBy, workflowStages, scopedUsers, clients]);

  // Pre-compute tasks per column in a single pass (O(n) instead of O(n*m))
  const tasksByColumn = useMemo(() => {
      const map = new Map<string, Task[]>();
      for (const task of filteredTasks) {
          let colId: string;
          switch (groupBy) {
              case 'status':
                  colId = task.status;
                  break;
              case 'assignee':
                  if (!task.assigneeIds || task.assigneeIds.length === 0) {
                      colId = 'unassigned';
                  } else {
                      // Add task to each assignee's column
                      for (const aid of task.assigneeIds) {
                          const arr = map.get(aid);
                          if (arr) arr.push(task);
                          else map.set(aid, [task]);
                      }
                      continue;
                  }
                  break;
              case 'priority':
                  colId = task.priority;
                  break;
              case 'client': {
                  if (task.clientId) {
                      colId = task.clientId;
                  } else {
                      const matchedClient = clients.find((c: Client) => task.tags.some(t => c.companyName === t));
                      colId = matchedClient ? matchedClient.id : 'no-client';
                  }
                  break;
              }
              default:
                  continue;
          }
          const arr = map.get(colId);
          if (arr) arr.push(task);
          else map.set(colId, [task]);
      }
      return map;
  }, [filteredTasks, groupBy, clients]);

  const getTasksForColumn = useCallback((columnId: string): Task[] => {
      return tasksByColumn.get(columnId) || [];
  }, [tasksByColumn]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image
    if (typeof document === 'undefined') return;
    const dragIcon = document.createElement('div');
    dragIcon.style.width = '1px';
    dragIcon.style.height = '1px';
    dragIcon.style.position = 'absolute';
    dragIcon.style.top = '-1000px';
    dragIcon.style.opacity = '0';
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 0, 0);
    setTimeout(() => dragIcon.remove(), 0);
  };

  const handleCardMouseDown = (e: React.MouseEvent | React.TouchEvent, taskId: string) => {
    // Prevent drag on buttons and interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    
    dragStartRef.current = {
      taskId,
      time: Date.now(),
      x: clientX || 0,
      y: clientY || 0
    };
  };

  const handleCardMouseUp = (e: React.MouseEvent | React.TouchEvent, taskId: string) => {
    // Don't open if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
      return;
    }
    
    // If we just dragged this task, don't open it
    if (draggedTaskId === taskId) {
      return;
    }
    
    const { time, x, y, taskId: startTaskId } = dragStartRef.current;
    if (!startTaskId || startTaskId !== taskId) {
      return;
    }
    
    const clientX = 'changedTouches' in e ? e.changedTouches[0]?.clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0]?.clientY : e.clientY;
    
    const timeDiff = Date.now() - time;
    const posDiff = Math.abs((clientX || 0) - x) + Math.abs((clientY || 0) - y);
    
    // Only open if it was a quick click (not a drag)
    if (timeDiff < 300 && posDiff < 10) {
      openTask(taskId);
    }
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault(); // Necessary for drop to work
    if (dragOverColumnId !== columnId) {
        setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = () => {
      // Small debounce to prevent flickering when moving between child elements
      // setDragOverColumnId(null); 
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
        const updates: Partial<Task> = {};
        
        switch (groupBy) {
            case 'status':
                updates.status = columnId;
                break;
            case 'assignee':
                if (columnId === 'unassigned') updates.assigneeIds = [];
                else updates.assigneeIds = [columnId]; // Simple reassign for drag
                break;
            case 'priority':
                updates.priority = columnId as Priority;
                break;
            case 'client':
                if (columnId === 'no-client') updates.clientId = undefined;
                else updates.clientId = columnId;
                break;
        }
        
        updateTask(taskId, updates);
    }
    setDraggedTaskId(null);
  };

  // ----------------------

  const handleApplyTemplate = (id: string) => {
      applyTemplate(id);
      setIsTemplatesOpen(false);
  };

  const clearFilters = () => {
      setFilterPriority('all');
      setFilterAssignee('all');
      setIsFilterMenuOpen(false);
  };

  const taskForStatusSheet = taskStatusSheetTaskId ? tasks.find(t => t.id === taskStatusSheetTaskId) : null;
  const orderedStages = [...(workflowStages || [])].sort((a: unknown, b: unknown) => {
      const ar = (a && typeof a === 'object' ? a : {}) as Record<string, unknown>;
      const br = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
      const ao = typeof ar.order === 'number' ? ar.order : 0;
      const bo = typeof br.order === 'number' ? br.order : 0;
      return ao - bo;
  });

  // columns is already memoized above via useMemo

  return (
    <div className="w-full h-full md:h-[calc(100vh-10rem)] flex flex-col overflow-hidden min-h-0" style={{ touchAction: 'pan-y' }}>

      {/* Mobile Status Bottom Sheet */}
      <TasksStatusSheet
        isOpen={isTaskStatusSheetOpen}
        taskForStatusSheet={taskForStatusSheet || null}
        orderedStages={orderedStages}
        onClose={() => { setIsTaskStatusSheetOpen(false); setTaskStatusSheetTaskId(null); }}
        onStatusUpdate={handleStatusUpdate}
      />
      
      <div className="pt-6 pb-4 md:border-b md:border-gray-100 shrink-0">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {isFocusMode ? 'מיקוד אישי' : 'ניהול משימות'}
              </h1>
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${isFocusMode ? 'bg-black text-white shadow-lg ring-2 ring-gray-900/10' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Zap size={12} fill={isFocusMode ? 'currentColor' : 'none'} />
                {isFocusMode ? 'יציאה' : 'מצב מיקוד'}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1 hidden md:block">
              {isFocusMode 
                ? 'משימות היום שלך בלבד - ללא הסחות דעת'
                : 'ניהול ועקיבה אחר כל המשימות שלך ושל הצוות'
              }
            </p>
          </div>
        
          <div className="flex items-center gap-3 flex-wrap">
            <button 
                onClick={() => setShowImportDialog(true)}
                aria-label="ייבוא משימות מקובץ"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
                <FileUp size={16} />
                <span className="hidden sm:inline">ייבוא</span>
            </button>

            <button 
                onClick={() => openCreateTask()}
                aria-label="צור משימה חדשה"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors"
            >
                <Plus size={18} />
                <span className="hidden sm:inline">משימה חדשה</span>
            </button>

            <div className="h-8 w-px bg-gray-300 mx-1 hidden md:block"></div>

            {/* Templates Button */}
            <div className="relative">
                <button 
                    ref={templatesButtonRef}
                    onClick={() => {
                        const mobileNow = typeof window !== 'undefined' && window.innerWidth < 768;
                        const newState = !isTemplatesOpen;
                        setIsTemplatesOpen(newState);
                        if (newState && mobileNow && typeof window !== 'undefined') {
                            setTemplatesPosition({
                                top: window.innerHeight / 2,
                                left: window.innerWidth / 2,
                                width: Math.min(280, window.innerWidth - 32)
                            });
                        } else {
                            setTemplatesPosition(null);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-white hover:border-gray-300 bg-gray-50 shadow-sm transition-all"
                >
                    <Copy size={16} />
                    <span className="hidden sm:inline">תבניות</span>
                </button>
                
                {isNarrow && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {isTemplatesOpen && (
                            <>
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }} 
                                    className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                                    style={{ zIndex: 101 }}
                                    onClick={() => setIsTemplatesOpen(false)}
                                />
                                <div
                                    className="fixed inset-0 flex items-center justify-center p-4"
                                    style={{ zIndex: 102 }}
                                    onClick={() => setIsTemplatesOpen(false)}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        ref={templatesDropdownRef}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            width: templatesPosition?.width || (typeof window !== 'undefined' ? Math.min(320, window.innerWidth - 32) : 320),
                                            maxWidth: 'calc(100vw - 32px)',
                                            maxHeight: 'calc(100vh - 32px)',
                                        }}
                                        className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col"
                                    >
                                        <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">צור במהירות</div>
                                        <div className="flex-1 min-h-0 overflow-y-auto">
                                            {templates.length > 0 ? (
                                                templates.map((tmp: Template) => {
                                                    const IconComponent = ICON_MAP[tmp.icon] || Layers;
                                                    return (
                                                        <button 
                                                            key={tmp.id}
                                                            onClick={() => { handleApplyTemplate(tmp.id); setIsTemplatesOpen(false); }}
                                                            className="w-full text-right px-4 py-3 hover:bg-blue-50 text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
                                                        >
                                                            <IconComponent size={16} className="text-blue-500" />
                                                            {tmp.name}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-4 text-center">
                                                    <p className="text-sm text-gray-500 mb-3">אין תבניות זמינות</p>
                                                    <button
                                                        onClick={() => {
                                                            setIsTemplatesOpen(false);
                                                            navigate('/settings?tab=templates');
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold transition-colors"
                                                    >
                                                        <Settings size={16} />
                                                        <span>הגדר תבניות</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
                {!isNarrow && (
                <AnimatePresence>
                    {isTemplatesOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            ref={templatesDropdownRef}
                            className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-gray-900/5 origin-top-right md:origin-top-left"
                        >
                            <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">צור במהירות</div>
                                {templates.length > 0 ? (
                                    templates.map((tmp: Template) => {
                                const IconComponent = ICON_MAP[tmp.icon] || Layers;
                                return (
                                    <button 
                                        key={tmp.id}
                                        onClick={() => handleApplyTemplate(tmp.id)}
                                        className="w-full text-right px-4 py-3 hover:bg-blue-50 text-sm font-medium text-gray-700 flex items-center gap-3 transition-colors"
                                    >
                                        <IconComponent size={16} className="text-blue-500" />
                                        {tmp.name}
                                    </button>
                                );
                                    })
                                ) : (
                                    <div className="p-4 text-center">
                                        <p className="text-sm text-gray-500 mb-3">אין תבניות זמינות</p>
                                        <button
                                            onClick={() => {
                                                setIsTemplatesOpen(false);
                                                navigate('/settings?tab=templates');
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold transition-colors"
                                        >
                                            <Settings size={16} />
                                            <span>הגדר תבניות</span>
                                        </button>
                                    </div>
                                )}
                        </motion.div>
                    )}
                </AnimatePresence>
                )}
            </div>

            {/* Group By Dropdown */}
            <div className="relative">
                <button 
                    ref={groupByButtonRef}
                    onClick={() => {
                        const mobileNow = typeof window !== 'undefined' && window.innerWidth < 768;
                        const newState = !isGroupByOpen;
                        setIsGroupByOpen(newState);
                        if (newState && mobileNow && typeof window !== 'undefined') {
                            setGroupByPosition({
                                top: window.innerHeight / 2,
                                left: window.innerWidth / 2,
                                width: Math.min(200, window.innerWidth - 32)
                            });
                        } else {
                            setGroupByPosition(null);
                        }
                    }}
                    aria-label="מיון משימות לפי"
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${groupBy !== 'status' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 bg-gray-50 shadow-sm'}`}
                >
                    {groupBy === 'status' && <Kanban size={16} />}
                    {groupBy === 'client' && <Briefcase size={16} />}
                    {groupBy === 'assignee' && <Users size={16} />}
                    {groupBy === 'priority' && <Flag size={16} />}
                    
                    <span className="hidden sm:inline">
                        מיון לפי
                    </span>
                    <ChevronDown size={14} className="opacity-50" />
                </button>

                {isNarrow && typeof document !== 'undefined' && createPortal(
                <AnimatePresence mode="sync">
                        {isGroupByOpen && (
                        <>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                                    className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                                    style={{ zIndex: 101 }}
                            onClick={() => setIsGroupByOpen(false)}
                        />
                        <div
                            className="fixed inset-0 flex items-center justify-center p-4"
                            style={{ zIndex: 102 }}
                            onClick={() => setIsGroupByOpen(false)}
                        >
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                ref={groupByDropdownRef}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: groupByPosition?.width || (typeof window !== 'undefined' ? Math.min(320, window.innerWidth - 32) : 320),
                                    maxWidth: 'calc(100vw - 32px)',
                                    maxHeight: 'calc(100vh - 32px)',
                                }}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-2 overflow-y-auto"
                            >
                                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">קבץ משימות לפי</div>
                                {[
                                    { id: 'status', label: 'תהליך (סטטוס)', icon: Kanban },
                                    { id: 'client', label: 'לקוחות (פרויקטים)', icon: Briefcase },
                                    { id: 'assignee', label: 'צוות', icon: Users },
                                    { id: 'priority', label: 'דחיפות', icon: Flag },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setGroupBy(opt.id as GroupByOption); setIsGroupByOpen(false); }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${groupBy === opt.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <opt.icon size={16} />
                                        {opt.label}
                                    </button>
                                ))}
                            </motion.div>
                        </div>
                            </>
                        )}
                    </AnimatePresence>,
                        document.body
                )}
                {!isNarrow && (
                    <AnimatePresence mode="sync">
                        {isGroupByOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            ref={groupByDropdownRef}
                            className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-2 overflow-hidden origin-top-right"
                        >
                            <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">קבץ משימות לפי</div>
                            {[
                                { id: 'status', label: 'תהליך (סטטוס)', icon: Kanban },
                                { id: 'client', label: 'לקוחות (פרויקטים)', icon: Briefcase },
                                { id: 'assignee', label: 'צוות', icon: Users },
                                { id: 'priority', label: 'דחיפות', icon: Flag },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => { setGroupBy(opt.id as GroupByOption); setIsGroupByOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${groupBy === opt.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <opt.icon size={16} />
                                    {opt.label}
                                </button>
                            ))}
                        </motion.div>
                        )}
                </AnimatePresence>
                )}
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
                <button 
                    ref={filterButtonRef}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const mobileNow = typeof window !== 'undefined' && window.innerWidth < 768;
                        const newState = !isFilterMenuOpen;
                        setIsFilterMenuOpen(newState);
                        if (newState && mobileNow && typeof window !== 'undefined') {
                            setFilterPosition({
                                top: window.innerHeight / 2,
                                left: window.innerWidth / 2,
                                width: Math.min(320, window.innerWidth - 32)
                            });
                        } else {
                            setFilterPosition(null);
                        }
                    }}
                    aria-label={`סינון משימות${activeFiltersCount > 0 ? ` (${activeFiltersCount} פעיל)` : ''}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${isFilterMenuOpen || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 bg-gray-50 shadow-sm'}`}
                >
                    <Filter size={16} />
                    <span className="hidden sm:inline">סינון</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>

                {isNarrow && typeof document !== 'undefined' && createPortal(
                <AnimatePresence mode="sync">
                        {isFilterMenuOpen && (
                        <>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                                    className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                                    style={{ zIndex: 101 }}
                            onClick={() => setIsFilterMenuOpen(false)}
                        />
                        <div
                            className="fixed inset-0 flex items-center justify-center p-4"
                            style={{ zIndex: 102 }}
                            onClick={() => setIsFilterMenuOpen(false)}
                        >
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                ref={filterDropdownRef}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: filterPosition?.width || (typeof window !== 'undefined' ? Math.min(360, window.innerWidth - 32) : 360),
                                    maxWidth: 'calc(100vw - 32px)',
                                    maxHeight: 'calc(100vh - 32px)',
                                }}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 space-y-4 overflow-y-auto"
                            >
                                <TasksFilterContent
                                    filterPriority={filterPriority}
                                    filterAssignee={filterAssignee}
                                    activeFiltersCount={activeFiltersCount}
                                    scopedUsers={scopedUsers}
                                    onFilterPriorityChange={setFilterPriority}
                                    onFilterAssigneeChange={setFilterAssignee}
                                    onClearFilters={clearFilters}
                                />
                            </motion.div>
                        </div>
                            </>
                        )}
                    </AnimatePresence>,
                        document.body
                )}
                {!isNarrow && (
                    <AnimatePresence mode="sync">
                    {isFilterMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            ref={filterDropdownRef}
                            className="absolute top-full left-0 md:left-0 md:right-auto mt-2 w-72 max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-3 sm:p-4 space-y-3 sm:space-y-4 origin-top-left"
                        >
                            <TasksFilterContent
                                filterPriority={filterPriority}
                                filterAssignee={filterAssignee}
                                activeFiltersCount={activeFiltersCount}
                                scopedUsers={scopedUsers}
                                onFilterPriorityChange={setFilterPriority}
                                onFilterAssigneeChange={setFilterAssignee}
                                onClearFilters={clearFilters}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                )}
            </div>
            
            <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    title="תצוגת רשימה"
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('board')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    title="לוח משימות"
                >
                    <Kanban size={18} />
                </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 md:overflow-hidden relative min-h-0">
        {/* Mobile List View */}
        <div
          className={`block md:hidden h-full overflow-y-auto px-2 pt-4 min-h-0 ${isTaskStatusSheetOpen ? 'pb-24' : 'pb-12'}`}
        >
             {isInitialLoading ? (
                <div className="space-y-3 px-2 animate-pulse">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-3/5 rounded-lg" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-3 w-20 rounded" />
                                <Skeleton className="h-3 w-16 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredTasks.length > 0 ? filteredTasks.map(task => (
                <TaskItem 
                    key={task.id} 
                    task={task} 
                    users={users} 
                    onClick={() => openTask(task.id)}
                    toggleTimer={handleToggleTimer}
                />
            )) : (
                <div className="p-10 text-center text-gray-400">
                        {isFocusMode ? 'אין משימות דחופות כרגע! 🎉' : 'אין משימות להצגה'}
                </div>
            )}
        </div>

        {/* Desktop Views */}
        <div className="hidden md:block h-full">
            {viewMode === 'list' ? (
                <div className="bg-white/50 border border-gray-200 rounded-3xl overflow-hidden min-h-[400px] shadow-sm">
                    <div className="hidden md:flex items-center gap-4 px-6 py-4 bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="w-5"></div>
                        <div className="flex-1">שם המשימה</div>
                        <div className="w-32 text-right">זמן עבודה</div>
                        <div className="w-24 text-right">דחיפות</div>
                        <div className="w-24 text-right">תאריך יעד</div>
                        <div className="w-16 text-right">אחראי</div>
                    </div>
            
                    <div className="overflow-y-auto max-h-[calc(100vh-320px)] no-scrollbar p-2">
                        {isInitialLoading ? (
                            <div className="space-y-2 animate-pulse">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-100">
                                        <Skeleton className="w-5 h-5 rounded" />
                                        <Skeleton className="h-4 flex-1 rounded-lg" />
                                        <Skeleton className="h-3 w-16 rounded" />
                                        <Skeleton className="h-5 w-14 rounded-full" />
                                        <Skeleton className="h-3 w-20 rounded" />
                                        <Skeleton className="w-6 h-6 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredTasks.length > 0 ? filteredTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                users={users} 
                                onClick={() => openTask(task.id)}
                                toggleTimer={handleToggleTimer}
                            />
                        )) : (
                            <div className="p-10 text-center text-gray-400">
                                {isFocusMode ? 'אין משימות דחופות כרגע! 🎉' : 'אין משימות להצגה'}
                            </div>
                        )}
                    </div>
                </div>
            ) : isInitialLoading ? (
                <div className="h-full overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex h-full min-w-max gap-3 px-4 animate-pulse">
                        {Array.from({ length: 4 }).map((_, colIdx) => (
                            <div key={colIdx} className="w-[260px] min-w-[260px] flex flex-col h-full rounded-2xl bg-gray-50/40">
                                <div className="p-4 flex items-center gap-2">
                                    <Skeleton className="w-2 h-2 rounded-full" />
                                    <Skeleton className="h-4 w-20 rounded" />
                                    <Skeleton className="h-5 w-8 rounded-full" />
                                </div>
                                <div className="flex-1 px-2 space-y-3">
                                    {Array.from({ length: 3 - colIdx % 2 }).map((_, cardIdx) => (
                                        <div key={cardIdx} className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
                                            <Skeleton className="h-4 w-4/5 rounded" />
                                            <div className="flex gap-2">
                                                <Skeleton className="h-3 w-14 rounded" />
                                                <Skeleton className="h-3 w-10 rounded" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                                <Skeleton className="w-6 h-6 rounded-full" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <TasksBoardView
                    columns={columns}
                    getTasksForColumn={getTasksForColumn}
                    users={users}
                    groupBy={groupBy}
                    isFocusMode={isFocusMode}
                    dragOverColumnId={dragOverColumnId}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onOpenTask={(id) => openTask(id)}
                    onToggleTimer={handleToggleTimer}
                    onCreateTask={(defaults) => openCreateTask(defaults)}
                    defaultPriority={Priority.MEDIUM}
                />
            )}
        </div>
      </div>
      {orgSlug ? (
        <SmartImportTasksDialog
          orgSlug={orgSlug}
          open={showImportDialog}
          onCloseAction={() => setShowImportDialog(false)}
          onImportedAction={() => void refetchTasks()}
        />
      ) : null}
    </div>
  );
};
