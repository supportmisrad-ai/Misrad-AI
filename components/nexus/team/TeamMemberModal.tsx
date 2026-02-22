
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, DollarSign, TrendingUp, Lock, LayoutGrid, Users, Crown } from 'lucide-react';
import { User, RoleDefinition } from '../../../types';
import { CustomSelect } from '../../CustomSelect';
import { OS_MODULES } from '../../../types/os-modules';
import { OSModuleIcon } from '../../shared/OSModuleIcon';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { isManagementRole } from '@/lib/constants/roles';

interface TeamMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    initialData?: User & { allowed_modules?: string[] };
    onSave: (data: unknown) => void;
    roleDefinitions: RoleDefinition[];
    departments: string[];
    isGlobalAdmin: boolean;
    myDepartment?: string;
    allUsers?: User[];
}

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
    isOpen, onClose, mode, initialData, onSave, roleDefinitions, departments, isGlobalAdmin, myDepartment, allUsers
}) => {
    const [form, setForm] = useState({ 
        name: '', 
        email: '',
        role: 'עובד', 
        department: '',
        avatar: '', 
        capacity: 5, 
        paymentType: 'hourly' as 'hourly' | 'monthly',
        hourlyRate: 50,
        monthlySalary: 0,
        commissionPct: 0,
        bonusPerTask: 0,
        allowed_modules: ['nexus', 'client'] as string[],
        managerId: null as string | null,
        managedDepartment: null as string | null,
    });

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setForm({
                    name: initialData.name,
                    email: initialData.email || '',
                    role: initialData.role,
                    department: initialData.department || '',
                    avatar: initialData.avatar,
                    capacity: initialData.capacity || 5,
                    paymentType: initialData.paymentType || 'hourly',
                    hourlyRate: initialData.hourlyRate || 0,
                    monthlySalary: initialData.monthlySalary || 0,
                    commissionPct: initialData.commissionPct || 0,
                    bonusPerTask: initialData.bonusPerTask || 0,
                    allowed_modules: initialData.allowed_modules || ['nexus', 'client'],
                    managerId: initialData.managerId || null,
                    managedDepartment: initialData.managedDepartment || null,
                });
            } else {
                setForm({ 
                    name: '', 
                    email: '',
                    role: roleDefinitions[0]?.name || 'עובד', 
                    department: isGlobalAdmin ? (departments[0] || '') : (myDepartment || ''),
                    avatar: '', 
                    capacity: 5, 
                    paymentType: 'hourly',
                    hourlyRate: 50,
                    monthlySalary: 0,
                    commissionPct: 0,
                    bonusPerTask: 0,
                    allowed_modules: ['nexus', 'client'],
                    managerId: null,
                    managedDepartment: null,
                });
            }
        }
    }, [isOpen, mode, initialData, isGlobalAdmin, myDepartment, departments, roleDefinitions]);

    const toggleModule = (moduleId: string) => {
        setForm(prev => ({
            ...prev,
            allowed_modules: prev.allowed_modules.includes(moduleId)
                ? prev.allowed_modules.filter(id => id !== moduleId)
                : [...prev.allowed_modules, moduleId]
        }));
    };
    useBackButtonClose(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col"
                style={{ overflow: 'visible' }}
            >
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-gray-900">
                        {mode === 'add' ? 'גיוס עובד חדש' : 'עריכת פרטי עובד'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">שם מלא</label>
                        <input 
                            autoFocus
                            type="text" 
                            value={form.name}
                            onChange={(e) => setForm({...form, name: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none font-medium"
                            placeholder="ישראל ישראלי"
                        />
                    </div>
                    
                    {mode === 'add' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">כתובת אימייל <span className="text-red-500">*</span></label>
                            <input 
                                type="email" 
                                value={form.email}
                                onChange={e => setForm({...form, email: e.target.value})}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none font-medium"
                                placeholder="employee@example.com"
                            />
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">תפקיד</label>
                            <div className="relative">
                                <CustomSelect 
                                    value={form.role}
                                    onChange={(val) => setForm({...form, role: val})}
                                    options={roleDefinitions.map(def => ({ value: def.name, label: def.name }))}
                                    placeholder="בחר תפקיד"
                                    className="w-full text-sm font-medium"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">מחלקה</label>
                            {isGlobalAdmin ? (
                                <CustomSelect 
                                    value={form.department}
                                    onChange={(val) => setForm({...form, department: val})}
                                    options={departments.map(d => ({ value: d, label: d }))}
                                    placeholder="בחר מחלקה"
                                    className="w-full text-sm font-medium"
                                />
                            ) : (
                                <div className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm font-bold flex items-center gap-2 cursor-not-allowed">
                                    <Lock size={12} /> {myDepartment}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">קיבולת (משימות)</label>
                        <input 
                            type="number" 
                            value={form.capacity}
                            onChange={e => setForm({...form, capacity: Number(e.target.value)})}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none font-medium"
                        />
                    </div>

                    {/* Hierarchy: Direct Manager */}
                    {isGlobalAdmin && allUsers && allUsers.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                <Users size={12} /> מנהל ישיר
                            </label>
                            <CustomSelect
                                value={form.managerId || ''}
                                onChange={(val) => setForm({...form, managerId: val || null})}
                                options={[
                                    { value: '', label: 'ללא מנהל ישיר' },
                                    ...allUsers
                                        .filter((u) => {
                                            if (u.id === initialData?.id) return false;
                                            if (initialData && u.managerId === initialData.id) return false;
                                            return true;
                                        })
                                        .map((u) => ({
                                            value: u.id,
                                            label: `${u.name}${u.role ? ` (${u.role})` : ''}`,
                                            icon: <Users size={14} className="text-gray-400" />
                                        }))
                                ]}
                                placeholder="בחר מנהל"
                                className="w-full text-sm font-medium"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                למי העובד כפוף? המנהל הישיר יראה את העובד בצוות שלו.
                            </p>
                        </div>
                    )}

                    {/* Hierarchy: Managed Department */}
                    {isGlobalAdmin && isManagementRole(form.role) && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                <Crown size={12} /> מחלקה בניהול
                            </label>
                            <CustomSelect
                                value={form.managedDepartment || ''}
                                onChange={(val) => setForm({...form, managedDepartment: val || null})}
                                options={[
                                    { value: '', label: 'לא מנהל מחלקה' },
                                    ...departments.map(d => ({ value: d, label: d }))
                                ]}
                                placeholder="בחר מחלקה"
                                className="w-full text-sm font-medium"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                אם העובד מנהל מחלקה — יוכל לראות את כל חברי המחלקה ומשימותיהם.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">הרשאות גישה למערכות (OS)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {OS_MODULES.map(module => {
                                const isSelected = form.allowed_modules.includes(module.id);
                                return (
                                    <button
                                        key={module.id}
                                        type="button"
                                        onClick={() => toggleModule(module.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                                            isSelected 
                                                ? 'border-black bg-black text-white' 
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-200'}`}>
                                            <OSModuleIcon moduleKey={module.id} size={16} className={isSelected ? 'text-white' : 'text-gray-600'} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-black leading-none mb-1">{module.nameHebrew}</div>
                                            <div className={`text-[8px] leading-tight opacity-70 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>{module.description}</div>
                                        </div>
                                        {isSelected && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {isGlobalAdmin && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-2 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center gap-1">
                                    <DollarSign size={14} /> מודל שכר בסיס
                                </label>
                                
                                <CustomSelect 
                                    value={form.paymentType}
                                    onChange={(val) => setForm({...form, paymentType: val as 'hourly' | 'monthly'})}
                                    options={[
                                        { value: 'hourly', label: 'תעריף שעתי' },
                                        { value: 'monthly', label: 'שכר חודשי (גלובלי)' }
                                    ]}
                                    className="w-full text-sm font-bold mb-3"
                                />

                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-emerald-700 mb-1">
                                        {form.paymentType === 'hourly' ? 'עלות מעביד לשעה' : 'משכורת חודשית (עלות מעביד)'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={form.paymentType === 'hourly' ? form.hourlyRate : form.monthlySalary}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            if (form.paymentType === 'hourly') {
                                                setForm({...form, hourlyRate: val});
                                            } else {
                                                setForm({...form, monthlySalary: val});
                                            }
                                        }}
                                        className="w-full p-3 bg-white border border-emerald-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-emerald-900"
                                        placeholder="0"
                                    />
                                    <span className="absolute top-[38px] left-3 -translate-y-1/2 text-xs font-bold text-emerald-400">
                                        {form.paymentType === 'hourly' ? '₪ / שעה' : '₪ / חודש'}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-emerald-200/50 pt-4">
                                <label className="block text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-1">
                                    <TrendingUp size={14} /> בונוסים ותמריצים
                                </label>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-700 mb-1">עמלת מכירות</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={form.commissionPct}
                                                onChange={e => setForm({...form, commissionPct: Number(e.target.value)})}
                                                className="w-full p-2 bg-white border border-emerald-200 rounded-lg focus:border-emerald-500 outline-none text-sm font-bold text-emerald-900"
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
                                                value={form.bonusPerTask}
                                                onChange={e => setForm({...form, bonusPerTask: Number(e.target.value)})}
                                                className="w-full p-2 bg-white border border-emerald-200 rounded-lg focus:border-emerald-500 outline-none text-sm font-bold text-emerald-900"
                                                placeholder="0"
                                            />
                                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-emerald-400">₪</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            ביטול
                        </button>
                        <button 
                            onClick={() => onSave(form)}
                            disabled={!form.name || (mode === 'add' && !form.email)}
                            className="flex-[2] bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Check size={18} /> {mode === 'add' ? 'הוסף לצוות' : 'שמור שינויים'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
