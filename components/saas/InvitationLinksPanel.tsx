/**
 * Invitation Links Panel
 * 
 * Panel for managing one-time invitation links in the admin view
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Copy, Check, X, Plus, Mail, Calendar, User, Building2, ExternalLink, Trash2, RefreshCw, Rocket, CheckCircle2, Phone } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

interface InvitationLink {
    id: string;
    token: string;
    url: string;
    client_id?: string;
    created_at: string;
    expires_at?: string;
    is_used: boolean;
    is_active: boolean;
    used_at?: string;
    ceo_name?: string;
    ceo_email?: string;
    ceo_phone?: string;
    company_name?: string;
    company_logo?: string;
    company_address?: string;
    company_website?: string;
    additional_notes?: string;
    source: 'manual' | 'automatic';
}

interface InvitationLinksPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const InvitationLinksPanel: React.FC<InvitationLinksPanelProps> = ({ addToast }) => {
    const { currentUser } = useData();
    const [invitations, setInvitations] = useState<InvitationLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(7); // Default: 7 days (temporary link)
    const [creatingTenantFor, setCreatingTenantFor] = useState<string | null>(null);

    // Load invitations
    const loadInvitations = async () => {
        // Don't load if user is not authenticated or not authorized
        if (!currentUser?.id) {
            setInvitations([]);
            return;
        }

        setIsLoading(true);
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/invitations', {
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });
            if (!response.ok) {
                // Handle 401 Unauthorized gracefully - user might not be authenticated yet
                if (response.status === 401) {
                    console.warn('[InvitationLinks] User not authenticated, skipping load');
                    setInvitations([]);
                    return;
                }
                // Handle 403 Forbidden gracefully - user doesn't have permission
                if (response.status === 403) {
                    console.warn('[InvitationLinks] User not authorized to view invitations');
                    setInvitations([]);
                    return;
                }
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Failed to load invitations (${response.status})`);
            }
            const data = await response.json();
            setInvitations(data.invitations || []);
        } catch (error: any) {
            console.error('[InvitationLinks] Error loading invitations:', error);
            // Only show error toast for non-auth errors
            if (!error.message?.includes('Unauthorized') && !error.message?.includes('Forbidden')) {
                addToast(error.message || 'שגיאה בטעינת קישורים', 'error');
            }
            setInvitations([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Only load invitations if user is authenticated
        if (currentUser?.id) {
            loadInvitations();
        }
    }, [currentUser?.id]);

    // Create new invitation
    const handleCreateInvitation = async () => {
        setIsCreating(true);
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/invitations/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({
                    expiresInDays,
                    source: 'manual'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create invitation');
            }

            const data = await response.json();
            addToast('קישור חד פעמי נוצר בהצלחה', 'success');
            
            // Reload invitations
            await loadInvitations();
        } catch (error: any) {
            console.error('[InvitationLinks] Error creating invitation:', error);
            addToast(error.message || 'שגיאה ביצירת קישור', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    // Copy link to clipboard
    const handleCopyLink = async (url: string, token: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedToken(token);
            addToast('קישור הועתק ללוח', 'success');
            setTimeout(() => setCopiedToken(null), 2000);
        } catch (error) {
            addToast('שגיאה בהעתקת קישור', 'error');
        }
    };

    // Deactivate invitation
    const handleDeactivate = async (id: string) => {
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/invitations/${id}/deactivate`, {
                method: 'POST',
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });

            if (!response.ok) {
                throw new Error('Failed to deactivate invitation');
            }

            addToast('קישור בוטל', 'success');
            await loadInvitations();
        } catch (error: any) {
            addToast(error.message || 'שגיאה בביטול קישור', 'error');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'ללא תאריך';
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isExpired = (expiresAt?: string) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    // Create tenant from completed invitation
    const handleCreateTenant = async (invitation: InvitationLink) => {
        if (!invitation.company_name || !invitation.ceo_email) {
            addToast('חסרים פרטים חיוניים ליצירת Tenant (שם החברה או אימייל)', 'error');
            return;
        }

        setCreatingTenantFor(invitation.id);
        try {
            // Generate subdomain from company name
            const subdomain = String(invitation.company_name ?? '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .substring(0, 50);

            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({
                    name: invitation.company_name,
                    ownerEmail: invitation.ceo_email,
                    subdomain: subdomain || `tenant-${Date.now()}`,
                    plan: 'Basic', // Default plan - can be changed later
                    region: 'il-central',
                    mrr: 0,
                    logo: invitation.company_logo || undefined,
                    allowedEmails: [invitation.ceo_email], // Auto-approve CEO email
                    requireApproval: true // Other users need approval
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת Tenant');
            }

            const data = await response.json();
            
            // Show success message with invitation status
            if (data.invitationSent) {
                addToast(`Tenant "${invitation.company_name}" נוצר והזמנה נשלחה אוטומטית!`, 'success');
            } else {
                addToast(`Tenant "${invitation.company_name}" נוצר בהצלחה! (הזמנה לא נשלחה - ניתן לשלוח ידנית מפאנל Tenants)`, 'success');
            }
            
            // Reload invitations to refresh
            await loadInvitations();
        } catch (error: any) {
            console.error('[InvitationLinks] Error creating tenant:', error);
            addToast(error.message || 'שגיאה ביצירת Tenant', 'error');
        } finally {
            setCreatingTenantFor(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        קישורים חד פעמיים
                    </h2>
                    <p className="text-sm text-slate-600">ניהול קישורים להשלמת פרטי לקוחות</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-slate-200/70 px-3 py-2 rounded-xl">
                        <label className="text-xs font-bold text-slate-600">תוקף (ימים):</label>
                        <input
                            type="number"
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(Number(e.target.value))}
                            min="1"
                            max="365"
                            className="w-16 px-2 py-1 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 transition-all"
                        />
                        <span className="text-xs text-slate-500">(קישור זמני)</span>
                    </div>
                    <button
                        onClick={handleCreateInvitation}
                        disabled={isCreating}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/60"
                    >
                        {isCreating ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                יוצר...
                            </>
                        ) : (
                            <>
                                <Plus size={16} />
                                צור קישור חדש
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Invitations List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw size={24} className="animate-spin text-gray-400" />
                </div>
            ) : invitations.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-12 text-center shadow-xl">
                    <Link2 size={48} className="mx-auto text-slate-500 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">אין קישורים עדיין</h3>
                    <p className="text-sm text-slate-600 mb-6">צור קישור חד פעמי ראשון כדי להתחיל</p>
                    <button
                        onClick={handleCreateInvitation}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-200/60"
                    >
                        צור קישור חדש
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {invitations.map((invitation) => (
                        <motion.div
                            key={invitation.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 hover:border-slate-300/80 hover:shadow-xl transition-all"
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Link Info */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            invitation.is_used 
                                                ? 'bg-gray-300' 
                                                : isExpired(invitation.expires_at)
                                                ? 'bg-red-500'
                                                : 'bg-green-500'
                                        }`} />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Link2 size={16} className="text-gray-400" />
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    {invitation.is_used ? 'שימש' : isExpired(invitation.expires_at) ? 'פג תוקף' : 'פעיל'}
                                                </span>
                                                {invitation.source === 'automatic' && (
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                        אוטומטי
                                                    </span>
                                                )}
                                                {!invitation.is_used && !isExpired(invitation.expires_at) && (
                                                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                                        זמני
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                                                    {invitation.url}
                                                </code>
                                                <button
                                                    onClick={() => handleCopyLink(invitation.url, invitation.token)}
                                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all backdrop-blur-sm border border-transparent hover:border-slate-200"
                                                    title="העתק קישור"
                                                >
                                                    {copiedToken === invitation.token ? (
                                                        <Check size={16} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar size={14} />
                                            <span className="text-xs">נוצר: {formatDate(invitation.created_at)}</span>
                                        </div>
                                        {invitation.expires_at && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Calendar size={14} />
                                                <span className="text-xs">תוקף: {formatDate(invitation.expires_at)}</span>
                                            </div>
                                        )}
                                        {invitation.ceo_name && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <User size={14} />
                                                <span className="text-xs">{invitation.ceo_name}</span>
                                            </div>
                                        )}
                                        {invitation.company_name && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Building2 size={14} />
                                                <span className="text-xs">{invitation.company_name}</span>
                                            </div>
                                        )}
                                        {invitation.ceo_email && (
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Mail size={14} />
                                                <span className="text-xs truncate max-w-[200px]">{invitation.ceo_email}</span>
                                            </div>
                                        )}
                                        {invitation.used_at && (
                                            <div className="flex items-center gap-2 text-emerald-700">
                                                <CheckCircle2 size={14} />
                                                <span className="text-xs">הושלם: {formatDate(invitation.used_at)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Show completed form data */}
                                    {invitation.is_used && invitation.company_name && (
                                        <div className="mt-3 pt-3 border-t border-slate-200/70">
                                            <div className="text-xs text-slate-500 mb-2 font-bold">פרטי הטופס שהושלם:</div>
                                            <div className="bg-slate-50/80 backdrop-blur-sm rounded-lg p-3 space-y-2 text-xs border border-slate-200">
                                                {invitation.company_name && (
                                                    <div className="flex items-center gap-2 text-slate-900">
                                                        <Building2 size={12} className="text-indigo-400" />
                                                        <span className="font-bold">{invitation.company_name}</span>
                                                    </div>
                                                )}
                                                {invitation.ceo_name && (
                                                    <div className="flex items-center gap-2 text-slate-700">
                                                        <User size={12} className="text-indigo-400" />
                                                        <span>{invitation.ceo_name}</span>
                                                    </div>
                                                )}
                                                {invitation.ceo_email && (
                                                    <div className="flex items-center gap-2 text-slate-700">
                                                        <Mail size={12} className="text-indigo-400" />
                                                        <span>{invitation.ceo_email}</span>
                                                    </div>
                                                )}
                                                {invitation.ceo_phone && (
                                                    <div className="flex items-center gap-2 text-slate-700">
                                                        <Phone size={12} className="text-indigo-400" />
                                                        <span>{invitation.ceo_phone}</span>
                                            </div>
                                        )}
                                    </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2 flex-col">
                                    {invitation.is_used && invitation.company_name && invitation.ceo_email && (
                                        <button
                                            onClick={() => handleCreateTenant(invitation)}
                                            disabled={creatingTenantFor === invitation.id}
                                            className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/60"
                                            title="צור Tenant מהנתונים"
                                        >
                                            {creatingTenantFor === invitation.id ? (
                                                <>
                                                    <RefreshCw size={16} className="animate-spin" />
                                                    יוצר...
                                                </>
                                            ) : (
                                                <>
                                                    <Rocket size={16} />
                                                    צור Tenant
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                    {!invitation.is_used && invitation.is_active && (
                                        <button
                                            onClick={() => handleDeactivate(invitation.id)}
                                                className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all backdrop-blur-sm border border-transparent hover:border-red-200"
                                            title="בטל קישור"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                    <a
                                        href={invitation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all backdrop-blur-sm border border-transparent hover:border-blue-200"
                                        title="פתח קישור"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

