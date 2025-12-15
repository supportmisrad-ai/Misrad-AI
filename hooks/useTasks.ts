
import { useState, useEffect } from 'react';
import { Task, WorkflowStage, Template, TaskCreationDefaults, TaskCompletionDetails, Attachment, AIAnalysisResult, Status, Priority, User } from '../types';
import { TASKS, DEFAULT_WORKFLOW, TEMPLATES } from '../constants';

export const useTasks = (
    currentUser: User, 
    addNotification: (n: any) => void, 
    addToast: (m: string, t?: any) => void
) => {
    const [tasks, setTasks] = useState<Task[]>(TASKS);
    const [trashTasks, setTrashTasks] = useState<Task[]>([]);
    const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>(DEFAULT_WORKFLOW);
    const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
    
    // UI State for tasks
    const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [createTaskDefaults, setCreateTaskDefaults] = useState<TaskCreationDefaults | null>(null);
    const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
    const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
    
    // Calendar Events (kept with tasks as they are related to scheduling)
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);
    const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

    // Timer Interval
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prev => prev.map(t => {
                if (t.isTimerRunning) {
                    return { ...t, timeSpent: (t.timeSpent || 0) + 1 };
                }
                return t;
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const addTask = (task: Task) => {
        setTasks(prev => [task, ...prev]);
        addToast('משימה נוצרה בהצלחה', 'success');
        
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
    };

    const deleteTask = (id: string) => {
        const taskToDelete = tasks.find(t => t.id === id);
        if (taskToDelete) {
            setLastDeletedTask(taskToDelete);
            setTasks(prev => prev.filter(t => t.id !== id));
            setTrashTasks(prev => [taskToDelete, ...prev]);
            addToast('משימה הועברה לסל המיחזור', 'info');
            setTimeout(() => setLastDeletedTask(null), 5000);

            if (taskToDelete.assigneeIds && taskToDelete.assigneeIds.length > 0) {
                const assigneesToNotify = taskToDelete.assigneeIds.filter(id => id !== currentUser.id);
                assigneesToNotify.forEach(uid => {
                    addNotification({
                        recipientId: uid,
                        type: 'alert',
                        text: `המשימה "${taskToDelete.title}" נמחקה והועברה לארכיון`,
                        actorName: currentUser.name,
                        actorAvatar: currentUser.avatar
                    });
                });
            }
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

    const toggleTimer = (taskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { ...t, isTimerRunning: !t.isTimerRunning };
            }
            return t;
        }));
    };

    const addMessage = (taskId: string, text: string, attachment?: Attachment, type: 'user' | 'system' | 'guest' = 'user') => {
        const newMessage = {
            id: `msg-${Date.now()}`,
            text,
            senderId: type === 'system' ? 'system' : currentUser.id,
            createdAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            type,
            attachment
        };
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, messages: [...t.messages, newMessage] } : t
        ));

        if (type === 'user') {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const recipients = new Set([...(task.assigneeIds || []), task.creatorId]);
                recipients.delete(currentUser.id);
                recipients.delete(undefined);

                recipients.forEach(uid => {
                    if (uid) {
                        addNotification({
                            recipientId: uid,
                            type: 'mention',
                            text: `תגובה חדשה במשימה: ${task.title}`,
                            actorName: currentUser.name,
                            actorAvatar: currentUser.avatar,
                            taskId: taskId
                        });
                    }
                });
            }
        }
    };

    const updateMessage = (taskId: string, messageId: string, text: string) => {
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { 
                ...t, 
                messages: t.messages.map(m => m.id === messageId ? { ...m, text } : m) 
            } : t
        ));
    };

    const deleteMessage = (taskId: string, messageId: string) => {
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { 
                ...t, 
                messages: t.messages.filter(m => m.id !== messageId) 
            } : t
        ));
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

    const connectGoogleCalendar = () => {
        setIsConnectingCalendar(true);
        setTimeout(() => {
            setIsConnectingCalendar(false);
            setIsCalendarConnected(true);
            setCalendarEvents([
                { id: 'cal-1', title: 'פגישת צוות', start: new Date(), end: new Date(new Date().getTime() + 3600000), color: '#3b82f6' },
                { id: 'cal-2', title: 'שיחה עם לקוח', start: new Date(new Date().getTime() + 86400000), end: new Date(new Date().getTime() + 90000000), color: '#10b981' }
            ]);
            addToast('יומן Google מחובר בהצלחה', 'success');
        }, 1500);
    };

    const openCreateTask = (defaults?: TaskCreationDefaults) => {
        setCreateTaskDefaults(defaults || null);
        setIsCreateTaskOpen(true);
    };
    const closeCreateTask = () => {
        setIsCreateTaskOpen(false);
        setCreateTaskDefaults(null);
    };
    const openTask = (taskId: string) => setOpenedTaskId(taskId);
    const closeTask = () => setOpenedTaskId(null);

    return {
        tasks, trashTasks, workflowStages, templates, 
        openedTaskId, isCreateTaskOpen, createTaskDefaults, taskToComplete, lastDeletedTask,
        calendarEvents, isCalendarConnected, isConnectingCalendar,
        addTask, updateTask, deleteTask, restoreTask, permanentlyDeleteTask, toggleTimer, snoozeTask,
        confirmCompleteTask, cancelCompleteTask, addMessage, updateMessage, deleteMessage, addGuestMessage, approveTaskByGuest,
        addVoiceTask, addTemplate, removeTemplate, applyTemplate, deleteWorkflowStage, connectGoogleCalendar,
        openCreateTask, closeCreateTask, openTask, closeTask, undoDelete, setWorkflowStages
    };
};