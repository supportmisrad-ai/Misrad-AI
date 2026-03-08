# 🔧 מדריך Super Admin - הגדרת OAuth לפרודקשן

**למי זה?** Super Admin / מפתח / DevOps  
**מתי צריך את זה?** פעם אחת בלבד לכל הסביבה (DEV/PROD)  
**זמן הגדרה:** 45-60 דקות (חד-פעמי!)

---

## 📋 סקירה כללית

### מה אנחנו הולכים לעשות?

1. ✅ יצירת Facebook App (Meta Developers)
2. ✅ יצירת LinkedIn App (LinkedIn Developers)
3. ✅ הגדרת Environment Variables ב-Vercel/Local
4. ✅ בדיקת החיבור

### למה צריך את זה?

**OAuth = פרסום ישיר לרשתות חברתיות**
- ללא Make/Zapier
- מהיר יותר (פרסום מיידי)
- אמין יותר (פחות כשלים)
- חינם (אין צורך במנוי צד שלישי)

---

## 🎯 חלק 1: Facebook/Instagram App

### שלב 1.1: יצירת App חדש

1. **היכנס ל-Meta Developers:**
   ```
   https://developers.facebook.com/apps
   ```

2. **לחץ "Create App"**

3. **בחר "Business"** (לא Consumer!)
   - Why? כי אנחנו צריכים גישה ל-Pages ו-Instagram Business

4. **מלא פרטים:**
   ```
   App Name: Misrad AI Social (או כל שם שתרצה)
   App Contact Email: itsikdahan1@gmail.com
   Business Account: בחר את ה-Business Manager שלך
   ```

5. **לחץ "Create App"**

6. **שמור את ה-App ID:**
   ```
   App ID: 123456789012345
   ← זה מה שתעתיק ל-FACEBOOK_APP_ID
   ```

---

### שלב 1.2: הוספת Products

1. **במסך Dashboard של האפליקציה, לחץ "Add Products"**

2. **הוסף את המוצרים הבאים:**
   
   #### A. Facebook Login
   ```
   1. לחץ "Set Up" ליד Facebook Login
   2. בחר Platform: Web
   3. Site URL: https://misrad-ai.com
   4. לחץ "Save"
   ```

   #### B. Instagram Basic Display (אופציונלי, אם צריך)
   ```
   1. לחץ "Set Up" ליד Instagram Basic Display
   2. עקוב אחרי ההוראות
   3. שמור Client ID + Secret
   ```

---

### שלב 1.3: בחר Use Case (חובה!)

**⚠️ שלב זה חיוני!** Facebook דורשת לבחור Use Case לפני שאפשר לבקש Permissions.

1. **לך ל-Dashboard → App customization and requirements**

2. **בחר את שני ה-Use Cases הבאים:**

   #### Use Case #1: Facebook Pages
   ```
   ✅ "Customize the Manage everything on your Page use case"
   ```
   - לחץ על השורה הזו
   - זה יאפשר לך לפרסם פוסטים ב-Facebook Pages
   - זה יאפשר לך לבקש `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`

   #### Use Case #2: Instagram
   ```
   ✅ "Customize the Manage messaging & content on Instagram use case"
   ```
   - לחץ על השורה הזו
   - זה יאפשר לך לפרסם תוכן ב-Instagram Business Accounts
   - זה יאפשר לך לבקש `instagram_basic`, `instagram_content_publish`

3. **⏱️ זמן:** כ-2 דקות לכל Use Case

4. **💡 הערה חשובה:**
   - אם כבר בחרת Use Cases אחרים בטעות - זה בסדר
   - אפשר לבחור יותר מ-2 Use Cases
   - אבל **חייבים** את השניים האלה עבור Social Module

---

### שלב 1.4: הגדרת Facebook Login

1. **לך ל: Facebook Login → Settings (בתפריט צד שמאל)**

2. **הוסף Redirect URIs:**
   ```
   Valid OAuth Redirect URIs:
   
   DEV:
   http://localhost:3000/api/oauth/facebook/callback
   
   PROD:
   https://misrad-ai.com/api/oauth/facebook/callback
   https://www.misrad-ai.com/api/oauth/facebook/callback
   ```
   
   ⚠️ **חשוב:** שים לב שאין רווחים או שורות ריקות!

3. **לחץ "Save Changes"**

---

### שלב 1.5: App Secret

1. **לך ל: Settings → Basic**

2. **העתק App Secret:**
   ```
   App ID: 123456789012345
   App Secret: abc123xyz789... (לחץ "Show" להצגה)
   
   ← זה מה שתעתיק ל-FACEBOOK_APP_SECRET
   ```

3. **⚠️ אזהרת אבטחה:**
   - **אל תשתף את ה-Secret בגיט!**
   - **אל תשלח במייל!**
   - **רק ב-.env.local או Vercel Environment Variables**

---

### שלב 1.6: בקש Permissions (App Review)

**למה צריך?** Facebook מגבילה גישה - צריך לבקש אישור.

1. **לך ל: App Review → Permissions and Features**

2. **בקש את ההרשאות הבאות:**

   #### הרשאות חובה (Must Have):
   ```
   ✅ pages_show_list
      → לראות רשימת דפים של המשתמש
   
   ✅ pages_read_engagement
      → לקרוא תגובות ולייקים (לסטטיסטיקות)
   
   ✅ pages_manage_posts
      → לפרסם פוסטים בשם הדף
   
   ✅ instagram_basic
      → גישה בסיסית לאינסטגרם
   
   ✅ instagram_content_publish
      → לפרסם תוכן באינסטגרם
   ```

3. **למלא את הטופס:**
   ```
   Use Case: Social Media Management Platform
   
   Description:
   "Misrad AI is a social media management platform that helps 
   businesses and agencies manage their Facebook and Instagram 
   content. We need these permissions to allow users to:
   - View their Pages
   - Publish posts to their Pages
   - Publish content to their Instagram Business accounts
   - View engagement metrics
   
   Our users connect their accounts via OAuth and we publish 
   content on their behalf."
   
   Video Demo: (אופציונלי - אפשר לדלג בהתחלה)
   ```

4. **לחץ "Submit"**

5. **⏱️ זמן המתנה:**
   - Development Mode: עובד מיד (רק עם Admins/Developers/Testers)
   - Production: 3-7 ימים (אחרי App Review מאושר)

---

### שלב 1.7: הוסף Test Users (בינתיים)

**עד שה-App Review מאושר:**

1. **לך ל: Roles → Test Users**

2. **לחץ "Add Test Users"**
   ```
   מספר משתמשים: 2-3
   שפה: עברית
   מיקום: Israel
   ```

3. **שמור את ה-Login credentials**

4. **השתמש בהם לבדיקות!**

---

### שלב 1.8: Webhooks (אופציונלי - רק למתקדמים)

**⚠️ חשוב:** שלב זה **לא חובה** לפרסום בסיסי!

#### מתי צריך Webhooks?

**צריך רק אם רוצים:**
- ✅ לקבל התראות בזמן אמת על תגובות חדשות
- ✅ לקבל התראות על לייקים
- ✅ לקבל הודעות ישירות (Instagram DM)
- ✅ Real-time analytics events

**לא צריך אם:**
- ❌ רק מפרסמים תוכן (זה מה שהמערכת עושה)
- ❌ רוצים לקרוא נתונים באופן ידני/מתוזמן
- ❌ אין שרת ציבורי (HTTPS) מוכן

#### המלצה: **דלג על זה בינתיים**

אם Facebook מציגה לך מסך "Webhooks configuration":
1. **פשוט תלחץ X או "סגור"**
2. **חזור ל-Dashboard**
3. **המשך לשלב הבא**

#### אם בכל זאת רוצים להגדיר (למתקדמים):

**דרישות:**
- שרת HTTPS ציבורי (לא localhost!)
- Endpoint ב-`/api/webhooks/instagram`
- Token verification

**צעדים:**
1. **צור Webhook Endpoint בקוד:**
   ```typescript
   // app/api/webhooks/instagram/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   
   // Verification (GET request from Facebook)
   export async function GET(request: NextRequest) {
     const url = new URL(request.url);
     const mode = url.searchParams.get('hub.mode');
     const token = url.searchParams.get('hub.verify_token');
     const challenge = url.searchParams.get('hub.challenge');
     
     const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
     
     if (mode === 'subscribe' && token === VERIFY_TOKEN) {
       return new NextResponse(challenge, { status: 200 });
     }
     
     return new NextResponse('Forbidden', { status: 403 });
   }
   
   // Webhook events (POST from Instagram)
   export async function POST(request: NextRequest) {
     const body = await request.json();
     
     // Process Instagram events
     console.log('📸 Instagram Event:', body);
     
     // TODO: Handle comments, mentions, etc.
     
     return new NextResponse('EVENT_RECEIVED', { status: 200 });
   }
   ```

2. **הוסף ל-.env.local:**
   ```bash
   INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_random_secret_token_here
   ```

3. **הגדר ב-Facebook:**
   ```
   Callback URL: https://misrad-ai.com/api/webhooks/instagram
   Verify Token: (אותה סיסמה מ-.env.local)
   
   Subscription Fields:
   ✅ comments
   ✅ mentions  
   ✅ story_insights
   ✅ live_comments
   ```

4. **בדוק:**
   - Facebook תשלח GET request ל-callback URL
   - אם הטוקן תואם → תקבל ✅
   - אחר כך תתחיל לקבל POST events

**⏱️ זמן:** 30-45 דקות (אם מתקדמים)

**💡 המלצה שלי:**
- **בשלב הראשוני:** דלג על זה!
- **אחרי ש-OAuth עובד:** אפשר לחזור ולהוסיף Webhooks
- **לא משפיע על פרסום תוכן** - זה רק לאירועים נכנסים

---

## 🔗 חלק 2: LinkedIn App

### שלב 2.1: יצירת App

1. **היכנס ל-LinkedIn Developers:**
   ```
   https://www.linkedin.com/developers/apps
   ```

2. **לחץ "Create app"**

3. **מלא פרטים:**
   ```
   App name: Misrad AI Social
   LinkedIn Page: בחר את הדף של החברה שלך
   Privacy policy URL: https://misrad-ai.com/privacy
   App logo: (העלה לוגו - 300x300px לפחות)
   Legal agreement: ✅ I have read and agree
   ```

4. **לחץ "Create app"**

---

### שלב 2.2: הוספת Products

1. **לך ל-Products tab**

2. **בקש גישה ל-"Share on LinkedIn":**
   ```
   1. לחץ "Request access" ליד "Share on LinkedIn"
   2. מלא את הטופס
   3. Submit
   ```

3. **⏱️ זמן אישור:** בדרך כלל מיידי (אם הדף LinkedIn תקין)

---

### שלב 2.3: OAuth 2.0 Settings

1. **לך ל-Auth tab**

2. **הוסף Redirect URLs:**
   ```
   Redirect URLs:
   
   DEV:
   http://localhost:3000/api/oauth/linkedin/callback
   
   PROD:
   https://misrad-ai.com/api/oauth/linkedin/callback
   https://www.misrad-ai.com/api/oauth/linkedin/callback
   ```

3. **לחץ "Update"**

---

### שלב 2.4: Client ID + Secret

1. **באותו Auth tab, תראה:**
   ```
   Client ID: abc123def456
   Client Secret: xyz789... (לחץ "Show" להצגה)
   
   ← זה מה שתעתיק ל-:
   LINKEDIN_CLIENT_ID=abc123def456
   LINKEDIN_CLIENT_SECRET=xyz789...
   ```

2. **⚠️ אזהרת אבטחה:**
   - **אל תשתף את ה-Secret!**
   - **רק ב-.env או Vercel**

---

## 🔐 חלק 3: Environment Variables

### שלב 3.1: מבנה ה-Environment Variables

**יש לך 3 אפשרויות:**

#### אופציה 1: Local Development (`.env.local`)
```bash
# Facebook/Instagram OAuth
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123xyz789secrethere

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=abc123def456
LINKEDIN_CLIENT_SECRET=xyz789secrethere

# OpenAI (לאסטרטגיות AI)
OPENAI_API_KEY=sk-proj-...

# Clerk (Auth - כבר קיים)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Supabase - כבר קיים)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

#### אופציה 2: Vercel (Production)
```bash
# עבור Vercel: Settings → Environment Variables
```

#### אופציה 3: Docker/.env.prod
```bash
# אם משתמש ב-Docker
```

---

### שלב 3.2: הוספה ל-.env.local (Development)

**Windows PowerShell:**

```powershell
# 1. פתח את הפרויקט
cd C:\Projects\Misrad-AI

# 2. צור/ערוך .env.local
notepad .env.local

# 3. הוסף את השורות הבאות (בסוף הקובץ):

# ========================================
# Social Module - OAuth Credentials
# ========================================

# Facebook/Instagram
FACEBOOK_APP_ID=YOUR_APP_ID_HERE
FACEBOOK_APP_SECRET=YOUR_APP_SECRET_HERE

# LinkedIn
LINKEDIN_CLIENT_ID=YOUR_CLIENT_ID_HERE
LINKEDIN_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE

# OpenAI (אם צריך AI Marketing Strategy)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# 4. שמור את הקובץ (Ctrl+S)
# 5. סגור את Notepad
```

**⚠️ חשוב:**
- **אל תעשה commit ל-.env.local!** (זה כבר ב-.gitignore)
- **החלף את `YOUR_...` בערכים האמיתיים!**

---

### שלב 3.3: הוספה ל-Vercel (Production)

1. **היכנס ל-Vercel Dashboard:**
   ```
   https://vercel.com/itsikdahan1/misrad-ai
   ```

2. **לך ל-Settings → Environment Variables**

3. **הוסף כל משתנה בנפרד:**
   ```
   Name: FACEBOOK_APP_ID
   Value: 123456789012345
   Environments: ✅ Production ✅ Preview ✅ Development
   
   לחץ "Save"
   
   חזור על זה ל:
   - FACEBOOK_APP_SECRET
   - LINKEDIN_CLIENT_ID
   - LINKEDIN_CLIENT_SECRET
   - OPENAI_API_KEY (אם צריך)
   ```

4. **⚠️ אחרי שמירה:**
   ```
   לחץ "Redeploy" כדי שהשינויים ייכנסו לתוקף
   ```

---

### שלב 3.4: וידוא שהכל עובד

**בדיקה ב-Terminal:**

```powershell
# Windows PowerShell
cd C:\Projects\Misrad-AI

# בדוק שה-.env.local קיים
Get-Content .env.local | Select-String "FACEBOOK_APP_ID"

# אמור להציג:
# FACEBOOK_APP_ID=123456789012345

# אם לא מציג כלום → לא הגדרת!
```

---

## ✅ חלק 4: בדיקת החיבור

### שלב 4.1: הרץ את הפרויקט

```powershell
# 1. הפעל את Next.js
npm run dev

# 2. פתח דפדפן
# http://localhost:3000
```

### שלב 4.2: נסה להתחבר לפייסבוק

```
1. לך ל: http://localhost:3000/w/YOUR_ORG/social/settings
2. לחץ "Connect Facebook"
3. אמור לפתוח popup של Facebook
4. אשר הרשאות
5. אמור לחזור למערכת ✅
```

**אם זה לא עובד:**

#### שגיאה: "App not found"
```
❌ בעיה: FACEBOOK_APP_ID שגוי או לא הוגדר
✅ פתרון: בדוק שהעתקת נכון מ-Meta Developers
```

#### שגיאה: "Redirect URI mismatch"
```
❌ בעיה: ה-Redirect URI לא תואם
✅ פתרון: בדוק ש-http://localhost:3000/api/oauth/facebook/callback
          רשום ב-Facebook Login → Settings → Valid OAuth Redirect URIs
```

#### שגיאה: "Invalid App Secret"
```
❌ בעיה: FACEBOOK_APP_SECRET שגוי
✅ פתרון: לך ל-Settings → Basic → App Secret → Show → העתק שוב
```

---

## 🎯 חלק 5: הפעלה לפרודקשן

### שלב 5.1: App Mode → Live

**Facebook:**
```
1. לך ל-Meta Developers → Your App
2. למעלה יש toggle: "Development" / "Live"
3. לחץ על Toggle → בחר "Switch to Live Mode"
4. אשר
```

**⚠️ חשוב:**
- לפני Live Mode, צריך App Review מאושר!
- אחרת רק Admins/Developers/Testers יכולים להתחבר

**LinkedIn:**
```
LinkedIn אוטומטית Live אחרי אישור "Share on LinkedIn"
```

---

### שלב 5.2: Test בפרודקשן

```
1. לך ל: https://misrad-ai.com
2. התחבר עם משתמש אמיתי
3. נסה לחבר Facebook/LinkedIn
4. פרסם פוסט בדיקה
5. בדוק שהוא מופיע ברשת החברתית ✅
```

---

## 📊 סיכום - Checklist

### Facebook/Instagram:
- [x] יצרתי App ב-Meta Developers
- [x] הוספתי Facebook Login Product
- [x] הגדרתי Redirect URIs
- [x] העתקתי App ID + Secret
- [x] ביקשתי Permissions (App Review)
- [x] הוספתי Test Users (בינתיים)

### LinkedIn:
- [x] יצרתי App ב-LinkedIn Developers
- [x] ביקשתי גישה ל-"Share on LinkedIn"
- [x] הגדרתי Redirect URLs
- [x] העתקתי Client ID + Secret

### Environment Variables:
- [x] הוספתי ל-.env.local (DEV)
- [x] הוספתי ל-Vercel (PROD)
- [x] בדקתי שהם קיימים (Get-Content)
- [x] Redeploy ב-Vercel

### בדיקות:
- [x] התחברתי לפייסבוק ב-localhost
- [x] התחברתי ל-LinkedIn ב-localhost
- [x] פרסמתי פוסט בדיקה
- [x] הכל עובד בפרודקשן ✅

---

## 🆘 עזרה ופתרון בעיות

### שגיאות נפוצות:

#### 1. "Cannot read environment variable"
```
✅ פתרון:
1. בדוק ש-.env.local קיים
2. הפעל מחדש את npm run dev
3. בדוק שאין רווחים בשמות המשתנים
```

#### 2. "OAuth callback failed"
```
✅ פתרון:
1. בדוק ש-Redirect URI תואם בדיוק
2. בדוק שה-App בפייסבוק/לינקדאין Live
3. נסה ב-Incognito mode
```

#### 3. "Permission denied"
```
✅ פתרון:
1. בדוק ש-App Review אושר (Facebook)
2. אם לא - השתמש ב-Test Users
3. בדוק שביקשת את ה-Permissions הנכונות
```

---

## 📞 תמיכה

**צריך עזרה?**

📧 Email: itsikdahan1@gmail.com  
💬 Docs: [Meta for Developers](https://developers.facebook.com/docs/)  
📚 Docs: [LinkedIn Developers](https://learn.microsoft.com/en-us/linkedin/)

---

**תאריך עדכון:** 8 במרץ 2026  
**גרסה:** 1.0 - Complete Setup Guide
