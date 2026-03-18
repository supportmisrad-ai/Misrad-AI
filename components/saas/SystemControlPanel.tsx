'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CircleCheckBig, TriangleAlert, CircleX, Download } from 'lucide-react';
import { SYSTEM_SCREENS } from '../../constants';
import { OrganizationProfile, SystemScreenStatus } from '../../types';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { Button } from '@/components/ui/button';

interface SystemControlPanelProps {
    organization: OrganizationProfile;
    updateSystemFlag: (screenId: string, status: SystemScreenStatus) => void;
    hideHeader?: boolean;
}

export const SystemControlPanel: React.FC<SystemControlPanelProps> = ({ organization, updateSystemFlag, hideHeader }) => {
    const [isExporting, setIsExporting] = React.useState(false);

    const resolveCrossModulesLabel = (screen: { id: string; category?: string }) => {
        const id = String(screen?.id || '');
        if (id === 'reports') return 'פיננסים';
        if (id === 'brain') return 'נקסוס';
        if (id === 'operations') return 'תפעול';

        // Settings screens are global by definition.
        if (String(screen?.category || '') === 'settings' || id.startsWith('settings_')) {
            return 'כל המודולים';
        }

        // Default: core navigation screens are shared across the OS experience.
        return 'כל המודולים';
    };

    const downloadAiBackup = async () => {
        const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
        if (!orgSlug) {
            alert('לא נמצא organizationId מתוך הכתובת');
            return;
        }

        setIsExporting(true);
        try {
            const url = new URL('/api/admin/ai/brain-export', window.location.origin);
            const res = await fetch(url.toString(), {
                headers: { 'x-org-id': orgSlug },
            });
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
        } catch (e: unknown) {
            alert(String(e instanceof Error ? e.message : e));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {!hideHeader ? (
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                        בקרת מערכת גלובלית
                    </h1>
                    <p className="text-slate-500 text-lg">שליטה על סטטוס כל מסך במערכת (פעיל / תחזוקה / מוסתר) עבור כל המשתמשים.</p>
                </div>
            ) : null}

            <div className="mb-6">
                <Button onClick={downloadAiBackup} disabled={isExporting} className="font-bold">
                    {isExporting ? (
                        <span className="inline-flex items-center gap-2">מייצא...</span>
                    ) : (
                        <span className="inline-flex items-center gap-2"><Download size={16} /> גיבוי הגדרות AI</span>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SYSTEM_SCREENS.map(screen => {
                    const currentFlag = organization.systemFlags?.[screen.id] || 'active';
                    
                    return (
                        <div key={screen.id} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-slate-300 transition-all shadow-sm group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">{screen.label}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {screen.id}</p>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1">חוצה מודולים: {resolveCrossModulesLabel(screen)}</p>
                                </div>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200 uppercase tracking-wide font-bold">
                                    {screen.category}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                <Button
                                    size="sm"
                                    variant={currentFlag === 'active' ? 'default' : 'ghost'}
                                    onClick={() => updateSystemFlag(screen.id, 'active')}
                                    className={`${currentFlag === 'active' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-white'} rounded-lg text-xs font-bold h-7`}
                                >
                                    פעיל
                                </Button>
                                <Button
                                    size="sm"
                                    variant={currentFlag === 'maintenance' ? 'default' : 'ghost'}
                                    onClick={() => {
                                        const addonObj = screen as { id?: string; category?: string };
                                        updateSystemFlag(addonObj?.id || '', 'maintenance');
                                    }}
                                    className={`${currentFlag === 'maintenance' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-white'} rounded-lg text-xs font-bold h-7`}
                                >
                                    תחזוקה
                                </Button>
                                <Button
                                    size="sm"
                                    variant={currentFlag === 'hidden' ? 'default' : 'ghost'}
                                    onClick={() => updateSystemFlag(screen.id, 'hidden')}
                                    className={`${currentFlag === 'hidden' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-white'} rounded-lg text-xs font-bold h-7`}
                                >
                                    מוסתר
                                </Button>
                            </div>
                            
                            <div className="mt-3 text-center h-4">
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {currentFlag === 'active' && <span className="flex items-center justify-center gap-1 text-emerald-600"><CircleCheckBig size={10} /> זמין לכולם</span>}
                                    {currentFlag === 'maintenance' && <span className="flex items-center justify-center gap-1 text-amber-600"><TriangleAlert size={10} /> מוצג עם מסך "בשיפוצים"</span>}
                                    {currentFlag === 'hidden' && <span className="flex items-center justify-center gap-1 text-rose-600"><CircleX size={10} /> מוסתר מהתפריט וחסום</span>}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};
