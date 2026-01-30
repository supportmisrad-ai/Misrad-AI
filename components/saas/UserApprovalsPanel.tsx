'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, X, CheckCircle2, Clock, Mail, Search, Plus, Trash2, AlertCircle } from 'lucide-react';
import { UserApprovalRequest, Tenant } from '../../types';
import { Button } from '@/components/ui/button';

interface UserApprovalsPanelProps {
    approvalRequests: UserApprovalRequest[];
    tenants: Tenant[];
    onApprove: (id: string, approvedBy: string) => void;
    onReject: (id: string, reason: string, rejectedBy: string) => void;
    onAddAllowedEmail: (tenantId: string, email: string) => void;
    onRemoveAllowedEmail: (tenantId: string, email: string) => void;
    currentUserId: string;
    hideHeader?: boolean;
}

export const UserApprovalsPanel: React.FC<UserApprovalsPanelProps> = ({
    approvalRequests,
    tenants,
    onApprove,
    onReject,
    onAddAllowedEmail,
    onRemoveAllowedEmail,
    currentUserId,
    hideHeader
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenant, setSelectedTenant] = useState<string>('all');
    const [rejectReason, setRejectReason] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [addingToTenant, setAddingToTenant] = useState<string | null>(null);

    // Remove duplicate tenants by ID (keep first occurrence)
    const uniqueTenants = React.useMemo(() => {
        const seen = new Set<string>();
        return tenants.filter(t => {
            if (seen.has(t.id)) {
                return false;
            }
            seen.add(t.id);
            return true;
        });
    }, [tenants]);

    const pendingRequests = approvalRequests.filter(r => r.status === 'pending');
    const filteredRequests = pendingRequests.filter(r => {
        const matchesSearch = r.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTenant = selectedTenant === 'all' || r.tenantId === selectedTenant;
        return matchesSearch && matchesTenant;
    });

    const handleReject = (id: string) => {
        if (!rejectReason.trim()) {
            alert('נא להזין סיבת דחייה');
            return;
        }
        onReject(id, rejectReason, currentUserId);
        setRejectingId(null);
        setRejectReason('');
    };

    const handleAddEmail = (tenantId: string) => {
        if (!newEmail.trim() || !newEmail.includes('@')) {
            alert('נא להזין כתובת אימייל תקינה');
            return;
        }
        onAddAllowedEmail(tenantId, newEmail);
        setNewEmail('');
        setAddingToTenant(null);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {!hideHeader ? (
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        ניהול אישורי משתמשים
                    </h1>
                    <p className="text-slate-600 text-lg">אשר או דחה בקשות גישה, ונהל רשימת מיילים מאושרים לכל לקוח.</p>
                </div>
            ) : null}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">בקשות ממתינות</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{pendingRequests.length}</h3>
                        </div>
                        <div className="p-3 bg-yellow-500/20 text-yellow-700 rounded-xl border border-yellow-500/30 backdrop-blur-sm">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">אושרו החודש</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {approvalRequests.filter(r => r.status === 'approved' && 
                                    new Date(r.approvedAt || '').getMonth() === new Date().getMonth()).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-500/20 text-green-700 rounded-xl border border-green-500/30 backdrop-blur-sm">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">מיילים מאושרים</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">
                                {uniqueTenants.reduce((acc, t) => acc + (t.allowedEmails?.length || 0), 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-500/20 text-blue-700 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                            <Mail size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden mb-8 shadow-2xl">
                <div className="p-6 border-b border-slate-200/70 flex justify-between items-center bg-white/60 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <UserCheck size={20} /> בקשות ממתינות לאישור
                    </h3>
                    <div className="flex gap-3">
                        <select
                            value={selectedTenant}
                            onChange={(e) => setSelectedTenant(e.target.value)}
                            className="bg-white/80 border border-slate-200 rounded-xl py-2 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60"
                        >
                            <option value="all">כל הלקוחות</option>
                            {uniqueTenants.map((t, index) => (
                                <option key={`${t.id}-${index}`} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="חפש לפי אימייל או שם..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 w-64 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-3">
                    {filteredRequests.length === 0 ? (
                        <div className="text-center py-12 text-slate-600">
                            <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
                            <p>אין בקשות ממתינות</p>
                        </div>
                    ) : (
                        filteredRequests.map(request => {
                            const tenant = tenants.find(t => t.id === request.tenantId);
                            return (
                                <div key={request.id} className="bg-white/80 border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                            {request.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{request.name || 'ללא שם'}</div>
                                            <div className="text-sm text-slate-600 flex items-center gap-2">
                                                <Mail size={12} /> {request.email}
                                            </div>
                                            {tenant && (
                                                <div className="text-xs text-indigo-400 mt-1">
                                                    בקשה ל-{tenant.name}
                                                </div>
                                            )}
                                            <div className="text-xs text-slate-500 mt-1">
                                                {new Date(request.requestedAt).toLocaleString('he-IL')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {rejectingId === request.id ? (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    placeholder="סיבת דחייה..."
                                                    value={rejectReason}
                                                    onChange={(e) => setRejectReason(e.target.value)}
                                                    className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 w-48 focus:outline-none focus:ring-2 focus:ring-red-200/70 focus:border-red-300 transition-all"
                                                    onKeyPress={(e) => e.key === 'Enter' && handleReject(request.id)}
                                                />
                                                <Button
                                                    onClick={() => handleReject(request.id)}
                                                    size="sm"
                                                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-200/60 transition-all"
                                                >
                                                    דחה
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setRejectingId(null);
                                                        setRejectReason('');
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                >
                                                    ביטול
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button
                                                    onClick={() => onApprove(request.id, currentUserId)}
                                                    size="sm"
                                                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-500 hover:to-emerald-500 flex items-center gap-2 shadow-lg shadow-green-200/60 transition-all"
                                                >
                                                    <CheckCircle2 size={16} /> אשר
                                                </Button>
                                                <Button
                                                    onClick={() => setRejectingId(request.id)}
                                                    size="sm"
                                                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 flex items-center gap-2 shadow-lg shadow-red-200/60 transition-all"
                                                >
                                                    <X size={16} /> דחה
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Allowed Emails Management */}
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <Mail size={20} /> רשימת מיילים מאושרים לכל לקוח
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">מיילים אלה יכולים להירשם ללא אישור מנהל</p>
                </div>

                <div className="p-6 space-y-6">
                    {uniqueTenants.map((tenant, index) => (
                        <div key={`${tenant.id}-${index}`} className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 hover:border-slate-300/80 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-900">{tenant.name}</h4>
                                    <p className="text-xs text-slate-600">{tenant.ownerEmail}</p>
                                </div>
                                {addingToTenant === tenant.id ? (
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="bg-white/80 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 w-64 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60"
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddEmail(tenant.id)}
                                        />
                                        <Button
                                            onClick={() => handleAddEmail(tenant.id)}
                                            size="sm"
                                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-200/60 transition-all"
                                        >
                                            הוסף
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setAddingToTenant(null);
                                                setNewEmail('');
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        >
                                            ביטול
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => setAddingToTenant(tenant.id)}
                                        size="sm"
                                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 flex items-center gap-2 shadow-lg shadow-indigo-200/60 transition-all"
                                    >
                                        <Plus size={16} /> הוסף מייל
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {tenant.allowedEmails && tenant.allowedEmails.length > 0 ? (
                                    tenant.allowedEmails.map((email, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300/80 transition-all">
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <Mail size={14} /> {email}
                                            </div>
                                            <Button
                                                onClick={() => onRemoveAllowedEmail(tenant.id, email)}
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                                aria-label="הסר מייל"
                                                title="הסר מייל"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-slate-500 text-sm">
                                        <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                                        אין מיילים מאושרים. כל מייל צריך אישור מנהל.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

