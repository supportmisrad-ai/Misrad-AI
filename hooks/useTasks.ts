'use client';

import { useState, useEffect } from 'react';
import { Notification, Task, WorkflowStage, Template, TaskCreationDefaults, TaskCompletionDetails, Attachment, AIAnalysisResult, Status, Priority, User } from '../types';
import { DEFAULT_WORKFLOW } from '../constants';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { deleteNexusTask, updateNexusTask } from '@/app/actions/nexus';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

type ToastKind = 'success' | 'error' | 'info' | 'warning';

type NotificationInput = Omit<Notification, 'id' | 'time' | 'read'>;

export const useTasks = (
    currentUser: User, 
    addNotification: (n: NotificationInput) => void, 
    addToast: (m: string, t?: ToastKind) => void
) => {

    const [tasks, setTasks] = useState<Task[]>([]);
    const [trashTasks, setTrashTasks] = useState<Task[]>([]);
    const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>(DEFAULT_WORKFLOW);
    const [templates, setTemplates] = useState<Template[]>([]);
    
    // UI State for tasks
    const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [createTaskDefaults, setCreateTaskDefaults] = useState<TaskCreationDefaults | null>(null);
    const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
    const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
    
    // Calendar Events (kept with tasks as they are related to scheduling)
    const [calendarEvents, setCalendarEvents] = useState<Record<string, unknown>[]>([]);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);
    const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

    // Load calendar connection status on mount (only once)
    useEffect(() => {
        let mounted = true;
        const checkCalendarStatus = async () => {
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const response = await fetch('/api/integrations/google/status?service=calendar', {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                });
                if (mounted && response.ok) {
                    const data: unknown = await response.json();
                    const dataObj = asObject(data);
                    const payload = asObject(dataObj?.data) ?? dataObj ?? data;
                    const payloadObj = asObject(payload) ?? {};
                    const statusObj = asObject(payloadObj.status) ?? {};
                    const calendarObj = asObject(statusObj.calendar) ?? {};
                    setIsCalendarConnected(Boolean(calendarObj.connected));
                }
            } catch (error: unknown) {
                // Silently fail - integration is optional
                if (mounted) {
                    setIsCalendarConnected(false);
                }
            }
        };
        checkCalendarStatus();
        return () => { mounted = false; };
    }, []);

    // Timer Interval
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prev => {
                if (!prev.some(t => t.isTimerRunning)) {
                    return prev;
                }
                let changed = false;
                const next = prev.map(t => {
                    if (t.isTimerRunning) {
                        changed = true;
                        return { ...t, timeSpent: (t.timeSpent || 0) + 1 };
                    }
                    return t;
                });
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const addTask = (task: Task, options?: { silent?: boolean }) => {
        setTasks(prev => [task, ...prev]);
        if (!options?.silent) {
            addToast('משימה נוצרה בהצלחה', 'success');
        }
        
        if (task.assigneeIds && task.assigneeIds.length > 0) {
            const assigneesToNotify = task.assigneeIds.filter(id => id !== currentUser.id);
            assigneesToNotify.forEach(assigneeId => {
                addNotification({
                    recipientId: assigneeId,
                    type: 'mention',
                    text: `משימה חדשה שויכה אליך: ${task.title}`,
                    actorName: currentUser.name,
                    actorAvatar: currentUser.avatar,
                    taskId: task.id
                });
            });
        }
    };

    const updateTask = (id: string, updates: Partial<Task>) => {
        const prevTask = tasks.find(t => t.id === id);

        // Optimistic update
        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                const updatedTask = { ...t, ...updates };
                
                if (updates.approvalStatus && updates.approvalStatus !== t.approvalStatus) {
                     const isApproved = updates.approvalStatus === 'approved';
                     if (t.assigneeIds && t.assigneeIds.length > 0) {
                         t.assigneeIds.forEach(uid => {
                             if (uid !== currentUser.id) { 
                                 addNotification({
                                     recipientId: uid,
                                     type: isApproved ? 'info' : 'alert',
                                     text: isApproved 
                                        ? `✅ בקשתך אושרה: "${t.title}". ניתן להתחיל לעבוד.` 
                                        : `❌ בקשתך נדחתה: "${t.title}". בדוק את ההערות.`,
                                     actorName: currentUser.name,
                                     actorAvatar: currentUser.avatar,
                                     taskId: t.id
                                 });
                             }
                         });
                     }
                }

                if (updates.status && updates.status !== t.status) {
                    const isDone = updates.status === 'Done';
                    const isWaiting = updates.status === 'Waiting for Review';
                    if (isDone || isWaiting) {
                        if (t.creatorId && t.creatorId !== currentUser.id) {
                            addNotification({
                                recipientId: t.creatorId,
                                type: 'info',
                                text: `סטטוס משימה השתנה ל-${updates.status}: ${t.title}`,
                                actorName: currentUser.name,
                                actorAvatar: currentUser.avatar,
                                taskId: t.id
                            });
                        }
                    }
                }
                
                if (updates.assigneeIds) {
                    const newAssignees = updates.assigneeIds.filter(uid => !t.assigneeIds?.includes(uid));
                    newAssignees.forEach(uid => {
                        if (uid !== currentUser.id) {
                            addNotification({
                                recipientId: uid,
                                type: 'mention',
                                text: `שויכת למשימה: ${t.title}`,
                                actorName: currentUser.name,
                                actorAvatar: currentUser.avatar,
                                taskId: t.id
                            });
                        }
                    });
                }
                return updatedTask;
            }
            return t;
        }));

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nexusTaskUpdated', { detail: { taskId: id, updates } }));
        }

        // Persist to DB via API (fire-and-forget). This is required for assignee/default-assignee.
        (async () => {
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                if (!orgSlug) {
                    throw new Error('לא ניתן לעדכן משימה: חסר מזהה ארגון (orgSlug).');
                }
                const updated = await updateNexusTask({ orgId: orgSlug, taskId: id, updates });
                setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updated } : t)));
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('nexusTaskUpdated', { detail: { taskId: id, updates: updated } })
                    );
                    window.dispatchEvent(new CustomEvent('nexusNotificationsRefresh'));
                }
            } catch (error: unknown) {
                // Rollback
                if (prevTask) {
                    setTasks(prev => prev.map(t => (t.id === id ? prevTask : t)));
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent('nexusTaskUpdated', { detail: { taskId: id, updates: prevTask } })
                        );
                    }
                }
                addToast(getErrorMessage(error) || 'שגיאה בעדכון המשימה', 'error');
            }
        })();
    };

    const deleteTask = async (id: string) => {
        const taskToDelete = tasks.find(t => t.id === id);
        if (!taskToDelete) return;

        // Optimistic UI: remove immediately
        setLastDeletedTask(taskToDelete);
        setTasks(prev => prev.filter(t => t.id !== id));
        setTrashTasks(prev => [taskToDelete, ...prev]);
        addToast('משימה נמחקה', 'info');
        setTimeout(() => setLastDeletedTask(null), 5000);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nexusTaskDeleted', { detail: { taskId: id } }));
        }

        // Persist deletion
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            if (!orgSlug) {
                throw new Error('לא ניתן למחוק משימה: חסר מזהה ארגון (orgSlug).');
            }

            await deleteNexusTask({ orgId: orgSlug, taskId: id });
        } catch (error: unknown) {
            // Rollback
            setTrashTasks(prev => prev.filter(t => t.id !== id));
            setTasks(prev => [taskToDelete, ...prev]);
            addToast(getErrorMessage(error) || 'שגיאה במחיקת משימה', 'error');

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nexusTaskRestored', { detail: { task: taskToDelete } }));
            }
            return;
        }

        if (taskToDelete.assigneeIds && taskToDelete.assigneeIds.length > 0) {
            const assigneesToNotify = taskToDelete.assigneeIds.filter(uid => uid !== currentUser.id);
            assigneesToNotify.forEach(uid => {
                addNotification({
                    recipientId: uid,
                    type: 'alert',
                    text: `המשימה "${taskToDelete.title}" נמחקה`,
                    actorName: currentUser.name,
                    actorAvatar: currentUser.avatar
                });
            });
        }
    };

    const undoDelete = () => {
        if (lastDeletedTask) {
            setTasks(prev => [...prev, lastDeletedTask]);
            setTrashTasks(prev => prev.filter(t => t.id !== lastDeletedTask.id));
            setLastDeletedTask(null);
            addToast('משימה שוחזרה', 'success');
        }
    };

    const restoreTask = (id: string) => {
        const task = trashTasks.find(t => t.id === id);
        if (task) {
            setTasks(prev => [...prev, task]);
            setTrashTasks(prev => prev.filter(t => t.id !== id));
            addToast('משימה שוחזרה בהצלחה', 'success');

            if (task.assigneeIds && task.assigneeIds.length > 0) {
                const assigneesToNotify = task.assigneeIds.filter(uid => uid !== currentUser.id);
                assigneesToNotify.forEach(uid => {
                    addNotification({
                        recipientId: uid,
                        type: 'info',
                        text: `המשימה "${task.title}" שוחזרה מהארכיון`,
                        actorName: currentUser.name,
                        actorAvatar: currentUser.avatar,
                        taskId: task.id
                    });
                });
            }
        }
    };

    const permanentlyDeleteTask = (id: string) => {
        setTrashTasks(prev => prev.filter(t => t.id !== id));
        addToast('משימה נמחקה לצמיתות', 'warning');
    };

    const toggleTimer = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newTimerState = !task.isTimerRunning;

        // Optimistic update
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { ...t, isTimerRunning: newTimerState };
            }
            return t;
        }));

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('nexusTaskUpdated', {
                    detail: { taskId, updates: { isTimerRunning: newTimerState } },
                })
            );
        }

        // Save to database via API
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            if (!orgSlug) {
                throw new Error('לא ניתן לעדכן טיימר: חסר מזהה ארגון (orgSlug).');
            }
            const updated = await updateNexusTask({ orgId: orgSlug, taskId, updates: { isTimerRunning: newTimerState } });
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, ...updated } : t
            ));
        } catch (error: unknown) {
            // Revert on error
            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    return { ...t, isTimerRunning: task.isTimerRunning };
                }
                return t;
            }));
            console.error('[Tasks] Failed to update timer', { message: getErrorMessage(error) });
            addToast(getErrorMessage(error) || 'שגיאה בעדכון הטיימר', 'error');

            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('nexusTaskUpdated', {
                        detail: { taskId, updates: { isTimerRunning: task.isTimerRunning } },
                    })
                );
            }
        }
    };

    const addMessage = async (taskId: string, text: string, attachment?: Attachment, type: 'user' | 'system' | 'guest' = 'user', taskOverride?: Task) => {
        const newMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text,
            senderId: type === 'system' ? 'system' : currentUser.id,
            createdAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            type,
            attachment
        };
        
        // Use taskOverride if provided, otherwise find in tasks array
        const updatedTask = taskOverride || tasks.find(t => t.id === taskId);
        if (!updatedTask) {
            console.error('[addMessage] Task not found:', taskId);
            addToast('שגיאה: המשימה לא נמצאה', 'error');
            return;
        }
        
        const newMessages = [...updatedTask.messages, newMessage];
        
        // Update local state immediately (optimistic update)
        setTasks(prev => {
            const existingTask = prev.find(t => t.id === taskId);
            if (existingTask) {
                // Update existing task in array
                return prev.map(t => 
                    t.id === taskId ? { ...t, messages: newMessages } : t
                );
            } else {
                // Add task to array if it doesn't exist (e.g., fetched from API)
                return [...prev, { ...updatedTask, messages: newMessages }];
            }
        });

        // Save to database
        try {
            await updateTask(taskId, { messages: newMessages });
        } catch (error: unknown) {
            console.error('[addMessage] Failed to save message to database:', error);
            // Revert optimistic update on error
            setTasks(prev => {
                const existingTask = prev.find(t => t.id === taskId);
                if (existingTask) {
                    return prev.map(t => 
                        t.id === taskId ? { ...t, messages: updatedTask.messages } : t
                    );
                } else {
                    // Remove task if it was just added
                    return prev.filter(t => t.id !== taskId);
                }
            });
            addToast('שגיאה בשמירת ההודעה', 'error');
            return;
        }

        if (type === 'user') {
            const recipients = new Set([...(updatedTask.assigneeIds || []), updatedTask.creatorId]);
            recipients.delete(currentUser.id);
            recipients.delete(undefined);

            recipients.forEach(uid => {
                if (uid) {
                    addNotification({
                        recipientId: uid,
                        type: 'mention',
                        text: `תגובה חדשה במשימה: ${updatedTask.title}`,
                        actorName: currentUser.name,
                        actorAvatar: currentUser.avatar,
                        taskId: taskId
                    });
                }
            });
        }
    };

    const updateMessage = async (taskId: string, messageId: string, text: string, taskOverride?: Task) => {
        // Use taskOverride if provided, otherwise find in tasks array
        const task = taskOverride || tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('[updateMessage] Task not found:', taskId);
            addToast('שגיאה: המשימה לא נמצאה', 'error');
            return;
        }
        
        const updatedMessages = task.messages.map(m => m.id === messageId ? { ...m, text } : m);
        
        // Update local state immediately (optimistic update)
        setTasks(prev => {
            const existingTask = prev.find(t => t.id === taskId);
            if (existingTask) {
                return prev.map(t => 
                    t.id === taskId ? { 
                        ...t, 
                        messages: updatedMessages
                    } : t
                );
            } else {
                // Add task to array if it doesn't exist
                return [...prev, { ...task, messages: updatedMessages }];
            }
        });
        
        // Save to database
        try {
            await updateTask(taskId, { messages: updatedMessages });
        } catch (error: unknown) {
            console.error('[updateMessage] Failed to save message update to database:', error);
            // Revert optimistic update on error
            setTasks(prev => {
                const existingTask = prev.find(t => t.id === taskId);
                if (existingTask) {
                    return prev.map(t => 
                        t.id === taskId ? { ...t, messages: task.messages } : t
                    );
                } else {
                    return prev.filter(t => t.id !== taskId);
                }
            });
            addToast('שגיאה בעדכון ההודעה', 'error');
        }
    };

    const deleteMessage = async (taskId: string, messageId: string, taskOverride?: Task) => {
        // Use taskOverride if provided, otherwise find in tasks array
        const task = taskOverride || tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('[deleteMessage] Task not found:', taskId);
            addToast('שגיאה: המשימה לא נמצאה', 'error');
            return;
        }
        
        const updatedMessages = task.messages.filter(m => m.id !== messageId);
        
        // Update local state immediately (optimistic update)
        setTasks(prev => {
            const existingTask = prev.find(t => t.id === taskId);
            if (existingTask) {
                return prev.map(t => 
                    t.id === taskId ? { 
                        ...t, 
                        messages: updatedMessages
                    } : t
                );
            } else {
                // Add task to array if it doesn't exist
                return [...prev, { ...task, messages: updatedMessages }];
            }
        });
        
        // Save to database
        try {
            await updateTask(taskId, { messages: updatedMessages });
        } catch (error: unknown) {
            console.error('[deleteMessage] Failed to delete message from database:', error);
            // Revert optimistic update on error
            setTasks(prev => {
                const existingTask = prev.find(t => t.id === taskId);
                if (existingTask) {
                    return prev.map(t => 
                        t.id === taskId ? { ...t, messages: task.messages } : t
                    );
                } else {
                    return prev.filter(t => t.id !== taskId);
                }
            });
            addToast('שגיאה במחיקת ההודעה', 'error');
        }
    };

    const addGuestMessage = (taskId: string, text: string) => {
        const newMessage = {
            id: `guest-${Date.now()}`,
            text,
            senderId: 'guest',
            createdAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            type: 'guest' as const
        };
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, messages: [...t.messages, newMessage] } : t
        ));
        
        const task = tasks.find(t => t.id === taskId);
        if (task && task.assigneeIds) {
            task.assigneeIds.forEach(uid => {
                addNotification({
                    recipientId: uid,
                    type: 'alert',
                    text: 'הודעה חדשה מאורח במשימה',
                    taskId
                });
            });
        }
    };

    const approveTaskByGuest = (taskId: string) => {
        updateTask(taskId, { approvalStatus: 'approved' });
        addMessage(taskId, '✅ המשימה אושרה על ידי הלקוח/אורח', undefined, 'system');
        
        const task = tasks.find(t => t.id === taskId);
        if (task && task.assigneeIds) {
            task.assigneeIds.forEach(uid => {
                addNotification({
                    recipientId: uid,
                    type: 'info',
                    text: 'משימה אושרה ע״י לקוח',
                    taskId
                });
            });
        }
        addToast('המשימה אושרה!', 'success');
    };

    const snoozeTask = (taskId: string, newDate: string, reason: string) => {
        const task = tasks.find(t => t.id === taskId);
        const newSnoozeCount = (task?.snoozeCount || 0) + 1;
        
        updateTask(taskId, { 
            dueDate: newDate, 
            snoozeCount: newSnoozeCount
        });
        addMessage(taskId, `🕰️ המשימה נדחתה ל-${newDate}. סיבה: ${reason}`, undefined, 'system');
        
        if (newSnoozeCount >= 3 && task?.creatorId && task.creatorId !== currentUser.id) {
             addNotification({
                recipientId: task.creatorId,
                type: 'alert',
                text: `⚠️ המשימה "${task.title}" נדחתה בפעם ה-${newSnoozeCount}. נדרשת התערבות ניהולית.`,
                actorName: currentUser.name,
                actorAvatar: currentUser.avatar,
                taskId: task.id
            });
        }
        addToast('המשימה נדחתה', 'info');
    };

    const confirmCompleteTask = (taskId: string, details: TaskCompletionDetails) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { 
                    ...t, 
                    status: 'Done', 
                    isTimerRunning: false,
                    completionDetails: details
                };
            }
            return t;
        }));
        setTaskToComplete(null);
        
        const task = tasks.find(t => t.id === taskId);
        if (task && task.creatorId && task.creatorId !== currentUser.id) {
            addNotification({
                recipientId: task.creatorId,
                type: 'info',
                text: `משימה הושלמה: ${task.title}`,
                actorName: currentUser.name,
                actorAvatar: currentUser.avatar,
                taskId: task.id
            });
        }
        addToast('משימה הושלמה! כל הכבוד 🎉', 'success');
    };

    const cancelCompleteTask = () => setTaskToComplete(null);

    const addVoiceTask = (audioBlob: Blob, analysis?: AIAnalysisResult) => {
        const newTask: Task = {
            id: `voice-${Date.now()}`,
            title: analysis?.title || 'הקלטה קולית חדשה',
            description: analysis?.description || 'עיבוד AI נכשל או לא זמין. האזן להקלטה.',
            priority: analysis?.priority || Priority.MEDIUM,
            status: Status.TODO,
            assigneeIds: [currentUser.id],
            tags: analysis?.tags || ['Voice'],
            createdAt: new Date().toISOString(),
            timeSpent: 0,
            isTimerRunning: false,
            messages: [],
            audioUrl: URL.createObjectURL(audioBlob)
        };
        addTask(newTask);
    };

    const addTemplate = (template: Template) => {
        setTemplates(prev => [...prev, template]);
        addToast('תבנית חדשה נוצרה', 'success');
    };

    const removeTemplate = (id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
        addToast('תבנית נמחקה', 'info');
    };

    // --- REBUILT LOGIC FOR REAL IMPLEMENTATION ---
    const applyTemplate = (templateId: string, clientId?: string, clientName?: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            const today = new Date();
            const newTasks: Task[] = [];

            template.items.forEach(item => {
                // Calculate real date based on offset
                const dueDateObj = new Date(today);
                dueDateObj.setDate(today.getDate() + item.daysDueOffset);
                const dueDateStr = dueDateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });

                // Construct Tags (Add client name if exists)
                const finalTags = [...item.tags];
                if (clientName && !finalTags.includes(clientName)) {
                    finalTags.push(clientName);
                }

                // Construct Description (Inject Client Context)
                const finalDescription = item.description 
                    ? `${item.description}\n\n(נוצר אוטומטית מתבנית: ${template.name})`
                    : `נוצר אוטומטית מתבנית: ${template.name}`;

                const newTask: Task = {
                    id: `TSK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    title: item.title,
                    description: finalDescription,
                    priority: item.priority,
                    status: Status.TODO,
                    assigneeIds: [], // Assignment logic would look up users by Role here if we had a user list in context easily accessible, for now empty for manual assignment or self
                    tags: finalTags,
                    createdAt: new Date().toISOString(),
                    dueDate: dueDateStr,
                    timeSpent: 0,
                    isTimerRunning: false,
                    messages: [],
                    clientId: clientId, // LINK THE TASK!
                    creatorId: currentUser.id
                };
                newTasks.push(newTask);
            });

            // Batch Add (simulated by loop since we don't have batch action)
            newTasks.forEach(t => addTask(t));
            
            addToast(`הופעלו ${newTasks.length} משימות מתוך "${template.name}"`, 'success');
        }
    };

    const deleteWorkflowStage = (id: string) => {
        setWorkflowStages(prev => prev.filter(s => s.id !== id));
        addToast('שלב בתהליך נמחק', 'info');
    };

    const connectGoogleCalendar = async () => {
        setIsConnectingCalendar(true);
        try {
            // Redirect to OAuth authorization
            window.location.href = '/api/integrations/google/authorize?service=calendar';
        } catch (error: unknown) {
            console.error('[Tasks] Error connecting Google Calendar', { message: getErrorMessage(error) });
            addToast('שגיאה בחיבור ל-Google Calendar', 'error');
            setIsConnectingCalendar(false);
        }
    };

    const openCreateTask = (defaults?: TaskCreationDefaults) => {
        setCreateTaskDefaults(defaults || null);
        setIsCreateTaskOpen(true);
    };
    const closeCreateTask = () => {
        setIsCreateTaskOpen(false);
        setCreateTaskDefaults(null);
    };
    const openTask = (taskId: string) => {
        setOpenedTaskId(taskId);
    };
    const closeTask = () => setOpenedTaskId(null);

    const replaceTasks = (next: Task[]) => {
        setTasks(Array.isArray(next) ? next : []);
    };

    return {
        tasks, trashTasks, workflowStages, templates, 
        openedTaskId, isCreateTaskOpen, createTaskDefaults, taskToComplete, lastDeletedTask,
        calendarEvents, isCalendarConnected, isConnectingCalendar,
        replaceTasks,
        addTask, updateTask, deleteTask, restoreTask, permanentlyDeleteTask, toggleTimer, snoozeTask,
        confirmCompleteTask, cancelCompleteTask, addMessage, updateMessage, deleteMessage, addGuestMessage, approveTaskByGuest,
        addVoiceTask, addTemplate, removeTemplate, applyTemplate, deleteWorkflowStage, connectGoogleCalendar,
        openCreateTask, closeCreateTask, openTask, closeTask, undoDelete, setWorkflowStages
    };
};