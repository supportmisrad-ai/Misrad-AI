'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Image as ImageIcon, Upload, Trash2, Eye, Save, X, 
    AlertCircle, CheckCircle2, User, Heart
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export const FounderImagePanel: React.FC = () => {
    const { addToast, updateSettings } = useData();
    const [founderImage, setFounderImage] = useState<string>('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load image from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedImage = localStorage.getItem('founder_image');
            if (savedImage) {
                setFounderImage(savedImage);
                setPreviewImage(savedImage);
            }
        }
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                const imageData = reader.result as string;
                setFounderImage(imageData);
                setPreviewImage(imageData);
                saveImage(imageData);
                addToast('תמונת המייסד עודכנה בהצלחה!', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    const saveImage = (imageData: string) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('founder_image', imageData);
        }
        updateSettings('founderImage', imageData);
    };

    const handleDeleteImage = () => {
        setFounderImage('');
        setPreviewImage(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('founder_image');
        }
        updateSettings('founderImage', '');
        addToast('תמונת המייסד נמחקה בהצלחה', 'success');
        setIsDeleting(false);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-10">
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">ניהול תמונת המייסד</h1>
                <p className="text-slate-400">נהל את התמונה שמוצגת בבלוק "למה יצרנו את Nexus" בדף הנחיתה.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm border border-indigo-500/30">
                            <Upload size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">העלאת תמונה</h2>
                            <p className="text-sm text-slate-400">PNG, JPG, SVG או WebP (מקסימום 5MB)</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Image Preview */}
                        <div className="relative">
                            <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center bg-slate-900/50 overflow-hidden relative group">
                                {previewImage ? (
                                    <>
                                        <img 
                                            src={previewImage} 
                                            alt="תמונת מייסד" 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setPreviewImage(null)}
                                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm border border-white/30 font-bold text-sm transition-all"
                                            >
                                                <Eye size={16} className="inline mr-2" />
                                                הסתר תצוגה מקדימה
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-8">
                                        <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/30 flex items-center justify-center">
                                            <User size={48} className="text-indigo-400" />
                                        </div>
                                        <p className="text-slate-400 text-sm mb-2">אין תמונה</p>
                                        <p className="text-slate-500 text-xs">העלה תמונה כדי להציג אותה בבלוק</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload Button */}
                        <div className="flex gap-3">
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                <Upload size={18} />
                                {founderImage ? 'החלף תמונה' : 'העלה תמונה'}
                            </button>
                            
                            {founderImage && (
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold transition-all border border-red-500/30 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    מחק
                                </button>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-slate-300">
                                    <p className="font-bold text-white mb-1">טיפים לעיצוב:</p>
                                    <ul className="space-y-1 text-slate-400 list-disc list-inside">
                                        <li>מומלץ תמונה מרובעת (1:1) או קרובה לזה</li>
                                        <li>רזולוציה מומלצת: 400x400px לפחות</li>
                                        <li>תמונה מקצועית ונעימה תוסיף אמון</li>
                                        <li>אם אין תמונה, יוצג אייקון לב</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm border border-purple-500/30">
                            <Eye size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">תצוגה מקדימה</h2>
                            <p className="text-sm text-slate-400">איך זה ייראה בדף הנחיתה</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
                        <div className="flex items-start gap-4">
                            {/* Profile Image Preview */}
                            <div className="relative shrink-0">
                                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden">
                                    {previewImage ? (
                                        <>
                                            <motion.div
                                                animate={{
                                                    boxShadow: [
                                                        '0 0 20px rgba(99, 102, 241, 0.3)',
                                                        '0 0 40px rgba(139, 92, 246, 0.4)',
                                                        '0 0 20px rgba(99, 102, 241, 0.3)'
                                                    ]
                                                }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                                className="absolute -inset-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-50"
                                            />
                                            <img 
                                                src={previewImage} 
                                                alt="תמונת מייסד" 
                                                className="relative w-full h-full object-cover border-2 border-indigo-500/50 rounded-3xl"
                                            />
                                        </>
                                    ) : (
                                        <div className="relative w-full h-full bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 border-2 border-indigo-500/50 flex items-center justify-center backdrop-blur-sm">
                                            <Heart size={48} className="text-indigo-400 fill-indigo-400/30" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Content Preview */}
                            <div className="flex-1">
                                <h3 className="text-2xl font-black text-white mb-2">
                                    אני לא מתכנת.
                                </h3>
                                <p className="text-base text-slate-300 leading-relaxed">
                                    <span className="text-slate-400">עצמאי 7 שנים.</span> בשנה וחצי האחרונות ליוויתי עסקים...
                                </p>
                            </div>
                        </div>
                    </div>

                    {founderImage && (
                        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-400" />
                                <span className="text-sm text-emerald-400 font-bold">תמונה מוגדרת - תוצג בדף הנחיתה</span>
                            </div>
                        </div>
                    )}
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
                            <h3 className="text-xl font-bold text-white">מחיקת תמונה</h3>
                        </div>
                        <p className="text-slate-300 mb-6">
                            האם אתה בטוח שברצונך למחוק את תמונת המייסד? התמונה תוסר מהבלוק בדף הנחיתה.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsDeleting(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleDeleteImage}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 font-bold"
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
