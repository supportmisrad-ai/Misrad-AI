
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Hash, User as UserIcon, Calendar, Flag, ArrowUpRight, ChevronDown, Clock, Tag, Briefcase, Activity, AlertTriangle, AlignLeft, Timer } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Client, Priority, Status, Task, User, WorkflowStage } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../constants';
import { CustomDatePicker } from './CustomDatePicker';
import { CustomTimePicker } from './CustomTimePicker';

interface CreateTaskModalProps {
    onClose: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose }) => {
    const { addTask, users, clients, createTaskDefaults, tasks, workflowStages, currentUser, hasPermission } = useData();
    
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [status, setStatus] = useState<string>(Status.TODO);
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [clientId, setClientId] = useState<string>('');
    const [tag, setTag] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [manualHours, setManualHours] = useState('');
    const [manualMinutes, setManualMinutes] = useState('');
    
    // Tag Suggestions State
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [tagInputRect, setTagInputRect] = useState<DOMRect | null>(null);
    
    // UI State for Popovers
    const [activePopover, setActivePopover] = useState<'none' | 'assignee' | 'priority' | 'client' | 'status' | 'estimate'>('none');
    
    const [isShaking, setIsShaking] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);
    const tagDropdownRef = useRef<HTMLDivElement>(null);

    // --- HIERARCHY LOGIC FOR ASSIGNEES ---
    const isGlobalAdmin = currentUser.isSuperAdmin || currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין';
    const isManager = hasPermission('manage_team');
    
    const availableUsers = users.filter((u: User) => {
        if (isGlobalAdmin) return true; // CEO sees everyone
        if (isManager) return u.department === currentUser.department; // Manager sees dept
        return u.id === currentUser.id; // Employee sees self
    });

    // Get unique existing tags from all tasks
    const existingTags = Array.from(new Set(tasks.flatMap((t: any) => t.tags))) as string[];
    const filteredTags = existingTags.filter((t: any) => t.toLowerCase().includes(tag.toLowerCase()) && t !== tag);

    // Logic for Approval Requirement (e.g., tasks > 4 hours)
    const estimateHoursNum = Number(manualHours) || 0;
    const requiresApproval = estimateHoursNum >= 4;

    // Helper for solid priority color
    const getPrioritySolidColor = (p: Priority) => {
        switch(p) {
            case Priority.URGENT: return 'bg-red-600';
            case Priority.HIGH: return 'bg-orange-600';
            case Priority.MEDIUM: return 'bg-amber-500';
            case Priority.LOW: return 'bg-slate-500';
            default: return 'bg-gray-500';
        }
    };

    // Helper for solid status color
    const getStatusSolidColor = (colorClass: string) => {
        // Simple heuristic to grab the text-color or similar and make it bg
        if (colorClass.includes('green')) return 'bg-green-600';
        if (colorClass.includes('blue')) return 'bg-blue-600';
        if (colorClass.includes('orange')) return 'bg-orange-600';
        if (colorClass.includes('red')) return 'bg-red-600';
        return 'bg-gray-600';
    };

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            
            if (target.closest('.property-popover')) return;

            const clickedTrigger = target.closest('.property-trigger');
            if (clickedTrigger) {
                return;
            }

            // Handle Tag Dropdown click outside
            if (
                showTagSuggestions && 
                tagDropdownRef.current && 
                !tagDropdownRef.current.contains(target) &&
                tagInputRef.current &&
                !tagInputRef.current.contains(target)
            ) {
                setShowTagSuggestions(false);
            }

            if (activePopover !== 'none') {
                setActivePopover('none');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        const handleScroll = () => { if (showTagSuggestions) updateTagRect(); };
        window.addEventListener('scroll', handleScroll, true);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [showTagSuggestions, activePopover]);

    const updateTagRect = () => {
        if (tagInputRef.current) {
            setTagInputRect(tagInputRef.current.getBoundingClientRect());
        }
    };

    // Pre-fill data
    useEffect(() => {
        if (createTaskDefaults) {
            if (createTaskDefaults.title) setTitle(createTaskDefaults.title);
            if (createTaskDefaults.description) setDescription(createTaskDefaults.description);
            if (createTaskDefaults.priority) setPriority(createTaskDefaults.priority);
            if (createTaskDefaults.assigneeId) setAssigneeId(createTaskDefaults.assigneeId);
            if (createTaskDefaults.clientId) setClientId(createTaskDefaults.clientId);
            if (createTaskDefaults.tags && createTaskDefaults.tags.length > 0) setTag(createTaskDefaults.tags[0]);
            // FIX: Respect the status passed from the view context
            if (createTaskDefaults.status) setStatus(createTaskDefaults.status);
            if (createTaskDefaults.dueDate) setDueDate(createTaskDefaults.dueDate);
        }
    }, [createTaskDefaults]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                handleSubmit(e as any);
            }
            if (e.key === 'Escape') {
                if (activePopover !== 'none') setActivePopover('none');
                else if (showTagSuggestions) setShowTagSuggestions(false);
                else onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [title, description, priority, assigneeId, tag, dueDate, dueTime, activePopover, clientId, showTagSuggestions]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setIsShaking(true);
            titleInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const tags = tag ? [tag] : ['כללי'];
        
        if (clientId) {
            const client = clients.find((c: Client) => c.id === clientId);
            if (client && !tags.includes(client.companyName)) {
                tags.push(client.companyName);
            }
        }

        const estimatedMinutes = (Number(manualHours) * 60) + Number(manualMinutes);
        const displayDueDate = dueDate ? new Date(dueDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) : '';

        let approvalStatus: Task['approvalStatus'] = undefined;
        let messages = [];
        
        const isManagerRole = currentUser.role.includes('מנכ') || currentUser.role.includes('סמנכ');
        
        if (estimatedMinutes >= 240 && !isManagerRole) {
            approvalStatus = 'pending';
            tags.push('Requires Approval');
            messages.push({
                id: `sys-${Date.now()}`,
                text: '⚠️ משימה זו חורגת מ-4 שעות ודורשת אישור מנהל לפני תחילת עבודה.',
                senderId: 'system',
                createdAt: new Date().toLocaleTimeString(),
                type: 'system' as const
            });
        }

        const newTask: Task = {
            id: `TSK-${Date.now()}`,
            title,
            description,
            status: status || Status.TODO,
            priority,
            assigneeIds: assigneeId ? [assigneeId] : [],
            clientId: clientId || undefined,
            tags,
            createdAt: new Date().toISOString(),
            dueDate: displayDueDate,
            dueTime: dueTime || undefined,
            timeSpent: 0,
            estimatedTime: estimatedMinutes > 0 ? estimatedMinutes : undefined,
            approvalStatus,
            isTimerRunning: false,
            messages,
            creatorId: currentUser.id,
            department: currentUser.department // Stamp task with department
        };

        addTask(newTask);
        onClose();
    };

    const selectedAssignee = users.find((u: User) => u.id === assigneeId);
    const selectedClient = clients.find((c: Client) => c.id === clientId);
    const selectedStatus = workflowStages.find((s: WorkflowStage) => s.id === status);

    return (
        <>
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col relative overflow-hidden"
                style={{ maxHeight: '85vh' }}
            >
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between bg-white z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                            <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-200"></span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-none">משימה חדשה</h2>
                            <p className="text-xs text-gray-400 font-medium mt-1">הקם משימה והתחל לעבוד</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-4 custom-scrollbar"> 
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <input 
                                ref={titleInputRef}
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setIsShaking(false); }}
                                placeholder="מה המשימה?"
                                className={`w-full text-4xl font-black placeholder:text-gray-200 border-none outline-none bg-transparent leading-tight tracking-tight rounded-xl transition-all ${isShaking ? 'text-red-600 animate-shake placeholder:text-red-200' : 'text-gray-900'}`}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1.5 opacity-30">
                                <AlignLeft size={20} />
                            </div>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="הוסף פרטים, קישורים או הערות..."
                                className="w-full min-h-[120px] text-lg text-gray-600 placeholder:text-gray-300 border-none outline-none resize-none bg-transparent leading-relaxed"
                            />
                        </div>

                        <div className="flex items-center gap-3 pl-8">
                            <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg">
                                <Hash size={16} />
                                <input 
                                    ref={tagInputRef}
                                    type="text"
                                    value={tag}
                                    onChange={(e) => { 
                                        setTag(e.target.value); 
                                        setShowTagSuggestions(true); 
                                        updateTagRect();
                                    }}
                                    onFocus={() => { 
                                        setShowTagSuggestions(true); 
                                        updateTagRect(); 
                                    }}
                                    placeholder="תגית..."
                                    className="text-sm font-bold bg-transparent border-none outline-none placeholder:text-blue-300 text-blue-700 w-24"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Toolbar */}
                <div className="px-8 py-5 bg-[#fafafa] border-t border-gray-100 flex flex-col gap-4 relative z-20 shrink-0">
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Pill */}
                        <div className="relative">
                            <button 
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'status' ? 'none' : 'status')}
                                className={`property-trigger h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                                    activePopover === 'status'
                                    ? 'bg-white border-blue-300 text-blue-700 shadow-md ring-2 ring-blue-100'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                                <Activity size={16} className="text-gray-400" />
                                {selectedStatus ? selectedStatus.name : status}
                                <ChevronDown size={14} className="opacity-30 mr-1" />
                            </button>
                            <AnimatePresence>
                                {activePopover === 'status' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="property-popover absolute bottom-full right-0 mb-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-2"
                                    >
                                        <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">סטטוס התחלתי</div>
                                        <div className="space-y-1">
                                            {workflowStages.map((s: WorkflowStage) => (
                                                <button 
                                                    key={s.id}
                                                    onClick={() => { setStatus(s.id); setActivePopover('none'); }}
                                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-colors ${status === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusSolidColor(s.color)}`}></div>
                                                    {s.name}
                                                    {status === s.id && <Check size={14} className="mr-auto text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-6 bg-gray-200 mx-1"></div>

                        {/* Assignee Pill */}
                        <div className="relative">
                            <button 
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'assignee' ? 'none' : 'assignee')}
                                className={`property-trigger h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                                    activePopover === 'assignee' || assigneeId 
                                    ? 'bg-white border-blue-300 text-blue-700 shadow-md ring-2 ring-blue-100'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                                {selectedAssignee ? (
                                    <>
                                        <img src={selectedAssignee.avatar} className="w-5 h-5 rounded-full border border-gray-100" />
                                        {selectedAssignee.name}
                                    </>
                                ) : (
                                    <>
                                        <UserIcon size={16} className="text-gray-400" /> למי לשייך?
                                    </>
                                )}
                            </button>
                            
                            <AnimatePresence>
                                {activePopover === 'assignee' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="property-popover absolute bottom-full right-0 mb-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        <div className="p-3 bg-gray-50 border-b border-gray-100">
                                            <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-400" placeholder="חפש עובד..." autoFocus />
                                        </div>
                                        <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                            <button 
                                                onClick={() => { setAssigneeId(''); setActivePopover('none'); }}
                                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-gray-500 text-xs font-medium"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={14} /></div>
                                                ללא שיוך
                                            </button>
                                            {availableUsers.map((u: User) => (
                                                <button 
                                                    key={u.id}
                                                    onClick={() => { setAssigneeId(u.id); setActivePopover('none'); }}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${assigneeId === u.id ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}
                                                >
                                                    <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-100" />
                                                    <div className="text-right flex-1">
                                                        <div className="font-bold text-xs">{u.name}</div>
                                                        <div className="text-[10px] opacity-70">{u.role}</div>
                                                    </div>
                                                    {assigneeId === u.id && <Check size={14} className="text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Client Pill */}
                        <div className="relative">
                            <button 
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'client' ? 'none' : 'client')}
                                className={`property-trigger h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                                    activePopover === 'client' || clientId 
                                    ? 'bg-white border-purple-300 text-purple-700 shadow-md ring-2 ring-purple-100'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                                <Briefcase size={16} className={clientId ? 'text-purple-500' : 'text-gray-400'} />
                                {selectedClient ? selectedClient.companyName : 'לקוח'}
                            </button>
                            
                            <AnimatePresence>
                                {activePopover === 'client' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="property-popover absolute bottom-full right-0 mb-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                                    >
                                        <div className="p-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">שיוך ללקוח</div>
                                        <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                            <button 
                                                onClick={() => { setClientId(''); setActivePopover('none'); }}
                                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-gray-500 text-xs font-medium"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={14} /></div>
                                                ללא לקוח (פנימי)
                                            </button>
                                            {clients.map((c: Client) => (
                                                <button 
                                                    key={c.id}
                                                    onClick={() => { setClientId(c.id); setActivePopover('none'); }}
                                                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50 transition-colors"
                                                >
                                                    <img src={c.avatar} className="w-8 h-8 rounded-lg border border-gray-100" />
                                                    <span className={`text-xs font-bold truncate ${clientId === c.id ? 'text-purple-700' : 'text-gray-700'}`}>{c.companyName}</span>
                                                    {clientId === c.id && <Check size={14} className="mr-auto text-purple-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Priority Pill */}
                        <div className="relative">
                            <button 
                                type="button"
                                onClick={() => setActivePopover(activePopover === 'priority' ? 'none' : 'priority')}
                                className={`property-trigger h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                                    activePopover === 'priority' || priority !== Priority.MEDIUM
                                    ? `bg-white shadow-md ${PRIORITY_COLORS[priority].replace('bg-', 'border-').replace('text-white', 'text-gray-900')}`
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
                                }`}
                            >
                                <Flag size={16} className={priority === Priority.URGENT ? 'text-red-500' : 'text-gray-400'} />
                                {PRIORITY_LABELS[priority]}
                            </button>

                            <AnimatePresence>
                                {activePopover === 'priority' && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="property-popover absolute bottom-full right-0 mb-3 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-2"
                                    >
                                        <div className="space-y-1">
                                            {Object.values(Priority).map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => { setPriority(p); setActivePopover('none'); }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                                        priority === p ? 'bg-gray-100' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full ${getPrioritySolidColor(p)}`}></div>
                                                    {PRIORITY_LABELS[p]}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center justify-between w-full border-t border-gray-100 pt-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Date Picker Chip */}
                            <div className="w-32 h-10">
                                <CustomDatePicker 
                                    value={dueDate}
                                    onChange={setDueDate}
                                    placeholder="תאריך יעד"
                                    className="property-trigger"
                                />
                            </div>

                            {/* Custom Time Picker */}
                            <div className="w-24 h-10">
                                <CustomTimePicker 
                                    value={dueTime}
                                    onChange={setDueTime}
                                    placeholder="שעה"
                                    className="property-trigger"
                                />
                            </div>

                            {/* Estimate Time (Optional) */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setActivePopover(activePopover === 'estimate' ? 'none' : 'estimate')}
                                    className={`property-trigger h-10 flex items-center gap-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                                        activePopover === 'estimate' || manualHours || manualMinutes
                                        ? 'bg-white border-green-300 text-green-700 shadow-md ring-2 ring-green-100'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
                                    }`}
                                >
                                    <Timer size={16} className="text-gray-400" /> 
                                    {manualHours || manualMinutes ? `${manualHours || 0} שע׳ ${manualMinutes || 0} דק׳` : 'הערכה'}
                                </button>

                                <AnimatePresence>
                                    {activePopover === 'estimate' && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="property-popover absolute bottom-full left-0 mb-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-6"
                                        >
                                            <div className="flex items-center gap-2 text-gray-500 mb-4 border-b border-gray-100 pb-2">
                                                <Timer size={18} />
                                                <span className="font-bold text-sm">הערכת זמן לביצוע</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="flex-1 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={manualHours}
                                                        onChange={(e) => setManualHours(e.target.value)}
                                                        className="w-full p-3 text-center bg-gray-50 border border-gray-200 rounded-xl outline-none text-2xl font-bold text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                                                        min="0"
                                                        placeholder="0"
                                                    />
                                                    <span className="text-xs font-bold text-gray-400 mt-1 block uppercase">שעות</span>
                                                </div>
                                                <span className="text-2xl font-bold text-gray-300 -mt-4">:</span>
                                                <div className="flex-1 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={manualMinutes}
                                                        onChange={(e) => setManualMinutes(e.target.value)}
                                                        className="w-full p-3 text-center bg-gray-50 border border-gray-200 rounded-xl outline-none text-2xl font-bold text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                                                        min="0"
                                                        max="59"
                                                        placeholder="00"
                                                    />
                                                    <span className="text-xs font-bold text-gray-400 mt-1 block uppercase">דקות</span>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => setActivePopover('none')} 
                                                className="w-full py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors"
                                            >
                                                אישור
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            className={`px-8 h-12 rounded-xl text-sm font-bold shadow-lg shadow-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transform active:scale-95 ${
                                requiresApproval ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-black hover:bg-gray-800 text-white'
                            }`}
                        >
                            {requiresApproval ? 'שלח לאישור' : 'צור משימה'} {requiresApproval ? <AlertTriangle size={18} /> : <ArrowUpRight size={18} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Portal for Tag Suggestions */}
        {showTagSuggestions && filteredTags.length > 0 && tagInputRect && createPortal(
            <motion.div 
                ref={tagDropdownRef}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                style={{
                    position: 'fixed',
                    top: tagInputRect.bottom + 8,
                    right: window.innerWidth - tagInputRect.right,
                    zIndex: 9999,
                    width: '200px'
                }}
                className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
            >
                <div className="px-3 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    הצעות
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredTags.map(t => (
                        <button 
                            type="button"
                            key={t}
                            onClick={() => { setTag(t); setShowTagSuggestions(false); }}
                            className="w-full text-right px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors block flex items-center gap-2"
                        >
                            <Hash size={12} className="opacity-50" /> {t}
                        </button>
                    ))}
                </div>
            </motion.div>,
            document.body
        )}
        </>
    );
};
