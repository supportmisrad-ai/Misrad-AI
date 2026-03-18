# 🚨 תוכנית חסכון זמנית - AI Providers Migration

> **תאריך:** 17 מרץ 2026  
> **סטטוס:** זמני עד לסדר תשלומים  
> **מטרה:** ניצול מקסימלי של קרדיטים קיימים וספקים חינמיים

---

## 📊 מצב נוכחי

### קרדיטים זמינים:
- **Deepgram:** $200 (≈400-500 שעות תמלול)
- **Google AI Studio:** חינם עם מכסות נדיבות
- **Groq:** חינם עם מגבלות תעריף מהיר

---

## 🔄 תוכנית הגירה זמנית

### 1. **טקסט/צ'אט/סיכומים** → Google AI Studio

```typescript
// TODO: TEMPORARY COST-SAVING MEASURE - Return to premium models when payments stabilize
const AI_PROVIDERS = {
  primary: {
    provider: 'google-ai-studio',
    model: 'gemini-2.5-flash', // ראשי - הכי חדש וחזק
    reasoning: 'חינם, יציב לעברית, מכסות נדיבות'
  },
  fallbacks: [
    {
      provider: 'google-ai-studio',
      model: 'gemini-2.0-flash', // גיבוי 1
      trigger: 'if 2.5 fails'
    },
    {
      provider: 'google-ai-studio', 
      model: 'gemini-1.5-flash', // גיבוי 2
      trigger: 'if 2.0 fails'
    },
    {
      provider: 'groq',
      model: 'llama-3.3-70b', // גיבוי סופי
      reasoning: 'מהיר, חינם, טוב לעברית'
    }
  ]
};
```

**היגיון:** Google AI Studio חינם עם מכסות נדיבות והכי יציב לעברית.

### 2. **אודיו (תמלול)** → Deepgram

```typescript
// TODO: TEMPORARY - Use existing $200 credit before expiration
const AUDIO_TRANSCRIPTION = {
  primary: {
    provider: 'deepgram',
    model: 'nova-2', // או whisper-large תלוי בצורך
    reasoning: '$200 קרדיט = 400-500 שעות תמלול חינם'
  },
  // NO FALLBACKS - ננצל את כל הקרדיט
};
```

**היגיון:** יש לנו $200 קרדיט - חבל לא לנצל.

### 3. **הקראה (TTS)** → Deepgram Aura

```typescript
// TODO: TEMPORARY - Use Deepgram credit for TTS
const TEXT_TO_SPEECH = {
  primary: {
    provider: 'deepgram',
    model: 'aura-asteria-en', // או הדגם הטוב ביותר לעברית
    reasoning: 'ניצול הקרדיט הקיים, איכות מצוינת'
  }
};
```

---

## 🔍 מיקומים לעדכון במערכת

### טקסט/צ'אט:
- `lib/ai/` - כל פונקציות ה-AI הכלליות
- `app/actions/ai-*.ts` - Server Actions עם AI
- `components/ai/` - קומפוננטות צ'אט
- Call analysis וסיכומים

### אודיו:
- תמלול הקלטות ב-call analysis
- פקודות קוליות
- כל endpoint שמשתמש ב-OpenAI Whisper/Claude

### TTS:
- הקראת סיכומים
- הודעות קוליות
- כל טקסט-לדיבור

---

## 🎯 **תוכנית חזרה למצב רגיל (כשהתשלומים מסתדרים)**

### 1. **טקסט/צ'אט** → GPT-4o / Claude 3.5 Sonnet
```typescript
// POST-TEMPORARY PLAN - Return to premium models
const PREMIUM_TEXT_AI = {
  primary: {
    provider: 'openai',
    model: 'gpt-4o', // או claude-3.5-sonnet
    reasoning: 'האיכות הטובה ביותר לעברית, חשיבה מתקדמת'
  },
  fallback: 'claude-3.5-sonnet' // כגיבוי
};
```

### 2. **אודיו (תמלול)** → OpenAI Whisper V3
```typescript
// POST-TEMPORARY PLAN - Best accuracy
const PREMIUM_TRANSCRIPTION = {
  primary: {
    provider: 'openai',
    model: 'whisper-1', // או whisper-large-v3-turbo
    reasoning: 'הדיוק הגבוה ביותר, תמיכה מעולה בעברית'
  }
};
```

### 3. **הקראה (TTS)** → OpenAI TTS HD
```typescript
// POST-TEMPORARY PLAN - Premium voice
const PREMIUM_TTS = {
  primary: {
    provider: 'openai',
    model: 'tts-1-hd',
    voice: 'alloy', // או הקול הטוב ביותר לעברית
    reasoning: 'איכות קולית מקצועית'
  }
};
```

---

## ⚠️ **הערות חשובות**

1. **כל השינויים יסומנו ב-`TODO: TEMPORARY`**
2. **נשמור fallbacks לכל שירות** קריטי
3. **נעקוב צריכת קרדיט Deepgram** לא לבזבז
4. **נבדוק איכות עברית** בכל מודל חדש
5. **נכין rollback מהיר** אם משהו נכשל

---

## 📈 **צפי חיסכון**

- **OpenAI API:** ~$20-50/חודש
- **Claude API:** ~$15-30/חודש  
- **חיסכון כולל:** **~$35-80/חודש**
- **תקופת חיסכון:** עד לסדר תשלומים

---

## ✅ **סטטוס הגירה**

- [ ] סריקת מיקומי AI
- [ ] עדכון טקסט/צ'אט ל-Google AI
- [ ] עדכון אודיו ל-Deepgram  
- [ ] עדכון TTS ל-Deepgram Aura
- [ ] בדיקות תקינות
- [ ] מעקב צריכה

---

> **חתימה:** תוכנית חסכון זמנית מאושרת ע"י מנכ"ל  
> **תוקפת:** עד לסדר תשלומים וחזרה למודלים פרימיום
