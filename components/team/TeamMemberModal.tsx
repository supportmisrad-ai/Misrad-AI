
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, DollarSign, TrendingUp, Lock } from 'lucide-react';
import { User, RoleDefinition } from '../../types';
import { CustomSelect } from '../CustomSelect';

interface TeamMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    initialData?: User;
    onSave: (data: unknown) => void;
    roleDefinitions: RoleDefinition[];
    departments: string[];
    isGlobalAdmin: boolean;
    myDepartment?: string;
}

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
    isOpen, onClose, mode, initialData, onSave, roleDefinitions, departments, isGlobalAdmin, myDepartment
}) => {
    const [form, setForm] = useState({ 
        name: '', 
        role: 'עובד', 
        department: '',
        avatar: '', 
        capacity: 5, 
        paymentType: 'hourly' as 'hourly' | 'monthly',
        hourlyRate: 50,
        monthlySalary: 0,
        commissionPct: 0,
        bonusPerTask: 0
    });

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setForm({
                    name: initialData.name,
                    role: initialData.role,
                    department: initialData.department || '',
                    avatar: initialData.avatar,
                    capacity: initialData.capacity || 5,
                    paymentType: initialData.paymentType || 'hourly',
                    hourlyRate: initialData.hourlyRate || 0,
                    monthlySalary: initialData.monthlySalary || 0,
                    commissionPct: initialData.commissionPct || 0,
                    bonusPerTask: initialData.bonusPerTask || 0
                });
            } else {
                setForm({ 
                    name: '', 
                    role: roleDefinitions[0]?.name || 'עובד', 
                    department: isGlobalAdmin ? (departments[0] || 'Operations') : (myDepartment || 'Operations'),
                    avatar: '', 
                    capacity: 5, 
                    paymentType: 'hourly',
                    hourlyRate: 50,
                    monthlySalary: 0,
                    commissionPct: 0,
                    bonusPerTask: 0
                });
            }
        }
    }, [isOpen, mode, initialData, isGlobalAdmin, myDepartment, departments, roleDefinitions]);

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
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none font-medium"
                            placeholder="ישראל ישראלי"
                        />
                    </div>
                    
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
                            disabled={!form.name}
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
