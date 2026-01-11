
import React, { useState, useEffect } from 'react';

interface GlobalProcessorProps {
  // This component subscribes to global events
}

export const GlobalProcessor: React.FC<GlobalProcessorProps> = () => {
  const [isActive, setIsActive] = useState(false);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const handleStart = (e: CustomEvent) => {
        setIsActive(false);
        setFileName(e.detail.fileName || '');
        window.dispatchEvent(
          new CustomEvent('nexus-toast', { detail: { message: 'עיבוד אוטומטי אינו זמין כרגע.', type: 'info' } })
        );
    };

    window.addEventListener('nexus-start-processing', handleStart as EventListener);
    return () => window.removeEventListener('nexus-start-processing', handleStart as EventListener);
  }, []);

  // Render nothing - it's a background process now
  if (!isActive) return null;

  return null;
};
