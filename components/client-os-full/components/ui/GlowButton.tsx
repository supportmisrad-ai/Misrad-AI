import React from 'react';
import { Sparkles } from 'lucide-react';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ElementType;
  isLoading?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({ 
  children, 
  className = '', 
  icon: Icon, 
  isLoading = false,
  disabled,
  ...props 
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center gap-2 px-6 py-3 
        font-display font-semibold text-white tracking-wide
        bg-nexus-primary rounded-xl 
        transition-all duration-300 
        shadow-[0_4px_20px_rgba(112,0,255,0.3)] 
        border border-white/20
        
        hover:bg-nexus-accent hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(112,0,255,0.5)]
        
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100
        
        ${className}
      `}
      {...props}
    >
      {/* Inner gradient overlay for depth */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
      
      {isLoading ? (
        <Sparkles size={18} className="opacity-60" />
      ) : Icon ? (
        <Icon size={18} className="relative z-10" />
      ) : null}
      
      <span className="relative z-10">{isLoading ? 'טוען...' : children}</span>
    </button>
  );
};