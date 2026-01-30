'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import { useToasts } from '../hooks/useToasts';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useTasks } from '../hooks/useTasks';
import { useCRM } from '../hooks/useCRM';
import { useAdmin } from '../hooks/useAdmin';
import { GeneratedReport, Feedback } from '../types';

interface DataContextType {
    [key: string]: any;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider = ({
    children,
    initialCurrentUser,
    initialOrganization,
    initialAdminKPIs,
}: {
    children: ReactNode;
    initialCurrentUser?: any;
    initialOrganization?: any;
    initialAdminKPIs?: any;
}) => {
    // 1. Base Utilities
    const { toasts, addToast, removeToast } = useToasts();

    // 2. Auth & Users (Needs Toast)
    const auth = useAuth(addToast, initialCurrentUser);

    // 3. Notifications (Needs User)
    const notifications = useNotifications(auth.currentUser, auth.users, addToast);

    // 4. Tasks (Needs Notification & User)
    const taskManager = useTasks(auth.currentUser, notifications.addNotification, addToast);

    // 5. CRM (Needs Notification & User & Tasks Logic for Auto-Onboarding)
    const crm = useCRM(auth.currentUser, notifications.addNotification, addToast, taskManager.applyTemplate);

    // 6. Admin/System (Needs Notification)
    const admin = useAdmin(auth.currentUser, notifications.addNotification, addToast, initialOrganization);

    // 7. Tutorial State
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const startTutorial = () => setIsTutorialActive(true);
    const endTutorial = () => setIsTutorialActive(false);

    // 8. Support Draft State
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [supportDraft, setSupportDraft] = useState({ category: 'Tech', subject: '', message: '' });
    const openSupport = (defaults?: any) => {
        if (defaults) setSupportDraft(prev => ({ ...prev, ...defaults }));
        setIsSupportModalOpen(true);
    };
    const closeSupport = () => setIsSupportModalOpen(false);

    // 9. SaaS Admin Extras (Feedbacks & Reports) - Loaded from database
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [systemReports, setSystemReports] = useState<GeneratedReport[]>([]);

    const addFeedback = (fb: Omit<Feedback, 'id' | 'date' | 'status'>) => {
        const newFeedback: Feedback = {
            id: `fb-${Date.now()}`,
            date: new Date().toISOString(),
            status: 'new',
            ...fb
        };
        setFeedbacks(prev => [newFeedback, ...prev]);
    };

    const markReportRead = (id: string) => {
        setSystemReports(prev => prev.map(r => r.id === id ? { ...r, isRead: true } : r));
    };

    // Combine all hooks and state
    const value = useMemo(() => {
        return {
            toasts, addToast, removeToast,
            ...auth,
            ...notifications,
            ...taskManager,
            ...crm,
            ...admin,
            initialAdminKPIs,
            isTutorialActive, startTutorial, endTutorial,
            isSupportModalOpen, openSupport, closeSupport, supportDraft, setSupportDraft,
            feedbacks, addFeedback,
            systemReports, markReportRead
        };
    }, [
        toasts,
        addToast,
        removeToast,
        auth,
        notifications,
        taskManager,
        crm,
        admin,
        initialAdminKPIs,
        isTutorialActive,
        isSupportModalOpen,
        supportDraft,
        feedbacks,
        systemReports,
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
