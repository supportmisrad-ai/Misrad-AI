import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Upload, Loader2, X, Image, Trash2, Lock, Send, CheckCircle } from 'lucide-react';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { usePathname } from 'next/navigation';
import { getWorkspaceOrgSlugFromPathname, useNexusSoloMode } from '@/lib/os/nexus-routing';
import { saveWorkspaceLogo } from '@/app/actions/workspace-branding';

export const OrganizationTab: React.FC = () => {
    const { organization, updateOrganization, addToast, users } = useData();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const pathname = usePathname();
    const [canManageBranding, setCanManageBranding] = useState<boolean>(true);
    const [isLoadingAccess, setIsLoadingAccess] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
    const { isSoloMode, setSoloMode } = useNexusSoloMode(orgSlug, Array.isArray(users) ? users.length : null);

    useEffect(() => {
        const loadAccess = async () => {
            try {
                const orgSlug = getWorkspaceOrgSlugFromPathname(pathname);
                if (!orgSlug) {
                    setCanManageBranding(false);
                    return;
                }

                const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/access`, { cache: 'no-store' });
                if (!res.ok) {
                    setCanManageBranding(false);
                    return;
                }
                const data = await res.json().catch(() => null);
                setCanManageBranding(Boolean(data?.access?.canManageBranding));
            } catch {
                setCanManageBranding(false);
            } finally {
                setIsLoadingAccess(false);
            }
        };

        loadAccess();
    }, [pathname]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canManageBranding) {
            addToast('רק הבעלים יכול לעדכן מיתוג ארגוני (שם/לוגו).', 'error');
            return;
        }
        const file = e.target.files?.[0];
        if (!file || !orgSlug) return;

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            addToast('סוג קובץ לא נתמך. אנא בחר תמונה (PNG, JPG, SVG או WebP)', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);

        try {
            const { resizeImageIfNeeded } = await import('@/lib/shared/resize-image');
            const resizedFile = await resizeImageIfNeeded(file, 5 * 1024 * 1024);

            // Show instant preview via data URL while uploading
            const previewUrl = URL.createObjectURL(resizedFile);
            updateOrganization({ logo: previewUrl });
            setUploadProgress(30);

            // Upload to Supabase storage
            const form = new FormData();
            form.append('file', resizedFile);
            form.append('bucket', 'attachments');
            form.append('folder', 'org-logos');
            form.append('orgSlug', orgSlug);

            const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: form });
            setUploadProgress(70);

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}));
                throw new Error((err as Record<string, string>)?.error || 'שגיאה בהעלאת הקובץ');
            }

            const uploaded = await uploadRes.json().catch(() => null) as Record<string, string> | null;
            const logoRef = String(uploaded?.ref || uploaded?.url || '').trim();
            if (!logoRef) throw new Error('לא התקבל URL לאחר ההעלאה');
            setUploadProgress(85);

            // Save to database
            const saveRes = await saveWorkspaceLogo({ orgSlug, logoRef });
            if (!saveRes.ok) {
                throw new Error('error' in saveRes ? saveRes.error : 'שגיאה בשמירה');
            }

            // Update local state with the signed URL for display
            const signedUrl = String(uploaded?.signedUrl || uploaded?.url || logoRef);
            updateOrganization({ logo: signedUrl });
            setUploadProgress(100);
            addToast('לוגו הארגון עודכן ונשמר בהצלחה', 'success');

            URL.revokeObjectURL(previewUrl);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'שגיאה בהעלאת לוגו';
            addToast(msg, 'error');
            // Revert preview on failure
            updateOrganization({ logo: organization.logo });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    const handleRemoveLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canManageBranding) {
            addToast('רק הבעלים יכול להסיר/להחליף לוגו ארגוני.', 'error');
            return;
        }
        setIsDeleteModalOpen(true);
    };

    const confirmRemoveLogo = async () => {
        if (!orgSlug) return;
        setIsDeleteModalOpen(false);

        try {
            updateOrganization({ logo: '' });
            const res = await saveWorkspaceLogo({ orgSlug, logoRef: null });
            if (!res.ok) {
                throw new Error('error' in res ? res.error : 'שגיאה בהסרת הלוגו');
            }
            if (logoInputRef.current) logoInputRef.current.value = '';
            addToast('הלוגו הוסר ונשמר', 'info');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'שגיאה בהסרת הלוגו';
            addToast(msg, 'error');
        }
    };

    const [isNameChangeModalOpen, setIsNameChangeModalOpen] = useState(false);
    const [requestedName, setRequestedName] = useState('');
    const [isSubmittingNameChange, setIsSubmittingNameChange] = useState(false);
    const [nameChangeSuccess, setNameChangeSuccess] = useState(false);

    const handleOrgNameChange = () => {
        setRequestedName('');
        setNameChangeSuccess(false);
        setIsNameChangeModalOpen(true);
    };

    const submitNameChangeRequest = async () => {
        const trimmed = requestedName.trim();
        if (!trimmed || trimmed === organization.name) {
            addToast('יש להזין שם חדש שונה מהשם הנוכחי', 'error');
            return;
        }
        setIsSubmittingNameChange(true);
        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'Account',
                    subject: `בקשה לשינוי שם ארגון: "${organization.name}" → "${trimmed}"`,
                    message: `בקשה לשינוי שם הארגון מ-"${organization.name}" ל-"${trimmed}".\n\nארגון: ${organization.name}\nSlug: ${orgSlug || 'N/A'}\nשם מבוקש: ${trimmed}`,
                    priority: 'medium',
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData as Record<string, string>)?.error || 'שגיאה בשליחת הבקשה');
            }
            setNameChangeSuccess(true);
            addToast('בקשת שינוי שם נשלחה בהצלחה! נחזור אליך בהקדם.', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'שגיאה בשליחת הבקשה';
            addToast(msg, 'error');
        } finally {
            setIsSubmittingNameChange(false);
        }
    };

    const triggerUpload = () => {
        if (isUploading) return;
        if (!canManageBranding) {
            addToast('רק הבעלים יכול לעדכן לוגו ארגוני.', 'error');
            return;
        }
        logoInputRef.current?.click();
    };

    return (
        <motion.div key="organization" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmRemoveLogo}
                title="הסרת לוגו"
                description="הלוגו יוסר מפרופיל הארגון ומסרגל הניווט."
                itemName={organization.name}
                isHardDelete={false}
            />

            {/* Name Change Request Modal */}
            <AnimatePresence>
                {isNameChangeModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isSubmittingNameChange && setIsNameChangeModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {nameChangeSuccess ? (
                                <div className="text-center py-6">
                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle size={32} className="text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 mb-2">הבקשה נשלחה בהצלחה!</h3>
                                    <p className="text-sm text-gray-500 mb-6">הצוות שלנו יבדוק את הבקשה ויעדכן אותך בהקדם.</p>
                                    <button
                                        onClick={() => setIsNameChangeModalOpen(false)}
                                        className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm"
                                    >
                                        סגור
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-lg font-black text-gray-900">בקשה לשינוי שם ארגון</h3>
                                        <button onClick={() => setIsNameChangeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">שם נוכחי</label>
                                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">{organization.name}</div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">שם חדש מבוקש</label>
                                            <input
                                                type="text"
                                                value={requestedName}
                                                onChange={e => setRequestedName(e.target.value)}
                                                placeholder="הזן את השם החדש..."
                                                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-black transition-colors font-medium text-sm"
                                                autoFocus
                                                dir="auto"
                                            />
                                        </div>

                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            הבקשה תישלח לצוות MISRAD AI לבדיקה ואישור. לאחר אישור השם יעודכן אוטומטית.
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setIsNameChangeModalOpen(false)}
                                            disabled={isSubmittingNameChange}
                                            className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm"
                                        >
                                            ביטול
                                        </button>
                                        <button
                                            onClick={submitNameChangeRequest}
                                            disabled={isSubmittingNameChange || !requestedName.trim() || requestedName.trim() === organization.name}
                                            className="bg-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmittingNameChange ? (
                                                <><Loader2 size={14} className="animate-spin" /> שולח...</>
                                            ) : (
                                                <><Send size={14} className="rotate-180" /> שלח בקשה</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">פרופיל ארגון</h2>
                    <p className="text-sm text-gray-500">התאמת המערכת לזהות העסקית שלכם.</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-2xl">
                <div className="space-y-8">
                    
                    {/* Logo Section */}
                    <div className="flex flex-col items-center gap-5">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner relative">
                                {organization.logo ? (
                                    <img src={organization.logo} alt="Organization Logo" className="w-full h-full object-contain p-4" suppressHydrationWarning />
                                ) : (
                                    <div className="text-gray-500 flex flex-col items-center gap-2">
                                        <Image size={32} />
                                        <span className="text-[10px] font-bold">אין לוגו</span>
                                    </div>
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 rounded-3xl">
                                        <Loader2 size={24} className="animate-spin text-black" />
                                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-black rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-600">מעלה...</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Hidden Input */}
                            <input 
                                type="file" 
                                ref={logoInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                                disabled={!canManageBranding || isLoadingAccess}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                type="button"
                                onClick={triggerUpload}
                                disabled={!canManageBranding || isLoadingAccess || isUploading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${!canManageBranding || isLoadingAccess || isUploading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                            >
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {isUploading ? 'מעלה...' : organization.logo ? 'החלף לוגו' : 'העלאת לוגו'}
                            </button>
                            
                            {organization.logo && (
                                <button 
                                    type="button"
                                    onClick={handleRemoveLogoClick}
                                    disabled={!canManageBranding || isLoadingAccess || isUploading}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${!canManageBranding || isLoadingAccess || isUploading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-100 cursor-pointer'}`}
                                >
                                    <Trash2 size={14} />
                                    הסר
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500">מומלץ להעלות קובץ PNG או SVG שקוף</p>
                    </div>

                    <div className="h-px bg-gray-100 w-full"></div>

                    <div>
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-gray-900">מצב סולו (פרילנסר)</div>
                                <div className="text-xs text-gray-500 mt-1">מסתיר ניהול צוות (צוות/מחלקות/תפקידים) כדי למקד את נקסוס. לא משפיע על הנתונים.</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!orgSlug) {
                                        addToast('לא נמצא מזהה ארגון', 'error');
                                        return;
                                    }
                                    const next = !isSoloMode;
                                    setSoloMode(next);
                                    addToast(next ? 'מצב סולו הופעל' : 'מצב סולו בוטל', 'success');
                                }}
                                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${isSoloMode ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                aria-pressed={isSoloMode}
                            >
                                {isSoloMode ? 'פעיל' : 'כבוי'}
                            </button>
                        </div>
                    </div>

                    {/* Company Name */}
                    <div>
                        <label htmlFor="org-name-input" className="block text-sm font-bold text-gray-700 mb-2">שם העסק / חברה</label>
                        <div className="relative group">
                            <Building2 size={18} className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
                            <input 
                                id="org-name-input"
                                type="text" 
                                value={organization.name}
                                readOnly
                                aria-label="שם העסק או החברה"
                                suppressHydrationWarning
                                className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold text-gray-600 outline-none cursor-not-allowed"
                            />
                            <div className="absolute top-1/2 left-2 -translate-y-1/2">
                                <button 
                                    type="button"
                                    onClick={handleOrgNameChange}
                                    className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-1 transition-colors min-h-[44px] min-w-[44px]"
                                    aria-label="פנה לשינוי שם הארגון"
                                >
                                    <Lock size={10} /> פנה לשינוי
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Preview Badge */}
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 text-center">
                        <p className="text-xs text-blue-600 mb-3 font-bold uppercase tracking-wide">תצוגה מקדימה בסרגל הניווט</p>
                        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm p-3 pr-4 pl-6 rounded-2xl border border-blue-100 shadow-sm">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
                                {organization.logo ? (
                                    <img src={organization.logo} className="w-full h-full object-contain p-1" suppressHydrationWarning />
                                ) : (
                                    <div className="w-3 h-3 bg-black rounded-full" />
                                )}
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm text-gray-900 leading-none mb-1" suppressHydrationWarning>{organization.name}</div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Nexus</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
