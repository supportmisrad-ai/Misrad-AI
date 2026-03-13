// Reports Overview Tab Component
// Extracted from ReportsView.tsx for better performance and maintainability

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CircleCheckBig, Clock, TrendingUp, BarChart3, SquareActivity } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import type { User, Task } from '../../types';
import { Status } from '../../types';

interface OverviewStat {
    user: User;
    totalHours: number;
    tasksCount: number;
    avgTimePerTask: number;
    efficiencyScore: number;
}

interface ReportsOverviewTabProps {
    visibleUsers: User[];
    tasks: Task[];
    dateRange: { start: string; end: string };
    currentUserId: string;
    totalOrgTasks: number;
    totalOrgTaskHours: number;
    avgEfficiency: number;
}

export const ReportsOverviewTab: React.FC<ReportsOverviewTabProps> = ({
    visibleUsers,
    tasks,
    dateRange,
    currentUserId,
    totalOrgTasks,
    totalOrgTaskHours,
    avgEfficiency,
}) => {
    // Memoized calculation of overview stats
    const overviewStats = useMemo(() => {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);

        return visibleUsers.map(user => {
            const userTasks = tasks.filter((t) => {
                const isAssigned = t.assigneeIds?.includes(user.id) || t.assigneeId === user.id;
                const isDone = t.status === Status.DONE;
                if (!isAssigned || !isDone || !t.completionDetails?.completedAt) return false;
                const completedAt = new Date(t.completionDetails.completedAt);
                return completedAt >= startDate && completedAt <= endDate;
            });

            let totalSeconds = 0;
            userTasks.forEach((t) => {
                if (t.completionDetails?.contributors) {
                    const contribution = t.completionDetails.contributors.find((c) => c.userId === user.id);
                    if (contribution) totalSeconds += contribution.timeSpent;
                } else {
                    const assigneesCount = t.assigneeIds?.length || 1;
                    totalSeconds += (t.completionDetails?.actualTime || t.timeSpent || 0) / assigneesCount;
                }
            });

            const totalHours = Math.round(totalSeconds / 3600);
            const tasksCount = userTasks.length;
            const avgTimePerTask = tasksCount > 0 ? Math.round(totalSeconds / 60 / tasksCount) : 0;
            const totalSnoozes = userTasks.reduce((acc: number, t) => acc + (t.snoozeCount || 0), 0);
            const efficiencyScore = tasksCount === 0 ? 0 : Math.max(0, Math.min(100, 80 + (tasksCount * 1.5) - (totalSnoozes * 2)));

            return { user, totalHours, tasksCount, avgTimePerTask, efficiencyScore };
        }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    }, [visibleUsers, tasks, dateRange]);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                            {visibleUsers.length > 1 ? 'משימות (צוות)' : 'משימות שהושלמו'}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 group-hover:text-green-600 transition-colors">{totalOrgTasks}</h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">בטווח התאריכים הנבחר</p>
                    </div>
                    <div className="p-3 md:p-4 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <CircleCheckBig size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                            {visibleUsers.length > 1 ? 'שעות (על משימות)' : 'שעות עבודה'}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{totalOrgTaskHours}</h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">שעות עבודה בפועל</p>
                    </div>
                    <div className="p-3 md:p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <Clock size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-all">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">יעילות ממוצעת</p>
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
                            {avgEfficiency}%
                        </h2>
                        <p className="text-[9px] md:text-[10px] text-gray-600 mt-1">מחושב ע״י Nexus AI</p>
                    </div>
                    <div className="p-3 md:p-4 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} className="md:w-8 md:h-8" />
                    </div>
                </div>
            </div>

            {/* Employee Table */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                    <div className="flex gap-2 items-center">
                        <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                            <BarChart3 size={18} className="md:w-5 md:h-5 text-gray-500" />
                        </div>
                        <h2 className="font-bold text-gray-900 text-base md:text-lg">
                            {visibleUsers.length > 1 ? 'ניתוח ביצועי צוות' : 'פירוט ביצועים אישי'}
                        </h2>
                    </div>
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto -mx-2 md:mx-0">
                    <table className="w-full text-right min-w-[600px]">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider">
                            <tr>
                                <th scope="col" className="px-3 md:px-6 py-3 md:py-4 rounded-tr-3xl">עובד</th>
                                <th scope="col" className="px-3 md:px-6 py-3 md:py-4">מחלקה</th>
                                <th scope="col" className="px-3 md:px-6 py-3 md:py-4">משימות</th>
                                <th scope="col" className="px-3 md:px-6 py-3 md:py-4">שעות</th>
                                <th scope="col" className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">זמן ממוצע</th>
                                <th scope="col" className="px-3 md:px-6 py-3 md:py-4 rounded-tl-3xl">יעילות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {overviewStats.map((stat, index) => (
                                <tr key={stat.user.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <div className="flex items-center gap-2 md:gap-4">
                                            <span className="text-xs font-bold text-gray-300 w-3 md:w-4">{index + 1}</span>
                                            <div className="relative">
                                                <Avatar src={stat.user.avatar} alt={stat.user.name} name={stat.user.name} size="md" className="border border-gray-100 group-hover:scale-105 transition-transform shadow-sm" />
                                                {index === 0 && overviewStats.length > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                                                        <TrendingUp size={10} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-2">
                                                    <span className="truncate">{stat.user.name}</span>
                                                    {stat.user.id === currentUserId && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold border border-gray-200 shrink-0">אני</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">{stat.user.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs text-gray-600">
                                        {stat.user.department || '-'}
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <div className="font-bold text-gray-900 text-base md:text-lg">{stat.tasksCount}</div>
                                        <div className="w-20 md:w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (stat.tasksCount / ((stat.user.targets?.tasksMonth as number) || 10)) * 100)}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 font-mono text-gray-700 font-bold bg-gray-50/50 rounded-lg text-sm md:text-base">
                                        {stat.totalHours} <span className="text-xs text-gray-600 font-normal">שעות</span>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600 hidden lg:table-cell">
                                        {stat.avgTimePerTask > 0 ? (
                                            <>
                                                {Math.floor(stat.avgTimePerTask / 60) > 0 && <span className="font-bold">{Math.floor(stat.avgTimePerTask / 60)}</span>}
                                                {Math.floor(stat.avgTimePerTask / 60) > 0 && <span className="text-xs mx-1">שע׳</span>}
                                                <span className="font-bold">{stat.avgTimePerTask % 60}</span> <span className="text-xs">דק׳</span>
                                            </>
                                        ) : '-'}
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-lg text-xs font-bold border ${
                                            stat.efficiencyScore >= 90 ? 'bg-green-50 text-green-700 border-green-100' :
                                            stat.efficiencyScore >= 75 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-orange-50 text-orange-700 border-orange-100'
                                        }`}>
                                            <SquareActivity size={12} />
                                            {stat.efficiencyScore}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                    {overviewStats.map((stat, index) => (
                        <div key={stat.user.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-300 w-4">{index + 1}</span>
                                <div className="relative">
                                    <Avatar src={stat.user.avatar} alt={stat.user.name} name={stat.user.name} size="lg" className="border border-gray-100 shadow-sm" />
                                    {index === 0 && overviewStats.length > 1 && (
                                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                                            <TrendingUp size={10} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                                        <span className="truncate">{stat.user.name}</span>
                                        {stat.user.id === currentUserId && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold border border-gray-200 shrink-0">אני</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{stat.user.role}</div>
                                    <div className="text-xs text-gray-600">{stat.user.department || '-'}</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">משימות</div>
                                    <div className="font-bold text-gray-900 text-lg">{stat.tasksCount}</div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (stat.tasksCount / ((stat.user.targets?.tasksMonth as number) || 10)) * 100)}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">שעות</div>
                                    <div className="font-mono text-gray-700 font-bold text-lg">{stat.totalHours} <span className="text-xs text-gray-600 font-normal">שעות</span></div>
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-[10px] font-bold text-gray-400 uppercase">יעילות</div>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                                    stat.efficiencyScore >= 90 ? 'bg-green-50 text-green-700 border-green-100' :
                                    stat.efficiencyScore >= 75 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                    <SquareActivity size={12} />
                                    {stat.efficiencyScore}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
