'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ListTodo, Plus, CheckCircle2, Circle, Trash2, Clock, Filter, ChevronDown, ArrowLeft } from 'lucide-react';
import { listNexusTasks, createNexusTask, updateNexusTask, deleteNexusTask } from '@/app/actions/nexus';
import { Priority } from '@/types';
import type { Task } from '@/types';
import { useRouter } from 'next/navigation';

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const PRIORITY_LABELS: Record<string, string> = {
  High: 'דחוף',
  Medium: 'רגיל',
  Low: 'נמוך',
};

const MODULE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  nexus: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'נקסוס' },
  social: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'שיווק' },
  system: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'מערכת' },
  finance: { bg: 'bg-green-100', text: 'text-green-700', label: 'פיננסים' },
  client: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'לקוחות' },
  operations: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'תפעול' },
};

export default function MyTasksPageClient({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const result = await listNexusTasks({ 
        orgId, 
        module: moduleFilter === 'all' ? undefined : moduleFilter,
        pageSize: 100 
      });
      setTasks(result.tasks);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId, moduleFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    if (!selectedModule) {
      alert('בחר מודול למשימה');
      return;
    }
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
          module: selectedModule,
        },
      });
      setTasks(prev => [task, ...prev]);
      setNewTitle('');
      setSelectedModule('');
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

  const activeTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done');

  const tasksByModule = activeTasks.reduce((acc, task) => {
    const mod = task.module || 'nexus';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 animate-pulse">
        <div className="h-12 bg-slate-200 rounded-xl w-64 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/w/${orgSlug}/nexus`)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <ListTodo className="text-purple-600" size={32} />
              המשימות שלי
            </h1>
            <p className="text-sm text-slate-500 mt-1">כל המשימות מכל המודולים במקום אחד</p>
          </div>
        </div>

        {/* Module Filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">כל המודולים</option>
            {Object.entries(MODULE_COLORS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Add */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          className="flex gap-3"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="הוסף משימה חדשה..."
            className="flex-1 h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModuleDropdown(!showModuleDropdown)}
              className="h-12 px-4 border border-slate-200 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50 min-w-[140px] justify-between"
            >
              {selectedModule ? MODULE_COLORS[selectedModule].label : 'בחר מודול'}
              <ChevronDown size={16} />
            </button>
            {showModuleDropdown && (
              <div className="absolute top-14 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-[140px]">
                {Object.entries(MODULE_COLORS).map(([key, { bg, text, label }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedModule(key);
                      setShowModuleDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 text-right text-sm font-medium hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl ${bg} ${text}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!newTitle.trim() || !selectedModule || creating}
            className="h-12 px-6 bg-purple-600 text-white rounded-xl font-black text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            הוסף
          </button>
        </form>
      </div>

      {/* Tasks by Module */}
      {moduleFilter === 'all' ? (
        <div className="space-y-6">
          {Object.entries(tasksByModule).map(([module, moduleTasks]) => {
            const config = MODULE_COLORS[module] || MODULE_COLORS.nexus;
            return (
              <div key={module} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`px-6 py-4 border-b border-slate-100 ${config.bg}`}>
                  <h2 className={`text-lg font-black ${config.text}`}>
                    {config.label} ({moduleTasks.length})
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {moduleTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            );
          })}
          {Object.keys(tasksByModule).length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <ListTodo className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-400 font-bold text-lg">אין משימות פעילות</p>
              <p className="text-slate-300 text-sm mt-2">הוסף משימה ראשונה למעלה</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="space-y-2">
            {activeTasks.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-400 font-bold">אין משימות במודול זה</p>
              </div>
            ) : (
              activeTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {doneTasks.length > 0 && (
        <details className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <summary className="px-6 py-4 cursor-pointer font-bold text-slate-600 hover:bg-slate-50">
            ✅ {doneTasks.length} משימות שהושלמו
          </summary>
          <div className="px-6 pb-6 space-y-2">
            {doneTasks.slice(0, 20).map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 opacity-60">
                <button onClick={() => handleToggle(task)}>
                  <CheckCircle2 size={20} className="text-green-500" />
                </button>
                <span className="text-sm font-medium text-slate-500 line-through flex-1">{task.title}</span>
                {task.module && (
                  <span className={`text-xs px-2 py-1 rounded-lg ${MODULE_COLORS[task.module]?.bg} ${MODULE_COLORS[task.module]?.text}`}>
                    {MODULE_COLORS[task.module]?.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { 
  task: Task; 
  onToggle: (task: Task) => void; 
  onDelete: (id: string) => void;
}) {
  const moduleConfig = MODULE_COLORS[task.module || 'nexus'];
  
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-colors">
      <button onClick={() => onToggle(task)} className="shrink-0">
        <Circle size={20} className="text-slate-300 hover:text-purple-500 transition-colors" />
      </button>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 truncate">{task.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          {task.dueDate && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={11} /> {new Date(task.dueDate).toLocaleDateString('he-IL')}
            </span>
          )}
          {task.module && (
            <span className={`text-xs px-2 py-0.5 rounded-lg ${moduleConfig.bg} ${moduleConfig.text}`}>
              {moduleConfig.label}
            </span>
          )}
        </div>
      </div>
      <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium}`}>
        {PRIORITY_LABELS[task.priority] || 'רגיל'}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
