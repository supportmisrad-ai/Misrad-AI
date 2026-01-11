'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, MessageSquare, ShieldAlert, Clock, Trash2, Plus, DollarSign, Zap } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { SocialTask } from '@/types/social';

interface TasksPanelProps {
  onAddTask: () => void;
  onEditTask: (task: SocialTask) => void;
}

export default function TasksPanel({ onAddTask, onEditTask }: TasksPanelProps) {
  const { tasks, clients, team, handleToggleTask, handleDeleteTask } = useApp();

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status === 'todo') return 1;
    if (a.status === 'todo' && b.status === 'completed') return -1;
    const priorityMap = { high: 0, medium: 1, low: 2 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });

  const activeTasks = sortedTasks.filter(t => t.status === 'todo');

  const getPriorityStyles = (p: SocialTask['priority']) => {
    switch (p) {
      case 'high': return 'text-red-600 bg-red-50 border-red-100 ring-red-500/20';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100 ring-amber-500/20';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-100 ring-blue-500/20';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const getTypeIcon = (type: SocialTask['type']) => {
    switch (type) {
      case 'approval': return <ShieldAlert size={18} />;
      case 'message': return <MessageSquare size={18} />;
      case 'creative': return <Zap size={18} />;
      case 'payment': return <DollarSign size={18} />;
      default: return <Clock size={18} />;
    }
  };

  return (
    <section className="flex flex-col gap-8" dir="rtl">
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            משימות קרובות <span className="text-blue-600 bg-blue-50 px-3 py-0.5 rounded-full text-sm">{activeTasks.length}</span>
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ניהול פעולות שוטף</p>
        </div>
        <button onClick={onAddTask} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-black transition-all active:scale-90">
          <Plus size={24} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {activeTasks.length > 0 ? activeTasks.map(task => {
            const client = clients.find(c => c.id === task.clientId);
            const assignee = team.find(m => m.id === task.assignedTo);
            const priorityStyles = getPriorityStyles(task.priority);
            
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group p-5 rounded-[32px] border-2 bg-white transition-all hover:shadow-xl hover:border-slate-200 flex items-center gap-5 relative overflow-hidden cursor-pointer ${task.priority === 'high' ? 'border-red-50 shadow-red-50/10' : 'border-slate-50'}`}
                onClick={() => onEditTask(task)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
                  className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-100 text-slate-100 hover:border-green-500 hover:text-green-500'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <h4 className="font-black text-base truncate text-slate-800">
                      {task.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase ring-1 ${priorityStyles}`}>
                      {task.priority === 'high' ? 'דחוף' : task.priority === 'medium' ? 'היום' : 'בשגרה'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-bold text-slate-400 line-clamp-1">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {assignee && (
                    <img src={assignee.avatar} className="w-8 h-8 rounded-xl border-2 border-white shadow-sm" alt={assignee.name} />
                  )}
                  {client && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <img src={client.avatar} className="w-6 h-6 rounded-lg" alt={client.companyName} />
                      <span className="hidden md:inline">{client.companyName}</span>
                    </div>
                  )}
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    {getTypeIcon(task.type)}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            );
          }) : (
            <div className="text-center py-12 text-slate-400">
              <p className="font-black">אין משימות פעילות</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

