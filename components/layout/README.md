# Layout Components

תיקייה זו מכילה את כל הקומפוננטות של Layout שהופרדו מהקובץ הראשי `Layout.tsx`.

## מבנה הקבצים

### `layout.types.ts`
- Constants: `NAV_ITEMS`, `PRIMARY_NAV_PATHS`
- Helper functions: `getMobileGridStyles`

### `Sidebar.tsx`
- קומפוננטת ה-Sidebar הראשית
- כוללת: Navigation, Business Switcher, Quick Actions

### `Header.tsx`
- קומפוננטת ה-Header
- כוללת: Search, Notifications, Profile, OS Modules

### `LayoutModals.tsx`
- כל ה-Modals שמופיעים ב-Layout
- כולל: MorningBriefing, VoiceRecorder, CreateTaskModal, TaskDetailModal, IncomingCall, LastDeletedTask

### `MobileMenu.tsx`
- תפריט נייד מלא
- כולל: Plus Menu, Mobile Menu, Bottom Navigation

## שימוש

כל הקומפוננטות מיובאות ב-`Layout.tsx`:

```tsx
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { LayoutModals } from './layout/LayoutModals';
import { MobileMenu } from './layout/MobileMenu';
```

## יתרונות הפיצול

1. ✅ **קל לתחזוקה** - כל קומפוננטה עם אחריות אחת
2. ✅ **קל לבדיקה** - כל קומפוננטה בנפרד
3. ✅ **קל לשיתוף** - Sidebar יכול לשמש במקומות אחרים
4. ✅ **קל לקריאה** - Layout.tsx עכשיו רק 427 שורות (במקום 1065)

## הערות

- כל התוכן המקורי נשמר
- אין שינוי בפונקציונליות
- רק ארגון מחדש של הקוד

