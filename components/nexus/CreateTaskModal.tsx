'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Hash, User as UserIcon, Calendar, Flag, ArrowUpRight, ChevronDown, Clock, Briefcase, SquareActivity, TriangleAlert, AlignStartVertical, Timer, Sparkles, Plus, Info, Wand2, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { createNexusTask } from '@/app/actions/nexus';
import { Priority, Status, Task, User, Client, WorkflowStage } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PRIORITY_LABELS } from '../../constants';
import { CustomDatePicker } from '../CustomDatePicker';
import { CustomTimePicker } from '../CustomTimePicker';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface CreateTaskModalProps {
    onClose: () => void;
}

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
    if (colorClass.includes('blue')) return 'bg-gray-600';
    if (colorClass.includes('orange')) return 'bg-orange-600';
    if (colorClass.includes('red')) return 'bg-red-600';
    return 'bg-gray-600';
}

function TagSuggestionsPortal({
    show,
    filteredTags,
    tagInputRect,
    tagDropdownRef,
    onSelectTag,
}: {
    show: boolean;
    filteredTags: string[];
    tagInputRect: DOMRect | null;
    tagDropdownRef: React.RefObject<HTMLDivElement | null>;
    onSelectTag: (tag: string) => void;
}) {
    if (!show || filteredTags.length === 0 || !tagInputRect) return null;
    if (typeof window === 'undefined') return null;

    return createPortal(
        <motion.div 
            ref={tagDropdownRef}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            style={{
                position: 'fixed',
                top: tagInputRect.bottom + 8,
                right: window.innerWidth - tagInputRect.right,
                zIndex: 99999,
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
                        onClick={() => onSelectTag(t)}
                        className="w-full text-right px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors block flex items-center gap-2"
                    >
                        <Hash size={12} className="opacity-50" /> {t}
                    </button>
                ))}
            </div>
        </motion.div>,
        document.body
    );
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose }) => {
    useBackButtonClose(true, onClose);
    const { addTask, addClient, users, clients, createTaskDefaults, tasks, workflowStages, currentUser, hasPermission, addToast } = useData();
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    const createTaskMutation = useMutation({
        mutationFn: async (input: Omit<Task, 'id'>) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return createNexusTask({ orgId: orgSlug, input });
        },
    });
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
    const [showAddClientInline, setShowAddClientInline] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [recommendedTooltip, setRecommendedTooltip] = useState<string | null>(null);
    const [aiEstimating, setAiEstimating] = useState(false);
    const [aiEstimateResult, setAiEstimateResult] = useState<{ hours: number; minutes: number; reasoning: string } | null>(null);
    const [dueTimeError, setDueTimeError] = useState('');
    const titleInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const enableAiTimeEstimate = false;
    const tagInputRef = useRef<HTMLInputElement>(null);
    const tagDropdownRef = useRef<HTMLDivElement>(null);
    const clientButtonRef = useRef<HTMLButtonElement>(null);
    const statusButtonRef = useRef<HTMLButtonElement>(null);
    const assigneeButtonRef = useRef<HTMLButtonElement>(null);
    const priorityButtonRef = useRef<HTMLButtonElement>(null);
    const estimateButtonRef = useRef<HTMLButtonElement>(null);
    const [clientPopoverPosition, setClientPopoverPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ top: number; right: number; width: number } | null>(null);
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Scroll to top on mobile when modal opens
    useEffect(() => {
        if (isMobile) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [isMobile]);

    // --- HIERARCHY LOGIC FOR ASSIGNEES ---
    // Super Admin: system admin, sees everyone across all tenants
    const isSuperAdmin = currentUser.isSuperAdmin === true;
    // Tenant Admin: CEO/Admin within their tenant, sees everyone within their tenant
    const isTenantAdmin = !isSuperAdmin && isTenantAdminRole(currentUser.role);
    const isManager = hasPermission('manage_team');

    const usersWithCurrent = (() => {
        const list = Array.isArray(users) ? [...users] : [];
        if (currentUser?.id && !list.some((u: unknown) => {
            const user = u as Record<string, unknown>;
            return String(user.id) === String(currentUser.id);
        })) {
            list.unshift(currentUser as User);
        }
        return list;
    })();
    
    const availableUsers = usersWithCurrent.filter((u: User) => {
        // Always include current user
        if (String(u.id) === String(currentUser.id)) return true;
        // Super Admin sees everyone (all tenants)
        if (isSuperAdmin) return true;
        // Tenant Admin sees everyone within their tenant
        if (isTenantAdmin) return true;
        // Manager sees users in their department
        if (isManager) return u.department === currentUser.department;
        // Regular users see only themselves
        return false;
    });

    // Get unique existing tags from all tasks
    const existingTags = Array.from(new Set(tasks.flatMap((t: Task) => t.tags))) as string[];
    const filteredTags = existingTags.filter((t: string) => t.toLowerCase().includes(tag.toLowerCase()) && t !== tag);

    // Logic for Approval Requirement (e.g., tasks > 4 hours)
    const estimateHoursNum = Number(manualHours) || 0;
    const requiresApproval = estimateHoursNum >= 4;

    // Calculate popover positions
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkMobile = window.innerWidth < 768;
        
        if (activePopover === 'none') {
            setPopoverPosition(null);
            if (checkMobile) {
                setClientPopoverPosition(null);
            }
            return;
        }

        let buttonRef: React.RefObject<HTMLButtonElement | null> | null = null;
        let popoverWidth = 256;

        switch (activePopover) {
            case 'status':
                buttonRef = statusButtonRef;
                popoverWidth = 224;
                break;
            case 'assignee':
                buttonRef = assigneeButtonRef;
                popoverWidth = 256;
                break;
            case 'client':
                if (checkMobile) {
            setClientPopoverPosition({
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
                width: Math.min(280, window.innerWidth - 32)
            });
                    return;
                }
                buttonRef = clientButtonRef;
                popoverWidth = 256;
                break;
            case 'priority':
                buttonRef = priorityButtonRef;
                popoverWidth = 176;
                break;
            case 'estimate':
                buttonRef = estimateButtonRef;
                popoverWidth = 288;
                break;
        }

        if (buttonRef?.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Position the popover directly below the button
            const topPosition = rect.bottom + 8; // 8px gap below button
            
            setPopoverPosition({
                top: topPosition,
                right: window.innerWidth - rect.right,
                width: rect.width // Match button width
            });
        }
    }, [activePopover]);

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

    // Set default status to "To Do" (first non-Backlog stage) when modal opens
    useEffect(() => {
        if (workflowStages && workflowStages.length > 0) {
            // Find "To Do" stage if exists, otherwise use first stage that's not "Backlog"
            const todoStage = workflowStages.find((s: WorkflowStage) => s.id === 'To Do' || s.id === Status.TODO);
            if (todoStage) {
                setStatus(todoStage.id);
            } else {
                // Use first stage that's not "Backlog"
                const firstNonBacklog = workflowStages.find((s: WorkflowStage) => s.id !== 'Backlog') || workflowStages[0];
                if (firstNonBacklog) {
                    setStatus(firstNonBacklog.id);
                }
            }
        }
    }, [workflowStages]);

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
                handleSubmit(e as unknown as React.FormEvent<Element>);
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

    // Validate due time is not in the past for today
    const validateDueTime = (time: string, date: string): boolean => {
        if (!time || !date) return true;
        const today = new Date().toISOString().split('T')[0];
        if (date !== today) return true;
        const now = new Date();
        const [h, m] = time.split(':').map(Number);
        if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
            return false;
        }
        return true;
    };

    const handleDueTimeChange = (time: string) => {
        setDueTime(time);
        if (time && dueDate && !validateDueTime(time, dueDate)) {
            setDueTimeError('שעה זו כבר עברה היום');
        } else {
            setDueTimeError('');
        }
    };

    const handleDueDateChange = (date: string) => {
        setDueDate(date);
        if (dueTime && date && !validateDueTime(dueTime, date)) {
            setDueTimeError('שעה זו כבר עברה היום');
        } else {
            setDueTimeError('');
        }
    };

    // AI Time Estimation
    const handleAiEstimate = async () => {
        if (!description.trim()) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);
            return;
        }
        setAiEstimating(true);
        setAiEstimateResult(null);
        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `אתה מומחה לניהול פרויקטים. העריך כמה זמן לוקח לבצע את המשימה הבאה. ענה רק בפורמט JSON: {"hours": X, "minutes": Y, "reasoning": "הסבר קצר"}\n\nכותרת: ${title}\nתיאור: ${description}`
                    }],
                    featureKey: 'task-time-estimate'
                })
            });
            if (res.ok) {
                const data: unknown = await res.json();
                const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null;
                const text = typeof dataObj?.text === 'string' ? dataObj.text : typeof dataObj?.response === 'string' ? dataObj.response : '';
                const jsonMatch = text.match(/\{[^}]+\}/);
                if (jsonMatch) {
                    const parsed: unknown = JSON.parse(jsonMatch[0]);
                    const parsedObj = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
                    if (parsedObj) {
                        setAiEstimateResult({
                            hours: typeof parsedObj.hours === 'number' ? parsedObj.hours : 0,
                            minutes: typeof parsedObj.minutes === 'number' ? parsedObj.minutes : 0,
                            reasoning: typeof parsedObj.reasoning === 'string' ? parsedObj.reasoning : 'הערכה אוטומטית'
                        });
                    }
                }
            }
        } catch {
            // silently fail
        } finally {
            setAiEstimating(false);
        }
    };

    const applyAiEstimate = () => {
        if (aiEstimateResult) {
            setManualHours(String(aiEstimateResult.hours));
            setManualMinutes(String(aiEstimateResult.minutes));
            setAiEstimateResult(null);
        }
    };

    // Inline Add Client
    const handleAddClientInline = () => {
        if (!newClientName.trim()) return;
        setIsAddingClient(true);
        const newClient: Client = {
            id: `CL-${Date.now()}`,
            name: newClientName.trim(),
            companyName: newClientName.trim(),
            contactPerson: newClientName.trim(),
            email: newClientEmail.trim() || '',
            phone: newClientPhone.trim() || '',
            status: 'Active',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newClientName.trim())}&background=7c3aed&color=fff&bold=true&size=64`,
            package: '',
            joinedAt: new Date().toISOString()
        };
        addClient(newClient);
        setClientId(newClient.id);
        setShowAddClientInline(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
        setIsAddingClient(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setIsShaking(true);
            titleInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        // Validate due time
        if (dueTime && dueDate && !validateDueTime(dueTime, dueDate)) {
            setDueTimeError('שעה זו כבר עברה היום');
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
        const displayDueDate = dueDate ? new Date(dueDate).toISOString().split('T')[0] : undefined;

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
            dueDate: displayDueDate,
            dueTime: dueTime || undefined,
            timeSpent: 0,
            estimatedTime: estimatedMinutes > 0 ? estimatedMinutes : undefined,
            approvalStatus,
            isTimerRunning: false,
            messages,
            creatorId: currentUser.id,
            department: currentUser.department || undefined
        };

        // Optimistic: add task to local state immediately & close modal
        const optimisticTask: Task = { id: optimisticId, ...taskData };
        addTask(optimisticTask, { silent: true });
        onClose();

        // Persist in background
        try {
            const createdTask = await createTaskMutation.mutateAsync(taskData);
            // Replace optimistic task with real one from server
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nexusTaskReplaceOptimistic', { detail: { optimisticId, realTask: createdTask } }));
            }
            if (orgSlug) {
                queryClient.invalidateQueries({ queryKey: ['nexus', 'tasks', orgSlug] });
            }
            addToast('משימה נשמרה בהצלחה ✓', 'success');
        } catch (error) {
            console.error('Failed to create task:', error);
            // Rollback: remove the optimistic task
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nexusTaskDeleted', { detail: { taskId: optimisticId } }));
            }
            addToast('שגיאה בשמירת המשימה – נסה שנית', 'error');
        }
    };

    const selectedAssignee = usersWithCurrent.find((u: User) => String(u.id) === String(assigneeId));
    const selectedClient = clients.find((c: Client) => c.id === clientId);
    const selectedStatus = workflowStages.find((s: WorkflowStage) => s.id === status);

    // Calculate completion score and missing important fields
    const hasDueDate = !!dueDate;
    const hasEstimate = !!(manualHours || manualMinutes);
    const hasClient = !!clientId;
    const hasAssignee = !!assigneeId;
    
    // Recommended fields that improve task quality
    const recommendedFields = [
        { key: 'dueDate', filled: hasDueDate, label: 'תאריך יעד', icon: Calendar },
        { key: 'estimate', filled: hasEstimate, label: 'הערכת זמן', icon: Timer },
        { key: 'client', filled: hasClient, label: 'לקוח', icon: Briefcase },
    ];
    
    const missingRecommended = recommendedFields.filter(f => !f.filled).length;
    const completionScore = Math.round((recommendedFields.filter(f => f.filled).length / recommendedFields.length) * 100);

    return (
        <>
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col relative overflow-hidden z-[10000]"
                style={{ maxHeight: '85vh', maxWidth: 'min(768px, calc(100vw - 2rem))' }}
            >
                {/* Header */}
                <div className="px-6 sm:px-8 py-5 flex items-center justify-between bg-white z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-sm">
                            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">משימה חדשה</h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">צור משימה ותתחיל לעבוד</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all">
                        <X size={22} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* כותרת המשימה */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span>כותרת</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <input 
                                ref={titleInputRef}
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setIsShaking(false); }}
                                placeholder="מה צריך לעשות?"
                                className={`w-full px-4 py-3.5 text-lg font-bold placeholder:text-gray-300 border-2 outline-none bg-white rounded-2xl transition-all ${isShaking ? 'border-red-500 text-red-600 animate-shake' : 'border-gray-200 text-gray-900 focus:border-gray-900'}`}
                            />
                        </div>

                        {/* תיאור */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">תיאור</label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="הוסף פרטים, קישורים או הערות נוספות..."
                                className="w-full px-4 py-3.5 text-base text-gray-700 placeholder:text-gray-300 border-2 border-gray-200 outline-none resize-none bg-white rounded-2xl leading-relaxed focus:border-gray-900 transition-all"
                                rows={4}
                            />
                        </div>

                        {/* קו מפריד */}
                        <div className="border-t border-gray-100"></div>

                        {/* משויך ל + לקוח */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">משויך ל</label>
                                <button 
                                    ref={assigneeButtonRef}
                                    type="button"
                                    onClick={() => setActivePopover(activePopover === 'assignee' ? 'none' : 'assignee')}
                                    className={`property-trigger w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                                        assigneeId 
                                        ? 'bg-gray-50 border-gray-900 text-gray-900'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    {selectedAssignee ? (
                                        <>
                                            <img src={selectedAssignee.avatar} alt={selectedAssignee.name} className="w-6 h-6 rounded-full border-2 border-gray-100" />
                                            <span className="flex-1 text-right">{selectedAssignee.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserIcon size={18} className="text-gray-400" />
                                            <span className="flex-1 text-right">בחר עובד</span>
                                        </>
                                    )}
                                    <ChevronDown size={16} className="opacity-40" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <span>לקוח</span>
                                    {!hasClient && (
                                        <>
                                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">מומלץ</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setRecommendedTooltip(recommendedTooltip === 'client' ? null : 'client'); }}
                                                className="text-gray-400 hover:text-amber-600 transition-colors"
                                            >
                                                <Info size={14} />
                                            </button>
                                        </>
                                    )}
                                </label>
                                {recommendedTooltip === 'client' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed"
                                    >
                                        <div className="flex items-center gap-1.5 font-black text-amber-900 mb-1">
                                            <Sparkles size={12} /> למה לשייך לקוח?
                                        </div>
                                        ה-AI מנתח את כל המשימות לפי לקוח — מזהה דפוסים, מחשב רווחיות, ומתריע כשלקוח דורש תשומת לב. בלי שיוך, הנתונים האלו חסרים.
                                    </motion.div>
                                )}
                                <button 
                                    ref={clientButtonRef}
                                    type="button"
                                    onClick={() => setActivePopover(activePopover === 'client' ? 'none' : 'client')}
                                    className={`property-trigger w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                                        clientId 
                                        ? 'bg-purple-50 border-purple-600 text-purple-700'
                                        : !hasClient
                                        ? 'bg-white border-amber-200 text-gray-500 hover:border-amber-300'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <Briefcase size={18} className={clientId ? 'text-purple-600' : 'text-gray-400'} />
                                    <span className="flex-1 text-right">{selectedClient ? selectedClient.companyName : 'בחר לקוח'}</span>
                                    <ChevronDown size={16} className="opacity-40" />
                                </button>
                            </div>
                        </div>

                        {/* סטטוס + עדיפות */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">סטטוס</label>
                                <button 
                                    ref={statusButtonRef}
                                    type="button"
                                    onClick={() => setActivePopover(activePopover === 'status' ? 'none' : 'status')}
                                    className="property-trigger w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 border-gray-200 text-sm font-bold transition-all bg-white hover:border-gray-300 text-gray-700"
                                >
                                    <SquareActivity size={18} className="text-gray-400" />
                                    <span className="flex-1 text-right">{selectedStatus ? selectedStatus.name : status}</span>
                                    <ChevronDown size={16} className="opacity-40" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">עדיפות</label>
                                <button 
                                    ref={priorityButtonRef}
                                    type="button"
                                    onClick={() => setActivePopover(activePopover === 'priority' ? 'none' : 'priority')}
                                    className={`property-trigger w-full px-4 py-3 flex items-center gap-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                                        priority !== Priority.MEDIUM
                                        ? 'bg-gray-50 border-gray-900 text-gray-900'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Flag size={18} className={priority === Priority.URGENT ? 'text-red-500' : 'text-gray-400'} />
                                    <span className="flex-1 text-right">{PRIORITY_LABELS[priority]}</span>
                                    <ChevronDown size={16} className="opacity-40" />
                                </button>
                            </div>
                        </div>

                        {/* תאריך יעד + שעת יעד + הערכת זמן משימה */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <span>תאריך יעד</span>
                                    {!hasDueDate && (
                                        <>
                                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">מומלץ</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setRecommendedTooltip(recommendedTooltip === 'dueDate' ? null : 'dueDate'); }}
                                                className="text-gray-400 hover:text-amber-600 transition-colors"
                                            >
                                                <Info size={14} />
                                            </button>
                                        </>
                                    )}
                                </label>
                                {recommendedTooltip === 'dueDate' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed"
                                    >
                                        <div className="flex items-center gap-1.5 font-black text-amber-900 mb-1">
                                            <Sparkles size={12} /> למה תאריך יעד?
                                        </div>
                                        ה-AI עוקב אחרי דד-ליינים — מזהה צווארי בקבוק, מתריע על עומס, ומציע חלוקה מחדש. עם תאריך יעד, המערכת יודעת לתעדף בשבילך.
                                    </motion.div>
                                )}
                                <div className="h-12">
                                    <CustomDatePicker 
                                        value={dueDate}
                                        onChange={handleDueDateChange}
                                        placeholder="בחר תאריך"
                                        minDate={new Date().toISOString().split('T')[0]}
                                        className={`property-trigger w-full h-full border-2 rounded-2xl ${!hasDueDate ? 'border-amber-200 hover:border-amber-300' : 'border-gray-200'}`}
                                        showHebrewDate={true}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">שעת יעד</label>
                                <div className="h-12">
                                    <CustomTimePicker 
                                        value={dueTime}
                                        onChange={handleDueTimeChange}
                                        placeholder="בחר שעה"
                                        className={`property-trigger w-full h-full border-2 rounded-2xl ${dueTimeError ? 'border-red-300' : 'border-gray-200'}`}
                                    />
                                </div>
                                {dueTimeError && (
                                    <p className="text-[11px] text-red-500 font-bold">{dueTimeError}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <span>הערכת זמן משימה</span>
                                    {!hasEstimate && (
                                        <>
                                            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">מומלץ</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setRecommendedTooltip(recommendedTooltip === 'estimate' ? null : 'estimate'); }}
                                                className="text-gray-400 hover:text-amber-600 transition-colors"
                                            >
                                                <Info size={14} />
                                            </button>
                                        </>
                                    )}
                                </label>
                                {recommendedTooltip === 'estimate' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed"
                                    >
                                        <div className="flex items-center gap-1.5 font-black text-amber-900 mb-1">
                                            <Sparkles size={12} /> למה הערכת זמן?
                                        </div>
                                        ה-AI משווה הערכות מול זמן ביצוע בפועל — לומד את הדיוק שלך, מזהה משימות שתמיד חורגות, ומשפר תחזיות לאורך זמן.
                                    </motion.div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        ref={estimateButtonRef}
                                        type="button"
                                        onClick={() => setActivePopover(activePopover === 'estimate' ? 'none' : 'estimate')}
                                        className={`property-trigger flex-1 h-12 px-4 flex items-center gap-2 rounded-2xl border-2 text-sm font-bold transition-all ${
                                            manualHours || manualMinutes
                                            ? 'bg-green-50 border-green-600 text-green-700'
                                            : !hasEstimate 
                                            ? 'bg-white border-amber-200 text-gray-500 hover:border-amber-300'
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                    >
                                        <Timer size={18} className={hasEstimate ? "text-green-600" : "text-gray-400"} /> 
                                        <span className="flex-1 text-right">
                                            {manualHours || manualMinutes ? `${manualHours || 0}:${(manualMinutes || '0').padStart(2, '0')}` : 'הערכת זמן'}
                                        </span>
                                    </button>
                                    {enableAiTimeEstimate && (
                                        <button
                                            type="button"
                                            onClick={handleAiEstimate}
                                            disabled={aiEstimating}
                                            title={!description.trim() ? 'יש להזין תיאור משימה קודם' : 'הערכת זמן בעזרת AI'}
                                            className={`h-12 w-12 flex items-center justify-center rounded-2xl border-2 transition-all ${
                                                aiEstimating
                                                ? 'bg-purple-50 border-purple-300 text-purple-500'
                                                : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 text-purple-600 hover:border-purple-400 hover:shadow-md hover:shadow-purple-100'
                                            }`}
                                        >
                                            {aiEstimating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                        </button>
                                    )}
                                </div>
                                {/* AI Estimate Result Popover */}
                                <AnimatePresence>
                                    {enableAiTimeEstimate && aiEstimateResult && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                            className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 space-y-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                                                    <Wand2 size={16} className="text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-purple-900">הערכת זמן משימה</p>
                                                    <p className="text-[10px] text-purple-600 font-medium">מבוסס AI</p>
                                                </div>
                                            </div>
                                            <div className="text-center py-2">
                                                <span className="text-3xl font-black text-purple-800">
                                                    {aiEstimateResult.hours > 0 ? `${aiEstimateResult.hours} שע׳` : ''}
                                                    {aiEstimateResult.hours > 0 && aiEstimateResult.minutes > 0 ? ' ו-' : ''}
                                                    {aiEstimateResult.minutes > 0 ? `${aiEstimateResult.minutes} דק׳` : ''}
                                                    {aiEstimateResult.hours === 0 && aiEstimateResult.minutes === 0 ? 'פחות מדקה' : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-purple-700 leading-relaxed text-center">{aiEstimateResult.reasoning}</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={applyAiEstimate}
                                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Check size={14} /> אשר הערכה
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAiEstimateResult(null)}
                                                    className="py-2.5 px-4 bg-white border border-purple-200 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-50 transition-colors"
                                                >
                                                    ביטול
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* תגית */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">תגית</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl">
                                <Hash size={18} className="text-gray-400" />
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
                                    placeholder="לדוגמה: שיווק, פיתוח, דחוף, ישיבה..."
                                    className="flex-1 text-sm font-bold bg-transparent border-none outline-none placeholder:text-gray-300 text-gray-700"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-5 bg-white border-t-2 border-gray-100 flex items-center gap-3">
                    {missingRecommended > 0 && (
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                            <Sparkles size={14} className="text-amber-600 shrink-0" />
                            <span className="text-xs font-bold text-amber-700">
                                חסרים {missingRecommended} שדות מומלצים
                            </span>
                        </div>
                    )}
                    <button 
                        onClick={handleSubmit}
                        disabled={!title.trim() || !!dueTimeError}
                        className={`px-8 h-12 rounded-2xl text-sm font-black shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-95 ${
                            requiresApproval 
                            ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200' 
                            : 'bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white shadow-gray-300'
                        } ${!missingRecommended ? 'flex-1' : ''}`}
                    >
                        {requiresApproval ? 'שלח לאישור' : 'צור משימה'}
                        {requiresApproval ? <TriangleAlert size={18} /> : <Check size={18} />}
                    </button>
                </div>
            </motion.div>
        </div>

        {/* Mobile Client Popover Portal */}
        {activePopover === 'client' && typeof window !== 'undefined' && window.innerWidth < 768 && createPortal(
            <>
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99998]"
                    onClick={() => setActivePopover('none')}
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        margin: 'auto',
                        width: clientPopoverPosition?.width || Math.min(280, typeof window !== 'undefined' ? window.innerWidth - 32 : 280),
                        maxWidth: 'calc(100vw - 32px)',
                        maxHeight: '85vh',
                        zIndex: 99999
                    }}
                    className="property-popover bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
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
                        {clients.length === 0 && !showAddClientInline && (
                            <div className="p-3 text-center space-y-2">
                                <p className="text-xs text-gray-500">אין לקוחות עדיין</p>
                                <button
                                    type="button"
                                    onClick={() => setShowAddClientInline(true)}
                                    className="w-full flex items-center justify-center gap-2 p-2.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200"
                                >
                                    <Plus size={14} /> הוסף לקוח חדש
                                </button>
                            </div>
                        )}
                        {showAddClientInline && (
                            <div className="p-3 space-y-2 bg-purple-50/50 rounded-xl border border-purple-100">
                                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">לקוח חדש</p>
                                <input
                                    type="text"
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    placeholder="שם החברה *"
                                    className="w-full px-3 py-2 text-xs border border-purple-200 rounded-lg outline-none focus:border-purple-500 bg-white"
                                    autoFocus
                                />
                                <input
                                    type="tel"
                                    value={newClientPhone}
                                    onChange={(e) => setNewClientPhone(e.target.value)}
                                    placeholder="טלפון"
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-purple-500 bg-white"
                                />
                                <input
                                    type="email"
                                    value={newClientEmail}
                                    onChange={(e) => setNewClientEmail(e.target.value)}
                                    placeholder="אימייל"
                                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-purple-500 bg-white"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddClientInline}
                                        disabled={!newClientName.trim() || isAddingClient}
                                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {isAddingClient ? 'שומר...' : 'הוסף'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddClientInline(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); }}
                                        className="py-2 px-3 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </div>
                        )}
                        {clients.map((c: Client) => (
                            <button 
                                key={c.id}
                                onClick={() => { setClientId(c.id); setActivePopover('none'); }}
                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50 transition-colors"
                            >
                                <img src={c.avatar} alt={c.companyName} className="w-8 h-8 rounded-lg border border-gray-100" />
                                <span className={`text-xs font-bold truncate ${clientId === c.id ? 'text-purple-700' : 'text-gray-700'}`}>{c.companyName}</span>
                                {clientId === c.id && <Check size={14} className="mr-auto text-purple-600" />}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </>,
            document.body
        )}

        {/* Desktop Popovers Portal */}
        {typeof window !== 'undefined' && popoverPosition && activePopover !== 'none' && createPortal(
            <AnimatePresence mode="wait">
                {activePopover === 'status' && popoverPosition && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{
                            position: 'fixed',
                            top: popoverPosition.top,
                            right: popoverPosition.right,
                            width: popoverPosition.width,
                            zIndex: 99999
                        }}
                        className="property-popover bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-2"
                    >
                        <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">סטטוס</div>
                        <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                            {workflowStages.map((s: WorkflowStage) => (
                                <button 
                                    key={s.id}
                                    onClick={() => { setStatus(s.id); setActivePopover('none'); }}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-colors ${status === s.id ? 'bg-gray-50 text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusSolidColor(s.color)}`}></div>
                                    {s.name}
                                    {status === s.id && <Check size={14} className="mr-auto text-black" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
                {activePopover === 'assignee' && popoverPosition && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{
                            position: 'fixed',
                            top: popoverPosition.top,
                            right: popoverPosition.right,
                            width: popoverPosition.width,
                            zIndex: 99999
                        }}
                        className="property-popover bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
                    >
                        <div className="p-3 bg-gray-50 border-b border-gray-100">
                            <input className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-black" placeholder="חפש עובד..." autoFocus />
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
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${assigneeId === u.id ? 'bg-gray-50 text-gray-900' : 'hover:bg-gray-50'}`}
                                >
                                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full border border-gray-100" />
                                    <div className="text-right flex-1 min-w-0">
                                        <div className="font-bold text-xs truncate">{u.name}</div>
                                        <div className="text-[10px] opacity-70 truncate">{u.role}</div>
                                    </div>
                                    {assigneeId === u.id && <Check size={14} className="text-black shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
                {activePopover === 'client' && popoverPosition && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{
                            position: 'fixed',
                            top: popoverPosition.top,
                            right: popoverPosition.right,
                            width: popoverPosition.width,
                            zIndex: 99999
                        }}
                        className="property-popover bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
                    >
                        <div className="p-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">לקוח</div>
                        <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                            <button 
                                onClick={() => { setClientId(''); setActivePopover('none'); }}
                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 text-gray-500 text-xs font-medium"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X size={14} /></div>
                                ללא לקוח
                            </button>
                            {clients.length === 0 && (
                                <div className="p-3 text-center">
                                    <p className="text-xs text-gray-400 mb-2">אין לקוחות עדיין</p>
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddClientInline(true); }}
                                        className="w-full flex items-center justify-center gap-2 p-2 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200"
                                    >
                                        <Plus size={14} /> הוסף לקוח חדש
                                    </button>
                                </div>
                            )}
                            {clients.map((c: Client) => (
                                <button 
                                    key={c.id}
                                    onClick={() => { setClientId(c.id); setActivePopover('none'); }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${clientId === c.id ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                                >
                                    <img src={c.avatar} alt={c.companyName} className="w-8 h-8 rounded-lg border border-gray-100" />
                                    <span className={`text-xs font-bold truncate flex-1 text-right ${clientId === c.id ? 'text-purple-700' : 'text-gray-700'}`}>{c.companyName}</span>
                                    {clientId === c.id && <Check size={14} className="text-purple-600 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
                {activePopover === 'priority' && popoverPosition && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{
                            position: 'fixed',
                            top: popoverPosition.top,
                            right: popoverPosition.right,
                            width: popoverPosition.width,
                            zIndex: 99999
                        }}
                        className="property-popover bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-2"
                    >
                        <div className="space-y-1">
                            {Object.values(Priority).map(p => (
                                <button
                                    key={p}
                                    onClick={() => { setPriority(p); setActivePopover('none'); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                                        priority === p ? 'bg-gray-50 text-gray-900' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${getPrioritySolidColor(p)}`}></div>
                                    {PRIORITY_LABELS[p]}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
                {activePopover === 'estimate' && popoverPosition && (
                    <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        style={{
                            position: 'fixed',
                            top: popoverPosition.top,
                            right: popoverPosition.right,
                            width: popoverPosition.width,
                            zIndex: 99999
                        }}
                        className="property-popover bg-white rounded-2xl shadow-xl border border-gray-200 p-6"
                    >
                                            <div className="flex items-center gap-2 text-gray-500 mb-4 border-b border-gray-100 pb-2">
                                                <Timer size={18} />
                                                <span className="font-bold text-sm">הערכת זמן משימה</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="flex-1 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={manualHours}
                                                        onChange={(e) => setManualHours(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e as unknown as React.FormEvent<HTMLElement>)}
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
            </AnimatePresence>,
            document.body
        )}

        {/* Portal for Tag Suggestions */}
        <TagSuggestionsPortal
            show={showTagSuggestions}
            filteredTags={filteredTags}
            tagInputRect={tagInputRect}
            tagDropdownRef={tagDropdownRef}
            onSelectTag={(t) => { setTag(t); setShowTagSuggestions(false); }}
        />
        </>
    );
};
