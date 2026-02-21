'use client';

import React, { useState, useEffect } from 'react';
import { X, Youtube, Instagram, Linkedin, Facebook, Send, Calendar, Video, Image, FileText, Upload, Paperclip, BellRing, Share2, Globe, Twitter, Mic, CircleDashed, Users, Megaphone, Mail, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ContentItem, ContentType, Platform, ContentStatus, PlatformDefinition } from '../types';
import { useData } from '../context/DataContext';
import { CustomDatePicker } from './CustomDatePicker';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface ContentModalProps {
    onClose: () => void;
    editItem?: ContentItem | null;
}

export const ContentModal: React.FC<ContentModalProps> = ({ onClose, editItem }) => {
    useBackButtonClose(true, onClose);
    const { addContent, updateContent, currentUser, platforms: availablePlatforms } = useData();
    
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<ContentType>('image');
    const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
    const [status, setStatus] = useState<ContentStatus>('draft');
    const [scheduledAt, setScheduledAt] = useState('');
    const [fileName, setFileName] = useState('');
    
    // Scroll to top on mobile when modal opens
    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        if (isMobile) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    // Initialize if editing
    useEffect(() => {
        if (editItem) {
            setTitle(editItem.title);
            setDescription(editItem.description || '');
            setType(editItem.type);
            setSelectedPlatforms(editItem.platforms);
            setStatus(editItem.status);
            setScheduledAt(editItem.scheduledAt ? new Date(editItem.scheduledAt).toISOString().split('T')[0] : '');
            setFileName(editItem.fileName || '');
        }
    }, [editItem]);

    const togglePlatform = (p: Platform) => {
        setSelectedPlatforms(prev => 
            prev.includes(p) ? prev.filter(plat => plat !== p) : [...prev, p]
        );
    };

    const handleSave = () => {
        if (!title.trim()) return;

        const itemData: ContentItem = {
            id: editItem ? editItem.id : `CNT-${Date.now()}`,
            title,
            description,
            type,
            platforms: selectedPlatforms,
            status: scheduledAt ? 'scheduled' : status,
            scheduledAt: scheduledAt || undefined,
            fileName: fileName || undefined,
            tags: [], // Could add tag input later
            createdAt: editItem ? editItem.createdAt : new Date().toISOString(),
            creatorId: editItem ? editItem.creatorId : currentUser.id
        };

        if (editItem) {
            updateContent(editItem.id, itemData);
        } else {
            addContent(itemData);
        }
        onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            // In a real app, you'd upload this to a server/storage here
        }
    };

    const getIcon = (iconName: string) => {
        switch(iconName) {
            case 'Youtube': return Youtube;
            case 'Instagram': return Instagram;
            case 'Linkedin': return Linkedin;
            case 'Facebook': return Facebook;
            case 'Twitter': return Twitter;
            case 'Send': return Send;
            case 'Video': return Video;
            case 'Globe': return Globe;
            case 'Mic': return Mic;
            case 'CircleDashed': return CircleDashed;
            case 'Users': return Users;
            case 'Megaphone': return Megaphone;
            case 'Mail': return Mail;
            case 'Music2': return Music2;
            default: return Share2;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{editItem ? 'עריכת תוכן' : 'העלאת תוכן חדש'}</h2>
                        <p className="text-xs text-gray-500">הוסף טקסט, תמונות או וידאו לבנק התכנים</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">כותרת (פנימי)</label>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-medium"
                            placeholder="שם הפוסט / סרטון..."
                            autoFocus
                        />
                    </div>

                    {/* Content Type Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">סוג התוכן</label>
                        <div className="flex gap-3">
                            {[
                                { id: 'image', label: 'תמונה', icon: Image },
                                { id: 'video', label: 'וידאו', icon: Video },
                                { id: 'text', label: 'טקסט', icon: FileText },
                                { id: 'document', label: 'קובץ/PDF', icon: Paperclip },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id as ContentType)}
                                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                        type === t.id 
                                        ? 'border-black bg-gray-900 text-white shadow-lg' 
                                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <t.icon size={20} />
                                    <span className="text-xs font-bold">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* File Upload Simulation */}
                    {(type !== 'text') && (
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-2">קובץ מצורף</label>
                             <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={handleFileUpload}
                                />
                                {fileName ? (
                                    <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                                        <Paperclip size={18} /> {fileName}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center gap-2">
                                        <Upload size={24} />
                                        <span className="text-sm">גרור קובץ לכאן או לחץ להעלאה</span>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {/* Text Body */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תוכן הפוסט / תיאור</label>
                        <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black resize-none"
                            placeholder="כתוב כאן את הטקסט שילווה את התוכן..."
                        />
                    </div>

                    {/* Platforms */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3">הפצה לפלטפורמות</label>
                        <div className="flex flex-wrap gap-2">
                             {availablePlatforms.map((p: PlatformDefinition) => {
                                const Icon = getIcon(p.icon);
                                const platformId = p.id as Platform;
                                const isSelected = selectedPlatforms.includes(platformId);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePlatform(platformId)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                                            isSelected
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icon size={16} className={isSelected ? 'text-white' : p.color} />
                                        {p.label}
                                    </button>
                                );
                             })}
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-500">
                            <Calendar size={20} />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">תזמון פרסום (אופציונלי)</label>
                            <div className="w-full">
                                <CustomDatePicker 
                                    value={scheduledAt}
                                    onChange={setScheduledAt}
                                    placeholder="בחר תאריך פרסום..."
                                    showHebrewDate={true}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {scheduledAt && (
                        <div className="flex items-start gap-2 text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
                            <BellRing size={16} className="shrink-0" />
                            <span>שים לב: תזמון יפעיל התראה אוטומטית למנהל הקהילה לביצוע הפרסום בזמן שנבחר.</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                        ביטול
                    </button>
                    <button onClick={handleSave} className="px-8 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl shadow-lg transition-transform active:scale-95">
                        {editItem ? 'שמור שינויים' : 'הוסף לבנק'}
                    </button>
                </div>

            </motion.div>
        </div>
    );
};
