'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Image as ImageIcon, Upload, Trash2, Eye, Save, X, 
    AlertCircle, CheckCircle2, Globe
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const LandingPageLogoPanel: React.FC = () => {
    const { addToast, updateSettings } = useData();
    const [logo, setLogo] = useState<string>('');
    const [logoText, setLogoText] = useState<string>('Misrad');
    const [previewLogo, setPreviewLogo] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load logo from settings
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedLogo = localStorage.getItem('landing_page_logo');
            const savedText = localStorage.getItem('landing_page_logo_text');
            if (savedLogo) {
                setLogo(savedLogo);
            }
            if (savedText) {
                setLogoText(savedText);
            }
        }
    }, []);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Basic validation
            if (file.size > 5 * 1024 * 1024) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                addToast(`הקובץ גדול מדי (${fileSizeMB}MB). מקסימום מותר: 5MB. אנא בחר קובץ קטן יותר.`, 'error');
                return;
            }
            
            // Check file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                addToast('סוג קובץ לא נתמך. אנא בחר תמונה (PNG, JPG, SVG או WebP)', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const logoData = reader.result as string;
                setLogo(logoData);
                saveLogo(logoData, logoText);
                addToast('לוגו דף הנחיתה עודכן בהצלחה!', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    const saveLogo = (logoData: string, text: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('landing_page_logo', logoData);
            localStorage.setItem('landing_page_logo_text', text);
        }
        updateSettings('landingPageLogo', logoData);
        updateSettings('landingPageLogoText', text);
    };

    const handleSaveText = () => {
        saveLogo(logo, logoText);
        addToast('טקסט הלוגו עודכן בהצלחה!', 'success');
    };

    const handleDeleteLogo = () => {
        setLogo('');
        setLogoText('Misrad');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('landing_page_logo');
            localStorage.removeItem('landing_page_logo_text');
        }
        updateSettings('landingPageLogo', '');
        updateSettings('landingPageLogoText', 'Misrad');
        addToast('לוגו נמחק בהצלחה', 'success');
        setIsDeleting(false);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-10">
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">ניהול לוגו דף הנחיתה</h1>
                <p className="text-slate-400">נהל את הלוגו והטקסט שמוצגים ב-Navbar של דף הנחיתה.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm border border-indigo-500/30">
                            <Upload size={20} className="text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-black text-white">העלאת לוגו</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Logo Preview */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-white/20 bg-black/40 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-xl">
                                {logo ? (
                                    <img src={logo} alt="Landing Page Logo" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <div className="text-slate-500 flex flex-col items-center gap-2">
                                        <ImageIcon size={32} />
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
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold flex items-center gap-2 transition-all border border-red-500/30"
                                >
                                    <Trash2 size={16} />
                                    מחק לוגו
                                </button>
                            )}
                        </div>

                        {/* Logo Text */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Globe size={16} className="text-indigo-400" />
                                טקסט הלוגו
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={logoText}
                                    onChange={(e) => setLogoText(e.target.value)}
                                    className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-white text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                                    placeholder="Misrad"
                                />
                                <button
                                    onClick={handleSaveText}
                                    className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/50"
                                >
                                    <Save size={18} />
                                    שמור
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">הטקסט שיוצג לצד הלוגו ב-Navbar</p>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm border border-emerald-500/30">
                            <Eye size={20} className="text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-black text-white">תצוגה מקדימה</h2>
                    </div>

                    <div className="bg-[#020617] rounded-2xl p-6 border border-slate-800">
                        {/* Simulated Navbar */}
                        <nav className="bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50 rounded-xl overflow-hidden">
                            <div className="px-6 h-20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {logo ? (
                                        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-indigo-600/20 border border-indigo-500/30">
                                            <img src={logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
                                        </div>
                                    ) : (
                                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <div className="w-4 h-4 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                    <span className="text-xl font-black text-white tracking-tight">{logoText}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-8 bg-slate-800/50 rounded-full"></div>
                                    <div className="w-20 h-8 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </nav>

                        <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                            <p className="text-xs text-slate-400 text-center">
                                זה איך הלוגו ייראה ב-Navbar של דף הנחיתה
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-white mb-1">טיפים חשובים</p>
                                <ul className="text-xs text-slate-400 space-y-1">
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
                        className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="text-red-400" size={24} />
                            <h3 className="text-xl font-bold text-white">מחיקת לוגו</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            האם אתה בטוח שברצונך למחוק את הלוגו? הלוגו הדיפולטיבי יוצג במקום.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsDeleting(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleDeleteLogo}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                            >
                                מחק
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};
