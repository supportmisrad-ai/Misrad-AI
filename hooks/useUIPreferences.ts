/**
 * useUIPreferences Hook
 * 
 * Manages UI preferences with localStorage (fast) + DB sync (persistent)
 */

import { useState, useEffect, useCallback } from 'react';
import { UIPreferences } from '../types';
import {
    getUIPreferencesFromStorage,
    saveUIPreferencesToStorage,
    getUIPreference,
    setUIPreference,
    syncUIPreferencesToDB,
    mergeUIPreferences
} from '../lib/ui-preferences';

interface UseUIPreferencesOptions {
    userId?: string;
    updateUserAPI?: (userId: string, updates: unknown) => Promise<unknown>;
    syncToDB?: boolean; // Whether to sync to DB (default: true if userId provided)
    debounceMs?: number; // Debounce DB sync (default: 1000ms)
}

export function useUIPreferences(options: UseUIPreferencesOptions = {}) {
    const { userId, updateUserAPI, syncToDB = !!userId, debounceMs = 1000 } = options;
    
    // Load initial preferences from localStorage (fast)
    const [preferences, setPreferences] = useState<UIPreferences>(() => {
        const storagePrefs = getUIPreferencesFromStorage();
        
        // If we have userId and DB preferences, merge them (DB takes precedence)
        // This will be set when user data loads
        return storagePrefs;
    });

    // Debounce timer for DB sync
    const [syncTimer, setSyncTimer] = useState<NodeJS.Timeout | null>(null);

    // Sync to DB (debounced)
    const syncToDatabase = useCallback((prefs: UIPreferences) => {
        if (!syncToDB || !userId || !updateUserAPI) {
            return;
        }

        // Clear existing timer
        if (syncTimer) {
            clearTimeout(syncTimer);
        }

        // Set new timer
        const timer = setTimeout(() => {
            syncUIPreferencesToDB(userId, prefs, updateUserAPI).catch(err => {
                console.error('[useUIPreferences] Sync failed:', err);
            });
        }, debounceMs);

        setSyncTimer(timer);
    }, [syncToDB, userId, updateUserAPI, debounceMs, syncTimer]);

    // Update preference
    const updatePreference = useCallback(<K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => {
        const newPrefs = { ...preferences, [key]: value };
        
        // Update state
        setPreferences(newPrefs);
        
        // Save to localStorage (immediate)
        saveUIPreferencesToStorage(newPrefs);
        
        // Sync to DB (debounced)
        syncToDatabase(newPrefs);
    }, [preferences, syncToDatabase]);

    // Get specific boolean preference
    const getPreference = useCallback(<K extends keyof UIPreferences>(
        key: K, 
        defaultValue: UIPreferences[K]
    ): UIPreferences[K] => {
        return preferences[key] ?? defaultValue;
    }, [preferences]);

    // Load preferences from DB (when user data is available)
    const loadFromDB = useCallback((dbPrefs: UIPreferences | undefined) => {
        const storagePrefs = getUIPreferencesFromStorage();
        const merged = mergeUIPreferences(dbPrefs, storagePrefs);
        
        setPreferences(merged);
        saveUIPreferencesToStorage(merged);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (syncTimer) {
                clearTimeout(syncTimer);
            }
        };
    }, [syncTimer]);

    return {
        preferences,
        updatePreference,
        getPreference,
        loadFromDB
    };
}
