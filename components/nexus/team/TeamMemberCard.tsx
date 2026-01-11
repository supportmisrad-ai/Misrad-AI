
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, LogOut, EyeOff, MoreHorizontal, Edit, Trash2, TrendingUp } from 'lucide-react';
import { User, Task } from '../../../types';

interface TeamMemberCardProps {
    user: User;
    workloadData: {
        activeTasks: Task[];
        count: number;
        percentage: number;
        statusColor: string;
        maxCapacity: number;
        streak: number;
        performanceDiff: number;
    };
    isOverloaded: boolean;
    isMenuOpen: boolean;
    canManageTeam: boolean;
    canEditUser: boolean;
    editTooltip?: string;
    canSwitchUser: boolean;
    isCurrentUser: boolean;
    onToggleMenu: (e: React.MouseEvent) => void;
    onEdit: () => void;
    onDelete: (e: React.MouseEvent) => void;
    onSwitchUser: (e: React.MouseEvent) => void;
    onAssignClick: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
    user, workloadData, isOverloaded, isMenuOpen, canManageTeam, canEditUser, editTooltip, canSwitchUser, isCurrentUser,
    onToggleMenu, onEdit, onDelete, onSwitchUser, onAssignClick, onDragOver, onDrop
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="bg-white rounded-2xl md:rounded-xl border border-gray-200 shadow-sm overflow-visible flex flex-col hover:border-gray-300 active:scale-[0.98] transition-all relative"
        >
            {/* Card Header - Mobile Optimized */}
            <div className="p-4 md:p-5 flex items-start justify-between border-b border-gray-50 relative">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="relative shrink-0">
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-100" />
                        <div className={`absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white flex items-center justify-center ${user.online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        
                        {/* Gamification Badge: Fire Streak */}
                        {workloadData.streak > 3 && (
                            <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-orange-500 text-white w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white text-[10px] md:text-xs font-bold animate-pulse" title={`${workloadData.streak} ימים ברצף של עמידה ביעדים`}>
                                <Flame size={10} className="md:w-3 md:h-3" fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-base md:text-lg font-black text-gray-900 flex items-center gap-1">
                            <span className="truncate">{user.name}</span>
                            {workloadData.performanceDiff > 10 && <Zap size={11} className="md:w-3 md:h-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{user.role} • {user.department}</p>
                    </div>
                </div>
                
                <div className="relative flex items-center gap-1 shrink-0">
                    {/* STRICT SECURITY: Only Global Admins can impersonate */}
                    {canSwitchUser && !isCurrentUser ? (
                        <button
                            onClick={onSwitchUser}
                            className="p-1.5 md:p-2 text-gray-400 active:text-blue-600 active:bg-blue-50 rounded-lg transition-all active:scale-95"
                            title="התחבר כמשתמש זה"
                            aria-label={`התחבר כמשתמש ${user.name}`}
                        >
                            <LogOut size={16} className="md:w-[18px] md:h-[18px] rotate-180" />
                        </button>
                    ) : (
                        // Show disabled icon for managers to know they can't switch
                        !isCurrentUser && (
                            <div className="p-1.5 md:p-2 text-gray-200 cursor-not-allowed" title="אין הרשאת התחזות">
                                <EyeOff size={16} className="md:w-[18px] md:h-[18px]" />
                            </div>
                        )
                    )}

                    {(canManageTeam) && (
                        <button 
                            onClick={onToggleMenu}
                            className={`text-gray-400 active:text-gray-900 p-1.5 md:p-2 rounded-lg transition-all active:scale-95 ${isMenuOpen ? 'bg-gray-100 text-black' : ''}`}
                            aria-label={`תפריט פעולות עבור ${user.name}`}
                        >
                            <MoreHorizontal size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                    )}

                    <AnimatePresence>
                        {isMenuOpen && canManageTeam && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute left-0 top-full mt-2 w-44 md:w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-1.5 space-y-0.5">
                                    {canEditUser ? (
                                        <button 
                                            onClick={onEdit}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 active:bg-gray-50 rounded-lg transition-colors active:scale-95"
                                        >
                                            <Edit size={14} /> ערוך פרטים
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 rounded-lg cursor-not-allowed" title={editTooltip || 'אין הרשאה לערוך'}>
                                            <Edit size={14} /> ערוך פרטים
                                        </div>
                                    )}
                                    {/* Prevent deleting yourself */}
                                    {!isCurrentUser && (
                                        <button 
                                            onClick={onDelete}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 active:bg-red-50 rounded-lg transition-colors active:scale-95"
                                        >
                                            <Trash2 size={14} /> הסר עובד
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Workload Indicator - Mobile Optimized */}
            <div className="px-4 md:px-5 py-3 md:py-4 bg-gray-50/50">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] md:text-xs font-bold text-gray-600">קיבולת נוכחית</span>
                    <span className={`text-[10px] md:text-xs font-black ${isOverloaded ? 'text-red-600' : 'text-gray-600'}`}>
                        {workloadData.percentage >= 100 ? 'עומס יתר' : `${Math.round(workloadData.percentage)}%`}
                    </span>
                </div>
                <div className="w-full h-2 md:h-2.5 bg-gray-200 rounded-full overflow-hidden relative">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${workloadData.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${workloadData.statusColor}`} 
                    />
                </div>
                <div className="mt-2 text-[9px] md:text-[10px] text-gray-400 flex justify-between items-center">
                    <span>{workloadData.count} משימות פעילות</span>
                    {workloadData.performanceDiff > 0 ? (
                        <span className="text-green-600 font-bold flex items-center gap-1">
                            <TrendingUp size={9} className="md:w-[10px] md:h-[10px]" /> +{workloadData.performanceDiff}% מהיעד
                        </span>
                    ) : (
                        <span className="text-gray-400">יעד: {user.targets?.tasksMonth || 10}</span>
                    )}
                </div>
            </div>

            {/* Active Tasks List - Mobile Optimized */}
            <div className="flex-1 p-2 md:p-3 bg-white min-h-[100px] md:min-h-[120px] rounded-b-2xl md:rounded-b-xl overflow-hidden">
                <div className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 md:px-3 py-1.5 md:py-2">
                    בעדיפות עליונה
                </div>
                <div className="space-y-1">
                    {workloadData.activeTasks.length > 0 ? (
                        workloadData.activeTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 active:bg-gray-50 rounded-lg group cursor-pointer transition-colors">
                                <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full flex-shrink-0 ${
                                    task.priority === 'Urgent' ? 'bg-purple-500' : 
                                    task.priority === 'High' ? 'bg-red-500' : 
                                    task.priority === 'Medium' ? 'bg-orange-500' : 'bg-gray-400'
                                }`} />
                                <span className="text-xs md:text-sm text-gray-700 truncate flex-1 group-active:text-black">
                                    {task.title}
                                </span>
                                <span className="text-[10px] md:text-xs text-gray-400 whitespace-nowrap shrink-0">
                                    {task.dueDate}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-3 md:p-4 text-center text-[10px] md:text-xs text-gray-400 italic">
                            גרור לכאן להקצאה
                        </div>
                    )}
                    {workloadData.activeTasks.length > 3 && (
                        <div className="px-2 md:px-3 py-1 text-[10px] md:text-xs text-blue-600 active:text-blue-700 cursor-pointer font-bold">
                            + {workloadData.activeTasks.length - 3} משימות נוספות
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Add Placeholder - Mobile Optimized */}
            <div className="p-2.5 md:p-3 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl md:rounded-b-xl">
                <button 
                    onClick={onAssignClick}
                    className="w-full py-2 md:py-2.5 border border-dashed border-gray-300 rounded-lg md:rounded-md text-[10px] md:text-xs font-bold text-gray-500 active:text-gray-700 active:border-gray-400 active:bg-white transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                    <span className="text-base md:text-lg leading-none">+</span> 
                    <span className="hidden sm:inline">הקצאת משימה ל{user.name.split(' ')[0]}</span>
                    <span className="sm:hidden">הקצה משימה</span>
                </button>
            </div>
        </motion.div>
    );
};
