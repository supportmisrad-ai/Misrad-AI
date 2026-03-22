'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { useTelephonyOptional } from '@/contexts/TelephonyContext';

interface CallButtonProps {
  /**
   * Phone number to call (destination)
   */
  phoneNumber: string;
  
  /**
   * Optional: Additional CSS classes
   */
  className?: string;
  
  /**
   * Optional: Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Optional: Variant style
   */
  variant?: 'default' | 'icon' | 'text';
  
  /**
   * Optional: Callback when call is initiated
   */
  onCallInitiated?: (phoneNumber: string) => void;
  
  /**
   * Optional: Current user object with phone property
   */
  user?: { phone?: string; [key: string]: unknown };
  
  /**
   * Optional: Toast function for notifications
   */
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * CallButton - Shared component for initiating telephony calls
 * 
 * Can be used in:
 * - System (Lead cards)
 * - Nexus (Client cards)
 * - Client (Student cards)
 * 
 * @example
 * <CallButton phoneNumber="0501234567" user={user} onToast={addToast} />
 * <CallButton phoneNumber={lead.phone} size="sm" variant="icon" user={user} onToast={addToast} />
 */
export const CallButton: React.FC<CallButtonProps> = ({
  phoneNumber,
  className = '',
  size = 'md',
  variant = 'default',
  onCallInitiated,
  user,
  onToast
}) => {
  const [isCalling, setIsCalling] = React.useState(false);

  const telephony = useTelephonyOptional();

  const handleCall = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!phoneNumber || isCalling) return;

    // Check if telephony is configured
    if (!telephony?.config?.isActive) {
      if (onToast) {
        onToast('טלפוניה לא מוגדרת במערכת', 'error');
      }
      return;
    }

    setIsCalling(true);

    try {
      // Use TelephonyContext to initiate call
      const result = await telephony.initiateCall(phoneNumber);

      if (!result.success) {
        throw new Error(result.error || 'שגיאה בהפעלת השיחה');
      }
      
      // Show success toast
      if (onToast) {
        onToast('שיחה הופעלה בהצלחה', 'success');
      }

      // Call callback if provided
      if (onCallInitiated) {
        onCallInitiated(phoneNumber);
      }
    } catch (error: unknown) {
      console.error('Error initiating call:', error);
      if (onToast) {
        onToast((error instanceof Error ? error.message : String(error)) || 'שגיאה בהפעלת השיחה', 'error');
      }
    } finally {
      setIsCalling(false);
    }
  };

  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  // Variant styles
  if (variant === 'icon') {
    return (
      <button
        onClick={handleCall}
        disabled={isCalling || !phoneNumber}
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          flex items-center justify-center 
          transition-all 
          ${isCalling 
            ? 'bg-gray-200 cursor-not-allowed' 
            : 'bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 hover:shadow-md'
          }
          ${className}
        `}
        title={`התקשר ל-${phoneNumber}`}
      >
        <Phone 
          size={iconSizes[size]} 
          className={isCalling ? 'animate-pulse' : ''}
        />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleCall}
        disabled={isCalling || !phoneNumber}
        className={`
          flex items-center gap-2
          text-sm font-medium
          transition-colors
          ${isCalling
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-green-600 hover:text-green-700'
          }
          ${className}
        `}
      >
        <Phone size={16} />
        {isCalling ? 'מתקשר...' : 'התקשר'}
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleCall}
      disabled={isCalling || !phoneNumber}
      className={`
        ${sizeClasses[size]}
        rounded-xl
        flex items-center justify-center
        font-bold
        transition-all
        transform hover:scale-105 active:scale-95
        ${isCalling
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
        }
        ${className}
      `}
      title={`התקשר ל-${phoneNumber}`}
    >
      <Phone 
        size={iconSizes[size]} 
        className={isCalling ? 'animate-pulse' : ''}
      />
    </button>
  );
};

export default CallButton;

