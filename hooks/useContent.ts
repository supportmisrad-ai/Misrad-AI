'use client';

import { useState } from 'react';
import { ContentItem, ContentStage, Notification, PlatformDefinition, Toast, User } from '../types';
import { DEFAULT_CONTENT_STAGES, DEFAULT_PLATFORMS } from '../constants';
import { isCeoRole } from '@/lib/constants/roles';

type ToastKind = Toast['type'];
type NotificationInput = Omit<Notification, 'id' | 'time' | 'read'>;

export const useContent = (
    currentUser: User,
    addNotification: (n: NotificationInput) => void,
    addToast: (m: string, t?: ToastKind) => void,
    users: User[]
) => {
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [contentStages, setContentStages] = useState<ContentStage[]>(DEFAULT_CONTENT_STAGES);
    const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
    const [trashContent, setTrashContent] = useState<ContentItem[]>([]);

    const addContent = (content: ContentItem) => {
        setContentItems(prev => [...prev, content]);
        addToast('תוכן נוסף לבנק', 'success');
        
        if (content.status === 'scheduled' && content.scheduledAt) {
            const contentManagers = users.filter(u => u.role === 'מנהל אופרציה ותוכן' || isCeoRole(u.role));
            contentManagers.forEach(u => {
                addNotification({
                    recipientId: u.id,
                    type: 'system',
                    text: `תוכן תוזמן לפרסום: ${content.title} (${new Date(content.scheduledAt!).toLocaleDateString()})`,
                    actorName: 'Studio',
                    actorAvatar: currentUser.avatar
                });
            });
        }
    };

    const updateContent = (id: string, updates: Partial<ContentItem>) => {
        setContentItems(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        
        if (updates.status === 'scheduled' && updates.scheduledAt) {
             const contentManagers = users.filter(u => u.role === 'מנהל אופרציה ותוכן' || isCeoRole(u.role));
             contentManagers.forEach(u => {
                 addNotification({
                    recipientId: u.id,
                    type: 'system',
                    text: `עדכון תזמון תוכן: ${updates.title || 'ללא כותרת'}`,
                    actorName: 'Studio'
                });
             });
        }
        addToast('התוכן עודכן', 'success');
    };

    const deleteContent = (id: string) => {
        const content = contentItems.find(c => c.id === id);
        if (content) {
            setTrashContent(prev => [content, ...prev]);
            setContentItems(prev => prev.filter(c => c.id !== id));
            addToast('תוכן הועבר לסל המיחזור', 'info');
        }
    };

    const restoreContent = (id: string) => {
        const content = trashContent.find(c => c.id === id);
        if (content) {
            setContentItems(prev => [content, ...prev]);
            setTrashContent(prev => prev.filter(c => c.id !== id));
            addToast('תוכן שוחזר בהצלחה', 'success');
        }
    };

    const permanentlyDeleteContent = (id: string) => {
        setTrashContent(prev => prev.filter(c => c.id !== id));
        addToast('תוכן נמחק לצמיתות', 'warning');
    };

    const deleteContentStage = (id: string) => {
        setContentStages(prev => prev.filter(s => s.id !== id));
        addToast('שלב תוכן נמחק', 'info');
    };

    const deletePlatform = (id: string) => {
        setPlatforms(prev => prev.filter(p => p.id !== id));
        addToast('פלטפורמה נמחקה', 'info');
    };

    return {
        contentItems, trashContent, contentStages, platforms,
        addContent, updateContent, deleteContent, restoreContent, permanentlyDeleteContent,
        deleteContentStage, deletePlatform, setContentStages, setPlatforms
    };
};
