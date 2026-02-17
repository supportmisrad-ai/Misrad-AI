import React from 'react';
import {
  Sparkles,
  Target,
  ArrowLeft,
  PenTool,
  FileSignature,
  CircleCheckBig,
  ThumbsUp,
  RefreshCw,
  ThumbsDown,
  MessageSquarePlus,
  Check,
} from 'lucide-react';
import TestimonialPrompt from '../TestimonialPrompt';
import { Skeleton } from '@/components/ui/skeletons';
import { Client, ClientAction, SuccessGoal } from '../../types';

type MoodOption = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  hover?: string;
};

interface PortalDashboardProps {
  client: Client;
  pendingTasks: ClientAction[];
  approvals: ClientAction[];
  northStarGoal: SuccessGoal | null;
  nextActionCard?: {
    title: string;
    description: string;
    ctaLabel: string;
    onCta: () => void;
    onDismiss: () => void;
  } | null;
  showTestimonialCard: boolean;
  onCloseTestimonial: () => void;
  onActionComplete: (id: string, title: string) => void;
  onNavigate: (screen: unknown) => void;
  selectedMood: MoodOption | null;
  setSelectedMood: (mood: MoodOption | null) => void;
  moodComment: string;
  setMoodComment: (val: string) => void;
  isSubmittingMood: boolean;
  moodSubmitted: boolean;
  onSubmitPulse: () => void;
}

export const PortalDashboard: React.FC<PortalDashboardProps> = ({
  client,
  pendingTasks,
  approvals,
  northStarGoal,
  nextActionCard,
  showTestimonialCard,
  onCloseTestimonial,
  onActionComplete,
  onNavigate,
  selectedMood,
  setSelectedMood,
  moodComment,
  setMoodComment,
  isSubmittingMood,
  moodSubmitted,
  onSubmitPulse,
}) => {
  return (
    <div className="animate-slide-up space-y-10 max-w-5xl mx-auto">
      <header className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-nexus-accent mb-2">
            <Sparkles size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Portal Access Active</span>
          </div>
          <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
            היי {client.mainContact.split(' ')[0]}, מה קורה?
          </h2>
          <p className="text-slate-500 text-lg mt-2 font-medium">יש לנו {pendingTasks.length} משימות שמחכות לך.</p>
        </div>
      </header>

      {nextActionCard ? (
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">הצעד הבא</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{nextActionCard.title}</div>
            <div className="text-sm text-slate-500 mt-1">{nextActionCard.description}</div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={nextActionCard.onDismiss}
              className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
            >
              סגור
            </button>
            <button
              onClick={nextActionCard.onCta}
              className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-nexus-accent transition-all shadow-lg"
            >
              {nextActionCard.ctaLabel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {showTestimonialCard && (
          <div className="md:col-span-2">
            <TestimonialPrompt clientName={client.name} onClose={onCloseTestimonial} />
          </div>
        )}

        {northStarGoal && (
          <div
            onClick={() => onNavigate('metrics')}
            className="md:col-span-2 bg-white rounded-[40px] p-8 border border-slate-200 shadow-xl relative overflow-hidden group cursor-pointer hover:border-nexus-accent/50 transition-all"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="w-32 h-32 flex-shrink-0 relative">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={364.4}
                    strokeDashoffset={364.4 * (1 - northStarGoal.metricCurrent / northStarGoal.metricTarget)}
                    className="text-nexus-accent transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">
                    {Math.round((northStarGoal.metricCurrent / northStarGoal.metricTarget) * 100)}%
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">התקדמות</span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-nexus-accent">
                  <Target size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">היעד המרכזי שלכם (North Star)</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 leading-tight">"{northStarGoal.title}"</h3>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">נוכחי</span>
                    <span className="text-xl font-bold text-slate-900">
                      {northStarGoal.metricCurrent}
                      {northStarGoal.unit}
                    </span>
                  </div>
                  <ArrowLeft className="text-slate-300" />
                  <div className="bg-nexus-accent/10 px-4 py-2 rounded-2xl border border-nexus-accent/20">
                    <span className="text-[10px] text-nexus-accent font-bold uppercase block">יעד</span>
                    <span className="text-xl font-bold text-nexus-primary">
                      {northStarGoal.metricTarget}
                      {northStarGoal.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block">
                <button className="p-4 bg-slate-900 text-white rounded-full group-hover:bg-nexus-accent transition-all shadow-lg">
                  <ArrowLeft size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
          <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
            <PenTool size={22} className="text-nexus-accent" /> אישורים וחתימות
          </h3>

          <div className="space-y-4">
            {approvals.length > 0 ? (
              approvals.map((action) => (
                <div key={action.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm text-slate-400">
                      <FileSignature size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm leading-none">{action.title}</h4>
                      <span className="text-[10px] text-red-500 font-bold uppercase mt-1 block">דרוש אישור</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onActionComplete(action.id, action.title)}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-all shadow-lg"
                  >
                    אשר וחתום דיגיטלית
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                {selectedMood && selectedMood.icon && React.createElement(selectedMood.icon as React.ComponentType<{ size?: number; className?: string }>, { size: 48, className: "text-white" })}
                <CircleCheckBig size={32} className="mx-auto text-green-500 mb-2 opacity-20" />
                <p className="text-slate-400 text-sm italic">אין מסמכים הממתינים לאישור.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm flex flex-col transition-all duration-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-slate-900">איך המרגש השבוע?</h3>
            {selectedMood && !moodSubmitted && (
              <button
                onClick={() => {
                  setSelectedMood(null);
                  setMoodComment('');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors"
              >
                שנה בחירה
              </button>
            )}
          </div>

          {!moodSubmitted ? (
            <>
              {!selectedMood ? (
                <div className="grid grid-cols-3 gap-4 animate-fade-in">
                  {[
                    { icon: ThumbsUp, label: 'מעולה', color: 'text-green-600 bg-green-50', hover: 'hover:border-green-400' },
                    { icon: RefreshCw, label: 'בסדר', color: 'text-yellow-600 bg-yellow-50', hover: 'hover:border-yellow-400' },
                    { icon: ThumbsDown, label: 'טעון שיפור', color: 'text-red-600 bg-red-50', hover: 'hover:border-red-400' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedMood(opt)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-transparent transition-all active:scale-95 ${opt.color} ${opt.hover}`}
                    >
                      <opt.icon size={24} />
                      <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 animate-slide-up">
                  <div className={`flex items-center gap-4 p-4 rounded-2xl border ${selectedMood.color} border-current opacity-20`}>
                    {(() => {
                      const SelectedIcon = selectedMood.icon;
                      return <SelectedIcon size={20} />;
                    })()}
                    <span className="text-sm font-bold">נבחר: {selectedMood.label}</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                      <MessageSquarePlus size={14} />
                      <span>רוצה להוסיף מילה? (אופציונלי)</span>
                    </div>
                    <textarea
                      value={moodComment}
                      onChange={(e) => setMoodComment(e.target.value)}
                      className="w-full h-24 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-nexus-accent transition-all text-sm resize-none"
                      placeholder="ספר לנו קצת יותר..."
                      autoFocus
                    />
                    <button
                      onClick={onSubmitPulse}
                      disabled={isSubmittingMood}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {isSubmittingMood ? (
                        <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
                      ) : (
                        <>
                          <Check size={16} /> שלח עדכון
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 animate-fade-in">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                <CircleCheckBig size={32} />
              </div>
              <h4 className="font-bold text-slate-900">תודה על העדכון!</h4>
              <p className="text-xs text-slate-500 mt-1">אנחנו לוקחים את זה לתשומת ליבנו.</p>
              <button
                onClick={() => {
                  setSelectedMood(null);
                  setMoodComment('');
                }}
                className="mt-6 text-[10px] font-bold text-nexus-accent hover:underline"
              >
                שלח עדכון חדש
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
