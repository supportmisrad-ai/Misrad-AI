
import { useState, useEffect } from 'react';
import { Notification, User } from '../types';

export const useNotifications = (currentUser: User, users: User[], addToast: (msg: string, type?: any) => void) => {
    // Initialize notifications from localStorage if available
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        try {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('NEXUS_NOTIFICATIONS');
                return saved ? JSON.parse(saved) : [];
            }
        } catch (e) { console.error('Failed to load notifications', e); }
        return [];
    });

    // Sync notifications to localStorage
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('NEXUS_NOTIFICATIONS', JSON.stringify(notifications));
            }
        } catch (e) { console.error('Failed to save notifications', e); }
    }, [notifications]);

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
