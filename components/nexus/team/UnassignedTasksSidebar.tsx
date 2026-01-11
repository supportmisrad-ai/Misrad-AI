
import React from 'react';
import { ListTodo, GripVertical, Briefcase } from 'lucide-react';
import { Task, Priority } from '../../../types';

interface UnassignedTasksSidebarProps {
    tasks: Task[];
    onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export const UnassignedTasksSidebar: React.FC<UnassignedTasksSidebarProps> = ({ tasks, onDragStart }) => {
    return (
        <div className="w-80 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ListTodo size={18} className="text-gray-500" />
                    משימות לא משויכות
                </h3>
                <p className="text-xs text-gray-500 mt-1">משימות שיצרת וטרם הוקצו. גרור לכרטיס עובד.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {tasks.map(task => (
                    <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, task.id)}
                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                                task.priority === Priority.URGENT ? 'bg-red-500' : 'bg-gray-400'
                            }`}></div>
                            <div className="flex-1 mr-2">
                                <h4 className="text-sm font-bold text-gray-800 leading-snug group-hover:text-blue-700">{task.title}</h4>
                            </div>
                            <GripVertical size={14} className="text-gray-300" />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            {task.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-gray-500">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
                
                {tasks.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-xs">
                        <Briefcase size={32} className="mx-auto mb-2 opacity-20" />
                        אין משימות פתוחות ללא שיוך.
                        <br/>
                        צור משימה חדשה כדי לראות אותה כאן.
                    </div>
                )}
            </div>
        </div>
    );
};
