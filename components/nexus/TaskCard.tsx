
import React, { useMemo } from 'react';
import { Task, User, Client } from '../../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../constants';
import { CalendarDays, Play, Pause, Timer, Lock, MoreHorizontal, Clock, Briefcase, TriangleAlert, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { useSecondTicker } from '../../hooks/useSecondTicker';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

interface TaskCardProps {
  task: Task;
  users: User[];
  onClick?: () => void;
  toggleTimer?: (taskId: string) => void;
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

const TaskCardInner: React.FC<TaskCardProps> = ({ task, users, onClick, toggleTimer: propToggleTimer }) => {
  const { toggleTimer: contextToggleTimer, clients } = useData();
  const toggleTimer = propToggleTimer || contextToggleTimer;
  const nowMs = useSecondTicker(Boolean(task.isTimerRunning));
  const liveTimeSpent = getLiveTimeSpentSeconds(task, nowMs);

  const effectiveAssigneeIds = useMemo(() => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds.map(String);
    if (task.assigneeId !== undefined && task.assigneeId !== null && String(task.assigneeId)) return [String(task.assigneeId)];
    if (task.assigneeId === null) return [];
    const fallback = task.creatorId;
    return fallback ? [String(fallback)] : [];
  }, [task.assigneeIds, task.assigneeId, task.creatorId]);

  const assignedUsers = useMemo(() => users.filter(u => effectiveAssigneeIds.includes(String(u.id))), [users, effectiveAssigneeIds]);
  
  const linkedClient = useMemo(() => {
    if (task.clientId) return clients.find((c: Client) => c.id === task.clientId);
    return clients.find((c: Client) => task.tags.some(tag => tag.toLowerCase() === c.companyName.toLowerCase()));
  }, [task.clientId, task.tags, clients]);

  const snoozeCount = task.snoozeCount || 0;
  const isPendingApproval = task.approvalStatus === 'pending';

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  return (
    <motion.div 
      draggable
      onDragStart={(e) => {
        const de = e as unknown as React.DragEvent;
        if (de.dataTransfer) {
          de.dataTransfer.setData('taskId', task.id);
          de.dataTransfer.effectAllowed = 'move';
        }
      }}
      {...(!isMobile && { whileHover: { y: -4, scale: 1.01, transition: { duration: 0.2 } } })}
      onClick={(e) => {
          // Don't open if clicking on buttons
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a')) {
              return;
          }
          // Direct click - open immediately
          if (onClick) {
              e.preventDefault();
              e.stopPropagation();
              onClick();
          } else {
              console.error('[TaskCard] onClick handler is missing!', { taskId: task.id });
          }
      }}
      onTouchStart={(e) => {
          // Store touch start position for scroll detection
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a')) {
              return;
          }
          // Store touch start for scroll detection
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
          
          // Only trigger if it was a tap (not a scroll) - less than 10px movement and less than 300ms
          if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
              e.preventDefault();
              e.stopPropagation();
              if (onClick) {
                  onClick();
              } else {
                  console.warn('[TaskCard] onClick handler is missing in touch event!');
              }
          }
          
          // Clean up
          delete element._touchStartX;
          delete element._touchStartY;
          delete element._touchStartTime;
      }}
      className={`group zen-card p-5 border-none shadow-none hover:shadow-luxury transition-all cursor-pointer relative overflow-hidden ${
          task.isTimerRunning ? 'ring-2 ring-green-400/50 bg-white' : 
          isPendingApproval ? 'ring-2 ring-orange-300/50 bg-orange-50/20' :
          'hover:bg-white'
      }`}
    >
      {/* Pending Approval Overlay */}
      {isPendingApproval && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-bl-xl border-b border-l border-orange-200 flex items-center gap-1 z-20">
              <ShieldAlert size={12} /> ממתין לאישור
          </div>
      )}

      {/* Subtle Shine Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500 rounded-[1.5rem] overflow-hidden"></div>

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="flex gap-2 items-center">
             <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${PRIORITY_COLORS[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
            </span>
            {task.isPrivate && <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-50/50 text-gray-400 border border-gray-100"><Lock size={12} /></div>}
            
            {/* Snooze Indicator */}
            {snoozeCount > 0 && (
                <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 text-[10px] font-bold ${snoozeCount >= 3 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                    <Clock size={10} /> {snoozeCount}x
                </div>
            )}
        </div>
        
        {!isPendingApproval && (
            <button 
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation();
                    if (toggleTimer) {
                        toggleTimer(task.id);
                    }
                }}
                className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-full flex items-center justify-center transition-all shadow-sm touch-manipulation ${task.isTimerRunning ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200 ring-2 ring-green-300' : isMobile ? 'bg-gray-50 text-gray-600 hover:bg-black hover:text-white border-2 border-gray-300 shadow-lg active:bg-black active:text-white' : 'bg-gray-50 text-gray-400 hover:text-white hover:bg-black border border-transparent hover:border-black'}`} 
                aria-label={task.isTimerRunning ? "עצור טיימר" : "התחל טיימר"}
                type="button"
            >
                {task.isTimerRunning ? <Pause size={isMobile ? 16 : 12} fill="currentColor" /> : <Play size={isMobile ? 16 : 12} fill="currentColor" />}
            </button>
        )}
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug transition-colors relative z-10">{task.title}</h3>

      {linkedClient && (
          <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold text-gray-500 bg-gray-50/50 px-2 py-1 rounded-md border border-gray-100 w-fit">
              <Briefcase size={10} /> {linkedClient.companyName}
          </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap relative z-10">
          {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] text-gray-500 bg-gray-50/80 px-2 py-1 rounded-md border border-gray-100 font-medium backdrop-blur-sm">#{tag}</span>
          ))}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100/50 relative z-10 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
        <div className="flex items-center gap-3">
            {(task.timeSpent > 0 || task.isTimerRunning) && (
                <div className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-md ${task.isTimerRunning ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-50'}`}>
                    <Timer size={12} /> {formatTime(liveTimeSpent)}
                </div>
            )}
            {(task.dueDate || task.dueTime) && (
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${task.priority === 'Urgent' ? 'text-red-500 bg-red-50 px-2 py-1 rounded-md' : 'text-gray-400'}`}>
                <CalendarDays size={12} /> 
                <span>
                    {task.dueDate && task.dueDate}
                    {task.dueDate && task.dueTime && <span className="mr-1 text-gray-500">•</span>}
                    {task.dueTime && <span className={task.dueDate ? 'text-gray-500' : ''}>{task.dueTime}</span>}
                </span>
            </div>
            )}
        </div>

        <div className="flex -space-x-2 space-x-reverse">
          {assignedUsers.length > 0 ? (
            assignedUsers.map((user) => {
              const avatarUrl = user.avatar;
              const initials = user.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2) || '?';
              
              return avatarUrl ? (
                <img 
                  key={user.id} 
                  src={avatarUrl} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 object-cover shadow-sm" 
                  title={user.name}
                  onError={(e) => {
                    // Replace with fallback on error
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm';
                      fallback.title = user.name || '';
                      fallback.textContent = initials;
                      parent.replaceChild(fallback, target);
                    }
                  }}
                />
              ) : (
                <div 
                  key={user.id}
                  className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  title={user.name}
                >
                  {initials}
                </div>
              );
            })
          ) : (
             <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-300"><span className="text-[10px]">?</span></div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const TaskCard = React.memo(TaskCardInner);
