import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Filter, Mail, Building2, Globe, Edit, Trash2, Eye, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { User, Tenant } from '../../types';
import { AddUserToTenantModal } from './AddUserToTenantModal';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import Image from 'next/image';
import { getAdminUsersPage } from '@/app/actions/admin-users';

interface GlobalUsersPanelProps {
    tenants: Tenant[];
    addToast: (message: string, type?: string) => void;
}

export const GlobalUsersPanel: React.FC<GlobalUsersPanelProps> = ({ tenants, addToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
    const [selectedTenantForUser, setSelectedTenantForUser] = useState<Tenant | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [pageOffset, setPageOffset] = useState(0);
    const [pageSize] = useState(25);
    const [total, setTotal] = useState(0);

    // Ensure tenants array is unique by id to prevent duplicate keys
    const uniqueTenants = React.useMemo(() => {
        const seen = new Set<string>();
        return tenants.filter(tenant => {
            if (seen.has(tenant.id)) {
                return false;
            }
            seen.add(tenant.id);
            return true;
        });
    }, [tenants]);

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoading(true);
            try {
                const result = await getAdminUsersPage({
                    limit: pageSize,
                    offset: pageOffset,
                    search: searchTerm || undefined,
                });
                if (!result.success || !result.data) {
                    throw new Error(result.error || 'Failed to load users');
                }
                setUsers(result.data.items || []);
                setTotal(result.data.total || 0);
            } catch (error: any) {
                console.error('[GlobalUsersPanel] Error loading users:', error);
                addToast(error.message || 'שגיאה בטעינת משתמשים', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadUsers();
    }, [addToast, pageOffset, pageSize, searchTerm]);

    // Filter users
    useEffect(() => {
        let filtered = users;

        // Filter by tenant
        if (selectedTenantFilter !== 'all') {
            filtered = filtered.filter(u => u.tenantId === selectedTenantFilter);
        }

        setFilteredUsers(filtered);
    }, [users, selectedTenantFilter]);

    const getTenantName = (tenantId: string | null | undefined) => {
        if (!tenantId) return 'ללא טננט';
        const tenant = uniqueTenants.find(t => t.id === tenantId);
        return tenant?.name || 'לא ידוע';
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את המשתמש הזה?')) {
            return;
        }

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            setUsers(prev => prev.filter(u => u.id !== userId));
            addToast('משתמש נמחק בהצלחה', 'success');
        } catch (error: any) {
            console.error('[GlobalUsersPanel] Error deleting user:', error);
            addToast(error.message || 'שגיאה במחיקת משתמש', 'error');
        }
    };

    const totalUsers = users.length;
    const usersByTenant = uniqueTenants.reduce((acc, tenant) => {
        acc[tenant.id] = users.filter(u => u.tenantId === tenant.id).length;
        return acc;
    }, {} as Record<string, number>);
    const usersWithoutTenant = users.filter(u => !u.tenantId).length;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-10">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-emerald-700 to-teal-700 bg-clip-text text-transparent">
                            ניהול משתמשים גלובלי
                        </h1>
                        <p className="text-slate-600 text-lg">מבט מרכזי על כל המשתמשים מכל הטננטים.</p>
                    </div>

                    <div className="flex items-center justify-between mb-4 text-xs text-slate-600">
                        <div>
                            מציג {Math.min(pageOffset + 1, total)}-{Math.min(pageOffset + pageSize, total)} מתוך {total}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
                                disabled={pageOffset === 0}
                                className="px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200 disabled:opacity-40"
                            >
                                הקודם
                            </button>
                            <button
                                onClick={() => setPageOffset(pageOffset + pageSize)}
                                disabled={pageOffset + pageSize >= total}
                                className="px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200 disabled:opacity-40"
                            >
                                הבא
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            // Open modal to select tenant first
                            if (uniqueTenants.length === 0) {
                                addToast('אין טננטים זמינים. הוסף טננט קודם.', 'error');
                                return;
                            }
                            // For now, use first tenant - in future, show tenant selector
                            setSelectedTenantForUser(uniqueTenants[0]);
                        }}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-emerald-200/60 transition-all hover:scale-105 backdrop-blur-sm border border-slate-200/70"
                    >
                        <UserPlus size={18} /> הוסף משתמש
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase">סה״כ משתמשים</p>
                                <h3 className="text-3xl font-black text-slate-900 mt-1">{totalUsers}</h3>
                            </div>
                            <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-xl border border-emerald-500/30 backdrop-blur-sm">
                                <Users size={20} />
                            </div>
                        </div>
                    </div>

                    {uniqueTenants.slice(0, 3).map(tenant => (
                        <div key={tenant.id} className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase truncate">{tenant.name}</p>
                                    <h3 className="text-3xl font-black text-slate-900 mt-1">{usersByTenant[tenant.id] || 0}</h3>
                                </div>
                                <div className="p-3 bg-blue-500/20 text-blue-600 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                                    <Building2 size={20} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="חפש משתמש לפי שם, אימייל או תפקיד..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <select
                                value={selectedTenantFilter}
                                onChange={(e) => setSelectedTenantFilter(e.target.value)}
                                className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 transition-all appearance-none cursor-pointer min-w-[200px]"
                            >
                                <option value="all">כל הטננטים</option>
                                {uniqueTenants.map(tenant => (
                                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                                ))}
                                <option value="none">ללא טננט</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                {isLoading ? (
                    <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-12 text-center">
                        <Loader2 size={32} className="animate-spin text-emerald-400 mx-auto mb-4" />
                        <p className="text-slate-600">טוען משתמשים...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-12 text-center">
                        <Users size={48} className="text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-600 text-lg">לא נמצאו משתמשים</p>
                    </div>
                ) : (
                    <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-200/70 flex justify-between items-center bg-white/60 backdrop-blur-sm">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <Users size={20} /> רשימת משתמשים ({filteredUsers.length})
                            </h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50/80 backdrop-blur-sm text-slate-600 font-bold border-b border-slate-200/70">
                                    <tr>
                                        <th className="px-6 py-4">משתמש</th>
                                        <th className="px-6 py-4">אימייל</th>
                                        <th className="px-6 py-4">תפקיד</th>
                                        <th className="px-6 py-4">טננט</th>
                                        <th className="px-6 py-4">סטטוס</th>
                                        <th className="px-6 py-4">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/60 text-slate-700">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Image
                                                        unoptimized
                                                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                                                        width={40}
                                                        height={40}
                                                        className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 object-cover"
                                                        alt={user.name}
                                                    />
                                                    <div>
                                                        <div className="font-bold text-slate-900">{user.name}</div>
                                                        {user.isSuperAdmin && (
                                                            <div className="text-xs text-emerald-700 flex items-center gap-1">
                                                                <Shield size={10} /> Super Admin
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-slate-500" />
                                                    <span className="text-slate-700">{user.email || 'ללא אימייל'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100/80 backdrop-blur-sm text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                                                    {user.role || 'ללא תפקיד'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-slate-500" />
                                                    <span className="text-slate-700">{getTenantName(user.tenantId)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    user.online 
                                                        ? 'bg-green-500/10 text-green-700 border-green-500/20' 
                                                        : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                                                }`}>
                                                    {user.online ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    {user.online ? 'מחובר' : 'מנותק'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingUser(user)}
                                                        className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 transition-all hover:scale-105"
                                                        title="ערוך משתמש"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-700 transition-all hover:scale-105"
                                                        title="מחק משתמש"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {selectedTenantForUser && (
                <AddUserToTenantModal
                    tenant={selectedTenantForUser}
                    onClose={() => setSelectedTenantForUser(null)}
                    onSuccess={() => {
                        setSelectedTenantForUser(null);
                        // Reload users
                        window.location.reload();
                    }}
                />
            )}
        </motion.div>
    );
};

