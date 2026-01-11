'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, Upload, Trash2, Eye, Plus, X, 
    AlertCircle, CheckCircle2, ArrowUp, ArrowDown, Image as ImageIcon
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface PartnerLogo {
    id: string;
    name: string;
    logo: string;
    website?: string;
    order: number;
    isActive: boolean;
}

export const PartnersLogosPanel: React.FC = () => {
    const { addToast, updateSettings } = useData();
    
    // Load logos from localStorage
    const [logos, setLogos] = useState<PartnerLogo[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('partners_logos');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Error loading partner logos:', e);
                }
            }
        }
        // Default empty
        return [];
    });

    const [editingLogo, setEditingLogo] = useState<string | null>(null);
    const [editedLogo, setEditedLogo] = useState<PartnerLogo | null>(null);
    const [isAddingLogo, setIsAddingLogo] = useState(false);
    const [newLogo, setNewLogo] = useState<Partial<PartnerLogo>>({
        name: '',
        logo: '',
        website: '',
        order: logos.length,
        isActive: true
    });
    const [logoToDelete, setLogoToDelete] = useState<string | null>(null);
    const [previewLogo, setPreviewLogo] = useState<PartnerLogo | null>(null);

    const saveLogos = (updatedLogos: PartnerLogo[]) => {
        setLogos(updatedLogos);
        if (typeof window !== 'undefined') {
            localStorage.setItem('partners_logos', JSON.stringify(updatedLogos));
        }
        updateSettings('partnersLogos', updatedLogos);
        addToast('לוגואים עודכנו בהצלחה!', 'success');
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, logoId?: string) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                addToast('הקובץ גדול מדי (מקסימום 2MB)', 'error');
                return;
            }
            
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                addToast('סוג קובץ לא נתמך. אנא בחר תמונה (PNG, JPG, SVG או WebP)', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const logoData = reader.result as string;
                if (logoId) {
                    // Update existing
                    const updated = logos.map(l => 
                        l.id === logoId ? { ...l, logo: logoData } : l
                    );
                    saveLogos(updated);
                    if (editedLogo) {
                        setEditedLogo({ ...editedLogo, logo: logoData });
                    }
                } else {
                    // New logo
                    setNewLogo({ ...newLogo, logo: logoData });
                }
                addToast('לוגו הועלה בהצלחה!', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveLogo = () => {
        if (!editedLogo || !editedLogo.name || !editedLogo.logo) {
            addToast('נא למלא שם ולוגו', 'error');
            return;
        }
        
        const updated = logos.map(l => 
            l.id === editedLogo.id ? editedLogo : l
        );
        saveLogos(updated);
        setEditingLogo(null);
        setEditedLogo(null);
    };

    const handleAddLogo = () => {
        if (!newLogo.name || !newLogo.logo) {
            addToast('נא למלא שם ולוגו', 'error');
            return;
        }

        const logoToAdd: PartnerLogo = {
            id: `logo_${Date.now()}`,
            name: newLogo.name || '',
            logo: newLogo.logo || '',
            website: newLogo.website || '',
            order: newLogo.order || logos.length,
            isActive: newLogo.isActive !== false
        };

        const updated = [...logos, logoToAdd].sort((a, b) => a.order - b.order);
        saveLogos(updated);
        setIsAddingLogo(false);
        setNewLogo({
            name: '',
            logo: '',
            website: '',
            order: logos.length + 1,
            isActive: true
        });
    };

    const handleDeleteLogo = () => {
        if (!logoToDelete) return;
        const updated = logos.filter(l => l.id !== logoToDelete);
        saveLogos(updated);
        setLogoToDelete(null);
    };

    const moveLogo = (id: string, direction: 'up' | 'down') => {
        const index = logos.findIndex(l => l.id === id);
        if (index === -1) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= logos.length) return;

        const updated = [...logos];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        updated[index].order = index;
        updated[newIndex].order = newIndex;
        
        saveLogos(updated);
    };

    const toggleActive = (id: string) => {
        const updated = logos.map(l => 
            l.id === id ? { ...l, isActive: !l.isActive } : l
        );
        saveLogos(updated);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">ניהול לוגואים של חברות שותפות</h1>
                    <p className="text-slate-400">נהל את הלוגואים של החברות שמוצגים בדף הנחיתה תחת "מי עובד איתנו".</p>
                </div>
                <button
                    onClick={() => setIsAddingLogo(true)}
                    className="bg-indigo-600 text-white hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                >
                    <Plus size={18} /> הוסף לוגו
                </button>
            </div>

            {/* Logos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {logos.map((logo, index) => {
                    const isEditing = editingLogo === logo.id;
                    const displayLogo = isEditing && editedLogo ? editedLogo : logo;

                    return (
                        <motion.div
                            key={logo.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-2xl overflow-hidden border transition-all ${
                                isEditing 
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-purple-900/20' 
                                    : logo.isActive 
                                        ? 'border-slate-700 hover:border-slate-600' 
                                        : 'border-slate-800 opacity-50'
                            } ${!logo.isActive ? 'bg-slate-900/50' : 'bg-slate-900/30'}`}
                        >
                            {/* Logo Preview */}
                            <div className="relative h-[200px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-b border-slate-800 flex items-center justify-center p-6">
                                {displayLogo.logo ? (
                                    <img 
                                        src={displayLogo.logo} 
                                        alt={displayLogo.name}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-slate-500 flex flex-col items-center gap-2">
                                        <ImageIcon size={32} />
                                        <span className="text-xs font-bold">אין לוגו</span>
                                    </div>
                                )}
                                {!logo.isActive && (
                                    <div className="absolute top-2 right-2 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded">
                                        מוסתר
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded">
                                    #{index + 1}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={displayLogo.name}
                                            onChange={(e) => setEditedLogo({ ...displayLogo, name: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-indigo-500 outline-none"
                                            placeholder="שם החברה"
                                        />
                                        <input
                                            type="text"
                                            value={displayLogo.website || ''}
                                            onChange={(e) => setEditedLogo({ ...displayLogo, website: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-xs focus:border-indigo-500 outline-none"
                                            placeholder="אתר אינטרנט (אופציונלי)"
                                        />
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleLogoUpload(e, logo.id)}
                                                className="hidden"
                                            />
                                            <div className="w-full px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-bold text-center border border-indigo-500/30 transition-all">
                                                <Upload size={14} className="inline mr-1" />
                                                החלף לוגו
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-white font-bold text-sm mb-1">{displayLogo.name}</div>
                                        {displayLogo.website && (
                                            <div className="text-slate-400 text-xs mb-2">{displayLogo.website}</div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleSaveLogo}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                            >
                                                שמור
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingLogo(null);
                                                    setEditedLogo(null);
                                                }}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                            >
                                                בטל
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingLogo(logo.id);
                                                    setEditedLogo({ ...logo });
                                                }}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                                                title="ערוך"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                onClick={() => toggleActive(logo.id)}
                                                className={`p-2 rounded-lg transition-all ${
                                                    logo.isActive 
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                                                }`}
                                                title={logo.isActive ? 'הסתר' : 'הצג'}
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => moveLogo(logo.id, 'up')}
                                                disabled={index === 0}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50"
                                                title="הזז למעלה"
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => moveLogo(logo.id, 'down')}
                                                disabled={index === logos.length - 1}
                                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50"
                                                title="הזז למטה"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                            <button
                                                onClick={() => setLogoToDelete(logo.id)}
                                                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all border border-red-500/30"
                                                title="מחק"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {logos.length === 0 && (
                <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
                    <Building2 size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">אין לוגואים עדיין</p>
                    <button
                        onClick={() => setIsAddingLogo(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
                    >
                        הוסף לוגו ראשון
                    </button>
                </div>
            )}

            {/* Add Logo Modal */}
            <AnimatePresence>
                {isAddingLogo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-white">הוסף לוגו חברה</h3>
                                <button onClick={() => setIsAddingLogo(false)} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-white mb-2">שם החברה</label>
                                    <input
                                        type="text"
                                        value={newLogo.name}
                                        onChange={(e) => setNewLogo({ ...newLogo, name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                        placeholder="שם החברה"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-white mb-2">אתר אינטרנט (אופציונלי)</label>
                                    <input
                                        type="text"
                                        value={newLogo.website || ''}
                                        onChange={(e) => setNewLogo({ ...newLogo, website: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-indigo-500 outline-none"
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-white mb-2">לוגו</label>
                                    {newLogo.logo ? (
                                        <div className="mb-3">
                                            <img src={newLogo.logo} alt="Preview" className="max-w-full max-h-32 object-contain bg-slate-900/50 rounded-lg p-4" />
                                        </div>
                                    ) : null}
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleLogoUpload(e)}
                                            className="hidden"
                                        />
                                        <div className="w-full px-4 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-sm font-bold text-center border border-indigo-500/30 transition-all">
                                            <Upload size={18} className="inline mr-2" />
                                            {newLogo.logo ? 'החלף לוגו' : 'העלה לוגו'}
                                        </div>
                                    </label>
                                    <p className="text-xs text-slate-400 mt-2">מומלץ: PNG או SVG עם רקע שקוף (מקסימום 2MB)</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setIsAddingLogo(false)}
                                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={handleAddLogo}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-bold"
                                >
                                    הוסף לוגו
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {logoToDelete && (
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
                                האם אתה בטוח שברצונך למחוק את הלוגו "{logos.find(l => l.id === logoToDelete)?.name}"?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setLogoToDelete(null)}
                                    className="px-4 py-2 text-slate-400 hover:text-white"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={handleDeleteLogo}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
                                >
                                    מחק
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
