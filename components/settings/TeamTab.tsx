
import React, { useMemo, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useSecureAPI } from '../../hooks/useSecureAPI';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Edit2, Trash2, Lock, Shield, DollarSign, TrendingUp, Users, Building2, Crown, Smartphone } from 'lucide-react';
import { User } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { CustomSelect } from '../CustomSelect';
import DevicePairingModal from '@/components/admin/DevicePairingModal';
import DevicePairingGeneratorModal from '@/components/admin/DevicePairingGeneratorModal';
import { isAdminRole, isCeoRole } from '@/lib/constants/roles';
import { usePathname } from 'next/navigation';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { createNexusUser, deleteNexusUser, sendNexusUserInvitation, updateNexusUser } from '@/app/actions/nexus';

export const TeamTab: React.FC = () => {
    const { users, roleDefinitions, currentUser, addUser, updateUser, removeUser, hasPermission, addToast, departments } = useData();
    const { approveKioskPairing, createKioskQrPairingToken } = useSecureAPI();
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const orgSlug = useMemo(() => getWorkspaceOrgSlugFromPathname(pathname), [pathname]);
    const updateUserMutation = useMutation({
        mutationFn: async (params: { userId: string; updates: Partial<User> }) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return updateNexusUser({ orgId: orgSlug, userId: params.userId, updates: params.updates });
        },
    });
    const createUserMutation = useMutation({
        mutationFn: async (input: Omit<User, 'id'>) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return createNexusUser({ orgId: orgSlug, input });
        },
    });
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return deleteNexusUser({ orgId: orgSlug, userId });
        },
    });
    const inviteUserMutation = useMutation({
        mutationFn: async (params: { email: string; userId?: string | null; userName?: string | null; department?: string | null; role?: string | null }) => {
            if (!orgSlug) throw new Error('Missing orgSlug');
            return sendNexusUserInvitation({ orgId: orgSlug, ...params });
        },
    });
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isPairDeviceModalOpen, setIsPairDeviceModalOpen] = useState(false);
    const [isPairDeviceQrModalOpen, setIsPairDeviceQrModalOpen] = useState(false);
    const [memberForm, setMemberForm] = useState<{ 
        name: string;
        email: string;
        role: string;
        department: string;
        avatar: string;
        capacity: number;
        targetTasks: number;
        targetLeads: number;
        paymentType: 'hourly' | 'monthly';
        hourlyRate: number;
        monthlySalary: number;
        commissionPct: number;
        bonusPerTask: number;
        managerId: string | null;
    }>({ 
        name: '', 
        email: '',
        role: 'עובד', 
        department: departments[0] || '',
        avatar: '', 
        capacity: 5, 
        targetTasks: 0, 
        targetLeads: 0, 
        paymentType: 'hourly',
        hourlyRate: 0,
        monthlySalary: 0,
        commissionPct: 0,
        bonusPerTask: 0,
        managerId: null
    });
    const [isShaking, setIsShaking] = useState(false);
    
    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);
    
    const nameInputRef = useRef<HTMLInputElement>(null);

    const openTeamModal = (user?: User) => {
        setIsShaking(false);
        if (user) {
            // Check if user can edit this user (only Admin can edit CEO, only Super Admin can edit Admin)
            const isTargetCEO = isCeoRole(user.role);
            const isTargetAdmin = isAdminRole(user.role);
            const isCurrentUserAdmin = isAdminRole(currentUser.role) || currentUser.isSuperAdmin;
            const isCurrentUserSuperAdmin = currentUser.isSuperAdmin;
            
            if (isTargetCEO && !isCurrentUserAdmin) {
                addToast('רק אדמין יכול לערוך מנכ״ל', 'error');
                return;
            }
            
            if (isTargetAdmin && !isCurrentUserSuperAdmin) {
                addToast('רק סופר אדמין יכול לערוך אדמין', 'error');
                return;
            }
            setEditingUser(user);
            setMemberForm({ 
                name: user.name, 
                email: user.email || '',
                role: user.role, 
                department: user.department || '',
                avatar: user.avatar, 
                capacity: user.capacity || 5,
                targetTasks: user.targets?.tasksMonth || 0,
                targetLeads: user.targets?.leadsMonth || 0,
                paymentType: user.paymentType || 'hourly',
                hourlyRate: user.hourlyRate || 0,
                monthlySalary: user.monthlySalary || 0,
                commissionPct: user.commissionPct || 0,
                bonusPerTask: user.bonusPerTask || 0,
                managerId: user.managerId || null
            });
        } else {
            setEditingUser(null);
            setMemberForm({ 
                name: '', 
                email: '',
                role: roleDefinitions[0]?.name || 'עובד', 
                department: departments[0] || '',
                avatar: '', 
                capacity: 5, 
                targetTasks: 0, 
                targetLeads: 0, 
                paymentType: 'hourly',
                hourlyRate: 50,
                monthlySalary: 0,
                commissionPct: 0,
                bonusPerTask: 0,
                managerId: null
            });
        }
        setIsTeamModalOpen(true);
    };

    const handleSaveMember = async () => {
        if (!memberForm.name.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        if (!editingUser && (!memberForm.email || !memberForm.email.trim())) {
            addToast('נא להזין כתובת אימייל', 'error');
            return;
        }

        const targets = { tasksMonth: Number(memberForm.targetTasks), leadsMonth: Number(memberForm.targetLeads) };
        
        try {
            if (editingUser) {
                // Update user via API
                const updated = await updateUserMutation.mutateAsync({
                    userId: editingUser.id,
                    updates: {
                    name: memberForm.name,
                    email: memberForm.email,
                    role: memberForm.role,
                    department: memberForm.department || undefined,
                    capacity: Number(memberForm.capacity),
                    targets,
                    paymentType: memberForm.paymentType,
                    hourlyRate: Number(memberForm.hourlyRate),
                    monthlySalary: Number(memberForm.monthlySalary),
                    commissionPct: Number(memberForm.commissionPct),
                    bonusPerTask: Number(memberForm.bonusPerTask),
                    managerId: memberForm.managerId,
                    }
                });
                
                // Update local state
                updateUser(editingUser.id, updated as any);
                if (orgSlug) {
                    queryClient.invalidateQueries({ queryKey: ['nexus', 'users', orgSlug] });
                }
            } else {
                // Create new user via API
                const createdUser = await createUserMutation.mutateAsync({
                    name: memberForm.name,
                    email: memberForm.email,
                    role: memberForm.role,
                    department: memberForm.department || undefined,
                    avatar: '',
                    online: false,
                    capacity: Number(memberForm.capacity),
                    targets,
                    paymentType: memberForm.paymentType,
                    hourlyRate: Number(memberForm.hourlyRate),
                    monthlySalary: Number(memberForm.monthlySalary),
                    commissionPct: Number(memberForm.commissionPct),
                    bonusPerTask: Number(memberForm.bonusPerTask),
                    managerId: memberForm.managerId || null,
                } as any);
                
                // Send invitation email
                try {
                    const inviteData = await inviteUserMutation.mutateAsync({
                        email: memberForm.email,
                        userId: createdUser.id,
                        userName: memberForm.name,
                        department: memberForm.department || createdUser.department || departments[0] || 'כללי',
                        role: memberForm.role,
                    });
                    if (inviteData.emailSent) {
                        addToast(`הזמנה נשלחה למייל ${memberForm.email}`, 'success');
                    } else {
                        addToast('המשתמש נוצר, אך שליחת ההזמנה נכשלה', 'warning');
                    }
                } catch (inviteError) {
                    console.error('Error sending invitation:', inviteError);
                    addToast('המשתמש נוצר, אך שליחת ההזמנה נכשלה', 'warning');
                }

                // Add to local state
                addUser(createdUser as any);
                if (orgSlug) {
                    queryClient.invalidateQueries({ queryKey: ['nexus', 'users', orgSlug] });
                }
            }
            setIsTeamModalOpen(false);
        } catch (error: any) {
            addToast(error.message || 'שגיאה בשמירת המשתמש', 'error');
            console.error('Error saving member:', error);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setUserToDelete({ id, name });
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await deleteUserMutation.mutateAsync(userToDelete.id);
            removeUser(userToDelete.id);
            if (orgSlug) {
                queryClient.invalidateQueries({ queryKey: ['nexus', 'users', orgSlug] });
            }
        } catch (error: any) {
            addToast(error?.message || 'שגיאה במחיקת המשתמש', 'error');
        } finally {
            setUserToDelete(null);
        }
    };

    const openPairDeviceModal = () => {
        if (!hasPermission('manage_team')) {
            addToast('אין לך הרשאה לצמד מכשיר', 'error');
            return;
        }
        setIsPairDeviceQrModalOpen(true);
    };

    return (
        <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={confirmDelete}
                title="הסרת עובד"
                description="המשתמש יועבר לארכיון (סל המיחזור). המשימות שלו יישארו במערכת אך ללא שיוך פעיל."
                itemName={userToDelete?.name}
                isHardDelete={false}
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">ניהול משתמשים</h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">הוספה, עריכה והסרה של חברי צוות במערכת.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <button onClick={() => openPairDeviceModal()} className="bg-white text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all w-full md:w-auto">
                        <Smartphone size={16} /> צמד מכשיר
                    </button>
                    <button onClick={() => openTeamModal()} className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all w-full md:w-auto">
                        <UserPlus size={16} /> הוסף משתמש
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">שם</th>
                            <th className="px-6 py-4">תפקיד</th>
                            <th className="px-6 py-4">מחלקה</th>
                            <th className="px-6 py-4">מנהל</th>
                            <th className="px-6 py-4">קיבולת</th>
                            <th className="px-6 py-4">מודל שכר</th>
                            <th className="px-6 py-4">עלות</th>
                            <th className="px-6 py-4">בונוסים</th>
                            <th className="px-6 py-4">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map((user: User) => {
                            const isProtected = user.role.includes('מנכ') || user.id === currentUser.id;
                            const costDisplay = user.paymentType === 'monthly' ? `₪${user.monthlySalary?.toLocaleString()}` : `₪${user.hourlyRate}`;
                            const typeDisplay = user.paymentType === 'monthly' ? 'חודשי' : 'שעתי';
                            const hasIncentives = (user.commissionPct && user.commissionPct > 0) || (user.bonusPerTask && user.bonusPerTask > 0);
                            const manager = user.managerId ? users.find((u: User) => u.id === user.managerId) : null;
                            const canManageTeam = hasPermission('manage_team');
                            
                            return (
                                <tr key={user.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <img src={user.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
                                        <div className="flex flex-col">
                                        <span className="font-bold text-gray-900">{user.name}</span>
                                            {user.managedDepartment && (
                                                <span className="text-[10px] text-yellow-600 font-bold flex items-center gap-1">
                                                    <Crown size={10} />
                                                    מנהל {user.managedDepartment}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{user.role}</td>
                                    <td className="px-6 py-4">
                                        {user.department ? (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{user.department}</span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">ללא מחלקה</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {manager ? (
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-gray-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-900 font-medium">{manager.name}</span>
                                                    <span className="text-xs text-gray-500">{manager.role}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">ללא מנהל</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{user.capacity} משימות</span></td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{typeDisplay}</td>
                                    <td className="px-6 py-4 text-emerald-600 font-bold">{costDisplay}</td>
                                    <td className="px-6 py-4">
                                        {hasIncentives ? (
                                            <div className="flex flex-col text-xs font-medium text-gray-600">
                                                {user.commissionPct ? <span>{user.commissionPct}% עמלה</span> : null}
                                                {user.bonusPerTask ? <span>₪{user.bonusPerTask} / משימה</span> : null}
                                            </div>
                                        ) : <span className="text-gray-400 text-xs">-</span>}
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        {(() => {
                                            const isTargetCEO = isCeoRole(user.role);
                                            const isTargetAdmin = isAdminRole(user.role);
                                            const isCurrentUserAdmin = isAdminRole(currentUser.role) || currentUser.isSuperAdmin;
                                            const isCurrentUserSuperAdmin = currentUser.isSuperAdmin;
                                            
                                            let canEdit = true;
                                            let tooltip = '';
                                            
                                            if (isTargetCEO && !isCurrentUserAdmin) {
                                                canEdit = false;
                                                tooltip = 'רק אדמין יכול לערוך מנכ״ל';
                                            } else if (isTargetAdmin && !isCurrentUserSuperAdmin) {
                                                canEdit = false;
                                                tooltip = 'רק סופר אדמין יכול לערוך אדמין';
                                            }
                                            
                                            return canEdit ? (
                                                <button onClick={() => openTeamModal(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" aria-label={`ערוך פרטי עובד ${user.name}`}><Edit2 size={16} /></button>
                                            ) : (
                                                <div className="p-1.5 text-gray-200 cursor-not-allowed" title={tooltip}><Edit2 size={16} /></div>
                                            );
                                        })()}
                                        {!isProtected && (
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, user.id, user.name)} 
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                aria-label={`מחק עובד ${user.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {isProtected && (
                                            <div className="p-1.5 text-gray-300 cursor-not-allowed" title="לא ניתן למחוק משתמש זה"><Lock size={16} /></div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View - Enhanced */}
            <div className="md:hidden space-y-3">
                {users.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">אין משתמשים במערכת</h3>
                        <p className="text-sm text-gray-500 mb-6">התחל על ידי הוספת משתמש חדש</p>
                        <button
                            onClick={() => openTeamModal()}
                            className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                        >
                            <UserPlus size={18} /> הוסף משתמש ראשון
                        </button>
                    </div>
                ) : (
                    users.map((user: User) => {
                        const isProtected = user.role.includes('מנכ') || user.id === currentUser.id;
                        const costDisplay = user.paymentType === 'monthly' ? `₪${user.monthlySalary?.toLocaleString()}` : `₪${user.hourlyRate}`;
                        const typeDisplay = user.paymentType === 'monthly' ? 'חודשי' : 'שעתי';
                        const hasIncentives = (user.commissionPct && user.commissionPct > 0) || (user.bonusPerTask && user.bonusPerTask > 0);
                        const manager = user.managerId ? users.find((u: User) => u.id === user.managerId) : null;
                        
                        return (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3 active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <img src={user.avatar} className="w-12 h-12 rounded-full bg-gray-200 shrink-0 border border-gray-100" alt={user.name} />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-black text-gray-900 text-base truncate">{user.name}</div>
                                            <div className="text-sm text-gray-600 truncate">{user.role}</div>
                                            {user.managedDepartment && (
                                                <div className="text-[10px] text-yellow-600 font-bold flex items-center gap-1 mt-1">
                                                    <Crown size={10} />
                                                    מנהל {user.managedDepartment}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {(() => {
                                            const isTargetCEO = isCeoRole(user.role);
                                            const isTargetAdmin = isAdminRole(user.role);
                                            const isCurrentUserAdmin = isAdminRole(currentUser.role) || currentUser.isSuperAdmin;
                                            const isCurrentUserSuperAdmin = currentUser.isSuperAdmin;
                                            
                                            let canEdit = true;
                                            let tooltip = '';
                                            
                                            if (isTargetCEO && !isCurrentUserAdmin) {
                                                canEdit = false;
                                                tooltip = 'רק אדמין יכול לערוך מנכ״ל';
                                            } else if (isTargetAdmin && !isCurrentUserSuperAdmin) {
                                                canEdit = false;
                                                tooltip = 'רק סופר אדמין יכול לערוך אדמין';
                                            }
                                            
                                            return canEdit ? (
                                                <button onClick={() => openTeamModal(user)} className="p-2 text-gray-400 active:text-blue-600 active:bg-blue-50 rounded-lg transition-all active:scale-95" aria-label={`ערוך פרטי עובד ${user.name}`}>
                                                    <Edit2 size={18} />
                                                </button>
                                            ) : (
                                                <div className="p-2 text-gray-200 cursor-not-allowed" title={tooltip}>
                                                    <Edit2 size={18} />
                                                </div>
                                            );
                                        })()}
                                        {!isProtected && (
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, user.id, user.name)} 
                                                className="p-2 text-gray-400 active:text-red-600 active:bg-red-50 rounded-lg transition-all active:scale-95"
                                                aria-label={`מחק עובד ${user.name}`}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        {isProtected && (
                                            <div className="p-2 text-gray-300 cursor-not-allowed" title="לא ניתן למחוק משתמש זה">
                                                <Lock size={18} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">מחלקה</div>
                                        {user.department ? (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold border border-blue-100">{user.department}</span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">ללא מחלקה</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">קיבולת</div>
                                        <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold border border-gray-200">{user.capacity} משימות</span>
                                    </div>
                                </div>
                                
                                {manager && (
                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                            <Users size={12} /> מנהל ישיר
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 font-bold">{manager.name}</span>
                                                <span className="text-xs text-gray-500">{manager.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="pt-2 border-t border-gray-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">מודל שכר</div>
                                        <div className="text-xs font-bold text-gray-500">{typeDisplay}</div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">עלות</div>
                                        <div className="text-emerald-600 font-black text-sm">{costDisplay}</div>
                                    </div>
                                    {hasIncentives && (
                                        <div className="pt-2 border-t border-gray-50">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">בונוסים ותמריצים</div>
                                            <div className="flex flex-col gap-1 text-xs font-bold text-gray-600">
                                                {user.commissionPct ? <span>{user.commissionPct}% עמלה</span> : null}
                                                {user.bonusPerTask ? <span>₪{user.bonusPerTask} / משימה</span> : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            <AnimatePresence>
                <DevicePairingGeneratorModal
                    open={isPairDeviceQrModalOpen}
                    onCloseAction={() => setIsPairDeviceQrModalOpen(false)}
                    createTokenAction={createKioskQrPairingToken}
                    addToastAction={addToast as any}
                />
                <DevicePairingModal
                    open={isPairDeviceModalOpen}
                    onClose={() => setIsPairDeviceModalOpen(false)}
                    users={users.map((u: User) => ({ id: u.id, name: u.name, role: u.role }))}
                    approvePairing={approveKioskPairing}
                    addToast={addToast as any}
                />
                {isTeamModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTeamModalOpen(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col p-4 md:p-6 max-h-[90vh] md:max-h-[85vh]"
                            style={{ overflow: 'visible' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="font-bold text-base md:text-lg mb-4">{editingUser ? 'עריכת משתמש' : 'משתמש חדש'}</h3>
                            <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">שם מלא</label>
                                    <input 
                                        ref={nameInputRef}
                                        value={memberForm.name} 
                                        onChange={e => { setMemberForm({...memberForm, name: e.target.value}); setIsShaking(false); }}
                                        placeholder="ישראל ישראלי" 
                                        className={`w-full p-2.5 md:p-3 border rounded-xl outline-none transition-all text-sm ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">כתובת אימייל {!editingUser && <span className="text-red-500">*</span>}</label>
                                    <input 
                                        type="email"
                                        value={memberForm.email} 
                                        onChange={e => setMemberForm({...memberForm, email: e.target.value})}
                                        placeholder="user@example.com" 
                                        className="w-full p-2.5 md:p-3 border border-gray-200 rounded-xl outline-none transition-all focus:border-black dir-ltr text-left text-sm"
                                        disabled={!!editingUser}
                                    />
                                    {!editingUser && (
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            העובד יקבל קישור התחברות למייל זה אוטומטית
                                        </p>
                                    )}
                                </div>
                                <div className="relative z-20">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">תפקיד</label>
                                    <CustomSelect 
                                        value={memberForm.role}
                                        onChange={(val) => setMemberForm({...memberForm, role: val})}
                                        options={roleDefinitions.map((r: { name: string; id?: string }) => ({ 
                                            value: r.name, 
                                            label: r.name,
                                            icon: <Shield size={14} className="text-gray-400" />
                                        }))}
                                        placeholder="בחר תפקיד"
                                        className="w-full"
                                    />
                                </div>
                                
                                <div className="relative z-20">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">מחלקה</label>
                                    <CustomSelect 
                                        value={memberForm.department || ''}
                                        onChange={(val) => setMemberForm({...memberForm, department: val || ''})}
                                        options={[
                                            { value: '', label: 'ללא מחלקה' },
                                            ...(departments || []).map((d: string) => ({
                                                value: d,
                                                label: d,
                                                icon: <Building2 size={14} className="text-gray-400" />
                                            }))
                                        ]}
                                        placeholder="בחר מחלקה"
                                        className="w-full"
                                    />
                                </div>
                                
                                {hasPermission('manage_team') && (
                                    <div className="relative z-20">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                            <Users size={12} /> מנהל ישיר
                                        </label>
                                        <CustomSelect 
                                            value={memberForm.managerId || ''}
                                            onChange={(val) => setMemberForm({...memberForm, managerId: val || null})}
                                            options={[
                                                { value: '', label: 'ללא מנהל' },
                                                ...users
                                                    .filter((u: User) => {
                                                        // Can't be manager of yourself
                                                        if (u.id === editingUser?.id) return false;
                                                        // Can't select someone who already reports to this user (would create loop)
                                                        if (editingUser && (u as User).managerId === editingUser.id) return false;
                                                        return true;
                                                    })
                                                    .map((u: User) => {
                                                        // Show role in label for clarity
                                                        const roleLabel = u.role ? ` (${u.role})` : '';
                                                        return {
                                                            value: u.id, 
                                                            label: `${u.name}${roleLabel}`,
                                                            icon: <Users size={14} className="text-gray-400" />
                                                        };
                                                    })
                                            ]}
                                            placeholder="בחר מנהל"
                                            className="w-full"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            הגדר את המנהל הישיר של העובד. כל תפקיד יכול להיות מנהל: מנכ״ל, סמנכ״ל, ראש מחלקה, מנהל, עובד או פרילנסר.
                                        </p>
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">קיבולת משימות</label>
                                        <input type="number" value={memberForm.capacity} onChange={e => setMemberForm({...memberForm, capacity: Number(e.target.value)})} placeholder="5" className="w-full p-2.5 md:p-3 border border-gray-200 rounded-xl text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">מודל שכר</label>
                                        <CustomSelect 
                                            value={memberForm.paymentType}
                                            onChange={(val) => setMemberForm({...memberForm, paymentType: val as any})}
                                            options={[
                                                { value: 'hourly', label: 'שעתי' },
                                                { value: 'monthly', label: 'חודשי' }
                                            ]}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">
                                        {memberForm.paymentType === 'hourly' ? 'תעריף שעתי (₪)' : 'שכר חודשי (₪)'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={memberForm.paymentType === 'hourly' ? memberForm.hourlyRate : memberForm.monthlySalary} 
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            if(memberForm.paymentType === 'hourly') setMemberForm({...memberForm, hourlyRate: val});
                                            else setMemberForm({...memberForm, monthlySalary: val});
                                        }} 
                                        placeholder="0" 
                                        className="w-full p-2.5 md:p-3 border border-emerald-200 rounded-xl font-bold bg-white text-emerald-900 outline-none focus:border-emerald-500 text-sm" 
                                    />
                                </div>

                                <div className="border-t border-emerald-100 pt-2 mt-2">
                                    <label className="block text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-1">
                                        <TrendingUp size={14} /> בונוסים ותמריצים
                                    </label>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-emerald-700 mb-1">עמלת מכירות</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={memberForm.commissionPct}
                                                    onChange={e => setMemberForm({...memberForm, commissionPct: Number(e.target.value)})}
                                                    className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg focus:border-emerald-500 outline-none text-sm font-bold text-emerald-900"
                                                    placeholder="0"
                                                />
                                                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-emerald-400">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-emerald-700 mb-1">בונוס למשימה</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={memberForm.bonusPerTask}
                                                    onChange={e => setMemberForm({...memberForm, bonusPerTask: Number(e.target.value)})}
                                                    className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-lg focus:border-emerald-500 outline-none text-sm font-bold text-emerald-900"
                                                    placeholder="0"
                                                />
                                                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-emerald-400">₪</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4 md:mt-6 pt-4 border-t border-gray-100 shrink-0">
                                <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold w-full sm:w-auto">ביטול</button>
                                <button onClick={handleSaveMember} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold w-full sm:w-auto">שמור</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
