
import { useState, useEffect } from 'react';
import { OrganizationProfile, MonthlyGoals, AnalysisReport, SystemUpdate, FeatureRequest, ModuleId, SystemScreenStatus } from '../types';
import { SYSTEM_SCREENS } from '../constants';

export const useAdmin = (
    currentUser: any,
    addNotification: (n: any) => void,
    addToast: (m: string, t?: any) => void
) => {
    // Default enabled modules for the demo organization
    const [organization, setOrganization] = useState<OrganizationProfile>({ 
        name: 'Nexus Systems', 
        logo: '', 
        primaryColor: '#000000',
        enabledModules: ['crm', 'finance', 'ai', 'team'],
        systemFlags: SYSTEM_SCREENS.reduce((acc, screen) => ({ ...acc, [screen.id]: 'active' }), {})
    });
    const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals>({ revenue: 100000, tasksCompletion: 90 });
    const [departments, setDepartments] = useState<string[]>(['הנהלה', 'מכירות', 'תפעול', 'כספים', 'שיווק', 'חיצוני']);
    
    // Initialize history from local storage if needed, otherwise empty
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisReport[]>(() => {
        try {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('NEXUS_AI_HISTORY');
                return saved ? JSON.parse(saved) : [];
            }
        } catch (e) { console.error(e); }
        return [];
    });

    const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
    const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
    const [trashRequests, setTrashRequests] = useState<FeatureRequest[]>([]);
    
    // UI
    const [showMorningBrief, setShowMorningBrief] = useState(false);
    const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // Auto-save history to local storage and prune old items
    useEffect(() => {
        const cleanHistory = () => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            setAnalysisHistory(prev => {
                const filtered = prev.filter(item => new Date(item.date) > thirtyDaysAgo);
                try {
                    localStorage.setItem('NEXUS_AI_HISTORY', JSON.stringify(filtered));
                } catch (e) { console.error('Failed to save history', e); }
                return filtered;
            });
        };
        cleanHistory();
    }, []); // Run once on mount

    // Save whenever history changes
    useEffect(() => {
        try {
            localStorage.setItem('NEXUS_AI_HISTORY', JSON.stringify(analysisHistory));
        } catch (e) { console.error('Failed to save history', e); }
    }, [analysisHistory]);

    const updateOrganization = (updates: Partial<OrganizationProfile>) => {
        setOrganization(prev => ({ ...prev, ...updates }));
    };
    
    const updateMonthlyGoals = (goals: MonthlyGoals) => {
        setMonthlyGoals(goals);
        
        addNotification({
            recipientId: 'all',
            type: 'system',
            text: `🎯 יעדים חודשיים עודכנו! יעד הכנסות: ${goals.revenue.toLocaleString()}₪`,
            actorName: currentUser.name,
            actorAvatar: currentUser.avatar
        });
        
        addToast('יעדים חודשיים עודכנו ופורסמו לצוות', 'success');
    };

    const updateSettings = (key: string, value: any) => {
        if (key === 'departments') setDepartments(value);
        
        addNotification({
            recipientId: 'all',
            type: 'alert',
            text: `הגדרות מערכת עודכנו: ${key}`,
            actorName: currentUser.name
        });
    };

    const saveAnalysis = (report: AnalysisReport) => {
        setAnalysisHistory(prev => [report, ...prev]);
    };

    const deleteAnalysis = (id: string) => {
        setAnalysisHistory(prev => prev.filter(item => item.id !== id));
        addToast('הפריט נמחק מההיסטוריה', 'info');
    };

    const addFeatureRequest = (request: FeatureRequest) => {
        setFeatureRequests(prev => [request, ...prev]);
        addToast('בקשה הוגשה בהצלחה', 'success');
    };

    const deleteFeatureRequest = (id: string) => {
        const req = featureRequests.find(r => r.id === id);
        if (req) {
            setTrashRequests(prev => [req, ...prev]);
            setFeatureRequests(prev => prev.filter(r => r.id !== id));
            addToast('בקשה נמחקה (הועברה לארכיון)', 'info');
        }
    };

    const restoreFeatureRequest = (id: string) => {
        const req = trashRequests.find(r => r.id === id);
        if (req) {
            setFeatureRequests(prev => [req, ...prev]);
            setTrashRequests(prev => prev.filter(r => r.id !== id));
            addToast('בקשה שוחזרה', 'success');
        }
    };

    const permanentlyDeleteFeatureRequest = (id: string) => {
        setTrashRequests(prev => prev.filter(r => r.id !== id));
        addToast('בקשה נמחקה לצמיתות', 'warning');
    };

    const voteForFeature = (requestId: string) => {
        setFeatureRequests(prev => prev.map(req => {
            if (req.id === requestId) {
                const hasVoted = req.votes.includes(currentUser.id);
                return {
                    ...req,
                    votes: hasVoted ? req.votes.filter(v => v !== currentUser.id) : [...req.votes, currentUser.id]
                };
            }
            return req;
        }));
    };

    const publishSystemUpdate = (update: SystemUpdate) => {
        setSystemUpdates(prev => [update, ...prev]);
        addNotification({
            recipientId: 'all',
            type: 'system',
            text: `עדכון מערכת חדש: ${update.version}`,
            actorName: 'System'
        });
    };

    const deleteSystemUpdate = (id: string) => {
        setSystemUpdates(prev => prev.filter(u => u.id !== id));
        addToast('עדכון מערכת נמחק', 'info');
    };

    const updateSystemUpdate = (id: string, updates: Partial<SystemUpdate>) => {
        setSystemUpdates(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
        addToast('עדכון מערכת נערך בהצלחה', 'success');
    };

    // Helper to simulate "Signing in" as a specific tenant for testing the feature flags
    const switchToTenantConfig = (modules: ModuleId[]) => {
        setOrganization(prev => ({ ...prev, enabledModules: modules }));
    };

    const updateSystemFlag = (screenId: string, status: SystemScreenStatus) => {
        setOrganization(prev => ({
            ...prev,
            systemFlags: {
                ...prev.systemFlags,
                [screenId]: status
            }
        }));
        
        // Notify if maintenance mode
        if (status === 'maintenance') {
             addToast(`מסך ${screenId} עבר למצב תחזוקה`, 'warning');
        }
    };

    return {
        organization, monthlyGoals, departments, analysisHistory, systemUpdates, featureRequests, trashRequests,
        showMorningBrief, isCommandPaletteOpen,
        updateOrganization, updateMonthlyGoals, updateSettings, saveAnalysis, deleteAnalysis,
        addFeatureRequest, deleteFeatureRequest, restoreFeatureRequest, permanentlyDeleteFeatureRequest, voteForFeature,
        publishSystemUpdate, deleteSystemUpdate, updateSystemUpdate,
        setShowMorningBrief, setCommandPaletteOpen, setDepartments,
        switchToTenantConfig, updateSystemFlag
    };
};
