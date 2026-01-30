import React from 'react';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({ isLoading, children, className = '', disabled, ...props }) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`px-6 py-3 bg-nexus-primary text-white rounded-xl font-bold shadow-lg shadow-nexus-primary/20 hover:bg-nexus-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  );
};
