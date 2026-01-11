'use client';

import { useApp } from '@/contexts/AppContext';

export default function DashboardTasksClient() {
  const {
    tasks,
    setIsTaskModalOpen,
    setEditingTask,
    handleToggleTask,
    handleDeleteTask,
  } = useApp();

  return (
    <div id="tasks-panel-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-slate-900">משימות אחרונות</h2>
        <button
          onClick={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm"
        >
          + משימה חדשה
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-lg p-6">
        <div className="flex flex-col gap-4">
          {tasks.length > 0 ? (
            tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggleTask?.(task.id)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <div>
                      <h4 className="font-black text-slate-900">{task.title}</h4>
                      <p className="text-sm font-bold text-slate-400">{task.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-4 py-2 rounded-xl text-sm font-black ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-600'
                        : task.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <button
                    onClick={() => handleDeleteTask?.(task.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-xl font-black text-sm hover:bg-red-100"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400 font-bold mb-4">אין משימות</p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black"
              >
                צור משימה ראשונה
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
