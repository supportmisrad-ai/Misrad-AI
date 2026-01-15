import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Camera, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { upsertMyProfile } from '@/app/actions/profiles';

interface PersonalSettingsProps {
    onClose: () => void;
}

export const PersonalSettings: React.FC<PersonalSettingsProps> = ({ onClose }) => {
    const { currentUser, updateUser, addToast, requestNameChange, openSupport } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();
    const orgSlug = parseWorkspaceRoute(pathname).orgSlug;
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
                const nextAvatar = String(reader.result || '');
                if (!orgSlug) {
                    updateUser(currentUser.id, { avatar: nextAvatar });
                    addToast('תמונת הפרופיל עודכנה בהצלחה', 'success');
                    return;
                }

                (async () => {
                    const res = await upsertMyProfile({
                        orgSlug,
                        updates: {
                            avatarUrl: nextAvatar || null,
                        },
                    });
                    if (!res.success) {
                        addToast(res.error || 'שגיאה בעדכון תמונת פרופיל', 'error');
                        return;
                    }
                    updateUser(currentUser.id, { avatar: nextAvatar });
                    addToast('תמונת הפרופיל עודכנה בהצלחה', 'success');
                })();
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

    const validatePhone = (phone: string): boolean => {
        if (!phone || phone.trim() === '') return true; // Phone is optional
        
        // Remove spaces, dashes, and parentheses
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        
        // Check if it's all digits
        if (!/^\d+$/.test(cleaned)) return false;
        
        // Israeli phone number formats:
        // 05X-XXXXXXX (10 digits starting with 05)
        // 0X-XXXXXXX (9 digits starting with 0)
        // +972-5X-XXXXXXX (international format)
        // 972-5X-XXXXXXX (without +)
        const isIsraeliMobile = /^0?5\d{8}$/.test(cleaned) || /^\+?9725\d{8}$/.test(cleaned);
        const isIsraeliLandline = /^0[2-9]\d{7,8}$/.test(cleaned) || /^\+?972[2-9]\d{7,8}$/.test(cleaned);
        
        // Must be between 9-13 digits (allowing for country code)
        const length = cleaned.length;
        return (isIsraeliMobile || isIsraeliLandline) && length >= 9 && length <= 13;
    };

    const handleSave = async () => {
        // Validate phone if provided
        if (form.phone && form.phone.trim() !== '' && !validatePhone(form.phone)) {
            addToast('נא להזין מספר טלפון תקין (לדוגמה: 050-1234567)', 'error');
            return;
        }

        // Clean phone number (remove spaces, dashes, parentheses)
        const cleanedPhone = form.phone ? form.phone.replace(/[\s\-\(\)]/g, '') : '';

        if (orgSlug) {
            const res = await upsertMyProfile({
                orgSlug,
                updates: {
                    phone: cleanedPhone || null,
                    location: form.location || null,
                    bio: form.bio || null,
                },
            });

            if (!res.success) {
                addToast(res.error || 'שגיאה בשמירת פרטים', 'error');
                return;
            }
        }

        updateUser(currentUser.id, {
            phone: cleanedPhone,
            location: form.location,
            bio: form.bio
        });
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
                <button
                    type="button"
                    className="relative cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="עדכן תמונת פרופיל"
                >
                    <div className="w-28 h-28 rounded-full p-1 bg-white shadow-lg border border-gray-100">
                        {String(currentUser.avatar || '').trim() ? (
                            <img src={currentUser.avatar} alt={`תמונת פרופיל של ${currentUser.name}`} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-black text-3xl">
                                {String(currentUser.name || 'U').charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors">
                        <Camera size={18} />
                    </div>
                </button>
            </div>
            <div className="grid grid-cols-1 gap-5">
                <div>
                    <label htmlFor="personal-name-input" className="block text-xs font-bold text-gray-500 uppercase mb-2">שם מלא</label>
                    <div className="relative">
                        <input 
                            id="personal-name-input"
                            type="text" 
                            value={form.name}
                            readOnly
                            aria-label="שם משתמש"
                            className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm outline-none text-gray-500 cursor-not-allowed" 
                        />
                        <div className="absolute top-1/2 left-3 -translate-y-1/2 flex items-center gap-2">
                            <Lock size={14} className="text-gray-400" />
                            {isCEO ? (
                                <button 
                                    onClick={() => handleNameChangeRequest()}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                    aria-label="פנה לתמיכה לשינוי שם"
                                >
                                    פנה לתמיכה לשינוי
                                </button>
                            ) : (
                                <button 
                                    onClick={() => { setShowNameRequestInput(!showNameRequestInput); setRequestedName(form.name); }}
                                    className="text-xs text-blue-600 font-bold hover:underline"
                                    aria-label="בקש שינוי שם"
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
                    <label htmlFor="personal-role-input" className="block text-xs font-bold text-gray-500 uppercase mb-2">תפקיד (מוגדר ע״י מערכת)</label>
                    <input id="personal-role-input" type="text" defaultValue={currentUser.role} disabled aria-label="תפקיד משתמש" className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="personal-email-input" className="block text-xs font-bold text-gray-500 uppercase mb-2">אימייל</label>
                        <input 
                            id="personal-email-input"
                            type="email" 
                            value={form.email}
                            readOnly
                            className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm outline-none text-gray-500 cursor-not-allowed dir-ltr text-right" 
                        />
                    </div>
                    <div>
                        <label htmlFor="personal-phone-input" className="block text-xs font-bold text-gray-500 uppercase mb-2">טלפון</label>
                        <input 
                            id="personal-phone-input"
                            type="tel" 
                            value={form.phone}
                            onChange={(e) => setForm({...form, phone: e.target.value})}
                            placeholder="050-1234567"
                            className={`w-full p-3 bg-gray-50 border rounded-xl text-sm outline-none focus:border-black transition-all dir-ltr text-right ${
                                form.phone && form.phone.trim() !== '' && !validatePhone(form.phone)
                                    ? 'border-red-300 focus:border-red-500'
                                    : 'border-gray-200'
                            }`}
                        />
                        {form.phone && form.phone.trim() !== '' && !validatePhone(form.phone) && (
                            <p className="text-xs text-red-500 mt-1">מספר טלפון לא תקין. נא להזין מספר ישראלי (לדוגמה: 050-1234567)</p>
                        )}
                    </div>
                </div>
                <div>
                    <label htmlFor="personal-location-input" className="block text-xs font-bold text-gray-500 uppercase mb-2">מיקום / משרד</label>
                    <input 
                        id="personal-location-input"
                        type="text" 
                        value={form.location}
                        onChange={(e) => setForm({...form, location: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all" 
                        placeholder="לדוגמה: תל אביב"
                    />
                </div>
                <div>
                    <label htmlFor="personal-bio-textarea" className="block text-xs font-bold text-gray-500 uppercase mb-2">אודות (Bio)</label>
                    <textarea 
                        id="personal-bio-textarea"
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