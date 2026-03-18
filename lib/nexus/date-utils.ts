/**
 * Nexus Date Utilities
 * 
 * מודול בטוח לניהול תאריכי dueDate ב-Nexus
 * ה-dueDate יכול להיות Date אובייקט (לפני serialization) או string (אחרי JSON.parse)
 */

/**
 * ממיר dueDate בטוח למחרוזת
 * @param dueDate - יכול להיות Date, string, undefined, או null
 * @returns מחרוזת בפורמט עברי (DD.M) או ריק
 */
export function toDueDateString(dueDate: Date | string | undefined | null): string {
    if (!dueDate) return '';
    
    if (typeof dueDate === 'string') {
        return dueDate;
    }
    
    if (dueDate instanceof Date) {
        const day = dueDate.getDate();
        const month = dueDate.getMonth() + 1;
        return `${day}.${month}`;
    }
    
    return String(dueDate);
}

/**
 * ממיר dueDate בטוח למחרוזת ISO (YYYY-MM-DD)
 * @param dueDate - יכול להיות Date, string, undefined, או null
 * @returns מחרוזת בפורמט ISO או ריק
 */
export function toISODateString(dueDate: Date | string | undefined | null): string {
    if (!dueDate) return '';
    
    if (typeof dueDate === 'string') {
        // אם כבר ISO, החזר כמו שהוא
        if (/^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
            return dueDate.split('T')[0];
        }
        // אם בפורמט עברי DD.M, המר ל-ISO
        if (/^\d{1,2}\.\d{1,2}/.test(dueDate)) {
            const [day, month] = dueDate.split('.').map(Number);
            const year = new Date().getFullYear();
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        return dueDate;
    }
    
    if (dueDate instanceof Date) {
        const year = dueDate.getFullYear();
        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
        const day = String(dueDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return String(dueDate);
}

/**
 * ממיר dueDate בטוח ל-Date אובייקט
 * @param dueDate - יכול להיות Date, string, undefined, או null
 * @returns Date אובייקט או null
 */
export function toDueDateObject(dueDate: Date | string | undefined | null): Date | null {
    if (!dueDate) return null;
    
    if (dueDate instanceof Date) {
        return dueDate;
    }
    
    if (typeof dueDate === 'string') {
        // נסה לפרסר כ-ISO
        if (/^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
            const date = new Date(dueDate);
            if (!isNaN(date.getTime())) return date;
        }
        // נסה לפרסר כעברי DD.M
        if (/^\d{1,2}\.\d{1,2}/.test(dueDate)) {
            const [day, month] = dueDate.split('.').map(Number);
            const year = new Date().getFullYear();
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    return null;
}

/**
 * בודק האם dueDate מכיל ערך תקף
 * @param dueDate - יכול להיות Date, string, undefined, או null
 * @returns boolean
 */
export function hasDueDate(dueDate: Date | string | undefined | null): boolean {
    if (!dueDate) return false;
    if (typeof dueDate === 'string' && !dueDate.trim()) return false;
    return true;
}

/**
 * ממיר dueDate למחרוזת בטוחה ל-string methods כמו startsWith/includes
 * @param dueDate - יכול להיות Date, string, undefined, או null
 * @returns מחרוזת בטוחה (לעולם לא null/undefined)
 */
export function toSafeString(dueDate: Date | string | undefined | null): string {
    if (!dueDate) return '';
    if (typeof dueDate === 'string') return dueDate;
    if (dueDate instanceof Date) {
        const day = dueDate.getDate();
        const month = dueDate.getMonth() + 1;
        return `${day}.${month}`;
    }
    return String(dueDate || '');
}

/**
 * השווה שני dueDate values (תומך ב-Date ו-string)
 * @param a - dueDate ראשון
 * @param b - dueDate שני
 * @returns boolean
 */
export function isSameDueDate(a: Date | string | undefined | null, b: Date | string | undefined | null): boolean {
    const strA = toSafeString(a);
    const strB = toSafeString(b);
    return strA === strB;
}

/**
 * מחזיר הצגת dueDate ידידותית למשתמש
 * @param dueDate - יכול להיות Date, string, undefined, או null
 * @param fallback - טקסט חלופי אם אין dueDate
 * @returns מחרוזת להצגה
 */
export function formatDueDateDisplay(dueDate: Date | string | undefined | null, fallback: string = 'לא הוגדר'): string {
    if (!hasDueDate(dueDate)) return fallback;
    return toDueDateString(dueDate);
}
