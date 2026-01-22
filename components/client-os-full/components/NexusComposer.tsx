import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, Copy, RefreshCw, Paperclip, ChevronDown, Check } from 'lucide-react';
import { generateEmailDraft } from '../services/geminiService';
import { GlowButton } from './ui/GlowButton';
import { useNexus } from '../context/ClientContext';
import { Skeleton } from '@/components/ui/skeletons';

interface NexusComposerProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedClientId?: string | null;
}

const NexusComposer: React.FC<NexusComposerProps> = ({ isOpen, onClose, preselectedClientId }) => {
    const { clients } = useNexus();
    const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || (clients.length > 0 ? clients[0].id : ''));
    const [intent, setIntent] = useState('עדכון סטטוס');
    const [tone, setTone] = useState('מקצועי');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<{ subject: string; body: string } | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const client = clients.find(c => c.id === selectedClientId) || (clients.length > 0 ? clients[0] : null);

    useEffect(() => {
        if (preselectedClientId) setSelectedClientId(preselectedClientId);
    }, [preselectedClientId]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const healthContext = `Health Score: ${client.healthScore}, Status: ${client.healthStatus}, Last Note: ${client.handoffData?.notes || 'None'}`;
            const result = await generateEmailDraft(client.name, client.mainContact, intent, tone, healthContext);
            setGeneratedContent(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (generatedContent) {
            navigator.clipboard.writeText(`${generatedContent.subject}\n\n${generatedContent.body}`);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-0 right-8 z-[60] w-[500px] h-[600px] bg-white rounded-t-2xl shadow-2xl shadow-black/20 border border-gray-200 animate-slide-up flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-nexus-primary p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-nexus-accent" />
                    <span className="font-display font-bold">המנסח האוטומטי</span>
                </div>
                <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors"><X size={18} /></button>
            </div>

            {/* Context Controls */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 w-20">למי שולחים?</span>
                    <select 
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-nexus-primary"
                    >
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mainContact})</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-gray-500 w-16">מה המטרה?</span>
                        <select 
                            value={intent}
                            onChange={(e) => setIntent(e.target.value)}
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-nexus-primary"
                        >
                            <option>עדכון סטטוס</option>
                            <option>התנצלות על עיכוב</option>
                            <option>הצעת הרחבה</option>
                            <option>תיאום פגישה</option>
                            <option>ברכת חג</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-gray-500">באיזה וייב?</span>
                        <select 
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-nexus-primary"
                        >
                            <option>מקצועי</option>
                            <option>חברי</option>
                            <option>אסרטיבי</option>
                            <option>אמפתי</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-white custom-scrollbar relative">
                {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                        <div className="w-full max-w-sm space-y-3">
                            <Skeleton className="h-6 w-4/6 rounded-xl" />
                            <Skeleton className="h-4 w-full rounded-xl" />
                            <Skeleton className="h-4 w-5/6 rounded-xl" />
                            <Skeleton className="h-4 w-4/6 rounded-xl" />
                        </div>
                        <p className="mt-4 text-sm font-bold text-gray-600">הרובוט כותב...</p>
                    </div>
                ) : generatedContent ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="border-b border-gray-100 pb-2">
                            <input 
                                className="w-full font-bold text-gray-900 placeholder-gray-400 outline-none" 
                                value={generatedContent.subject}
                                onChange={(e) => setGeneratedContent({...generatedContent, subject: e.target.value})}
                            />
                        </div>
                        <textarea 
                            className="w-full h-[300px] resize-none outline-none text-gray-700 leading-relaxed custom-scrollbar"
                            value={generatedContent.body}
                            onChange={(e) => setGeneratedContent({...generatedContent, body: e.target.value})}
                        />
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <Sparkles size={64} className="mb-4 opacity-20" />
                        <p className="text-center font-medium">תבחר מה אתה רוצה להגיד <br/> ואני אכתוב את זה יפה</p>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating}
                    className="flex items-center gap-2 text-nexus-primary hover:bg-white px-3 py-2 rounded-lg transition-colors text-sm font-bold border border-transparent hover:border-gray-200"
                >
                    <RefreshCw size={16} className={isGenerating ? 'opacity-60' : ''} /> 
                    {generatedContent ? 'נסה שוב' : 'תכתוב לי משהו'}
                </button>

                <div className="flex gap-3">
                    {generatedContent && (
                        <button 
                            onClick={handleCopy}
                            className="p-2 text-gray-500 hover:text-nexus-primary transition-colors relative"
                            title="העתק"
                        >
                            {isCopied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                        </button>
                    )}
                    <GlowButton className="px-6 py-2 text-sm" disabled={!generatedContent}>
                        <Send size={16} className="mr-2" /> שלח עכשיו
                    </GlowButton>
                </div>
            </div>
        </div>
    );
};

export default NexusComposer;