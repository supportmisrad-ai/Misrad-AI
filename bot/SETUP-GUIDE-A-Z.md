# מדריך הקמה מלא - Blaster + MISRAD AI

**גרסה:** 3.0  
**תאריך:** 15/03/2026  
**זמן משוער:** 30-45 דקות

---

## 🎉 חדש: ChatGPT מובנה!

**גרסת אולטימייט** כוללת אינטגרציה מלאה עם ChatGPT:
- תגובות חכמות ודינמיות
- בנק ידע מותאם
- שליחת קבצים אוטומטית
- חיבור ל-Webhooks חיצוניים

---

---

## ⚠️ חשוב להבין לפני שמתחילים

**לידים ומידע:** חד-כיוונית (בלאסטר → MISRAD AI)
**שיחות ותגובות:** דו-כיוונית דרך ChatGPT מובנה!

**3 דרכים להגיב ללקוחות:**
1. **ChatGPT מובנה** (גרסת אולטימייט) - תגובות חכמות
2. **חוקי הבוט (Rules)** - תגובות קבועות מראש
3. **שליחה ידנית** - אדם אמיתי

---

## 📋 רשימת דברים שתצטרך

לפני שמתחילים, ודא שיש לך:

- [ ] חשבון Google (Gmail)
- [ ] גישה ל-WAAM-it Blaster (הבוט מותקן ופועל)
- [ ] חשבון Make (Integromat) - [הרשמה חינם](https://www.make.com)
- [ ] גישה ל-MISRAD AI (המערכת פועלת)

---

## 🎯 מה אנחנו בונים?

```
לקוח בווטסאפ → Blaster → Google Sheets → Make → MISRAD AI
```

**כיוון אחד בלבד:** לידים והודעות נכנסות מלקוחות → ל-MISRAD AI

---

## 🚀 שלב 1: Google Sheets (5 דקות)

### 1.1 יצירת גיליון חדש

1. פתח [Google Sheets](https://sheets.google.com)
2. לחץ **"Blank"** (ריק)
3. שנה את השם ל: **`MISRAD_AI`**

### 1.2 יצירת טאב - לידים נכנסים

1. הטאב הראשון נקרא "Sheet1" - שנה את השם ל: **`MISRAD_AI_Leads`**
   - לחץ לחיצה ימנית על הטאב
   - בחר "Rename"
   - הקלד: `MISRAD_AI_Leads`

2. העתק את הכותרות הבאות לשורה 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Contact | Name | Business_Name | Industry | Org_Size | Pain_Point | Selected_Plan | Email | Message | Source | Rule_ID | Type | Timestamp |

**בפועל, העתק את הטקסט הזה והדבר בשורה 1:**
```
Contact	Name	Business_Name	Industry	Org_Size	Pain_Point	Selected_Plan	Email	Message	Source	Rule_ID	Type	Timestamp
```

3. הקפא את השורה הראשונה:
   - לחץ על שורה 1 (המספר משמאל)
   - תפריט **View** → **Freeze** → **1 row**

### 1.3 שמירת ה-ID של הגיליון

1. העתק את ה-URL של הגיליון מהדפדפן
2. ה-URL נראה כך:
   ```
   https://docs.google.com/spreadsheets/d/XXXXXX-XXXX-XXXX-XXXX/edit
   ```
3. החלק בין `/d/` לבין `/edit` זה ה-**Spreadsheet ID**
4. שמור את זה בצד - תצטרך את זה ב-Make!

**דוגמה:**
```
URL: https://docs.google.com/spreadsheets/d/1abc123XYZ/edit
Spreadsheet ID: 1abc123XYZ
```

---

## 🔧 שלב 2: Google Apps Script (10 דקות)

### 2.1 פתיחת העורך

1. בתוך הגיליון, לחץ **Extensions** → **Apps Script**
2. ייפתח חלון חדש עם עורך קוד

### 2.2 הדבקת הקוד

1. מחק את כל מה שיש בעורך (אם יש)
2. העתק את הקוד מהקובץ `scripts/google-apps-script-blaster.gs`
3. הדבק בעורך

**או העתק מכאן (גרסה מקוצרת):**
```javascript
const CONFIG = {
  MISRAD_AI_WEBHOOK: "https://misrad-ai.com/api/webhooks/blaster",
  MISRAD_AI_SECRET: "YOUR_SECRET_HERE", // ← תצטרך לעדכן את זה!
  LOG_TO_SHEET: true
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // שמירה בגיליון
    if (CONFIG.LOG_TO_SHEET) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("MISRAD_AI_Leads");
      sheet.appendRow([
        data.contact || data.phone,
        data.name || "",
        data.business_name || "",
        data.industry || "",
        data.org_size || "",
        data.pain_point || "",
        data.selected_plan || "",
        data.email || "",
        data.message || "",
        data.source || "whatsapp",
        data.rule_id || "",
        data.type || "lead",
        new Date()
      ]);
    }
    
    // שליחה ל-MISRAD AI
    UrlFetchApp.fetch(CONFIG.MISRAD_AI_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": CONFIG.MISRAD_AI_SECRET
      },
      payload: JSON.stringify(data)
    });
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Blaster Webhook Active - v1.0")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

### 2.3 עדכון ה-Secret

1. מצא את השורה: `MISRAD_AI_SECRET: "YOUR_SECRET_HERE"`
2. החלף את `YOUR_SECRET_HERE` עם הסוד האמיתי
3. הסוד נמצא בקובץ `.env.local` ב-MISRAD AI:
   ```
   BLASTER_WEBHOOK_SECRET=c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630
   ```

### 2.4 שמירה

1. לחץ על **Save** (דיסקט) או `Ctrl+S`
2. תן שם לפרויקט: `MISRAD-AI-Blaster`

### 2.5 פריסה (Deployment)

1. לחץ **Deploy** → **New deployment**
2. לחץ על סמל הגלגל ⚙️ → בחר **Web app**
3. הגדר:
   - **Description:** `Blaster Webhook`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. לחץ **Deploy**
5. לחץ **Authorize access** (אם מופיע)
   - בחר את חשבון ה-Google שלך
   - לחץ **Advanced** → **Go to MISRAD-AI-Blaster (unsafe)**
   - לחץ **Allow**
6. **העתק את ה-URL!** זה נראה כך:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

**שמור את ה-URL הזה - תצטרך אותו בבלאסטר!**

---

## 🔌 שלב 3: Make (Integromat) - כיוון נכנס (10 דקות)

### 3.1 יצירת תרחיש חדש

1. היכנס ל-[Make](https://www.make.com)
2. לחץ **Create a new scenario**
3. שנה את השם ל: **`Blaster → MISRAD AI`**

### 3.2 הוספת Trigger

1. לחץ על העיגול האמצעי עם ה-+
2. חפש **Google Sheets**
3. בחר **Watch Rows**
4. הגדר:
   - **Connection:** התחבר ל-Google (פעם ראשונה)
   - **Spreadsheet ID:** ה-ID ששמרת בשלב 1.4
   - **Sheet Name:** `MISRAD_AI_Leads`
   - **Row limit:** `1`
   - **Contains headers:** `Yes`
5. לחקיקת השורה הראשונה, לחץ **Run once** ואז תראה את הכותרות

### 3.3 הוספת Action

1. לחץ על החצי-עיגול מימין ל-Trigger
2. חפש **HTTP**
3. בחר **Make a request**
4. הגדר:
   - **URL:** `https://misrad-ai.com/api/webhooks/blaster?type=lead`
   - **Method:** `POST`
   - **Headers:**
     - לחף **Add header**
     - Name: `Content-Type`, Value: `application/json`
     - לחף **Add header** שוב
     - Name: `x-webhook-secret`, Value: `c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630`
   - **Body type:** `Raw`
   - **Content type:** `JSON`
   - **Body:** העתק את הקוד הבא:

```json
{
  "phone": "{{Contact}}",
  "name": "{{Name}}",
  "business_name": "{{Business_Name}}",
  "industry": "{{Industry}}",
  "org_size": "{{Org_Size}}",
  "pain_point": "{{Pain_Point}}",
  "selected_plan": "{{Selected_Plan}}",
  "email": "{{Email}}",
  "message": "{{Message}}",
  "source": "{{Source}}",
  "rule_id": "{{Rule_ID}}",
  "timestamp": "{{Timestamp}}"
}
```

**שים לב:** השדות בתוך `{{}}` צריכים להיות ממופים מה-Google Sheets. לחץ על השדה ובחר מהרשימה.

### 3.4 שמירה והפעלה

1. לחץ **Save**
2. לחקיקת ה-Scheduling למטה שמאל
3. בחר **Immediately** או **Every 15 minutes**
4. לחץ **ON** (כפתור ירוק למטה שמאל)

---

## � שלב 4: הגדרות בבלאסטר (5 דקות)

### 4.1 פתיחת ההגדרות

1. פתח את WAAM-it Blaster
2. עבור ללשונית **"אוטומציה"** (Automation)

### 4.2 הגדרת לוג הודעות

1. מצא את האפשרות **"לוג הודעות"** (Message Log)
2. הפעל אותה
3. הגדר:
   - **סוג גישה:** Google Sheets
   - **קישור/URL:** ה-URL מ-Google Apps Script (שלב 2.5)
   - **שם גיליון:** `MISRAD_AI_Leads`

### 4.3 הגדרת משתנים (אופציונלי)

אם אתה רוצה לשמור משתנים ספציפיים:

1. בלשונית **"משתנים"** (Variables)
2. הוסף משתנים עם `#` לפני השם לשמירה בגיליון
   - דוגמה: `#Name`, `#Email`, `#Business`

---

## ✅ שלב 5: בדיקה (5 דקות)

### 5.1 בדיקת קבלת לידים

1. שלח הודעה לבוט בווטסאפ: `שלום, אני רוצה מידע`
2. חכה 1-2 דקות
3. בדוק ב-Google Sheets (טאב `MISRAD_AI_Leads`):
   - האם נוצרה שורה חדשה?
4. בדוק ב-MISRAD AI:
   - האם הליד מופיע במערכת?

### 5.2 סיום

אחרי שהליד מגיע ל-MISRAD AI - המערכת מוכנה!

**מה קורה עכשיו?**
- כל ליד שמגיע מהבוט ייכנס ל-MISRAD AI
- הצוות יכול לראות את הלידים בפאנל אדמין
- תגובות ללקוחות נעשות דרך חוקי הבוט (Rules) או ידנית

---

## 🆘 פתרון בעיות

### הבעיה: לידים לא מגיעים לגיליון

**בדוק:**
1. האם ה-URL בבלאסטר נכון?
2. האם הבוט פועל?
3. האם "לוג הודעות" מופעל?

### הבעיה: לידים לא מגיעים ל-MISRAD AI

**בדוק:**
1. האם התרחיש ב-Make פועל (ON)?
2. האם ה-webhook secret נכון?
3. האם ה-MISRAD AI webhook URL נכון?

---

## 📞 עזרה נוספת

- **מתכנת בלאסטר:** צור קשר דרך התמיכה ב-WAAM-it
- **MISRAD AI:** בדוק את הקובץ `bot/MASTER-BLASTER-DOCUMENTATION.md`
- **Make:** [תיעוד רשמי](https://www.make.com/en/help)

---

**סיום! 🎉**

אחרי שכל השלבים עובדים, המערכת מוכנה.
- כל ליד שמגיע מהבוט ייכנס ל-MISRAD AI
- תגובות ללקוחות דרך חוקי הבוט (Rules) בלבד
