'use client';

import React, { useState, useEffect } from 'react';
import { Lead, HandoverData } from './types';
import { X, Server, CircleCheck, ArrowRight, Database, Code2, User, Briefcase, DollarSign, Calendar, FileJson, ShieldCheck, SquareActivity, Send, OctagonAlert, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

interface HandoverDialogProps {
  payload: Record<string, unknown>;
  lead: Lead;
  onClose: () => void;
  onConfirm: (data: HandoverData) => void;
}

type Step = 'form' | 'review' | 'sending' | 'success';

const HandoverDialog: React.FC<HandoverDialogProps> = ({ payload, lead, onClose, onConfirm }) => {
  const [step, setStep] = useState<Step>('form');
  const [showJson, setShowJson] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState<HandoverData>({
      nonStandardPromises: '',
      biggestPain: '',
      expectations30Days: '',
      filledAt: new Date()
  });

  const isFormValid = formData.nonStandardPromises.length > 3 && formData.biggestPain.length > 3 && formData.expectations30Days.length > 3;

  useEffect(() => {
    if (step === 'sending') {
      const msgs = [
          "יוצר קשר עם שרת תפעול...",
          "מאמת טופס מסירה (חובה)...",
          "מסנכרן נתונים פיננסיים...",
          "פותח הרשאת עמלה לסוכן...",
          "יוצר משימת כניסה אוטומטית...",
          "סיום תהליך..."
      ];
      
      let msgIndex = 0;
      setLogs([msgs[0]]);

      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep('success');
            return 100;
          }
          // Add logs based on progress
          if (prev > 15 && msgIndex === 0) { msgIndex++; setLogs(p => [...p, msgs[1]]); }
          if (prev > 30 && msgIndex === 1) { msgIndex++; setLogs(p => [...p, msgs[2]]); }
          if (prev > 50 && msgIndex === 2) { msgIndex++; setLogs(p => [...p, msgs[3]]); }
          if (prev > 75 && msgIndex === 3) { msgIndex++; setLogs(p => [...p, msgs[4]]); }
          if (prev > 95 && msgIndex === 4) { msgIndex++; setLogs(p => [...p, msgs[5]]); }
          
          return prev + 1.2; // Smooth progress
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90dvh] ring-1 ring-white/20 animate-scale-in relative border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center relative z-10">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Server size={22} className="text-emerald-400" />
              פרוטוקול מסירה
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 opacity-80">
              העברת תיק לקוח לתפעול: <span className="font-bold text-white">{lead.name}</span>
            </p>
          </div>
          {step !== 'sending' && step !== 'success' && (
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/10 p-2 rounded-xl transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-[#FAFAFA]">
          
          {/* STEP 1: MANDATORY FORM */}
          {step === 'form' && (
              <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                      <div className="bg-white p-2 rounded-full text-amber-600 shadow-sm shrink-0">
                          <OctagonAlert size={24} />
                      </div>
                      <div>
                          <h4 className="font-bold text-amber-900 text-sm">שער העמלה</h4>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                              שים לב: המערכת לא תאפשר סגירת עסקה ("זכייה") ללא מילוי טופס זה במלואו.
                              אי-מילוי הטופס יגרור עיכוב בתשלום העמלה עד להשלמת הפרטים מול מנהל תפעול.
                          </p>
                      </div>
                  </div>

                  <div className="space-y-5">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              1. מה הבטחת שלא בסטנדרט? (חריגים)
                              <span className="text-red-500">*</span>
                          </label>
                          <textarea 
                              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm h-24"
                              placeholder="לדוגמה: הבטחתי פגישה נוספת בחינם, הבטחתי גישה למודול X..."
                              value={formData.nonStandardPromises}
                              onChange={e => setFormData({...formData, nonStandardPromises: e.target.value})}
                          />
                      </div>

                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              2. מה הכאב הכי גדול שלו? (למה הוא קנה)
                              <span className="text-red-500">*</span>
                          </label>
                          <textarea 
                              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm h-24"
                              placeholder="לדוגמה: שחיקה של הצוות, חוסר סדר בכספים..."
                              value={formData.biggestPain}
                              onChange={e => setFormData({...formData, biggestPain: e.target.value})}
                          />
                      </div>

                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              3. מה הציפייה שלו ל-30 יום הראשונים? (הישג מהיר)
                              <span className="text-red-500">*</span>
                          </label>
                          <textarea 
                              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm h-24"
                              placeholder="לדוגמה: לראות דוח כספי ראשון, לקבל גישה לקורס..."
                              value={formData.expectations30Days}
                              onChange={e => setFormData({...formData, expectations30Days: e.target.value})}
                          />
                      </div>
                  </div>
              </div>
          )}

          {/* STEP 2: REVIEW PAYLOAD */}
          {step === 'review' && (
            <div className="space-y-8 animate-slide-up">
              
              {/* Review Handover Data */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wide">
                      <ShieldCheck size={16} /> נתוני מסירה (אושר ע"י מערכת)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100/50 shadow-sm">
                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">הבטחות חריגות</div>
                          <div className="text-xs font-medium text-slate-800">{formData.nonStandardPromises}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100/50 shadow-sm">
                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">הכאב המרכזי</div>
                          <div className="text-xs font-medium text-slate-800">{formData.biggestPain}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100/50 shadow-sm">
                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">ציפייה (30 יום)</div>
                          <div className="text-xs font-medium text-slate-800">{formData.expectations30Days}</div>
                      </div>
                  </div>
              </div>

              {/* Deal Summary Card (The "Passport") */}
              <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl relative overflow-hidden ring-1 ring-white/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex-1">
                          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                              <Briefcase size={12} /> סיכום עסקה
                          </div>
                          <h2 className="text-3xl font-bold tracking-tight mb-1">{String((payload?.deal_details as Record<string, unknown>)?.package_type ?? '').replace(/_/g, ' ') || 'Package'}</h2>
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-mono">
                              <span>מזהה: {lead.id}</span>
                              <span>•</span>
                              <span>{lead.email}</span>
                          </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl min-w-[140px] text-center">
                          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">שווי סגירה</div>
                          <div className="text-3xl font-mono font-bold text-emerald-400">₪{Number((payload?.deal_details as Record<string, unknown>)?.value || 0).toLocaleString() || lead.value.toLocaleString()}</div>
                      </div>
                  </div>
              </div>

              {/* Toggle JSON */}
              <div>
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <FileJson size={16} className="text-slate-400" />
                          נתונים טכניים (JSON)
                      </h4>
                      <button 
                        onClick={() => setShowJson(!showJson)}
                        className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                      >
                          {showJson ? 'הסתר קוד' : 'הצג מבנה נתונים'}
                      </button>
                  </div>
                  
                  {showJson && (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto relative shadow-inner animate-slide-down">
                         <pre className="leading-relaxed">{JSON.stringify({...payload, handover: formData}, null, 2)}</pre>
                      </div>
                  )}
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-8 h-full">
               {/* Animated Server Graphic */}
               <div className="relative w-32 h-32">
                  <div className="absolute inset-0 bg-indigo-50 rounded-full animate-ping opacity-20"></div>
                  <div className="absolute inset-4 bg-white rounded-full shadow-lg border-4 border-indigo-50 flex items-center justify-center z-10">
                      <Database size={40} className="text-indigo-600 animate-pulse" />
                  </div>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="48" fill="none" stroke="#e0e7ff" strokeWidth="2" strokeDasharray="20 10" />
                  </svg>
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="48" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="4" 
                        strokeDasharray="301"
                        strokeDashoffset={301 - (301 * progress) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-300 ease-linear"
                      />
                  </svg>
               </div>

               <div className="w-full max-w-sm space-y-4">
                   <div className="text-center">
                      <h4 className="text-xl font-bold text-slate-800 mb-1">מסנכרן נתונים...</h4>
                      <p className="text-sm text-slate-500 font-medium">{Math.round(progress)}% הושלם</p>
                   </div>
                   <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-emerald-400 h-40 overflow-y-auto custom-scrollbar shadow-inner border border-slate-800">
                       {logs.map((log, i) => (
                           <div key={i} className="mb-1 opacity-80">{'>'} {log}</div>
                       ))}
                       <div className="animate-pulse text-white">{'>'} _</div>
                   </div>
               </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-6 animate-scale-in text-center h-full">
               <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border-4 border-emerald-100 shadow-xl mb-4">
                  <CircleCheck size={48} />
               </div>
               
               <div className="space-y-2 max-w-md">
                  <h4 className="text-3xl font-bold text-slate-800">העסקה נקלטה בהצלחה!</h4>
                  <p className="text-slate-500 font-medium text-lg">
                     תיק הלקוח נוצר, משימות נפתחו, והעמלה נרשמה לזכותך.
                  </p>
               </div>

               <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex items-center gap-6 mt-4 shadow-sm">
                   <div>
                       <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">מזהה פרויקט</div>
                       <div className="font-mono font-bold text-slate-900 text-xl tracking-tight">NXS-{Math.floor(Math.random() * 100000)}</div>
                   </div>
                   <div className="h-10 w-px bg-slate-200"></div>
                   <div>
                       <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">סטטוס עמלה</div>
                       <div className="font-bold text-emerald-600 flex items-center gap-1.5"><Lock size={16} /> מאושר</div>
                   </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-between gap-3 relative z-10">
          
          {step === 'form' && (
              <>
                <button onClick={onClose} className="px-6 py-3 text-slate-600 text-sm font-bold hover:bg-slate-50 rounded-xl transition-colors">
                    ביטול
                </button>
                <div className="flex items-center gap-4">
                    {!isFormValid && (
                        <span className="text-xs text-red-500 font-bold animate-pulse">
                            * חובה למלא את כל השדות
                        </span>
                    )}
                    <button 
                        onClick={() => setStep('review')} 
                        disabled={!isFormValid}
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                        המשך לסקירה <ArrowRight size={18} />
                    </button>
                </div>
              </>
          )}

          {step === 'review' && (
            <>
              <button onClick={() => setStep('form')} className="px-6 py-3 text-slate-600 text-sm font-bold hover:bg-slate-50 rounded-xl transition-colors">
                חזור לעריכה
              </button>
              <button 
                onClick={() => setStep('sending')} 
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                אשר וסנכרן סופית <CircleCheck size={18} />
              </button>
            </>
          )}

          {step === 'sending' && (
             <button disabled className="w-full px-6 py-3 bg-slate-100 text-slate-400 text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                <Skeleton className="w-[18px] h-[18px] rounded-full" /> מעבד נתונים...
             </button>
          )}

          {step === 'success' && (
             <button 
                onClick={() => onConfirm(formData)} 
                className="w-full px-10 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
             >
                חזור ללוח העסקאות
             </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default HandoverDialog;
