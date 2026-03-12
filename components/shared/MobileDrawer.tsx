import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: string; // e.g. "92vh"
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxHeight = "92vh"
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const y = useMotionValue(0);
  const bgOpacity = useTransform(y, [0, 300], [1, 0]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      // Prevent bounce on iOS
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen, isMobile]);

  if (!isMobile) return null;

  const handleDragEnd = (event: any, info: PanInfo) => {
    const shouldClose = info.offset.y > 100 || (info.velocity.y > 500 && info.offset.y > 0);
    if (shouldClose) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: bgOpacity }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          {/* Drawer */}
            <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            style={{ y, maxHeight }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="relative w-full bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Handle Bar Area - Larger touch target for dragging */}
            <div className="w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 shrink-0">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
                <button 
                  onClick={onClose}
                  className="p-2 bg-slate-100 text-slate-500 rounded-full active:scale-90 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar overscroll-contain">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-6 border-t border-slate-50 bg-white/80 backdrop-blur-md safe-area-bottom shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
