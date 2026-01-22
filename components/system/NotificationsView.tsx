'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
    Bell, CheckCircle, AlertTriangle, Info, Clock, Filter, 
    Trash2, Check, User, DollarSign, FileText, Zap, Shield
} from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import {
    deleteSystemNotification,
    getSystemNotifications,
    markAllSystemNotificationsRead,
    markSystemNotificationRead,
} from '@/app/actions/system-notifications';

type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'financial';
type Category = 'all' | 'leads' | 'finance' | 'system' | 'tasks';

interface NotificationItem {
    id: string;
    title: string;
    description: string;
    time: string; // Relative time
    type: NotificationType;
    category: Category;
    isRead: boolean;
    actionLabel?: string;
    link?: string | null;
}

function orgSlugFromPathname(pathname: string | null | undefined): string | null {
    if (!pathname) return null;
    const parts = pathname.split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    if (wIndex === -1) return null;
    const slug = parts[wIndex + 1];
    return slug ? decodeURIComponent(slug) : null;
}

const NotificationsView: React.FC<{ orgSlug?: string; initialNotifications?: NotificationItem[] }> = ({
    orgSlug,
    initialNotifications,
}) => {
    const { addToast } = useToast();
    const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string | null>(orgSlug ?? null);
    const [notifications, setNotifications] = useState<NotificationItem[]>(() => initialNotifications || []);
    const [filter, setFilter] = useState<Category>('all');

    useEffect(() => {
        if (orgSlug) {
            setResolvedOrgSlug(orgSlug);
            return;
        }
        if (typeof window === 'undefined') return;
        const found = orgSlugFromPathname(window.location.pathname);
        if (found) setResolvedOrgSlug(found);
    }, [orgSlug]);

    useEffect(() => {
        if (!resolvedOrgSlug) return;
        if (initialNotifications && initialNotifications.length) return;
        void (async () => {
            try {
                const rows = await getSystemNotifications({ orgSlug: resolvedOrgSlug, limit: 200 });
                setNotifications(rows as any);
            } catch {
                // ignore
            }
        })();
    }, [resolvedOrgSlug, initialNotifications]);

    const filteredNotifications = useMemo(
        () => notifications.filter(n => filter === 'all' || n.category === filter),
        [notifications, filter]
    );
    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        if (!resolvedOrgSlug) return;
        const res = await markSystemNotificationRead({ orgSlug: resolvedOrgSlug, id });
        if (!res.ok) {
            addToast(res.message || 'שגיאה בסימון התראה כנקראה', 'error');
        }
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        if (!resolvedOrgSlug) {
            addToast('כל ההתראות סומנו כנקראו', 'success');
            return;
        }
        const res = await markAllSystemNotificationsRead({ orgSlug: resolvedOrgSlug });
        if (!res.ok) {
            addToast(res.message || 'שגיאה בסימון כל ההתראות כנקראו', 'error');
            return;
        }
        addToast('כל ההתראות סומנו כנקראו', 'success');
    };

    const deleteNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (!resolvedOrgSlug) return;
        const res = await deleteSystemNotification({ orgSlug: resolvedOrgSlug, id });
        if (!res.ok) {
            addToast(res.message || 'שגיאה במחיקת התראה', 'error');
        }
    };

    const handleAction = async (id: string, action: string) => {
        const n = notifications.find(x => x.id === id);
        if (n?.link) {
            try {
                window.open(n.link, '_blank', 'noopener,noreferrer');
            } catch {
                // ignore
            }
        } else {
            addToast(`פעולה בוצעה: ${action}`, 'success');
        }
        await markAsRead(id);
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
            case 'warning': return <AlertTriangle size={20} className="text-amber-500" />;
            case 'error': return <AlertTriangle size={20} className="text-red-500" />;
            case 'financial': return <DollarSign size={20} className="text-blue-500" />;
            default: return <Info size={20} className="text-indigo-500" />;
        }
    };

    const getTypeStyles = (type: NotificationType) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 border-emerald-100';
            case 'warning': return 'bg-amber-50 border-amber-100';
            case 'error': return 'bg-red-50 border-red-100';
            case 'financial': return 'bg-blue-50 border-blue-100';
            default: return 'bg-white border-slate-100';
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-fade-in pb-20 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Bell className="text-indigo-600" strokeWidth={2.5} />
                        מרכז העדכון
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">
                        יש לך <span className="font-bold text-slate-800">{unreadCount}</span> עדכונים שלא נקראו.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={markAllRead}
                        className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                        <Check size={16} /> סמן הכל כנקרא
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Sidebar Filters */}
                <div className="w-full lg:w-64 shrink-0 space-y-2">
                    <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm sticky top-6">
                        {[
                            { id: 'all', label: 'כל ההתראות', icon: Bell },
                            { id: 'leads', label: 'לידים ומכירות', icon: User },
                            { id: 'finance', label: 'כספים וגבייה', icon: DollarSign },
                            { id: 'tasks', label: 'משימות', icon: CheckCircle },
                            { id: 'system', label: 'מערכת', icon: Shield },
                        ].map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setFilter(cat.id as Category)}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between transition-colors ${filter === cat.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <cat.icon size={16} />
                                    {cat.label}
                                </div>
                                {cat.id === 'all' && unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="flex-1 space-y-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Bell size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">הכל מעודכן!</h3>
                            <p className="text-slate-500 mt-2">אין התראות חדשות בקטגוריה זו.</p>
                        </div>
                    ) : (
                        filteredNotifications.map(notification => (
                            <div 
                                key={notification.id} 
                                onClick={() => markAsRead(notification.id)}
                                className={`relative p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-md ${
                                    notification.isRead 
                                    ? 'bg-white border-slate-100 opacity-80 hover:opacity-100' 
                                    : `${getTypeStyles(notification.type)} shadow-sm ring-1 ring-inset ring-black/5`
                                }`}
                            >
                                {!notification.isRead && (
                                    <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
                                )}
                                
                                <div className="flex items-start gap-4 pr-2">
                                    <div className={`p-3 rounded-xl bg-white shadow-sm shrink-0 border border-slate-100`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold text-sm ${notification.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-lg">
                                                <Clock size={10} /> {notification.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                            {notification.description}
                                        </p>
                                        
                                        {notification.actionLabel && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAction(notification.id, notification.actionLabel!); }}
                                                    className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm"
                                                >
                                                    {notification.actionLabel}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-4 bottom-4">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="מחק התראה"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default NotificationsView;
