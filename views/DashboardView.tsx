'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useData } from '../context/DataContext';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, Users, Target, ArrowRight, Zap, Trophy, ExternalLink, Edit2, X, Check, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2, Star, ThumbsUp, Sun, Compass, User, CheckSquare, Sparkles, ChevronRight, Flame, Rocket, Image as ImageIcon, Upload, Plus, Mic, type LucideIcon } from 'lucide-react';
import { Status, Priority, LeadStatus, User as UserType, type ModuleId } from '../types';
import { TaskCard } from '../components/nexus/TaskCard';
import { HoldButton } from '../components/HoldButton';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { getWorkspaceOrgSlugFromPathname, useNexusNavigation } from '@/lib/os/nexus-routing';
import { encodeWorkspaceOrgSlug } from '@/lib/os/social-routing';
import { upsertMyProfile } from '@/app/actions/profiles';
import { Skeleton } from '@/components/ui/skeletons';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { isCeoRole } from '@/lib/constants/roles';
import { listNexusUsers } from '@/app/actions/nexus';

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

const TrendChart = ({ data, color }: { data: number[], color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const height = 60;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - ((val - min) / (max - min || 1)) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative h-20 w-full overflow-hidden">
            <svg viewBox={`0 0 100 ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <path d={`M0,${height} ${points} 100,${height}`} fill={`url(#gradient-${color})`} className="opacity-30" />
                <path d={`M${String(points ?? '').replace(/ /g, ' L')}`} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className={color} strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" className={color} />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={color} />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};

export const DashboardView: React.FC<{
    initialOwnerDashboard?: unknown;
    initialOnboardingTemplateKey?: string | null;
    initialBillingItems?: unknown[] | null;
}> = ({ initialOwnerDashboard, initialOnboardingTemplateKey, initialBillingItems }) => {
    const renderCountRef = useRef(0);
    renderCountRef.current += 1;
    if (typeof window !== 'undefined' && renderCountRef.current <= 2) {
        console.log('[Nexus][DashboardView] render', { count: renderCountRef.current });
    }

    const { currentUser, activeShift, clockIn, clockOut, tasks, leads, clients, products, monthlyGoals, updateMonthlyGoals, hasPermission, setShowMorningBrief, openTask, analysisHistory, openCreateTask, organization, addToast, startTutorial } = useData();
    const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
    const [users, setUsers] = useState<UserType[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { navigate, pathname } = useNexusNavigation();
    const authEffectKey = `${isClerkLoaded ? 1 : 0}:${isSignedIn ? 1 : 0}:${pathname || ''}`;
    const workspaceOrgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    const isHomeDashboard = useRef(false);
    isHomeDashboard.current = typeof pathname === 'string' ? /\/nexus\/?$/.test(pathname) : false;
    const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardData | null>(() => coerceOwnerDashboardData(initialOwnerDashboard));
    const [showOwnerDashboard, setShowOwnerDashboard] = useState(true);
    const [isPilotLoading, setIsPilotLoading] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [pilotErrorCount, setPilotErrorCount] = useState(0);

    const [showTourPrompt, setShowTourPrompt] = useState(false);

    const showExtraQuickActions = false;

    useEffect(() => {
        console.log('[Nexus][DashboardView] mount');
        return () => {
            console.log('[Nexus][DashboardView] unmount');
        };
    }, []);

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
        staleTime: 30_000,
        refetchInterval: 60_000,
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
    
    // Logo Reminder State
    const [showLogoReminder, setShowLogoReminder] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            setShowLogoReminder(!localStorage.getItem('logo_reminder_dismissed'));
        } catch {
            setShowLogoReminder(true);
        }
    }, []);

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
            action: () => navigate('/me?edit=profile'),
            color: 'text-blue-600 bg-blue-50',
        },
        {
            id: 2,
            label: 'משימה ראשונה',
            subLabel: 'צור משימה במערכת',
            done: tasks.some((t) => t.creatorId === currentUser.id),
            icon: CheckSquare,
            action: () => openCreateTask(),
            color: 'text-purple-600 bg-purple-50',
        },
        {
            id: 3,
            label: 'כניסה למשמרת',
            subLabel: 'הפעל שעון נוכחות',
            done: !!activeShift || tasks.some((t) => t.timeSpent > 0),
            icon: Clock,
            action: () => {
                if (typeof document === 'undefined') return;
                const clockElement = document.getElementById('time-clock-widget');
                if (clockElement) clockElement.scrollIntoView({ behavior: 'smooth' });
            },
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            id: 4,
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
            <AnimatePresence>
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
            <AnimatePresence>
                {isNewUser && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="relative overflow-hidden rounded-[2.5rem] p-1 shadow-2xl mb-8"
                    >
                        {/* Gradient Border Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>
                        
                        <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.3rem] p-8 md:p-10 border border-white/50 overflow-hidden">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                            <button 
                                onClick={dismissOnboarding} 
                                className="absolute top-6 left-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-20"
                                aria-label="סגור תדריך התחלה"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                                {/* Left: Hero Section */}
                                <div className="lg:w-1/3 flex flex-col justify-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold w-fit mb-6 shadow-lg shadow-slate-900/20">
                                        <Rocket size={12} className="text-yellow-400" />
                                        <span>צעדים ראשונים</span>
                                    </div>
                                    
                                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
                                        ברוכים הבאים ל-<br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Nexus</span>
                                    </h2>
                                    
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-sm">
                                        המערכת שתעשה לך סדר בראש ובעסק. השלם את הצעדים כדי להתחיל ברגל ימין.
                                    </p>

                                    {/* Tour button integrated into onboarding */}
                                    {showTourPrompt && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                try {
                                                    if (typeof window !== 'undefined') {
                                                        window.localStorage.setItem(TOUR_PROMPT_STORAGE_KEY, 'true');
                                                    }
                                                } catch {
                                                    // ignore
                                                }
                                                setShowTourPrompt(false);
                                                setTimeout(() => startTutorial(), 100);
                                            }}
                                            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors"
                                        >
                                            <Compass size={16} />
                                            סיור מהיר במערכת (30 שניות)
                                        </button>
                                    )}

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                                            <span>התקדמות</span>
                                            <span>{Math.round(progressPercent)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${progressPercent}%` }} 
                                                transition={{ duration: 1, ease: "easeOut" }} 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)] relative"
                                            >
                                                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Steps Grid */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {onboardingSteps.map((step) => {
                                        const isDone = step.done;
                                        return (
                                            <button 
                                                key={step.id}
                                                onClick={step.action}
                                                disabled={isDone}
                                                className={`relative group flex flex-col p-5 rounded-3xl border text-right transition-all duration-300 overflow-hidden ${
                                                    isDone 
                                                    ? 'bg-slate-50 border-slate-200 opacity-60' 
                                                    : 'bg-white border-white shadow-lg shadow-slate-200/50 hover:border-indigo-100 hover:shadow-xl hover:-translate-y-1'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                                        isDone 
                                                        ? 'bg-green-100 text-green-600' 
                                                        : 'bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                    }`}>
                                                        {isDone ? <Check size={20} strokeWidth={3} /> : <step.icon size={22} />}
                                                    </div>
                                                    {!isDone && (
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                            <ChevronRight size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-auto">
                                                    <h3 className={`font-bold text-base mb-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                                        {step.label}
                                                    </h3>
                                                    <p className={`text-xs ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {step.subLabel}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TEMPLATE SELECTION - For owners who haven't selected yet (only if not showing onboarding) */}
            <AnimatePresence>
                {!isNewUser && needsTemplate && isOwnerOrCeo && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="mb-6"
                    >
                        <div className="relative bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm overflow-hidden">
                            <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-[60px]" />
                            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/10 rounded-full blur-[60px]" />

                            <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 text-indigo-600 font-black">
                                        <Rocket size={18} />
                                        <span>הגדרה מהירה</span>
                                    </div>
                                    <h3 className="mt-2 text-xl font-black text-gray-900">בחר תבנית עבודה לנקסוס</h3>
                                    <p className="mt-1 text-sm text-gray-500">בחר פעם אחת, ואנחנו ניצור סט משימות התחלה שמותאם לשיטת עבודה שלך.</p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => applyNexusOnboardingTemplate('retainer_fixed')}
                                        disabled={isApplyingOnboardingTemplate}
                                        className={`px-5 py-3 rounded-2xl font-bold text-sm border transition-all ${
                                            isApplyingOnboardingTemplate
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'bg-black text-white border-black hover:bg-gray-800'
                                        }`}
                                        type="button"
                                    >
                                        ריטיינר קבוע
                                    </button>
                                    <button
                                        onClick={() => applyNexusOnboardingTemplate('deliverables_package')}
                                        disabled={isApplyingOnboardingTemplate}
                                        className={`px-5 py-3 rounded-2xl font-bold text-sm border transition-all ${
                                            isApplyingOnboardingTemplate
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'bg-white text-gray-900 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                        type="button"
                                    >
                                        חבילת דליברבלס
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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

                {ownerDashboard && !showOwnerDashboard && (
                    <button
                        onClick={() => {
                            setShowOwnerDashboard(true);
                            setIsFocusMode(false);
                            if (typeof document !== 'undefined') {
                                setTimeout(() => {
                                    const el = document.querySelector('[data-owner-dashboard]');
                                    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 0);
                            }
                        }}
                        type="button"
                        className="h-11 px-5 rounded-xl bg-white/70 border border-slate-200 text-sm font-black text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all"
                        aria-label="הצג תמונת מצב לבעלים"
                    >
                        הצג תמונת מצב
                    </button>
                )}
            </div>

            {/* Tour prompt for non-new users who haven't seen it */}
            {!isNewUser && isHomeDashboard.current && showTourPrompt && (
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            try {
                                if (typeof window !== 'undefined') {
                                    window.localStorage.setItem(TOUR_PROMPT_STORAGE_KEY, 'true');
                                }
                            } catch {
                                // ignore
                            }
                            setShowTourPrompt(false);
                            setTimeout(() => startTutorial(), 100);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold text-slate-700 transition-colors"
                    >
                        <Compass size={16} />
                        סיור מהיר במערכת
                    </button>
                </div>
            )}

            {/* ===== SECTION 2: OWNER DASHBOARD (Only for CEO/Owners) ===== */}
            {ownerDashboard && showOwnerDashboard && isOwnerOrCeo && (
                <div className="relative overflow-hidden rounded-[2.5rem] p-1 shadow-2xl" data-owner-dashboard>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>

                    <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.3rem] p-6 sm:p-8 md:p-10 border border-white/50 overflow-hidden">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                        <div className="relative z-10 flex flex-col gap-8">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold w-fit shadow-lg shadow-slate-900/20">
                                        <Rocket size={12} className="text-yellow-400" />
                                        <span>תמונת מצב</span>
                                    </div>
                                    <h2 className="mt-4 text-2xl md:text-3xl font-black text-slate-900">תמונת מצב לבעלים</h2>
                                    <p className="mt-2 text-sm text-slate-500">מבט אחד על מה שקורה בעסק – לפי ההרשאות שלך</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setShowOwnerDashboard(false);
                                            setIsFocusMode(false);
                                        }}
                                        className="h-11 w-11 inline-flex items-center justify-center rounded-xl border bg-white/70 hover:bg-white border-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                                        aria-label="סגור תמונת מצב"
                                        title="סגור"
                                    >
                                        <X size={18} />
                                    </button>

                                    <button
                                        onClick={() => setIsFocusMode((v) => !v)}
                                        className={`h-11 px-4 rounded-xl border text-sm font-bold flex items-center gap-2 transition-colors ${isFocusMode ? 'bg-slate-900 text-white border-transparent shadow-lg shadow-slate-900/20' : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'}`}
                                        aria-label="מצב מיקוד"
                                    >
                                        <Zap size={16} />
                                        {isFocusMode ? 'יציאה' : 'מצב מיקוד'}
                                    </button>

                                    <button
                                        onClick={() => {
                                            const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
                                            if (!orgSlug) return;
                                            if (isPilotLoading) return;
                                            setIsPilotLoading(true);
                                            fetch(`/api/workspaces/${encodeWorkspaceOrgSlug(orgSlug)}/owner-dashboard`, { cache: 'no-store' })
                                                .then((r) => (r.ok ? r.json() : null))
                                                .then((data) => {
                                                    if (data) {
                                                        setOwnerDashboard(data);
                                                        setPilotErrorCount(0);
                                                    }
                                                })
                                                .catch(() => setPilotErrorCount((c) => c + 1))
                                                .finally(() => setIsPilotLoading(false));
                                        }}
                                        className="h-11 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-sm font-bold flex items-center gap-2 text-slate-700 transition-colors"
                                        aria-label="רענן תא טייס"
                                    >
                                        {isPilotLoading ? <Skeleton className="w-4 h-4 rounded-full" /> : <RefreshCw size={16} />}
                                        רענן
                                    </button>
                                </div>
                            </div>

                            {!isFocusMode && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {ownerDashboard?.kpis?.nexus && (
                                        <div className="ui-card p-5 transform-none hover:transform-none">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-500 font-bold">Nexus</div>
                                                <CheckSquare size={18} className="text-[#3730A3]" />
                                            </div>
                                            <div className="mt-3 text-3xl font-black">{ownerDashboard.kpis.nexus.tasksOpen ?? 0}</div>
                                            <div className="mt-1 text-xs text-slate-500">משימות פתוחות</div>
                                            <div className="mt-3 text-xs text-[#3730A3] font-bold">דחופות: {ownerDashboard.kpis.nexus.tasksUrgent ?? 0}</div>
                                        </div>
                                    )}

                                    {ownerDashboard?.kpis?.system && (
                                        <div className="ui-card p-5 transform-none hover:transform-none">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-500 font-bold">System</div>
                                                <Target size={18} className="text-[#3730A3]" />
                                            </div>
                                            <div className="mt-3 text-3xl font-black">{ownerDashboard.kpis.system.leadsTotal ?? 0}</div>
                                            <div className="mt-1 text-xs text-slate-500">לידים</div>
                                            <div className="mt-3 text-xs text-[#3730A3] font-bold">חמים: {ownerDashboard.kpis.system.leadsHot ?? 0}</div>
                                        </div>
                                    )}

                                    {ownerDashboard?.kpis?.social && (
                                        <div className="ui-card p-5 transform-none hover:transform-none">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-500 font-bold">Social</div>
                                                <Sparkles size={18} className="text-[#3730A3]" />
                                            </div>
                                            <div className="mt-3 text-3xl font-black">{ownerDashboard.kpis.social.postsTotal ?? 0}</div>
                                            <div className="mt-1 text-xs text-slate-500">פוסטים</div>
                                            <div className="mt-3 text-xs text-slate-500">מתוזמנים: {ownerDashboard.kpis.social.postsScheduled ?? 0}</div>
                                        </div>
                                    )}

                                    {ownerDashboard?.kpis?.finance && (
                                        <div className="ui-card p-5 transform-none hover:transform-none">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-500 font-bold">Finance</div>
                                                <DollarSign size={18} className="text-[#3730A3]" />
                                            </div>
                                            {isLockedFinance(ownerDashboard.kpis.finance) ? (
                                                <>
                                                    <div className="mt-3 text-2xl font-black">נעול</div>
                                                    <div className="mt-1 text-xs text-slate-500">אין הרשאת צפייה פיננסית</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="mt-3 text-3xl font-black">{ownerDashboard.kpis.finance.totalHours ?? 0}</div>
                                                    <div className="mt-1 text-xs text-slate-500">שעות עבודה (Time Entries)</div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="ui-card p-5 transform-none hover:transform-none">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-black">מה דחוף עכשיו</div>
                                        <div className="text-xs text-slate-500 mt-0.5">הפעולות הכי דחופות בכל המודולים</div>
                                    </div>
                                    <Zap size={18} className="text-[#3730A3]" />
                                </div>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(ownerDashboard?.nextActions || [])
                                        .filter((a) => (isFocusMode ? a.source === 'nexus' : true))
                                        .slice(0, 6)
                                        .map((a) => {
                                            const content = (
                                                <>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-xs text-slate-500 font-bold">{String(a.source || '').toUpperCase()}</div>
                                                        <div className={`text-[10px] font-black px-2 py-1 rounded-full border ${a.priority === 'urgent' ? 'bg-[#3730A3]/5 border-[#3730A3]/20 text-[#3730A3]' : a.priority === 'high' ? 'bg-[#3730A3]/5 border-[#3730A3]/20 text-[#3730A3]' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                                            {a.priority === 'urgent' ? 'דחוף' : a.priority === 'high' ? 'גבוה' : 'רגיל'}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 font-bold text-slate-900">{a.title}</div>
                                                    {a.subtitle && <div className="mt-1 text-xs text-slate-500">{a.subtitle}</div>}
                                                </>
                                            );

                                            if (a.href) {
                                                return (
                                                    <Link
                                                        key={a.id}
                                                        href={a.href}
                                                        className="text-right ui-card p-4 transition-colors block transform-none hover:transform-none"
                                                    >
                                                        {content}
                                                    </Link>
                                                );
                                            }

                                            return (
                                                <div key={a.id} className="text-right ui-card p-4 transform-none hover:transform-none">
                                                    {content}
                                                </div>
                                            );
                                        })}

                                    {(ownerDashboard?.nextActions || []).filter((a) => (isFocusMode ? a.source === 'nexus' : true)).length === 0 && (
                                        <div className="text-sm text-slate-500">אין פעולות דחופות כרגע</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(() => {
                // Hidden for now (visual noise cleanup): "גבייה" + "הסבר"
                return null;
            })()}

            {/* CEO Logo Reminder - Only for CEO/Manager */}
            <AnimatePresence>
                {showLogoReminder && (!organization.logo || organization.logo === '') && (isCeoRole(currentUser.role) || currentUser.isSuperAdmin) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg mb-8"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <ImageIcon className="text-blue-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-gray-900 mb-1">הוסף לוגו לעסק</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    הלוגו יוצג במסכי הכניסה, במיילים שנשלחים ללקוחות, ובקישורים החד פעמיים. זה חשוב לזהות העסקית שלך.
                                </p>
                                <button
                                    onClick={() => navigate('/settings?tab=organization')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    <Upload size={16} />
                                    הוסף לוגו עכשיו
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    // Store dismissal in localStorage
                                    localStorage.setItem('logo_reminder_dismissed', 'true');
                                    setShowLogoReminder(false);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="סגור תזכורת"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== SECTION 3: QUICK ACTIONS ===== */}
            <div className="mt-4">
                <div className="w-full max-w-none mx-auto px-2">
                    <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-5 md:p-6 border border-white/50 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="text-right">
                                <div className="text-base md:text-lg font-black text-slate-900 tracking-tight">פעולות מהירות</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
                            <button
                                id="create-task-btn"
                                onClick={() => openCreateTask()}
                                type="button"
                                className="group rounded-3xl border border-white/70 bg-white/70 hover:bg-white transition-all shadow-sm hover:shadow-md p-4 text-right"
                                aria-label="משימה חדשה"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/15 mb-3 group-hover:scale-105 transition-transform relative mr-auto">
                                    <Plus size={18} />
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (typeof window !== 'undefined') {
                                                window.dispatchEvent(new CustomEvent('nexus:open-voice-recorder'));
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key !== 'Enter' && e.key !== ' ') return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (typeof window !== 'undefined') {
                                                window.dispatchEvent(new CustomEvent('nexus:open-voice-recorder'));
                                            }
                                        }}
                                        className="absolute -bottom-1 -left-1 w-6 h-6 rounded-xl bg-white text-slate-900 border border-slate-200 flex items-center justify-center shadow-sm"
                                        aria-label="הקלטת משימה"
                                    >
                                        <Mic size={12} />
                                    </span>
                                </div>
                                <div className="font-black text-sm text-slate-900">משימה חדשה</div>
                                <div className="mt-1 text-[10px] font-bold text-slate-500">התחלה מהירה</div>
                            </button>

                            <button
                                onClick={() => navigate('/team?newEmployee=1')}
                                type="button"
                                className="group rounded-3xl border border-white/70 bg-white/70 hover:bg-white transition-all shadow-sm hover:shadow-md p-4 text-right"
                                aria-label="עובד חדש"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                    <Users size={18} />
                                </div>
                                <div className="font-black text-sm text-slate-900">עובד חדש</div>
                                <div className="mt-1 text-[10px] font-bold text-slate-500">הזמנה / הוספה</div>
                            </button>

                            {/* Morning Briefing - always show in quick actions */}
                            {isHomeDashboard.current && (
                                <button
                                    onClick={() => setShowMorningBrief(true)}
                                    type="button"
                                    className="group relative rounded-3xl border border-white/70 bg-white/70 hover:bg-white transition-all shadow-sm hover:shadow-md p-4 text-right"
                                    aria-label="תדריך בוקר"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                        <Sun size={18} />
                                    </div>
                                    <div className="font-black text-sm text-slate-900">תדריך בוקר</div>
                                    <div className="mt-1 text-[10px] font-bold text-slate-500">מיקוד להיום</div>
                                    {!isSynced && (
                                        <span className="absolute top-3 left-3 flex h-2.5 w-2.5" aria-hidden>
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                        </span>
                                    )}
                                </button>
                            )}

                            {showExtraQuickActions && (
                                <>
                                    <button
                                        onClick={() => navigate('/tasks')}
                                        type="button"
                                        className="group rounded-3xl border border-white/70 bg-white/70 hover:bg-white transition-all shadow-sm hover:shadow-md p-4 text-right"
                                        aria-label="משימות"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-700 flex items-center justify-center border border-yellow-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                            <Zap size={18} />
                                        </div>
                                        <div className="font-black text-sm text-slate-900">משימות</div>
                                        <div className="mt-1 text-[10px] font-bold text-slate-500">לכל המשימות</div>
                                    </button>

                                    <button
                                        onClick={() => setIsEditingGoals(true)}
                                        type="button"
                                        className="group rounded-3xl border border-white/70 bg-white/70 hover:bg-white transition-all shadow-sm hover:shadow-md p-4 text-right"
                                        aria-label="יעדים חודשיים"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                            <Target size={18} />
                                        </div>
                                        <div className="font-black text-sm text-slate-900">יעדים חודשיים</div>
                                        <div className="mt-1 text-[10px] font-bold text-slate-500">עדכון מהיר</div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (typeof document === 'undefined') return;
                                            const el = document.querySelector('[data-focus-today]');
                                            if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                        type="button"
                                        className="group rounded-3xl border border-white/70 bg-white/70 hover:bg-white transition-all shadow-sm hover:shadow-md p-4 text-right"
                                        aria-label="המיקוד להיום"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                            <Compass size={18} />
                                        </div>
                                        <div className="font-black text-sm text-slate-900">המיקוד להיום</div>
                                        <div className="mt-1 text-[10px] font-bold text-slate-500">לראות מה חשוב</div>
                                    </button>
                                </>
                            )}
                        </div>

                        {isHomeDashboard.current && workspaceOrgSlug ? (
                            <div className="mt-5 pt-5 border-t border-white/50">
                                <OSAppSwitcher
                                    mode="inlineGrid"
                                    compact={true}
                                    hideLockedModules={true}
                                    orgSlug={workspaceOrgSlug}
                                    className="w-full"
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ===== SECTION 4: KPI WIDGETS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {/* 1. Time Clock Widget - Glass */}
                <div id="time-clock-widget" className={`relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 min-h-[240px] ${activeShift ? 'bg-black/90 text-white border border-white/10' : 'bg-white/60 border border-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)]'}`}>
                    {activeShift && (
                        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-green-500/20 rounded-full blur-[80px] animate-pulse"></div>
                    )}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[240px]">
                        <div className="flex justify-between items-start">
                            <div className={`p-3.5 rounded-2xl ${activeShift ? 'bg-white/10 text-green-400' : 'bg-white text-gray-900 shadow-sm'}`}>
                                <Clock size={28} />
                            </div>
                            {activeShift && <span className="bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full animate-pulse shadow-lg shadow-green-500/40 border border-white/20">משמרת פעילה</span>}
                        </div>
                        <div className="mt-6 text-center">
                            {activeShift ? (
                                <>
                                    <div className="text-6xl font-mono font-bold tracking-tighter tabular-nums leading-none mb-2 drop-shadow-lg">{elapsed}</div>
                                    <div className="flex justify-center mt-8"><HoldButton isActive={true} onComplete={clockOut} label="יציאה" size="small" /></div>
                                </>
                            ) : (
                                <>
                                    <div className="text-4xl font-bold tracking-tight text-gray-300 mb-6">00:00:00</div>
                                    <div className="flex justify-center"><HoldButton isActive={false} onComplete={clockIn} label="כניסה" size="small" /></div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Business Health - Glass */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full min-h-[240px] relative group overflow-hidden hover:shadow-2xl hover:bg-white/80 transition-all duration-500">
                    {canViewFinancials ? (
                        <>
                            <div className="flex items-center justify-between mb-4 z-10 relative">
                                <div className="flex items-center gap-4">
                                    <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><TrendingUp size={28} /></div>
                                    <div><h3 className="font-bold text-gray-900 text-lg">הכנסות</h3><p className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} /> Live</p></div>
                                </div>
                                <button onClick={() => { setTempGoals(monthlyGoals); setIsEditingGoals(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" aria-label="ערוך יעדים חודשיים"><Edit2 size={18} /></button>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-end justify-between mb-6">
                                    <div>
                                        <div className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(totalRevenue)}</div>
                                        <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>{growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(Math.round(growth))}% צמיחה</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">יעד</div>
                                        <div className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg inline-block">{formatCurrency(revenueGoal)}</div>
                                    </div>
                                </div>
                                <div className="-mx-4 -mb-4 opacity-50 group-hover:opacity-100 transition-opacity"><TrendChart data={revenueHistory} color="text-blue-500" /></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 mb-6 z-10 relative">
                                <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl shadow-sm"><Target size={28} /></div>
                                <div><h3 className="font-bold text-gray-900 text-lg">יעדים אישיים</h3><p className="text-sm text-gray-500">החודש הזה</p></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm font-bold mb-3"><span className="text-gray-700">ביצוע משימות</span><span className="text-gray-900">{myCompletedTasksThisMonth} / {myPersonalTarget}</span></div>
                                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden relative shadow-inner">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${myProgressPercentage}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-lg" />
                                    </div>
                                </div>
                                {myProgressPercentage >= 100 ? (
                                    <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 p-3 rounded-2xl animate-pulse shadow-sm border border-green-100"><Trophy size={16} /> עמדת ביעד החודשי!</div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 p-3 rounded-2xl shadow-sm border border-blue-100"><ThumbsUp size={16} /> קצב מצוין!</div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Team Widget - Glass (Only if Team module enabled) */}
                {organization.enabledModules.includes('team') && (
                <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col h-full min-h-[240px] hidden lg:flex hover:shadow-2xl hover:bg-white/80 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shadow-sm"><Users size={28} /></div>
                            <div><h3 className="font-bold text-gray-900 text-lg">הצוות</h3><p className="text-sm text-gray-500">{Math.round(completionRate)}% מהמשימות</p></div>
                        </div>
                        <button onClick={() => navigate('/team')} className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-xl" aria-label="עבור לצוות"><ArrowRight size={24} /></button>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-bold mb-2"><span className="text-gray-500 uppercase tracking-wider">סטטוס חודשי</span><span className="text-gray-900">{completedTasksCount} / {totalTasksCount}</span></div>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${taskProgress}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-lg" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3 space-x-reverse">
                                {users.filter((u) => u.online).slice(0, 3).map((u) => (
                                    <img key={u.id} src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white ring-2 ring-green-400 shadow-md object-cover" />
                                ))}
                            </div>
                            {users.filter((u) => u.online).length > 0 ? <span className="text-xs text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-full shadow-sm border border-green-100">{users.filter((u) => u.online).length} אונליין</span> : <span className="text-xs text-gray-400 italic">כולם במנוחה</span>}
                        </div>
                    </div>
                </div>
                )}
            </div>

            {(() => {
                // moved above (visual cleanup + ordering)
                return null;
            })()}

            <div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mt-8 mb-6 px-2"
                data-focus-today
            >
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 md:gap-3 flex-wrap">
                    <Zap size={20} className="md:w-6 md:h-6 text-yellow-500 fill-yellow-500 drop-shadow-sm" /> המיקוד להיום
                    {!isSynced && (
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">(אוטומטי)</span>
                    )}
                </h2>

                <button
                    onClick={() => navigate('/tasks')}
                    type="button"
                    className="h-11 w-full md:w-auto px-6 rounded-xl bg-white/70 border border-slate-200 text-sm font-black text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all"
                    aria-label="לכל המשימות"
                >
                    לכל המשימות
                </button>
            </div>

            <div className="space-y-4">
                {focusTasks.length > 0 ? (
                    focusTasks.map((task) => (
                        <div key={task.id} className="relative">
                            {task.isFocus && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-yellow-400 rounded-r-lg shadow-sm"></div>
                            )}
                            <TaskCard task={task} users={users} onClick={() => openTask(task.id)} />
                        </div>
                    ))
                ) : (
                    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-12 text-center border border-dashed border-gray-300">
                        <Trophy size={64} className="mx-auto text-yellow-400 mb-4 drop-shadow-md" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">סיימת את המיקוד להיום!</h3>
                        <p className="text-gray-500">קח משימה חדשה מהמאגר או צא להפסקה.</p>
                    </div>
                )}
            </div>
        </div>
        );
};
