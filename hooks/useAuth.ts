
import { useState } from 'react';
import { User, TimeEntry, RoleDefinition, PermissionId, ChangeRequest } from '../types';
import { USERS, DEFAULT_ROLE_DEFINITIONS } from '../constants';

export const useAuth = (addToast: (msg: string, type?: any) => void) => {
    const [users, setUsers] = useState<User[]>(USERS);
    const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>(DEFAULT_ROLE_DEFINITIONS);
    const [currentUser, setCurrentUser] = useState<User>({
        ...USERS[0],
        billingInfo: {
            last4Digits: '8888',
            cardType: 'MasterCard',
            nextBillingDate: '2023-12-01',
            planName: 'Nexus Pro'
        },
        notificationPreferences: {
            emailNewTask: true,
            browserPush: true,
            morningBrief: true,
            soundEffects: false,
            marketing: true
        }
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [trashUsers, setTrashUsers] = useState<User[]>([]);
    const [trashTimeEntries, setTrashTimeEntries] = useState<TimeEntry[]>([]);
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

    const activeShift = timeEntries.find(t => t.userId === currentUser.id && !t.endTime) || null;

    const login = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            const userWithBilling = {
                ...user,
                billingInfo: user.billingInfo || (user.role.includes('מנכ') ? {
                    last4Digits: '8888',
                    cardType: 'MasterCard',
                    nextBillingDate: '2023-12-01',
                    planName: 'Nexus Enterprise'
                } : undefined),
                notificationPreferences: user.notificationPreferences || {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true
                }
            };
            setCurrentUser(userWithBilling);
            setIsAuthenticated(true);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, online: true } : u));
            addToast(`ברוך הבא, ${user.name}`, 'success');
        }
    };

    const logout = () => {
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, online: false } : u));
        setIsAuthenticated(false);
    };

    const switchUser = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            const userWithBilling = {
                ...user,
                billingInfo: user.billingInfo || undefined,
                notificationPreferences: user.notificationPreferences || {
                    emailNewTask: true,
                    browserPush: true,
                    morningBrief: true,
                    soundEffects: false,
                    marketing: true
                }
            };
            setCurrentUser(userWithBilling);
            addToast(`הוחלף משתמש ל-${user.name}`, 'info');
        }
    };

    const hasPermission = (permission: PermissionId): boolean => {
        if (currentUser.isSuperAdmin) return true;
        const role = roleDefinitions.find(r => r.name === currentUser.role);
        return role ? role.permissions.includes(permission) : false;
    };

    const addUser = (user: User) => {
        setUsers(prev => [...prev, user]);
        addToast('משתמש נוסף למערכת', 'success');
    };

    const updateUser = (id: string, updates: Partial<User>) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        if (id === currentUser.id) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
        if (Object.keys(updates).length > 0) {
             addToast('פרטי המשתמש עודכנו', 'success');
        }
    };

    const removeUser = (id: string) => {
        const user = users.find(u => u.id === id);
        if (user) {
            setTrashUsers(prev => [user, ...prev]);
            setUsers(prev => prev.filter(u => u.id !== id));
            addToast('משתמש הועבר לארכיון (סל המיחזור)', 'info');
        }
    };

    const restoreUser = (id: string) => {
        const user = trashUsers.find(u => u.id === id);
        if (user) {
            setUsers(prev => [...prev, user]);
            setTrashUsers(prev => prev.filter(u => u.id !== id));
            addToast('משתמש שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteUser = (id: string) => {
        setTrashUsers(prev => prev.filter(u => u.id !== id));
        addToast('משתמש נמחק לצמיתות', 'warning');
    };

    const clockIn = () => {
        const newEntry: TimeEntry = {
            id: `TE-${Date.now()}`,
            userId: currentUser.id,
            startTime: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };
        setTimeEntries(prev => [...prev, newEntry]);
        addToast('נכנסת למשמרת. עבודה נעימה!', 'success');
    };

    const clockOut = () => {
        if (activeShift) {
            const endTime = new Date().toISOString();
            const duration = (new Date(endTime).getTime() - new Date(activeShift.startTime).getTime()) / 60000;
            
            setTimeEntries(prev => prev.map(te => 
                te.id === activeShift.id 
                ? { ...te, endTime, durationMinutes: Math.round(duration) } 
                : te
            ));
            addToast('יצאת ממשמרת. תודה!', 'info');
        }
    };

    const addManualTimeEntry = (entry: TimeEntry) => {
        // Calculate duration if end time exists
        let durationMinutes = 0;
        if (entry.endTime) {
            const start = new Date(entry.startTime).getTime();
            const end = new Date(entry.endTime).getTime();
            durationMinutes = Math.round((end - start) / 60000);
        }

        const newEntry = { ...entry, durationMinutes };
        setTimeEntries(prev => [newEntry, ...prev]);
        addToast('דיווח שעות ידני נוסף בהצלחה', 'success');
    };

    const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
        setTimeEntries(prev => prev.map(t => {
            if (t.id === id) {
                const updatedEntry = { ...t, ...updates };
                
                // Recalculate duration if times changed
                if (updatedEntry.endTime) {
                    const start = new Date(updatedEntry.startTime).getTime();
                    const end = new Date(updatedEntry.endTime).getTime();
                    updatedEntry.durationMinutes = Math.round((end - start) / 60000);
                } else {
                    updatedEntry.durationMinutes = undefined;
                }
                
                return updatedEntry;
            }
            return t;
        }));
        addToast('דיווח השעות עודכן', 'success');
    };

    const deleteTimeEntry = (id: string, reason?: string) => {
        const entry = timeEntries.find(t => t.id === id);
        if (entry) {
            // Add audit info before deleting
            const voidedEntry = { 
                ...entry, 
                voidReason: reason || 'No reason provided',
                voidedBy: currentUser.name,
                voidedAt: new Date().toISOString()
            };
            
            setTrashTimeEntries(prev => [voidedEntry, ...prev]);
            setTimeEntries(prev => prev.filter(t => t.id !== id));
            addToast('דיווח שעות בוטל והועבר לארכיון', 'info');
        }
    };

    const restoreTimeEntry = (id: string) => {
        const entry = trashTimeEntries.find(t => t.id === id);
        if (entry) {
            setTimeEntries(prev => [...prev, entry]);
            setTrashTimeEntries(prev => prev.filter(t => t.id !== id));
            addToast('דיווח שעות שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteTimeEntry = (id: string) => {
        setTrashTimeEntries(prev => prev.filter(t => t.id !== id));
        addToast('דיווח שעות נמחק לצמיתות', 'warning');
    };

    const deleteRole = (name: string) => {
        setRoleDefinitions(prev => prev.filter(r => r.name !== name));
        addToast('תפקיד נמחק', 'info');
    };

    const requestNameChange = (newName: string) => {
        const request: ChangeRequest = {
            id: `req-${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            requestedName: newName,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        setChangeRequests(prev => [...prev, request]);
        addToast('בקשת שינוי שם נשלחה לאישור', 'success');
    };

    const approveNameChange = (requestId: string) => {
        const request = changeRequests.find(r => r.id === requestId);
        if (request) {
            updateUser(request.userId, { name: request.requestedName });
            setChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
            addToast('שינוי השם אושר', 'success');
        }
    };

    const rejectNameChange = (requestId: string) => {
        setChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
        addToast('שינוי השם נדחה', 'info');
    };

    return {
        users, roleDefinitions, currentUser, isAuthenticated, timeEntries, trashUsers, trashTimeEntries,
        activeShift, changeRequests,
        login, logout, switchUser, hasPermission, addUser, updateUser, removeUser, restoreUser,
        permanentlyDeleteUser, clockIn, clockOut, 
        addManualTimeEntry, updateTimeEntry, deleteTimeEntry, restoreTimeEntry, permanentlyDeleteTimeEntry,
        setRoleDefinitions, deleteRole, requestNameChange, approveNameChange, rejectNameChange
    };
};