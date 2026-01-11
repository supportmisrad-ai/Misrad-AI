
import React, { useState } from 'react';
import { X, Video, PenTool, Sparkles, Camera, Loader2, Check } from 'lucide-react';
import { generateVideoScript } from '../services/geminiService';

interface TestimonialPromptProps {
  clientName: string;
  onClose: () => void;
}

const TestimonialPrompt: React.FC<TestimonialPromptProps> = ({ clientName, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<string | null>(null);

  const handleDraftScript = async () => {
    setIsGenerating(true);
    try {
      const result = await generateVideoScript(clientName, "סיום מוצלח של שלב אפיון המערכת");
      setScript(result.script);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-full bg-[#0F172A] rounded-[40px] p-8 lg:p-12 text-white overflow-hidden shadow-2xl border border-white/5 animate-slide-up group">
      {/* Top Left Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 left-8 p-2 text-white/30 hover:text-white transition-colors z-20"
      >
        <X size={20} />
      </button>

      {/* Gold Badge */}
      <div className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1 bg-[#C5A572]/10 border border-[#C5A572]/30 rounded-full">
        <span className="text-[10px] font-black text-[#C5A572] uppercase tracking-[0.1em]">Moment of Success</span>
        <Sparkles size={12} className="text-[#C5A572]" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left Side: App Mockup Illustration */}
        <div className="w-full lg:w-[45%] flex-shrink-0">
          <div className="aspect-[16/10] bg-[#1E293B] rounded-3xl border border-white/10 shadow-2xl p-6 relative overflow-hidden flex flex-col gap-4">
             {/* Browser Buttons */}
             <div className="flex gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
             </div>
             
             {/* Content Simulation Lines */}
             <div className="space-y-3">
                <div className="h-4 w-3/4 bg-white/5 rounded-full"></div>
                <div className="h-4 w-full bg-white/5 rounded-full"></div>
                <div className="h-4 w-1/2 bg-white/5 rounded-full opacity-50"></div>
             </div>

             {/* Central Camera Icon */}
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-[#C5A572]/30 bg-[#C5A572]/10 flex items-center justify-center shadow-[0_0_30px_rgba(197,165,114,0.1)] group-hover:scale-110 transition-transform duration-500">
                    <Camera size={32} className="text-[#C5A572]" />
                </div>
             </div>
             
             {/* Bottom Decoration */}
             <div className="mt-auto flex justify-end">
                <div className="w-24 h-8 bg-white/5 rounded-xl"></div>
             </div>
          </div>
        </div>

        {/* Right Side: Content & Actions */}
        <div className="flex-1 text-right space-y-6">
          <h2 className="text-4xl lg:text-5xl font-display font-black text-white leading-tight">
            אוהבים את התוצאות?<br />
            <span className="text-[#C5A572]">תנו לעולם לדעת.</span>
          </h2>
          <p className="text-white/60 text-lg lg:text-xl font-medium leading-relaxed max-w-xl">
            אנחנו ממש מעריכים את השותפות איתכם. נחמד אם תוכלו להקליט סרטון המלצה קצר של 30 שניות. ה-AI שלנו אפילו ינסח לכם את מה שכדאי להגיד!
          </p>

          <div className="flex flex-col sm:flex-row-reverse gap-4 pt-4">
             {/* Main Action Button */}
             <button className="flex-1 py-4 px-8 bg-transparent border-2 border-white/20 rounded-2xl font-bold text-lg hover:bg-white/5 hover:border-[#C5A572] transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C5A572]/5 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                <span>להקלטה מהירה</span>
                <Video size={20} className="text-white group-hover/btn:text-[#C5A572]" />
             </button>

             {/* AI Script Button */}
             <button 
                onClick={handleDraftScript}
                disabled={isGenerating}
                className="flex-1 py-4 px-8 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3"
             >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <><Sparkles size={18} className="text-[#C5A572]" /> תנסחו לי מה להגיד</>}
             </button>
          </div>

          {/* AI Output (Conditional) */}
          {script && (
            <div className="mt-6 p-6 bg-white/5 border border-[#C5A572]/20 rounded-3xl text-right animate-slide-up relative group/script">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-[#C5A572] uppercase tracking-widest">תסריט מוצע (30 שנ׳)</span>
                    <button onClick={() => setScript(null)} className="text-white/20 hover:text-white"><X size={14}/></button>
                </div>
                <p className="text-white/80 italic text-base leading-relaxed">"{script}"</p>
                <div className="absolute bottom-2 left-4">
                    <Check size={16} className="text-[#C5A572] opacity-50" />
                </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Background Decorative Blur */}
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#C5A572]/10 rounded-full blur-3xl opacity-50"></div>
    </div>
  );
};

export default TestimonialPrompt;
