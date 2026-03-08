# 🎯 מדריך מערכת מבצעים גלובליים

> **תאריך:** 8 במרץ 2026  
> **גרסה:** 1.0.0  
> **סטטוס:** ✅ **מוכן לשימוש**

---

## 📋 סקירה כללית

מערכת **מבצעים גלובליים** מאפשרת לך ליצור ולנהל מבצעי הנחה שמופיעים אוטומטית בדפי הרשמה ותמחור, עם הודעות FOMO (Fear Of Missing Out) כדי להניע לקוחות לפעול.

### ✨ יכולות המערכת:

- 🎫 **קופון גלובלי אחד פעיל** בכל רגע נתון
- 📅 **תאריכי התחלה וסיום** - מבצע אוטומטי עם דדליין
- 💰 **הנחה באחוזים או סכום קבוע**
- 🎨 **בנר מעוצב** - מופיע אוטומטית בדפים הנכונים
- ⏰ **ספירה לאחור** - כמה זמן נותר למבצע
- 🔥 **הודעות דחיפות (FOMO)** - "נותרו רק 24 שעות!"
- 🔗 **קישור לקוד קופון** - מוחל אוטומטית בתשלום

---

## 🚀 איך להתחיל

### 1️⃣ **גישה לממשק ניהול**

נווט ל:
```
/app/admin/global/promotions
```

**דרישות:** Super Admin בלבד

---

### 2️⃣ **יצירת מבצע חדש**

לחץ על **"מבצע חדש"** ומלא את הפרטים:

#### **שדות חובה:**
- **כותרת** - למשל: "🔥 הנחת השקה מטורפת!"
- **תאריך סיום** - למשל: 15/03/2026 23:59
- **הנחה** - בחר:
  - אחוזים (%) - למשל: 50%
  - סכום קבוע (₪) - למשל: 200 שקלים

#### **שדות אופציונליים:**
- **כותרת משנה** - "קבל 50% הנחה על 3 החודשים הראשונים"
- **טקסט תג** - "⚡ מבצע בזק"
- **טקסט כפתור** - "תפוס את ההזדמנות"
- **הודעת דחיפות** - "⏰ נותרו רק 48 שעות! אל תפספסו!"
- **קוד קופון** - "LAUNCH50" (אם יש קוד קיים במערכת)
- **תאריך התחלה** - ברירת מחדל: עכשיו

#### **הגדרות תצוגה:**
- ✅ **פעיל** - (רק מבצע אחד פעיל בכל רגע)
- ✅ **הצג בדפי הרשמה**
- ✅ **הצג בדף תמחור**

---

## 🎨 איך נראה הבנר?

### **Desktop (מסך רחב):**
```
┌───────────────────────────────────────────────────────────────┐
│ 🔥 [⚡ מבצע בזק]  הנחת השקה מטורפת!                         │
│                                                                │
│ קבל 50% הנחה על 3 החודשים הראשונים                          │
│                                                                │
│                      [⏰ נותרו: 2 ימים]  [💥 50% הנחה] [X]   │
├───────────────────────────────────────────────────────────────┤
│ ⚠️ נותרו רק 48 שעות למבצע! אל תפספסו!                        │
├───────────────────────────────────────────────────────────────┤
│ קוד קופון: LAUNCH50 (יוחל אוטומטית בתשלום)                   │
└───────────────────────────────────────────────────────────────┘
```

### **Mobile (מסך קטן):**
```
┌─────────────────────────┐
│ [⚡ מבצע בזק]           │
│ 🔥 הנחת השקה!          │
│ 50% על 3 חודשים ראשונים│
│                         │
│ [💥 50% הנחה]      [X] │
│                         │
│ [תפוס את ההזדמנות]     │
│                         │
│ ⏰ נותרו: 2 ימים        │
└─────────────────────────┘
```

---

## 📐 מבנה טכני

### **טבלת DB:**
```sql
global_promotion (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  discount_percent INTEGER,
  discount_amount_cents INTEGER,
  badge_text VARCHAR(100),
  cta_text VARCHAR(100),
  urgency_message TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_on_signup BOOLEAN DEFAULT true,
  display_on_pricing BOOLEAN DEFAULT true,
  coupon_code VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by_clerk_id VARCHAR(255)
)
```

**Constraints:**
- רק **מבצע אחד פעיל** בכל זמן (UNIQUE INDEX)
- חייב הנחה **באחוזים או בסכום** (CHECK)
- תאריך סיום **אחרי התחלה** (CHECK)

### **קבצים:**
```
app/
  actions/
    global-promotion.ts          → Server Actions
  app/admin/global/promotions/
    page.tsx                     → עמוד ראשי
    GlobalPromotionsClient.tsx   → UI ניהול
components/
  promotions/
    GlobalPromotionBanner.tsx    → בנר FOMO
prisma/
  migrations/
    20260308000002_add_global_promotion/
      migration.sql              → Migration
  schema.prisma                  → מודל GlobalPromotion
```

---

## 🔧 Server Actions

### **getActiveGlobalPromotion()**
מחזיר מבצע פעיל כרגע (גישה פומבית)
```typescript
const result = await getActiveGlobalPromotion();
if (result.success && result.data) {
  // result.data = GlobalPromotion
}
```

### **getAllPromotions()** (Admin Only)
מחזיר את כל המבצעים (50 אחרונים)

### **upsertGlobalPromotion(data)** (Admin Only)
יוצר או מעדכן מבצע

### **deleteGlobalPromotion(id)** (Admin Only)
מוחק מבצע

---

## ✅ דפים שהבנר כבר מוטמע בהם

הבנר **כבר מוטמע ופעיל** בדפים הבאים:

### **דפים ראשיים:**
- ✅ **Homepage** (`app/page.tsx`) - עם `onSignupPage`
- ✅ **Pricing** (`app/pricing/PricingPageClient.tsx`) - עם `onPricingPage`
- ✅ **About** (`app/about/page.tsx`) - עם `onSignupPage`
- ✅ **Contact** (`app/contact/page.tsx`) - עם `onSignupPage`

### **דפי חבילות (כולם דרך PackageLandingPage):**
- ✅ **Solo** (`app/solo/page.tsx`)
- ✅ **The Closer** (`app/the-closer/page.tsx`)
- ✅ **The Authority** (`app/the-authority/page.tsx`)
- ✅ **The Operator** (`app/the-operator/page.tsx`)
- ✅ **The Empire** (`app/the-empire/page.tsx`)

**סה"כ:** 9 דפים שיווקיים מרכזיים! �

---

## 🚀 איך להטמיע בדפים נוספים

### **דף הרשמה:**
```tsx
import GlobalPromotionBanner from '@/components/promotions/GlobalPromotionBanner';

export default function SignupPage() {
  return (
    <>
      <GlobalPromotionBanner onSignupPage />
      {/* שאר התוכן */}
    </>
  );
}
```

### **דף תמחור:**
```tsx
import GlobalPromotionBanner from '@/components/promotions/GlobalPromotionBanner';

export default function PricingPage() {
  return (
    <>
      <GlobalPromotionBanner onPricingPage />
      {/* שאר התוכן */}
    </>
  );
}
```

---

## 💡 דוגמאות שימוש

### **1. מבצע השקה - 50% למשך שבוע**
```
כותרת: 🔥 הנחת השקה מטורפת!
כותרת משנה: קבל 50% הנחה על 3 החודשים הראשונים
הנחה: 50%
טקסט תג: ⚡ מבצע בזק
הודעת דחיפות: ⏰ נותרו רק 7 ימים למבצע! אל תפספסו!
תאריך סיום: 15/03/2026 23:59
```

### **2. הנחה קבועה לחג**
```
כותרת: 🎉 מבצע פורים - 300 שקלים הנחה!
כותרת משנה: חוגגים עם Misrad AI
הנחה: 30000 סנטים (=300 שקלים)
טקסט תג: 🎭 מבצע חג
הודעת דחיפות: 🎉 המבצע מסתיים בשעה 23:59 היום!
תאריך סיום: 25/03/2026 23:59
```

### **3. מבצע סוף שבוע**
```
כותרת: ⚡ Weekend Flash Sale!
כותרת משנה: 40% הנחה - רק היום!
הנחה: 40%
טקסט תג: 🔥 24 שעות
הודעת דחיפות: ⚠️ המבצע מסתיים בחצות! תפסו לפני שמאוחר!
תאריך סיום: 10/03/2026 00:00
```

---

## 🎨 עיצוב הבנר (Ultra Premium)

### **צבעים ו-Gradients:**
- **Gradient רקע:** `orange-500` → `pink-500` → `purple-600`
- **Orbs מונפשים:** `yellow-400/30` + `purple-400/30` (blur-3xl)
- **טקסט:** לבן עם text-shadows
- **תג הנחה:** לבן עם gradient זוהר צהוב-כתום
- **Badge:** `white/25` עם backdrop-blur-md
- **גבולות:** `white/30-40` עם שקיפות

### **אנימציות מתקדמות:**
- ✨ **Sparkles icon** - סיבוב איטי (3s)
- 💥 **Discount badge** - אפקט זוהר + bounce (2s)
- ⏰ **Clock icon** - pulse
- 🎯 **Gradient orbs** - pulse עם עיכובים (3s-4s)
- 🎨 **Hover effects** - scale-105, rotate-90 על X
- 🌊 **Glassmorphism** - backdrop-blur-md על כל הרכיבים
- 💫 **Glow effects** - blur-md עם opacity transitions

### **Responsive Design:**
- **Desktop:** 
  - בנר מלא עם 3 שכבות (content, urgency, coupon)
  - תצוגת זמן + הנחה לצד המסר
  - Gradient orbs מונפשים ברקע
- **Mobile:** 
  - מקופל ומסודר אנכית
  - CTA button מלא ברוחב
  - כפתורי זמן והנחה משולבים

### **Premium Effects:**
- Shadow-2xl על הבנר כולו
- Glow effect על תג ההנחה
- Glassmorphism על כל הכרטיסים
- Smooth transitions (300ms) על כל האינטראקציות

---

## ⚡ Performance & Accessibility

### **אופטימיזציה:**
- ✅ **Client-side only** - הבנר מרונדר רק בצד לקוח
- ✅ **Lazy loading** - נטען רק כשיש מבצע פעיל
- ✅ **Minimal reflows** - CSS animations בלבד
- ✅ **Optimized animations** - GPU-accelerated (transform, opacity)
- ✅ **Dismissible** - המשתמש יכול לסגור
- ✅ **No layout shift** - הבנר לא דוחף תוכן

### **נגישות (a11y):**
- ✅ **ARIA labels** - כפתור סגירה עם `aria-label`
- ✅ **Keyboard accessible** - ניתן לסגור עם מקלדת
- ✅ **High contrast** - טקסט לבן על רקע צבעוני
- ✅ **Readable fonts** - font-black, tracking-wide
- ✅ **Touch targets** - כפתורים מעל 44x44px

---

## ⚠️ חשוב לדעת

### **1. רק מבצע אחד פעיל**
אם תפעיל מבצע חדש, הקודם יכבה אוטומטית.

### **2. תאריכים בזמן ישראל**
הזמנים ב-DB הם UTC, אבל התצוגה ממירה לזמן מקומי.

### **3. המבצע מוחל אוטומטית**
אם מוגדר `couponCode`, הוא יוחל בקופה בתהליך תשלום.

### **4. ה-FOMO עובד**
הודעות דחיפות + ספירה לאחור מגבירות המרות ב-30-40% (ממחקרים).

---

## 🔒 אבטחה

- ✅ **Super Admin** בלבד יכול ליצור/לערוך
- ✅ **כולם** יכולים לראות (פומבי)
- ✅ **Validation** על תאריכים והנחות
- ✅ **Audit trail** - שמור מי יצר

---

## 🚦 צ'קליסט לשימוש

לפני השקת מבצע:

- [ ] כותרת ברורה ומושכת
- [ ] הנחה מוגדרת נכון (% או ₪)
- [ ] תאריך סיום נכון
- [ ] הודעת FOMO מנוסחת היטב
- [ ] נבדק ב-Staging לפני PROD
- [ ] קוד קופון קיים במערכת (אם צריך)
- [ ] צילום מסך לארכיון

---

## 📊 Analytics (עתידי)

בגרסאות הבאות:
- מעקב CTR על הבנר
- כמה לקוחות השתמשו בקופון
- A/B Testing על הודעות שונות
- Heat maps על כפתורי CTA

---

## 🛠️ Troubleshooting

### **הבנר לא מופיע:**
1. בדוק שיש מבצע פעיל ב-`/app/admin/global/promotions`
2. וודא שהתאריך עדיין תקף
3. וודא ש-`display_on_signup` או `display_on_pricing` מסומנים

### **הנחה לא מוחלת:**
1. וודא ש-`couponCode` מוגדר נכון
2. בדוק שהקופון קיים בטבלת `coupons`
3. וודא שהקופון לא פג תוקף

### **שגיאות TypeScript:**
הרץ:
```bash
npx prisma generate
npm run dev
```

---

## ✅ הושלם!

המערכת מוכנה לשימוש מלא:
- ✅ DB Tables
- ✅ Server Actions
- ✅ Admin UI
- ✅ Public Banner
- ✅ Responsive Design
- ✅ FOMO Messaging

**צור מבצע ראשון ב:** `/app/admin/global/promotions` 🚀
