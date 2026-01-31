
import React, { useRef } from 'react';
import { useData } from '../context/DataContext';
import { Task, Priority } from '../types';
import { PRIORITY_LABELS } from '../constants';
import { Activity, AlertTriangle, User as UserIcon, Calendar, Briefcase, Timer, Clock, Edit2, Info, ChevronDown } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomTimePicker } from './CustomTimePicker';

interface TaskDetailPropertiesProps {
    task: Task;
    onOpenPopover: (type: 'assignee' | 'priority' | 'estimate', rect: DOMRect) => void;
    activePopover: string;
}

// Helper for Status Contrast
const getStatusSolidColor = (colorClass: string) => {
    if (colorClass.includes('green')) return 'bg-green-600';
    if (colorClass.includes('blue')) return 'bg-blue-600';
    if (colorClass.includes('orange')) return 'bg-orange-600';
    if (colorClass.includes('red')) return 'bg-red-600';
    if (colorClass.includes('purple')) return 'bg-purple-600';
    if (colorClass.includes('pink')) return 'bg-pink-600';
    if (colorClass.includes('yellow')) return 'bg-yellow-500';
    if (colorClass.includes('cyan')) return 'bg-cyan-600';
    return 'bg-gray-600';
};

// Helper for Priority Contrast
const getPrioritySolidColor = (p: Priority) => {
    switch (p) {
        case Priority.URGENT: return 'bg-red-600';
        case Priority.HIGH: return 'bg-orange-600';
        case Priority.MEDIUM: return 'bg-amber-500';
        case Priority.LOW: return 'bg-slate-500';
        default: return 'bg-gray-500';
    }
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ש׳ ${m} דק׳`;
    return `${m} דק׳`;
};

const RenderLabel = ({ icon, label }: { icon: any, label: string }) => (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
        {icon} {label}
    </div>
);

export const TaskDetailProperties: React.FC<TaskDetailPropertiesProps> = ({ task, onOpenPopover, activePopover }) => {
    const { users, updateTask, workflowStages, clients } = useData();
    
    // Refs for button positioning
    const assigneeButtonRef = useRef<HTMLButtonElement>(null);
    const priorityButtonRef = useRef<HTMLButtonElement>(null);
    const estimateButtonRef = useRef<HTMLButtonElement>(null);

    const assignedUsers = users.filter((u: any) => 
        (task.assigneeIds && task.assigneeIds.includes(u.id)) || 
        (task.assigneeId === u.id)
    );

    const handlePopoverClick = (type: 'assignee' | 'priority' | 'estimate', ref: React.RefObject<HTMLButtonElement | null>) => {
        if (ref.current) {
            onOpenPopover(type, ref.current.getBoundingClientRect());
        }
    };

    const handleDateChange = (newDateStr: string) => {
        if (newDateStr) {
            const dateVal = new Date(newDateStr);
            updateTask(task.id, { 
                dueDate: dateVal.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) 
            });
        } else {
            updateTask(task.id, { dueDate: undefined });
        }
    };

    const handleClientChange = (newClientId: string) => {
        const client = clients.find((c: any) => c.id === newClientId);
        const oldTags = task.tags.filter((t) => !clients.some((c: any) => c.companyName === t));
        updateTask(task.id, { 
            clientId: newClientId,
            tags: client ? [...oldTags, client.companyName] : oldTags
        });
    };

    // Shared Button Class for absolute uniformity
    const BUTTON_CLASS = `w-full h-11 flex items-center justify-between px-3.5 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl text-sm font-medium transition-all outline-none duration-200 group cursor-pointer`;
    const ACTIVE_CLASS = `bg-white border-gray-200 ring-2 ring-black/5 shadow-sm`;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-7 gap-x-5">
            
            {/* 1. Status */}
            <div>
                <RenderLabel icon={<Activity size={12} />} label="סטטוס" />
                <CustomSelect 
                    value={task.status}
                    onChange={(val) => updateTask(task.id, { status: val })}
                    options={workflowStages.map((s: any) => ({ 
                        value: s.id, 
                        label: s.name, 
                        icon: <div className={`w-2 h-2 rounded-full ${getStatusSolidColor(s.color)}`} /> 
                    }))}
                />
            </div>

            {/* 2. Priority */}
            <div>
                <RenderLabel icon={<AlertTriangle size={12} />} label="דחיפות" />
                <div className="relative">
                        <button 
                            ref={priorityButtonRef}
                            onClick={() => handlePopoverClick('priority', priorityButtonRef)}
                            className={`${BUTTON_CLASS} ${activePopover === 'priority' ? ACTIVE_CLASS : ''}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 rounded-full ${getPrioritySolidColor(task.priority)}`}></span>
                                <span className="text-gray-900 font-bold">{PRIORITY_LABELS[task.priority]}</span>
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${activePopover === 'priority' ? 'rotate-180 text-black' : 'group-hover:text-gray-600'}`} />
                        </button>
                </div>
            </div>

            {/* 3. Assignee */}
            <div>
                <RenderLabel icon={<UserIcon size={12} />} label="אחראי" />
                <div className="relative">
                    <button 
                        ref={assigneeButtonRef}
                        onClick={() => handlePopoverClick('assignee', assigneeButtonRef)}
                        className={`${BUTTON_CLASS} ${activePopover === 'assignee' ? ACTIVE_CLASS : ''}`}
                    >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            {assignedUsers.length > 0 ? (
                                <>
                                    <div className="flex -space-x-2 space-x-reverse shrink-0">
                                        {assignedUsers.slice(0,2).map((u: any) => (
                                            <img key={u.id} src={u.avatar} className="w-5 h-5 rounded-full border border-white shadow-sm" />
                                        ))}
                                    </div>
                                    <span className="text-gray-900 font-bold truncate">
                                        {assignedUsers[0].name.split(' ')[0]} 
                                        {assignedUsers.length > 1 && ` +${assignedUsers.length - 1}`}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <UserIcon size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    <span className="text-gray-400 font-medium">ללא שיוך</span>
                                </>
                            )}
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${activePopover === 'assignee' ? 'rotate-180 text-black' : 'group-hover:text-gray-600'}`} />
                    </button>
                </div>
            </div>

            {/* 4. Date & Time */}
            <div className="col-span-1 lg:col-span-1">
                <RenderLabel icon={<Calendar size={12} />} label="מועד יעד" />
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <CustomDatePicker 
                            value={task.dueDate ? new Date().toISOString().split('T')[0] : ''} 
                            onChange={handleDateChange}
                            placeholder={task.dueDate || "תאריך"}
                        />
                    </div>
                    <div className="w-24 shrink-0">
                        <CustomTimePicker 
                            value={task.dueTime || ''}
                            onChange={(val) => updateTask(task.id, { dueTime: val })}
                            placeholder="שעה"
                        />
                    </div>
                </div>
            </div>

            {/* 5. Client */}
            <div className="col-span-1 lg:col-span-1">
                <RenderLabel icon={<Briefcase size={12} />} label="לקוח / פרויקט" />
                <CustomSelect 
                    value={task.clientId || ''}
                    onChange={handleClientChange}
                    options={[
                        { value: '', label: 'פנימי / ללא' },
                        ...clients.map((c: any) => ({ value: c.id, label: c.companyName }))
                    ]}
                    icon={<Briefcase size={16} />}
                    placeholder="שיוך לקוח"
                />
            </div>

            {/* 6. Estimate & Actual */}
            <div className="col-span-2 lg:col-span-1 flex gap-2">
                <div className="flex-1 relative">
                    <RenderLabel icon={<Timer size={12} />} label="הערכה" />
                    <button
                        ref={estimateButtonRef}
                        onClick={() => handlePopoverClick('estimate', estimateButtonRef)}
                        className={`${BUTTON_CLASS} ${activePopover === 'estimate' ? ACTIVE_CLASS : ''}`}
                    >
                        <span className={`font-bold ${task.estimatedTime ? 'text-gray-900' : 'text-gray-400 font-medium'}`}>
                            {task.estimatedTime ? `${Math.floor(task.estimatedTime / 60)}:${(task.estimatedTime % 60).toString().padStart(2, '0')}` : '--:--'}
                        </span>
                        <Edit2 size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>
                </div>

                <div className="flex-1 relative opacity-70 hover:opacity-100 transition-opacity">
                    <RenderLabel icon={<Clock size={12} />} label="בפועל" />
                    <div className={`${BUTTON_CLASS} cursor-default hover:bg-gray-50`}>
                        <span className="font-mono font-bold text-gray-900">{formatTime(task.timeSpent || 0)}</span>
                        <Info size={14} className="text-gray-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};
