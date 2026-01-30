import React from 'react';

export const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...props }) => {
  return <div {...props} className={`glass-card ${className}`} />;
};
