'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useData } from '../context/DataContext';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, User, Target, Zap, X, Check, Flame, Rocket, Image, SquareCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { Status, Priority, LeadStatus, User as UserType, type ModuleId } from '../types';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { getWorkspaceOrgSlugFromPathname, useNexusNavigation } from '@/lib/os/nexus-routing';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { upsertMyProfile } from '@/app/actions/profiles';
import { isCeoRole } from '@/lib/constants/roles';
import { DashboardOnboarding, DashboardOwnerPanel, DashboardQuickActions, DashboardKPIWidgets, DashboardFocusTasks } from './dashboard';
import type { OnboardingStep } from './dashboard';
import { listNexusUsers } from '@/app/actions/nexus';
import { AIAttentionCard } from '@/components/ai/AIAttentionCard';
// DashboardTasksClient removed from Nexus dashboard (tasks have a dedicated screen)
import { usePathname } from 'next/navigation';

type OwnerDashboardAction = {
    id: string;
    source: 'nexus' | 'system' | 'social' | 'finance' | 'client';
    title: string;
    subtitle?: string;
    href?: string;
    priority: 'urgent' | 'high' | 'normal';
};

type OwnerDashboardKpis = {
    nexus?: { tasksOpen?: number; tasksUrgent?: number };
    system?: { leadsTotal?: number; leadsHot?: number; leadsIncoming?: number };
    social?: { postsTotal?: number; postsDraft?: number; postsScheduled?: number; postsPublished?: number };
    finance?: { totalMinutes?: number; totalHours?: number } | { locked: true };
    [key: string]: unknown;
};

function isLockedFinance(value: OwnerDashboardKpis['finance']): value is { locked: true } {
    const obj = asObject(value);
    return Boolean(obj && obj.locked === true);
}

type OwnerDashboardData = {
    kpis?: OwnerDashboardKpis;
    nextActions?: OwnerDashboardAction[];
    [key: string]: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
    const v = obj?.[key];
    return typeof v === 'string' ? v : null;
}

function getNumberProp(obj: Record<string, unknown> | null, key: string): number | null {
    const v = obj?.[key];
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function getUiPreferences(user: unknown): Record<string, unknown> {
    const u = asObject(user);
    const prefs = asObject(u?.uiPreferences);
    return prefs ?? {};
}

function getOnboardingPrefs(user: unknown, onboardingKey: string): Record<string, unknown> {
    const prefs = getUiPreferences(user);
    const raw = prefs[onboardingKey];
    return asObject(raw) ?? {};
}

function coerceOwnerDashboardAction(value: unknown): OwnerDashboardAction | null {
    const obj = asObject(value);
    if (!obj) return null;
    const id = getStringProp(obj, 'id') ?? '';
    const title = getStringProp(obj, 'title') ?? '';
    const sourceRaw = getStringProp(obj, 'source') ?? '';
    const priorityRaw = getStringProp(obj, 'priority') ?? '';
    if (!id || !title) return null;

    const source: OwnerDashboardAction['source'] =
        sourceRaw === 'nexus' || sourceRaw === 'system' || sourceRaw === 'social' || sourceRaw === 'finance' || sourceRaw === 'client'
            ? sourceRaw
            : 'nexus';

    const priority: OwnerDashboardAction['priority'] =
        priorityRaw === 'urgent' || priorityRaw === 'high' || priorityRaw === 'normal' ? priorityRaw : 'normal';

    const subtitle = getStringProp(obj, 'subtitle') ?? undefined;
    const href = getStringProp(obj, 'href') ?? undefined;

    return { id, source, title, ...(subtitle ? { subtitle } : {}), ...(href ? { href } : {}), priority };
}

function coerceOwnerDashboardKpis(value: unknown): OwnerDashboardKpis | undefined {
    const obj = asObject(value);
    if (!obj) return undefined;

    const nexusObj = asObject(obj.nexus);
    const systemObj = asObject(obj.system);
    const socialObj = asObject(obj.social);
    const financeObj = asObject(obj.finance);

    const nexus = nexusObj
        ? { tasksOpen: getNumberProp(nexusObj, 'tasksOpen') ?? undefined, tasksUrgent: getNumberProp(nexusObj, 'tasksUrgent') ?? undefined }
        : undefined;
    const system = systemObj
        ? {
              leadsTotal: getNumberProp(systemObj, 'leadsTotal') ?? undefined,
              leadsHot: getNumberProp(systemObj, 'leadsHot') ?? undefined,
              leadsIncoming: getNumberProp(systemObj, 'leadsIncoming') ?? undefined,
          }
        : undefined;
    const social = socialObj
        ? {
              postsTotal: getNumberProp(socialObj, 'postsTotal') ?? undefined,
              postsDraft: getNumberProp(socialObj, 'postsDraft') ?? undefined,
              postsScheduled: getNumberProp(socialObj, 'postsScheduled') ?? undefined,
              postsPublished: getNumberProp(socialObj, 'postsPublished') ?? undefined,
          }
        : undefined;

    let finance: OwnerDashboardKpis['finance'] | undefined;
    if (financeObj) {
        const locked = Boolean(financeObj.locked);
        finance = locked
            ? { locked: true }
            : {
                  totalMinutes: getNumberProp(financeObj, 'totalMinutes') ?? undefined,
                  totalHours: getNumberProp(financeObj, 'totalHours') ?? undefined,
              };
    }

    return {
        ...(nexus ? { nexus } : {}),
        ...(system ? { system } : {}),
        ...(social ? { social } : {}),
        ...(finance ? { finance } : {}),
    };
}

function coerceOwnerDashboardData(value: unknown): OwnerDashboardData | null {
    const obj = asObject(value);
    if (!obj) return null;

    const nextActionsRaw = obj.nextActions;
    const nextActions = Array.isArray(nextActionsRaw)
        ? nextActionsRaw.map(coerceOwnerDashboardAction).filter((v): v is OwnerDashboardAction => Boolean(v))
        : undefined;

    const kpis = coerceOwnerDashboardKpis(obj.kpis);

    return {
        ...(kpis ? { kpis } : {}),
        ...(nextActions ? { nextActions } : {}),
    };
}

const TOUR_PROMPT_STORAGE_KEY = 'nexus_seen_tour_prompt_v1';

export const DashboardView: React.FC<{
    initialOwnerDashboard?: unknown;
    initialOnboardingTemplateKey?: string | null;
    initialBillingItems?: unknown[] | null;
}> = ({ initialOwnerDashboard, initialOnboardingTemplateKey, initialBillingItems }) => {
    const { currentUser, activeShift, clockIn, clockOut, tasks, leads, clients, products, monthlyGoals, updateMonthlyGoals, hasPermission, setShowMorningBrief, openTask, analysisHistory, openCreateTask, organization, addToast, startTutorial, timeEntries } = useData();
    const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
    const [users, setUsers] = useState<UserType[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { navigate, pathname } = useNexusNavigation();
    const authEffectKey = `${isClerkLoaded ? 1 : 0}:${isSignedIn ? 1 : 0}:${pathname || ''}`;
    const workspaceOrgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    const isHomeDashboard = useRef(false);
    isHomeDashboard.current = typeof pathname === 'string' ? /\/nexus\/?$/.test(pathname) : false;
    const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardData | null>(() => coerceOwnerDashboardData(initialOwnerDashboard));
    const [showOwnerDashboard, setShowOwnerDashboard] = useState(false);
    const [isPilotLoading, setIsPilotLoading] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [pilotErrorCount, setPilotErrorCount] = useState(0);

    const [showTourPrompt, setShowTourPrompt] = useState(false);
    
    const showExtraQuickActions = false;

    useEffect(() => {
        if (!isHomeDashboard.current) return;
        if (typeof window === 'undefined') return;
        try {
            const seen = window.localStorage.getItem(TOUR_PROMPT_STORAGE_KEY);
            if (!seen) setShowTourPrompt(true);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (!isHomeDashboard.current) return;
        if (typeof window === 'undefined') return;

        const url = new URL(window.location.href);
        const shouldStart = url.searchParams.get('tour') === '1';
        if (!shouldStart) return;

        url.searchParams.delete('tour');
        const nextSearch = url.searchParams.toString();
        window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`);

        setTimeout(() => startTutorial(), 0);
    }, [startTutorial]);
    
    const usersQuery = useQuery({
        queryKey: ['nexus', 'users', workspaceOrgSlug],
        queryFn: async () => {
            return listNexusUsers({ orgId: workspaceOrgSlug as string, page: 1, pageSize: 200 });
        },
        enabled: Boolean(workspaceOrgSlug),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchInterval: false,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    useEffect(() => {
        setIsRefreshing(Boolean(usersQuery.isFetching));
        const next = usersQuery.data?.users;
        if (Array.isArray(next)) {
            setUsers(next);
        }
    }, [usersQuery.data, usersQuery.isFetching]);

    // Load Pilot (Owner Control Center) KPIs + Next Actions
    useEffect(() => {
        if (initialOwnerDashboard) return;
        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (!orgSlug) return;

        if (pilotErrorCount >= 3) return;

        let cancelled = false;
        const load = async () => {
            setIsPilotLoading(true);
            try {
                const res = await fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/owner-dashboard`, { cache: 'no-store' });
                if (!res.ok) return;
                const json = (await res.json()) as unknown;
                const next = coerceOwnerDashboardData(json);
                if (!cancelled && next) setOwnerDashboard(next);
                if (!cancelled) setPilotErrorCount(0);
            } catch {
                // ignore
                if (!cancelled) setPilotErrorCount((c) => c + 1);
            } finally {
                if (!cancelled) setIsPilotLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [pathname, initialOwnerDashboard]);

    const [elapsed, setElapsed] = useState('00:00:00');
    const [isEditingGoals, setIsEditingGoals] = useState(false);
    const [tempGoals, setTempGoals] = useState(monthlyGoals);
    
    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(true);
    const onboardingPersistedRef = useRef(false);
    const onboardingKey = 'nexusOnboarding';

    const [onboardingTemplate, setOnboardingTemplate] = useState<string | null>(() => {
        const v = initialOnboardingTemplateKey;
        return typeof v === 'string' && v.trim() ? v : null;
    });
    const [isLoadingOnboardingTemplate, setIsLoadingOnboardingTemplate] = useState(false);
    const [isApplyingOnboardingTemplate, setIsApplyingOnboardingTemplate] = useState(false);

    const [billingItems, setBillingItems] = useState<unknown[] | null>(() => {
        return Array.isArray(initialBillingItems) ? initialBillingItems : null;
    });
    const [isLoadingBillingItems, setIsLoadingBillingItems] = useState(false);

    useEffect(() => {
        if (initialOnboardingTemplateKey !== undefined) return;
        if (onboardingTemplate) return;
        if (!isClerkLoaded || !isSignedIn) return;
        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (!orgSlug) return;

        let cancelled = false;
        const load = async () => {
            setIsLoadingOnboardingTemplate(true);
            try {
                const res = await fetch('/api/nexus/onboarding-template', {
                    headers: { 'x-org-id': encodeWorkspaceOrgSlug(orgSlug) },
                    cache: 'no-store',
                });
                if (!res.ok) return;
                const data = await res.json();
                const key = (data?.template && (data.template.key || data.template.templateKey)) || null;
                if (!cancelled) setOnboardingTemplate(typeof key === 'string' ? key : null);
            } catch {
                // ignore
            } finally {
                if (!cancelled) setIsLoadingOnboardingTemplate(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [authEffectKey, initialOnboardingTemplateKey, onboardingTemplate]);

    useEffect(() => {
        if (initialBillingItems !== undefined) return;
        if (billingItems) return;
        if (!isClerkLoaded || !isSignedIn) return;
        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (!orgSlug) return;

        let cancelled = false;
        const load = async () => {
            setIsLoadingBillingItems(true);
            try {
                const res = await fetch('/api/nexus/billing', {
                    headers: { 'x-org-id': encodeWorkspaceOrgSlug(orgSlug) },
                    cache: 'no-store',
                });
                if (!res.ok) return;
                const data = await res.json();
                const items = Array.isArray(data?.billing?.items) ? data.billing.items : null;
                if (!cancelled) setBillingItems(items);
            } catch {
                // ignore
            } finally {
                if (!cancelled) setIsLoadingBillingItems(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [authEffectKey, initialBillingItems, billingItems]);

    const applyNexusOnboardingTemplate = async (templateKey: 'retainer_fixed' | 'deliverables_package') => {
        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (!orgSlug) {
            addToast('לא ניתן לזהות סביבת עבודה (org). נסה לרענן.', 'error');
            return;
        }

        setIsApplyingOnboardingTemplate(true);
        try {
            const saveRes = await fetch('/api/nexus/onboarding-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-org-id': encodeWorkspaceOrgSlug(orgSlug),
                },
                body: JSON.stringify({ templateKey }),
            });

            if (!saveRes.ok) {
                const err = await saveRes.json().catch(() => null);
                throw new Error(err?.error || 'שגיאה בשמירת התבנית');
            }

            const applyRes = await fetch('/api/nexus/onboarding/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-org-id': encodeWorkspaceOrgSlug(orgSlug),
                },
                body: JSON.stringify({ templateKey }),
            });

            if (!applyRes.ok) {
                const err = await applyRes.json().catch(() => null);
                throw new Error(err?.error || 'שגיאה ביצירת משימות התחלה');
            }

            try {
                const billingRes = await fetch('/api/nexus/billing/apply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-org-id': encodeWorkspaceOrgSlug(orgSlug),
                    },
                    body: JSON.stringify({ templateKey }),
                });

                if (!billingRes.ok) {
                    addToast('המשימות נוצרו, אבל יצירת פריטי חיוב לא הושלמה. אפשר להגדיר ידנית בהמשך.', 'info');
                } else {
                    try {
                        const billingGet = await fetch('/api/nexus/billing', {
                            headers: { 'x-org-id': encodeWorkspaceOrgSlug(orgSlug) },
                            cache: 'no-store',
                        });
                        if (billingGet.ok) {
                            const data = await billingGet.json();
                            const items = Array.isArray(data?.billing?.items) ? data.billing.items : null;
                            setBillingItems(items);
                        }
                    } catch {
                        // ignore
                    }
                }
            } catch {
                addToast('המשימות נוצרו, אבל יצירת פריטי חיוב לא הושלמה. אפשר להגדיר ידנית בהמשך.', 'info');
            }

            setOnboardingTemplate(templateKey);
            addToast('התבנית הופעלה. יצרנו עבורך סט משימות התחלה.', 'success');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : '';
            addToast(message || 'שגיאה בהפעלת התבנית', 'error');
        } finally {
            setIsApplyingOnboardingTemplate(false);
        }
    };

    // Dynamic Onboarding Checks
    type OnboardingStep = {
        id: number;
        label: string;
        subLabel: string;
        done: boolean;
        icon: LucideIcon;
        action: () => void;
        color: string;
        moduleId?: ModuleId;
    };

    const onboardingStepsBase: OnboardingStep[] = [
        {
            id: 1,
            label: 'השלמת פרופיל',
            subLabel: 'הוסף טלפון ופרטים',
            done: !!currentUser.phone && currentUser.phone.length > 0,
            icon: User,
            action: () => navigate('/me?edit=profile&from=onboarding'),
            color: 'text-blue-600 bg-blue-50',
        },
        {
            id: 2,
            label: 'לוגו לעסק',
            subLabel: 'העלה לוגו לסביבת העבודה',
            done: Boolean(organization.logo && organization.logo.length > 0),
            icon: Image,
            action: () => navigate('/settings?tab=organization'),
            color: 'text-pink-600 bg-pink-50',
        },
        {
            id: 3,
            label: 'משימה ראשונה',
            subLabel: 'צור משימה במערכת',
            done: tasks.some((t) => t.creatorId === currentUser.id),
            icon: SquareCheck,
            action: () => openCreateTask(),
            color: 'text-purple-600 bg-purple-50',
        },
        {
            id: 4,
            label: 'כניסה למשמרת',
            subLabel: 'הפעל שעון נוכחות',
            done: !!activeShift || (Array.isArray(timeEntries) && timeEntries.some(t => t.userId === currentUser.id)) || tasks.some((t) => t.timeSpent > 0),
            icon: Clock,
            action: () => {
                if (typeof document === 'undefined') return;
                const clockElement = document.getElementById('time-clock-widget');
                if (clockElement) clockElement.scrollIntoView({ behavior: 'smooth' });
            },
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            id: 5,
            label: 'הזמנת עובד',
            subLabel: 'הוסף חבר צוות ראשון',
            done: users.length > 1,
            icon: Users,
            action: () => navigate('/team?newEmployee=1'),
            color: 'text-indigo-600 bg-indigo-50',
            moduleId: 'team' as ModuleId,
        },
        {
            id: 6,
            label: 'הכרת ה-AI',
            subLabel: 'בצע ניתוח ראשון',
            done: analysisHistory.length > 0,
            icon: Sparkles,
            action: () => navigate('/brain'),
            color: 'text-amber-600 bg-amber-50',
            moduleId: 'ai' as ModuleId,
        },
    ];

    const onboardingSteps = onboardingStepsBase.filter((step) => !step.moduleId || organization.enabledModules.includes(step.moduleId));

    const completedSteps = onboardingSteps.filter((s) => s.done).length;
    const progressPercent = (completedSteps / onboardingSteps.length) * 100;
    const isAllComplete = completedSteps === onboardingSteps.length;

    // Determine user state for smart widget display (must be after all dependencies are defined)
    const isNewUser = showOnboarding && !isAllComplete;
    const needsTemplate = !isLoadingOnboardingTemplate && !onboardingTemplate;
    const isOwnerOrCeo = isCeoRole(currentUser.role) || currentUser.isSuperAdmin;

    useEffect(() => {
        const existing = getOnboardingPrefs(currentUser, onboardingKey);
        const completedAt = getStringProp(existing, 'completedAt');
        const dismissedAt = getStringProp(existing, 'dismissedAt');
        if (completedAt) {
            setShowOnboarding(false);
            return;
        }
        if (dismissedAt) {
            setShowOnboarding(false);
            return;
        }
        setShowOnboarding(true);
    }, [currentUser.uiPreferences]);

    useEffect(() => {
        if (onboardingPersistedRef.current) return;
        if (!isAllComplete) return;

        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (!orgSlug) return;

        const existing = getOnboardingPrefs(currentUser, onboardingKey);
        const completedAt = getStringProp(existing, 'completedAt');
        if (completedAt) {
            onboardingPersistedRef.current = true;
            setShowOnboarding(false);
            return;
        }

        onboardingPersistedRef.current = true;
        setShowOnboarding(false);
        (async () => {
            try {
                const uiPreferences = getUiPreferences(currentUser);
                const nextPrefs = {
                    ...uiPreferences,
                    [onboardingKey]: {
                        ...existing,
                        completedAt: new Date().toISOString(),
                    },
                };
                await upsertMyProfile({
                    orgSlug,
                    updates: { uiPreferences: nextPrefs },
                });
            } catch {
                // ignore
            }
        })();
    }, [isAllComplete, pathname]);

    const dismissOnboarding = () => {
        setShowOnboarding(false);

        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
        if (!orgSlug) return;

        const existing = getOnboardingPrefs(currentUser, onboardingKey);
        const completedAt = getStringProp(existing, 'completedAt');
        if (completedAt) return;

        (async () => {
            try {
                const uiPreferences = getUiPreferences(currentUser);
                const nextPrefs = {
                    ...uiPreferences,
                    [onboardingKey]: {
                        ...existing,
                        dismissedAt: new Date().toISOString(),
                    },
                };
                await upsertMyProfile({
                    orgSlug,
                    updates: { uiPreferences: nextPrefs },
                });
            } catch {
                // ignore
            }
        })();
    };

    useEffect(() => {
        if (!activeShift) {
            setElapsed('00:00:00');
            return;
        }
        const updateElapsed = () => {
            const start = new Date(activeShift.startTime).getTime();
            const now = new Date().getTime();
            const diff = now - start;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeShift]);

    // Check granular permission for financials instead of hardcoded role check
    const canViewFinancials = hasPermission('view_financials') && organization.enabledModules.includes('finance');

    // --- FOCUS TASKS LOGIC (SYNCED) ---
    // 1. Get tasks explicitly marked as 'isFocus' from Morning Briefing
    const explicitFocusTasks = tasks.filter(
        (t) =>
            t.assigneeIds?.includes(currentUser.id) &&
            t.isFocus &&
            t.status !== Status.DONE &&
            t.status !== Status.CANCELED
    );

    // 2. Fallback heuristic if no tasks are marked (user skipped briefing)
    const fallbackTasks = tasks
        .filter(
            (t) =>
                t.assigneeIds?.includes(currentUser.id) &&
                t.status !== Status.DONE &&
                t.status !== Status.CANCELED &&
                t.priority === Priority.URGENT
        )
        .slice(0, 3);

    const focusTasks = explicitFocusTasks.length > 0 ? explicitFocusTasks : fallbackTasks;
    const isSynced = explicitFocusTasks.length > 0;

    const completedTasksCount = tasks.filter((t) => t.status === Status.DONE).length;
    const totalTasksCount = tasks.length;
    const completionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
    const taskProgress = Math.min((completionRate / monthlyGoals.tasksCompletion) * 100, 100);

    const recurringRevenue = clients.filter((c) => c.status === 'Active').reduce((sum: number, client) => {
            let price = 0;
            const product = products.find((p) => p.name === client.package);
            if (product) price = product.price;
            else {
                if(client.package.includes('Premium')) price = 15000;
                else if(client.package.includes('Mastermind')) price = 5000;
            }
            return sum + price;
        }, 0);

    const wonLeadsRevenue = leads.filter((l) => l.status === LeadStatus.WON).reduce((sum: number, lead) => sum + lead.value, 0);
    const totalRevenue = recurringRevenue + wonLeadsRevenue;
    const revenueGoal = monthlyGoals.revenue || 1; 
    const revenueProgress = Math.min((totalRevenue / revenueGoal) * 100, 100);

    const revenueHistory = [totalRevenue * 0.6, totalRevenue * 0.5, totalRevenue * 0.7, totalRevenue * 0.85, totalRevenue * 0.75, totalRevenue];
    const growth = ((revenueHistory[5] - revenueHistory[4]) / (revenueHistory[4] || 1)) * 100;

    // Correct Logic for Monthly Tasks: Check actual completion date, not creation date
    const myCompletedTasksThisMonth = tasks.filter((t) => {
        if (!t.assigneeIds?.includes(currentUser.id)) return false;
        if (t.status !== Status.DONE) return false;
        
        // If completion details exist, use that date
        if (t.completionDetails?.completedAt) {
            const completionDate = new Date(t.completionDetails.completedAt);
            const now = new Date();
            return completionDate.getMonth() === now.getMonth() && completionDate.getFullYear() === now.getFullYear();
        }
        
        // Fallback (should rarely happen for completed tasks)
        return false; 
    }).length;

    const myPersonalTarget = currentUser.targets?.tasksMonth || 0;
    const myProgressPercentage = myPersonalTarget > 0 ? Math.min((myCompletedTasksThisMonth / myPersonalTarget) * 100, 100) : 0;

    const handleSaveGoals = () => { updateMonthlyGoals(tempGoals); setIsEditingGoals(false); };
    const formatCurrency = (amount: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

    // Gamification Display
    const streak = currentUser.streakDays || 0;

        return (
        <div className="flex flex-col gap-8 pb-16 md:pb-20">
            <AnimatePresence mode="sync">
                {isEditingGoals && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditingGoals(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 flex flex-col p-6">
                            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-gray-900">הגדרת יעדים חודשיים</h3><button onClick={() => setIsEditingGoals(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">יעד הכנסות (₪)</label><input type="number" value={tempGoals.revenue} onChange={(e) => setTempGoals({...tempGoals, revenue: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 font-bold text-lg" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">יעד השלמת משימות (%)</label><input type="number" value={tempGoals.tasksCompletion} onChange={(e) => setTempGoals({...tempGoals, tasksCompletion: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 font-bold text-lg" max="100" /></div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setIsEditingGoals(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm">ביטול</button><button onClick={handleSaveGoals} className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm shadow-lg"><Check size={16} /> שמור יעדים</button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== SECTION 1: PRIMARY WIDGET (Onboarding / Template / Owner Dashboard) ===== */}
            
            {/* ONBOARDING WIDGET - For new users */}
            <AnimatePresence mode="sync">
                {isNewUser && (
                    <DashboardOnboarding
                        steps={onboardingSteps}
                        progressPercent={progressPercent}
                        onDismiss={dismissOnboarding}
                    />
                )}
            </AnimatePresence>

            {/* TEMPLATE SELECTION removed — not relevant for end users */}

            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight flex items-center gap-3" suppressHydrationWarning>
                        בוקר טוב, {currentUser.name.split(' ')[0]} 
                        <span className="inline-block animate-wave origin-bottom-right">👋</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                        <p className="text-gray-500 text-base md:text-lg">מוכן לכבוש את היום? הנה המצב שלך.</p>
                        {streak > 0 && (
                            <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 whitespace-nowrap" title="ימי עבודה רצופים בעמידה ביעדים">
                                <Flame size={14} fill="currentColor" className="animate-pulse" />
                                {streak} ימים ברצף!
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ===== SECTION 2: OWNER DASHBOARD (Only for CEO/Owners) ===== */}
            {ownerDashboard && showOwnerDashboard && isOwnerOrCeo && (
                <DashboardOwnerPanel
                    ownerDashboard={ownerDashboard}
                    isFocusMode={isFocusMode}
                    isPilotLoading={isPilotLoading}
                    onClose={() => { setShowOwnerDashboard(false); setIsFocusMode(false); }}
                    onToggleFocusMode={() => setIsFocusMode((v) => !v)}
                    onRefresh={() => {
                        const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
                        if (!orgSlug || isPilotLoading) return;
                        setIsPilotLoading(true);
                        fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/owner-dashboard`, { cache: 'no-store' })
                            .then((r) => (r.ok ? r.json() : null))
                            .then((data) => { if (data) { setOwnerDashboard(data); setPilotErrorCount(0); } })
                            .catch(() => setPilotErrorCount((c) => c + 1))
                            .finally(() => setIsPilotLoading(false));
                    }}
                />
            )}

            {/* ===== SECTION 2.5: AI ATTENTION CARD ===== */}
            {workspaceOrgSlug && (
                <AIAttentionCard orgSlug={workspaceOrgSlug} maxAlerts={3} />
            )}

            {/* ===== SECTION 3: QUICK ACTIONS ===== */}
            <DashboardQuickActions
                onCreateTask={() => openCreateTask()}
                onInviteEmployee={() => navigate('/team?newEmployee=1')}
                onMorningBrief={() => setShowMorningBrief(true)}
                onEditGoals={() => setIsEditingGoals(true)}
                onScrollToFocus={() => {
                    if (typeof document === 'undefined') return;
                    const el = document.querySelector('[data-focus-today]');
                    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                onNavigateTasks={() => navigate('/tasks')}
                isHomeDashboard={isHomeDashboard.current}
                isSynced={isSynced}
                showExtraQuickActions={showExtraQuickActions}
            />

            {/* ===== SECTION 4: KPI WIDGETS ===== */}
            <DashboardKPIWidgets
                canViewFinancials={canViewFinancials}
                totalRevenue={totalRevenue}
                revenueGoal={revenueGoal}
                revenueHistory={revenueHistory}
                growth={growth}
                formatCurrency={formatCurrency}
                onEditGoals={() => { setTempGoals(monthlyGoals); setIsEditingGoals(true); }}
                myCompletedTasksThisMonth={myCompletedTasksThisMonth}
                myPersonalTarget={myPersonalTarget}
                myProgressPercentage={myProgressPercentage}
                teamEnabled={organization.enabledModules.includes('team')}
                completionRate={completionRate}
                completedTasksCount={completedTasksCount}
                totalTasksCount={totalTasksCount}
                taskProgress={taskProgress}
                users={users}
                onNavigateTeam={() => navigate('/team')}
            />

            {/* ===== SECTION 5: FOCUS TASKS ===== */}
            <DashboardFocusTasks
                focusTasks={focusTasks}
                users={users}
                isSynced={isSynced}
                onOpenTask={(id) => openTask(id)}
                onNavigateTasks={() => navigate('/tasks')}
            />

        </div>
        );
};
