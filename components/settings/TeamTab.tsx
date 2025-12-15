
import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Edit2, Trash2, Lock, Shield, DollarSign, TrendingUp } from 'lucide-react';
import { User } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { CustomSelect } from '../CustomSelect';

export const TeamTab: React.FC = () => {
    const { users, roleDefinitions, currentUser, addUser, updateUser, removeUser } = useData();
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [memberForm, setMemberForm] = useState({ 
        name: '', 
        role: 'עובד', 
        avatar: '', 
        capacity: 5, 
        targetTasks: 0, 
        targetLeads: 0, 
        paymentType: 'hourly' as 'hourly' | 'monthly',
        hourlyRate: 0,
        monthlySalary: 0,
        commissionPct: 0,
        bonusPerTask: 0
    });
    const [isShaking, setIsShaking] = useState(false);
    
    // Delete Modal State
    const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);
    
    const nameInputRef = useRef<HTMLInputElement>(null);

    const openTeamModal = (user?: User) => {
        setIsShaking(false);
        if (user) {
            setEditingUser(user);
            setMemberForm({ 
                name: user.name, 
                role: user.role, 
                avatar: user.avatar, 
                capacity: user.capacity || 5,
                targetTasks: user.targets?.tasksMonth || 0,
                targetLeads: user.targets?.leadsMonth || 0,
                paymentType: user.paymentType || 'hourly',
                hourlyRate: user.hourlyRate || 0,
                monthlySalary: user.monthlySalary || 0,
                commissionPct: user.commissionPct || 0,
                bonusPerTask: user.bonusPerTask || 0
            });
        } else {
            setEditingUser(null);
            setMemberForm({ 
                name: '', 
                role: roleDefinitions[0]?.name || 'עובד', 
                avatar: '', 
                capacity: 5, 
                targetTasks: 0, 
                targetLeads: 0, 
                paymentType: 'hourly',
                hourlyRate: 50,
                monthlySalary: 0,
                commissionPct: 0,
                bonusPerTask: 0
            });
        }
        setIsTeamModalOpen(true);
    };

    const handleSaveMember = () => {
        if (!memberForm.name.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const targets = { tasksMonth: Number(memberForm.targetTasks), leadsMonth: Number(memberForm.targetLeads) };
        if (editingUser) {
            updateUser(editingUser.id, {
                name: memberForm.name,
                role: memberForm.role,
                capacity: Number(memberForm.capacity),
                targets,
                paymentType: memberForm.paymentType,
                hourlyRate: Number(memberForm.hourlyRate),
                monthlySalary: Number(memberForm.monthlySalary),
                commissionPct: Number(memberForm.commissionPct),
                bonusPerTask: Number(memberForm.bonusPerTask)
            });
        } else {
            const newUser: User = {
                id: Math.random().toString(36).substr(2, 9),
                name: memberForm.name,
                role: memberForm.role,
                avatar: memberForm.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberForm.name)}&background=random`,
                online: false,
                capacity: Number(memberForm.capacity),
                targets,
                paymentType: memberForm.paymentType,
                hourlyRate: Number(memberForm.hourlyRate),
                monthlySalary: Number(memberForm.monthlySalary),
                commissionPct: Number(memberForm.commissionPct),
                bonusPerTask: Number(memberForm.bonusPerTask)
            };
            addUser(newUser);
        }
        setIsTeamModalOpen(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setUserToDelete({ id, name });
    };

    const confirmDelete = () => {
        if (userToDelete) {
            removeUser(userToDelete.id);
            setUserToDelete(null);
        }
    };

    return (
        <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={confirmDelete}
                title="הסרת עובד"
                description="המשתמש יועבר לארכיון (סל המיחזור). המשימות שלו יישארו במערכת אך ללא שיוך פעיל."
                itemName={userToDelete?.name}
                isHardDelete={false}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">ניהול משתמשים</h2>
                    <p className="text-sm text-gray-500">הוספה, עריכה והסרה של חברי צוות במערכת.</p>
                </div>
                <button onClick={() => openTeamModal()} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800">
                    <UserPlus size={16} /> הוסף משתמש
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">שם</th>
                            <th className="px-6 py-4">תפקיד</th>
                            <th className="px-6 py-4">קיבולת</th>
                            <th className="px-6 py-4">מודל שכר</th>
                            <th className="px-6 py-4">עלות</th>
                            <th className="px-6 py-4">בונוסים</th>
                            <th className="px-6 py-4">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map(user => {
                            const isProtected = user.role.includes('מנכ') || user.id === currentUser.id;
                            const costDisplay = user.paymentType === 'monthly' ? `₪${user.monthlySalary?.toLocaleString()}` : `₪${user.hourlyRate}`;
                            const typeDisplay = user.paymentType === 'monthly' ? 'חודשי' : 'שעתי';
                            const hasIncentives = (user.commissionPct && user.commissionPct > 0) || (user.bonusPerTask && user.bonusPerTask > 0);
                            
                            return (
                                <tr key={user.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <img src={user.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
                                        <span className="font-bold text-gray-900">{user.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{user.role}</td>
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
                                        <button onClick={() => openTeamModal(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                        {!isProtected && (
                                            <button 
                                                onClick={(e) => handleDeleteClick(e, user.id, user.name)} 
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

            <AnimatePresence>
                {isTeamModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTeamModalOpen(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col p-6"
                            style={{ overflow: 'visible' }}
                        >
                            <h3 className="font-bold text-lg mb-4">{editingUser ? 'עריכת משתמש' : 'משתמש חדש'}</h3>
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">שם מלא</label>
                                    <input 
                                        ref={nameInputRef}
                                        value={memberForm.name} 
                                        onChange={e => { setMemberForm({...memberForm, name: e.target.value}); setIsShaking(false); }}
                                        placeholder="ישראל ישראלי" 
                                        className={`w-full p-3 border rounded-xl outline-none transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
                                    />
                                </div>
                                <div className="relative z-20">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">תפקיד</label>
                                    <CustomSelect 
                                        value={memberForm.role}
                                        onChange={(val) => setMemberForm({...memberForm, role: val})}
                                        options={roleDefinitions.map(r => ({ 
                                            value: r.name, 
                                            label: r.name,
                                            icon: <Shield size={14} className="text-gray-400" />
                                        }))}
                                        placeholder="בחר תפקיד"
                                        className="w-full"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">קיבולת משימות</label>
                                        <input type="number" value={memberForm.capacity} onChange={e => setMemberForm({...memberForm, capacity: Number(e.target.value)})} placeholder="5" className="w-full p-3 border border-gray-200 rounded-xl" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">מודל שכר</label>
                                        <select 
                                            value={memberForm.paymentType}
                                            onChange={e => setMemberForm({...memberForm, paymentType: e.target.value as any})}
                                            className="w-full p-3 border border-emerald-200 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-800 outline-none"
                                        >
                                            <option value="hourly">שעתי</option>
                                            <option value="monthly">חודשי</option>
                                        </select>
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
                                        className="w-full p-3 border border-emerald-200 rounded-xl font-bold bg-white text-emerald-900 outline-none focus:border-emerald-500" 
                                    />
                                </div>

                                <div className="border-t border-emerald-100 pt-2 mt-2">
                                    <label className="block text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-1">
                                        <TrendingUp size={14} /> בונוסים ותמריצים
                                    </label>
                                    
                                    <div className="grid grid-cols-2 gap-3">
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
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsTeamModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
                                <button onClick={handleSaveMember} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">שמור</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
