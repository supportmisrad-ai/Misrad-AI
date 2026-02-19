'use client';

/**
 * MISRAD AI — Notification Preferences
 * Allows users to control which email categories they receive.
 * Reads/writes Profile.notificationPreferences JSON field.
 */

import React, { useState, useCallback } from 'react';

// ─── Preference Groups (mirroring email-registry.ts) ────────────────
const PREFERENCE_GROUPS = [
    {
        id: 'marketing',
        title: 'שיווק ותוכן',
        icon: '📣',
        description: 'ניוזלטרים, עדכוני מוצר, מבצעים',
        items: [
            { key: 'marketing_newsletter', label: 'ניוזלטר חודשי', desc: 'עדכוני מוצר, טיפים, חדשות' },
            { key: 'marketing_events', label: 'אירועים ווובינרים', desc: 'הזמנות לאירועים מקצועיים' },
            { key: 'marketing_product_updates', label: 'עדכוני מוצר', desc: 'פיצ\'רים חדשים ושיפורים' },
            { key: 'marketing_promotions', label: 'מבצעים והצעות', desc: 'הנחות והצעות מיוחדות' },
            { key: 'marketing_reengagement', label: 'תזכורות חזרה', desc: 'תזכורת אם לא התחברת זמן רב' },
        ],
    },
    {
        id: 'system',
        title: 'מערכת והתראות',
        icon: '🔔',
        description: 'דוחות, התראות, תחזוקה',
        items: [
            { key: 'system_reports', label: 'דוחות תקופתיים', desc: 'דוחות שבועיים וחודשיים' },
            { key: 'system_alerts', label: 'התראות מערכת', desc: 'קרדיטי AI נמוכים, חריגות' },
            { key: 'system_maintenance', label: 'תחזוקה מתוכננת', desc: 'הודעות על חלונות תחזוקה' },
            { key: 'system_updates', label: 'עדכוני גרסה', desc: 'גרסאות חדשות ושינויים קריטיים' },
        ],
    },
    {
        id: 'team',
        title: 'צוות',
        icon: '👥',
        description: 'עדכונים על חברי צוות',
        items: [
            { key: 'team_updates', label: 'עדכוני צוות', desc: 'הצטרפות/עזיבת חברי צוות' },
        ],
    },
    {
        id: 'organization',
        title: 'ארגון',
        icon: '🏢',
        description: 'שינויים ארגוניים',
        items: [
            { key: 'org_lifecycle', label: 'עדכוני ארגון', desc: 'שינויי הגדרות, מודולים, מושבים' },
        ],
    },
    {
        id: 'support',
        title: 'תמיכה',
        icon: '🛟',
        description: 'סקרים ומשוב',
        items: [
            { key: 'support_surveys', label: 'סקרי שביעות רצון', desc: 'סקר קצר אחרי סגירת קריאה' },
            { key: 'support_admin_notifications', label: 'התראות אדמין', desc: 'התראות על קריאות חדשות (לאדמינים)' },
        ],
    },
    {
        id: 'onboarding',
        title: 'הדרכה',
        icon: '🎓',
        description: 'טיפים והדרכות',
        items: [
            { key: 'onboarding_tips', label: 'טיפים והדרכות', desc: 'טיפים לשימוש מיטבי במערכת' },
        ],
    },
] as const;

// Cannot-unsubscribe categories (shown as info)
const MANDATORY_INFO = [
    { label: 'אימות וכניסה', desc: 'OTP, סיסמאות, קישורי כניסה' },
    { label: 'אבטחה', desc: 'התקן חדש, שינוי סיסמה' },
    { label: 'חיוב ותשלומים', desc: 'חשבוניות, קבלות, כשלונות תשלום' },
    { label: 'קריאות שירות', desc: 'עדכונים על קריאות שפתחת' },
    { label: 'הזמנות צוות', desc: 'הזמנות להצטרף לארגון' },
];

interface NotificationPreferencesProps {
    preferences: Record<string, unknown>;
    onSave: (updated: Record<string, boolean>) => Promise<void>;
    isAdmin?: boolean;
}

export default function NotificationPreferences({ preferences, onSave, isAdmin }: NotificationPreferencesProps) {
    const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const group of PREFERENCE_GROUPS) {
            for (const item of group.items) {
                // Default: opted in (true) unless explicitly false
                initial[item.key] = preferences[item.key] !== false;
            }
        }
        return initial;
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const toggle = useCallback((key: string) => {
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    }, []);

    const toggleGroup = useCallback((groupId: string, value: boolean) => {
        const group = PREFERENCE_GROUPS.find((g) => g.id === groupId);
        if (!group) return;
        setPrefs((prev) => {
            const next = { ...prev };
            for (const item of group.items) {
                next[item.key] = value;
            }
            return next;
        });
        setSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await onSave(prefs);
            setSaved(true);
        } finally {
            setSaving(false);
        }
    }, [prefs, onSave]);

    // Filter groups based on admin status
    const visibleGroups = PREFERENCE_GROUPS.filter((g) => {
        if (g.id === 'support' && !isAdmin) {
            // Filter out admin-only items
            return g.items.some((item) => item.key !== 'support_admin_notifications');
        }
        return true;
    });

    return (
        <div className="space-y-6" dir="rtl">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">העדפות התראות</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">בחר אילו מיילים לקבל. אימות, אבטחה וחיוב נשלחים תמיד.</p>
            </div>

            {/* Mandatory (cannot unsubscribe) */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                    🔒 מיילים שלא ניתן לבטל
                </div>
                <div className="flex flex-wrap gap-2">
                    {MANDATORY_INFO.map((item) => (
                        <span
                            key={item.label}
                            className="inline-flex items-center gap-1 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                            title={item.desc}
                        >
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Preference Groups */}
            {visibleGroups.map((group) => {
                const allOn = group.items.every((item) => prefs[item.key]);
                const someOn = group.items.some((item) => prefs[item.key]);

                return (
                    <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* Group Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{group.icon}</span>
                                <div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{group.title}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{group.description}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleGroup(group.id, !allOn)}
                                className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                                    allOn
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                        : someOn
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                }`}
                            >
                                {allOn ? 'הכל פעיל' : someOn ? 'חלקי' : 'מושבת'}
                            </button>
                        </div>

                        {/* Items */}
                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {group.items.map((item) => {
                                // Hide admin-only items for non-admins
                                if (item.key === 'support_admin_notifications' && !isAdmin) return null;

                                return (
                                    <label
                                        key={item.key}
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <div>
                                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={prefs[item.key]}
                                                onChange={() => toggle(item.key)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-500 transition-colors"></div>
                                            <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:-translate-x-4 transition-transform"></div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                >
                    {saving ? 'שומר...' : 'שמירת העדפות'}
                </button>
                {saved && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ נשמר</span>
                )}
            </div>
        </div>
    );
}
