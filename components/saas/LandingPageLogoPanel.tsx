'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Image, Upload, Trash2, Eye, Save, X, 
    CircleAlert, CircleCheckBig, Globe
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '@/components/ui/button';
import { safeBrowserUrl } from '@/lib/shared/safe-browser-url';

export const LandingPageLogoPanel: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
    const { addToast, updateSettings } = useData();
    const [logo, setLogo] = useState<string>('');
    const [logoText, setLogoText] = useState<string>('MISRAD AI');
    const [previewLogo, setPreviewLogo] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load logo from settings
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/landing/settings', { cache: 'no-store' });
                const data = await res.json().catch(() => null);
                if (cancelled) return;
                const nextLogo = typeof data?.logo === 'string' ? data.logo : '';
                const nextText = typeof data?.logoText === 'string' ? data.logoText : 'MISRAD AI';
                setLogo(nextLogo);
                setLogoText(nextText || 'MISRAD AI');
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                addToast('סוג קובץ לא נתמך. אנא בחר תמונה (PNG, JPG, SVG או WebP)', 'error');
                return;
            }

            const { resizeImageIfNeeded } = await import('@/lib/shared/resize-image');
            const resizedFile = await resizeImageIfNeeded(file, 5 * 1024 * 1024);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const logoData = reader.result as string;
                setLogo(logoData);
                saveLogo(logoData, logoText);
                addToast('לוגו דף הנחיתה עודכן בהצלחה!', 'success');
            };
            reader.readAsDataURL(resizedFile);
        }
    };

    const saveLogo = async (logoData: string, text: string) => {
        const nextText = String(text || '').trim() || 'MISRAD AI';
        const nextLogo = logoData ? String(logoData) : '';

        setLogo(nextLogo);
        setLogoText(nextText);

        try {
            const res = await fetch('/api/landing/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo: nextLogo || null, logoText: nextText }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error || 'שגיאה בשמירה');
            }
            updateSettings('landingPageLogo', nextLogo);
            updateSettings('landingPageLogoText', nextText);
        } catch (e: unknown) {
            addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בשמירה', 'error');
        }
    };

    const handleSaveText = () => {
        void saveLogo(logo, logoText);
        addToast('טקסט הלוגו עודכן בהצלחה!', 'success');
    };

    const handleDeleteLogo = () => {
        setLogo('');
        setLogoText('MISRAD AI');
        void saveLogo('', 'MISRAD AI');
        addToast('לוגו נמחק בהצלחה', 'success');
        setIsDeleting(false);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {!hideHeader ? (
                <div className="mb-10">
                    <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        ניהול לוגו דף הנחיתה
                    </h1>
                    <p className="text-slate-600">נהל את הלוגו והטקסט שמוצגים ב-Navbar של דף הנחיתה.</p>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm border border-indigo-500/30">
                            <Upload size={20} className="text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">העלאת לוגו</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Logo Preview */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shadow-xl">
                                {safeBrowserUrl(logo) ? (
                                    <img src={safeBrowserUrl(logo)!} alt="Landing Page Logo" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <div className="text-slate-500 flex flex-col items-center gap-2">
                                        <Image size={32} />
                                        <span className="text-xs font-bold">אין לוגו</span>
                                    </div>
                                )}
                            </div>

                            {/* Upload Button */}
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <div className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/50 hover:scale-105">
                                    <Upload size={18} />
                                    {logo ? 'החלף לוגו' : 'העלה לוגו'}
                                </div>
                            </label>

                            {logo && (
                                <Button
                                    onClick={() => setIsDeleting(true)}
                                    variant="outline"
                                    className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 font-bold flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    מחק לוגו
                                </Button>
                            )}
                        </div>

                        {/* Logo Text */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Globe size={16} className="text-indigo-400" />
                                טקסט הלוגו
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={logoText}
                                    onChange={(e) => setLogoText(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none transition-all"
                                    placeholder="MISRAD AI"
                                />
                                <Button
                                    onClick={handleSaveText}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/50"
                                >
                                    <Save size={18} />
                                    שמור
                                </Button>
                            </div>
                            <p className="text-xs text-slate-600 mt-2">הטקסט שיוצג לצד הלוגו ב-Navbar</p>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm border border-emerald-500/30">
                            <Eye size={20} className="text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">תצוגה מקדימה</h2>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        {/* Simulated Navbar */}
                        <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/70 rounded-xl overflow-hidden">
                            <div className="px-6 h-20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {logo ? (
                                        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-indigo-600/20 border border-indigo-500/30">
                                            <img src={safeBrowserUrl(logo)!} alt="Logo" className="w-full h-full object-contain p-1.5" />
                                        </div>
                                    ) : (
                                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <div className="w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                    <span className="text-xl font-black text-slate-900 tracking-tight">{logoText}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-8 bg-slate-200 rounded-full"></div>
                                    <div className="w-20 h-8 bg-slate-100 rounded-full"></div>
                                </div>
                            </div>
                        </nav>

                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-xs text-slate-600 text-center">
                                זה איך הלוגו ייראה ב-Navbar של דף הנחיתה
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <CircleAlert size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-slate-900 mb-1">טיפים חשובים</p>
                                <ul className="text-xs text-slate-600 space-y-1">
                                    <li>• מומלץ להשתמש בלוגו עם רקע שקוף (PNG/SVG)</li>
                                    <li>• גודל מומלץ: 36x36px עד 72x72px</li>
                                    <li>• הלוגו יוצג גם במובייל - ודא שהוא קריא</li>
                                    <li>• אם אין לוגו, יוצג הלוגו הדיפולטיבי</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <CircleAlert className="text-red-500" size={24} />
                            <h3 className="text-xl font-bold text-slate-900">מחיקת לוגו</h3>
                        </div>
                        <p className="text-slate-600 mb-6">
                            האם אתה בטוח שברצונך למחוק את הלוגו? הלוגו הדיפולטיבי יוצג במקום.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                onClick={() => setIsDeleting(false)}
                                variant="ghost"
                                className="text-slate-600 hover:text-slate-900"
                            >
                                ביטול
                            </Button>
                            <Button
                                onClick={handleDeleteLogo}
                                className="bg-red-600 text-white hover:bg-red-500"
                            >
                                מחק
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};
