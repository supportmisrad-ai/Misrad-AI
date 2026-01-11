/**
 * Shabbat Mode Utilities
 * Calculates Shabbat times and manages Shabbat mode state
 */

import { HDate, Location, Zmanim } from '@hebcal/core';
// import { formatInTimeZone } from 'date-fns-tz'; - removed to avoid dependency issue

export interface ShabbatTimes {
  candleLighting: Date; // הדלקת נרות (18 דקות לפני השקיעה)
  shabbatStart: Date; // תחילת שבת (שקיעה)
  shabbatEnd: Date; // צאת הכוכבים (42 דקות אחרי השקיעה)
  isShabbat: boolean; // האם כרגע שבת
  timeUntilEnd: number; // זמן עד צאת הכוכבים במילישניות (אם שבת)
  nextShabbat: Date; // השבת הבאה
}

// Default location: Tel Aviv, Israel
const DEFAULT_LATITUDE = 32.0853;
const DEFAULT_LONGITUDE = 34.7818;
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

/**
 * Calculate Shabbat times for a given date and location
 */
export function calculateShabbatTimes(
  date: Date = new Date(),
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE,
  timezone: string = DEFAULT_TIMEZONE
): ShabbatTimes {
  // Use Location.lookup for Tel Aviv (default), or create custom location if user provided coordinates
  let location: Location;
  const telAviv = Location.lookup('Tel Aviv');
  if (telAviv && latitude === DEFAULT_LATITUDE && longitude === DEFAULT_LONGITUDE) {
    // Use Tel Aviv as default
    location = telAviv;
  } else {
    // Create custom location with user's coordinates
    // Location constructor signature: (latitude, longitude, il: boolean, tzid: string, cityName?, countryCode?, geoid?, elevation?)
    // il = in Israel (true) or Diaspora (false)
    // For Israel, use true; for other locations, use false
    const isInIsrael = latitude >= 29 && latitude <= 33 && longitude >= 34 && longitude <= 36;
    location = new Location(latitude, longitude, isInIsrael, timezone, 'Custom', undefined, undefined, 0);
  }
  
  const hdate = new HDate(date);
  
  // Get Friday (ערב שבת) - find the Friday before or on the given date
  let friday = new Date(date);
  const dayOfWeek = friday.getDay(); // 0 = Sunday, 5 = Friday
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5 - dayOfWeek + 7;
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  
  // If it's already Friday and past sunset, get next Friday
  if (dayOfWeek === 5) {
    const zmanim = new Zmanim(location, date, false);
    const sunset = zmanim.sunset();
    if (date > sunset) {
      friday.setDate(friday.getDate() + 7);
    }
  }
  
  const fridayHDate = new HDate(friday);
  const zmanim = new Zmanim(location, friday, false);
  
  // Calculate times
  const sunset = zmanim.sunset(); // שקיעה = תחילת שבת
  const candleLighting = new Date(sunset.getTime() - 18 * 60 * 1000); // 18 דקות לפני השקיעה
  const shabbatEnd = new Date(sunset.getTime() + 42 * 60 * 1000); // 42 דקות אחרי השקיעה
  
  // Check if currently Shabbat
  const now = new Date();
  const isShabbat = now >= candleLighting && now < shabbatEnd;
  
  // Calculate time until end
  let timeUntilEnd = 0;
  if (isShabbat) {
    timeUntilEnd = shabbatEnd.getTime() - now.getTime();
  }
  
  // Next Shabbat (if current time is after this Shabbat, get next Friday)
  let nextShabbat = candleLighting;
  if (now > shabbatEnd) {
    const nextFriday = new Date(friday);
    nextFriday.setDate(nextFriday.getDate() + 7);
    const nextFridayHDate = new HDate(nextFriday);
    const nextZmanim = new Zmanim(location, nextFriday, false);
    const nextSunset = nextZmanim.sunset();
    nextShabbat = new Date(nextSunset.getTime() - 18 * 60 * 1000);
  }
  
  return {
    candleLighting,
    shabbatStart: sunset,
    shabbatEnd,
    isShabbat,
    timeUntilEnd,
    nextShabbat,
  };
}

/**
 * Format time for display
 */
export function formatShabbatTime(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  // Manual formatting instead of using date-fns-tz
  // Create a formatter for the specific timezone
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format countdown timer
 */
export function formatCountdown(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get user's location from browser (if available)
 */
export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    return null;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(null); // Fallback to default location
      }
    );
  });
}
