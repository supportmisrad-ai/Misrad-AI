
import React, { useState } from 'react';
import { ContentItem, ContentStage } from '../types';
import { 
    Clapperboard, Plus, Video, Image, Sparkles, 
    MoreHorizontal, Calendar, User, Eye, CircleCheckBig, 
    Youtube, Instagram, Linkedin, GripVertical, Scissors, UploadCloud, Film, Wand2
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ContentStudioViewProps {
    content?: ContentItem[];
    onUpdateContent?: (item: ContentItem) => void;
    onAddContent?: (item: ContentItem) => void;
}

// Strategy-aligned stages: Boss does ideas/filming, Team does scripting/editing
const CONTENT_STAGES: { id: ContentStage; label: string; color: string; owner: string }[] = [
    { id: 'idea', label: 'בנק רעיונות', color: 'bg-slate-400', owner: 'סיעור מוחות' },
    { id: 'scripting', label: 'כתיבת תסריט', color: 'bg-indigo-400', owner: 'קופירייטינג' },
    { id: 'filming', label: 'ממתין לצילום', color: 'bg-red-500', owner: 'מנכ״ל' },
    { id: 'editing', label: 'בחדר עריכה', color: 'bg-purple-500', owner: 'עורכים' },
    { id: 'ready', label: 'מוכן לפרסום', color: 'bg-emerald-500', owner: 'מנהל סושיאל' },
    { id: 'published', label: 'פורסם (באוויר)', color: 'bg-blue-500', owner: 'ציבורי' }
];

const ContentStudioView: React.FC<ContentStudioViewProps> = ({ content = [], onUpdateContent, onAddContent }) => {
    const { addToast } = useToast();
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItem(id);
    };

    const handleDrop = (e: React.DragEvent, stageId: ContentStage) => {
        e.preventDefault();
        if (draggedItem && onUpdateContent) {
            const item = content.find(c => c.id === draggedItem);
            if (item) {
                onUpdateContent({ ...item, status: stageId });
            }
            setDraggedItem(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleNewIdea = () => {
        addToast('הוספת רעיון אינה זמינה כרגע', 'info');
    };

    const getPlatformIcon = (platform: string) => {
        switch(platform) {
            case 'youtube': return <Youtube size={14} className="text-[#FF0000]" />;
            case 'instagram': return <Instagram size={14} className="text-[#E1306C]" />;
            case 'linkedin': return <Linkedin size={14} className="text-[#0A66C2]" />;
            case 'tiktok': return <span className="font-black text-[10px]">טיקטוק</span>;
            default: return <Video size={14} />;
        }
    };

    const generateIdea = () => {
        addToast('יצירת רעיון אינה זמינה כרגע', 'info');
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Clapperboard className="text-red-600" strokeWidth={2.5} />
                        תוכן
                    </h2>
                </div>
                <div className="flex gap-3">
                     <button 
                        onClick={generateIdea}
                        className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2 shadow-sm"
                     >
                        <Sparkles size={16} className="text-indigo-600" />
                        תבריק לי רעיון
                     </button>
                     <button 
                        onClick={handleNewIdea}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
                     >
                        <Plus size={18} />
                        הוסף רעיון
                     </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-[1800px] md:min-w-max">
                    {CONTENT_STAGES.map(stage => {
                        const stageItems = content.filter(c => c.status === stage.id);
                        
                        return (
                            <div 
                                key={stage.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                                className="flex-1 min-w-[300px] flex flex-col rounded-3xl border h-full transition-colors bg-slate-50/50 border-slate-200/60"
                            >
                                {/* Column Header */}
                                <div className="p-4 rounded-t-3xl flex justify-between items-center sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm border-b border-slate-200/50">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></div>
                                            <h3 className="font-bold text-slate-800 text-sm">{stage.label}</h3>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 ml-4.5 tracking-wide">{stage.owner}</span>
                                    </div>
                                    <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">{stageItems.length}</span>
                                </div>

                                {/* Items Area */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {stageItems.map(item => (
                                        <div 
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item.id)}
                                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative transition-all hover:-translate-y-1"
                                        >
                                            {/* Format Badge & Actions */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${
                                                    item.format === 'pillar' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}>
                                                    {item.format === 'pillar' ? <Film size={10} /> : <Scissors size={10} />}
                                                    {item.format === 'pillar' ? 'תוכן ליבה' : 'סרטון קצר'}
                                                </div>
                                                <div className="text-slate-300 hover:text-slate-500 cursor-pointer">
                                                    <GripVertical size={14} />
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-slate-800 text-sm mb-3 leading-snug line-clamp-2">{item.title}</h4>

                                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
                                                        {getPlatformIcon(item.platform)}
                                                    </div>
                                                    {item.assignee && (
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border shadow-sm text-white ${
                                                            item.assignee === 'Boss' ? 'bg-slate-800 border-slate-900' : 'bg-indigo-500 border-indigo-600'
                                                        }`} title={`משימה עבור: ${item.assignee}`}>
                                                            {item.assignee.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Stage Specific Badges */}
                                                {item.status === 'published' && item.views && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                                        <Eye size={12} />
                                                        {item.views.toLocaleString()}
                                                    </div>
                                                )}
                                                
                                                {item.status === 'filming' && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg animate-pulse border border-red-100">
                                                        <Video size={10} /> מקליט
                                                    </div>
                                                )}

                                                {item.status === 'editing' && (
                                                    <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                                                        <Scissors size={10} /> בעריכה
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stageItems.length === 0 && (
                                        <div className="h-24 flex items-center justify-center opacity-30">
                                            <div className="w-12 h-1 bg-slate-200/50 rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ContentStudioView;
