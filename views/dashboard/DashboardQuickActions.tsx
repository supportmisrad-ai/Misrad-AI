'use client';

import React from 'react';
import { Plus, Mic, Users, Sun, Zap, Target, Compass } from 'lucide-react';

interface DashboardQuickActionsProps {
    onCreateTask: () => void;
    onInviteEmployee: () => void;
    onMorningBrief: () => void;
    onEditGoals: () => void;
    onScrollToFocus: () => void;
    onNavigateTasks: () => void;
    isHomeDashboard: boolean;
    isSynced: boolean;
    showExtraQuickActions: boolean;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
    onCreateTask,
    onInviteEmployee,
    onMorningBrief,
    onEditGoals,
    onScrollToFocus,
    onNavigateTasks,
    isHomeDashboard,
    isSynced,
    showExtraQuickActions,
}) => {
    return (
        <div className="mt-4">
            <div className="w-full max-w-none mx-auto px-2">
                <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl">
                    <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 border border-slate-200 overflow-hidden">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <div className="text-right">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold w-fit mb-3 shadow-lg shadow-slate-900/20">
                                        <Zap size={12} className="text-yellow-400" />
                                        <span>פעולות מהירות</span>
                                    </div>
                                    <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">מה תרצה לעשות?</div>
                                    <p className="text-slate-500 text-sm mt-1">גישה מהירה לפעולות הנפוצות ביותר</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
                                <button
                                    id="create-task-btn"
                                    onClick={onCreateTask}
                                    type="button"
                                    className="group rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg p-4 text-right"
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
                                    onClick={onInviteEmployee}
                                    type="button"
                                    className="group rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg p-4 text-right"
                                    aria-label="עובד חדש"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                        <Users size={18} />
                                    </div>
                                    <div className="font-black text-sm text-slate-900">עובד חדש</div>
                                    <div className="mt-1 text-[10px] font-bold text-slate-500">הזמנה / הוספה</div>
                                </button>

                                {isHomeDashboard && (
                                    <button
                                        onClick={onMorningBrief}
                                        type="button"
                                        className="group relative rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg p-4 text-right"
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
                                            onClick={onNavigateTasks}
                                            type="button"
                                            className="group rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg p-4 text-right"
                                            aria-label="משימות"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-700 flex items-center justify-center border border-yellow-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                                <Zap size={18} />
                                            </div>
                                            <div className="font-black text-sm text-slate-900">משימות</div>
                                            <div className="mt-1 text-[10px] font-bold text-slate-500">לכל המשימות</div>
                                        </button>

                                        <button
                                            onClick={onEditGoals}
                                            type="button"
                                            className="group rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg p-4 text-right"
                                            aria-label="יעדים חודשיים"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 mb-3 group-hover:scale-105 transition-transform mr-auto">
                                                <Target size={18} />
                                            </div>
                                            <div className="font-black text-sm text-slate-900">יעדים חודשיים</div>
                                            <div className="mt-1 text-[10px] font-bold text-slate-500">עדכון מהיר</div>
                                        </button>

                                        <button
                                            onClick={onScrollToFocus}
                                            type="button"
                                            className="group rounded-3xl border border-slate-200/80 bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg p-4 text-right"
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
