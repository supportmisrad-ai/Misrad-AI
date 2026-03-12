'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SlotMachineNumberProps {
  value: number;
  className?: string;
}

export function SlotMachineNumber({ value, className }: SlotMachineNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const digits = String(displayValue).split('');

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return (
    <div className={`inline-flex overflow-hidden h-[1.2em] ${className || ''}`} dir="ltr">
      <AnimatePresence mode="popLayout">
        {digits.map((digit, i) => (
          <motion.span
            key={`${i}-${digit}`}
            initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 25,
              delay: i * 0.05 
            }}
            className="inline-block"
          >
            {digit}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
