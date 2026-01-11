/**
 * Trial & Subscription Management
 * Handles trial period logic, expiration checks, and subscription status
 */

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export interface TrialInfo {
  status: SubscriptionStatus;
  trialStartDate: Date | null;
  trialDays: number;
  trialEndDate: Date | null;
  daysRemaining: number | null; // null if not in trial
  isExpired: boolean;
  isActive: boolean;
}

/**
 * Calculate trial end date based on start date and trial days
 */
export function calculateTrialEndDate(startDate: Date, trialDays: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + trialDays);
  return endDate;
}

/**
 * Calculate days remaining in trial
 * Returns null if not in trial period
 */
export function calculateDaysRemaining(
  trialStartDate: Date | null,
  trialDays: number,
  currentStatus: SubscriptionStatus | null
): number | null {
  if (!trialStartDate || currentStatus !== 'trial') {
    return null;
  }

  const endDate = calculateTrialEndDate(trialStartDate, trialDays);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(
  trialStartDate: Date | null,
  trialDays: number,
  currentStatus: SubscriptionStatus | null
): boolean {
  if (!trialStartDate || currentStatus !== 'trial') {
    return false; // Not in trial, so can't be expired
  }

  const endDate = calculateTrialEndDate(trialStartDate, trialDays);
  return new Date() > endDate;
}

/**
 * Get comprehensive trial information
 */
export function getTrialInfo(
  trialStartDate: Date | null,
  trialDays: number,
  currentStatus: SubscriptionStatus | null,
  subscriptionStartDate: Date | null
): TrialInfo {
  const isActiveStatus = currentStatus === 'active';
  const isTrialStatus = currentStatus === 'trial';
  const isExpiredStatus = currentStatus === 'expired' || currentStatus === 'cancelled';
  
  // If in trial, check if it's expired
  const expired = isTrialStatus && isTrialExpired(trialStartDate, trialDays, currentStatus);
  
  // Final status: if trial expired, mark as expired
  const finalStatus: SubscriptionStatus = expired ? 'expired' : (currentStatus || 'trial');

  const trialEndDate = trialStartDate 
    ? calculateTrialEndDate(trialStartDate, trialDays)
    : null;

  const daysRemaining = calculateDaysRemaining(
    trialStartDate,
    trialDays,
    finalStatus === 'trial' ? 'trial' : null
  );

  return {
    status: finalStatus,
    trialStartDate,
    trialDays,
    trialEndDate,
    daysRemaining,
    isExpired: finalStatus === 'expired' || finalStatus === 'cancelled',
    isActive: finalStatus === 'active',
  };
}

/**
 * Initialize trial for new user
 */
export function initializeTrial(trialDays: number = 30): {
  trialStartDate: Date;
  trialDays: number;
  subscriptionStatus: SubscriptionStatus;
} {
  return {
    trialStartDate: new Date(),
    trialDays,
    subscriptionStatus: 'trial',
  };
}

/**
 * Default trial days (can be configured in admin panel)
 */
export const DEFAULT_TRIAL_DAYS = 30;

