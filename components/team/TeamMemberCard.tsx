
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, LogOut, EyeOff, MoreHorizontal, Edit, Trash2, TrendingUp } from 'lucide-react';
import { User, Task } from '../../types';

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
    user, workloadData, isOverloaded, isMenuOpen, canManageTeam, canSwitchUser, isCurrentUser,
    onToggleMenu, onEdit, onDelete, onSwitchUser, onAssignClick, onDragOver, onDrop
}) => {
    return (
        <div 
            onDragOver={onDragOver}
            onDrop={onDrop}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible flex flex-col hover:border-gray-300 transition-colors relative"
        >
            {/* Card Header */}
            <div className="p-5 flex items-start justify-between border-b border-gray-50 relative">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${user.online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        
                        {/* Gamification Badge: Fire Streak */}
                        {workloadData.streak > 3 && (
                            <div className="absolute -top-2 -right-2 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white text-xs font-bold animate-pulse" title={`${workloadData.streak} ימים ברצף של עמידה ביעדים`}>
                                <Flame size={12} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                            {user.name}
                            {workloadData.performanceDiff > 10 && <Zap size={12} className="text-yellow-500 fill-yellow-500" />}
                        </h3>
                        <p className="text-xs text-gray-500">{user.role} • {user.department}</p>
                    </div>
                </div>
                
                <div className="relative flex items-center gap-1">
                    {/* STRICT SECURITY: Only Global Admins can impersonate */}
                    {canSwitchUser && !isCurrentUser ? (
                        <button
                            onClick={onSwitchUser}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="התחבר כמשתמש זה"
                        >
                            <LogOut size={18} className="rotate-180" />
                        </button>
                    ) : (
                        // Show disabled icon for managers to know they can't switch
                        !isCurrentUser && (
                            <div className="p-1.5 text-gray-200 cursor-not-allowed" title="אין הרשאת התחזות">
                                <EyeOff size={18} />
                            </div>
                        )
                    )}

                    {(canManageTeam) && (
                        <button 
                            onClick={onToggleMenu}
                            className={`text-gray-400 hover:text-gray-900 p-1.5 rounded-lg transition-colors ${isMenuOpen ? 'bg-gray-100 text-black' : ''}`}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                    )}

                    <AnimatePresence>
                        {isMenuOpen && canManageTeam && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute left-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-1.5 space-y-0.5">
                                    <button 
                                        onClick={onEdit}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <Edit size={14} /> ערוך פרטים
                                    </button>
                                    {/* Prevent deleting yourself */}
                                    {!isCurrentUser && (
                                        <button 
                                            onClick={onDelete}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

            {/* Workload Indicator */}
            <div className="px-5 py-4 bg-gray-50/50">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-semibold text-gray-600">קיבולת נוכחית</span>
                    <span className={`text-xs font-bold ${isOverloaded ? 'text-red-600' : 'text-gray-600'}`}>
                        {workloadData.percentage >= 100 ? 'עומס יתר' : `${Math.round(workloadData.percentage)}%`}
                    </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden relative">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${workloadData.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${workloadData.statusColor}`} 
                    />
                </div>
                <div className="mt-2 text-[10px] text-gray-400 flex justify-between items-center">
                    <span>{workloadData.count} משימות פעילות</span>
                    {workloadData.performanceDiff > 0 ? (
                        <span className="text-green-600 font-bold flex items-center gap-1">
                            <TrendingUp size={10} /> +{workloadData.performanceDiff}% מהיעד
                        </span>
                    ) : (
                        <span className="text-gray-400">יעד: {user.targets?.tasksMonth || 10}</span>
                    )}
                </div>
            </div>

            {/* Active Tasks List */}
            <div className="flex-1 p-2 bg-white min-h-[120px] rounded-b-xl overflow-hidden">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                    בעדיפות עליונה
                </div>
                <div className="space-y-1">
                    {workloadData.activeTasks.length > 0 ? (
                        workloadData.activeTasks.slice(0, 3).map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group cursor-pointer transition-colors">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    task.priority === 'Urgent' ? 'bg-purple-500' : 
                                    task.priority === 'High' ? 'bg-red-500' : 
                                    task.priority === 'Medium' ? 'bg-orange-500' : 'bg-gray-400'
                                }`} />
                                <span className="text-sm text-gray-700 truncate flex-1 group-hover:text-black">
                                    {task.title}
                                </span>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {task.dueDate}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-gray-400 italic">
                            גרור לכאן להקצאה
                        </div>
                    )}
                    {workloadData.activeTasks.length > 3 && (
                        <div className="px-3 py-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                            + {workloadData.activeTasks.length - 3} משימות נוספות
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Add Placeholder */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/30 rounded-b-xl">
                <button 
                    onClick={onAssignClick}
                    className="w-full py-2 border border-dashed border-gray-300 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-white transition-all flex items-center justify-center gap-1"
                >
                    <span className="text-lg leading-none">+</span> הקצאת משימה ל{user.name.split(' ')[0]}
                </button>
            </div>
        </div>
    );
};
