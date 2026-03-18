'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Users, Target, ArrowRight, Edit2, ArrowUpRight, ArrowDownRight, RefreshCw, Trophy, ThumbsUp } from 'lucide-react';
import { HoldButton } from '@/components/HoldButton';
import { useAttendanceTile, formatAttendanceDuration } from '@/hooks/useAttendanceTile';
import type { User as UserType } from '@/types';

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

interface DashboardKPIWidgetsProps {
    canViewFinancials: boolean;
    totalRevenue: number;
    revenueGoal: number;
    revenueHistory: number[];
    growth: number;
    formatCurrency: (amount: number) => string;
    onEditGoals: () => void;
    myCompletedTasksThisMonth: number;
    myPersonalTarget: number;
    myProgressPercentage: number;
    teamEnabled: boolean;
    completionRate: number;
    completedTasksCount: number;
    totalTasksCount: number;
    taskProgress: number;
    users: UserType[];
    onNavigateTeam: () => void;
}

export const DashboardKPIWidgets: React.FC<DashboardKPIWidgetsProps> = ({
    canViewFinancials,
    totalRevenue,
    revenueGoal,
    revenueHistory,
    growth,
    formatCurrency,
    onEditGoals,
    myCompletedTasksThisMonth,
    myPersonalTarget,
    myProgressPercentage,
    teamEnabled,
    completionRate,
    completedTasksCount,
    totalTasksCount,
    taskProgress,
    users,
    onNavigateTeam,
}) => {
    // Unified attendance source - same as sidebar/mobile menu
    const { isActive, elapsedMs, clockIn, clockOut } = useAttendanceTile();
    
    // Format elapsed time for display (convert ms to HH:MM:SS)
    const formatElapsed = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    const elapsedFormatted = formatElapsed(elapsedMs);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* 1. Time Clock Widget */}
            <div id="time-clock-widget" className={`relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-700 min-h-[240px] group ${isActive ? 'bg-black text-white' : 'zen-card border-none shadow-none hover:shadow-luxury'}`}>
                {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent animate-pulse"></div>
                )}
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                        <div className={`p-3 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white/10 text-green-400' : 'bg-white/50 text-slate-400 group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-sm'}`}>
                            <Clock size={24} />
                        </div>
                        {isActive && <span className="text-[10px] font-black tracking-widest uppercase opacity-50">Shift Active</span>}
                    </div>
                    <div className="text-center">
                        <div className={`font-mono font-bold tracking-tighter tabular-nums transition-all duration-700 ${isActive ? 'text-6xl drop-shadow-2xl' : 'text-4xl text-slate-300 group-hover:text-slate-900'}`}>{elapsedFormatted}</div>
                        <div className="mt-6 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                            <HoldButton isActive={isActive} onComplete={isActive ? clockOut : clockIn} label={isActive ? "יציאה" : "כניסה"} size="small" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Business Health / Personal Targets */}
            <div className="zen-card p-8 border-none shadow-none hover:shadow-luxury flex flex-col justify-between h-full min-h-[240px] relative group overflow-hidden transition-all duration-700">
                {canViewFinancials ? (
                    <>
                        <div className="flex items-center justify-between mb-4 z-10 relative">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-all duration-500 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:scale-110"><TrendingUp size={24} /></div>
                                <div><h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">כסף שנכנס</h3></div>
                            </div>
                            <button onClick={onEditGoals} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" aria-label="ערוך יעדים חודשיים"><Edit2 size={18} /></button>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">{formatCurrency(totalRevenue)}</div>
                                    <div className={`text-xs font-bold flex items-center gap-1 mt-2 transition-all duration-500 transform ${growth >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                        {Math.abs(Math.round(growth))}% צמיחה
                                    </div>
                                </div>
                                <div className="text-right transition-opacity duration-500">
                                    <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">היעד שלך</div>
                                    <div className="text-xs font-black text-slate-700 bg-slate-100/80 px-2 py-1 rounded-lg inline-block">{formatCurrency(revenueGoal)}</div>
                                </div>
                            </div>
                            <div className="absolute -bottom-8 -left-8 -right-8 h-24 opacity-10 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none">
                                <TrendChart data={revenueHistory} color="text-blue-500" />
                            </div>
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

            {/* 3. Team Widget */}
            {teamEnabled && (
            <div className="zen-card p-8 border-none shadow-none hover:shadow-luxury flex flex-col h-full min-h-[240px] hidden lg:flex transition-all duration-700 group">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl transition-all duration-500 group-hover:bg-purple-50 group-hover:text-purple-600 group-hover:scale-110"><Users size={24} /></div>
                        <div><h3 className="font-bold text-gray-900 text-lg transition-opacity duration-500">סידור עבודה</h3><p className="text-sm text-gray-500 transition-opacity duration-500">{Math.round(completionRate)}% בוצעו</p></div>
                    </div>
                    <button onClick={onNavigateTeam} className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-xl" aria-label="עבור לצוות"><ArrowRight size={20} /></button>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                    <div className="mb-6 transition-opacity duration-500">
                        <div className="flex justify-between text-[10px] font-bold mb-2"><span className="text-gray-500 uppercase tracking-wider">סטטוס</span><span className="text-gray-900">{completedTasksCount} / {totalTasksCount}</span></div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${taskProgress}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-lg" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 space-x-reverse transition-opacity duration-500">
                            {users.filter((u) => u.online).slice(0, 3).map((u) => (
                                <img key={u.id} src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100 object-cover" />
                            ))}
                        </div>
                        {users.filter((u) => u.online).length > 0 ? <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-1 rounded-lg transition-opacity duration-500">{users.filter((u) => u.online).length} אונליין</span> : null}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};
