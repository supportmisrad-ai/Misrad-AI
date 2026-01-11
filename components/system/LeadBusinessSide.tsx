'use client';

import React, { useState } from 'react';
import { Briefcase, X, Activity as ActivityIcon, Clock, Gauge, AlertCircle, ExternalLink, Presentation, Layers, UserX, RotateCcw } from 'lucide-react';
import { Lead, Activity } from './types';
import { useCallAnalysis } from './contexts/CallAnalysisContext';
import { useToast } from './contexts/ToastContext';
import { StubComponent } from './stubs/StubComponent';

interface LeadBusinessSideProps {
    lead: Lead;
    onClose: () => void;
    onAddActivity: (leadId: string, activity: Activity) => void;
    onStatusChange?: (id: string, status: any) => void;
    onOpenClientPortal?: () => void;
}

// Stub components - will be replaced with real components later
const ProposalModal = (props: any) => <StubComponent name="ProposalModal" {...props} />;
const QBRGeneratorModal = (props: any) => <StubComponent name="QBRGeneratorModal" {...props} />;

const LeadBusinessSide: React.FC<LeadBusinessSideProps> = ({ lead, onClose, onAddActivity, onStatusChange, onOpenClientPortal }) => {
    const { history } = useCallAnalysis();
    const { addToast } = useToast();
    const [showProposalModal, setShowProposalModal] = useState(false);
    const [showQBRModal, setShowQBRModal] = useState(false);

    const linkedAnalyses = history.filter(item => item.leadId === lead.id);

    const handleChurn = () => {
        const reason = window.prompt('ציין סיבת ביטול/נטישה:');
        if (reason !== null) {
            const churnActivity: Activity = {
                id: Date.now().toString(),
                type: 'system',
                content: `🚨 הלקוח ביטל התקשרות. סיבה: ${reason || 'לא צוינה'}`,
                timestamp: new Date()
            };
            onAddActivity(lead.id, churnActivity);
            if (onStatusChange) onStatusChange(lead.id, 'churned');
            addToast('הלקוח הועבר לסטטוס נטישה. הנושא דווח למערכת.', 'warning');
        }
    };

    const handleManualRefund = () => {
        const amount = window.prompt('הכנס סכום להחזר (₪):');
        if (amount && !isNaN(Number(amount))) {
            const refundActivity: Activity = {
                id: Date.now().toString(),
                type: 'financial',
                content: `💰 בוצע החזר כספי ידני על סך ₪${Number(amount).toLocaleString()}`,
                timestamp: new Date(),
                metadata: { amount: Number(amount) }
            };
            onAddActivity(lead.id, refundActivity);
            addToast('ההחזר תועד בהצלחה', 'success');
        }
    };

    const hourlyRate = 200;
    const loggedHours = lead.loggedHours || 0;
    const budgetHours = lead.budgetHours || 1;
    const burnRate = Math.min((loggedHours / budgetHours) * 100, 100);
    const realProfit = lead.value - (loggedHours * hourlyRate);
    const isBleeding = realProfit < (lead.value * 0.2);

    return (
        <>
            <div className="flex w-full bg-slate-50 border-r border-slate-200 flex-col overflow-y-auto custom-scrollbar shrink-0 h-full">
                <div className="hidden lg:flex p-6 justify-between items-center border-b border-slate-200/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={18} className="text-slate-400" /> תכל'ס עסקים</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Management Actions */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ניהול משברים וביטולים</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleChurn} className="flex items-center justify-center gap-2 py-2 px-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"><UserX size={14} /> ביטול עסקה</button>
                            <button onClick={handleManualRefund} className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200"><RotateCcw size={14} /> החזר כספי</button>
                        </div>
                    </div>

                    {/* Profitability Lens */}
                    <div className="bg-slate-900 rounded-xl p-4 shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2"><Gauge size={16} className="text-emerald-400" /><span className="text-xs font-bold uppercase tracking-wider">מדד רווח</span></div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-end"><span className="text-xs text-slate-400">רווח נקי משוער</span><span className={`font-mono font-bold ${isBleeding ? 'text-red-400' : 'text-emerald-400'}`}>₪{realProfit.toLocaleString()}</span></div>
                            <div className="relative pt-2">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1"><span>שעות שנשרפו</span><span>{loggedHours} / {budgetHours}</span></div>
                                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${burnRate > 90 ? 'bg-red-500' : burnRate > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${burnRate}%` }}></div></div>
                                {isBleeding && <div className="mt-2 text-[10px] text-red-300 flex items-center gap-1 animate-pulse"><AlertCircle size={10} /> חריגה מהתקציב!</div>}
                            </div>
                        </div>
                    </div>

                    {/* Strategic Tools */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">פעולות צמיחה</label>
                        <div className="space-y-3">
                            <button onClick={onOpenClientPortal} className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"><ExternalLink size={16} /> כניסה לפורטל לקוח</button>
                            <button onClick={() => setShowQBRModal(true)} className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-rose-600/20 hover:-translate-y-0.5"><Presentation size={16} /> צור מצגת סיכום</button>
                        </div>
                    </div>

                    {/* Linked Call Analysis */}
                    {linkedAnalyses.length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5"><ActivityIcon size={12} /> מודיעין שיחות (AI)</label>
                            <div className="space-y-3">
                                {linkedAnalyses.map(analysis => (
                                    <div key={analysis.id} className="bg-white border border-indigo-100 p-3 rounded-xl shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-sm text-slate-800 truncate max-w-[150px]">{analysis.title || 'ניתוח שיחה'}</div>
                                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${analysis.score > 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{analysis.score}</div>
                                        </div>
                                        <div className="text-xs text-slate-500 line-clamp-2 leading-tight mb-2">{analysis.summary}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {new Date(analysis.date || '').toLocaleDateString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showProposalModal && <ProposalModal lead={lead} onClose={() => setShowProposalModal(false)} onSend={(p: any) => addToast('הצעה נשלחה', 'success')} />}
            {showQBRModal && <QBRGeneratorModal lead={lead} onClose={() => setShowQBRModal(false)} />}
        </>
    );
};

export default LeadBusinessSide;
