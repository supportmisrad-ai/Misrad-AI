
import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, Pause, RotateCcw, CheckCircle, Volume2, 
    VolumeX, X, Maximize2, Minimize2, Coffee, BrainCircuit, 
    ArrowRight, Zap, Target, Award, ListTodo,
    Moon, Wind, CloudRain
} from 'lucide-react';
import { Task } from '../types';
import { INITIAL_TASKS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AMBIENT_SOUNDS = [
    { id: 'rain', name: 'גשם קל', icon: <CloudRain size={18} />, color: 'text-blue-400' },
    { id: 'cafe', name: 'בית קפה', icon: <Coffee size={18} />, color: 'text-amber-400' },
    { id: 'white', name: 'רוח עדינה', icon: <Wind size={18} />, color: 'text-slate-300' },
    { id: 'space', name: 'עמוק בחלל', icon: <Moon size={18} />, color: 'text-indigo-400' },
];

const FocusModeView: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [duration, setDuration] = useState(25);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [currentSound, setCurrentSound] = useState('rain');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS.filter(t => t.status !== 'done'));
    const [sessionHistory, setSessionHistory] = useState<number>(0);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            setSessionHistory(prev => prev + 1);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);
    
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration * 60);
    };

    const handleDurationChange = (mins: number) => {
        setDuration(mins);
        setTimeLeft(mins * 60);
        setIsActive(false);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleCompleteTask = () => {
        if (selectedTask) {
            setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
            setSelectedTask(null);
            setSessionHistory(prev => prev + 1);
            resetTimer();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-[#050507] text-white rounded-[24px] md:rounded-[48px] overflow-hidden shadow-2xl relative animate-fade-in transition-all border border-white/10 select-none">
            
            {/* --- רקע אימרסיבי --- */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-950 via-[#050507] to-black"></div>
                
                {/* הילה פועמת */}
                <motion.div 
                    animate={{ 
                        scale: isActive ? [1, 1.1, 1] : 1,
                        opacity: isActive ? [0.1, 0.2, 0.1] : 0.05
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px]"
                ></motion.div>

                {/* גריד סייבר עדין */}
                <div className="absolute inset-0 opacity-[0.03]" 
                     style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}>
                </div>
            </div>

            {/* --- שורת עליונה (Header) --- */}
            <div className="relative z-20 p-5 md:p-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-500">מצב ריכוז</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{isActive ? 'טיסה פעילה' : 'ממתין להמראה'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl text-[10px] font-black">
                        <Award size={14} className="text-yellow-400" />
                        <span className="text-slate-400">היום:</span>
                        <span className="text-white">{sessionHistory}</span>
                    </div>
                    <button 
                        onClick={toggleFullscreen}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white border border-white/10"
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            {/* --- אזור השעון המרכזי --- */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 md:p-6 min-h-0 overflow-hidden">
                
                {/* הטיימר הגאומטרי */}
                <div className="flex-1 flex items-center justify-center w-full max-w-full min-h-0 py-2">
                    <div 
                        className="relative group cursor-pointer select-none aspect-square h-full max-h-[350px] sm:max-h-[450px] md:max-h-[550px]" 
                        onClick={toggleTimer}
                    >
                        {/* אפקט הילה פנימי */}
                        <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-[2000ms] ${isActive ? 'bg-indigo-500/10 scale-110' : 'bg-transparent'}`}></div>
                        
                        {/* העיגול והטבעת */}
                        <div className="w-full h-full relative p-6">
                            <svg className="absolute inset-0 w-full h-full opacity-[0.05]" viewBox="0 0 100 100">
                                <circle cx="50%" cy="50%" r="48" stroke="white" strokeWidth="0.5" fill="none" strokeDasharray="2 4" />
                            </svg>

                            <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]" viewBox="0 0 100 100">
                                <circle cx="50%" cy="50%" r="44" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
                                <motion.circle 
                                    cx="50%" cy="50%" r="44" 
                                    stroke={isActive ? '#6366f1' : '#334155'} 
                                    strokeWidth="6" 
                                    fill="none" 
                                    strokeDasharray="276" 
                                    initial={{ strokeDashoffset: 276 }}
                                    animate={{ strokeDashoffset: 276 - (276 * progress) / 100 }}
                                    strokeLinecap="round" 
                                    className="transition-all duration-1000 ease-linear"
                                />
                            </svg>
                            
                            {/* הטקסט בתוך העיגול - ממורכז מוחלט */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <motion.div 
                                    animate={{ scale: isActive ? [1, 1.02, 1] : 1 }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className={`text-6xl sm:text-8xl md:text-[130px] font-mono font-black tracking-tighter tabular-nums transition-colors duration-700 ${isActive ? 'text-white' : 'text-slate-700'}`}
                                >
                                    {formatTime(timeLeft)}
                                </motion.div>
                                
                                <div className="mt-2 md:mt-4">
                                    <AnimatePresence mode="wait">
                                        <motion.div 
                                            key={isActive ? 'focus' : 'paused'}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            {isActive ? (
                                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Zap size={10} fill="currentColor" className="animate-pulse" /> עבודה ממוקדת
                                                </span>
                                            ) : (
                                                <span className="bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Pause size={10} fill="currentColor" /> מערכת בהשהיה
                                                </span>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- אזור המשימה הנוכחית --- */}
                <div className="w-full max-w-xl mt-6 md:mt-10 shrink-0">
                    <AnimatePresence mode="wait">
                        {!selectedTask ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl overflow-hidden"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                        <ListTodo size={20} />
                                    </div>
                                    <h3 className="text-base md:text-xl font-black text-white">מה המטרה הבאה?</h3>
                                </div>
                                <div className="space-y-2 max-h-[140px] md:max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                                    {tasks.map(task => (
                                        <button 
                                            key={task.id}
                                            onClick={() => setSelectedTask(task)}
                                            className="w-full text-right p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between group active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-indigo-500 shrink-0 transition-colors"></div>
                                                <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">{task.title}</span>
                                            </div>
                                            <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 text-indigo-400 transform translate-x-4 group-hover:translate-x-0 transition-all shrink-0" />
                                        </button>
                                    ))}
                                    {tasks.length === 0 && (
                                        <div className="text-center py-6">
                                            <p className="text-slate-500 font-bold text-sm">הכל בוצע! מגיע לך קפה ☕</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-indigo-600/10 border border-indigo-500/30 rounded-[32px] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between shadow-2xl relative overflow-hidden gap-6"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                
                                <div className="relative z-10 flex-1 min-w-0 pr-0 sm:pr-4 text-center sm:text-right">
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                                        <Target size={14} /> המטרה במיקוד
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight truncate">{selectedTask.title}</h3>
                                </div>
                                
                                <div className="flex items-center gap-3 relative z-10 shrink-0">
                                    <button 
                                        onClick={handleCompleteTask}
                                        className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-4 rounded-2xl transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <CheckCircle size={22} />
                                        <span className="font-black text-sm uppercase">סיום</span>
                                    </button>
                                    <button 
                                        onClick={() => setSelectedTask(null)}
                                        className="p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-white/10"
                                        title="בטל בחירה"
                                    >
                                        <X size={22} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- בקרת ניווט תחתונה --- */}
            <div className="relative z-20 p-8 md:p-12 bg-black/60 backdrop-blur-3xl border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 shrink-0">
                
                {/* קיצורי זמן */}
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    {[25, 50, 90].map(m => (
                        <button
                            key={m}
                            onClick={() => handleDurationChange(m)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${duration === m ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {m} דק'
                        </button>
                    ))}
                </div>

                {/* כפתור הפעלה מרכזי */}
                <div className="flex items-center gap-10">
                    <button 
                        onClick={resetTimer}
                        className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 hover:scale-110 active:scale-90"
                        title="איפוס"
                    >
                        <RotateCcw size={22} />
                    </button>
                    
                    <button 
                        onClick={toggleTimer}
                        className={`w-20 h-20 md:w-24 md:h-24 rounded-[32px] text-white shadow-2xl transition-all duration-500 hover:scale-110 active:scale-90 flex items-center justify-center ${
                            isActive 
                            ? 'bg-rose-600 shadow-rose-500/20 ring-4 ring-rose-500/10' 
                            : 'bg-indigo-600 shadow-indigo-600/30 ring-4 ring-indigo-600/10'
                        }`}
                    >
                        {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="mr-1" />}
                    </button>

                    <div className="w-5 hidden md:block" />
                </div>

                {/* סאונד ואווירה */}
                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[28px] border border-white/5">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-3 rounded-xl transition-all ${isMuted ? 'text-slate-500 bg-white/5' : 'text-indigo-400 bg-indigo-400/10'}`}
                    >
                        {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                    </button>
                    
                    <div className="h-8 w-px bg-white/10 mx-1"></div>
                    
                    <div className="flex gap-1">
                        {AMBIENT_SOUNDS.map(sound => (
                            <button
                                key={sound.id}
                                onClick={() => { setCurrentSound(sound.id); setIsMuted(false); }}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group/sound ${
                                    currentSound === sound.id && !isMuted 
                                    ? 'bg-white/10 text-white shadow-lg border border-white/10' 
                                    : 'text-slate-600 hover:text-slate-400'
                                }`}
                                title={sound.name}
                            >
                                <div className={`${currentSound === sound.id && !isMuted ? sound.color : ''}`}>
                                    {sound.icon}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* פס התקדמות תחתון דק */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden z-30">
                <motion.div 
                    className="h-full bg-nexus-gradient shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default FocusModeView;
