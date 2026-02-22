
import React from 'react';
import { Task, User, Status } from '../../types';
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS as DEFAULT_STATUS_COLORS } from '../../constants';
import { CircleCheckBig, Circle, CircleAlert, SignalHigh, SignalMedium, SignalLow, CalendarDays, User as UserIcon, Clock, Play, Pause, Mic, Target, MoreHorizontal } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Skeleton } from '@/components/ui/skeletons';
import { useSecondTicker } from '../../hooks/useSecondTicker';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

interface TaskItemProps {
  task: Task;
  users: User[];
  onClick?: () => void;
  toggleTimer?: (taskId: string) => void | Promise<void>;
}

const PriorityIcon = ({ priority, className }: { priority: string, className?: string }) => {
  switch (priority) {
    case 'Urgent': return <CircleAlert size={16} className={className} />;
    case 'High': return <SignalHigh size={16} className={className} />;
    case 'Medium': return <SignalMedium size={16} className={className} />;
    case 'Low': return <SignalLow size={16} className={className} />;
    default: return null;
  }
};

const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'Done') return <CircleCheckBig size={18} className="text-green-500" />;
    if (status === 'Canceled') return <Circle size={18} className="text-gray-300" />;
    if (status === 'In Progress') return <Skeleton className="w-4 h-4 rounded-full bg-blue-200" />;
    if (status === 'Waiting for Review') return <Clock size={18} className="text-orange-400" />;
    return <Circle size={18} className="text-gray-300" />;
}

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ש׳ ${m} דק׳`;
    return `${m} דק׳`;
};

const getLiveTimeSpentSeconds = (task: Task, nowMs: number): number => {
  const base = Number(task.timeSpent ?? 0) || 0;
  if (!task.isTimerRunning) return base;
  if (typeof window === 'undefined') return base;

  const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
  if (!orgSlug) return base;

  try {
    const raw = window.sessionStorage.getItem(`nexus_task_timers_v1:${orgSlug}`);
    if (!raw) return base;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base;
    const startedAt = (parsed as Record<string, unknown>)[String(task.id)];
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt) || startedAt <= 0) return base;
    const deltaSeconds = Math.floor(Math.max(0, nowMs - startedAt) / 1000);
    return base + deltaSeconds;
  } catch {
    return base;
  }
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, users, onClick, toggleTimer: toggleTimerProp }) => {
  const { toggleTimer: contextToggleTimer, workflowStages } = useData();
  const toggleTimer = toggleTimerProp || contextToggleTimer;
  const nowMs = useSecondTicker(Boolean(task.isTimerRunning));
  const liveTimeSpent = getLiveTimeSpentSeconds(task, nowMs);
  const isExplicitlyUnassigned = task.assigneeId === null;
  const effectiveAssigneeIds: string[] = (() => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds.map(String);
    if (task.assigneeId !== undefined && task.assigneeId !== null && String(task.assigneeId)) return [String(task.assigneeId)];
    if (isExplicitlyUnassigned) return [];
    const fallback = task.creatorId;
    return fallback ? [String(fallback)] : [];
  })();

  const assignedUsers = users.filter(u => effectiveAssigneeIds.includes(String(u.id)));

  // Find status display data
  const stage = workflowStages.find((s) => s.id === task.status);
  const statusColor = stage ? stage.color : (DEFAULT_STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-500');
  const statusLabel = stage ? stage.name : task.status;

  // Strategic/High Impact Logic
  const isHighImpact = task.tags.some(t => ['Money', 'Sales', 'Core', 'Strategy', 'Growth'].includes(t));

  return (
    <div 
        onClick={(e) => {
            // Don't open if clicking on buttons
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) {
                return;
            }
            if (onClick) {
                onClick();
            }
        }}
        onTouchStart={(e) => {
            // Store touch start for scroll detection
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) {
                return;
            }
            const touch = e.touches[0];
            if (touch) {
                const el = e.currentTarget as HTMLElement & { _touchStartX?: number; _touchStartY?: number; _touchStartTime?: number };
                el._touchStartX = touch.clientX;
                el._touchStartY = touch.clientY;
                el._touchStartTime = Date.now();
            }
        }}
        onTouchEnd={(e) => {
            // Handle touch end for mobile
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('a')) {
                return;
            }
            
            const element = e.currentTarget as HTMLElement & { _touchStartX?: number; _touchStartY?: number; _touchStartTime?: number };
            const touchStartX = element._touchStartX;
            const touchStartY = element._touchStartY;
            const touchStartTime = element._touchStartTime;
            
            if (!touchStartX || !touchStartY || !touchStartTime) {
                return;
            }
            
            const touch = e.changedTouches[0];
            if (!touch) return;
            
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchEndTime = Date.now();
            
            // Calculate movement and time
            const deltaX = Math.abs(touchEndX - touchStartX);
            const deltaY = Math.abs(touchEndY - touchStartY);
            const deltaTime = touchEndTime - touchStartTime;
            
            // Only trigger if it was a tap (not a scroll)
            if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
                e.preventDefault();
                e.stopPropagation();
                if (onClick) {
                    onClick();
                }
            }
            
            // Clean up
            delete element._touchStartX;
            delete element._touchStartY;
            delete element._touchStartTime;
        }}
        className={`group flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 mb-2 hover:bg-white transition-all cursor-pointer bg-white/60 md:bg-white border-transparent md:border md:border-gray-100/50 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 relative overflow-hidden ${task.isTimerRunning ? 'bg-green-50/50 border-green-100 ring-1 ring-green-100' : ''}`}
    >
      {task.isTimerRunning && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
      
      <div className="flex items-center justify-between md:hidden text-xs text-gray-500 mb-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Open status change menu - will be handled by parent
            // Trigger status menu - handled by TasksView (bottom sheet)
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('taskStatusMenu', { detail: { taskId: task.id } });
              window.dispatchEvent(event);
            }
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="שינוי סטטוס"
        >
          <MoreHorizontal size={14} className="text-gray-400" />
        </button>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
            {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <div className="hidden md:block">
            <StatusIcon status={task.status} />
        </div>
        <div className="flex flex-col gap-1 w-full">
            <h3 className={`text-[15px] font-bold leading-tight transition-colors flex items-center gap-2 ${task.isTimerRunning ? 'text-green-800' : 'text-gray-900 group-hover:text-blue-600'}`}>
                {task.title}
                {task.audioUrl && (
                    <Mic size={14} className="text-red-500 fill-red-100" />
                )}
                {isHighImpact && (
                    <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wide flex items-center gap-1">
                        <Target size={10} /> Impact
                    </span>
                )}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-gray-300 font-mono hidden md:inline-block dir-ltr opacity-60 group-hover:opacity-100 transition-opacity">{task.id}</span>
                {task.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-100">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 mt-2 md:mt-0 md:w-auto">
        <div className="flex items-center gap-3 min-w-[100px] justify-end">
            <div className={`text-xs font-medium font-mono ${task.isTimerRunning ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                {formatTime(liveTimeSpent || 0)}
            </div>
            <button 
                type="button"
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all touch-manipulation relative z-20 pointer-events-auto ${task.isTimerRunning ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'bg-gray-50 text-gray-400 hover:bg-black hover:text-white active:bg-black active:text-white'}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTimer?.(task.id);
                }}
            >
                 {task.isTimerRunning ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
            </button>
        </div>

        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full w-24 justify-center border ${PRIORITY_COLORS[task.priority]}`}>
            <PriorityIcon priority={task.priority} />
            <span className="hidden md:inline font-bold">{PRIORITY_LABELS[task.priority]}</span>
        </div>

        <div className={`hidden md:flex items-center gap-1.5 text-xs font-medium w-28 justify-end ${task.priority === 'Urgent' ? 'text-red-600' : 'text-gray-400'}`}>
            <CalendarDays size={14} />
            <span>{task.dueDate || '-'}</span>
            {task.dueTime && <span className="opacity-70 text-[10px] ml-1">{task.dueTime}</span>}
        </div>

        <div className="flex items-center gap-[-8px] min-w-[24px] w-16 justify-end pl-2">
            {assignedUsers.length > 0 ? (
                <div className="flex -space-x-2 space-x-reverse">
                    {assignedUsers.slice(0, 3).map(u => {
                        const avatarUrl = u.avatar;
                        const initials = u.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2) || '?';
                        return avatarUrl ? (
                            <img
                                key={u.id}
                                src={avatarUrl}
                                alt={u.name}
                                className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 shadow-sm object-cover"
                                title={u.name}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const parent = target.parentElement;
                                    if (parent) {
                                        const fallback = document.createElement('div');
                                        fallback.className = 'w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm';
                                        fallback.title = u.name || '';
                                        fallback.textContent = initials;
                                        parent.replaceChild(fallback, target);
                                    }
                                }}
                            />
                        ) : (
                            <div
                                key={u.id}
                                className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                title={u.name}
                            >
                                {initials}
                            </div>
                        );
                    })}
                    {assignedUsers.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
                            +{assignedUsers.length - 3}
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-300 bg-gray-50">
                    <UserIcon size={14} />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
