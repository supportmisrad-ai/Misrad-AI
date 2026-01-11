import React, { useState, useEffect, useMemo, memo } from 'react';
import { Lead, PipelineStage, ProductType } from '../types';
import { STAGES } from '../constants';
import { Phone, MessageSquare, Clock, User, GripVertical, Crown, Users, BookOpen, Flame, Zap, ArrowRight, MoreHorizontal, AlertCircle } from 'lucide-react';

interface PipelineBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: PipelineStage) => void;
}

// Helper to get product badge - Minimalist & Hebrew
const ProductBadge = ({ type }: { type?: ProductType }) => {
    if (!type) return null;
    
    if (type === 'premium_1on1') {
        return (
            <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                <Crown size={8} fill="currentColor" />
                <span>פרימיום</span>
            </div>
        );
    }
    if (type === 'mastermind_group') {
        return (
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                <Users size={8} fill="currentColor" />
                <span>קבוצה</span>
            </div>
        );
    }
    return null;
};

// The "Paper" Card
const PipelineCard = memo(({ lead, onDragStart, onClick, now }: { 
    lead: Lead, 
    onDragStart: (e: React.DragEvent, id: string) => void, 
    onClick: (lead: Lead) => void,
    now: Date 
}) => {
    
    const getTimeStatus = (createdAt: Date) => {
        const diffMs = now.getTime() - new Date(createdAt).getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 24) return { text: 'טרי מהיום', color: 'text-emerald-600 bg-emerald-50' };
        if (diffDays < 3) return { text: `${diffDays} ימים`, color: 'text-slate-500 bg-slate-50' };
        return { text: `מתיישן (${diffDays})`, color: 'text-red-600 bg-red-50' };
    };

    const timeStatus = getTimeStatus(lead.createdAt);
    const isWon = lead.status === 'won';

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            onClick={() => onClick(lead)}
            className={`
                bg-white p-4 rounded-2xl mb-3 cursor-grab active:cursor-grabbing 
                transition-all duration-300 group relative overflow-hidden
                border border-transparent hover:border-primary-glow/30 hover:shadow-lg hover:-translate-y-1
                ${isWon ? 'shadow-none border-emerald-100 bg-emerald-50/30' : 'shadow-sm'}
            `}
        >
            {/* Status Bar Indicator */}
            <div className={`absolute top-0 right-0 bottom-0 w-1 ${
                lead.isHot ? 'bg-amber-500' : 
                isWon ? 'bg-emerald-500' : 
                'bg-slate-200 group-hover:bg-primary'
            } transition-colors`}></div>

            <div className="pr-3">
                {/* Header tags */}
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <ProductBadge type={lead.productInterest} />
                        {lead.isHot && !isWon && <Flame size={10} className="text-amber-500 fill-amber-500 animate-pulse" />}
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${timeStatus.color}`}>
                        {timeStatus.text}
                    </span>
                </div>

                {/* Name & Value */}
                <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1 group-hover:text-primary transition-colors">
                    {lead.name}
                </h4>
                <div className="text-xs text-slate-500 font-medium mb-3 truncate">
                    {lead.company || 'לקוח פרטי'}
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="font-mono font-bold text-slate-700 text-xs">
                        ₪{lead.value.toLocaleString()}
                    </span>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                        {lead.assignedAgentId && (
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 border border-slate-200">
                                AG
                            </div>
                        )}
                        <div className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-primary transition-colors">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const PipelineBoard: React.FC<PipelineBoardProps> = ({ leads, onLeadClick, onStatusChange }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('leadId', id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, stageId: PipelineStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (leadId) {
            onStatusChange(leadId, stageId);
        }
    };

    return (
        <div className="h-full overflow-x-auto overflow-y-hidden pb-4 scroll-smooth">
            <div className="flex gap-4 md:gap-6 h-full min-w-[300px] w-max px-2 md:px-0">
                {STAGES.map(stage => {
                    const stageLeads = leads.filter(l => l.status === stage.id);
                    const totalValue = stageLeads.reduce((sum, l) => sum + l.value, 0);

                    return (
                        <div 
                            key={stage.id} 
                            className="w-[280px] md:w-[320px] flex flex-col h-full rounded-3xl bg-slate-50/50 border border-slate-200/60" // Subtle container
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            {/* Column Header */}
                            <div className="p-4 flex flex-col gap-1 sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm rounded-t-3xl border-b border-slate-200/50">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${stage.accent}`}></div>
                                        {stage.label}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                                        {stageLeads.length}
                                    </span>
                                </div>
                                {totalValue > 0 && (
                                    <div className="text-[10px] font-mono font-bold text-slate-400 text-right">
                                        ₪{totalValue.toLocaleString()}
                                    </div>
                                )}
                            </div>

                            {/* Cards Area */}
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar relative">
                                {stageLeads.map(lead => (
                                    <PipelineCard 
                                        key={lead.id} 
                                        lead={lead} 
                                        onDragStart={handleDragStart} 
                                        onClick={onLeadClick} 
                                        now={now} 
                                    />
                                ))}
                                {stageLeads.length === 0 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                            <AlertCircle size={24} className="text-slate-300" />
                                        </div>
                                        <div className="text-sm font-bold text-slate-400">ריק פה...</div>
                                        <div className="text-xs text-slate-300">תביא לידים!</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PipelineBoard;