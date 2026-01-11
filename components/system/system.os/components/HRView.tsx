
import React, { useState } from 'react';
import { 
    Heart, Users, Smile, Calendar, Coffee, Award, 
    MessageCircle, Star, ThumbsUp, PartyPopper, UserPlus, ArrowRight 
} from 'lucide-react';
import { INITIAL_AGENTS } from '../constants';
import { useToast } from '../contexts/ToastContext';

const KUDOS: { id: number; from: string; to: string; text: string; time: string }[] = [];

const HRView: React.FC = () => {
    const { addToast } = useToast();
    const [team, setTeam] = useState(INITIAL_AGENTS);
    const [mood, setMood] = useState<number | null>(null);

    const handleKudos = () => {
        addToast('פרגון נשלח בהצלחה!', 'success');
    };

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="text-primary" strokeWidth={2.5} />
                        הצוות
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Col: Team Directory & Status */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Team Mood */}
                    <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="relative z-10 flex justify-between items-end">
                            <div>
                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                    <Smile size={28} /> מצב רוח צוותי
                                </h3>
                                <p className="text-rose-100 font-medium max-w-md">
                                    מדד האנרגיה בצוות השבוע.
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-6xl font-black">{mood === null ? '—' : `${mood}%`}</div>
                                <div className="text-sm font-bold text-rose-200 uppercase tracking-widest">אנרגיה חיובית</div>
                            </div>
                        </div>
                        
                        <div className="w-full bg-black/20 h-3 rounded-full mt-8 overflow-hidden backdrop-blur-sm">
                            <div className="bg-white h-full rounded-full" style={{ width: `${mood ?? 0}%` }}></div>
                        </div>
                    </div>

                    {/* Team Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {team.map(agent => (
                            <div key={agent.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
                                <div className="relative">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-bold text-slate-600 border-2 border-white shadow-sm">
                                        {agent.avatar}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${agent.status === 'available' ? 'bg-emerald-500' : agent.status === 'busy' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-lg">{agent.name}</h4>
                                    <p className="text-slate-500 text-sm">{agent.area}</p>
                                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-[10px] font-bold bg-slate-50 px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors">פרופיל</button>
                                        <button className="text-[10px] font-bold bg-slate-50 px-2 py-1 rounded hover:bg-rose-50 hover:text-rose-600 transition-colors">שלח פרגון</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Add New Member */}
                        <button className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all min-h-[120px] group">
                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-white shadow-sm transition-colors">
                                <UserPlus size={20} />
                            </div>
                            <span className="font-bold text-sm">גיוס עובד</span>
                        </button>
                    </div>

                </div>

                {/* Right Col: Kudos & Events */}
                <div className="space-y-8">
                    
                    {/* Kudos Wall */}
                    <div className="ui-card flex flex-col h-[400px]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Award size={20} className="text-amber-500" />
                                קיר הפרגונים
                            </h3>
                            <button onClick={handleKudos} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                פרגן למישהו
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {KUDOS.length === 0 ? (
                              <div className="text-center py-10 text-slate-400">
                                <p className="text-sm font-medium">אין פרגונים להצגה</p>
                              </div>
                            ) : KUDOS.map(k => (
                                <div key={k.id} className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 relative">
                                    <div className="absolute top-[-10px] left-4 text-2xl">👏</div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-slate-800 text-sm">{k.from}</span>
                                        <ArrowRight size={12} className="text-slate-400" />
                                        <span className="font-bold text-slate-800 text-sm">{k.to}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-snug">{k.text}</p>
                                    <div className="text-[10px] text-slate-400 mt-2 text-right">{k.time}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Events / Birthdays */}
                    <div className="ui-card p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <PartyPopper size={20} className="text-indigo-500" />
                            אירועים קרובים
                        </h3>
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm font-medium">אין אירועים קרובים</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default HRView;
