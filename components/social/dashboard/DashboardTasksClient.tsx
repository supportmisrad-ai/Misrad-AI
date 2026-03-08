'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ListTodo, Plus, CheckCircle2, Circle, Trash2, Clock } from 'lucide-react';
import { listNexusTasks, createNexusTask, updateNexusTask, deleteNexusTask } from '@/app/actions/nexus';
import { Priority } from '@/types';
import type { Task } from '@/types';

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const PRIORITY_LABELS: Record<string, string> = {
  High: 'דחוף',
  Medium: 'רגיל',
  Low: 'נמוך',
};

const MODULE_CONFIG: Record<string, { label: string; accent: string; ring: string; badge: string; badgeText: string; btn: string; btnHover: string }> = {
  nexus:      { label: 'משימות',     accent: 'text-purple-600', ring: 'focus:ring-purple-100 focus:border-purple-400', badge: 'bg-purple-100', badgeText: 'text-purple-700', btn: 'bg-purple-600', btnHover: 'hover:bg-purple-700' },
  social:     { label: 'שיווק',      accent: 'text-pink-600',   ring: 'focus:ring-pink-100 focus:border-pink-400',   badge: 'bg-pink-100',   badgeText: 'text-pink-700',   btn: 'bg-pink-600',   btnHover: 'hover:bg-pink-700'   },
  system:     { label: 'מערכת',      accent: 'text-blue-600',   ring: 'focus:ring-blue-100 focus:border-blue-400',   badge: 'bg-blue-100',   badgeText: 'text-blue-700',   btn: 'bg-blue-600',   btnHover: 'hover:bg-blue-700'   },
  finance:    { label: 'פיננסים',    accent: 'text-green-600',  ring: 'focus:ring-green-100 focus:border-green-400',  badge: 'bg-green-100',  badgeText: 'text-green-700',  btn: 'bg-green-600',  btnHover: 'hover:bg-green-700'  },
  client:     { label: 'לקוחות',     accent: 'text-orange-600', ring: 'focus:ring-orange-100 focus:border-orange-400', badge: 'bg-orange-100', badgeText: 'text-orange-700', btn: 'bg-orange-500', btnHover: 'hover:bg-orange-600' },
  operations: { label: 'תפעול',      accent: 'text-cyan-600',   ring: 'focus:ring-cyan-100 focus:border-cyan-400',   badge: 'bg-cyan-100',   badgeText: 'text-cyan-700',   btn: 'bg-cyan-600',   btnHover: 'hover:bg-cyan-700'   },
};

const getModuleConfig = (mod: string) => MODULE_CONFIG[mod] ?? MODULE_CONFIG.nexus;

export default function DashboardTasksClient({ orgId, module }: { orgId: string; module: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const cfg = getModuleConfig(module);

  const loadTasks = useCallback(async () => {
    try {
      const result = await listNexusTasks({ orgId, module, pageSize: 10 });
      setTasks(result.tasks);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId, module]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      const task = await createNexusTask({
        orgId,
        input: {
          title,
          description: '',
          status: 'Todo',
          priority: Priority.MEDIUM,
          tags: [],
          createdAt: new Date().toISOString(),
          timeSpent: 0,
          isTimerRunning: false,
          messages: [],
          module,
        },
      });
      setTasks(prev => [task, ...prev]);
      setNewTitle('');
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'Done' ? 'Todo' : 'Done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await updateNexusTask({ orgId, taskId: task.id, updates: { status: newStatus } });
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await deleteNexusTask({ orgId, taskId });
    } catch {
      loadTasks();
    }
  };

  if (loading) {
    return (
      <div id="tasks-panel-section" className="bg-white rounded-[32px] border border-slate-100 shadow-lg p-6 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-xl w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done');

  return (
    <div id="tasks-panel-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ListTodo className={cfg.accent} size={22} />
          <h2 className="text-xl font-black text-slate-900">
            משימות {cfg.label}
          </h2>
          {activeTasks.length > 0 && (
            <span className={`${cfg.badge} ${cfg.badgeText} text-xs font-black px-2.5 py-1 rounded-full`}>
              {activeTasks.length}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-5">
        {/* Quick add */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="flex gap-2 mb-4"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="הוסף משימה חדשה..."
            className={`flex-1 h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800 outline-none ${cfg.ring} placeholder:text-slate-400 transition-all`}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || creating}
            className={`h-10 px-4 ${cfg.btn} text-white rounded-xl font-black text-sm flex items-center gap-1.5 disabled:opacity-40 ${cfg.btnHover} transition-colors`}
          >
            {creating ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            הוסף
          </button>
        </form>

        <div className="flex flex-col gap-1.5">
          {activeTasks.length === 0 && doneTasks.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="mx-auto text-slate-200 mb-3" size={36} />
              <p className="text-slate-400 font-bold text-sm">אין משימות {cfg.label} עדיין</p>
              <p className="text-slate-300 text-xs font-medium mt-1">הוסף משימה ראשונה למעלה</p>
            </div>
          ) : (
            <>
              {activeTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl group hover:bg-slate-100/80 transition-all">
                  <button onClick={() => handleToggle(task)} className="shrink-0 transition-transform hover:scale-110">
                    <Circle size={19} className="text-slate-300 hover:text-purple-400 transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate text-sm">{task.title}</h4>
                    {task.dueDate && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString('he-IL')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.Medium}`}>
                      {PRIORITY_LABELS[task.priority] ?? 'רגיל'}
                    </span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-400 transition-all rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {doneTasks.length > 0 && (
                <details className="mt-1.5">
                  <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-600 py-1.5 px-1 select-none list-none flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-400" />
                    {doneTasks.length} הושלמו
                  </summary>
                  <div className="flex flex-col gap-1 mt-1.5">
                    {doneTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl opacity-50 hover:opacity-70 transition-opacity">
                        <button onClick={() => handleToggle(task)} className="shrink-0">
                          <CheckCircle2 size={18} className="text-green-400" />
                        </button>
                        <span className="text-sm text-slate-500 line-through truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
