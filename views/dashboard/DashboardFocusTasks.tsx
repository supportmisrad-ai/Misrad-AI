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
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)] z-10 animate-pulse"></div>
                            )}
                            <TaskCard task={task} users={users} onClick={() => onOpenTask(task.id)} />
                        </div>
                    ))
                ) : (
                    <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200 shadow-inner group hover:bg-white/80 transition-all duration-500">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full scale-150 group-hover:scale-110 transition-transform duration-700"></div>
                            <Trophy size={80} className="relative text-yellow-400 drop-shadow-2xl animate-float" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">השולחן נקי, מצוין!</h3>
                        <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed font-medium">
                            סיימת את כל משימות המיקוד להיום. ה-AI מציע לך לקחת רגע של נחת, או לרענן משימות חדשות מהמאגר.
                        </p>
                        <button 
                            onClick={onNavigateTasks}
                            className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-base shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all"
                        >
                            צפה במאגר המשימות
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
