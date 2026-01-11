import React from 'react';

export type StatusType = 'success' | 'danger' | 'warning';

interface StatusPulseProps {
  status: StatusType;
  className?: string;
}

export const StatusPulse: React.FC<StatusPulseProps> = ({ status, className = '' }) => {
  const colorMap = {
    success: 'bg-signal-success',
    danger: 'bg-signal-danger',
    warning: 'bg-signal-warning',
  };

  const shadowMap = {
    success: 'shadow-[0_0_8px_#00F5A0]',
    danger: 'shadow-[0_0_8px_#FF4757]',
    warning: 'shadow-[0_0_8px_#F1C40F]',
  };

  return (
    <div className={`relative flex h-3 w-3 ${className}`}>
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorMap[status]}`}></span>
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colorMap[status]} ${shadowMap[status]}`}></span>
    </div>
  );
};
