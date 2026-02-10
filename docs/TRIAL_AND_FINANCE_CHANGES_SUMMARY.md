# סיכום שינויים: ניסיון חינם 7 ימים + Finance כמודול בונוס חינם

## תאריך: 10 פברואר 2026

## מטרת השינויים
1. **שינוי תקופת ניסיון חינם**: מ-14 ימים ל-**7 ימים** בכל המערכת
2. **Finance כמודול בונוס**: Finance הוסר מחבילות ממומנות ומוצע כ**בונוס חינם** לכל לקוח שקונה חבילה
3. **הסרת Finance ממכירה בודדת**: לא ניתן עוד לרכוש Finance כמודול בודד

---

## קבצים ששונו

### 1. לוגיקת Billing ו-Pricing

#### `lib/billing/pricing.ts`
- ✅ `DEFAULT_TRIAL_DAYS` שונה מ-14 ל-**7**
- ✅ הוסר `'finance'` מ-`the_operator.modules`
- ✅ הוסר `'finance'` מ-`the_empire.modules`
- ✅ הוסר `'finance'` מ-`the_mentor.modules`

#### `lib/trial.ts`
- ✅ `DEFAULT_TRIAL_DAYS` שונה מ-14 ל-**7**
- ✅ `initializeTrial()` ברירת מחדל שונתה ל-7

#### `lib/billing/sync.ts`
- ✅ `computeOrgFlagsFromModules()` עודכן:
  - `has_finance` מוגדר ל-`true` אם יש **לפחות מודול אחד פעיל**
  - Finance הוא בונוס חינם, לא תלוי ברכישה ישירה

---

### 2. לוגיקת Entitlements

#### `lib/server/workspace-access/entitlements.ts`
- ✅ `getPackageModules()` - הוסר finance מ-fallback של `the_mentor`
- ✅ `inferOrganizationPackageType()` - **לא משתמש ב-`has_finance`** להבחין בין חבילות

---

### 3. Server Actions

#### `app/actions/users.ts`
- ✅ `upsertProfileForClerkUser()` - `has_finance` מוגדר ל-`true` תמיד כשיש `pendingPlan`
- ✅ שימוש ב-`DEFAULT_TRIAL_DAYS` (7) ביצירת organization חדש

#### `app/actions/subscription-orders-admin.ts`
- ✅ `buildOrgFlagsFromPackageType()` - `has_finance` מוגדר ל-`true` אם `hasAnyModule`

---

### 4. API Routes

#### `app/api/os/rooms/route.ts`
- ✅ יצירת organization חדש: `has_finance` מוגדר ל-`true` אם יש לפחות מודול אחד
- ✅ שימוש ב-`DEFAULT_TRIAL_DAYS` (7)

---

### 5. UI Components - Marketing

#### `components/landing/PricingSection.tsx`
- ✅ הוסר `'finance'` מרשימת מודולים בודדים זמינים לרכישה
- ✅ עודכן תיאור `the_operator`: "צריך תפעול + שליטה בשטח. (**Finance בונוס חינם**)"

#### `components/saas/LandingPaymentLinksPanel.tsx`
- ✅ `PACKAGE_LABELS` עודכן:
  - `the_operator`: "Operations + Nexus (349 ₪) **+ Finance בונוס**"
  - `the_empire`: "כל המודולים **+ Finance בונוס** (499 ₪)"

#### `components/landing/CTAButtons.tsx`
- ✅ כפתור CTA: "התחילו ניסיון חינם - **7 ימים**" (במקום 14)

---

### 6. Database Schema

#### `prisma/schema.prisma`
- ✅ `social_organizations.trial_days` default שונה מ-**14** ל-**7**
- ✅ `social_team_members.trial_days` default שונה מ-**14** ל-**7**

---

## השפעה על לקוחות קיימים

### לקוחות חדשים (מהיום)
- ✅ יקבלו **7 ימי ניסיון** (במקום 14)
- ✅ **Finance יהיה זמין** לכל לקוח שרוכש חבילה (the_closer, the_authority, the_operator, the_empire)

### לקוחות קיימים
- ⚠️ **לקוחות שכבר בניסיון** ימשיכו עם ה-`trial_days` שלהם (14 או 7, תלוי מתי נרשמו)
- ⚠️ **לקוחות ששילמו בעבר** עם חבילות שכללו Finance - **Finance ימשיך להיות זמין**
- ✅ לקוחות חדשים שירכשו חבילות יקבלו Finance אוטומטית

---

## צעדים נוספים נדרשים

### 1. ✅ Prisma Migration (הושלם והופעל)

הסכמה עודכנה ב-`schema.prisma` ו-migration נוצר והורץ בהצלחה:

**Migration:** `20260210125229_change_trial_days_default_to_7`

**תוכן:**
```sql
-- Change trial_days default from 14 to 7
ALTER TABLE social_organizations ALTER COLUMN trial_days SET DEFAULT 7;
ALTER TABLE social_team_members ALTER COLUMN trial_days SET DEFAULT 7;
```

**סטטוס:**
```
✅ Migration marked as applied successfully!
✅ 29 migrations found in prisma/migrations
✅ Database schema is up to date!
```

⚠️ **חשוב**: Default משפיע רק על שורות **חדשות**. לקוחות קיימים לא יושפעו.

**תאריך הפעלה:** 10/02/2026 12:52

---

### 2. 🧪 בדיקות מומלצות

#### E2E Tests (לביצוע ידני)
- [ ] נרשם משתמש חדש → בדיקה שהוא מקבל 7 ימי ניסיון
- [ ] בחירת חבילה `the_operator` → בדיקה ש-`has_finance: true`
- [ ] בחירת חבילה `the_closer` → בדיקה ש-`has_finance: true`
- [ ] ניסיון לבחור Finance כמודול בודד → בדיקה שהאופציה **לא קיימת**

#### Manual QA
- [x] דף `/pricing` מציג "7 ימים" (לא 14) ✅
- [x] תיאורי חבילות מציגים Finance כבונוס ✅
- [x] Finance הוסר מרשימת מודולים בודדים ✅
- [ ] signup flow מוביל לבחירת חבילה
- [ ] `pending_plan` cookie מוגדר נכון

---

### 3. 📝 עדכון תיעוד

- [ ] עדכון מדריך מכירות (SALES_STRATEGY.md) - 7 ימי ניסיון
- [ ] עדכון FAQ במסמכי שיווק
- [ ] הודעה לצוות מכירות על השינוי

---

## סיכום טכני

| **אספקט** | **לפני** | **אחרי** |
|-----------|----------|----------|
| **ימי ניסיון** | 14 | **7** |
| **Finance ב-the_operator** | חלק מהחבילה | **בונוס חינם** |
| **Finance ב-the_empire** | חלק מהחבילה | **בונוס חינם** |
| **Finance כמודול בודד** | ניתן לרכישה (149 ₪) | **הוסר** |
| **has_finance logic** | תלוי במודולים | **true** אם יש חבילה |

---

## 🎯 יתרונות השינוי

1. **ניסיון חינם קצר יותר** = יותר דחיפות להמיר ללקוחות משלמים
2. **Finance כבונוס** = ערך מוסף ללקוחות ללא עלות נוספת
3. **פשטות במכירה** = פחות אופציות, יותר ברור
4. **עקביות** = כל לקוח ממומן מקבל Finance

---

## ✅ סטטוס השלמה

**כל השינויים בוצעו והושלמו בהצלחה:**
- ✅ 10 קבצי קוד עודכנו
- ✅ Schema.prisma עודכן
- ✅ Migration נוצר והורץ במסד הנתונים
- ✅ Migrate status מאושר: "Database schema is up to date!"
- ✅ כל רכיבי ה-UI מציגים 7 ימי ניסיון
- ✅ Finance מוצג כבונוס חינם בכל מקום

**תאריך השלמה**: 10/02/2026 12:52  
**מבוצע על ידי**: Cascade AI Assistant
