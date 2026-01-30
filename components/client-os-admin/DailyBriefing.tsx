import React, { useState, useEffect } from 'react';
import { X, Calendar, Briefcase, Zap, CheckCircle2 } from 'lucide-react';
import { generateDailyBriefing } from '@/components/client-portal/services/geminiService';
import { MOCK_CLIENTS, MOCK_MEETINGS } from '@/components/client-portal/constants';
import { HealthStatus } from '@/components/client-portal/types';
import { Skeleton } from '@/components/ui/skeletons';

interface DailyBriefingProps {
  isOpen: boolean;
  onClose: () => void;
}

const DailyBriefing: React.FC<DailyBriefingProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [briefing, setBriefing] = useState<{ greeting: string; focusPoints: string[]; quote: string } | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setShowContent(false);
      loadBriefing();
    }
  }, [isOpen]);

  const loadBriefing = async () => {
    const riskyCount = MOCK_CLIENTS.filter((c) => c.healthStatus === HealthStatus.CRITICAL || c.healthStatus === HealthStatus.AT_RISK).length;
    const oppCount = MOCK_CLIENTS.flatMap((c) => c.opportunities).length;
    const meetingCount = MOCK_MEETINGS.length;

    try {
      const data = await generateDailyBriefing(riskyCount, oppCount, meetingCount);
      setBriefing(data);
      setTimeout(() => {
        setIsLoading(false);
        setTimeout(() => setShowContent(true), 500);
      }, 1000);
    } catch (e) {
      console.error(e);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in text-white font-sans">
      <div className="w-full max-w-3xl relative">
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors">
          <X size={24} />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <Skeleton className="w-20 h-20 rounded-full bg-white/10" />
            <div className="space-y-3 w-full max-w-md">
              <Skeleton className="h-8 w-3/4 mx-auto rounded-2xl bg-white/10" />
              <Skeleton className="h-4 w-2/3 mx-auto rounded-xl bg-white/10" />
            </div>
            <div className="flex gap-2 text-xs text-nexus-accent font-mono opacity-70">
              <Skeleton className="h-3 w-16 rounded-lg bg-white/10" />
              <span>•</span>
              <Skeleton className="h-3 w-20 rounded-lg bg-white/10" />
              <span>•</span>
              <Skeleton className="h-3 w-20 rounded-lg bg-white/10" />
            </div>
          </div>
        ) : (
          <div
            className={`space-y-12 transition-all duration-1000 transform ${
              showContent ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            <div className="text-center space-y-4">
              <div className="inline-block px-4 py-1 rounded-full border border-nexus-accent/50 bg-nexus-accent/10 text-nexus-accent text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(197,165,114,0.3)]">
                בוקר טוב
              </div>
              <h1 className="text-5xl font-display font-bold leading-tight">{briefing?.greeting}</h1>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {briefing?.focusPoints?.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-nexus-accent/50 transition-all group"
                  style={{ animationDelay: `${idx * 200}ms` }}
                >
                  <div className="mt-1 p-3 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/20 shadow-lg group-hover:shadow-nexus-accent/20 group-hover:border-nexus-accent transition-all">
                    {idx === 0 ? (
                      <Zap className="text-signal-warning" size={20} />
                    ) : idx === 1 ? (
                      <Calendar className="text-blue-400" size={20} />
                    ) : (
                      <Briefcase className="text-green-400" size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-medium leading-relaxed text-gray-200 group-hover:text-white transition-colors">
                      {point}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-8">
              <div className="max-w-md">
                <p className="text-sm text-gray-400 italic font-serif">"{briefing?.quote}"</p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-nexus-accent hover:text-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(197,165,114,0.6)]"
              >
                יאללה לעבודה <CheckCircle2 size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyBriefing;
