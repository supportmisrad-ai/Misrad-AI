import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Filter, Mail, Building2, Globe, Edit, Trash2, Eye, CircleCheckBig, CircleX, Shield } from 'lucide-react';
import { Toast, User, Tenant } from '../../types';
import { AddUserToTenantModal } from './AddUserToTenantModal';
import { Avatar } from '@/components/Avatar';
import { getAdminUsersPage } from '@/app/actions/admin-users';
import { deleteAdminUser } from '@/app/actions/admin-users';
import { CustomSelect } from '@/components/CustomSelect';
import { SkeletonTable } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';

function getUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        const msg = (error as { message?: unknown }).message;
        return typeof msg === 'string' ? msg : 'שגיאה לא צפויה';
    }
    return 'שגיאה לא צפויה';
}

interface GlobalUsersPanelProps {
    tenants: Tenant[];
    addToast: (message: string, type?: Toast['type']) => void;
    hideHeader?: boolean;
}

export const GlobalUsersPanel: React.FC<GlobalUsersPanelProps> = ({ tenants, addToast, hideHeader }) => {
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
                const mapped: User[] = (result.data.items || []).map((row) => ({
                    id: String(row.id),
                    name: String(row.name || ''),
                    role: String(row.role || 'user'),
                    avatar: String(row.avatar || ''),
                    online: false,
                    capacity: 0,
                    email: row.email ? String(row.email) : undefined,
                    isSuperAdmin: false,
                    tenantId: null,
                }));
                setUsers(mapped);
                setTotal(result.data.total || 0);
            } catch (error: unknown) {
                console.error('[GlobalUsersPanel] Error loading users:', error);
                addToast(getUnknownErrorMessage(error) || 'שגיאה בטעינת משתמשים', 'error');
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
            if (selectedTenantFilter === 'none') {
                filtered = filtered.filter(u => !u.tenantId);
            } else {
                filtered = filtered.filter(u => u.tenantId === selectedTenantFilter);
            }
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
            const result = await deleteAdminUser(userId);
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete user');
            }

            setUsers(prev => prev.filter(u => u.id !== userId));
            addToast('משתמש נמחק בהצלחה', 'success');
        } catch (error: unknown) {
            console.error('[GlobalUsersPanel] Error deleting user:', error);
            addToast(getUnknownErrorMessage(error) || 'שגיאה במחיקת משתמש', 'error');
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
            <div className={hideHeader ? '' : 'mb-8'}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                    {!hideHeader ? (
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1">
                                ניהול משתמשים גלובלי
                            </h1>
                            <p className="text-slate-500 text-sm font-medium">מבט מרכזי על כל המשתמשים מכל הטננטים במערכת.</p>
                        </div>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center justify-between md:mb-4 text-xs font-medium text-slate-500 gap-4">
                        <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                            מציג <span className="text-slate-900 font-bold">{Math.min(pageOffset + 1, total)}</span>-
                            <span className="text-slate-900 font-bold">{Math.min(pageOffset + pageSize, total)}</span> מתוך <span className="text-slate-900 font-bold">{total}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
                                disabled={pageOffset === 0}
                                className="h-8"
                            >
                                הקודם
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageOffset(pageOffset + pageSize)}
                                disabled={pageOffset + pageSize >= total}
                                className="h-8"
                            >
                                הבא
                            </Button>
                        </div>
                    </div>
                </div>

                {!hideHeader && (
                    <Button
                        onClick={() => {
                            if (uniqueTenants.length === 0) {
                                addToast('אין טננטים זמינים. הוסף טננט קודם.', 'error');
                                return;
                            }
                            setSelectedTenantForUser(uniqueTenants[0]);
                        }}
                        className="w-full md:w-auto font-bold"
                    >
                        <UserPlus size={16} className="ml-2" /> הוסף משתמש
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="admin-pro-card p-5 hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">סה״כ משתמשים</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{totalUsers}</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Users size={18} />
                        </div>
                    </div>
                </div>

                {uniqueTenants.slice(0, 3).map((tenant: Tenant) => (
                    <div key={tenant.id} className="admin-pro-card p-5 hover:border-slate-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate pr-2" title={tenant.name}>
                                    {tenant.name}
                                </p>
                                <h3 className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{usersByTenant[tenant.id] || 0}</h3>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                <Building2 size={18} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="admin-pro-card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="חפש משתמש לפי שם, אימייל או תפקיד..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-0 rounded-lg py-2 pr-10 pl-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all h-10"
                        />
                    </div>
                    <div className="relative w-full md:w-auto min-w-[200px]">
                        <CustomSelect
                            value={selectedTenantFilter}
                            onChange={(val) => setSelectedTenantFilter(val)}
                            options={[{ value: 'all', label: 'כל הטננטים' }, ...uniqueTenants.map((tenant: Tenant) => ({ value: tenant.id, label: tenant.name })), { value: 'none', label: 'ללא טננט' }]}
                            placeholder="סינון לפי טננט"
                        />
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
                <div className="admin-pro-card p-12">
                    <div className="text-right">
                        <SkeletonTable rows={6} columns={6} />
                    </div>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="admin-pro-card p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
                        <Users size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">לא נמצאו משתמשים</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">נסה לשנות את סינון החיפוש או הטננט</p>
                </div>
            ) : (
                <div className="admin-pro-card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <Users size={16} /> רשימת משתמשים ({filteredUsers.length})
                        </h3>
                    </div>

                    <div className="md:hidden p-4 space-y-3">
                        {filteredUsers.map((user) => (
                            <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar
                                            src={user.avatar || null}
                                            name={user.name}
                                            alt={user.name}
                                            size="md"
                                            rounded="full"
                                            className="ring-2 ring-white shadow-sm"
                                        />
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 truncate text-sm">{user.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                                                <Mail size={12} className="text-slate-400" />
                                                <span className="truncate">{user.email || 'ללא אימייל'}</span>
                                            </div>
                                            {user.isSuperAdmin ? (
                                                <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                                    <Shield size={10} /> Super Admin
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <span
                                        className={`badge-pro ${
                                            user.online
                                                ? 'badge-pro-success'
                                                : 'badge-pro-neutral'
                                        }`}
                                    >
                                        {user.online ? 'מחובר' : 'מנותק'}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                        <div className="text-slate-400 font-bold text-[10px] uppercase">תפקיד</div>
                                        <div className="text-slate-900 font-bold mt-0.5 truncate">{user.role || 'ללא תפקיד'}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                        <div className="text-slate-400 font-bold text-[10px] uppercase">טננט</div>
                                        <div className="mt-0.5 flex items-center gap-1.5 text-slate-900 font-bold truncate">
                                            <Building2 size={12} className="text-slate-400" />
                                            <span className="truncate">{getTenantName(user.tenantId)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                                    <Button
                                        onClick={() => setEditingUser(user)}
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 h-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                                    >
                                        <Edit size={14} className="ml-1.5" /> ערוך
                                    </Button>
                                    <div className="w-px bg-slate-200 h-4 self-center" />
                                    <Button
                                        onClick={() => handleDeleteUser(user.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 h-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 size={14} className="ml-1.5" /> מחק
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr>
                                    <th className="admin-table-header">משתמש</th>
                                    <th className="admin-table-header">אימייל</th>
                                    <th className="admin-table-header">תפקיד</th>
                                    <th className="admin-table-header">טננט</th>
                                    <th className="admin-table-header">סטטוס</th>
                                    <th className="admin-table-header w-24">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="admin-table-row group">
                                        <td className="admin-table-cell">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={user.avatar || null}
                                                    name={user.name}
                                                    alt={user.name}
                                                    size="sm"
                                                    rounded="full"
                                                    className="ring-1 ring-slate-100"
                                                />
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                                                    {user.isSuperAdmin ? (
                                                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                                            <Shield size={10} /> Super Admin
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="admin-table-cell">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <span className="truncate max-w-[200px]">{user.email || 'ללא אימייל'}</span>
                                            </div>
                                        </td>
                                        <td className="admin-table-cell">
                                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                {user.role || '—'}
                                            </span>
                                        </td>
                                        <td className="admin-table-cell">
                                            <div className="flex items-center gap-2 text-slate-900 font-medium">
                                                <Building2 size={14} className="text-slate-400" />
                                                <span className="truncate max-w-[150px]">{getTenantName(user.tenantId)}</span>
                                            </div>
                                        </td>
                                        <td className="admin-table-cell">
                                            <span
                                                className={`badge-pro ${
                                                    user.online
                                                        ? 'badge-pro-success'
                                                        : 'badge-pro-neutral'
                                                }`}
                                            >
                                                {user.online ? 'מחובר' : 'מנותק'}
                                            </span>
                                        </td>
                                        <td className="admin-table-cell">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    onClick={() => setEditingUser(user)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    title="ערוך"
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                    title="מחק"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {selectedTenantForUser ? (
                <AddUserToTenantModal
                    tenant={selectedTenantForUser}
                    onClose={() => setSelectedTenantForUser(null)}
                    onSuccess={() => {
                        setSelectedTenantForUser(null);
                        // Reload users
                        window.location.reload();
                    }}
                />
            ) : null}
        </motion.div>
    );
};

