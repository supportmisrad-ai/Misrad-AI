# 📋 Public Leads API - מדריך שימוש

API ציבורי להוספת לידים מדפי נחיתה ישירות ל-System CRM.

---

## 🔑 הגדרה ראשונית

### שלב 1: יצירת API Key

הרץ בדאטאבייס:

```sql
-- יצירת טבלת rate limiting (אם לא קיימת)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ
);

-- יצירת API Key חדש
INSERT INTO global_settings (key, value, created_at, updated_at)
VALUES (
  'public_leads_api_key',
  'YOUR_SECRET_KEY_HERE', -- החלף במפתח חזק (32+ תווים)
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

**💡 טיפ:** צור API key חזק:
```bash
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# או באתר: https://www.random.org/strings/
```

---

## 📡 API Endpoint

```
POST https://your-domain.com/api/public/leads?key=YOUR_API_KEY
```

---

## 📥 Request Body

```json
{
  "name": "שם מלא",
  "email": "email@example.com",
  "phone": "050-1234567",
  "company": "שם החברה",
  "message": "הודעה מהטופס",
  "source": "landing-page",
  "orgSlug": "avoda-sheli"
}
```

### שדות חובה:
- ✅ `name` - שם הליד
- ✅ `email` - אימייל תקין
- ✅ `orgSlug` - slug הארגון שלך

### שדות אופציונליים:
- `phone` - טלפון (אימות אוטומטי)
- `company` - שם החברה
- `message` - הודעה מהטופס
- `source` - מקור הליד (ברירת מחדל: `landing-page`)

### מקורות תקינים:
- `landing-page`
- `contact-form`
- `demo-request`
- `pricing-page`
- `webinar`
- `other`

---

## ✅ Response מוצלח

**Status:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "שם מלא",
    "email": "email@example.com",
    "status": "new",
    "createdAt": "2026-02-04T00:00:00.000Z",
    "message": "Lead created successfully"
  }
}
```

---

## ❌ Errors

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded. Max 10 requests per minute"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "email is required"
}
```

---

## 🔒 אבטחה

- ✅ **API Key validation** - מפתח חובה
- ✅ **Rate limiting** - מקסימום 10 requests לדקה
- ✅ **Email validation** - אימות פורמט אימייל
- ✅ **Phone validation** - אימות פורמט טלפון (אם מסופק)
- ✅ **SQL injection protection** - Prisma ORM
- ✅ **XSS protection** - Sanitization אוטומטי

---

## 💻 דוגמאות שימוש

### JavaScript (Vanilla)

```javascript
const API_URL = 'https://your-domain.com/api/public/leads';
const API_KEY = 'YOUR_API_KEY_HERE';
const ORG_SLUG = 'avoda-sheli';

async function submitLead(formData) {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        message: formData.message,
        source: 'landing-page',
        orgSlug: ORG_SLUG
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Lead created:', result.data);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}
```

### React

```tsx
import { useState } from 'react';

const API_URL = 'https://your-domain.com/api/public/leads';
const API_KEY = process.env.NEXT_PUBLIC_LEADS_API_KEY;
const ORG_SLUG = 'avoda-sheli';

export default function LeadForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          company: formData.get('company'),
          message: formData.get('message'),
          source: 'landing-page',
          orgSlug: ORG_SLUG
        })
      });

      if (response.ok) {
        setMessage('תודה! נחזור אליך בקרוב');
        e.currentTarget.reset();
      } else {
        throw new Error('שגיאה בשליחה');
      }
    } catch (error) {
      setMessage('אופס! משהו השתבש');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required placeholder="שם מלא" />
      <input name="email" type="email" required placeholder="אימייל" />
      <input name="phone" placeholder="טלפון" />
      <textarea name="message" placeholder="הודעה" />
      <button type="submit" disabled={loading}>
        {loading ? 'שולח...' : 'שלח פנייה'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

### cURL

```bash
curl -X POST "https://your-domain.com/api/public/leads?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "יוסי כהן",
    "email": "yossi@example.com",
    "phone": "050-1234567",
    "company": "כהן בע״מ",
    "message": "מעוניין בשירותים",
    "source": "landing-page",
    "orgSlug": "avoda-sheli"
  }'
```

---

## 🎯 תרחישים נפוצים

### 1. טופס ליצירת קשר פשוט
```html
<form id="contact-form">
  <input name="name" required>
  <input name="email" type="email" required>
  <textarea name="message"></textarea>
  <button type="submit">שלח</button>
</form>

<script>
  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    
    await fetch('/api/public/leads?key=YOUR_KEY', {
      method: 'POST',
      body: JSON.stringify({
        name: data.get('name'),
        email: data.get('email'),
        message: data.get('message'),
        source: 'contact-form',
        orgSlug: 'avoda-sheli'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    alert('תודה! נחזור אליך בקרוב');
  });
</script>
```

### 2. דף הורדת חומר שיווקי
```javascript
async function downloadResource(email, resourceName) {
  await fetch('/api/public/leads?key=YOUR_KEY', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: email.split('@')[0],
      email: email,
      message: `Downloaded: ${resourceName}`,
      source: 'resource-download',
      orgSlug: 'avoda-sheli'
    })
  });
  
  // Start download
  window.location.href = `/downloads/${resourceName}.pdf`;
}
```

### 3. טופס בקשת הצעת מחיר
```javascript
async function requestQuote(formData) {
  await fetch('/api/public/leads?key=YOUR_KEY', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      source: 'pricing-page',
      orgSlug: 'avoda-sheli'
    })
  });
}
```

---

## 📊 מעקב אחרי לידים

אחרי שליד נוצר, הוא מופיע ב:
- 📍 **System CRM** → `/w/avoda-sheli/system`
- 📊 **סטטוס:** `new`
- 🎯 **סקור:** `50` (ברירת מחדל)
- 🔥 **Hot:** `false`

---

## 🔄 אינטגרציות נוספות

### Zapier
1. Webhooks by Zapier
2. POST to your endpoint
3. Pass form data

### Make.com (Integromat)
1. HTTP Module
2. Make a request
3. POST method

### Webflow
```javascript
// בטופס Webflow
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
<script>
  document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    
    await axios.post('/api/public/leads?key=YOUR_KEY', {
      name: data.get('Name'),
      email: data.get('Email'),
      source: 'webflow-form',
      orgSlug: 'avoda-sheli'
    });
  });
</script>
```

---

## 🐛 Troubleshooting

### בעיה: "Invalid API key"
**פתרון:** וודא שה-API key ב-`global_settings` תואם למה ששלחת

### בעיה: "Rate limit exceeded"
**פתרון:** המתן דקה או הגדל את ה-rate limit בקוד

### בעיה: "Organization not found"
**פתרון:** וודא שה-`orgSlug` תקין ומתאים לארגון במערכת

---

## ✨ העתקת הקוד המלא

ראה דוגמה מלאה ב:
📄 `/public/landing-form-example.html`

---

**🎉 מוכן לשימוש!**

צריך עזרה? פנה לתמיכה הטכנית.
