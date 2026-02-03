'use client';

import { useState, useEffect } from 'react';
import { Notification, Toast, User } from '../types';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

declare global {
    interface WindowEventMap {
        nexusNotificationsRefresh: Event;
    }
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export const useNotifications = (
    currentUser: User,
    users: User[],
    addToast: (msg: string, type?: Toast['type']) => void
) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const mergeServerNotifications = (serverRows: unknown[]) => {
        const mapped: Notification[] = (Array.isArray(serverRows) ? serverRows : []).map((row) => {
            const rowObj = asObject(row) ?? {};
            const metadataObj = asObject(rowObj.metadata) ?? {};
            const taskIdValue = metadataObj.taskId ?? rowObj.related_id ?? rowObj.relatedId;
            const createdAtValue = rowObj.created_at ?? rowObj.createdAt;
            const time = createdAtValue
                ? new Date(String(createdAtValue)).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

            const typeRaw = rowObj.type;
            const serverType = typeof typeRaw === 'string' ? typeRaw : String(typeRaw ?? '');
            const type: Notification['type'] =
                typeRaw === 'task_assigned' ? 'info' :
                typeRaw === 'task_status' ? 'info' :
                typeRaw === 'alert' ? 'alert' :
                typeRaw === 'mention' ? 'mention' :
                typeRaw === 'reward' ? 'reward' :
                'system';

            return {
                id: String(rowObj.id || `${rowObj.recipient_id}-${rowObj.related_id}-${createdAtValue}`),
                // Server is already scoped to the current user, but recipient_id may be a DB UUID.
                // Normalize to currentUser.id so UI filtering works consistently.
                recipientId: String(currentUser.id),
                type,
                text: typeof rowObj.text === 'string' ? rowObj.text : String(rowObj.text ?? ''),
                time,
                read: Boolean(rowObj.is_read ?? rowObj.isRead ?? false),
                actorName:
                    typeof rowObj.actor_name === 'string'
                        ? rowObj.actor_name
                        : typeof rowObj.actorName === 'string'
                            ? rowObj.actorName
                            : undefined,
                actorAvatar:
                    typeof rowObj.actor_avatar === 'string'
                        ? rowObj.actor_avatar
                        : typeof rowObj.actorAvatar === 'string'
                            ? rowObj.actorAvatar
                            : undefined,
                taskId: taskIdValue == null ? undefined : String(taskIdValue),
                serverType,
                metadata: metadataObj,
            };
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
            const data: unknown = await res.json();
            const dataObj = asObject(data) ?? {};
            const notificationsValue = dataObj.notifications;
            mergeServerNotifications(Array.isArray(notificationsValue) ? notificationsValue : []);
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
        window.addEventListener('nexusNotificationsRefresh', handler);
        return () => {
            window.removeEventListener('nexusNotificationsRefresh', handler);
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
