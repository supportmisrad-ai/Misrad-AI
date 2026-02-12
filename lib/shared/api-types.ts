/**
 * Type-safe API response types
 * מחליף את הדפוס הבעייתי של unwrap(data: any)
 */

import { asObject } from './unknown';

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

export type ApiSuccessResponse<T> = {
  data: T;
  error?: never;
};

export type ApiErrorResponse = {
  data?: never;
  error: string;
  message?: string;
};

/**
 * מחלץ data מתשובת API בצורה בטוחה מבחינת טיפוסים
 * @param response - תשובת API (unknown)
 * @returns הנתונים או null
 */
export function extractData<T = unknown>(response: unknown): T | null {
  const obj = asObject(response);
  if (!obj) return null;
  
  const data = obj.data;
  if (data !== undefined && data !== null) {
    return data as T;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    return obj as T;
  }
  
  return null;
}

/**
 * מחלץ הודעת שגיאה מתשובת API
 */
export function extractError(response: unknown): string | null {
  const obj = asObject(response);
  if (!obj) return null;
  
  const error = obj.error;
  if (typeof error === 'string') return error;
  
  const message = obj.message;
  if (typeof message === 'string') return message;
  
  return null;
}

/**
 * בודק אם תשובת API מכילה שגיאה
 */
export function isErrorResponse(response: unknown): response is ApiErrorResponse {
  const obj = asObject(response);
  return obj !== null && typeof obj.error === 'string';
}
