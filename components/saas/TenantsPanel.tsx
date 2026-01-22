'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpRight, Activity, Users, Server, Plus, BarChart, Search, CheckCircle2, AlertTriangle, XCircle, Eye, Settings, Globe, Database, Mail, Send, UserPlus } from 'lucide-react';
import { Tenant } from '../../types';
import { MODULES_CONFIG } from './SaasConstants';
import { AddUserToTenantModal } from './AddUserToTenantModal';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import { Skeleton } from '@/components/ui/skeletons';

interface TenantsPanelProps {
    tenants: Tenant[];
    totalMRR: number;
    activeTenants: number;
    trialTenants: number;
    totalUsers: number;
    mrrTrendPct?: string | number | null;
    apiHealthScore?: number | null;
    filteredTenants: Tenant[];
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    onAddClick: () => void;
    onSimulate: (tenant: Tenant) => void;
    onEditModules: (tenant: Tenant) => void;
    onToggleStatus: (id: string, status: string) => void;
}

export const TenantsPanel: React.FC<TenantsPanelProps> = ({ 
    tenants, totalMRR, activeTenants, trialTenants, totalUsers, mrrTrendPct, apiHealthScore, filteredTenants, 
    searchTerm, setSearchTerm, onAddClick, onSimulate, onEditModules, onToggleStatus 
}) => {
    const [provisioningId, setProvisioningId] = useState<string | null>(null);
    const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);
    const [selectedTenantForUser, setSelectedTenantForUser] = useState<Tenant | null>(null);

    // Remove duplicate tenants by ID (keep first occurrence)
    const uniqueFilteredTenants = React.useMemo(() => {
        const seen = new Set<string>();
        return filteredTenants.filter(t => {
            if (seen.has(t.id)) {
                return false;
            }
            seen.add(t.id);
            return true;
        });
    }, [filteredTenants]);

    const handleSendInvitation = async (tenant: Tenant) => {
        if (!tenant.ownerEmail) {
            alert('אין אימייל בעלים ל-Tenant זה');
            return;
        }

        setSendingInvitation(tenant.id);
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/tenants/${tenant.id}/send-invitation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בשליחת ההזמנה');
            }

            const data = await response.json();
            alert(`הזמנה נשלחה בהצלחה ל-${tenant.ownerEmail}\n\nקישור: ${data.signupUrl}`);
        } catch (error: any) {
            console.error('[TenantsPanel] Error sending invitation:', error);
            alert(error.message || 'שגיאה בשליחת ההזמנה');
        } finally {
            setSendingInvitation(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
    };

    // Simulate provisioning visual effect for new tenants
    React.useEffect(() => {
        const provisioningTenant = tenants.find(t => t.status === 'Provisioning');
        if (provisioningTenant) {
            setProvisioningId(provisioningTenant.id);
            // In a real app, this would be a websocket or polling
        }
    }, [tenants]);

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        ניהול לקוחות SaaS
                    </h1>
                    <p className="text-slate-600 text-lg">מבט על העסקים שמשתמשים בפלטפורמה שלך.</p>
                </div>
                <button 
                    onClick={onAddClick}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-indigo-200/60 transition-all hover:scale-105 backdrop-blur-sm border border-slate-200/70"
                >
                    <Plus size={18} /> הוסף לקוח חדש
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">הכנסה חודשית קבועה</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(totalMRR)}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                            <CreditCard size={20} />
                        </div>
                    </div>
                    {mrrTrendPct !== null && typeof mrrTrendPct !== 'undefined' ? (
                        <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                            <ArrowUpRight size={14} /> {String(mrrTrendPct)}% החודש
                        </div>
                    ) : null}
                </div>

                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">לקוחות פעילים</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{activeTenants}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 text-blue-600 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-slate-600">
                        {trialTenants} בתקופת ניסיון
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">משתמשי קצה</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{totalUsers}</h3>
                        </div>
                        <div className="p-3 bg-purple-500/20 text-purple-600 rounded-xl border border-purple-500/30 backdrop-blur-sm">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-purple-700 font-bold">
                        ממוצע {Math.round(totalUsers / (tenants.length || 1))} ללקוח
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">בריאות שרתים</p>
                            <h3 className="text-3xl font-black text-green-400 mt-1">{typeof apiHealthScore === 'number' ? `${apiHealthScore}%` : '—'}</h3>
                        </div>
                        <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                            <Server size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-slate-600">
                        ציון בריאות מערכת (API)
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-200/70 flex justify-between items-center bg-white/60 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <BarChart size={20} /> רשימת לקוחות עסקיים
                    </h3>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="חפש עסק..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 w-64 transition-all"
                        />
                    </div>
                </div>
                
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-600 font-bold border-b border-slate-200/70">
                        <tr>
                            <th className="px-6 py-4">שם העסק / דומיין</th>
                            <th className="px-6 py-4">תוכנית (מוצר)</th>
                            <th className="px-6 py-4">משתמשים</th>
                            <th className="px-6 py-4">Region</th>
                            <th className="px-6 py-4">סטטוס</th>
                            <th className="px-6 py-4">מודולים פעילים</th>
                            <th className="px-6 py-4">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 text-slate-700">
                        {uniqueFilteredTenants.map((tenant, index) => (
                            <tr key={`${tenant.id}-${index}`} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={tenant.logo} className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 object-cover" />
                                        <div>
                                            <div className="font-bold text-slate-900">{tenant.name}</div>
                                            <div className="text-xs text-indigo-400 flex items-center gap-1 font-mono">
                                                <Globe size={10} /> {tenant.subdomain}.nexus-os.co
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-100/80 backdrop-blur-sm text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                                        {tenant.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono">{tenant.usersCount}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Database size={12} /> {tenant.region || 'il-central'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                        tenant.status === 'Active' ? 'bg-green-500/10 text-green-700 border-green-500/20' :
                                        tenant.status === 'Trial' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' :
                                        tenant.status === 'Provisioning' ? 'bg-blue-500/10 text-blue-700 border-blue-500/20' :
                                        'bg-red-500/10 text-red-700 border-red-500/20'
                                    }`}>
                                        {tenant.status === 'Active' && <CheckCircle2 size={12} />}
                                        {tenant.status === 'Trial' && <AlertTriangle size={12} />}
                                        {tenant.status === 'Churned' && <XCircle size={12} />}
                                        {tenant.status === 'Provisioning' && <Skeleton className="w-3 h-3 rounded-full" />}
                                        {tenant.status === 'Provisioning' ? 'מקים שרת...' : tenant.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex -space-x-2 space-x-reverse cursor-pointer" onClick={() => onEditModules(tenant)} title="ערוך מודולים">
                                        {tenant.modules.slice(0, 3).map(mod => {
                                            const conf = MODULES_CONFIG.find(c => c.id === mod);
                                            if (!conf) return null;
                                            return (
                                                <div key={mod} className={`w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-xs font-bold ${conf.color}`}>
                                                    <conf.icon size={12} />
                                                </div>
                                            );
                                        })}
                                        {tenant.modules.length > 3 && (
                                            <div className="w-7 h-7 rounded-full bg-slate-100/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-[10px] text-slate-600">
                                                +{tenant.modules.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setSelectedTenantForUser(tenant)}
                                            className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-purple-50 hover:border-purple-200 text-slate-700 transition-all hover:scale-105" 
                                            title="הוסף משתמש לטננט זה"
                                            disabled={tenant.status === 'Provisioning'}
                                        >
                                            <UserPlus size={14} />
                                        </button>
                                        {tenant.ownerEmail && (
                                            <button 
                                                onClick={() => handleSendInvitation(tenant)}
                                                disabled={sendingInvitation === tenant.id}
                                                className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                                                title="שלח קישור הרשמה לבעל העסק"
                                            >
                                                {sendingInvitation === tenant.id ? (
                                                    <Skeleton className="w-3.5 h-3.5 rounded-full" />
                                                ) : (
                                                    <Mail size={14} />
                                                )}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => onSimulate(tenant)}
                                            className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 transition-all hover:scale-105" 
                                            title="התחזות (כניסה כלקוח)"
                                            disabled={tenant.status === 'Provisioning'}
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button 
                                            onClick={() => onEditModules(tenant)}
                                            className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all hover:scale-105" 
                                            title="ערוך פיצ׳רים"
                                        >
                                            <Settings size={14} />
                                        </button>
                                        <button 
                                            onClick={() => onToggleStatus(tenant.id, tenant.status)}
                                            className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all hover:scale-105" 
                                            title={tenant.status === 'Active' ? 'השבת' : 'הפעל'}
                                        >
                                            {tenant.status === 'Active' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {selectedTenantForUser && (
                <AddUserToTenantModal
                    tenant={selectedTenantForUser}
                    onClose={() => setSelectedTenantForUser(null)}
                    onSuccess={() => {
                        setSelectedTenantForUser(null);
                        // Optionally refresh tenants list here
                    }}
                />
            )}
        </motion.div>
    );
};
