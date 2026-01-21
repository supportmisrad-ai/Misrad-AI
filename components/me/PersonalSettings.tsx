import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Camera } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { getMyProfile, upsertMyProfile } from '@/app/actions/profiles';

interface PersonalSettingsProps {
    onClose: () => void;
}

export const PersonalSettings: React.FC<PersonalSettingsProps> = ({ onClose }) => {
    const { currentUser, updateUser, addToast } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();
    const orgSlug = parseWorkspaceRoute(pathname).orgSlug;

    const [form, setForm] = useState({
        name: currentUser.name,
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        location: currentUser.location || '',
        bio: currentUser.bio || ''
    });

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        (async () => {
            try {
                if (file.size > 5 * 1024 * 1024) {
                    addToast('הקובץ גדול מדי. מקסימום מותר: 5MB.', 'error');
                    return;
                }

                const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    addToast('סוג קובץ לא נתמך. אנא בחר תמונה (PNG, JPG או WebP)', 'error');
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('bucket', 'attachments');
                formData.append('folder', 'avatars');

                const response = await fetch('/api/storage/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errText = await response.text().catch(() => '');
                    throw new Error(errText || 'שגיאה בהעלאת תמונה');
                }

                const data = await response.json().catch(() => null);
                const avatarUrl = String(data?.url || '').trim();
                if (!avatarUrl) {
                    throw new Error('שגיאה בהעלאת תמונה (חסר URL).');
                }

                if (orgSlug) {
                    let uiPreferences: any = { profileCompleted: true };
                    try {
                        const current = await getMyProfile({ orgSlug });
                        const p: any = current.success ? (current as any).data?.profile : null;
                        const existing = p?.ui_preferences;
                        if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
                            uiPreferences = { ...existing, profileCompleted: true };
                        }
                    } catch {
                        // best-effort
                    }

                    const res = await upsertMyProfile({
                        orgSlug,
                        updates: {
                            avatarUrl,
                            uiPreferences,
                        },
                    });
                    if (!res.success) {
                        addToast(res.error || 'שגיאה בעדכון תמונת פרופיל', 'error');
                        return;
                    }
                }

                updateUser(currentUser.id, { avatar: avatarUrl });
                addToast('תמונת הפרופיל עודכנה בהצלחה', 'success');
            } catch (err: any) {
                addToast(err?.message || 'שגיאה בעדכון תמונת פרופיל', 'error');
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        })();
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
        if (!String(form.name || '').trim()) {
            addToast('נא להזין שם מלא', 'error');
            return;
        }

        // Validate phone if provided
        if (form.phone && form.phone.trim() !== '' && !validatePhone(form.phone)) {
            addToast('נא להזין מספר טלפון תקין (לדוגמה: 050-1234567)', 'error');
            return;
        }

        // Clean phone number (remove spaces, dashes, parentheses)
        const cleanedPhone = form.phone ? form.phone.replace(/[\s\-\(\)]/g, '') : '';

        if (orgSlug) {
            let uiPreferences: any = { profileCompleted: true };
            try {
                const current = await getMyProfile({ orgSlug });
                const p: any = current.success ? (current as any).data?.profile : null;
                const existing = p?.ui_preferences;
                if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
                    uiPreferences = { ...existing, profileCompleted: true };
                }
            } catch {
                // best-effort
            }

            const res = await upsertMyProfile({
                orgSlug,
                updates: {
                    fullName: String(form.name || '').trim() || null,
                    phone: cleanedPhone || null,
                    location: form.location || null,
                    bio: form.bio || null,
                    uiPreferences,
                },
            });

            if (!res.success) {
                addToast(res.error || 'שגיאה בשמירת פרטים', 'error');
                return;
            }
        }

        updateUser(currentUser.id, {
            name: String(form.name || '').trim(),
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
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            aria-label="שם משתמש"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none text-gray-900 focus:border-black transition-all" 
                        />
                    </div>
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