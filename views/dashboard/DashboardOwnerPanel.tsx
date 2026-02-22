'use client';

import React from 'react';
import Link from 'next/link';
import { X, Zap, Rocket, RefreshCw, SquareCheck, Target, Sparkles, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

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
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Boolean((value as Record<string, unknown>).locked === true);
}

type OwnerDashboardData = {
    kpis?: OwnerDashboardKpis;
    nextActions?: OwnerDashboardAction[];
    [key: string]: unknown;
};

interface DashboardOwnerPanelProps {
    ownerDashboard: OwnerDashboardData;
    isFocusMode: boolean;
    isPilotLoading: boolean;
    onClose: () => void;
    onToggleFocusMode: () => void;
    onRefresh: () => void;
}

export const DashboardOwnerPanel: React.FC<DashboardOwnerPanelProps> = ({
    ownerDashboard,
    isFocusMode,
    isPilotLoading,
    onClose,
    onToggleFocusMode,
    onRefresh,
}) => {
    return (
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl" data-owner-dashboard>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 md:p-10 border border-slate-200 overflow-hidden">
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
                                onClick={onClose}
                                className="h-11 w-11 inline-flex items-center justify-center rounded-xl border bg-white/70 hover:bg-white border-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                                aria-label="סגור תמונת מצב"
                                title="סגור"
                            >
                                <X size={18} />
                            </button>

                            <button
                                onClick={onToggleFocusMode}
                                className={`h-11 px-4 rounded-xl border text-sm font-bold flex items-center gap-2 transition-colors ${isFocusMode ? 'bg-slate-900 text-white border-transparent shadow-lg shadow-slate-900/20' : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'}`}
                                aria-label="מצב מיקוד"
                            >
                                <Zap size={16} />
                                {isFocusMode ? 'יציאה' : 'מצב מיקוד'}
                            </button>

                            <button
                                onClick={onRefresh}
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
                                        <SquareCheck size={18} className="text-[#3730A3]" />
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
    );
};
