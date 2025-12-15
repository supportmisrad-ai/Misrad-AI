import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Camera, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface PersonalSettingsProps {
    onClose: () => void;
}

export const PersonalSettings: React.FC<PersonalSettingsProps> = ({ onClose }) => {
    const { currentUser, updateUser, addToast, requestNameChange, openSupport } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showNameRequestInput, setShowNameRequestInput] = useState(false);
    const [requestedName, setRequestedName] = useState('');
    
    const [form, setForm] = useState({
        name: currentUser.name,
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        location: currentUser.location || '',
        bio: currentUser.bio || ''
    });

    const isCEO = currentUser.role.includes('מנכ');

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateUser(currentUser.id, { avatar: reader.result as string });
                addToast('תמונת הפרופיל עודכנה בהצלחה', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNameChangeRequest = () => {
        if (isCEO) {
            // For CEO/Admins, open the dedicated support ticket
            openSupport({
                category: 'Account',
                subject: 'בקשה לשינוי שם (חשבון מנהל)',
                message: `שלום, אבקש לשנות את שם התצוגה שלי במערכת ל: `
            });
            onClose();
        } else {
            // For regular users, use the internal request flow
            if (requestedName && requestedName !== currentUser.name) {
                requestNameChange(requestedName);
                setShowNameRequestInput(false);
            }
        }
    };

    const handleSave = () => {
        updateUser(currentUser.id, {
            email: form.email,
            phone: form.phone,
            location: form.location,
            bio: form.bio
        });
        addToast('פרטים אישיים עודכנו בהצלחה', 'success');
        onClose();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-8">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleAvatarUpload} 
                />
                <div 
                    className="relative cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-28 h-28 rounded-full p-1 bg-white shadow-lg border border-gray-100">
                        <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors">
                        <Camera size={18} />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">שם מלא</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={form.name}
                            readOnly
                            className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm outline-none text-gray-500 cursor-not-allowed" 
                        />
                        <div className="absolute top-1/2 left-3 -translate-y-1/2 flex items-center gap-2">
                            <Lock size={14} className="text-gray-400" />
                            {isCEO ? (
                                <button 
                                    onClick={() => handleNameChangeRequest()}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                    פנה לתמיכה לשינוי
                                </button>
                            ) : (
                                <button 
                                    onClick={() => { setShowNameRequestInput(!showNameRequestInput); setRequestedName(form.name); }}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                    בקש שינוי
                                </button>
                            )}
                        </div>
                    </div>
                    {showNameRequestInput && !isCEO && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-2 flex gap-2">
                            <input 
                                value={requestedName}
                                onChange={(e) => setRequestedName(e.target.value)}
                                placeholder="השם החדש..."
                                className="flex-1 p-2 border border-blue-200 bg-blue-50 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                            <button onClick={handleNameChangeRequest} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold">שלח בקשה</button>
                        </motion.div>
                    )}
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תפקיד (מוגדר ע״י מערכת)</label>
                    <input type="text" defaultValue={currentUser.role} disabled className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">אימייל</label>
                        <input 
                            type="email" 
                            value={form.email}
                            onChange={(e) => setForm({...form, email: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all dir-ltr text-right" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">טלפון</label>
                        <input 
                            type="tel" 
                            value={form.phone}
                            onChange={(e) => setForm({...form, phone: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all dir-ltr text-right" 
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">מיקום / משרד</label>
                    <input 
                        type="text" 
                        value={form.location}
                        onChange={(e) => setForm({...form, location: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all" 
                        placeholder="לדוגמה: תל אביב"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">אודות (Bio)</label>
                    <textarea 
                        value={form.bio}
                        onChange={(e) => setForm({...form, bio: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all resize-none" 
                        placeholder="ספר על עצמך או על התפקיד שלך..."
                        rows={3}
                    />
                </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-gray-800 text-sm transition-colors shadow-lg">
                    שמור שינויים
                </button>
            </div>
        </div>
    );
};