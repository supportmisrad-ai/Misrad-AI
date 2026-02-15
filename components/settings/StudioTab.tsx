'use client';

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trash2, Plus, Youtube, Instagram, Linkedin, Facebook, Send, Twitter, Video, Globe, Mic, CircleDashed, Users, Megaphone, Mail, Music2, Check, X } from 'lucide-react';
import { PlatformDefinition } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

const COLOR_PRESETS = [
    { label: 'שחור', value: 'text-black', bg: 'bg-black' },
    { label: 'אדום', value: 'text-red-600', bg: 'bg-red-600' },
    { label: 'ורוד', value: 'text-pink-600', bg: 'bg-pink-600' },
    { label: 'סגול', value: 'text-purple-600', bg: 'bg-purple-600' },
    { label: 'כחול', value: 'text-blue-600', bg: 'bg-blue-600' },
    { label: 'תכלת', value: 'text-cyan-600', bg: 'bg-cyan-600' },
    { label: 'ירוק', value: 'text-green-600', bg: 'bg-green-600' },
    { label: 'כתום', value: 'text-orange-600', bg: 'bg-orange-600' },
    { label: 'אפור', value: 'text-slate-600', bg: 'bg-slate-600' },
];

const ICONS = [
    { id: 'Youtube', icon: Youtube, label: 'יוטיוב' },
    { id: 'Instagram', icon: Instagram, label: 'אינסטגרם' },
    { id: 'Facebook', icon: Facebook, label: 'פייסבוק' },
    { id: 'Music2', icon: Music2, label: 'טיקטוק' },
    { id: 'Linkedin', icon: Linkedin, label: 'לינקדאין' },
    { id: 'Twitter', icon: Twitter, label: 'טוויטר' },
    { id: 'CircleDashed', icon: CircleDashed, label: 'וואטסאפ סטטוס' },
    { id: 'Users', icon: Users, label: 'קבוצת וואטסאפ' },
    { id: 'Megaphone', icon: Megaphone, label: 'ערוץ וואטסאפ' },
    { id: 'Send', icon: Send, label: 'טלגרם' },
    { id: 'Mail', icon: Mail, label: 'מייל / ניוזלטר' },
    { id: 'Mic', icon: Mic, label: 'פודקאסט' },
    { id: 'Globe', icon: Globe, label: 'אתר אינטרנט' },
    { id: 'Video', icon: Video, label: 'וידאו כללי' },
    { id: 'Share2', icon: Share2, label: 'אחר / שיתוף' },
];

export const StudioTab: React.FC = () => {
    const { platforms, updateSettings, deletePlatform } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [newPlatform, setNewPlatform] = useState<PlatformDefinition>({ id: '', label: '', icon: 'Share2', color: 'text-black' });
    
    // Delete Modal
    const [platformToDelete, setPlatformToDelete] = useState<{id: string, name: string} | null>(null);

    const handleAddPlatform = () => {
        if (!newPlatform.label.trim()) return;
        
        // Generate ID from label if not manually set (though we don't expose manual ID set here)
        const id = newPlatform.label.toLowerCase().replace(/\s+/g, '-');
        const platformToAdd = { ...newPlatform, id };
        
        updateSettings('platforms', [...platforms, platformToAdd]);
        setIsAdding(false);
        setNewPlatform({ id: '', label: '', icon: 'Share2', color: 'text-black' });
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setPlatformToDelete({ id, name });
    };

    const confirmDelete = () => {
        if (platformToDelete) {
            deletePlatform(platformToDelete.id);
            setPlatformToDelete(null);
        }
    };

    const getIconComponent = (iconName: string) => {
        const icon = ICONS.find(i => i.id === iconName);
        return icon ? icon.icon : Share2;
    };

    return (
        <motion.div key="studio" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!platformToDelete}
                onClose={() => setPlatformToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת פלטפורמה"
                description="הפלטפורמה תוסר מרשימת האפשרויות. תוכן קיים המשויך אליה לא יימחק, אך התגית תוסר."
                itemName={platformToDelete?.name}
                isHardDelete={true}
            />

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">הגדרות סטודיו תוכן</h2>
                    <p className="text-sm text-gray-500">ניהול ערוצי הפצה ופלטפורמות.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors"
                >
                    <Plus size={18} /> הוסף פלטפורמה
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl overflow-hidden mb-6 relative z-10"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-bold text-gray-900 text-lg">הוספת פלטפורמה חדשה</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-black transition-colors"><X size={20} /></button>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Platform Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">שם הפלטפורמה</label>
                                <input 
                                    type="text" 
                                    placeholder="לדוגמה: טיקטוק עסקי, ניוזלטר..." 
                                    value={newPlatform.label}
                                    onChange={(e) => setNewPlatform({...newPlatform, label: e.target.value})}
                                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Icon Picker Grid */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">בחר אייקון</label>
                                <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
                                    {ICONS.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setNewPlatform({...newPlatform, icon: item.id})}
                                            className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl transition-all border ${
                                                newPlatform.icon === item.id 
                                                ? 'bg-black text-white border-black scale-105 shadow-md' 
                                                : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 hover:border-gray-200'
                                            }`}
                                            title={item.label}
                                        >
                                            <item.icon size={20} />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-right">
                                    נבחר: <span className="font-bold text-gray-700">{ICONS.find(i => i.id === newPlatform.icon)?.label}</span>
                                </p>
                            </div>

                            {/* Color Picker Grid */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">בחר צבע מותג</label>
                                <div className="flex flex-wrap gap-3">
                                    {COLOR_PRESETS.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setNewPlatform({...newPlatform, color: color.value})}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${color.bg} ${
                                                newPlatform.color === color.value 
                                                ? 'ring-2 ring-offset-2 ring-black scale-110' 
                                                : 'hover:scale-110 opacity-80 hover:opacity-100'
                                            }`}
                                            title={color.label}
                                        >
                                            {newPlatform.color === color.value && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button 
                                onClick={() => setIsAdding(false)} 
                                className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm"
                            >
                                ביטול
                            </button>
                            <button 
                                onClick={handleAddPlatform}
                                disabled={!newPlatform.label}
                                className="px-8 py-2.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                            >
                                <Plus size={16} /> הוסף פלטפורמה
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map((platform: PlatformDefinition) => {
                    const Icon = getIconComponent(platform.icon);
                    return (
                        <div key={platform.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-gray-300 hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 ${platform.color}`}>
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <span className="font-bold text-gray-900 block">{platform.label}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">ID: {platform.id}</span>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => handleDeleteClick(e, platform.id, platform.label)}
                                className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                title="מחק פלטפורמה"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};
