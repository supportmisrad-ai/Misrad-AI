# 🛡️ הגנת middleware.ts - חוקי ברזל

## 📌 כללי יסוד

### ✅ מותר:
- לערוך את `middleware.ts` (בזהירות!)
- להוסיף routes חדשים ל-`isPublicRoute`
- לעדכן לוגיקה של maintenance mode
- להוסיף rate limiting rules

### ❌ אסור בהחלט:
- **למחוק את `middleware.ts`** - זה הלב של המערכת!
- **ליצור `proxy.ts`** - ביצענו מיזוג מלא, יצירתו תשבור הכל!
- **לשנות את export const config** - זה קריטי ל-Next.js
- **למחוק את Clerk middleware** - אבטחה!

---

## 🔧 תחזוקה שוטפת

### בדיקת תקינות:
```bash
npm run check:middleware
```

### הרצת הגנה מחדש:
```bash
npm run protect:middleware
```

### בדיקת גיבויים:
```bash
ls -la backups/protected-core/
```

---

## 🚨 מה לעשות אם proxy.ts נוצר בטעות?

**מחק אותו מיד:**
```bash
rm proxy.ts
# או
Remove-Item proxy.ts -Force
```

**לאחר מחיקה, וודא שהמערכת תקינה:**
```bash
npm run check:middleware
npm run dev
```

---

## 📜 היסטוריה

**פברואר 2026**: ביצענו מיזוג מלא של `proxy.ts` -> `middleware.ts`.  
הסיבה: Next.js 16 migration + conflict resolution.

**לפני המיזוג**: היו שני קבצים שגרמו לקונפליקטים.  
**אחרי המיזוג**: רק `middleware.ts` אחד ויחיד עם כל הלוגיקה.

---

## 🔒 הגנות פעילות

1. ✅ .gitignore מונע commit של proxy.ts
2. ✅ סקריפט ניטור אוטומטי
3. ✅ גיבויים אוטומטיים של middleware.ts
4. ✅ פקודות npm להגנה ובדיקה

---

**זכור**: middleware.ts = הלב של המערכת. טפל בו כאילו זה קוד קריטי לביטחון לאומי! 🇮🇱
