'use client';

/**
 * Offline Backup System using IndexedDB
 * 
 * Provides offline backup and restore functionality for critical data
 */

const DB_NAME = 'nexus_offline_backup';
const DB_VERSION = 2;
const STORE_NAME = 'backups';
const META_STORE_NAME = 'meta';

interface BackupData {
    id: string;
    timestamp: number;
    data: Record<string, unknown>;
    version: string;
}

let db: IDBDatabase | null = null;

async function getMetaValue(key: string): Promise<string | null> {
    if (!db) {
        const initialized = await initOfflineBackup();
        if (!initialized) return null;
    }

    return new Promise((resolve) => {
        if (!db) {
            resolve(null);
            return;
        }

        try {
            const transaction = db.transaction([META_STORE_NAME], 'readonly');
            const store = transaction.objectStore(META_STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const row = request.result as { key: string; value: string } | undefined;
                resolve(row?.value ?? null);
            };

            request.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function setMetaValue(key: string, value: string): Promise<void> {
    if (!db) {
        const initialized = await initOfflineBackup();
        if (!initialized) return;
    }

    return new Promise((resolve) => {
        if (!db) {
            resolve();
            return;
        }

        try {
            const transaction = db.transaction([META_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(META_STORE_NAME);
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

/**
 * Initialize IndexedDB
 */
export async function initOfflineBackup(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve(false);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[Offline Backup] Failed to open IndexedDB');
            resolve(false);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            if (!database.objectStoreNames.contains(META_STORE_NAME)) {
                database.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Create a backup of current data
 */
export async function createOfflineBackup(data: Record<string, unknown>): Promise<string | null> {
    if (!db) {
        const initialized = await initOfflineBackup();
        if (!initialized) return null;
    }

    return new Promise((resolve) => {
        if (!db) {
            resolve(null);
            return;
        }

        const backupId = `backup_${Date.now()}`;
        const backup: BackupData = {
            id: backupId,
            timestamp: Date.now(),
            data,
            version: '1.0.0'
        };

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(backup);

        request.onsuccess = () => {
            console.log('[Offline Backup] Backup created:', backupId);
            resolve(backupId);
        };

        request.onerror = () => {
            console.error('[Offline Backup] Failed to create backup');
            resolve(null);
        };
    });
}

/**
 * Get all backups
 */
export async function getOfflineBackups(): Promise<BackupData[]> {
    if (!db) {
        const initialized = await initOfflineBackup();
        if (!initialized) return [];
    }

    return new Promise((resolve) => {
        if (!db) {
            resolve([]);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        const request = index.getAll();

        request.onsuccess = () => {
            const backups = request.result || [];
            // Sort by timestamp descending (newest first)
            backups.sort((a, b) => b.timestamp - a.timestamp);
            resolve(backups);
        };

        request.onerror = () => {
            console.error('[Offline Backup] Failed to get backups');
            resolve([]);
        };
    });
}

/**
 * Restore from a backup
 */
export async function restoreOfflineBackup(backupId: string): Promise<Record<string, unknown> | null> {
    if (!db) {
        const initialized = await initOfflineBackup();
        if (!initialized) return null;
    }

    return new Promise((resolve) => {
        if (!db) {
            resolve(null);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(backupId);

        request.onsuccess = () => {
            const backup = request.result as BackupData | undefined;
            if (backup) {
                console.log('[Offline Backup] Restoring backup:', backupId);
                resolve(backup.data);
            } else {
                resolve(null);
            }
        };

        request.onerror = () => {
            console.error('[Offline Backup] Failed to restore backup');
            resolve(null);
        };
    });
}

/**
 * Delete a backup
 */
export async function deleteOfflineBackup(backupId: string): Promise<boolean> {
    if (!db) {
        const initialized = await initOfflineBackup();
        if (!initialized) return false;
    }

    return new Promise((resolve) => {
        if (!db) {
            resolve(false);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(backupId);

        request.onsuccess = () => {
            console.log('[Offline Backup] Backup deleted:', backupId);
            resolve(true);
        };

        request.onerror = () => {
            console.error('[Offline Backup] Failed to delete backup');
            resolve(false);
        };
    });
}

/**
 * Auto-backup on data changes (call this when data changes)
 */
export async function autoBackup(data: Record<string, unknown>): Promise<void> {
    // Only backup if offline or if last backup was more than 1 hour ago
    const lastBackupTime = await getMetaValue('last_offline_backup');
    const now = Date.now();
    
    if (lastBackupTime) {
        const timeSinceLastBackup = now - parseInt(lastBackupTime);
        // Only backup if more than 1 hour has passed
        if (timeSinceLastBackup < 3600000) {
            return;
        }
    }

    // Check if online
    if (navigator.onLine) {
        // If online, backup to server (handled by regular backup system)
        return;
    }

    // If offline, create local backup
    await createOfflineBackup(data);
    await setMetaValue('last_offline_backup', now.toString());
}

/**
 * Get backup size estimate
 */
export function getBackupSizeEstimate(data: Record<string, unknown>): string {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
        return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
}
