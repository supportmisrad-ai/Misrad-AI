
import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { 
    X, Presentation, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, 
    Download, BarChart3, PieChart, TrendingUp, Target, Calendar, 
    Briefcase, Loader2, ArrowRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface QBRGeneratorModalProps {
    lead: Lead;
    onClose: () => void;
}

type GenerationStep = 'config' | 'generating' | 'preview';

const QBRGeneratorModal: React.FC<QBRGeneratorModalProps> = ({ lead, onClose }) => {
    const { addToast } = useToast();
    const now = new Date();
    const formatQuarterLabel = (q: number, y: number) => `רבעון ${q} ${y}`;
    const getQuarterLabel = (offsetQuarters: number) => {
        const d = new Date(now.getFullYear(), now.getMonth() + offsetQuarters * 3, 1);
        const q = Math.floor(d.getMonth() / 3) + 1;
        return formatQuarterLabel(q, d.getFullYear());
    };

    const quarterOptions = [
        getQuarterLabel(-1),
        getQuarterLabel(0),
        `סיכום שנתי ${now.getFullYear()}`
    ];

    const [step, setStep] = useState<GenerationStep>('config');
    const [quarter, setQuarter] = useState(() => getQuarterLabel(0));
    const [focus, setFocus] = useState('roi'); // roi, growth, ops
    const [loadingStage, setLoadingStage] = useState(0);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Mock Slides Data
    const slides = [
        {
            id: 'cover',
            layout: 'cover',
            title: `סקירה רבעונית`,
            subtitle: quarter,
            accent: 'bg-indigo-900',
            content: { client: lead.name, date: new Date().toLocaleDateString() }
        },
        {
            id: 'empty',
            layout: 'text',
            title: 'אין נתונים להצגה',
            accent: 'bg-white',
            content: {
                points: [
                    'אין מספיק נתונים כדי ליצור סקירה רבעונית אוטומטית.'
                ]
            }
        }
    ];

    const slide = slides[currentSlide] ?? slides[0]!;

    const handleGenerate = () => {
        setLoadingStage(0);
        setCurrentSlide(0);
        setStep('preview');
        addToast('אין נתונים זמינים ליצירת מצגת מלאה', 'info');
    };

    const handleDownload = () => {
        addToast('הורדת מצגת אינה זמינה כרגע', 'info');
    };

    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-scale-in">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                            <Presentation size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">מחולל מצגות</h2>
                            <p className="text-sm text-slate-500 font-medium">סקירה עסקית רבעונית עבור {lead.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
                    
                    {/* STEP 1: CONFIGURATION */}
                    {step === 'config' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
                            <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">הגדרת המצגת</h3>
                            
                            <div className="w-full space-y-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 block">תקופת זמן</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {quarterOptions.map(q => (
                                            <button 
                                                key={q}
                                                onClick={() => setQuarter(q)}
                                                className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${quarter === q ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-white bg-white text-slate-600 hover:border-slate-200'}`}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 block">נראטיב (מיקוד)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <button 
                                            onClick={() => setFocus('roi')}
                                            className={`p-4 rounded-xl border-2 text-right transition-all group ${focus === 'roi' ? 'border-emerald-500 bg-emerald-50' : 'border-white bg-white hover:border-slate-200'}`}
                                        >
                                            <div className="mb-2 p-2 w-fit rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp size={20} /></div>
                                            <div className="font-bold text-slate-800">החזר השקעה</div>
                                            <div className="text-xs text-slate-500 mt-1">דגש על כסף שנחסך ורווח.</div>
                                        </button>
                                        <button 
                                            onClick={() => setFocus('growth')}
                                            className={`p-4 rounded-xl border-2 text-right transition-all group ${focus === 'growth' ? 'border-indigo-500 bg-indigo-50' : 'border-white bg-white hover:border-slate-200'}`}
                                        >
                                            <div className="mb-2 p-2 w-fit rounded-lg bg-indigo-100 text-indigo-700"><Target size={20} /></div>
                                            <div className="font-bold text-slate-800">צמיחה והתרחבות</div>
                                            <div className="text-xs text-slate-500 mt-1">דגש על יעדים עתידיים.</div>
                                        </button>
                                        <button 
                                            onClick={() => setFocus('ops')}
                                            className={`p-4 rounded-xl border-2 text-right transition-all group ${focus === 'ops' ? 'border-blue-500 bg-blue-50' : 'border-white bg-white hover:border-slate-200'}`}
                                        >
                                            <div className="mb-2 p-2 w-fit rounded-lg bg-blue-100 text-blue-700"><CheckCircle2 size={20} /></div>
                                            <div className="font-bold text-slate-800">יעילות תפעולית</div>
                                            <div className="text-xs text-slate-500 mt-1">דגש על סדר וארגון.</div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerate}
                                className="mt-12 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 hover:-translate-y-1"
                            >
                                <Sparkles size={20} className="text-yellow-400" />
                                צור מצגת אוטומטית
                            </button>
                        </div>
                    )}

                    {/* STEP 2: GENERATING ANIMATION */}
                    {step === 'generating' && (
                        <div className="flex-1 flex flex-col items-center justify-center relative">
                            <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
                            
                            <div className="relative w-64 h-64 mb-8">
                                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <Briefcase size={48} className="text-indigo-600 mx-auto mb-2 animate-bounce" />
                                        <span className="font-mono font-bold text-slate-400">{Math.round((loadingStage / 3) * 100)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 w-80 relative z-10">
                                <div className={`flex items-center gap-3 transition-all duration-500 ${loadingStage >= 1 ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-4'}`}>
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"><CheckCircle2 size={14} /></div>
                                    <span className="font-bold text-slate-700">אוסף נתונים פיננסיים...</span>
                                </div>
                                <div className={`flex items-center gap-3 transition-all duration-500 delay-100 ${loadingStage >= 2 ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-4'}`}>
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"><CheckCircle2 size={14} /></div>
                                    <span className="font-bold text-slate-700">מנתח מגמות ביצועים...</span>
                                </div>
                                <div className={`flex items-center gap-3 transition-all duration-500 delay-200 ${loadingStage >= 3 ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-4'}`}>
                                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"><CheckCircle2 size={14} /></div>
                                    <span className="font-bold text-slate-700">מעצב שקפים...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW (SLIDE DECK) */}
                    {step === 'preview' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-100">
                            
                            {/* Slide Container */}
                            <div className="w-full max-w-4xl aspect-video bg-white shadow-2xl rounded-xl overflow-hidden relative flex flex-col transition-all duration-500 transform">
                                
                                {/* Current Slide Content */}
                                <div className={`flex-1 flex flex-col ${slide.accent} transition-colors duration-500`}>
                                    
                                    {/* Layout: Cover */}
                                    {slide.layout === 'cover' && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-white p-12 text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 shadow-lg border border-white/20">
                                                <Presentation size={40} />
                                            </div>
                                            <h1 className="text-5xl font-extrabold mb-4 tracking-tight">{slide.title}</h1>
                                            <p className="text-2xl font-light text-indigo-200 mb-12">{slide.subtitle}</p>
                                            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest opacity-80">
                                                <span>{slide.content.client}</span>
                                                <span>•</span>
                                                <span>{slide.content.date}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Layout: Text / Summary */}
                                    {slide.layout === 'text' && (
                                        <div className="flex-1 p-16 flex flex-col">
                                            <h2 className="text-3xl font-bold text-slate-800 mb-8 border-b border-slate-200 pb-4">
                                                {slide.title}
                                            </h2>
                                            <div className="space-y-6 flex-1">
                                                {slide.content.points?.map((point: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-4 text-lg text-slate-600 font-medium">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-1 text-sm font-bold">{i + 1}</div>
                                                        <p>{point}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer */}
                                    <div className="h-12 bg-white/50 backdrop-blur-sm border-t border-slate-200/50 flex items-center justify-between px-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        <span>Nexus Strategy</span>
                                        <span>שקף {currentSlide + 1} מתוך {slides.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-6 mt-8">
                                <button onClick={prevSlide} disabled={currentSlide === 0} className="p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-indigo-600 disabled:opacity-30 transition-all">
                                    <ChevronRight size={24} />
                                </button>
                                <span className="text-sm font-bold text-slate-500">
                                    {currentSlide + 1} / {slides.length}
                                </span>
                                <button onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="p-3 bg-white rounded-full shadow-lg text-slate-600 hover:text-indigo-600 disabled:opacity-30 transition-all">
                                    <ChevronLeft size={24} />
                                </button>
                                
                                <div className="h-8 w-px bg-slate-300 mx-2"></div>

                                <button 
                                    onClick={handleDownload}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                                >
                                    <Download size={18} />
                                    הורד PDF
                                </button>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default QBRGeneratorModal;
