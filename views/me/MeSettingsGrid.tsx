'use client';

import React from 'react';
import { User as UserIcon, Bell, Shield, CreditCard } from 'lucide-react';

type SettingModal = 'personal' | 'notifications' | 'security' | 'billing';

interface MeSettingsGridProps {
    isSuperAdmin: boolean;
    onOpenSetting: (modal: SettingModal) => void;
    onOpenProfileEditor: () => void;
    onNavigateAdmin: () => void;
}

export const MeSettingsGrid: React.FC<MeSettingsGridProps> = ({
    isSuperAdmin,
    onOpenSetting,
    onOpenProfileEditor,
    onNavigateAdmin,
}) => {
    const cards: { id: SettingModal; label: string; desc: string; icon: React.ElementType; color: string; action: () => void }[] = [
        { id: 'personal', label: 'פרטים אישיים', desc: 'ערוך את פרטי הפרופיל, תמונה ופרטי קשר.', icon: UserIcon, color: 'blue', action: onOpenProfileEditor },
        { id: 'notifications', label: 'התראות ועדכונים', desc: 'נהל את אופן קבלת ההודעות מהמערכת.', icon: Bell, color: 'purple', action: () => onOpenSetting('notifications') },
        { id: 'security', label: 'אבטחה ופרטיות', desc: 'שינוי סיסמה, אימות דו-שלבי וניהול גישות.', icon: Shield, color: 'orange', action: () => onOpenSetting('security') },
        { id: 'billing', label: 'חיוב ומנויים', desc: 'צפה בחשבוניות, שדרג חבילה ועדכן אמצעי תשלום.', icon: CreditCard, color: 'green', action: () => onOpenSetting('billing') },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
            {cards.map((card) => (
                <button
                    key={card.id}
                    onClick={card.action}
                    className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                    aria-label={`פתח הגדרות ${card.label}`}
                >
                    <div className={`absolute top-0 right-0 w-1 h-full bg-${card.color}-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block`}></div>
                    <div className={`w-10 h-10 md:w-12 md:h-12 bg-${card.color}-50 text-${card.color}-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                        <card.icon size={18} className="md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-[10px] md:text-lg font-bold text-gray-900">{card.label}</h3>
                    <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">{card.desc}</p>
                </button>
            ))}

            {isSuperAdmin && (
                <button
                    onClick={onNavigateAdmin}
                    className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 md:p-6 rounded-xl md:rounded-2xl border-2 border-indigo-200/50 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all text-center md:text-right group relative overflow-hidden flex flex-col items-center md:items-start"
                    title="גישה למנהל-על (נסתר)"
                >
                    <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300 hidden md:block"></div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform shadow-sm">
                        <Shield size={18} className="md:w-6 md:h-6" />
                    </div>
                    <h3 className="text-[10px] md:text-lg font-bold text-gray-900">ניהול-על</h3>
                    <p className="text-[10px] md:text-sm text-gray-500 mt-1 hidden md:block">גישה למסך ניהול המערכת (SaaS Admin)</p>
                </button>
            )}
        </div>
    );
};
