
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Priority } from '../types';
import { useData } from '../context/DataContext';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../constants';
import { Timer, Check, X, Search } from 'lucide-react';

interface TaskDetailPopoversProps {
    task: Task;
    activePopover: 'none' | 'assignee' | 'priority' | 'estimate';
    popoverCoords: { top: number; left?: number; right?: number; width?: number } | null;
    onClose: () => void;
}

export const TaskDetailPopovers: React.FC<TaskDetailPopoversProps> = ({ task, activePopover, popoverCoords, onClose }) => {
    const { updateTask, users, currentUser, hasPermission } = useData();
    const [manualHours, setManualHours] = useState(0);
    const [manualMinutes, setManualMinutes] = useState(0);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    // --- HIERARCHY LOGIC FOR ASSIGNEES ---
    const isGlobalAdmin = currentUser.isSuperAdmin || currentUser.role === 'מנכ״ל' || currentUser.role === 'אדמין';
    const isManager = hasPermission('manage_team');
    
    const availableUsers = users.filter((u) => {
        if (isGlobalAdmin) return true; 
        if (isManager) return u.department === currentUser.department; 
        return u.id === currentUser.id; 
    });

    const assignedUsers = availableUsers.filter((u) => 
        (task.assigneeIds && task.assigneeIds.includes(u.id)) || 
        (task.assigneeId === u.id)
    );

    const filteredUsers = availableUsers.filter((u) => 
        u.name.toLowerCase().includes(assigneeSearch.toLowerCase())
    );

    useEffect(() => {
        // Init time edit values
        const estMinutes = task.estimatedTime || 0;
        setManualHours(Math.floor(estMinutes / 60));
        setManualMinutes(estMinutes % 60);
        setAssigneeSearch('');
    }, [task.estimatedTime, activePopover]);

    const toggleAssignee = (userId: string) => {
        const currentIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
        let newIds: string[];
        
        if (currentIds.includes(userId)) {
            newIds = currentIds.filter(id => id !== userId);
        } else {
            newIds = [...currentIds, userId];
        }
        
        updateTask(task.id, { 
            assigneeIds: newIds, 
            assigneeId: newIds.length > 0 ? newIds[0] : undefined 
        });
    };

    const saveManualTime = () => {
        const totalMinutes = (Number(manualHours) * 60) + Number(manualMinutes);
        updateTask(task.id, { estimatedTime: totalMinutes });
        onClose();
    };

    // Helper for solid contrast dots
    const getSolidColor = (p: Priority) => {
        switch(p) {
            case Priority.URGENT: return 'bg-red-600';
            case Priority.HIGH: return 'bg-orange-600';
            case Priority.MEDIUM: return 'bg-amber-500';
            case Priority.LOW: return 'bg-slate-500';
            default: return 'bg-gray-500';
        }
    };

    if (!popoverCoords) return null;

    return createPortal(
        <AnimatePresence>
            {/* 1. Estimate Time Popover */}
            {activePopover === 'estimate' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    style={{ 
                        position: 'fixed', 
                        top: popoverCoords.top, 
                        left: popoverCoords.left, 
                        zIndex: 9999 
                    }}
                    className="property-popover w-64 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 overflow-hidden origin-top-left"
                >
                    <div className="flex items-center gap-2 text-gray-900 mb-4 pb-2 border-b border-gray-50">
                        <div className="p-1.5 bg-gray-50 rounded-lg"><Timer size={14} className="text-gray-500" /></div>
                        <span className="font-bold text-xs">הערכת זמן</span>
                    </div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1">
                            <input 
                                type="number" 
                                value={manualHours}
                                onChange={(e) => setManualHours(Number(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full p-2.5 text-center bg-gray-50 border border-gray-200 rounded-xl outline-none text-2xl font-bold text-gray-900 focus:border-black focus:bg-white transition-all"
                                min="0"
                            />
                            <span className="text-[10px] text-center block text-gray-400 mt-1 font-bold">שעות</span>
                        </div>
                        <span className="text-2xl font-black text-gray-200 -mt-4">:</span>
                        <div className="flex-1">
                            <input 
                                type="number" 
                                value={manualMinutes}
                                onChange={(e) => setManualMinutes(Number(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full p-2.5 text-center bg-gray-50 border border-gray-200 rounded-xl outline-none text-2xl font-bold text-gray-900 focus:border-black focus:bg-white transition-all"
                                min="0"
                                max="59"
                            />
                            <span className="text-[10px] text-center block text-gray-400 mt-1 font-bold">דקות</span>
                        </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); saveManualTime(); }} className="w-full py-2.5 bg-black text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors shadow-lg active:scale-95 transform">שמור הערכה</button>
                </motion.div>
            )}

            {/* 2. Assignee Popover */}
            {activePopover === 'assignee' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    style={{ 
                        position: 'fixed', 
                        top: popoverCoords.top, 
                        right: popoverCoords.right, 
                        width: popoverCoords.width,
                        zIndex: 9999 
                    }}
                    className="property-popover bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden min-w-[260px] origin-top-right flex flex-col"
                >
                    <div className="p-3 border-b border-gray-50 sticky top-0 bg-white z-10">
                        <div className="relative">
                            <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                            <input 
                                value={assigneeSearch}
                                onChange={e => setAssigneeSearch(e.target.value)}
                                className="w-full bg-gray-50 border border-transparent focus:border-gray-200 focus:bg-white rounded-xl pr-9 pl-3 py-2 text-xs outline-none transition-all font-medium" 
                                placeholder="חפש עובד..." 
                                autoFocus 
                                onClick={(e) => e.stopPropagation()} 
                            />
                        </div>
                    </div>
                    <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredUsers.map((u) => {
                            const isAssigned = assignedUsers.some((au) => au.id === u.id);
                            return (
                                <button 
                                    key={u.id}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        toggleAssignee(u.id); 
                                    }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all group ${
                                        isAssigned ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    <img src={u.avatar} className={`w-8 h-8 rounded-full object-cover border ${isAssigned ? 'border-white/20' : 'border-gray-100'}`} />
                                    <div className="text-right flex-1 min-w-0">
                                        <div className="text-xs font-bold truncate">{u.name}</div>
                                        <div className={`text-[10px] truncate ${isAssigned ? 'text-gray-400' : 'text-gray-400'}`}>{u.role}</div>
                                    </div>
                                    {isAssigned && <Check size={14} className="text-white shrink-0" strokeWidth={3} />}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* 3. Priority Popover */}
            {activePopover === 'priority' && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    style={{ 
                        position: 'fixed', 
                        top: popoverCoords.top, 
                        right: popoverCoords.right, 
                        width: popoverCoords.width,
                        zIndex: 9999 
                    }}
                    className="property-popover bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 min-w-[180px] origin-top-right"
                >
                    <div className="space-y-0.5">
                        {Object.values(Priority).map(p => {
                            const isSelected = task.priority === p;
                            return (
                                <button
                                    key={p}
                                    onClick={(e) => { e.stopPropagation(); updateTask(task.id, { priority: p }); onClose(); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                        isSelected ? 'bg-gray-100 text-black' : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                                >
                                    {/* High Contrast Dot */}
                                    <div className={`w-2.5 h-2.5 rounded-full ${getSolidColor(p)}`}></div>
                                    {PRIORITY_LABELS[p]}
                                    {isSelected && <Check size={14} className="mr-auto text-black" strokeWidth={3} />}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
