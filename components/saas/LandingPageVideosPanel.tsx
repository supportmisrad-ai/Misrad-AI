'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Video, Plus, Edit2, Save, X, Trash2, Upload, Play, 
    Image, Link2, Eye, Copy, CircleCheckBig, CircleAlert,
    ArrowUp, ArrowDown, ExternalLink
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/CustomSelect';

interface LandingPageVideo {
    id: string;
    name: string;
    role: string;
    company: string;
    videoUrl: string;
    thumbnail: string;
    quote: string;
    accent: 'indigo' | 'emerald' | 'purple' | 'pink' | 'amber' | 'blue';
    order: number;
    isActive: boolean;
}

export const LandingPageVideosPanel: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
    const { addToast, updateSettings } = useData();
    
    // Load videos from settings or use default
    const [videos, setVideos] = useState<LandingPageVideo[]>(() => {
        // Default videos
        return [
            {
                id: '1',
                name: 'רועי כהן',
                role: 'מנכ״ל',
                company: 'TechFlow',
                videoUrl: 'https://example.com/video1.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
                quote: 'Nexus הפכה את הכאוס שלנו לסדר מושלם. חיסכנו 15 שעות שבועיות רק על ניהול משימות.',
                accent: 'indigo',
                order: 0,
                isActive: true
            },
            {
                id: '2',
                name: 'שרה לוי',
                role: 'מנהלת מכירות',
                company: 'GlobalBank',
                videoUrl: 'https://example.com/video2.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop',
                quote: 'הצנרת של System היא פשוט מדהימה. סגרנו 40% יותר עסקאות ברבעון הראשון.',
                accent: 'emerald',
                order: 1,
                isActive: true
            },
            {
                id: '3',
                name: 'דני אברהם',
                role: 'מנהל פרויקטים',
                company: 'StartScale',
                videoUrl: 'https://example.com/video3.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop',
                quote: 'הבינה המלאכותית של Nexus מצאה לי הזדמנויות עסקיות שלא ידעתי שקיימות.',
                accent: 'purple',
                order: 2,
                isActive: true
            },
            {
                id: '4',
                name: 'מיכל דוד',
                role: 'CFO',
                company: 'MediaGroup',
                videoUrl: 'https://example.com/video4.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop',
                quote: 'לראשונה יש לי תמונה פיננסית מדויקת בזמן אמת. זה שינה את כל תהליך קבלת ההחלטות.',
                accent: 'pink',
                order: 3,
                isActive: true
            },
            {
                id: '5',
                name: 'יוסי כהן',
                role: 'מנהל לקוחות',
                company: 'FinanceX',
                videoUrl: 'https://example.com/video5.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop',
                quote: 'Client זיהה לנו לקוח שעמד לעזוב חודש לפני שזה קרה. הצלחנו לשמור אותו.',
                accent: 'amber',
                order: 4,
                isActive: true
            },
            {
                id: '6',
                name: 'נועה רוזן',
                role: 'מנכ״לית',
                company: 'DevOps.io',
                videoUrl: 'https://example.com/video6.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop',
                quote: 'המערכת הזו היא לא רק כלי - היא עובדת בשבילי. Nexus עוזרת לי לנהל את העסק טוב יותר.',
                accent: 'blue',
                order: 5,
                isActive: true
            }
        ];
    });

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/landing/settings', { cache: 'no-store' });
                const data = await res.json().catch(() => null);
                if (cancelled) return;
                const dbVideos = Array.isArray(data?.videos) ? data.videos : null;
                if (dbVideos) {
                    setVideos(dbVideos as LandingPageVideo[]);
                }
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const [editingVideo, setEditingVideo] = useState<string | null>(null);
    const [editedVideo, setEditedVideo] = useState<LandingPageVideo | null>(null);
    const [isAddingVideo, setIsAddingVideo] = useState(false);
    const [newVideo, setNewVideo] = useState<Partial<LandingPageVideo>>({
        name: '',
        role: '',
        company: '',
        videoUrl: '',
        thumbnail: '',
        quote: '',
        accent: 'indigo',
        order: videos.length,
        isActive: true
    });
    const [previewVideo, setPreviewVideo] = useState<LandingPageVideo | null>(null);
    const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

    const saveVideos = (updatedVideos: LandingPageVideo[]) => {
        setVideos(updatedVideos);
        (async () => {
            try {
                const res = await fetch('/api/landing/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videos: updatedVideos }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => null);
                    throw new Error(err?.error || 'שגיאה בשמירה');
                }
                updateSettings('landingPageVideos', updatedVideos);
                addToast('סרטונים עודכנו בהצלחה!', 'success');
            } catch (e: unknown) {
                addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בשמירה', 'error');
            }
        })();
    };

    const handleSaveVideo = () => {
        if (!editedVideo) return;
        
        const updatedVideos = videos.map(v => 
            v.id === editedVideo.id ? editedVideo : v
        );
        saveVideos(updatedVideos);
        setEditingVideo(null);
        setEditedVideo(null);
    };

    const handleAddVideo = () => {
        if (!newVideo.name || !newVideo.quote) {
            addToast('נא למלא שם וציטוט', 'error');
            return;
        }

        const videoToAdd: LandingPageVideo = {
            id: `video_${Date.now()}`,
            name: newVideo.name || '',
            role: newVideo.role || '',
            company: newVideo.company || '',
            videoUrl: newVideo.videoUrl || '',
            thumbnail: newVideo.thumbnail || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
            quote: newVideo.quote || '',
            accent: newVideo.accent || 'indigo',
            order: newVideo.order || videos.length,
            isActive: newVideo.isActive !== false
        };

        const updatedVideos = [...videos, videoToAdd].sort((a, b) => a.order - b.order);
        saveVideos(updatedVideos);
        setIsAddingVideo(false);
        setNewVideo({
            name: '',
            role: '',
            company: '',
            videoUrl: '',
            thumbnail: '',
            quote: '',
            accent: 'indigo',
            order: videos.length + 1,
            isActive: true
        });
    };

    const handleDeleteVideo = () => {
        if (!videoToDelete) return;
        const updatedVideos = videos.filter(v => v.id !== videoToDelete);
        saveVideos(updatedVideos);
        setVideoToDelete(null);
    };

    const moveVideo = (id: string, direction: 'up' | 'down') => {
        const index = videos.findIndex(v => v.id === id);
        if (index === -1) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= videos.length) return;

        const updatedVideos = [...videos];
        [updatedVideos[index], updatedVideos[newIndex]] = [updatedVideos[newIndex], updatedVideos[index]];
        updatedVideos[index].order = index;
        updatedVideos[newIndex].order = newIndex;
        
        saveVideos(updatedVideos);
    };

    const toggleActive = (id: string) => {
        const updatedVideos = videos.map(v => 
            v.id === id ? { ...v, isActive: !v.isActive } : v
        );
        saveVideos(updatedVideos);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex justify-between items-end mb-10">
                {!hideHeader ? (
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">ניהול סרטוני דף הנחיתה</h1>
                        <p className="text-slate-600">נהל את סרטוני הלקוחות שמוצגים בדף הנחיתה. גרור לסידור מחדש, ערוך או הסתר.</p>
                    </div>
                ) : (
                    <div />
                )}
                <Button onClick={() => setIsAddingVideo(true)} className="px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    <Plus size={18} /> סרטון חדש
                </Button>
            </div>

            {/* Videos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {videos.map((video, index) => {
                    const isEditing = editingVideo === video.id;
                    const displayVideo = isEditing && editedVideo ? editedVideo : video;
                    const accentColors: Record<string, string> = {
                        indigo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
                        emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
                        purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
                        pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
                        amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
                        blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30"
                    };
                    const accentClass = accentColors[video.accent] || accentColors.indigo;

                    return (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-2xl overflow-hidden border transition-all ${
                                isEditing 
                                    ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/40' 
                                    : video.isActive 
                                        ? 'border-slate-200 hover:border-slate-300' 
                                        : 'border-slate-200 opacity-60'
                            } ${!video.isActive ? 'bg-slate-50' : 'bg-white'}`}
                        >
                            {/* Video Preview */}
                            <div className={`relative h-[300px] bg-gradient-to-br ${accentClass} border-b border-slate-200`}>
                                <img 
                                    src={displayVideo.thumbnail} 
                                    alt={displayVideo.name}
                                    className="w-full h-full object-cover opacity-50"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                    <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-xl">
                                        <Play size={20} className="text-slate-900 ml-1" fill="currentColor" />
                                    </div>
                                </div>
                                {!video.isActive && (
                                    <div className="absolute top-2 right-2 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded">
                                        מוסתר
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur-md text-slate-900 text-xs font-bold px-2 py-1 rounded border border-slate-200">
                                    #{index + 1}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={displayVideo.name}
                                            onChange={(e) => setEditedVideo({ ...displayVideo, name: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="שם"
                                        />
                                        <input
                                            type="text"
                                            value={displayVideo.role}
                                            onChange={(e) => setEditedVideo({ ...displayVideo, role: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="תפקיד"
                                        />
                                        <input
                                            type="text"
                                            value={displayVideo.company}
                                            onChange={(e) => setEditedVideo({ ...displayVideo, company: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="חברה"
                                        />
                                        <textarea
                                            value={displayVideo.quote}
                                            onChange={(e) => setEditedVideo({ ...displayVideo, quote: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none resize-none"
                                            rows={3}
                                            placeholder="ציטוט"
                                        />
                                        <input
                                            type="text"
                                            value={displayVideo.videoUrl}
                                            onChange={(e) => setEditedVideo({ ...displayVideo, videoUrl: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="קישור לסרטון"
                                        />
                                        <input
                                            type="text"
                                            value={displayVideo.thumbnail}
                                            onChange={(e) => setEditedVideo({ ...displayVideo, thumbnail: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-xs focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="קישור לתמונת תצוגה"
                                        />
                                        <CustomSelect
                                            value={displayVideo.accent}
                                            onChange={(val) => setEditedVideo({ ...displayVideo, accent: val as 'indigo' | 'emerald' | 'purple' | 'pink' | 'amber' | 'blue' })}
                                            options={[
                                                { value: 'indigo', label: 'אינדיגו' },
                                                { value: 'emerald', label: 'אזמרגד' },
                                                { value: 'purple', label: 'סגול' },
                                                { value: 'pink', label: 'ורוד' },
                                                { value: 'amber', label: 'ענבר' },
                                                { value: 'blue', label: 'כחול' },
                                            ]}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-slate-900 font-bold text-sm mb-1">{displayVideo.name}</div>
                                        <div className="text-slate-600 text-xs mb-2">{displayVideo.role}, {displayVideo.company}</div>
                                        <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">"{displayVideo.quote}"</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                onClick={handleSaveVideo}
                                                size="sm"
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all"
                                            >
                                                <Save size={14} className="inline mr-1" />
                                                שמור
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setEditingVideo(null);
                                                    setEditedVideo(null);
                                                }}
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 text-xs font-bold"
                                            >
                                                <X size={14} className="inline mr-1" />
                                                בטל
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={() => {
                                                    setEditingVideo(video.id);
                                                    setEditedVideo({ ...video });
                                                }}
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9"
                                                title="ערוך"
                                                aria-label="ערוך"
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => setPreviewVideo(video)}
                                                variant="default"
                                                size="icon"
                                                className="h-9 w-9"
                                                title="תצוגה מקדימה"
                                                aria-label="תצוגה מקדימה"
                                            >
                                                <Eye size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => toggleActive(video.id)}
                                                variant="outline"
                                                size="icon"
                                                className={`h-9 w-9 ${
                                                    video.isActive
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                                                        : ''
                                                }`}
                                                title={video.isActive ? 'הסתר' : 'הצג'}
                                                aria-label={video.isActive ? 'הסתר' : 'הצג'}
                                            >
                                                <CircleCheckBig size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => moveVideo(video.id, 'up')}
                                                disabled={index === 0}
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 disabled:opacity-50"
                                                title="הזז למעלה"
                                                aria-label="הזז למעלה"
                                            >
                                                <ArrowUp size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => moveVideo(video.id, 'down')}
                                                disabled={index === videos.length - 1}
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 disabled:opacity-50"
                                                title="הזז למטה"
                                                aria-label="הזז למטה"
                                            >
                                                <ArrowDown size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => setVideoToDelete(video.id)}
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                                title="מחק"
                                                aria-label="מחק"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Add Video Modal */}
            <AnimatePresence>
                {isAddingVideo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-900">הוסף סרטון חדש</h3>
                                <Button onClick={() => setIsAddingVideo(false)} variant="ghost" size="icon" className="h-9 w-9" aria-label="סגור" title="סגור">
                                    <X size={24} />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={newVideo.name}
                                        onChange={(e) => setNewVideo({ ...newVideo, name: e.target.value })}
                                        className="bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                        placeholder="שם"
                                    />
                                    <input
                                        type="text"
                                        value={newVideo.role}
                                        onChange={(e) => setNewVideo({ ...newVideo, role: e.target.value })}
                                        className="bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                        placeholder="תפקיד"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={newVideo.company}
                                    onChange={(e) => setNewVideo({ ...newVideo, company: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                    placeholder="חברה"
                                />
                                <textarea
                                    value={newVideo.quote}
                                    onChange={(e) => setNewVideo({ ...newVideo, quote: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none resize-none"
                                    rows={4}
                                    placeholder="ציטוט"
                                />
                                <input
                                    type="text"
                                    value={newVideo.videoUrl}
                                    onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                    placeholder="קישור לסרטון (URL)"
                                />
                                <input
                                    type="text"
                                    value={newVideo.thumbnail}
                                    onChange={(e) => setNewVideo({ ...newVideo, thumbnail: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                    placeholder="קישור לתמונת תצוגה (URL)"
                                />
                                <CustomSelect
                                    value={newVideo.accent || 'indigo'}
                                    onChange={(val) => setNewVideo({ ...newVideo, accent: val as 'indigo' | 'emerald' | 'purple' | 'pink' | 'amber' | 'blue' })}
                                    options={[
                                        { value: 'indigo', label: 'Indigo' },
                                        { value: 'emerald', label: 'Emerald' },
                                        { value: 'purple', label: 'Purple' },
                                        { value: 'pink', label: 'Pink' },
                                        { value: 'amber', label: 'Amber' },
                                        { value: 'blue', label: 'Blue' },
                                    ]}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button onClick={() => setIsAddingVideo(false)} variant="outline">ביטול</Button>
                                <Button onClick={handleAddVideo} className="font-bold">הוסף סרטון</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {videoToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <CircleAlert className="text-red-500" size={24} />
                                <h3 className="text-xl font-bold text-slate-900">מחיקת סרטון</h3>
                            </div>
                            <p className="text-slate-600 mb-6">
                                האם אתה בטוח שברצונך למחוק את הסרטון "{videos.find(v => v.id === videoToDelete)?.name}"?
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button onClick={() => setVideoToDelete(null)} variant="outline">ביטול</Button>
                                <Button onClick={handleDeleteVideo} className="bg-red-600 hover:bg-red-500 text-white">מחק</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewVideo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
                            dir="rtl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-900">תצוגה מקדימה</h3>
                                <Button onClick={() => setPreviewVideo(null)} variant="ghost" size="icon" className="h-9 w-9" aria-label="סגור" title="סגור">
                                    <X size={24} />
                                </Button>
                            </div>
                            {(() => {
                                const accentColors: Record<string, string> = {
                                    indigo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
                                    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
                                    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
                                    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
                                    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
                                    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30"
                                };
                                const accentClass = accentColors[previewVideo.accent] || accentColors.indigo;
                                return (
                                    <div className={`relative h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br ${accentClass} border`}>
                                        <img 
                                            src={previewVideo.thumbnail} 
                                            alt={previewVideo.name}
                                            className="w-full h-full object-cover opacity-40"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-xl">
                                                <Play size={24} className="text-slate-900 ml-1" fill="currentColor" />
                                            </div>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-white text-base font-medium mb-4">"{previewVideo.quote}"</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold">
                                                    {previewVideo.name.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">{previewVideo.name}</div>
                                                    <div className="text-slate-300 text-sm">{previewVideo.role}, {previewVideo.company}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
