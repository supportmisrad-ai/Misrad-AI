'use client';

import React, { useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, Rocket, ShieldAlert, Users, Zap, CircleCheckBig } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  selector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'ברוכים הבאים ל-Social',
    description: 'מערכת ההפעלה החדשה של משרד הפרסום שלכם. בסיור הקצר הזה נלמד איך להפוך את ניהול הסושיאל לאוטומטי ורווחי יותר.',
    icon: Rocket,
    color: 'bg-blue-600',
    position: 'center'
  },
  {
    title: 'הניווט המהיר',
    description: 'כאן תוכלו לעבור בין דף הבית, לוח השידורים, כל הלקוחות שלכם ותיבת ההודעות המאוחדת.',
    icon: Users,
    color: 'bg-indigo-600',
    selector: '#main-sidebar',
    position: 'left'
  },
  {
    title: 'המרכז המבצעי (Cockpit)',
    description: 'כאן מתחיל היום שלכם. ה-AI סורק אירועים קרובים ומציע לכם הזדמנויות תוכן מוכנות לשיגור.',
    icon: Zap,
    color: 'bg-amber-500',
    selector: '#operational-center',
    position: 'bottom'
  },
  {
    title: 'המכונה (The Machine)',
    description: 'בלחיצת כפתור אחת, Gemini בונה וריאציות של פוסטים בהתאם ל-DNA המדויק של המותג. זה הכפתור הכי חשוב במערכת.',
    icon: Sparkles,
    color: 'bg-purple-600',
    selector: '#main-new-post-btn',
    position: 'top'
  },
  {
    title: 'ניהול משימות חכם',
    description: 'כאן מרוכזות כל הפעולות הדחופות שדורשות תשומת לב - מאישורי לקוח ועד גבייה בפיגור.',
    icon: CircleCheckBig,
    color: 'bg-green-600',
    selector: '#tasks-panel-section',
    position: 'right'
  },
  {
    title: 'גבייה ואוטומציה',
    description: 'אנחנו מנהלים עבורכם את הגבייה. בלחיצה כאן תראו מי חייב כסף ואילו אוטומציות "רודפות" אחריו כרגע.',
    icon: ShieldAlert,
    color: 'bg-red-600',
    selector: '#collection-button',
    position: 'left'
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateHighlight = () => {
      if (step.selector) {
        const el = document.querySelector(step.selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightRect(el.getBoundingClientRect());
        } else {
          setHighlightRect(null);
        }
      } else {
        setHighlightRect(null);
      }
    };

    updateHighlight();
    
    // Throttled resize handler
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttledResize = () => {
        if (resizeTimeout) return;
        resizeTimeout = setTimeout(() => {
            updateHighlight();
            resizeTimeout = null;
        }, 100);
    };
    window.addEventListener('resize', throttledResize);
    
    // Throttled scroll handler
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttledScroll = () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
            updateHighlight();
            scrollTimeout = null;
        }, 50);
    };
    window.addEventListener('scroll', throttledScroll);
    
    const timer = setTimeout(updateHighlight, 500);

    return () => {
      window.removeEventListener('resize', throttledResize);
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(timer);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [currentStep, isOpen, step.selector]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) onClose();
    else setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const getTooltipPosition = () => {
    if (!highlightRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const padding = 24;
    switch (step.position) {
      case 'top':
        return { bottom: window.innerHeight - highlightRect.top + padding, left: highlightRect.left + highlightRect.width / 2, transform: 'translateX(-50%)' };
      case 'bottom':
        return { top: highlightRect.bottom + padding, left: highlightRect.left + highlightRect.width / 2, transform: 'translateX(-50%)' };
      case 'left':
        return { top: highlightRect.top + highlightRect.height / 2, right: window.innerWidth - highlightRect.left + padding, transform: 'translateY(-50%)' };
      case 'right':
        return { top: highlightRect.top + highlightRect.height / 2, left: highlightRect.right + padding, transform: 'translateY(-50%)' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const IconComponent = step.icon;

  return (
    <div className="fixed inset-0 z-[600] overflow-hidden" dir="rtl">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <motion.rect 
                initial={false}
                animate={{ 
                  x: highlightRect.x - 8, 
                  y: highlightRect.y - 8, 
                  width: highlightRect.width + 16, 
                  height: highlightRect.height + 16,
                  rx: 24 
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                fill="black" 
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.85)" mask="url(#spotlight-mask)" className="backdrop-blur-[2px]" />
      </svg>

      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'fixed', ...getTooltipPosition() }}
        className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
      >
        <div className="p-8 md:p-10 flex flex-col items-center text-center gap-6">
          <AnimatePresence mode="sync">
            <motion.div 
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`w-16 h-16 ${step.color} text-white rounded-2xl flex items-center justify-center shadow-lg`}
            >
              <IconComponent size={32} />
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{step.title}</h2>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${currentStep === i ? 'w-6 bg-slate-900' : 'w-1.5 bg-slate-100'}`} />
            ))}
          </div>
        </div>

        <div className="px-8 pb-8 pt-2 flex items-center justify-between">
          <button onClick={onClose} className="text-slate-400 font-black text-[10px] uppercase hover:text-slate-900 transition-all">דלג</button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={handlePrev} 
                className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"
              >
                <ChevronRight size={18}/>
              </button>
            )}
            <button 
              onClick={handleNext} 
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs shadow-xl hover:bg-black transition-all flex items-center gap-2 active:scale-95"
            >
              {isLastStep ? 'הבנתי, תודה!' : 'הבא'} 
              {!isLastStep && <ChevronLeft size={16}/>}
              {isLastStep && <CircleCheckBig size={16} className="text-green-400" />}
            </button>
          </div>
        </div>
      </motion.div>

      <button 
        onClick={onClose} 
        className="fixed top-8 right-8 p-4 bg-white/10 text-white hover:bg-white/20 rounded-2xl transition-all border border-white/10"
      >
        <X size={24} />
      </button>
    </div>
  );
}

