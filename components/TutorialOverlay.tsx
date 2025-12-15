
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Compass, X } from 'lucide-react';

const STEPS = [
    {
        id: 'welcome',
        targetId: '', // Center screen
        title: 'ברוכים הבאים ל-Nexus',
        description: 'המערכת שתעשה לך סדר בראש ובעסק. בוא נצא לסיבוב קצר של 30 שניות.',
        position: 'center'
    },
    {
        id: 'nav',
        targetId: 'main-sidebar',
        title: 'מרכז העצבים',
        description: 'כאן עוברים בין המחלקות: ניהול, מכירות, הפקת תוכן ודוחות.',
        position: 'left' // Sidebar is on the right (RTL), so tooltip goes left
    },
    {
        id: 'create',
        targetId: 'create-task-btn',
        title: 'המנוע של העסק',
        description: 'כל רעיון או מטלה מתחילים כאן. אל תשאיר כלום בראש, תשפוך לתוך המערכת.',
        position: 'left' // Button is on the right, tooltip goes left
    },
    {
        id: 'search',
        targetId: 'command-search-btn',
        title: 'המוח (AI)',
        description: 'חפש כל דבר, או שאל את Nexus Brain שאלות על הביצועים שלך.',
        position: 'bottom'
    },
    {
        id: 'notify',
        targetId: 'notification-trigger',
        title: 'דופק המערכת',
        description: 'עדכונים חיים על מה שקורה בצוות. אם זה דחוף - זה יהיה פה.',
        position: 'bottom'
    },
    {
        id: 'profile',
        targetId: 'user-profile-btn',
        title: 'האזור האישי',
        description: 'שעון נוכחות, הגדרות, החלפת סיסמה והתנתקות מהמערכת.',
        position: 'bottom-left' // Align to left edge or push right
    }
];

const TOOLTIP_WIDTH = 320;
const GAP = 16;

export const TutorialOverlay: React.FC = () => {
    const { isTutorialActive, endTutorial } = useData();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const navigate = useNavigate();

    // Start tour -> go to dashboard
    useEffect(() => {
        if (isTutorialActive) {
            navigate('/');
            setCurrentStep(0);
        }
    }, [isTutorialActive]);

    useLayoutEffect(() => {
        if (!isTutorialActive) return;

        const updatePosition = () => {
            const step = STEPS[currentStep];
            
            if (step.targetId) {
                const element = document.getElementById(step.targetId);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);
                    setTooltipStyle(calculateTooltipPosition(rect, step.position));
                } else {
                    // Fallback if element not found (e.g. mobile view issues)
                    setTargetRect(null); 
                    setTooltipStyle(calculateTooltipPosition(null, 'center'));
                }
            } else {
                setTargetRect(null); // Center mode
                setTooltipStyle(calculateTooltipPosition(null, 'center'));
            }
        };

        // Initial calculation
        updatePosition();
        
        // Recalculate on resize/scroll
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        // Small timeout to allow UI to settle if navigating
        const timer = setTimeout(updatePosition, 300);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            clearTimeout(timer);
        };
    }, [currentStep, isTutorialActive]);

    const calculateTooltipPosition = (rect: DOMRect | null, position: string): React.CSSProperties => {
        if (!rect || position === 'center') {
            return { 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                position: 'fixed' 
            };
        }

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        let top = 0;
        let left = 0;

        switch (position) {
            case 'left':
                top = rect.top;
                left = rect.left - TOOLTIP_WIDTH - GAP;
                // Vertical clamping
                if (top + 200 > windowHeight) top = windowHeight - 220; 
                break;
            case 'right':
                top = rect.top;
                left = rect.right + GAP;
                break;
            case 'bottom':
                top = rect.bottom + GAP;
                left = rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2);
                break;
            case 'bottom-left':
                top = rect.bottom + GAP;
                // Align left edges, but clamp to screen
                left = rect.left; 
                break;
            case 'top':
                top = rect.top - 200; // Approximation
                left = rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2);
                break;
            default:
                top = rect.bottom + GAP;
                left = rect.left;
        }

        // Horizontal Clamping
        if (left < GAP) left = GAP;
        if (left + TOOLTIP_WIDTH > windowWidth - GAP) left = windowWidth - TOOLTIP_WIDTH - GAP;

        // Vertical Clamping
        if (top < GAP) top = GAP;
        if (top > windowHeight - 100) top = windowHeight - 200; // Keep it somewhat visible

        return {
            position: 'absolute',
            top: top,
            left: left,
            zIndex: 10002 // Above the mask
        };
    };

    if (!isTutorialActive) return null;

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            endTutorial();
        }
    };

    const stepData = STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-auto font-sans" dir="rtl">
            
            {/* The Backdrop with Cutout Effect */}
            <motion.div 
                className="absolute"
                initial={false}
                animate={{
                    top: targetRect ? targetRect.top - 10 : '50%',
                    left: targetRect ? targetRect.left - 10 : '50%',
                    width: targetRect ? targetRect.width + 20 : 0,
                    height: targetRect ? targetRect.height + 20 : 0,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)' // The dark overlay
                }}
                transition={{
                    type: "spring",
                    stiffness: 60,
                    damping: 20
                }}
                style={{
                    position: 'absolute',
                    borderRadius: '16px',
                    // IMPORTANT: We block pointer events on the "hole" itself to prevent clicking the underlying button
                    // The shadow handles the rest of the screen. 
                    // To allow interaction, we would need to set pointerEvents to 'none' here, but the user requested fix implies we should block confusing interactions.
                    pointerEvents: 'auto', 
                    backgroundColor: 'transparent'
                }}
            />

            {/* The Tooltip Card */}
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-80 bg-white rounded-3xl shadow-2xl p-6 flex flex-col items-start gap-4 border border-white/20"
                style={tooltipStyle}
            >
                {!targetRect && (
                    <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-2 shadow-xl mx-auto">
                        <Compass size={32} />
                    </div>
                )}
                
                <div className="w-full">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2">
                        {stepData.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        {stepData.description}
                    </p>
                </div>

                <div className="flex items-center justify-between w-full pt-4 mt-2 border-t border-gray-100">
                    <div className="flex gap-1">
                        {STEPS.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-black' : 'w-1.5 bg-gray-200'}`} />
                        ))}
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={endTutorial}
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            דלג
                        </button>
                        <button 
                            onClick={handleNext}
                            className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
                        >
                            {currentStep === STEPS.length - 1 ? 'סיימנו' : 'הבא'} 
                            {currentStep === STEPS.length - 1 ? <Check size={16} /> : <ArrowLeft size={16} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
