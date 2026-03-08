'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ListTodo, Plus, CheckCircle2, Circle, Trash2, Clock } from 'lucide-react';
import { listNexusTasks, createNexusTask, updateNexusTask, deleteNexusTask } from '@/app/actions/nexus';
import { Priority } from '@/types';
import type { Task } from '@/types';

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-blue-100 text-blue-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  High: 'דחוף',
  Medium: 'רגיל',
  Low: 'נמוך',
};

export default function DashboardTasksClient({ orgId, module }: { orgId: string; module: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListTodo className="text-purple-600" size={24} />
          <h2 className="text-2xl font-black text-slate-900">משימות {module === 'social' ? 'שיווק' : module}</h2>
          {activeTasks.length > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs font-black px-2.5 py-1 rounded-full">
              {activeTasks.length}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-lg p-6">
        {/* Quick add */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="flex gap-2 mb-4"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="הוסף משימה חדשה..."
            className="flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || creating}
            className="h-11 px-4 bg-purple-600 text-white rounded-xl font-black text-sm flex items-center gap-1.5 disabled:opacity-50 hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} />
            הוסף
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {activeTasks.length === 0 && doneTasks.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-400 font-bold">אין משימות עדיין</p>
              <p className="text-slate-300 text-sm font-medium mt-1">הוסף משימה ראשונה למעלה</p>
            </div>
          ) : (
            <>
              {activeTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => handleToggle(task)} className="shrink-0">
                      <Circle size={20} className="text-slate-300 hover:text-purple-500 transition-colors" />
                    </button>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{task.title}</h4>
                      {task.dueDate && (
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={11} /> {new Date(task.dueDate).toLocaleDateString('he-IL')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                      {PRIORITY_LABELS[task.priority] || 'רגיל'}
                    </span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {doneTasks.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-600 py-1">
                    {doneTasks.length} משימות שהושלמו
                  </summary>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {doneTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl opacity-60">
                        <button onClick={() => handleToggle(task)} className="shrink-0">
                          <CheckCircle2 size={20} className="text-green-500" />
                        </button>
                        <span className="text-sm font-medium text-slate-500 line-through truncate">{task.title}</span>
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
