/**
 * UI Preferences Utility
 * 
 * Manages user UI preferences with localStorage (fast) + DB sync (persistent)
 */

import { UIPreferences } from '../types';

const STORAGE_KEY = 'uiPreferences';

/**
 * Get UI preferences from localStorage (fast, immediate)
 */
export function getUIPreferencesFromStorage(): UIPreferences {
    if (typeof window === 'undefined') {
        return {};
    }
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('[UI Preferences] Error reading from localStorage:', error);
        return {};
    }
}

/**
 * Save UI preferences to localStorage (fast, immediate)
 */
export function saveUIPreferencesToStorage(prefs: UIPreferences): void {
    if (typeof window === 'undefined') {
        return;
    }
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.error('[UI Preferences] Error saving to localStorage:', error);
    }
}

/**
 * Get specific preference from localStorage
 */
export function getUIPreference(key: keyof UIPreferences, defaultValue: boolean = false): boolean {
    const prefs = getUIPreferencesFromStorage();
    return prefs[key] ?? defaultValue;
}

/**
 * Save specific preference to localStorage
 */
export function setUIPreference(key: keyof UIPreferences, value: boolean): void {
    const prefs = getUIPreferencesFromStorage();
    prefs[key] = value;
    saveUIPreferencesToStorage(prefs);
}

/**
 * Sync preferences to database (async, for persistence across devices)
 */
export async function syncUIPreferencesToDB(
    userId: string,
    preferences: UIPreferences,
    updateUserAPI: (userId: string, updates: any) => Promise<any>
): Promise<void> {
    try {
        await updateUserAPI(userId, { uiPreferences: preferences });
    } catch (error) {
        console.error('[UI Preferences] Error syncing to DB:', error);
        // Don't throw - localStorage is the source of truth for immediate UX
    }
}

/**
 * Merge DB preferences with localStorage (DB takes precedence on load)
 */
export function mergeUIPreferences(
    dbPrefs: UIPreferences | undefined,
    storagePrefs: UIPreferences
): UIPreferences {
    // DB preferences take precedence, but localStorage fills in missing values
    return {
        ...storagePrefs,
        ...dbPrefs, // DB overrides localStorage
    };
}
