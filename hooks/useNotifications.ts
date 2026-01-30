'use client';

import { useState, useEffect } from 'react';
import { Notification, User } from '../types';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

export const useNotifications = (currentUser: User, users: User[], addToast: (msg: string, type?: any) => void) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const mergeServerNotifications = (serverRows: any[]) => {
        const mapped: Notification[] = (Array.isArray(serverRows) ? serverRows : []).map((row: any) => {
            const metadata = row.metadata || {};
            const taskId = metadata.taskId || row.related_id || row.relatedId;
            const createdAt = row.created_at || row.createdAt;
            const time = createdAt
                ? new Date(createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

            const typeRaw = row.type;
            const type: Notification['type'] =
                typeRaw === 'task_assigned' ? 'info' :
                typeRaw === 'task_status' ? 'info' :
                typeRaw === 'alert' ? 'alert' :
                typeRaw === 'mention' ? 'mention' :
                typeRaw === 'reward' ? 'reward' :
                'system';

            return {
                id: String(row.id || `${row.recipient_id}-${row.related_id}-${createdAt}`),
                // Server is already scoped to the current user, but recipient_id may be a DB UUID.
                // Normalize to currentUser.id so UI filtering works consistently.
                recipientId: String(currentUser.id),
                type,
                text: String(row.text || ''),
                time,
                read: Boolean(row.is_read ?? row.isRead ?? false),
                actorName: row.actor_name || row.actorName,
                actorAvatar: row.actor_avatar || row.actorAvatar,
                taskId: taskId ? String(taskId) : undefined,
            } as Notification;
        });

        setNotifications(prev => {
            const byId = new Map<string, Notification>();
            // keep existing first
            prev.forEach(n => byId.set(String(n.id), n));
            // overwrite/add server
            mapped.forEach(n => byId.set(String(n.id), n));
            return Array.from(byId.values()).sort((a, b) => {
                // Sort: unread first, then newest-ish (we only have formatted time, so keep insertion order fallback)
                if (a.read !== b.read) return a.read ? 1 : -1;
                return 0;
            });
        });
    };

    const fetchServerNotifications = async () => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            if (!orgSlug) return;

            const res = await fetch('/api/notifications', {
                headers: {
                    'x-org-id': orgSlug,
                },
            });
            if (!res.ok) return;
            const data = await res.json();
            mergeServerNotifications(data?.notifications || []);
        } catch (e) {
            // ignore (notifications are non-blocking)
        }
    };

    // Initial load + periodic refresh
    useEffect(() => {
        fetchServerNotifications();
        const interval = setInterval(() => {
            fetchServerNotifications();
        }, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    // Refresh on demand (e.g., after task assignment)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => {
            fetchServerNotifications();
        };
        window.addEventListener('nexusNotificationsRefresh', handler as any);
        return () => {
            window.removeEventListener('nexusNotificationsRefresh', handler as any);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    const addNotification = (notification: Omit<Notification, 'id' | 'time' | 'read'>) => {
        const recipientId = notification.recipientId;
        
        let recipientUser: User | undefined;
        if (recipientId !== 'all') {
            recipientUser = users.find(u => u.id === recipientId);
        } else {
            recipientUser = currentUser; 
        }

        const prefs = recipientUser?.notificationPreferences;
        
        // Simulating preference checks
        if (notification.type === 'alert' && !prefs?.browserPush) {}
        if (notification.type === 'mention' && !prefs?.emailNewTask) {}

        const newNotification: Notification = {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            read: false,
            ...notification
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        
        // Play sound if enabled and it's for the current user
        if (prefs?.soundEffects && (recipientId === 'all' || recipientId === currentUser.id)) {
            // Placeholder for sound
        }
    };

    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllNotificationsRead = (ids?: string[]) => {
        if (ids && ids.length > 0) {
            setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
        } else {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAllNotifications = (ids?: string[]) => {
        if (ids && ids.length > 0) {
            setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
        } else {
            setNotifications(prev => prev.filter(n => n.recipientId !== currentUser.id && n.recipientId !== 'all'));
        }
        addToast('ההתראות נמחקו', 'info');
    };

    return { 
        notifications, addNotification, markNotificationRead, markAllNotificationsRead, 
        dismissNotification, clearAllNotifications 
    };
};
