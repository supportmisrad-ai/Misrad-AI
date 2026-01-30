
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, CheckCircle2, User, CreditCard, LifeBuoy, FileText, Clock, MessageCircle, Compass } from 'lucide-react';
import { useData } from '../context/DataContext';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { getContentByKey } from '@/app/actions/site-content';
import { Skeleton } from '@/components/ui/skeletons';

export const SupportModal: React.FC = () => {
    const { isSupportModalOpen, closeSupport, currentUser, addNotification, supportDraft, setSupportDraft, startTutorial } = useData();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [ticketId, setTicketId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string>('');

    const unwrap = (data: any) =>
        (data as any)?.data && typeof (data as any).data === 'object' ? (data as any).data : data;

    const setCategory = (category: any) => setSupportDraft((prev: any) => ({ ...prev, category }));
    const setSubject = (subject: string) => setSupportDraft((prev: any) => ({ ...prev, subject }));
    const setMessage = (message: string) => setSupportDraft((prev: any) => ({ ...prev, message }));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await getContentByKey('landing', 'support', 'support_whatsapp_group_url');
                const next = typeof res.data === 'string' ? res.data : '';
                if (!cancelled) setWhatsappGroupUrl(next);
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;

            const response = await fetch('/api/support', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify({
                    category: supportDraft.category,
                    subject: supportDraft.subject,
                    message: supportDraft.message,
                    priority: 'medium'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errPayload = unwrap(errorData);
                throw new Error((errorData as any)?.error || (errPayload as any)?.error || 'שגיאה ביצירת קריאת תמיכה');
            }

            const data = await response.json().catch(() => ({}));
            const payload = unwrap(data);
            setTicketId(String((payload as any)?.ticket?.ticket_number || ''));

            // Notify admins
        addNotification({
                recipientId: 'all',
            type: 'system',
                text: `פניית תמיכה חדשה (${String((payload as any)?.ticket?.ticket_number || '')}) מאת ${currentUser.name}: ${supportDraft.subject}`,
            actorName: 'System Support',
        });

        setStep('success');
        // Clear draft on successful submission
        setSupportDraft({ category: 'Tech', subject: '', message: '' });
        } catch (err: any) {
            console.error('[SupportModal] Error creating ticket:', err);
            setError(err.message || 'שגיאה ביצירת קריאת תמיכה. אנא נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        closeSupport();
        if (step === 'success') {
            // Reset UI step for next opening, draft is already cleared
            setTimeout(() => setStep('form'), 300);
        }
    };

    const handleStartTour = () => {
        handleClose();
        setTimeout(() => startTutorial(), 300);
    }

    if (!isSupportModalOpen) return null;

    const hasWhatsAppGroup = Boolean(whatsappGroupUrl && whatsappGroupUrl.trim());

    const CATEGORIES = [
        { id: 'Tech', label: 'תמיכה טכנית', icon: LifeBuoy, sla: 'עד שעתיים' },
        { id: 'Account', label: 'חשבון ופרטים', icon: User, sla: 'עד 4 שעות' },
        { id: 'Billing', label: 'חיוב ומנויים', icon: CreditCard, sla: 'עד יום עסקים' },
        { id: 'Feature', label: 'בקשת פיצ׳ר', icon: FileText, sla: 'עד 3 ימי עסקים' },
    ];

    const activeCategory = CATEGORIES.find(c => c.id === supportDraft.category);

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <AnimatePresence mode="wait">
                    {step === 'form' ? (
                        <motion.div 
                            key="form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar"
                        >
                            <div className="mb-6">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                                    <MessageSquare size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900">פתיחת קריאת שירות</h2>
                                <p className="text-gray-500 mt-1 text-sm">הצוות שלנו זמין ויחזור אליך בהקדם האפשרי.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">נושא הפנייה</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setCategory(cat.id as any)}
                                                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                                                    supportDraft.category === cat.id 
                                                    ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-100' 
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                            >
                                                <cat.icon size={16} /> {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* SLA Badge */}
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded w-fit">
                                        <Clock size={12} />
                                        זמן מענה משוער: {activeCategory?.sla}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">כותרת</label>
                                    <input 
                                        required
                                        value={supportDraft.subject || ''}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-gray-900"
                                        placeholder="במה נוכל לעזור?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">פירוט</label>
                                    <textarea 
                                        required
                                        value={supportDraft.message || ''}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all h-32 resize-none text-sm"
                                        placeholder="תאר את הבקשה או הבעיה..."
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-black text-white rounded-xl font-bold text-sm shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
                                            שולח...
                                        </>
                                    ) : (
                                        <>
                                    שלח פנייה <Send size={16} className="rotate-180" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Self Service & Urgent Links */}
                            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
                                <button 
                                    onClick={handleStartTour}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-700 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors border border-gray-200"
                                >
                                    <Compass size={16} /> לא מסתדר? צא לסיור מודרך
                                </button>
                                
                                <div className="text-center">
                                    <a 
                                        href={hasWhatsAppGroup ? whatsappGroupUrl : '#'} // Replace with real number
                                        target="_blank" 
                                        rel="noreferrer"
                                        className={`inline-flex items-center gap-2 text-green-600 text-xs font-bold hover:text-green-700 transition-colors ${
                                            hasWhatsAppGroup ? '' : 'opacity-50 pointer-events-none'
                                        }`}
                                    >
                                        <MessageCircle size={14} /> הצטרפות לקבוצת תמיכה ועדכונים בוואטסאפ
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]"
                        >
                            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 animate-[bounce_1s_infinite]">
                                <CheckCircle2 size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">תודה על הפידבק!</h2>
                            <p className="text-gray-500 mb-6 max-w-xs">
                                הצוות קיבל את הבקשה והוא מטפל בזה בהקדם האפשרי.<br />
                                מספר המעקב שלך הוא <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{ticketId}</span>.
                            </p>
                            {hasWhatsAppGroup ? (
                                <a
                                    href={whatsappGroupUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full max-w-xs mb-3 inline-flex items-center justify-center gap-2 bg-green-50 text-green-700 py-3 rounded-xl text-sm font-black hover:bg-green-100 transition-colors border border-green-100"
                                >
                                    <MessageCircle size={16} /> הצטרפות לקבוצת תמיכה ועדכונים בוואטסאפ
                                </a>
                            ) : null}
                            <button 
                                onClick={handleClose}
                                className="px-8 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                סגור
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
