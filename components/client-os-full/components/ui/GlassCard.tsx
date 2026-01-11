import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hoverEffect = true 
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        glass-card rounded-2xl 
        relative overflow-hidden
        ${hoverEffect ? 'transition-all duration-300 hover:scale-[1.01] hover:border-nexus-primary/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Subtle shine effect on top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent opacity-50 pointer-events-none" />
      
      {children}
    </div>
  );
};