# תוכנית תיקוני Performance - MISRAD AI
## נכון ל: 15 במרץ 2026

## סיכום ממצאים

### בעיות שזוהו:

1. **Social Module - טעינת דאטה כבדה מדי**
   - `getSocialInitialData` מושך 9 מקורות נתונים במקביל (טוב) אבל הכמות עצומה:
     - clients (עד 200 רשומות)
     - team members
     - posts (עם signing URLs)
     - tasks
     - conversations (עם avatar signing)
     - clientRequests
     - managerRequests
     - ideas
     - activity logs
   - **בעיה**: כל הנתונים נטענים בבת אחת, גם אם לא נחוצים מיד

2. **Operations Module - חסר Streaming**
   - הדשבורד מחכה לכל הנתונים לפני הרנדור
   - שאילתות SQL מורכבות עם JOINs

3. **ClientOnlyWidgets - ללא requestIdleCallback אופטימלי**
   - ה-timeout של 2 שניות קצר מדי וגורם להפרעה בטעינה
   - יש לייצר אותם רק אחרי hydration מלא

4. **Suspense Boundaries - חסרים בכמה מקומות**
   - חלק מהמודולים לא מפעילים loading states מיידיים

---

## תוכנית פעולה מפורטת

### שלב 1: אופטימיזציית Social Module (PRIORITY: CRITICAL)
- [ ] פיצול getSocialInitialData ל-3 שלבים:
  - שלב 1: נתונים קריטיים (clients, posts, counters)
  - שלב 2: נתונים משניים (tasks, conversations)
  - שלב 3: נתונים רקע (activity, requests, ideas)
- [ ] הוספת Suspense boundaries בין השלבים
- [ ] הוספת stale-while-revalidate caching

### שלב 2: אופטימיזציית Operations Module (PRIORITY: HIGH)
- [ ] הוספת Suspense לדשבורד עם skeleton loading
- [ ] פיצול הדשבורד ל-3 קומפוננטות נפרדות
- [ ] הוספת defer לנתונים לא קריטיים

### שלב 3: ClientOnlyWidgets אופטימיזציה (PRIORITY: MEDIUM)
- [ ] הגדלת timeout ל-5 שניות
- [ ] שימוש ב-intersection observer להפעלה
- [ ] הוספת priority flags ל-widgets קריטיים

### שלב 4: General Improvements (PRIORITY: MEDIUM)
- [ ] הוספת prefetch לנתיבים נפוצים
- [ ] אופטימיזציית images עם sizes ו-priority
- [ ] Lazy loading לקומפוננטות כבדות

---

## קבצים שיועברו שינוי

1. `lib/services/social-service.ts` - פיצול טעינת נתונים
2. `app/w[orgSlug]/(modules)/social/SocialLayoutShell.tsx` - הוספת Suspense
3. `app/w[orgSlug]/(modules)/operations/page.tsx` - אופטימיזציית דשבורד
4. `app/ClientOnlyWidgets.tsx` - שיפור requestIdleCallback
5. `components/social/Dashboard.tsx` - lazy loading לקומפוננטות כבדות
6. `views/OperationsDashboard.tsx` - הוספת Suspense boundaries

---

## מדדי הצלחה

- [ ] Time to First Byte (TTFB) < 200ms
- [ ] First Contentful Paint (FCP) < 1.5s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Interaction to Next Paint (INP) < 200ms

