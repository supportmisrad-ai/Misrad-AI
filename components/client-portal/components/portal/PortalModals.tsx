import React from 'react';
import { MessageSquareWarning, X, Send, Star, Quote, Copy, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { JourneyStage } from '../../types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface PortalModalsProps {
  showFrictionModal: boolean;
  setShowFrictionModal: (val: boolean) => void;
  frictionText: string;
  setFrictionText: (val: string) => void;
  isSubmittingFeedback: boolean;
  onSubmitFriction: () => void;
  celebratingStage: JourneyStage | null;
  setCelebratingStage: (val: JourneyStage | null) => void;
  testimonialInput: string;
  setTestimonialInput: (val: string) => void;
  generatedTestimonial: { quote: string; linkedinPost: string } | null;
  isGeneratingTestimonial: boolean;
  onGenerateTestimonial: () => void;
}

export const PortalModals: React.FC<PortalModalsProps> = ({
  showFrictionModal,
  setShowFrictionModal,
  frictionText,
  setFrictionText,
  isSubmittingFeedback,
  onSubmitFriction,
  celebratingStage,
  setCelebratingStage,
  testimonialInput,
  setTestimonialInput,
  generatedTestimonial,
  isGeneratingTestimonial,
  onGenerateTestimonial,
}) => {
  useBackButtonClose(showFrictionModal, () => setShowFrictionModal(false));
  return (
    <>
      {showFrictionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-nexus-primary/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                  <MessageSquareWarning size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">משהו לא זורם?</h3>
                  <p className="text-slate-500 text-sm">ספרו לנו מה מעכב אתכם, אנחנו כאן לסדר את זה.</p>
                </div>
              </div>
              <button onClick={() => setShowFrictionModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 pt-0 space-y-6">
              <textarea
                value={frictionText}
                onChange={(e) => setFrictionText(e.target.value)}
                className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-nexus-accent transition-all text-lg resize-none"
                placeholder="תאר בקצרה את הבעיה..."
              />
              <button
                onClick={onSubmitFriction}
                disabled={!frictionText.trim() || isSubmittingFeedback}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-nexus-accent transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmittingFeedback ? <Skeleton className="w-5 h-5 rounded-full bg-white/30" /> : <><Send size={20} /> שלח למנהל הפרויקט</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {celebratingStage && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-nexus-primary/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col p-10 lg:p-14 text-center animate-slide-up">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-nexus-accent via-yellow-400 to-nexus-accent"></div>

            <div className="w-20 h-20 bg-nexus-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Star size={40} className="text-nexus-accent" fill="currentColor" />
            </div>

            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3">כל הכבוד!</h2>
            <p className="text-lg text-slate-500 mb-8">
              סיימנו בהצלחה את שלב <span className="text-slate-900 font-bold">"{celebratingStage.name}"</span>.
            </p>

            {!generatedTestimonial ? (
              <div className="space-y-6 animate-fade-in">
                <h3 className="font-bold text-lg">רוצים לפרגן לצוות במילה?</h3>
                <textarea
                  value={testimonialInput}
                  onChange={(e) => setTestimonialInput(e.target.value)}
                  placeholder="מה היו 3 הדברים הכי טובים בשלב הזה?"
                  className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-nexus-accent transition-all text-center text-lg resize-none"
                />

                <div className="flex gap-4">
                  <button onClick={() => setCelebratingStage(null)} className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600">
                    דלג הפעם
                  </button>
                  <button
                    onClick={onGenerateTestimonial}
                    disabled={!testimonialInput.trim() || isGeneratingTestimonial}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-nexus-accent transition-all flex items-center justify-center gap-2"
                  >
                    {isGeneratingTestimonial ? (
                      <Skeleton className="w-[18px] h-[18px] rounded-full bg-white/30" />
                    ) : (
                      <>
                        <Sparkles size={18} /> הפוך את זה להמלצה יפה
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in text-right">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 italic relative">
                  <Quote size={24} className="absolute -top-3 -right-3 text-nexus-accent opacity-30" />
                  <p className="text-slate-700 leading-relaxed">"{String((generatedTestimonial as Record<string, unknown>).quote || '')}"</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">טיוטה ללינקדאין</span>
                  <p className="text-xs text-blue-900">{String((generatedTestimonial as Record<string, unknown>).linkedinPost || '')}</p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCelebratingStage(null)}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-nexus-accent transition-all"
                  >
                    אישור וסיום
                  </button>
                  <button className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50">
                    <Copy size={18} /> העתק
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
