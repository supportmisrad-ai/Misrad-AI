import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProfitBadgeProps {
  amount?: number;
  value?: string; // Alternative to amount if pre-formatted
  isPositive?: boolean; // Manual override if needed
  className?: string;
  label?: string;
}

export const ProfitBadge: React.FC<ProfitBadgeProps> = ({ 
  amount, 
  value,
  isPositive: manualIsPositive,
  className = '',
  label
}) => {
  // Determine positivity logic
  let isPositive = true;
  let isNeutral = false;
  
  if (amount !== undefined) {
    isPositive = amount >= 0;
    isNeutral = amount === 0;
  } else if (manualIsPositive !== undefined) {
    isPositive = manualIsPositive;
  }

  // Styles
  const colorClass = isNeutral 
    ? 'text-gray-400' 
    : isPositive 
      ? 'text-signal-success' 
      : 'text-signal-danger';
      
  const bgClass = isNeutral
    ? 'bg-gray-500/10 border-gray-500/20'
    : isPositive 
      ? 'bg-signal-success/10 border-signal-success/20' 
      : 'bg-signal-danger/10 border-signal-danger/20';

  const Icon = isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${bgClass} ${className}`}>
      <Icon size={14} className={colorClass} />
      <span className={`font-mono font-medium text-sm ${colorClass}`}>
        {label && <span className="mr-1 opacity-70">{label}:</span>}
        {value || (amount !== undefined ? `${amount >= 0 ? '+' : ''}${amount.toLocaleString()}` : '')}
      </span>
    </div>
  );
};
