'use client';

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Shield, Plus, Lock, Users, Trash2, Check } from 'lucide-react';
import { RoleDefinition, PermissionId } from '../../types';
import { PERMISSIONS_LIST } from '../../constants';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

export const RolesTab: React.FC = () => {
    const { roleDefinitions, createRole, updateRole, deleteRole, addToast, isLoadingRoles } = useData();
    const [newRoleName, setNewRoleName] = useState('');
    const [isAddingRole, setIsAddingRole] = useState(false);
    
    // Delete Modal
    const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newRoleName.trim() && !roleDefinitions.some((r: RoleDefinition) => r.name === newRoleName.trim())) {
            try {
                const newRoleDef: Omit<RoleDefinition, 'id'> = {
                    name: newRoleName.trim(),
                    permissions: [] // Start with empty permissions
                };
                await createRole(newRoleDef);
                setNewRoleName('');
                setIsAddingRole(false);
            } catch (error: any) {
                // Error already handled in createRole
            }
        } else if (roleDefinitions.some((r: RoleDefinition) => r.name === newRoleName.trim())) {
            addToast('תפקיד בשם זה כבר קיים', 'warning');
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, roleName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setRoleToDelete(roleName);
    };

    const confirmDelete = async () => {
        if (roleToDelete) {
            try {
                await deleteRole(roleToDelete);
                setRoleToDelete(null);
            } catch (error: any) {
                // Error already handled in deleteRole
            }
        }
    };

    const togglePermission = async (roleName: string, permission: PermissionId) => {
        const role = roleDefinitions.find((r: RoleDefinition) => r.name === roleName);
        if (!role || !(role as any).id) {
            addToast('שגיאה: תפקיד לא נמצא', 'error');
            return;
        }
        
        const roleId = (role as any).id;
        const hasPermission = role.permissions.includes(permission);
        const newPermissions = hasPermission 
            ? role.permissions.filter((p: PermissionId) => p !== permission)
            : [...role.permissions, permission];
        
        try {
            await updateRole(roleId, { permissions: newPermissions });
        } catch (error: any) {
            // Error already handled in updateRole
        }
    };

    return (
        <motion.div key="roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת תפקיד"
                description="התפקיד יימחק מהמערכת. משתמשים עם תפקיד זה יאבדו את הגדרת התפקיד שלהם."
                itemName={roleToDelete || ''}
                isHardDelete={true}
            />

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2"><Shield size={20} className="text-gray-400" /> הגדרת הרשאות ותפקידים</h3>
                        <p className="text-sm text-gray-500 mt-1">שלוט בדיוק על מה כל עובד יכול לראות ולעשות במערכת.</p>
                    </div>
                    <button 
                        onClick={() => setIsAddingRole(true)} 
                        className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800"
                    >
                        <Plus size={18} /> תפקיד חדש
                    </button>
                </div>

                {isAddingRole && (
                    <form onSubmit={handleAddRole} className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 flex gap-2 animate-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            type="text" 
                            value={newRoleName} 
                            onChange={(e) => setNewRoleName(e.target.value)} 
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-black" 
                            placeholder="שם התפקיד החדש (למשל: מנהל פרויקטים)..." 
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">שמור</button>
                        <button type="button" onClick={() => setIsAddingRole(false)} className="bg-white text-gray-600 px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 hover:bg-gray-100">ביטול</button>
                    </form>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {roleDefinitions.map((role: RoleDefinition) => (
                        <div key={role.name} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors bg-white relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                                        {role.isSystem ? <Lock size={18} /> : <Users size={18} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{role.name}</h4>
                                        {role.isSystem && <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">תפקיד מערכת</span>}
                                    </div>
                                </div>
                                {!role.isSystem && (
                                    <button onClick={(e) => handleDeleteClick(e, role.name)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg" aria-label={`מחק תפקיד ${role.name}`}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">הרשאות גישה</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {PERMISSIONS_LIST.map(perm => {
                                        const hasPerm = role.permissions.includes(perm.id);
                                        return (
                                            <button 
                                                key={perm.id}
                                                onClick={() => { if (!role.isSystem) togglePermission(role.name, perm.id); }}
                                                disabled={role.isSystem} 
                                                className={`flex items-start gap-2 p-2 rounded-lg text-right transition-all border ${
                                                    hasPerm 
                                                    ? 'bg-blue-50 border-blue-200' 
                                                    : 'bg-white border-gray-100 hover:bg-gray-50'
                                                } ${role.isSystem ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                    hasPerm ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                                                }`}>
                                                    {hasPerm && <Check size={10} className="text-white" />}
                                                </div>
                                                <div>
                                                    <div className={`text-xs font-bold ${hasPerm ? 'text-blue-800' : 'text-gray-700'}`}>{perm.label}</div>
                                                    <div className="text-[10px] text-gray-500 leading-tight">{perm.desc}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
