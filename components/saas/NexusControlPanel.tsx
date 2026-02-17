
import React from 'react';
import { motion } from 'framer-motion';
import { CircleCheckBig, TriangleAlert, CircleX } from 'lucide-react';
import { SYSTEM_SCREENS } from '../../constants';
import { OrganizationProfile, SystemScreenStatus } from '../../types';
import { Button } from '@/components/ui/button';

interface NexusControlPanelProps {
    organization: OrganizationProfile;
    updateSystemFlag: (screenId: string, status: SystemScreenStatus) => void;
    hideHeader?: boolean;
}

// מסכי Nexus בלבד
const NEXUS_SCREENS = SYSTEM_SCREENS.filter(screen => {
    // מסכי Nexus הם כל המסכים הראשיים + הגדרות
    const nexusMainScreens = ['dashboard', 'tasks', 'calendar', 'clients', 'team', 'reports', 'assets', 'brain', 'trash'];
    const isNexusMain = nexusMainScreens.includes(screen.id);
    const isSettings = screen.id.startsWith('settings_');
    
    return isNexusMain || isSettings;
});

export const NexusControlPanel: React.FC<NexusControlPanelProps> = ({ organization, updateSystemFlag, hideHeader }) => {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {!hideHeader ? (
                <div className="mb-8">
                    <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        בקרת מערכת Nexus
                    </h1>
                    <p className="text-slate-600 text-lg">שליטה על סטטוס מסכי Nexus (פעיל / תחזוקה / מוסתר) עבור כל המשתמשים.</p>
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {NEXUS_SCREENS.map(screen => {
                    const currentFlag = organization.systemFlags?.[screen.id] || 'active';
                    
                    return (
                        <div key={screen.id} className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl hover:bg-white hover:border-slate-300/80 transition-all shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">{screen.label}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {screen.id}</p>
                                </div>
                                <span className="text-[10px] bg-slate-50/80 backdrop-blur-sm text-slate-600 px-2 py-1 rounded border border-slate-200 uppercase tracking-wide">
                                    {screen.category}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-slate-50/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200">
                                <Button
                                    size="sm"
                                    variant={currentFlag === 'active' ? 'default' : 'ghost'}
                                    onClick={() => updateSystemFlag(screen.id, 'active')}
                                    className={`${currentFlag === 'active' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-900/50 hover:from-green-600 hover:to-emerald-600' : 'text-slate-700 hover:text-slate-900 hover:bg-white'} rounded-lg text-xs`}
                                >
                                    פעיל
                                </Button>
                                <Button
                                    size="sm"
                                    variant={currentFlag === 'maintenance' ? 'default' : 'ghost'}
                                    onClick={() => updateSystemFlag(screen.id, 'maintenance')}
                                    className={`${currentFlag === 'maintenance' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-900/50 hover:from-yellow-600 hover:to-orange-600' : 'text-slate-700 hover:text-slate-900 hover:bg-white'} rounded-lg text-xs`}
                                >
                                    תחזוקה
                                </Button>
                                <Button
                                    size="sm"
                                    variant={currentFlag === 'hidden' ? 'default' : 'ghost'}
                                    onClick={() => updateSystemFlag(screen.id, 'hidden')}
                                    className={`${currentFlag === 'hidden' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-900/50 hover:from-red-600 hover:to-rose-600' : 'text-slate-700 hover:text-slate-900 hover:bg-white'} rounded-lg text-xs`}
                                >
                                    מוסתר
                                </Button>
                            </div>
                            
                            <div className="mt-3 text-center">
                                <p className="text-[10px] text-slate-500">
                                    {currentFlag === 'active' && <span className="flex items-center justify-center gap-1"><CircleCheckBig size={10} className="text-green-500" /> זמין לכולם</span>}
                                    {currentFlag === 'maintenance' && <span className="flex items-center justify-center gap-1"><TriangleAlert size={10} className="text-yellow-500" /> מוצג עם מסך "בשיפוצים"</span>}
                                    {currentFlag === 'hidden' && <span className="flex items-center justify-center gap-1"><CircleX size={10} className="text-red-500" /> מוסתר מהתפריט וחסום</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

