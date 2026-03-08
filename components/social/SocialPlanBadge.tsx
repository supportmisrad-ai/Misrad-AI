'use client';

/**
 * Social Plan Badge - תג התוכנית הנוכחית
 */

import { Crown, Zap, Users, Building2 } from 'lucide-react';
import { SocialPlan } from '@/types/social';
import { getSocialPlanLabel } from '@/lib/social/plan-limits';

interface SocialPlanBadgeProps {
  plan: SocialPlan;
  size?: 'sm' | 'md' | 'lg';
}

const PLAN_COLORS: Record<SocialPlan, { bg: string; text: string; icon: typeof Zap }> = {
  free: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    icon: Zap,
  },
  solo: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: Zap,
  },
  team: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: Users,
  },
  agency: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: Building2,
  },
  enterprise: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: Crown,
  },
};

export default function SocialPlanBadge({ plan, size = 'md' }: SocialPlanBadgeProps) {
  const colors = PLAN_COLORS[plan];
  const Icon = colors.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      <span>{getSocialPlanLabel(plan)}</span>
    </div>
  );
}
