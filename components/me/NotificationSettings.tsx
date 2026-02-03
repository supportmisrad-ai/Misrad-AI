
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Mail, Zap, Sun, Volume2, Megaphone, Bell } from 'lucide-react';
import { NotificationPreferences } from '../../types';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { upsertMyProfile } from '@/app/actions/profiles';
import { syncWebPushSubscription } from '@/lib/web-push-client';

interface NotificationSettingsProps {
    onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
    const { currentUser, updateUser, addToast } = useData();
    const pathname = usePathname();
    const orgSlug = parseWorkspaceRoute(pathname).orgSlug;
    const [prefs, setPrefs] = useState<NotificationPreferences>(currentUser.notificationPreferences || {
        emailNewTask: true,
        browserPush: true,
        morningBrief: true,
        soundEffects: false,
        marketing: false,
        pushBehavior: 'vibrate_sound',
        pushCategories: {
            alerts: true,
            tasks: true,
            events: true,
            system: true,
            marketing: false
        }
    });

    const togglePref = (key: keyof NotificationPreferences) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (orgSlug) {
            const res = await upsertMyProfile({
                orgSlug,
                updates: {
                    notificationPreferences: prefs,
                },
            });
            if (!res.success) {
                addToast(res.error || 'שגיאה בשמירת הגדרות התראות', 'error');
                return;
            }

            try {
                await syncWebPushSubscription({ orgSlug, prefs });
            } catch {
                // best-effort
            }
        }
        updateUser(currentUser.id, { notificationPreferences: prefs });
        addToast('הגדרות ההתראות נשמרו בהצלחה', 'success');
        onClose();
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="bg-white p-2 rounded-full shadow-sm text-blue-600 mt-1">
                    <Bell size={18} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">מרכז ההתראות</h4>
                    <p className="text-xs text-blue-700 leading-relaxed mt-1">
                        כאן תוכל לשלוט על מה שחשוב לך. אנו ממליצים להשאיר את התראות המשימות פעילות כדי לא לפספס עדכונים קריטיים.
                    </p>
                </div>
            </div>

            <div className="space-y-1">
                {[
                    { key: 'emailNewTask', label: 'משימות חדשות במייל', icon: Mail, desc: 'קבל עדכון כשמשייכים אליך משימה' },
                    { key: 'browserPush', label: 'התראות דפדפן (Push)', icon: Zap, desc: 'התראות קופצות בזמן אמת' },
                    { key: 'morningBrief', label: 'סיכום בוקר יומי', icon: Sun, desc: 'תדריך חכם לפתיחת היום' },
                    { key: 'soundEffects', label: 'צלילי מערכת', icon: Volume2, desc: 'השמע צליל בעת קבלת הודעה' },
                    { key: 'marketing', label: 'עדכונים וחדשות', icon: Megaphone, desc: 'פיצ׳רים חדשים וטיפים' },
                ].map((item) => (
                    <button 
                        key={item.key}
                        onClick={() => togglePref(item.key as keyof NotificationPreferences)}
                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all group border border-transparent hover:border-gray-200"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg transition-colors ${prefs[item.key as keyof NotificationPreferences] ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'}`}>
                                <item.icon size={20} />
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">{item.label}</div>
                                <div className="text-xs text-gray-500">{item.desc}</div>
                            </div>
                        </div>
                        
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out relative ${prefs[item.key as keyof NotificationPreferences] ? 'bg-green-500' : 'bg-gray-200'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${prefs[item.key as keyof NotificationPreferences] ? '-translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">התנהגות Push</div>
                <div className="grid grid-cols-2 gap-2">
                    {([
                        { value: 'off', label: 'ללא פוש' },
                        { value: 'vibrate', label: 'רטט בלבד' },
                        { value: 'sound', label: 'צליל בלבד' },
                        { value: 'vibrate_sound', label: 'רטט + צליל' },
                    ] as const).map((opt) => {
                        const active = (prefs.pushBehavior || 'vibrate_sound') === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setPrefs((prev) => ({ ...prev, pushBehavior: opt.value }))}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    active
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
                <div className="text-[11px] text-gray-500 leading-relaxed">
                    שים לב: ב-PWA הצליל נשלט בעיקר ע"י מערכת ההפעלה/דפדפן. "רטט" עובד טוב בעיקר באנדרואיד.
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="text-sm font-bold text-gray-900">סוגי התראות ב-Push</div>
                {([
                    { key: 'alerts', label: 'התראות דחופות' },
                    { key: 'tasks', label: 'משימות' },
                    { key: 'events', label: 'אירועים' },
                    { key: 'system', label: 'מערכת' },
                    { key: 'marketing', label: 'שיווק/חדשות' },
                ] as const).map((item) => {
                    const isOn = Boolean(prefs.pushCategories?.[item.key]);
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                                setPrefs((prev) => ({
                                    ...prev,
                                    pushCategories: {
                                        ...(prev.pushCategories || {}),
                                        [item.key]: !Boolean(prev.pushCategories?.[item.key]),
                                    },
                                }))
                            }
                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
                        >
                            <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">{item.label}</div>
                            </div>

                            <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out relative ${isOn ? 'bg-green-500' : 'bg-gray-200'}`}>
                                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${isOn ? '-translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-gray-800 text-sm transition-colors shadow-lg">
                    שמור שינויים
                </button>
            </div>
        </div>
    );
};
