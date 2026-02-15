
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { ArrowLeft, Check, Compass, X } from 'lucide-react';
import { useNexusNavigation } from '@/lib/os/nexus-routing';

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
        id: 'support',
        targetId: 'support-trigger',
        title: 'תמיכה וסיור מודרך',
        description: 'נתקעת? כאן פותחים תמיכה וגם אפשר להתחיל סיור מודרך מחדש בכל רגע.',
        position: 'bottom'
    },
    {
        id: 'create',
        targetId: 'create-task-btn',
        title: 'המנוע של העסק',
        description: 'כל רעיון או מטלה מתחילים כאן. אל תשאיר כלום בראש, תשפוך לתוך המערכת.',
        position: 'left' // Button is on the right, tooltip goes left
    },
    {
        id: 'attendance',
        targetId: 'time-clock-widget',
        title: 'נוכחות',
        description: 'כאן נכנסים/יוצאים ממשמרת ורואים סטטוס נוכחות.',
        position: 'top'
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
const TOOLTIP_WIDTH_MOBILE = 240; // Further reduced for smaller mobile screens
const GAP = 16;
const MOBILE_PADDING = 20; // Extra padding on mobile for safety

export const TutorialOverlay: React.FC = () => {
    const { isTutorialActive, endTutorial } = useData();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [isMobile, setIsMobile] = useState(false);
    const { navigate } = useNexusNavigation();

    // Detect mobile
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const checkMobile = () => {
            if (typeof window !== 'undefined') {
                setIsMobile(window.innerWidth < 768);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', checkMobile);
            }
        };
    }, []);

    // Start tour -> go to dashboard
    useEffect(() => {
        if (isTutorialActive) {
            navigate('/');
            setCurrentStep(0);
        }
    }, [isTutorialActive, navigate]);

    useLayoutEffect(() => {
        if (!isTutorialActive || typeof window === 'undefined' || typeof document === 'undefined') return;

        const step = STEPS[currentStep];
        const timers: ReturnType<typeof setTimeout>[] = [];

        const findAndHighlight = () => {
            if (typeof window === 'undefined' || typeof document === 'undefined') return false;
            
            if (!step.targetId) {
                setTargetRect(null);
                setTooltipStyle(calculateTooltipPosition(null, 'center', isMobile));
                return true;
            }

            const element = document.getElementById(step.targetId);
            if (!element) return false;

            const rect = element.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && 
                             window.getComputedStyle(element).display !== 'none' &&
                             window.getComputedStyle(element).visibility !== 'hidden';
            
            if (!isVisible) {
                setTargetRect(null);
                setTooltipStyle(calculateTooltipPosition(null, 'center', isMobile));
                return true;
            }

            setTargetRect(rect);
            const position = isMobile && (step.position === 'left' || step.position === 'right') 
                ? 'bottom' 
                : step.position;
            setTooltipStyle(calculateTooltipPosition(rect, position, isMobile));
            return true;
        };

        // Try immediately
        if (!findAndHighlight()) {
            // Retry with increasing delays
            [100, 200, 400, 600, 800, 1000, 1500, 2000].forEach((delay, i) => {
                timers.push(setTimeout(() => {
                    findAndHighlight();
                }, delay));
            });
        }

        // Update on resize/scroll
        const handleUpdate = () => findAndHighlight();
        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);

        return () => {
            timers.forEach(t => clearTimeout(t));
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleUpdate);
                window.removeEventListener('scroll', handleUpdate, true);
            }
        };
    }, [currentStep, isTutorialActive, isMobile]);

    const calculateTooltipPosition = (rect: DOMRect | null, position: string, mobile: boolean = false): React.CSSProperties => {
        // Early return if window/document not available (SSR)
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        if (!rect || position === 'center') {
            const windowWidth = window.innerWidth;
            const safeGap = mobile ? MOBILE_PADDING : GAP;
            const maxAllowedWidth = windowWidth - (safeGap * 2);
            const tooltipWidth = mobile ? TOOLTIP_WIDTH_MOBILE : TOOLTIP_WIDTH;
            const finalWidth = Math.min(tooltipWidth, maxAllowedWidth);
            
            return { 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                position: 'fixed',
                width: mobile ? `${finalWidth}px` : undefined,
                maxWidth: `${finalWidth}px`
            };
        }

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const safeGap = mobile ? MOBILE_PADDING : GAP;
        const tooltipWidth = mobile ? TOOLTIP_WIDTH_MOBILE : TOOLTIP_WIDTH;
        const TOOLTIP_HEIGHT = mobile ? 240 : 280; // Smaller on mobile
        let top = 0;
        let left = 0;

        switch (position) {
            case 'left':
                top = rect.top + (rect.height / 2) - (TOOLTIP_HEIGHT / 2);
                left = rect.left - tooltipWidth - GAP;
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (TOOLTIP_HEIGHT / 2);
                left = rect.right + GAP;
                break;
            case 'bottom':
                top = rect.bottom + GAP;
                left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                break;
            case 'bottom-left':
                top = rect.bottom + GAP;
                left = rect.left; 
                break;
            case 'top':
                top = rect.top - TOOLTIP_HEIGHT - GAP;
                left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                break;
            default:
                top = rect.bottom + GAP;
                left = rect.left;
        }

        // Calculate final width first (before positioning)
        const maxAllowedWidth = windowWidth - (safeGap * 2);
        const finalWidth = Math.min(tooltipWidth, maxAllowedWidth);
        
        // On mobile, always center horizontally for better UX
        if (mobile) {
            left = (windowWidth - finalWidth) / 2;
        }

        // Horizontal Clamping - ensure tooltip stays within viewport
        // First, ensure left edge is within bounds
        if (left < safeGap) {
            left = safeGap;
        }
        // Then, ensure right edge is within bounds (using finalWidth)
        if (left + finalWidth > windowWidth - safeGap) {
            left = Math.max(safeGap, windowWidth - finalWidth - safeGap);
        }

        // Vertical Clamping - ensure tooltip stays within viewport
        if (top < safeGap) {
            top = safeGap;
        } else if (top + TOOLTIP_HEIGHT > windowHeight - safeGap) {
            top = windowHeight - TOOLTIP_HEIGHT - safeGap;
            // If still too high, try positioning above the target
            if (position === 'bottom' && rect.top - TOOLTIP_HEIGHT - safeGap > safeGap) {
                top = rect.top - TOOLTIP_HEIGHT - safeGap;
            }
        }

        // Ensure tooltip doesn't exceed viewport bounds
        const maxAllowedHeight = windowHeight - (safeGap * 2);
        const finalHeight = Math.min(TOOLTIP_HEIGHT, maxAllowedHeight);
        
        // Final bounds check - ensure tooltip is fully within viewport
        // Recalculate left with finalWidth to ensure it fits
        let finalLeft = left;
        // Ensure right edge doesn't exceed viewport
        if (finalLeft + finalWidth > windowWidth - safeGap) {
            finalLeft = windowWidth - finalWidth - safeGap;
        }
        // Ensure left edge doesn't go negative
        if (finalLeft < safeGap) {
            finalLeft = safeGap;
        }
        // Double-check: if still too wide, force center
        if (mobile && finalLeft + finalWidth > windowWidth - safeGap) {
            finalLeft = (windowWidth - finalWidth) / 2;
            // Clamp to safeGap if centered position goes out of bounds
            if (finalLeft < safeGap) {
                finalLeft = safeGap;
            }
        }
        
        const finalTop = Math.max(safeGap, Math.min(top, windowHeight - finalHeight - safeGap));
        
        // On mobile, if tooltip is still too wide, force center positioning
        let finalStyle: React.CSSProperties = {
            position: 'fixed',
            zIndex: 10002,
            maxHeight: `${finalHeight}px`,
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box'
        };

        if (mobile) {
            // On mobile, always use fixed width and ensure it's centered if needed
            finalStyle.width = `${finalWidth}px`;
            finalStyle.maxWidth = `${finalWidth}px`;
            finalStyle.left = `${finalLeft}px`;
            finalStyle.top = `${finalTop}px`;
            finalStyle.right = 'auto';
            finalStyle.bottom = 'auto';
        } else {
            finalStyle.left = `${finalLeft}px`;
            finalStyle.top = `${finalTop}px`;
            finalStyle.maxWidth = `${finalWidth}px`;
        }

        return finalStyle;
    };

    // Early return if SSR or tutorial not active
    if (!isTutorialActive || typeof window === 'undefined' || typeof document === 'undefined') return null;

    const handleNext = () => {
        // Skip steps that aren't relevant on mobile
        let nextStep = currentStep + 1;
        
        if (isMobile) {
            // Skip sidebar step on mobile (it's hidden)
            while (nextStep < STEPS.length && STEPS[nextStep].targetId === 'main-sidebar') {
                nextStep++;
            }
        }
        
        if (nextStep < STEPS.length) {
            setCurrentStep(nextStep);
        } else {
            endTutorial();
        }
    };

    const stepData = STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-auto font-sans overflow-hidden" dir="rtl">
            
            {/* The Backdrop with Cutout Effect */}
            {targetRect ? (
            <motion.div 
                className="absolute"
                initial={false}
                animate={{
                        top: Math.max(0, targetRect.top - 10),
                        left: Math.max(0, targetRect.left - 10),
                        width: Math.min(targetRect.width + 20, typeof window !== 'undefined' ? window.innerWidth : targetRect.width + 20),
                        height: Math.min(targetRect.height + 20, typeof window !== 'undefined' ? window.innerHeight : targetRect.height + 20),
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' // Softer dark overlay
                }}
                transition={{
                    type: "spring",
                    stiffness: 60,
                    damping: 20
                }}
                style={{
                    position: 'fixed',
                    borderRadius: '16px',
                    pointerEvents: 'auto', 
                    backgroundColor: 'transparent',
                    overflow: 'hidden'
                }}
            />
            ) : (
                <motion.div 
                    className="fixed inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        pointerEvents: 'auto'
                }}
            />
            )}

            {/* The Tooltip Card */}
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-3xl shadow-xl ${isMobile ? 'p-4' : 'p-6'} flex flex-col items-start gap-4 border border-gray-100 custom-scrollbar`}
                style={{
                    ...tooltipStyle,
                    // Ensure it doesn't overflow on mobile
                    boxSizing: 'border-box',
                    // Override maxWidth/maxHeight on mobile to ensure it fits - force smaller values
                    ...(isMobile && {
                        maxWidth: `calc(100vw - ${MOBILE_PADDING * 2}px)`,
                        maxHeight: `calc(100vh - ${MOBILE_PADDING * 2}px)`,
                        // Ensure width doesn't exceed viewport
                        width: tooltipStyle.width ? `min(${tooltipStyle.width}, calc(100vw - ${MOBILE_PADDING * 2}px))` : `calc(100vw - ${MOBILE_PADDING * 2}px)`
                    })
                }}
            >
                {!targetRect && (
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-2xl flex items-center justify-center mb-2 shadow-md mx-auto">
                        <Compass size={32} />
                    </div>
                )}
                
                <div className="w-full">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="px-2.5 py-1 bg-indigo-50/80 text-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            שלב {currentStep + 1} מתוך {STEPS.length}
                        </div>
                        {isMobile && (
                            <div className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">
                                📱 מובייל
                            </div>
                        )}
                    </div>
                    <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-black text-gray-900 leading-tight mb-2`}>
                        {stepData.title}
                    </h3>
                    <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} leading-relaxed`}>
                        {stepData.description}
                    </p>
                </div>

                <div className="flex items-center justify-between w-full pt-4 mt-2 border-t border-gray-100">
                    <div className="flex gap-1.5">
                        {STEPS.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStep 
                                        ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500' 
                                        : idx < currentStep
                                        ? 'w-1.5 bg-gray-300'
                                        : 'w-1.5 bg-gray-200'
                                }`} 
                            />
                        ))}
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={endTutorial}
                            className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
                        >
                            דלג
                        </button>
                        <button 
                            onClick={handleNext}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2 shadow-md"
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
