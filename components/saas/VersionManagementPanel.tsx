'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Package, AlertTriangle, CheckCircle2, Clock, Search, RefreshCw, Download } from 'lucide-react';
import { Tenant } from '../../types';

interface VersionManagementPanelProps {
    tenants: Tenant[];
    availableVersions: string[]; // e.g., ['2.5.0', '2.6.0', '2.6.0-beta', '2.7.0-alpha']
    onUpdateVersion: (tenantId: string, version: string) => void;
    onRollback: (tenantId: string, previousVersion: string) => void;
}

export const VersionManagementPanel: React.FC<VersionManagementPanelProps> = ({
    tenants,
    availableVersions,
    onUpdateVersion,
    onRollback
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVersion, setSelectedVersion] = useState<Record<string, string>>({});
    const [updatingTenant, setUpdatingTenant] = useState<string | null>(null);

    // Remove duplicate tenants by ID (keep first occurrence)
    const uniqueTenants = React.useMemo(() => {
        const seen = new Set<string>();
        return tenants.filter(t => {
            if (seen.has(t.id)) {
                return false;
            }
            seen.add(t.id);
            return true;
        });
    }, [tenants]);

    const filteredTenants = uniqueTenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getVersionType = (version: string): 'stable' | 'beta' | 'alpha' => {
        if (version.includes('alpha')) return 'alpha';
        if (version.includes('beta')) return 'beta';
        return 'stable';
    };

    const handleUpdate = (tenantId: string) => {
        const version = selectedVersion[tenantId];
        if (!version) {
            alert('נא לבחור גרסה');
            return;
        }
        setUpdatingTenant(tenantId);
        onUpdateVersion(tenantId, version);
        setTimeout(() => setUpdatingTenant(null), 2000);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    ניהול גרסאות לקוחות
                </h1>
                <p className="text-slate-600 text-lg">בחר איזו גרסה של המערכת כל לקוח משתמש, ועדכן לפי הצורך.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">גרסה יציבה</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {uniqueTenants.filter(t => {
                                    const v = t.version || '2.5.0';
                                    return getVersionType(v) === 'stable';
                                }).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-500/20 text-green-700 rounded-xl border border-green-500/30 backdrop-blur-sm">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">גרסת בטא</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {uniqueTenants.filter(t => {
                                    const v = t.version || '2.5.0';
                                    return getVersionType(v) === 'beta';
                                }).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-yellow-500/20 text-yellow-700 rounded-xl border border-yellow-500/30 backdrop-blur-sm">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">גרסת אלפא</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {uniqueTenants.filter(t => {
                                    const v = t.version || '2.5.0';
                                    return getVersionType(v) === 'alpha';
                                }).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-red-500/20 text-red-700 rounded-xl border border-red-500/30 backdrop-blur-sm">
                            <Code size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">גרסאות זמינות</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{availableVersions.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 text-blue-700 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                            <Package size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-200/70 flex justify-between items-center bg-white/60 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <Package size={20} /> גרסאות לקוחות
                    </h3>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="חפש לקוח..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 w-64 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-600 font-bold border-b border-slate-200/70">
                            <tr>
                                <th className="px-6 py-4">לקוח</th>
                                <th className="px-6 py-4">גרסה נוכחית</th>
                                <th className="px-6 py-4">עדכן לגרסה</th>
                                <th className="px-6 py-4">סטטוס</th>
                                <th className="px-6 py-4">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 text-slate-700">
                            {filteredTenants.map((tenant, index) => {
                                const currentVersion = tenant.version || '2.5.0';
                                const versionType = getVersionType(currentVersion);
                                const isUpdating = updatingTenant === tenant.id;

                                return (
                                    <tr key={`${tenant.id}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src={tenant.logo} className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 object-cover" />
                                                <div>
                                                    <div className="font-bold text-slate-900">{tenant.name}</div>
                                                    <div className="text-xs text-slate-600">{tenant.subdomain}.nexus-os.co</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                                    versionType === 'stable' ? 'bg-green-500/20 text-green-700 border-green-500/30 backdrop-blur-sm' :
                                                    versionType === 'beta' ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30 backdrop-blur-sm' :
                                                    'bg-red-500/20 text-red-700 border-red-500/30 backdrop-blur-sm'
                                                }`}>
                                                    {currentVersion}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={selectedVersion[tenant.id] || currentVersion}
                                                onChange={(e) => setSelectedVersion(prev => ({
                                                    ...prev,
                                                    [tenant.id]: e.target.value
                                                }))}
                                                className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 transition-all"
                                                disabled={isUpdating}
                                            >
                                                {availableVersions.map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${
                                                tenant.status === 'Active' ? 'bg-green-500/20 text-green-700 border-green-500/30' :
                                                'bg-slate-100/80 text-slate-600 border-slate-200'
                                            }`}>
                                                {tenant.status === 'Active' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdate(tenant.id)}
                                                    disabled={isUpdating || selectedVersion[tenant.id] === currentVersion}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                                                >
                                                    {isUpdating ? (
                                                        <>
                                                            <RefreshCw size={14} className="opacity-70" /> מעדכן...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download size={14} /> עדכן
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Version Info */}
            <div className="mt-8 bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 shadow-xl">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Code size={20} /> מידע על גרסאות
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:border-slate-300/80 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <span className="font-bold text-slate-900 text-sm">גרסה יציבה</span>
                        </div>
                        <p className="text-xs text-slate-600">מומלץ לרוב הלקוחות. נבדקה ואושרה לשימוש יומיומי.</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:border-slate-300/80 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={16} className="text-yellow-600" />
                            <span className="font-bold text-slate-900 text-sm">גרסת בטא</span>
                        </div>
                        <p className="text-xs text-slate-600">לבדיקות. עשויה להכיל באגים. מומלץ רק ללקוחות שמעוניינים בחדשנות.</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200 hover:border-slate-300/80 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <Code size={16} className="text-red-600" />
                            <span className="font-bold text-slate-900 text-sm">גרסת אלפא</span>
                        </div>
                        <p className="text-xs text-slate-600">לפיתוח בלבד. לא מומלץ ללקוחות. עשויה להיות לא יציבה.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

