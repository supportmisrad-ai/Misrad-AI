'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { useToasts } from '../hooks/useToasts';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useTasks } from '../hooks/useTasks';
import { useCRM } from '../hooks/useCRM';
import { useAdmin } from '../hooks/useAdmin';
import { useContent } from '../hooks/useContent';
import { GeneratedReport, Feedback, OrganizationProfile, User, Task } from '../types';

type SupportDraft = {
    category: string;
    subject: string;
    message: string;
};

type AdminReturn = ReturnType<typeof useAdmin>;
type AuthReturn = Omit<ReturnType<typeof useAuth>, keyof AdminReturn>;

export type DataContextValue =
    ReturnType<typeof useToasts> &
    AuthReturn &
    ReturnType<typeof useNotifications> &
    ReturnType<typeof useTasks> &
    ReturnType<typeof useContent> &
    ReturnType<typeof useCRM> &
    AdminReturn & {
        initialAdminKPIs?: unknown;

        activeCelebration: boolean;

        isTutorialActive: boolean;
        startTutorial: () => void;
        endTutorial: () => void;

        isSupportModalOpen: boolean;
        openSupport: (defaults?: Partial<SupportDraft>) => void;
        closeSupport: () => void;
        supportDraft: SupportDraft;
        setSupportDraft: React.Dispatch<React.SetStateAction<SupportDraft>>;

        feedbacks: Feedback[];
        addFeedback: (fb: Omit<Feedback, 'id' | 'date' | 'status'>) => void;

        systemReports: GeneratedReport[];
        markReportRead: (id: string) => void;
    };

export const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider = ({
    children,
    initialCurrentUser,
    initialOrganization,
    initialAdminKPIs,
    initialTasks,
}: {
    children: ReactNode;
    initialCurrentUser?: User;
    initialOrganization?: Partial<OrganizationProfile>;
    initialAdminKPIs?: unknown;
    initialTasks?: Task[];
}) => {
    // 1. Base Utilities
    const { toasts, addToast, removeToast } = useToasts();

    // 2. Auth & Users (Needs Toast)
    const auth = useAuth(addToast, initialCurrentUser);

    // 3. Notifications (Needs User)
    const notifications = useNotifications(auth.currentUser, auth.users, addToast);

    // 4. Tasks (Needs Notification & User) - with initialTasks preloaded from server
    const taskManager = useTasks(auth.currentUser, notifications.addNotification, addToast, initialTasks);

    // 4.5 Content/Studio (Needs Notification & User)
    const content = useContent(auth.currentUser, notifications.addNotification, addToast, auth.users);

    // 5. CRM (Needs Notification & User & Tasks Logic for Auto-Onboarding)
    const crm = useCRM(auth.currentUser, notifications.addNotification, addToast, taskManager.applyTemplate);

    // 6. Admin/System (Needs Notification)
    const admin = useAdmin(auth.currentUser, notifications.addNotification, addToast, initialOrganization);

    // 7. Tutorial State
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const startTutorial = useCallback(() => setIsTutorialActive(true), []);
    const endTutorial = useCallback(() => setIsTutorialActive(false), []);

    const activeCelebration = false;

    // 8. Support Draft State
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [supportDraft, setSupportDraft] = useState({ category: 'Tech', subject: '', message: '' });
    const openSupport = useCallback((defaults?: Partial<SupportDraft>) => {
        if (defaults) setSupportDraft(prev => ({ ...prev, ...defaults }));
        setIsSupportModalOpen(true);
    }, []);
    const closeSupport = useCallback(() => setIsSupportModalOpen(false), []);

    // 9. SaaS Admin Extras (Feedbacks & Reports) - Loaded from database
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [systemReports, setSystemReports] = useState<GeneratedReport[]>([]);

    const addFeedback = useCallback((fb: Omit<Feedback, 'id' | 'date' | 'status'>) => {
        const newFeedback: Feedback = {
            id: `fb-${Date.now()}`,
            date: new Date().toISOString(),
            status: 'new',
            ...fb
        };
        setFeedbacks(prev => [newFeedback, ...prev]);
    }, []);

    const markReportRead = useCallback((id: string) => {
        setSystemReports(prev => prev.map(r => r.id === id ? { ...r, isRead: true } : r));
    }, []);

    // Combine all hooks and state — NO useMemo! React 19 error #482 if any hook returns async value
    const value: DataContextValue = {
        toasts, addToast, removeToast,
        ...auth,
        ...notifications,
        ...taskManager,
        ...content,
        ...crm,
        ...admin,
        initialAdminKPIs,
        activeCelebration,
        isTutorialActive, startTutorial, endTutorial,
        isSupportModalOpen, openSupport, closeSupport, supportDraft, setSupportDraft,
        feedbacks, addFeedback,
        systemReports, markReportRead
    };

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
