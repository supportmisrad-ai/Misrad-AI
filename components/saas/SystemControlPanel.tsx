'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react';
import { SYSTEM_SCREENS } from '../../constants';
import { OrganizationProfile, SystemScreenStatus } from '../../types';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

interface SystemControlPanelProps {
    organization: OrganizationProfile;
    updateSystemFlag: (screenId: string, status: SystemScreenStatus) => void;
}

export const SystemControlPanel: React.FC<SystemControlPanelProps> = ({ organization, updateSystemFlag }) => {
    const [isExporting, setIsExporting] = React.useState(false);

    const downloadAiBackup = async () => {
        const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
        if (!orgId) {
            alert('לא נמצא organizationId מתוך הכתובת');
            return;
        }

        setIsExporting(true);
        try {
            const url = new URL('/api/admin/ai/brain-export', window.location.origin);
            url.searchParams.set('organizationId', orgId);
            const res = await fetch(url.toString());
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'שגיאה ביצוא הגדרות AI');
            }

            const blob = await res.blob();
            const cd = res.headers.get('content-disposition') || '';
            const match = cd.match(/filename="?([^";]+)"?/i);
            const filename = match?.[1] || 'ai-brain-export.json';

            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } catch (e: any) {
            alert(String(e?.message || e));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    בקרת מערכת גלובלית
                </h1>
                <p className="text-slate-600 text-lg">שליטה על סטטוס כל מסך במערכת (פעיל / תחזוקה / מוסתר) עבור כל המשתמשים.</p>
            </div>

            <div className="mb-6">
                <button
                    onClick={downloadAiBackup}
                    disabled={isExporting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50"
                >
                    {isExporting ? (
                        <span className="inline-flex items-center gap-2">מייצא...</span>
                    ) : (
                        <span className="inline-flex items-center gap-2"><Download size={14} /> גיבוי הגדרות AI</span>
                    )}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SYSTEM_SCREENS.map(screen => {
                    const currentFlag = organization.systemFlags?.[screen.id] || 'active';
                    
                    return (
                        <div key={screen.id} className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl hover:bg-white/90 hover:border-slate-300/80 transition-all shadow-xl">
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
                                <button
                                    onClick={() => updateSystemFlag(screen.id, 'active')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${currentFlag === 'active' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}
                                >
                                    פעיל
                                </button>
                                <button
                                    onClick={() => updateSystemFlag(screen.id, 'maintenance')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${currentFlag === 'maintenance' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}
                                >
                                    תחזוקה
                                </button>
                                <button
                                    onClick={() => updateSystemFlag(screen.id, 'hidden')}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${currentFlag === 'hidden' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-200/60' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'}`}
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
