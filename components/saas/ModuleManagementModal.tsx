'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Product, Tenant, ModuleId } from '../../types';
import { MODULES_CONFIG } from './SaasConstants';
import { Button } from '@/components/ui/button';

interface ModuleManagementModalProps {
    tenant: Tenant;
    products?: Product[];
    onClose: () => void;
    onToggle: (moduleId: ModuleId) => void;
    onSetModules?: (modules: ModuleId[]) => void;
}

export const ModuleManagementModal: React.FC<ModuleManagementModalProps> = ({ tenant, products, onClose, onToggle, onSetModules }) => {
    const planDefaults = (() => {
        const list = Array.isArray(products) ? products : [];
        const match = list.find((p) => String(p?.name || '') === String(tenant.plan || ''));
        return Array.isArray(match?.modules) ? (match!.modules as ModuleId[]) : [];
    })();

    const currentModules = Array.isArray(tenant.modules) ? (tenant.modules as ModuleId[]) : [];

    const sortKey = (m: ModuleId) => String(m);
    const normalize = (arr: ModuleId[]) => [...new Set(arr)].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const currentNorm = normalize(currentModules);
    const defaultsNorm = normalize(planDefaults);
    const isSyncedWithPlan = defaultsNorm.length > 0 && currentNorm.join('|') === defaultsNorm.join('|');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">ניהול מודולים</h3>
                        <p className="text-slate-600 text-sm">עבור: {tenant.name}</p>
                        {tenant.plan ? (
                            <p className="text-slate-500 text-xs mt-1">חבילה: {tenant.plan}</p>
                        ) : null}
                    </div>
                    <Button onClick={onClose} type="button" variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-900">
                        <X size={20} />
                    </Button>
                </div>

                {defaultsNorm.length > 0 ? (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900">ברירת מחדל לפי החבילה</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {defaultsNorm.map((m) => {
                                        const conf = MODULES_CONFIG.find((c) => c.id === m);
                                        return (
                                            <span key={m} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                                                {conf ? <conf.icon size={14} className={conf.color} /> : null}
                                                {conf?.label || m}
                                            </span>
                                        );
                                    })}
                                </div>
                                {!isSyncedWithPlan ? (
                                    <div className="text-xs text-slate-600 mt-2">המודולים הנוכחיים שונים מהחבילה.</div>
                                ) : (
                                    <div className="text-xs text-emerald-700 mt-2">מסונכרן לחבילה.</div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9"
                                    disabled={!onSetModules}
                                    onClick={() => onSetModules?.(defaultsNorm)}
                                >
                                    אפס לחבילה
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9"
                                    disabled={!onSetModules}
                                    onClick={() => onSetModules?.(MODULES_CONFIG.map((x) => x.id as ModuleId))}
                                >
                                    הפעל הכל
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3">
                    {MODULES_CONFIG.map(mod => {
                        const isEnabled = currentModules.includes(mod.id as ModuleId);
                        return (
                            <div key={mod.id} 
                                onClick={() => onToggle(mod.id as ModuleId)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${isEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 opacity-80 hover:opacity-100 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <mod.icon size={20} className={isEnabled ? mod.color : 'text-slate-500'} />
                                    <span className={`font-bold ${isEnabled ? 'text-slate-900' : 'text-slate-600'}`}>{mod.label}</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isEnabled ? '-translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                    שינויים משפיעים מיידית על ממשק הלקוח.
                </div>
            </motion.div>
        </div>
    );
};
