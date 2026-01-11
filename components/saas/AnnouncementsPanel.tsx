'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, X, Edit2, Trash2, Users, Shield, AlertCircle } from 'lucide-react';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

interface Announcement {
    id: string;
    title: string;
    message: string;
    recipient_type: 'all' | 'super_admins';
    created_by: string;
    is_active: boolean;
    created_at: string;
}

interface AnnouncementsPanelProps {
    currentUser: any;
    addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ currentUser, addToast }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        recipientType: 'all' as 'all' | 'super_admins'
    });

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setIsLoading(true);
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/announcements', {
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });
            if (!response.ok) {
                throw new Error('Failed to load announcements');
            }
            const data = await response.json();
            setAnnouncements(data.announcements || []);
        } catch (error: any) {
            console.error('Error loading announcements:', error);
            addToast('שגיאה בטעינת הודעות', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (announcement?: Announcement) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setFormData({
                title: announcement.title,
                message: announcement.message,
                recipientType: announcement.recipient_type
            });
        } else {
            setEditingAnnouncement(null);
            setFormData({
                title: '',
                message: '',
                recipientType: 'all'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.message.trim()) {
            addToast('נא למלא את כל השדות', 'error');
            return;
        }

        try {
            if (editingAnnouncement) {
                const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
                // Update existing
                const response = await fetch(`/api/announcements/${editingAnnouncement.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...(orgId ? { 'x-org-id': orgId } : {}) },
                    body: JSON.stringify({
                        title: formData.title,
                        message: formData.message,
                        is_active: true
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update announcement');
                }

                addToast('הודעה עודכנה בהצלחה', 'success');
            } else {
                const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
                // Create new
                const response = await fetch('/api/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(orgId ? { 'x-org-id': orgId } : {}) },
                    body: JSON.stringify({
                        title: formData.title,
                        message: formData.message,
                        recipientType: formData.recipientType
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to create announcement');
                }

                addToast('הודעה נוצרה ונשלחה בהצלחה', 'success');
            }

            setIsModalOpen(false);
            loadAnnouncements();
        } catch (error: any) {
            console.error('Error saving announcement:', error);
            addToast(error.message || 'שגיאה בשמירת הודעה', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק הודעה זו?')) {
            return;
        }

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/announcements/${id}`, {
                method: 'DELETE',
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });

            if (!response.ok) {
                throw new Error('Failed to delete announcement');
            }

            addToast('הודעה נמחקה בהצלחה', 'success');
            loadAnnouncements();
        } catch (error: any) {
            console.error('Error deleting announcement:', error);
            addToast('שגיאה במחיקת הודעה', 'error');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-100 mb-1">הודעות מערכת</h3>
                    <p className="text-sm text-slate-400">שליחת הודעות לכל המשתמשים או רק למשתמשים רוכשים</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
                >
                    <Plus size={16} /> הודעה חדשה
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400">טוען...</div>
            ) : announcements.length === 0 ? (
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-12 text-center">
                    <MessageSquare size={48} className="mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400 mb-2">אין הודעות פעילות</p>
                    <p className="text-sm text-slate-500">צור הודעה חדשה כדי לשלוח התראה למשתמשים</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-black text-slate-100 text-lg">{announcement.title}</h4>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                            announcement.recipient_type === 'all'
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        }`}>
                                            {announcement.recipient_type === 'all' ? (
                                                <>
                                                    <Users size={12} className="inline mr-1" /> כל המשתמשים
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={12} className="inline mr-1" /> משתמשים רוכשים בלבד
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 mb-3 whitespace-pre-wrap">{announcement.message}</p>
                                    <p className="text-xs text-slate-500">{formatDate(announcement.created_at)}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleOpenModal(announcement)}
                                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                        title="ערוך"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(announcement.id)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="מחק"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl z-[101] p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-100">
                                    {editingAnnouncement ? 'עריכת הודעה' : 'הודעה חדשה'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">כותרת *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="כותרת ההודעה"
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-300 mb-2">תוכן ההודעה *</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="תוכן ההודעה..."
                                        rows={6}
                                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                                    />
                                </div>

                                {!editingAnnouncement && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-300 mb-2">שלח ל-</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setFormData({ ...formData, recipientType: 'all' })}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                    formData.recipientType === 'all'
                                                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                                                        : 'border-slate-600 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                                                }`}
                                            >
                                                <Users size={20} className="mx-auto mb-2" />
                                                <div className="font-bold text-sm">כל המשתמשים</div>
                                                <div className="text-xs mt-1 opacity-75">כל המשתמשים במערכת</div>
                                            </button>
                                            <button
                                                onClick={() => setFormData({ ...formData, recipientType: 'super_admins' })}
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                    formData.recipientType === 'super_admins'
                                                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                                        : 'border-slate-600 bg-slate-900/50 text-slate-400 hover:border-slate-500'
                                                }`}
                                            >
                                                <Shield size={20} className="mx-auto mb-2" />
                                                <div className="font-bold text-sm">משתמשים רוכשים</div>
                                                <div className="text-xs mt-1 opacity-75">רק Super Admins</div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold transition-colors"
                                    >
                                        ביטול
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
                                    >
                                        {editingAnnouncement ? 'עדכן' : 'שלח הודעה'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

