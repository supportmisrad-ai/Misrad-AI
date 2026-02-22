'use client';

import React from 'react';
import { Zap, Trophy } from 'lucide-react';
import { TaskCard } from '@/components/nexus/TaskCard';
import type { Task, User as UserType } from '@/types';

interface DashboardFocusTasksProps {
    focusTasks: Task[];
    users: UserType[];
    isSynced: boolean;
    onOpenTask: (taskId: string) => void;
    onNavigateTasks: () => void;
}

export const DashboardFocusTasks: React.FC<DashboardFocusTasksProps> = ({
    focusTasks,
    users,
    isSynced,
    onOpenTask,
    onNavigateTasks,
}) => {
    return (
        <>
            <div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mt-8 mb-6 px-2"
                data-focus-today
            >
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3 flex-wrap">
                    <Zap size={20} className="md:w-6 md:h-6 text-yellow-500 fill-yellow-500 drop-shadow-sm" /> המיקוד להיום
                    {!isSynced && (
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">(אוטומטי)</span>
                    )}
                </h2>

                <button
                    onClick={onNavigateTasks}
                    type="button"
                    className="h-11 w-full md:w-auto px-6 rounded-xl bg-white/70 border border-slate-200 text-sm font-black text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all"
                    aria-label="לכל המשימות"
                >
                    לכל המשימות
                </button>
            </div>

            <div className="space-y-4">
                {focusTasks.length > 0 ? (
                    focusTasks.map((task) => (
                        <div key={task.id} className="relative">
                            {task.isFocus && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-yellow-400 rounded-r-lg shadow-sm"></div>
                            )}
                            <TaskCard task={task} users={users} onClick={() => onOpenTask(task.id)} />
                        </div>
                    ))
                ) : (
                    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-12 text-center border border-dashed border-gray-300">
                        <Trophy size={64} className="mx-auto text-yellow-400 mb-4 drop-shadow-md" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">סיימת את המיקוד להיום!</h3>
                        <p className="text-gray-500">קח משימה חדשה מהמאגר או צא להפסקה.</p>
                    </div>
                )}
            </div>
        </>
    );
};
