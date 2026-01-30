
import React from 'react';
import { JourneyStage } from '../../types';
import { Map, Check } from 'lucide-react';

interface ClientJourneyTabProps {
  journeyData: JourneyStage[];
}

export const ClientJourneyTab: React.FC<ClientJourneyTabProps> = ({ journeyData }) => {
  return (
    <div className="space-y-6 animate-slide-up">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Map size={20} className="text-nexus-primary"/> איפה עומדים? (מסע הלקוח)
        </h3>
        <div className="relative border-r-2 border-gray-200 mr-4 space-y-8 pb-10">
            {journeyData?.map((stage, idx) => {
                const isActive = stage.status === 'ACTIVE';
                const isCompleted = stage.status === 'COMPLETED';
                
                return (
                    <div key={stage.id} className="relative pr-8">
                        <div className={`absolute top-0 right-[-9px] w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                            isActive ? 'bg-nexus-accent animate-pulse' : 
                            isCompleted ? 'bg-nexus-primary' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-lg font-bold ${isActive ? 'text-nexus-accent' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                {stage.name}
                            </h4>
                            <span className="text-xs text-gray-500 font-mono">{stage.date}</span>
                        </div>

                        {/* Milestones Card */}
                        <div className={`bg-white border rounded-xl overflow-hidden transition-all duration-300 ${isActive ? 'border-nexus-accent/30 shadow-md' : 'border-gray-200'}`}>
                            {stage.milestones?.map(m => (
                                <div key={m.id} className="p-3 border-b border-gray-100 last:border-0 flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                        m.isCompleted ? 'bg-nexus-primary border-nexus-primary text-white' : 'border-gray-300 text-transparent'
                                    }`}>
                                        <Check size={12} />
                                    </div>
                                    <span className={`text-sm ${m.isCompleted ? 'text-gray-900 line-through opacity-60' : 'text-gray-800 font-medium'}`}>
                                        {m.label}
                                    </span>
                                </div>
                            ))}
                            {stage.milestones.length === 0 && <div className="p-4 text-xs text-gray-400 italic">אין שלבים</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
