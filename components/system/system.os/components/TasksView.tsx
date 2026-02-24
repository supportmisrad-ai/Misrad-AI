
import React, { useState, useRef } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { 
    SquareCheck, Plus, Calendar, Flag, User, MoreHorizontal, 
    List, Kanban, Filter, Search, Clock, CircleCheckBig, Circle, BookOpen, Phone, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

interface TasksViewProps {
    tasks?: Task[];
    onUpdateTask?: (task: Task) => void;
    onAddTask?: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'לביצוע', color: 'bg-slate-500' },
    { id: 'in_progress', label: 'עובד על זה', color: 'bg-indigo-500' },
    { id: 'review', label: 'ממתין לתשובה', color: 'bg-amber-500' },
    { id: 'done', label: 'בוצע / נסגר', color: 'bg-emerald-500' }
];

const getPriorityStyle = (p: TaskPriority) => {
    switch(p) {
        case 'critical': return 'text-red-700 bg-red-50 border-red-100';
        case 'high': return 'text-orange-700 bg-orange-50 border-orange-100';
        case 'medium': return 'text-blue-700 bg-blue-50 border-blue-100';
        default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
};

const getPriorityLabel = (p: TaskPriority) => {
    switch(p) {
        case 'critical': return 'דחוף אש';
        case 'high': return 'גבוה';
        case 'medium': return 'רגיל';
        default: return 'נמוך';
    }
};

interface TaskCardProps {
    task: Task;
    onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
    currentUserId?: string;
    currentUserName?: string;
}

function getAssigneeInitials(name: string | undefined, id: string): string {
    if (name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }
    return id.slice(0, 2).toUpperCase();
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, currentUserId, currentUserName }) => {
    const isSOP = task.tags.includes('SOP');
    const isCall = task.tags.includes('Call') || task.title.includes('Call') || task.title.includes('שיחה');
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside<HTMLDivElement>(menuRef, () => setIsMenuOpen(false));

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a slight delay to the styling so the drag image looks original
        setTimeout(() => {
            (e.target as HTMLElement).style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).style.opacity = '1';
    };

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all group animate-fade-in relative overflow-visible cursor-grab active:cursor-grabbing ${isSOP ? 'ring-1 ring-indigo-100 border-indigo-200' : 'border-slate-200'}`}
        >
            
            {/* Context Line */}
            {isSOP && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500 rounded-l-2xl"></div>}
            {isCall && !isSOP && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl"></div>}

            <div className="flex justify-between items-start mb-2 pl-1 relative">
                <div className="flex gap-1 flex-wrap">
                    {task.tags.map(tag => (
                        <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tag === 'SOP' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                            {tag === 'SOP' && <BookOpen size={10} className="inline ml-1" />}
                            {tag === 'Call' ? 'שיחה' : tag === 'Follow Up' ? 'פולואפ' : tag}
                        </span>
                    ))}
                </div>
                
                {/* Mobile Friendly Menu Button */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                        className={`text-slate-300 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 ${isMenuOpen ? 'text-slate-600 bg-slate-50' : 'md:opacity-0 md:group-hover:opacity-100'}`}
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {/* Status Dropdown */}
                    {isMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 animate-scale-in origin-top-left">
                            <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider mb-1">העבר לסטטוס</div>
                            {COLUMNS.filter(c => c.id !== task.status).map(col => (
                                <button
                                    key={col.id}
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, col.id); setIsMenuOpen(false); }}
                                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center justify-between transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                                        {col.label}
                                    </div>
                                    <ArrowRight size={12} className="text-slate-300" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <h4 className="font-bold text-slate-800 text-sm mb-3 leading-snug pl-2 group-hover:text-primary transition-colors">{task.title}</h4>

            <div className="flex items-center justify-between border-t border-slate-50 pt-3 pl-2">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200" title={task.assigneeId === currentUserId ? (currentUserName || 'אני') : 'משתמש'}>
                        {task.assigneeId === currentUserId ? getAssigneeInitials(currentUserName, task.assigneeId) : <User size={12} />}
                    </div>
                    {task.dueDate && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${
                            new Date() > task.dueDate && task.status !== 'done' ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded' : 'text-slate-400'
                        }`}>
                            <Calendar size={12} />
                            {task.dueDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}
                        </div>
                    )}
                </div>
                
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPriorityStyle(task.priority)}`}>
                    <Flag size={10} fill="currentColor" />
                    <span>{getPriorityLabel(task.priority)}</span>
                </div>
            </div>
        </div>
    );
};

const TasksView: React.FC<TasksViewProps> = ({ tasks = [], onUpdateTask, onAddTask }) => {
    const { addToast } = useToast();
    const { user } = useAuth();
    const [view, setView] = useState<'board' | 'list'>('board');
    const [activeDropCol, setActiveDropCol] = useState<TaskStatus | null>(null);

    // Agent Filtering: Only see tasks assigned to them
    const isAgent = user?.role === 'agent';
    const filteredTasks = isAgent 
        ? tasks.filter(t => t.assigneeId === user.id)
        : tasks;

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        if (onUpdateTask) {
            const task = tasks.find(t => t.id === taskId);
            if (task) onUpdateTask({ ...task, status: newStatus });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            handleStatusChange(taskId, status);
        }
        setActiveDropCol(null);
    };

    const handleDragEnter = (status: TaskStatus) => {
        setActiveDropCol(status);
    };

    const handleDragLeave = () => {
        setActiveDropCol(null);
    };

    const handleNewTask = () => {
        if (onAddTask) {
            const newTask: Task = {
                id: `new_task_${Date.now()}`,
                title: isAgent ? 'שיחת מעקב חדשה' : 'משימה חדשה', 
                description: '',
                assigneeId: user?.id || 'current', 
                dueDate: new Date(),
                priority: 'medium',
                status: 'todo',
                tags: isAgent ? ['Follow Up'] : ['כללי'] 
            };
            onAddTask(newTask);
        } else {
            addToast('מודל הוספת משימה נפתח', 'info');
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <SquareCheck className="text-slate-700" strokeWidth={2} />
                        {isAgent ? 'המשימות שלי' : 'ניהול משימות'}
                    </h2>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200/50 shadow-inner">
                        <button 
                            onClick={() => setView('board')}
                            className={`p-2 rounded-lg transition-all ${view === 'board' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Kanban size={18} />
                        </button>
                        <button 
                            onClick={() => setView('list')}
                            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <button 
                        onClick={handleNewTask}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-black transition-all flex items-center gap-2 flex-1 md:flex-none justify-center text-sm"
                    >
                        {isAgent ? <Phone size={18} /> : <Plus size={18} />}
                        {isAgent ? 'תזכורת לשיחה' : 'משימה חדשה'}
                    </button>
                </div>
            </div>

            {/* Content */}
            {view === 'board' ? (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex gap-6 h-full min-w-[1200px] md:min-w-max">
                        {COLUMNS.map(col => {
                            const colTasks = filteredTasks.filter(t => t.status === col.id);
                            const isDropTarget = activeDropCol === col.id;
                            
                            return (
                                <div 
                                    key={col.id} 
                                    className={`flex-1 min-w-[280px] flex flex-col h-full rounded-3xl transition-all duration-200 border ${
                                        isDropTarget 
                                        ? 'bg-indigo-50/50 border-indigo-400 shadow-inner' 
                                        : 'bg-slate-50/50 border-slate-200/60'
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                    onDragEnter={() => handleDragEnter(col.id)}
                                    onDragLeave={handleDragLeave}
                                >
                                    <div className="p-4 flex justify-between items-center border-b border-slate-100/50 sticky top-0 bg-slate-50/90 backdrop-blur-sm rounded-t-3xl z-10">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                                            <h3 className="font-bold text-slate-700 text-sm">{col.label}</h3>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                            {colTasks.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                                        {colTasks.map(task => (
                                            <TaskCard 
                                                key={task.id} 
                                                task={task} 
                                                onStatusChange={handleStatusChange}
                                                currentUserId={user?.id}
                                                currentUserName={user?.name}
                                            />
                                        ))}
                                        {colTasks.length === 0 && (
                                            <div className="text-center py-10 opacity-40">
                                                <div className="text-xs font-bold text-slate-400">אין משימות</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="ui-card overflow-hidden flex-1 flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-5">משימה</div>
                        <div className="col-span-2">אחראי</div>
                        <div className="col-span-2">תאריך יעד</div>
                        <div className="col-span-2">עדיפות</div>
                        <div className="col-span-1"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredTasks.map(task => (
                            <div key={task.id} className={`grid grid-cols-12 gap-4 p-4 border-b border-slate-50 items-center hover:bg-slate-50 transition-colors group ${task.tags.includes('SOP') ? 'bg-indigo-50/30' : ''}`}>
                                <div className="col-span-5 flex items-center gap-3">
                                    <button 
                                        onClick={() => handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
                                        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                            task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400'
                                        }`}
                                    >
                                        <CircleCheckBig size={14} />
                                    </button>
                                    <div className="min-w-0">
                                        <div className={`font-bold text-sm text-slate-700 flex items-center gap-2 truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
                                            {task.title}
                                            {task.tags.includes('SOP') && <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 rounded font-bold border border-indigo-200 shrink-0">נוהל</span>}
                                        </div>
                                        <div className="flex gap-1 mt-1">
                                            {task.tags.map(tag => (
                                                <span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                                                    {tag === 'Call' ? 'שיחה' : tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200">
                                        {task.assigneeId === user?.id ? getAssigneeInitials(user?.name, task.assigneeId) : <User size={12} />}
                                    </div>
                                    <span className="text-xs text-slate-600 font-bold">
                                        {task.assigneeId === user?.id ? (user?.name || 'אני') : 'משתמש'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-xs font-mono text-slate-500 font-bold">
                                    {task.dueDate.toLocaleDateString('he-IL')}
                                </div>
                                <div className="col-span-2">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border inline-flex items-center gap-1 ${getPriorityStyle(task.priority)}`}>
                                        <Flag size={10} fill="currentColor" /> {getPriorityLabel(task.priority)}
                                    </span>
                                </div>
                                <div className="col-span-1 text-right">
                                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors border border-transparent hover:border-slate-200">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksView;
