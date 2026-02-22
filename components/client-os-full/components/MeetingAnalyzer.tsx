'use client';

import React, { useState } from 'react';
import { MeetingAnalysisResult } from '../types';
import { Sparkles, SquareCheck, ShieldAlert, CircleUser, Briefcase, ArrowRight, Eraser, ArrowLeft } from 'lucide-react';
import { GlowButton } from './ui/GlowButton';
import { useNexus } from '../context/ClientContext';
import { analyzeAndStoreMeeting } from '@/app/actions/client-portal-clinic';
import { Skeleton } from '@/components/ui/skeletons';
import { CustomSelect } from '@/components/CustomSelect';

const SAMPLE_TRANSCRIPT = `נציג: היי דני, מה שלומך? רציתי לעדכן לגבי הקמפיין החדש.
לקוח: האמת שאני קצת מודאג. עדיין לא קיבלנו את הלידים שהבטחתם לשבוע שעבר.
נציג: אני מבין. אני אבדוק את זה אישית מול מחלקת המדיה ואחזור אליך עם תשובה עד השעה 14:00.
לקוח: אוקיי, זה חשוב. בנוסף, אני צריך שתשלחו לי את החשבונית המעודכנת כדי שאוכל להעביר לתשלום.
נציג: אין בעיה, אשלח לך את החשבונית מיד בתום השיחה. לגבי הבאגים באתר - טיפלנו ברובם.
לקוח: מעולה. אני אעבור על האתר הערב ואשלח לכם רשימת הערות סופית לאישור.
נציג: מצוין. אגב, אם תצטרכו עוד שינויים בעיצוב, אני מאמין שנוכל לעשות את זה ללא עלות נוספת במסגרת הריטיינר.`;

const MeetingAnalyzer: React.FC = () => {
  const { clients } = useNexus();
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MeetingAnalysisResult | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [title, setTitle] = useState<string>('ניתוח שיחה');
  const [location, setLocation] = useState<'ZOOM' | 'FRONTAL' | 'PHONE'>('ZOOM');

  const orgId = (typeof window !== 'undefined'
    ? (((window as unknown) as { [key: string]: unknown }).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined)?.organizationId
    : null) ?? null;

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    if (!orgId) {
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'חסר organizationId (לא ניתן לשמור למסד).', type: 'error' } }));
      return;
    }

    const effectiveClientId = clientId || clients?.[0]?.id;
    if (!effectiveClientId) {
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'בחר לקוח לפני ניתוח.', type: 'error' } }));
      return;
    }
    
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      const res = await analyzeAndStoreMeeting({
        orgId,
        clientId: effectiveClientId,
        title: title?.trim() ? title.trim() : 'ניתוח שיחה',
        location,
        transcript,
      });
      setResult(res.analysis as MeetingAnalysisResult);
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'הניתוח נשמר בהצלחה.', type: 'success' } }));
    } catch (error) {
      console.error("Analysis failed", error);
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: 'ניתוח נכשל או לא נשמר.', type: 'error' } }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'HIGH': return 'text-signal-danger border-signal-danger/30 bg-signal-danger/10 shadow-[0_0_10px_rgba(220,38,38,0.1)]';
      case 'MEDIUM': return 'text-signal-warning border-signal-warning/30 bg-signal-warning/10';
      case 'LOW': return 'text-nexus-accent border-nexus-accent/30 bg-nexus-accent/10';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-end items-end pb-2">
        <button 
           onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
           className="text-xs text-nexus-accent hover:text-nexus-primary border border-nexus-accent/30 hover:bg-nexus-accent/10 px-3 py-1.5 rounded transition-all"
           type="button"
        >
           טען דוגמה
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        
        {/* Input Section (Left - 4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
           <div className="glass-card p-4 rounded-2xl border border-slate-200/70 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">לקוח</label>
                <CustomSelect
                  value={clientId}
                  onChange={(val) => setClientId(val)}
                  placeholder="(ברירת מחדל: לקוח ראשון)"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">כותרת</label>
                <input
                  className="w-full bg-transparent border border-gray-200 rounded-xl p-2 text-sm font-bold outline-none focus:border-nexus-primary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="למשל: שיחת סטטוס שבועית"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">סוג פגישה</label>
                <CustomSelect
                  value={location}
                  onChange={(val) => setLocation(val as 'ZOOM' | 'FRONTAL' | 'PHONE')}
                  options={[
                    { value: 'ZOOM', label: 'ZOOM' },
                    { value: 'FRONTAL', label: 'FRONTAL' },
                    { value: 'PHONE', label: 'PHONE' },
                  ]}
                />
              </div>
           </div>
           <div className="glass-card flex-1 p-4 rounded-2xl border border-slate-200/70 flex flex-col relative group focus-within:border-nexus-primary/50 transition-colors">
              <textarea
                className="flex-1 bg-transparent border-none outline-none resize-none text-gray-700 font-mono leading-relaxed text-sm p-2 placeholder-gray-400 custom-scrollbar"
                placeholder={`נציג: שלום...\nלקוח: היי...`}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <div className="flex justify-between items-center mt-4 border-t border-gray-200 pt-4">
                 <button 
                   onClick={() => setTranscript('')}
                   className="text-gray-500 hover:text-gray-900 text-xs flex items-center gap-1 transition-colors"
                 >
                   <Eraser size={14} /> נקה
                 </button>
                 <span className="text-xs text-gray-500">{transcript.length} תווים</span>
              </div>
           </div>
           
           <GlowButton onClick={handleAnalyze} isLoading={isAnalyzing} disabled={!transcript.trim()} className="w-full">
              <Sparkles className="mr-2" size={18} />
              תנתח את זה
           </GlowButton>
        </div>

        {/* Output Section (Right - 8 Cols) */}
        <div className="lg:col-span-8 h-full overflow-y-auto pr-2 custom-scrollbar">
           {!result && !isAnalyzing && (
             <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                <Sparkles size={48} className="mb-4 opacity-50" />
                <p>תדביק את הטקסט בצד ימין</p>
             </div>
           )}

           {isAnalyzing && (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                 <Skeleton className="w-12 h-12 rounded-full" />
                 <div className="text-center">
                    <h3 className="text-gray-900 font-display font-bold text-xl">עובר על הטקסט...</h3>
                    <p className="text-gray-500 text-sm mt-1">מחפש איפה הבטחתם דברים ולא שמתם לב</p>
                 </div>
              </div>
           )}

           {result && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Top Row: Summary & Liability Shield */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Summary */}
                   <div className="glass-card p-5 rounded-xl border-l-4 border-l-nexus-primary">
                      <div className="flex justify-between items-start mb-3">
                         <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest">בתכל'ס (אמ;לק)</h4>
                         <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.sentimentScore > 60 ? 'bg-signal-success/20 text-signal-success' : 'bg-signal-danger/20 text-signal-danger'}`}>
                            מצב רוח: {result.sentimentScore}
                         </span>
                      </div>
                      <p className="text-gray-900 text-sm leading-relaxed">
                        {result.summary}
                      </p>
                   </div>

                   {/* Liability Shield */}
                   <div className="glass-card p-5 rounded-xl border border-signal-warning/20 bg-gradient-to-br from-white to-signal-warning/5">
                      <h4 className="text-signal-warning text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                         <ShieldAlert size={14} /> הבטחות שנתנו (מסוכן)
                      </h4>
                      {result.liabilityRisks.length > 0 ? (
                        <div className="space-y-3">
                           {result.liabilityRisks.map((risk, i) => (
                              <div key={i} className={`p-3 rounded-lg border text-xs ${getRiskColor(risk.riskLevel)}`}>
                                 <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold opacity-80">אמרנו:</span>
                                    <span className="px-1.5 py-0.5 bg-white/50 rounded uppercase text-[10px]">{risk.riskLevel === 'HIGH' ? 'מסוכן מאוד' : 'לשים לב'}</span>
                                 </div>
                                 <p className="font-mono italic opacity-90">"{risk.quote}"</p>
                                 <p className="mt-1 opacity-70 border-t border-gray-200/60 pt-1">למה זה בעיה: {risk.context}</p>
                              </div>
                           ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-20 text-gray-500 text-sm italic">
                           לא הבטחנו שטויות הפעם
                        </div>
                      )}
                   </div>
                </div>

                {/* Tasks Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* Agency Tasks (Internal) */}
                   <div className="space-y-3">
                      <h3 className="text-gray-900 font-display font-semibold flex items-center gap-2">
                         <Briefcase className="text-nexus-primary" size={18} />
                         משימות שלנו
                      </h3>
                      <div className="bg-white rounded-xl p-1 min-h-[200px] border border-gray-200">
                         {result.agencyTasks.map((item, i) => (
                            <div key={i} className="group flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
                               <div className={`mt-1 w-2 h-2 rounded-full ${item.priority === 'HIGH' ? 'bg-nexus-primary shadow-[0_0_8px_#7000FF]' : 'bg-gray-400'}`}></div>
                               <div className="flex-1">
                                  <p className="text-gray-800 text-sm font-medium leading-snug">{item.task}</p>
                                  <span className="text-[10px] text-nexus-accent mt-1 block">מתי: {item.deadline}</span>
                               </div>
                            </div>
                         ))}
                         {result.agencyTasks.length === 0 && <p className="text-gray-500 text-center text-sm py-8">אין משימות לנו</p>}
                      </div>
                   </div>

                   {/* Client Tasks (External / Waiting For) */}
                   <div className="space-y-3">
                      <h3 className="text-gray-900 font-display font-semibold flex items-center gap-2">
                         <CircleUser className="text-signal-success" size={18} />
                         משימות שלהם
                      </h3>
                      <div className="bg-white rounded-xl p-1 min-h-[200px] border border-gray-200 relative overflow-hidden">
                         {/* Subtle Background Pattern for differentiation */}
                         <div className="absolute inset-0 bg-signal-success/5 pointer-events-none"></div>
                         
                         {result.clientTasks.map((item, i) => (
                            <div key={i} className="relative z-10 group flex items-start gap-3 p-3 hover:bg-white rounded-lg transition-colors border-b border-gray-100 last:border-0">
                               <div className="mt-1">
                                 <ArrowLeft size={14} className="text-signal-success" />
                               </div>
                               <div className="flex-1">
                                  <p className="text-gray-800 text-sm font-medium leading-snug">{item.task}</p>
                                  <span className="text-[10px] text-gray-500 mt-1 block">מחכים ש: {item.deadline}</span>
                               </div>
                            </div>
                         ))}
                         {result.clientTasks.length === 0 && <p className="text-gray-500 text-center text-sm py-8">הלקוח לא חייב כלום</p>}
                      </div>
                   </div>

                </div>

                {/* Keywords Cloud */}
                {result.frictionKeywords.length > 0 && (
                   <div className="pt-4 border-t border-slate-200/70">
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">מילים שחזרו על עצמן</p>
                      <div className="flex flex-wrap gap-2">
                         {result.frictionKeywords.map((word, i) => (
                            <span key={i} className="px-3 py-1 rounded-lg text-xs bg-gray-100 border border-gray-200 text-gray-600 font-mono">
                              #{word}
                            </span>
                         ))}
                      </div>
                   </div>
                )}

             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default MeetingAnalyzer;
