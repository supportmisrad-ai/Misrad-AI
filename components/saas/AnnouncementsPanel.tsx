'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, X, Edit2, Trash2, Users, Shield, CircleAlert } from 'lucide-react';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { Button } from '@/components/ui/button';

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
    currentUser: { id: string; name?: string; role?: string; isSuperAdmin?: boolean };
    addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    hideHeader?: boolean;
}

export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({ currentUser, addToast, hideHeader }) => {
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
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/announcements', {
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            if (!response.ok) {
                throw new Error('Failed to load announcements');
            }
            const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
            const payload = data?.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : data;
            setAnnouncements((Array.isArray(payload.announcements) ? payload.announcements : []) as Announcement[]);
        } catch (error: unknown) {
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
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                // Update existing
                const response = await fetch(`/api/announcements/${editingAnnouncement.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
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
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                // Create new
                const response = await fetch('/api/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                    body: JSON.stringify({
                        title: formData.title,
                        message: formData.message,
                        recipientType: formData.recipientType
                    })
                });

                if (!response.ok) {
                    const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
                    const errPayload = errorData?.data && typeof errorData.data === 'object' ? (errorData.data as Record<string, unknown>) : errorData;
                    throw new Error(String(errorData?.error || errPayload?.error || 'Failed to create announcement'));
                }

                addToast('הודעה נוצרה ונשלחה בהצלחה', 'success');
            }

            setIsModalOpen(false);
            loadAnnouncements();
        } catch (error: unknown) {
            console.error('Error saving announcement:', error);
            const msg = error instanceof Error ? error.message : 'שגיאה בשמירת הודעה';
            addToast(msg, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק הודעה זו?')) {
            return;
        }

        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/announcements/${id}`, {
                method: 'DELETE',
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });

            if (!response.ok) {
                throw new Error('Failed to delete announcement');
            }

            addToast('הודעה נמחקה בהצלחה', 'success');
            loadAnnouncements();
        } catch (error: unknown) {
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
            {!hideHeader ? (
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">הודעות מערכת</h3>
                        <p className="text-sm text-slate-600">שליחת הודעות לכל המשתמשים או רק ללקוחות</p>
                    </div>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={16} /> הודעה חדשה
                    </Button>
                </div>
            ) : null}

            {isLoading ? (
                <div className="text-center py-12 text-slate-500 font-bold">טוען...</div>
            ) : announcements.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-12 text-center shadow-xl">
                    <MessageSquare size={48} className="mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-900 font-bold mb-2">אין הודעות פעילות</p>
                    <p className="text-sm text-slate-600">צור הודעה חדשה כדי לשלוח התראה למשתמשים</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-black text-slate-900 text-lg">{announcement.title}</h4>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                            announcement.recipient_type === 'all'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                                        }`}>
                                            {announcement.recipient_type === 'all' ? (
                                                <>
                                                    <Users size={12} className="inline mr-1" /> כל המשתמשים
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={12} className="inline mr-1" /> לקוחות בלבד
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 mb-3 whitespace-pre-wrap">{announcement.message}</p>
                                    <p className="text-xs text-slate-500">{formatDate(announcement.created_at)}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        onClick={() => handleOpenModal(announcement)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-500 hover:text-indigo-700"
                                        title="ערוך"
                                    >
                                        <Edit2 size={16} />
                                    </Button>
                                    <Button
                                        onClick={() => handleDelete(announcement.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-500 hover:text-rose-700"
                                        title="מחק"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
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
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl z-[101] p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-900">
                                    {editingAnnouncement ? 'עריכת הודעה' : 'הודעה חדשה'}
                                </h3>
                                <Button
                                    onClick={() => setIsModalOpen(false)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-slate-500"
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">כותרת *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="כותרת ההודעה"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">תוכן ההודעה *</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        placeholder="תוכן ההודעה..."
                                        rows={6}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none"
                                    />
                                </div>

                                {!editingAnnouncement && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">שלח ל-</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                onClick={() => setFormData({ ...formData, recipientType: 'all' })}
                                                type="button"
                                                variant="outline"
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                    formData.recipientType === 'all'
                                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Users size={20} className="mx-auto mb-2" />
                                                <div className="font-bold text-sm">כל המשתמשים</div>
                                                <div className="text-xs mt-1 opacity-75">כל המשתמשים במערכת</div>
                                            </Button>
                                            <Button
                                                onClick={() => setFormData({ ...formData, recipientType: 'super_admins' })}
                                                type="button"
                                                variant="outline"
                                                className={`p-4 rounded-xl border-2 transition-all ${
                                                    formData.recipientType === 'super_admins'
                                                        ? 'border-purple-200 bg-purple-50 text-purple-700'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Shield size={20} className="mx-auto mb-2" />
                                                <div className="font-bold text-sm">לקוחות</div>
                                                <div className="text-xs mt-1 opacity-75">לקוחות רוכשים בלבד</div>
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={() => setIsModalOpen(false)}
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        ביטול
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        type="button"
                                        className="flex-1"
                                    >
                                        {editingAnnouncement ? 'עדכן' : 'שלח הודעה'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

