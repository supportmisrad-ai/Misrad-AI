
import React from 'react';
import { Task, User } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../constants';
import { CalendarDays, Play, Pause, Timer, Lock, MoreHorizontal, Clock, Briefcase, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useSecondTicker } from '../hooks/useSecondTicker';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

interface TaskCardProps {
  task: Task;
  users: User[];
  onClick?: () => void;
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

export const TaskCard: React.FC<TaskCardProps> = ({ task, users, onClick }) => {
  const { toggleTimer, clients } = useData();
  const nowMs = useSecondTicker(Boolean(task.isTimerRunning));
  const liveTimeSpent = getLiveTimeSpentSeconds(task, nowMs);
  const assignedUsers = users.filter(u => (task.assigneeIds && task.assigneeIds.includes(u.id)) || (task.assigneeId === u.id));
  
  // Find linked client if exists
  const linkedClient = task.clientId 
    ? clients.find((c: unknown) => (c as Record<string, unknown>).id === task.clientId)
    : clients.find((c: unknown) => task.tags.some(tag => tag.toLowerCase() === String((c as Record<string, unknown>).companyName || '').toLowerCase()));

  const snoozeCount = task.snoozeCount || 0;
  const isPendingApproval = task.approvalStatus === 'pending';

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`group bg-white/70 backdrop-blur-lg p-4 rounded-[1.5rem] border shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all cursor-pointer relative overflow-hidden ${
          task.isTimerRunning ? 'border-green-400 ring-2 ring-green-100' : 
          isPendingApproval ? 'border-orange-300 ring-2 ring-orange-50 bg-orange-50/30' :
          'border-white/60 hover:border-white/80'
      }`}
    >
      {/* Pending Approval Overlay */}
      {isPendingApproval && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-bl-xl border-b border-l border-orange-200 flex items-center gap-1 z-20">
              <ShieldAlert size={12} /> ממתין לאישור
          </div>
      )}

      {/* Subtle Shine Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500"></div>

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
            <button onClick={(e) => { e.stopPropagation(); toggleTimer(task.id); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${task.isTimerRunning ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200' : 'bg-gray-50 text-gray-400 hover:text-white hover:bg-black border border-transparent hover:border-black'}`}>
                {task.isTimerRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
            </button>
        )}
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors relative z-10">{task.title}</h3>

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

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100/50 relative z-10">
        <div className="flex items-center gap-3">
            {(task.timeSpent > 0 || task.isTimerRunning) && (
                <div className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-md ${task.isTimerRunning ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-50'}`}>
                    <Timer size={12} /> {formatTime(liveTimeSpent)}
                </div>
            )}
            {task.dueDate && (
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${task.priority === 'Urgent' ? 'text-red-500 bg-red-50 px-2 py-1 rounded-md' : 'text-gray-400'}`}>
                <CalendarDays size={12} /> 
                <span>
                    {task.dueDate} 
                    {task.dueTime && <span className="mr-1 text-gray-500">• {task.dueTime}</span>}
                </span>
            </div>
            )}
        </div>

        <div className="flex -space-x-2 space-x-reverse">
          {assignedUsers.length > 0 ? (
            assignedUsers.map((user) => (
              <img key={user.id} src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-gray-100 object-cover shadow-sm" title={user.name} />
            ))
          ) : (
             <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-300"><span className="text-[10px]">?</span></div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
