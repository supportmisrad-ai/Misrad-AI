
import React, { useEffect, useMemo, useState } from 'react';
import { Email } from '../types';
import { Mail, Search, Star, Trash2, Send, RefreshCw, Paperclip, ChevronRight, UserCircle, Bot, Sparkles, Archive, Reply } from 'lucide-react';
import { GlowButton } from './ui/GlowButton';
import { getClientIdByClerkEmail, getInbox, markAsRead, sendMessage } from '@/app/actions/client-portal-clinic';
import { useNexus } from '../context/ClientContext';

export const EmailCenter: React.FC = () => {
    const { clients } = useNexus();
    const [emails, setEmails] = useState<Email[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [isSendingCompose, setIsSendingCompose] = useState(false);

    const orgId = useMemo(() => {
        const userData = (typeof window !== 'undefined'
            ? ((window as any).__CLIENT_OS_USER__ as { organizationId?: string | null; identity?: { role?: string | null; id?: string | null } | null } | undefined)
            : undefined);
        return userData?.organizationId ?? null;
    }, []);

    const isClientView = useMemo(() => {
        const userData = (typeof window !== 'undefined'
            ? ((window as any).__CLIENT_OS_USER__ as { identity?: { role?: string | null; id?: string | null } | null } | undefined)
            : undefined);

        const role = userData?.identity?.role ?? null;
        return role === 'client';
    }, []);

    useEffect(() => {
        const load = async () => {
            if (!orgId) return;
            try {
                const inbox = await getInbox({ orgId, scope: isClientView ? 'client_by_clerk_email' : 'org' });
                setEmails(inbox);
            } catch (e) {
                console.error(e);
                const msg = (e as any)?.message;
                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: msg || 'שגיאה בטעינת ההודעות.', type: 'error' } }));
            }
        };

        void load();
    }, [orgId, isClientView]);

    const refreshInbox = async () => {
        if (!orgId) return;
        const inbox = await getInbox({ orgId, scope: isClientView ? 'client_by_clerk_email' : 'org' });
        setEmails(inbox);
    };

    const filteredEmails = emails.filter(email => 
        email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.body.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectEmail = (email: Email) => {
        // Mark as read
        if (!email.isRead && orgId) {
            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e));
            void markAsRead({ orgId, messageId: email.id, read: true }).catch((e) => console.error(e));
        }
        setSelectedEmail(email);
        setReplyText(''); // Clear previous draft
    };

    const handleGenerateReply = async () => {
        if (!selectedEmail) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/client-os/email/smart-reply', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    emailBody: selectedEmail.body,
                    senderName: selectedEmail.sender.split(' ')[0],
                    tone: 'professional',
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({} as any));
                throw new Error(err?.error || 'Failed to generate reply');
            }

            const json = (await res.json()) as { draft?: string };
            setReplyText(json.draft || '');
        } catch (e) {
            console.error(e);
            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'שגיאה ביצירת תשובה חכמה.', type: 'error' } }));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSend = () => {
        if (!selectedEmail) return;
        if (!orgId) {
            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסר organizationId. התחבר מחדש.', type: 'error' } }));
            return;
        }

        const body = replyText.trim();
        if (!body) {
            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'כתוב הודעה לפני שליחה.', type: 'error' } }));
            return;
        }

        void (async () => {
            try {
                const mapping = isClientView ? await getClientIdByClerkEmail({ orgId }) : null;

                const senderId = isClientView ? mapping!.clientId : 'agency';
                const recipientId = isClientView ? 'agency' : selectedEmail.clientId;
                if (!recipientId) {
                    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'לא ניתן לשלוח הודעה: לא זוהה לקוח לשיחה.', type: 'error' } }));
                    return;
                }

                await sendMessage({
                    orgId,
                    senderId,
                    recipientId,
                    subject: `Re: ${selectedEmail.subject}`,
                    body,
                });

                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הודעה נשלחה ונשמרה בהצלחה.', type: 'success' } }));
                setReplyText('');

                await refreshInbox();
            } catch (e: any) {
                console.error(e);
                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: e?.message || 'שגיאה בשליחת הודעה.', type: 'error' } }));
            }
        })();
    };

    const handleOpenCompose = () => {
        setComposeSubject('');
        setComposeBody('');
        setIsComposeOpen(true);
    };

    const handleSendCompose = () => {
        if (!orgId) {
            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסר organizationId. התחבר מחדש.', type: 'error' } }));
            return;
        }

        const subject = composeSubject.trim();
        const body = composeBody.trim();

        if (!subject) {
            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'נושא הוא שדה חובה.', type: 'error' } }));
            return;
        }
        if (!body) {
            window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'תוכן ההודעה הוא שדה חובה.', type: 'error' } }));
            return;
        }

        void (async () => {
            setIsSendingCompose(true);
            try {
                const mapping = await getClientIdByClerkEmail({ orgId });
                await sendMessage({
                    orgId,
                    senderId: mapping.clientId,
                    recipientId: 'agency',
                    subject,
                    body,
                });

                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הודעה נשלחה בהצלחה.', type: 'success' } }));
                setIsComposeOpen(false);
                setComposeSubject('');
                setComposeBody('');
                await refreshInbox();
            } catch (e: any) {
                console.error(e);
                window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: e?.message || 'שגיאה בשליחת הודעה.', type: 'error' } }));
            } finally {
                setIsSendingCompose(false);
            }
        })();
    };

    const getClientName = (clientId?: string) => {
        if (!clientId) return null;
        return clients.find(c => c.id === clientId)?.name ?? null;
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in pb-20 pt-safe">
            {isComposeOpen && (
                <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="font-bold text-gray-900">הודעה חדשה</div>
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                aria-label="סגור"
                                type="button"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <div className="text-xs font-bold text-gray-500 uppercase mb-2">נושא</div>
                                <input
                                    value={composeSubject}
                                    onChange={(e) => setComposeSubject(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-nexus-primary transition-all"
                                    placeholder="למשל: יש לי בריף חדש"
                                />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-500 uppercase mb-2">הודעה</div>
                                <textarea
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none focus:border-nexus-primary transition-all min-h-[160px] resize-y"
                                    placeholder="כתוב כאן..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsComposeOpen(false)}
                                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
                                type="button"
                                disabled={isSendingCompose}
                            >
                                ביטול
                            </button>
                            <GlowButton
                                onClick={handleSendCompose}
                                className="px-6 py-2 text-sm h-auto"
                                disabled={isSendingCompose}
                            >
                                <Send size={14} className="mr-2" />
                                {isSendingCompose ? 'שולח...' : 'שלח'}
                            </GlowButton>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Sidebar List */}
            <div className={`
                w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden
                ${selectedEmail ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-gray-100 space-y-4">
                    <h2 className="text-2xl font-display font-bold text-nexus-primary flex items-center gap-2">
                        <Mail className="text-nexus-accent" /> דואר נכנס
                    </h2>
                    {isClientView ? (
                        <GlowButton onClick={handleOpenCompose} className="w-full h-auto py-3 text-sm">
                            <Send size={16} className="mr-2" /> הודעה חדשה
                        </GlowButton>
                    ) : null}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="חיפוש במיילים..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:border-nexus-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {filteredEmails.map(email => (
                        <div 
                            key={email.id}
                            onClick={() => handleSelectEmail(email)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border group relative
                                ${selectedEmail?.id === email.id 
                                    ? 'bg-nexus-primary/5 border-nexus-primary/30' 
                                    : email.isRead ? 'bg-white border-transparent hover:bg-gray-50' : 'bg-white border-l-4 border-l-nexus-accent border-y-gray-100 border-r-gray-100 shadow-sm'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-sm ${email.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                                    {email.sender}
                                </span>
                                <span className="text-[10px] text-gray-400">{email.timestamp}</span>
                            </div>
                            <h4 className={`text-xs mb-1 truncate ${email.isRead ? 'text-gray-600' : 'font-bold text-black'}`}>
                                {email.subject}
                            </h4>
                            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                {email.snippet}
                            </p>
                            
                            {/* Tags & Client Link */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {email.clientId && (
                                    <span className="text-[10px] flex items-center gap-1 bg-nexus-primary/10 text-nexus-primary px-1.5 py-0.5 rounded font-bold">
                                        <UserCircle size={10} /> {getClientName(email.clientId)}
                                    </span>
                                )}
                                {email.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reading Pane */}
            <div className={`
                flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative
                ${!selectedEmail ? 'hidden md:flex' : 'flex'}
            `}>
                {!selectedEmail ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Mail size={32} className="opacity-20" />
                        </div>
                        <p>בחר הודעה כדי לקרוא</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Back Header */}
                        <div className="md:hidden p-4 border-b border-gray-100 flex items-center gap-2">
                            <button onClick={() => setSelectedEmail(null)} className="p-2 -mr-2 text-gray-500">
                                <ChevronRight size={20} />
                            </button>
                            <span className="font-bold">חזרה לדואר נכנס</span>
                        </div>

                        {/* Email Header */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">{selectedEmail.subject}</h1>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" title="ארכיון"><Archive size={18}/></button>
                                    <button className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="מחק"><Trash2 size={18}/></button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <img 
                                    src={selectedEmail.avatarUrl || `https://ui-avatars.com/api/?name=${selectedEmail.sender}`} 
                                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                                    alt={selectedEmail.sender}
                                />
                                <div>
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                        {selectedEmail.sender}
                                        <span className="text-xs font-normal text-gray-500">&lt;{selectedEmail.senderEmail}&gt;</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {selectedEmail.clientId && (
                                            <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-gray-600 font-medium shadow-sm">
                                                <UserCircle size={12} className="text-nexus-accent" /> 
                                                לקוח: {getClientName(selectedEmail.clientId)}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-400">{selectedEmail.timestamp}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Email Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 text-gray-800 leading-relaxed whitespace-pre-wrap font-sans text-sm md:text-base">
                            {selectedEmail.body}
                        </div>

                        {/* Reply Area */}
                        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50">
                            {replyText ? (
                                <div className="bg-white border border-nexus-primary/20 rounded-xl shadow-lg overflow-hidden animate-slide-up">
                                    <div className="bg-nexus-primary/5 p-2 px-4 border-b border-nexus-primary/10 flex justify-between items-center">
                                        <span className="text-xs font-bold text-nexus-primary flex items-center gap-1">
                                            <Sparkles size={12} /> טיוטה שנוצרה ע"י AI
                                        </span>
                                        <button onClick={() => setReplyText('')} className="text-gray-400 hover:text-gray-600"><Trash2 size={14}/></button>
                                    </div>
                                    <textarea 
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="w-full p-4 min-h-[150px] outline-none text-sm text-gray-700 resize-y"
                                        autoFocus
                                    />
                                    <div className="p-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-gray-200 rounded text-gray-500"><Paperclip size={18}/></button>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={handleGenerateReply}
                                                className="text-xs font-bold text-nexus-accent hover:underline flex items-center gap-1"
                                                disabled={isGenerating}
                                            >
                                                <RefreshCw size={12} className={isGenerating ? 'animate-spin' : ''} /> נסח מחדש
                                            </button>
                                            <GlowButton onClick={handleSend} className="px-6 py-2 text-sm h-auto">
                                                <Send size={14} className="mr-2" /> שלח
                                            </GlowButton>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4 items-center">
                                    <button 
                                        onClick={handleGenerateReply}
                                        disabled={isGenerating}
                                        className="flex-1 py-4 bg-white border border-nexus-accent/30 rounded-xl text-nexus-primary font-bold text-sm hover:bg-nexus-accent/5 hover:border-nexus-accent transition-all flex items-center justify-center gap-2 shadow-sm group"
                                    >
                                        {isGenerating ? (
                                            <RefreshCw size={18} className="animate-spin text-nexus-accent" />
                                        ) : (
                                            <Sparkles size={18} className="text-nexus-accent group-hover:scale-110 transition-transform" />
                                        )}
                                        {isGenerating ? 'חושב...' : 'צור תשובה חכמה'}
                                    </button>
                                    <button 
                                        onClick={() => setReplyText(' ')}
                                        className="flex-1 py-4 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Reply size={18} /> השב ידנית
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
