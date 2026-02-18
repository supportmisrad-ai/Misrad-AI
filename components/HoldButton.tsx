import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, LogOut } from 'lucide-react';

interface HoldButtonProps {
    isActive: boolean;
    onComplete: () => void;
    label: string;
    size?: 'small' | 'normal';
}

export const HoldButton: React.FC<HoldButtonProps> = ({ isActive, onComplete, label, size = 'normal' }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [shouldPulse, setShouldPulse] = useState(false);
    
    // We use State now instead of Ref for progress to ensure the UI updates smoothly 
    // and reacts instantly to the non-linear math.
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<number | null>(null);
    const isCompletingRef = useRef<boolean>(false); // Guard to prevent double calls

    // Pulse animation logic
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const startPulse = () => {
            if (isActive) {
                setShouldPulse(true);
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    setShouldPulse(false);
                }, 3000); 
            } else {
                setShouldPulse(false);
            }
        };

        startPulse();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startPulse();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isActive]);

    // Size configs
    const containerSize = size === 'small' ? 'w-32 h-32' : 'w-40 h-40 md:w-48 md:h-48';
    const iconSize = size === 'small' ? 40 : 64;
    const strokeWidth = 8;

    const startHold = () => {
        setIsHolding(true);
        setProgress(0);
        isCompletingRef.current = false; // Reset guard when starting new hold
        
        intervalRef.current = window.setInterval(() => {
            setProgress((prev) => {
                // PSYCHOLOGICAL SPEED HACK:
                // Instead of linear progress (+2), we accelerate massively at the start.
                // If below 85%, we jump by 12 (very fast).
                // Once we hit 85%, we slow down to 1 (providing a moment to abort if needed).
                // This creates the feeling of "Instant" response while keeping safety.
                const increment = prev < 85 ? 12 : 2; 
                
                const next = prev + increment;
                if (next >= 100 && !isCompletingRef.current) {
                    // Use setTimeout to defer the completion call until after render
                    setTimeout(() => {
                    completeHold();
                    }, 0);
                    return 100;
                }
                return next;
            });
        }, 16); // ~60fps
    };

    const stopHold = () => {
        setIsHolding(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setProgress(0);
        isCompletingRef.current = false; // Reset guard when stopping
    };

    const completeHold = () => {
        // Guard: Prevent double execution
        if (isCompletingRef.current) return;
        isCompletingRef.current = true;
        
        // Clear interval manually here to prevent extra ticks
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsHolding(false);
        setProgress(0);
        
        try { if (navigator.vibrate) navigator.vibrate(50); } catch { /* browser may block vibrate before user interaction */ }
        onComplete();
    };

    return (
        <div 
            className="relative flex flex-col items-center justify-center gap-2 select-none touch-none"
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => { startHold(); }}
            onTouchEnd={stopHold}
        >
            <div className={`relative ${containerSize} cursor-pointer group`}>
                {/* Background Track */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                    <circle 
                        cx="50%" cy="50%" r="46%" 
                        fill="transparent" 
                        stroke={isActive ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
                        strokeWidth={strokeWidth} 
                    />
                    {/* Progress Circle */}
                    {isHolding && (
                        <motion.circle 
                            cx="50%" cy="50%" r="46%" 
                            fill="transparent" 
                            stroke={isActive ? "#fff" : "#000"} 
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: progress / 100 }}
                            transition={{ duration: 0 }} // Controlled by state directly for instant feel
                        />
                    )}
                </svg>

                {/* Inner Button */}
                <motion.div 
                    animate={{ scale: isHolding ? 0.92 : 1 }}
                    className={`absolute inset-2 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-4 
                        ${isActive 
                            ? 'bg-gradient-to-br from-red-500 to-orange-600 border-red-400 shadow-red-900/30' 
                            : 'bg-white border-gray-100 shadow-gray-200'
                        }`}
                >
                    <div className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-white' : 'text-gray-800'}`}>
                        {isActive ? (
                            <LogOut size={size === 'small' ? 32 : 48} strokeWidth={1.5} />
                        ) : (
                            <Fingerprint size={iconSize} strokeWidth={1} className={isHolding ? 'scale-110 transition-transform duration-100' : ''} />
                        )}
                    </div>
                </motion.div>

                {/* Pulse Effect when Active - Limited duration */}
                {isActive && shouldPulse && (
                    <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping pointer-events-none"></div>
                )}
            </div>
            
            <div className="flex flex-col items-center">
                <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${isActive ? 'text-red-300' : 'text-gray-400'}`}>
                    {isHolding ? 'מזהה...' : label}
                </p>
            </div>
        </div>
    );
};
