
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Target, TrendingUp, Users, DollarSign, Edit2, Save, X, Trophy, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';

export const SalesTargets: React.FC = () => {
    const { monthlyGoals, updateMonthlyGoals, users, updateUser, tasks, leads } = useData();
    const [isEditingGlobal, setIsEditingGlobal] = useState(false);
    const [globalRevenue, setGlobalRevenue] = useState(monthlyGoals.revenue);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [tempUserTarget, setTempUserTarget] = useState(0);

    // Filter Sales Team
    const salesTeam = users.filter(u => 
        u.role === 'סמנכ״ל מכירות' || 
        u.role === 'איש מכירות' || 
        u.role === 'מנכ״ל'
    );

    // Calculate Global Progress
    const currentRevenue = leads.filter(l => l.status === 'Won').reduce((acc, l) => acc + l.value, 0);
    const globalProgress = Math.min((currentRevenue / monthlyGoals.revenue) * 100, 100);

    const handleSaveGlobal = () => {
        updateMonthlyGoals({ ...monthlyGoals, revenue: globalRevenue });
        setIsEditingGlobal(false);
    };

    const handleSaveUserTarget = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            updateUser(userId, {
                targets: {
                    ...user.targets,
                    leadsMonth: tempUserTarget,
                    tasksMonth: user.targets?.tasksMonth || 0
                }
            });
        }
        setEditingUserId(null);
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">יעדים ומדדים</h1>
                <p className="text-slate-400 mt-1">הגדרת יעדי מכירות לצוות וניהול ביצועים חודשי.</p>
            </div>

            {/* Global Goal Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                                <Target size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-white">יעד הכנסות ארגוני</h2>
                        </div>
                        <p className="text-slate-400 text-sm">יעד חודשי מצטבר לכלל החברה.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {isEditingGlobal ? (
                            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-600">
                                <input 
                                    type="number" 
                                    value={globalRevenue}
                                    onChange={(e) => setGlobalRevenue(Number(e.target.value))}
                                    className="bg-transparent text-white font-mono font-bold text-lg w-32 outline-none px-2"
                                    autoFocus
                                />
                                <button onClick={handleSaveGlobal} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white"><Save size={16} /></button>
                                <button onClick={() => setIsEditingGlobal(false)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"><X size={16} /></button>
                            </div>
                        ) : (
                            <div className="text-right">
                                <div className="text-4xl font-black text-white tracking-tight font-mono">{formatCurrency(monthlyGoals.revenue)}</div>
                                <button onClick={() => setIsEditingGlobal(true)} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-end gap-1 mt-1">
                                    <Edit2 size={12} /> ערוך יעד
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-8">
                    <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-slate-300">התקדמות החודש</span>
                        <span className="text-white">{Math.round(globalProgress)}%</span>
                    </div>
                    <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50 relative">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${globalProgress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full relative"
                        >
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                        </motion.div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
                        <span>0 ₪</span>
                        <span>{formatCurrency(monthlyGoals.revenue / 2)}</span>
                        <span>{formatCurrency(monthlyGoals.revenue)}</span>
                    </div>
                </div>
            </div>

            {/* Team Targets Grid */}
            <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Users size={20} className="text-blue-400" /> יעדים אישיים
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {salesTeam.map(user => {
                        const target = user.targets?.leadsMonth || 0; // Sales Target (Revenue or Leads count, using leadsMonth as placeholder for Revenue Target here for simplicity)
                        // Mock actual performance for demo based on their ID
                        const actual = leads.filter(l => l.status === 'Won').length * 5000; // Mock 5k per deal
                        const userProgress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
                        const isEditing = editingUserId === user.id;

                        return (
                            <div key={user.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group relative overflow-hidden">
                                {userProgress >= 100 && (
                                    <div className="absolute top-0 right-0 bg-yellow-500/20 p-2 rounded-bl-2xl border-b border-l border-yellow-500/30 text-yellow-500">
                                        <Trophy size={20} />
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="relative">
                                        <img src={user.avatar} className="w-14 h-14 rounded-full border-2 border-slate-700" />
                                        {user.role.includes('מנכ') && <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-0.5"><Crown size={14} className="text-yellow-500 fill-yellow-500" /></div>}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{user.name}</h4>
                                        <p className="text-slate-500 text-xs">{user.role}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">יעד מכירות</span>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        value={tempUserTarget}
                                                        onChange={(e) => setTempUserTarget(Number(e.target.value))}
                                                        className="w-20 bg-slate-950 border border-slate-600 rounded px-1 text-sm text-white outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveUserTarget(user.id)} className="text-green-500 hover:text-green-400"><Save size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group/edit">
                                                    <span className="text-white font-mono font-bold">{formatCurrency(target)}</span>
                                                    <button 
                                                        onClick={() => { setEditingUserId(user.id); setTempUserTarget(target); }}
                                                        className="text-slate-600 hover:text-blue-400 opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                            <div className={`h-full rounded-full ${userProgress >= 100 ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${userProgress}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[10px] text-slate-500">ביצוע: {formatCurrency(actual)}</span>
                                            <span className={`text-[10px] font-bold ${userProgress >= 100 ? 'text-yellow-500' : 'text-blue-500'}`}>{Math.round(userProgress)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
