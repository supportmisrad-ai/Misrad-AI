'use client';

import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, User as UserIcon, Flag, ChevronDown, Timer, Briefcase, SquareActivity, Plus } from 'lucide-react';
import { Avatar } from '../Avatar';
import { useData } from '../../context/DataContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { createNexusTask } from '@/app/actions/nexus';
import { Priority, Status, Task, User, Client } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_LABELS } from '../../constants';
import { CustomDatePicker } from '../CustomDatePicker';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { MobileDrawer } from '../shared/MobileDrawer';

function getPrioritySolidColor(p: Priority) {
    switch(p) {
        case Priority.URGENT: return 'bg-red-600';
        case Priority.HIGH: return 'bg-orange-600';
        case Priority.MEDIUM: return 'bg-amber-500';
        case Priority.LOW: return 'bg-slate-500';
        default: return 'bg-gray-500';
    }
}

function getStatusSolidColor(colorClass: string) {
    if (colorClass.includes('green')) return 'bg-green-600';
    if (colorClass.includes('blue')) return 'bg-blue-600';
    if (colorClass.includes('orange')) return 'bg-orange-600';
    if (colorClass.includes('red')) return 'bg-red-600';
    return 'bg-gray-600';
}

export const CreateTaskModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    useBackButtonClose(true, onClose);
    const { users, clients, workflowStages, currentUser, hasPermission, addToast, addTask } = useData();
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    
    const createTaskMutation = useMutation({
        mutationFn: async (input: Omit<Task, 'id'>) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return createNexusTask({ orgId: orgSlug, input });
        },
    });

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [status, setStatus] = useState<string>(Status.TODO);
    const [assigneeId, setAssigneeId] = useState<string>(currentUser?.id ?? '');
    const [clientId, setClientId] = useState<string>('');
    const [tag] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime] = useState('');
    const [manualHours, setManualHours] = useState('');
    const [manualMinutes, setManualMinutes] = useState('');
    const [activePopover, setActivePopover] = useState<'none' | 'assignee' | 'priority' | 'client' | 'status' | 'estimate'>('none');
    const [isShaking, setIsShaking] = useState(false);

    const titleInputRef = useRef<HTMLInputElement>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const usersWithCurrent = useMemo(() => {
        const list = Array.isArray(users) ? [...users] : [];
        if (currentUser?.id && !list.some(u => String(u.id) === String(currentUser.id))) {
            list.unshift(currentUser as User);
        }
        return list;
    }, [users, currentUser]);

    const availableUsers = useMemo(() => {
        const isSuperAdmin = currentUser?.isSuperAdmin === true;
        const isTenantAdmin = !isSuperAdmin && isTenantAdminRole(currentUser?.role);
        const isManager = hasPermission('manage_team');

        return usersWithCurrent.filter((u: User) => {
            if (String(u.id) === String(currentUser?.id)) return true;
            if (isSuperAdmin) return true;
            if (isTenantAdmin) return true;
            if (isManager) return u.department === currentUser?.department;
            return false;
        });
    }, [usersWithCurrent, currentUser, hasPermission]);

    const handleSubmit = async (e: React.FormEvent) => {
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
            if (client && !tags.includes(client.companyName)) tags.push(client.companyName);
        }

        const estimatedMinutes = (Number(manualHours) * 60) + Number(manualMinutes);
        const optimisticId = `TSK-${Date.now()}`;
        
        const taskData: Omit<Task, 'id'> = {
            title,
            description,
            status: status || Status.TODO,
            priority,
            assigneeIds: assigneeId ? [assigneeId] : [currentUser.id],
            assigneeId: assigneeId || currentUser.id,
            clientId: clientId || undefined,
            tags,
            createdAt: new Date().toISOString(),
            dueDate: dueDate || undefined,
            dueTime: dueTime || undefined,
            timeSpent: 0,
            estimatedTime: estimatedMinutes > 0 ? estimatedMinutes : undefined,
            isTimerRunning: false,
            messages: [],
            creatorId: currentUser.id,
            department: currentUser.department || undefined
        };

        addTask({ id: optimisticId, ...taskData } as Task, { silent: true });
        onClose();

        try {
            const created = await createTaskMutation.mutateAsync(taskData);
            window.dispatchEvent(new CustomEvent('nexusTaskReplaceOptimistic', { detail: { optimisticId, realTask: created } }));
            if (orgSlug) queryClient.invalidateQueries({ queryKey: ['nexus', 'tasks', orgSlug] });
            addToast('משימה נשמרה בהצלחה ✓', 'success');
        } catch (error) {
            window.dispatchEvent(new CustomEvent('nexusTaskDeleted', { detail: { taskId: optimisticId } }));
            addToast('שגיאה בשמירת המשימה', 'error');
        }
    };

    const selectedAssignee = usersWithCurrent.find(u => String(u.id) === String(assigneeId));
    const selectedClient = clients.find(c => c.id === clientId);
    const selectedStatus = workflowStages.find(s => s.id === status);
    const hasEstimate = !!(manualHours || manualMinutes);

    const ModalContent = (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">כותרת <span className="text-red-500">*</span></label>
                        <input 
                            ref={titleInputRef}
                            autoFocus
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="מה צריך לעשות?"
                            className={`w-full px-4 py-3.5 text-lg font-bold border-2 rounded-2xl outline-none transition-all ${isShaking ? 'border-red-500 animate-shake' : 'border-gray-200 focus:border-gray-900'}`}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">תיאור</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="פרטים נוספים..."
                            className="w-full px-4 py-3.5 text-base border-2 border-gray-200 rounded-2xl outline-none resize-none focus:border-gray-900 min-h-[120px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">משויך ל</label>
                            <button 
                                type="button"
                                onClick={() => setActivePopover('assignee')}
                                className="w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-gray-200 text-sm font-bold hover:border-gray-300 transition-all bg-white"
                            >
                                {selectedAssignee ? (
                                    <>
                                        <Avatar src={selectedAssignee.avatar} name={selectedAssignee.name} size="sm" />
                                        <span className="flex-1 text-right">{selectedAssignee.name}</span>
                                    </>
                                ) : <span className="flex-1 text-right text-gray-400">בחר עובד</span>}
                                <ChevronDown size={16} className="opacity-40" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">לקוח</label>
                            <button 
                                type="button"
                                onClick={() => setActivePopover('client')}
                                className={`w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 text-sm font-bold transition-all bg-white ${!clientId ? 'border-amber-100' : 'border-gray-200'}`}
                            >
                                <Briefcase size={18} className="text-gray-400" />
                                <span className="flex-1 text-right">{selectedClient ? selectedClient.companyName : 'בחר לקוח'}</span>
                                <ChevronDown size={16} className="opacity-40" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">סטטוס</label>
                            <button 
                                type="button"
                                onClick={() => setActivePopover('status')}
                                className="w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-gray-200 text-sm font-bold bg-white"
                            >
                                <SquareActivity size={18} className="text-gray-400" />
                                <span className="flex-1 text-right">{selectedStatus ? selectedStatus.name : 'בחר סטטוס'}</span>
                                <ChevronDown size={16} className="opacity-40" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">דחיפות</label>
                            <button 
                                type="button"
                                onClick={() => setActivePopover('priority')}
                                className="w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-gray-200 text-sm font-bold bg-white"
                            >
                                <Flag size={18} className="text-gray-400" />
                                <span className="flex-1 text-right">{PRIORITY_LABELS[priority]}</span>
                                <ChevronDown size={16} className="opacity-40" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">תאריך יעד</label>
                            <CustomDatePicker value={dueDate} onChange={setDueDate} placeholder="בחר תאריך" showHebrewDate />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">הערכת זמן</label>
                            <button 
                                type="button"
                                onClick={() => setActivePopover('estimate')}
                                className="w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-gray-200 text-sm font-bold bg-white"
                            >
                                <Timer size={18} className="text-gray-400" />
                                <span className="flex-1 text-right">{hasEstimate ? `${manualHours || 0} ש׳ ו-${manualMinutes || 0} דק׳` : 'כמה זמן זה ייקח?'}</span>
                                <ChevronDown size={16} className="opacity-40" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">ביטול</button>
                    <button type="submit" className="flex-[2] py-3.5 bg-black text-white rounded-2xl font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                        צור משימה <Check size={18} />
                    </button>
                </div>
            </form>
        </div>
    );

    return createPortal(
        <>
            {!isMobile && (
                <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col relative overflow-hidden"
                        style={{ maxHeight: '85vh' }}
                    >
                        <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
                            <h2 className="text-xl font-black">משימה חדשה</h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        {ModalContent}
                    </motion.div>
                </div>
            )}

            {isMobile && (
                <MobileDrawer isOpen={true} onClose={onClose} title="משימה חדשה">
                    {ModalContent}
                </MobileDrawer>
            )}

            <AnimatePresence>
                {/* Desktop Popovers */}
                {!isMobile && activePopover === 'status' && (
                    <div className="fixed inset-0 z-[10000]" onClick={() => setActivePopover('none')}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-64 overflow-hidden"
                            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '100px' }}
                        >
                            <div className="p-3 bg-gray-50 border-b border-gray-100 mb-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider">בחר סטטוס משימה</div>
                            {workflowStages.map(s => (
                                <button key={s.id} onClick={() => { setStatus(s.id); setActivePopover('none'); }} className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-colors ${status === s.id ? 'bg-gray-50 text-black' : 'hover:bg-gray-50 text-gray-600'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusSolidColor(s.color)}`} />
                                    <span className="font-bold text-sm">{s.name}</span>
                                    {status === s.id && <Check size={14} className="mr-auto" />}
                                </button>
                            ))}
                        </motion.div>
                    </div>
                )}

                {!isMobile && activePopover === 'priority' && (
                    <div className="fixed inset-0 z-[10000]" onClick={() => setActivePopover('none')}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-48 overflow-hidden"
                            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '100px' }}
                        >
                            <div className="p-3 bg-gray-50 border-b border-gray-100 mb-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider">רמת דחיפות</div>
                            {(Object.values(Priority) as Priority[]).map(p => (
                                <button key={p} onClick={() => { setPriority(p); setActivePopover('none'); }} className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-colors ${priority === p ? 'bg-gray-50 text-black' : 'hover:bg-gray-50 text-gray-600'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${getPrioritySolidColor(p)}`} />
                                    <span className="font-bold text-sm">{PRIORITY_LABELS[p]}</span>
                                    {priority === p && <Check size={14} className="mr-auto" />}
                                </button>
                            ))}
                        </motion.div>
                    </div>
                )}

                {!isMobile && activePopover === 'assignee' && (
                    <div className="fixed inset-0 z-[10000]" onClick={() => setActivePopover('none')}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 w-72 overflow-hidden"
                            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '100px' }}
                        >
                            <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider"><UserIcon size={12} /> שיוך לעובד</div>
                            <div className="p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                                {availableUsers.map(u => (
                                    <button key={u.id} onClick={() => { setAssigneeId(u.id); setActivePopover('none'); }} className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-colors ${assigneeId === u.id ? 'bg-gray-50 text-black' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        <Avatar src={u.avatar} name={u.name} size="sm" />
                                        <div className="flex-1 text-right">
                                            <div className="font-bold text-sm">{u.name}</div>
                                            <div className="text-[10px] text-gray-400 uppercase">{u.role}</div>
                                        </div>
                                        {assigneeId === u.id && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {!isMobile && activePopover === 'client' && (
                    <div className="fixed inset-0 z-[10000]" onClick={() => setActivePopover('none')}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden"
                            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '100px' }}
                        >
                            <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider"><Briefcase size={12} /> שיוך ללקוח</div>
                            <div className="p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                                <button onClick={() => { setClientId(''); setActivePopover('none'); }} className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-colors ${!clientId ? 'bg-gray-50 text-black' : 'hover:bg-gray-50 text-gray-600'}`}>
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Plus size={16} /></div>
                                    <span className="font-bold text-sm">פנימי / ללא לקוח</span>
                                    {!clientId && <Check size={14} className="mr-auto" />}
                                </button>
                                {clients.map(c => (
                                    <button key={c.id} onClick={() => { setClientId(c.id); setActivePopover('none'); }} className={`w-full text-right p-3 rounded-xl flex items-center gap-3 transition-colors ${clientId === c.id ? 'bg-gray-50 text-black' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        <Avatar src={c.avatar} name={c.companyName} size="sm" />
                                        <div className="flex-1 text-right">
                                            <div className="font-bold text-sm">{c.companyName}</div>
                                            <div className="text-[10px] text-gray-400 uppercase">{c.contactPerson}</div>
                                        </div>
                                        {clientId === c.id && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {!isMobile && activePopover === 'estimate' && (
                    <div className="fixed inset-0 z-[10000]" onClick={() => setActivePopover('none')}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-72"
                            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', marginTop: '100px' }}
                        >
                            <div className="flex items-center gap-2 mb-4 text-gray-400 font-bold text-[10px] uppercase"><Timer size={14} /> הערכת זמן לביצוע</div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-gray-400 mb-1 mr-1">שעות</label>
                                    <input type="number" min="0" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:bg-white focus:border-black outline-none" value={manualHours} onChange={e => setManualHours(e.target.value)} />
                                </div>
                                <div className="text-gray-300 pt-4">:</div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-black text-gray-400 mb-1 mr-1">דקות</label>
                                    <input type="number" min="0" max="59" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold focus:bg-white focus:border-black outline-none" value={manualMinutes} onChange={e => setManualMinutes(e.target.value)} />
                                </div>
                            </div>
                            <button onClick={() => setActivePopover('none')} className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-colors">אישור</button>
                        </motion.div>
                    </div>
                )}

                {/* Mobile Drawers */}
                {isMobile && activePopover === 'status' && (
                    <MobileDrawer isOpen={true} onClose={() => setActivePopover('none')} title="בחירת סטטוס">
                        <div className="space-y-1 p-2">
                            {workflowStages.map(s => (
                                <button key={s.id} onClick={() => { setStatus(s.id); setActivePopover('none'); }} className={`w-full text-right p-4 rounded-xl flex items-center gap-3 ${status === s.id ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusSolidColor(s.color)}`} />
                                    <span className="font-bold">{s.name}</span>
                                </button>
                            ))}
                        </div>
                    </MobileDrawer>
                )}

                {isMobile && activePopover === 'priority' && (
                    <MobileDrawer isOpen={true} onClose={() => setActivePopover('none')} title="בחירת דחיפות">
                        <div className="space-y-1 p-2">
                            {(Object.values(Priority) as Priority[]).map(p => (
                                <button key={p} onClick={() => { setPriority(p); setActivePopover('none'); }} className={`w-full text-right p-4 rounded-xl flex items-center gap-3 ${priority === p ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${getPrioritySolidColor(p)}`} />
                                    <span className="font-bold">{PRIORITY_LABELS[p]}</span>
                                </button>
                            ))}
                        </div>
                    </MobileDrawer>
                )}

                {isMobile && activePopover === 'assignee' && (
                    <MobileDrawer isOpen={true} onClose={() => setActivePopover('none')} title="שיוך לעובד">
                        <div className="space-y-1 p-2">
                            {availableUsers.map(u => (
                                <button key={u.id} onClick={() => { setAssigneeId(u.id); setActivePopover('none'); }} className={`w-full text-right p-4 rounded-xl flex items-center gap-3 ${assigneeId === u.id ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                                    <Avatar src={u.avatar} name={u.name} size="sm" />
                                    <span className="font-bold">{u.name}</span>
                                </button>
                            ))}
                        </div>
                    </MobileDrawer>
                )}

                {isMobile && activePopover === 'client' && (
                    <MobileDrawer isOpen={true} onClose={() => setActivePopover('none')} title="שיוך ללקוח">
                        <div className="space-y-1 p-2">
                            <button onClick={() => { setClientId(''); setActivePopover('none'); }} className={`w-full text-right p-4 rounded-xl flex items-center gap-3 ${!clientId ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                                <Briefcase size={18} /> <span className="font-bold">פנימי / ללא</span>
                            </button>
                            {clients.map(c => (
                                <button key={c.id} onClick={() => { setClientId(c.id); setActivePopover('none'); }} className={`w-full text-right p-4 rounded-xl flex items-center gap-3 ${clientId === c.id ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                                    <Avatar src={c.avatar} name={c.companyName} size="sm" />
                                    <span className="font-bold">{c.companyName}</span>
                                </button>
                            ))}
                        </div>
                    </MobileDrawer>
                )}

                {isMobile && activePopover === 'estimate' && (
                    <MobileDrawer isOpen={true} onClose={() => setActivePopover('none')} title="הערכת זמן">
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-center">
                                    <label className="text-xs font-bold text-gray-400">שעות</label>
                                    <input type="number" value={manualHours} onChange={e => setManualHours(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-2xl font-bold text-center border-2 border-transparent focus:border-black outline-none" placeholder="0" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <label className="text-xs font-bold text-gray-400">דקות</label>
                                    <input type="number" value={manualMinutes} onChange={e => setManualMinutes(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl text-2xl font-bold text-center border-2 border-transparent focus:border-black outline-none" placeholder="0" />
                                </div>
                            </div>
                            <button onClick={() => setActivePopover('none')} className="w-full py-4 bg-black text-white rounded-2xl font-bold">אישור</button>
                        </div>
                    </MobileDrawer>
                )}
            </AnimatePresence>
        </>,
        document.body
    );
};
