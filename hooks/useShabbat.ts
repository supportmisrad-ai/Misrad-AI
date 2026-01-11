'use client';

import { useState, useEffect } from 'react';
import { calculateShabbatTimes, ShabbatTimes } from '@/lib/shabbat';

export function useShabbat() {
  const [shabbatTimes, setShabbatTimes] = useState<ShabbatTimes | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Calculate Shabbat times using default location (Tel Aviv)
    // No need to request user location - use default for consistency
    const calculate = () => {
      try {
        const times = calculateShabbatTimes(); // Uses default Tel Aviv coordinates
        setShabbatTimes(times);
        setIsLoading(false);
      } catch (error) {
        console.error('Error calculating Shabbat times:', error);
        // Set default times on error
        setIsLoading(false);
      }
    };

    // Calculate immediately
    calculate();

    // Update every minute
    const interval = setInterval(calculate, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    shabbatTimes,
    isShabbat: shabbatTimes?.isShabbat || false,
    isLoading,
  };
}

