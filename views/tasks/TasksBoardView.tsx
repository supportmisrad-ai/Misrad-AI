'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { TaskCard } from '@/components/nexus/TaskCard';
import type { Task, User, Priority, TaskCreationDefaults } from '@/types';

type GroupByOption = 'status' | 'assignee' | 'priority' | 'client';

type BoardColumn = {
    id: string;
    title: string;
    color: string;
    avatar?: string;
};

interface TasksBoardViewProps {
    columns: BoardColumn[];
    getTasksForColumn: (columnId: string) => Task[];
    users: User[];
    groupBy: GroupByOption;
    isFocusMode: boolean;
    dragOverColumnId: string | null;
    onDragOver: (e: React.DragEvent, columnId: string) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, columnId: string) => void;
    onOpenTask: (taskId: string) => void;
    onToggleTimer: (taskId: string) => void;
    onCreateTask: (defaults: TaskCreationDefaults) => void;
    defaultPriority: Priority;
}

export const TasksBoardView: React.FC<TasksBoardViewProps> = ({
    columns,
    getTasksForColumn,
    users,
    groupBy,
    isFocusMode,
    dragOverColumnId,
    onDragOver,
    onDragLeave,
    onDrop,
    onOpenTask,
    onToggleTimer,
    onCreateTask,
    defaultPriority,
}) => {
    return (
        <div className="h-full overflow-x-auto overflow-y-hidden pb-4">
            <div className="flex h-full min-w-max gap-3 px-4">
                {columns.map(col => {
                    if (isFocusMode && col.id === 'Done') return null;

                    const columnTasks = getTasksForColumn(col.id);
                    const isDragTarget = dragOverColumnId === col.id;
                    
                    return (
                        <div 
                            key={col.id} 
                            className={`w-[260px] min-w-[260px] flex flex-col h-full rounded-2xl transition-all duration-300 ${
                                isDragTarget ? 'bg-blue-50/60 ring-2 ring-blue-100' : 'bg-gray-50/40'
                            }`}
                            onDragOver={(e) => onDragOver(e, col.id)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => onDrop(e, col.id)}
                        >
                            <div className="p-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    {col.avatar ? (
                                        <Avatar src={col.avatar} name={col.title} size="sm" className="border border-white shadow-sm" />
                                    ) : (
                                        <div className={`w-2 h-2 rounded-full ${'color' in col && typeof col.color === 'string' && col.color.includes('bg-') ? col.color.split(' ')[0] : 'bg-gray-400'}`}></div>
                                    )}
                                    
                                    <h3 className="text-sm font-bold text-gray-900 truncate max-w-[120px]" title={col.title}>{col.title}</h3>
                                    <span className="text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
                                        {columnTasks.length}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => {
                                        const defaults: TaskCreationDefaults = { priority: defaultPriority };
                                        
                                        if (groupBy === 'status') defaults.status = col.id;
                                        if (groupBy === 'priority') defaults.priority = col.id as Priority;
                                        if (groupBy === 'assignee' && col.id !== 'unassigned') defaults.assigneeId = col.id;
                                        if (groupBy === 'client' && col.id !== 'no-client') defaults.clientId = col.id;
                                        
                                        onCreateTask(defaults);
                                    }}
                                    className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-white transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2 space-y-3 no-scrollbar h-full min-h-[150px] relative">
                                {columnTasks.map((task) => (
                                    <TaskCard 
                                        key={task.id}
                                        task={task} 
                                        users={users} 
                                        onClick={() => onOpenTask(task.id)}
                                        toggleTimer={onToggleTimer}
                                    />
                                ))}
                                
                                <div className={`flex-1 min-h-[100px] transition-all rounded-xl border-2 border-dashed ${isDragTarget ? 'border-blue-300 bg-blue-50/20' : 'border-transparent'}`}>
                                    {columnTasks.length === 0 && !isDragTarget && (
                                        <div className="h-full flex items-center justify-center text-gray-300 text-xs font-medium">
                                            ריק
                                        </div>
                                    )}
                                    {isDragTarget && columnTasks.length === 0 && (
                                        <div className="h-full flex items-center justify-center text-blue-400 text-xs font-medium">
                                            שחרר כאן
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
