
import React, { useState } from 'react';
import { 
    Activity, Headphones, Star, Play, 
    Award, Plus
} from 'lucide-react';
import { useToast } from './system/contexts/ToastContext';
import CallAnalyzerView from './CallAnalyzerView';

type LeadLite = {
    id: string;
    name: string;
};

const GOLDEN_CALLS: { id: number; agent: string; title: string; duration: string; rating: number }[] = [];

interface TrainingViewProps {
    leads?: LeadLite[];
}

const TrainingView: React.FC<TrainingViewProps> = ({ leads = [] }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'analyzer' | 'library'>('analyzer');

    const handleUpload = () => {
        addToast('העלאת שיחה אינה זמינה כרגע', 'info');
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Activity className="text-primary" strokeWidth={2.5} />
                        ניתוח שיחות
                    </h2>
                </div>
                
                <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200/50 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('analyzer')}
                        className={`px-5 py-2.5 rounded-lg text-base font-bold transition-all flex items-center gap-2 ${activeTab === 'analyzer' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Activity size={18} /> ניתוח שיחות (AI)
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`px-5 py-2.5 rounded-lg text-base font-bold transition-all flex items-center gap-2 ${activeTab === 'library' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Headphones size={18} /> ספריית הקלטות
                    </button>
                </div>
            </div>

            {/* TAB: CALL ANALYZER */}
            {activeTab === 'analyzer' && (
                <div className="flex-1 overflow-hidden">
                    <CallAnalyzerView leads={leads} />
                </div>
            )}

            {/* TAB: LIBRARY */}
            {activeTab === 'library' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                    {GOLDEN_CALLS.length === 0 ? (
                        <div className="md:col-span-2 lg:col-span-3 bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400">
                            <p className="text-sm font-bold">אין הקלטות להצגה</p>
                        </div>
                    ) : GOLDEN_CALLS.map(call => (
                        <div key={call.id} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-rose-300 hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-xs font-bold border border-amber-200">
                                        <Star size={12} fill="currentColor" /> {call.rating}
                                    </div>
                                    <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                                        <Play size={16} fill="currentColor" />
                                    </div>
                                </div>
                                
                                <h3 className="font-bold text-slate-800 text-lg mb-2 leading-tight">{call.title}</h3>
                                
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center font-bold text-[10px]">
                                            {call.agent.charAt(0)}
                                        </div>
                                        <span className="font-medium">{call.agent}</span>
                                    </div>
                                    <span className="font-mono bg-slate-50 px-2 py-0.5 rounded text-slate-400">{call.duration}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Add New Placeholder */}
                    <button 
                        onClick={handleUpload}
                        className="border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-primary hover:border-rose-300 hover:bg-rose-50/30 transition-all cursor-pointer min-h-[200px] group"
                    >
                        <div className="bg-white p-3 rounded-full border border-slate-200 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                            <Award size={24} />
                        </div>
                        <span className="font-bold text-sm">העלה שיחת מופת חדשה</span>
                    </button>
                </div>
            )}

        </div>
    );
};

export default TrainingView;
