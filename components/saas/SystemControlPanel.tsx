
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { SYSTEM_SCREENS } from '../../constants';
import { OrganizationProfile, SystemScreenStatus } from '../../types';

interface SystemControlPanelProps {
    organization: OrganizationProfile;
    updateSystemFlag: (screenId: string, status: SystemScreenStatus) => void;
}

export const SystemControlPanel: React.FC<SystemControlPanelProps> = ({ organization, updateSystemFlag }) => {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-black text-white tracking-tight mb-2 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                    בקרת מערכת גלובלית
                </h1>
                <p className="text-slate-400 text-lg">שליטה על סטטוס כל מסך במערכת (פעיל / תחזוקה / מוסתר) עבור כל המשתמשים.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SYSTEM_SCREENS.map(screen => {
                    const currentFlag = organization.systemFlags?.[screen.id] || 'active';
                    
                    return (
                        <div key={screen.id} className="bg-black/20 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl hover:bg-black/30 hover:border-white/20 transition-all shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-white text-lg">{screen.label}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {screen.id}</p>
                                </div>
                                <span className="text-[10px] bg-black/40 backdrop-blur-sm text-slate-400 px-2 py-1 rounded border border-white/10 uppercase tracking-wide">
                                    {screen.category}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-black/40 backdrop-blur-sm p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => updateSystemFlag(screen.id, 'active')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${currentFlag === 'active' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-900/50' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    פעיל
                                </button>
                                <button
                                    onClick={() => updateSystemFlag(screen.id, 'maintenance')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${currentFlag === 'maintenance' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-900/50' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    תחזוקה
                                </button>
                                <button
                                    onClick={() => updateSystemFlag(screen.id, 'hidden')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${currentFlag === 'hidden' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-900/50' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    מוסתר
                                </button>
                            </div>
                            
                            <div className="mt-3 text-center">
                                <p className="text-[10px] text-slate-500">
                                    {currentFlag === 'active' && <span className="flex items-center justify-center gap-1"><CheckCircle2 size={10} className="text-green-500" /> זמין לכולם</span>}
                                    {currentFlag === 'maintenance' && <span className="flex items-center justify-center gap-1"><AlertTriangle size={10} className="text-yellow-500" /> מוצג עם מסך "בשיפוצים"</span>}
                                    {currentFlag === 'hidden' && <span className="flex items-center justify-center gap-1"><XCircle size={10} className="text-red-500" /> מוסתר מהתפריט וחסום</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};
