
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpRight, Activity, Users, Server, Plus, BarChart, Search, CheckCircle2, AlertTriangle, XCircle, Eye, Settings, Loader2, Globe, Database } from 'lucide-react';
import { Tenant } from '../../types';
import { MODULES_CONFIG } from './SaasConstants';

interface TenantsPanelProps {
    tenants: Tenant[];
    totalMRR: number;
    activeTenants: number;
    trialTenants: number;
    totalUsers: number;
    filteredTenants: Tenant[];
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    onAddClick: () => void;
    onSimulate: (tenant: Tenant) => void;
    onEditModules: (tenant: Tenant) => void;
    onToggleStatus: (id: string, status: string) => void;
}

export const TenantsPanel: React.FC<TenantsPanelProps> = ({ 
    tenants, totalMRR, activeTenants, trialTenants, totalUsers, filteredTenants, 
    searchTerm, setSearchTerm, onAddClick, onSimulate, onEditModules, onToggleStatus 
}) => {
    const [provisioningId, setProvisioningId] = useState<string | null>(null);

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
                    <h1 className="text-3xl font-black text-white tracking-tight">ניהול לקוחות SaaS</h1>
                    <p className="text-slate-400 mt-1">מבט על העסקים שמשתמשים בפלטפורמה שלך.</p>
                </div>
                <button 
                    onClick={onAddClick}
                    className="bg-white text-slate-900 hover:bg-indigo-50 px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
                >
                    <Plus size={18} /> הוסף עסק ידנית
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">הכנסה חודשית קבועה</p>
                            <h3 className="text-3xl font-black text-white mt-1">{formatCurrency(totalMRR)}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <CreditCard size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <ArrowUpRight size={14} /> +8% החודש
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">לקוחות פעילים</p>
                            <h3 className="text-3xl font-black text-white mt-1">{activeTenants}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        {trialTenants} בתקופת ניסיון
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">משתמשי קצה</p>
                            <h3 className="text-3xl font-black text-white mt-1">{totalUsers}</h3>
                        </div>
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-purple-400 font-bold">
                        ממוצע {Math.round(totalUsers / (tenants.length || 1))} ללקוח
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">בריאות שרתים</p>
                            <h3 className="text-3xl font-black text-green-400 mt-1">100%</h3>
                        </div>
                        <div className="p-3 bg-slate-700 text-slate-300 rounded-xl border border-slate-600">
                            <Server size={20} />
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        זמינות מערכת 99.99%
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <BarChart size={20} /> רשימת לקוחות עסקיים
                    </h3>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="חפש עסק..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl py-2 pr-10 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500 w-64"
                        />
                    </div>
                </div>
                
                <table className="w-full text-right text-sm">
                    <thead className="bg-slate-900/50 text-slate-400 font-bold border-b border-slate-700">
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
                    <tbody className="divide-y divide-slate-700/50 text-slate-300">
                        {filteredTenants.map(tenant => (
                            <tr key={tenant.id} className="hover:bg-slate-700/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={tenant.logo} className="w-10 h-10 rounded-xl bg-slate-700 object-cover" />
                                        <div>
                                            <div className="font-bold text-white">{tenant.name}</div>
                                            <div className="text-xs text-indigo-400 flex items-center gap-1 font-mono">
                                                <Globe size={10} /> {tenant.subdomain}.nexus-os.co
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-bold border border-slate-600">
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
                                        tenant.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        tenant.status === 'Trial' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                        tenant.status === 'Provisioning' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {tenant.status === 'Active' && <CheckCircle2 size={12} />}
                                        {tenant.status === 'Trial' && <AlertTriangle size={12} />}
                                        {tenant.status === 'Churned' && <XCircle size={12} />}
                                        {tenant.status === 'Provisioning' && <Loader2 size={12} className="animate-spin" />}
                                        {tenant.status === 'Provisioning' ? 'מקים שרת...' : tenant.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex -space-x-2 space-x-reverse cursor-pointer" onClick={() => onEditModules(tenant)} title="ערוך מודולים">
                                        {tenant.modules.slice(0, 3).map(mod => {
                                            const conf = MODULES_CONFIG.find(c => c.id === mod);
                                            if (!conf) return null;
                                            return (
                                                <div key={mod} className={`w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold ${conf.color}`}>
                                                    <conf.icon size={12} />
                                                </div>
                                            );
                                        })}
                                        {tenant.modules.length > 3 && (
                                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                                                +{tenant.modules.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onSimulate(tenant)}
                                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-indigo-600 text-white transition-colors" 
                                            title="התחזות (כניסה כלקוח)"
                                            disabled={tenant.status === 'Provisioning'}
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button 
                                            onClick={() => onEditModules(tenant)}
                                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors" 
                                            title="ערוך פיצ׳רים"
                                        >
                                            <Settings size={14} />
                                        </button>
                                        <button 
                                            onClick={() => onToggleStatus(tenant.id, tenant.status)}
                                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors" 
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
        </motion.div>
    );
};
