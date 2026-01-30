
import React from 'react';
import { Check } from 'lucide-react';

interface PortalJourneyProps {
  journey: any[];
}

export const PortalJourney: React.FC<PortalJourneyProps> = ({ journey }) => {
  return (
    <div className="animate-slide-up space-y-12 max-w-4xl mx-auto">
      <header className="text-center">
        <h2 className="text-4xl font-display font-bold text-slate-900">הדרך להצלחה</h2>
        <p className="text-slate-500 mt-2 text-lg">כל השלבים מההתחלה ועד ליעד הסופי.</p>
      </header>

      <div className="relative border-r-2 border-slate-200 mr-8 space-y-12 pb-10">
        {journey.map((stage) => {
          const isActive = stage.status === 'ACTIVE';
          const isCompleted = stage.status === 'COMPLETED';
          
          return (
            <div key={stage.id} className="pr-12 relative">
              <div className={`absolute top-0 right-[-11px] w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 ${
                isCompleted ? 'bg-slate-900' : 
                isActive ? 'bg-nexus-accent ring-4 ring-nexus-accent/20 animate-pulse' : 
                'bg-slate-200'
              }`}></div>
              
              <div className={`p-8 rounded-[40px] border transition-all ${isActive ? 'bg-white border-nexus-accent shadow-xl scale-[1.02]' : 'bg-white/60 border-slate-100 opacity-80'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className={`text-2xl font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>{stage.name}</h3>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{stage.date || (isActive ? 'בביצוע כרגע' : 'שלב עתידי')}</span>
                  </div>
                  {isCompleted && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">הושלם</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stage.milestones?.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl text-sm border border-slate-100/50 transition-colors">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${m.isCompleted ? 'bg-nexus-accent border-nexus-accent text-white' : 'bg-white border-slate-200'}`}>
                        {m.isCompleted && <Check size={14} strokeWidth={4} />}
                      </div>
                      <span className={m.isCompleted ? 'text-slate-400 line-through' : 'text-slate-600 font-bold'}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
