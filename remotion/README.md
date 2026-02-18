# MISRAD AI - סרטון פרסומת Remotion

## תיאור
סרטון פרסומת מקצועי של 60 שניות (30fps) עבור MISRAD AI.

## מבנה הסרטון

### 🎬 סצנות (Scenes)

1. **Hook Scene** (0-3 שניות)
   - פתיחה שוקינג עם אפקטי glitch
   - טקסט: "תפסיקו לרוץ אחרי העסק"
   - מסר: תנו ל-AI לעבוד במקומכם

2. **Problem Scene** (3-11 שניות)
   - 5 בעיות קריטיות שעסקים מתמודדים איתן
   - אנימציות דינמיות לכל בעיה
   - מסר: אתם לא צריכים עוד עובד, אתם צריכים מערכת

3. **Solution Scene** (11-20 שניות)
   - הצגת MISRAD AI כפתרון
   - לוגו עם אפקט זוהר
   - מסר: לא CRM עם AI, מערכת AI שמנהלת את הארגון

4. **Features Scene** (20-45 שניות)
   - הצגת 6 המודולים:
     * מרכז המכירות - AI חוזה סגירות
     * שיווק חכם - Hashtags + שעות מיטביות
     * ניהול צוות - משימות אוטומטיות
     * Client OS - מעקב לקוחות חכם
     * Finance AI - חשבוניות + תחזיות
     * תפעול שטח - פרויקטים
   - כל מודול מוצג 1.5 שניות

5. **CTA Scene** (45-60 שניות)
   - קריאה לפעולה: "תתחילו עכשיו"
   - 14 יום ניסיון חינם
   - 3 יתרונות: ללא כרטיס אשראי, התקנה מיידית, תמיכה בעברית
   - כפתור CTA: misrad.ai

## 🎨 עיצוב

### צבעים
- **Primary**: `#A21D3C` (Deep Rose/Wine)
- **Indigo**: `#3730A3`
- **Onyx**: `#09090B`, `#18181B`, `#27272A`
- **Surface**: `#F8FAFC`, `#F1F5F9`

### פונטים
- **Heebo** - פונט ראשי (בעברית)
- Font weights: 500, 700, 900

### אנימציות
- Spring configs מותאמים אישית
- Hero: `{ damping: 12, stiffness: 100, mass: 0.8 }`
- Camera: `{ damping: 25, stiffness: 50, mass: 1.2 }`
- UI: `{ damping: 10, stiffness: 200 }`

## 🚀 שימוש

### תצוגה מקדימה
```bash
npm run remotion:preview
```

### רינדור הסרטון
```bash
npm run remotion:render
```

הסרטון יישמר ב-`out/video.mp4`

### אפשרויות רינדור מתקדמות
```bash
# רזולוציה גבוהה
remotion render remotion/index.ts MisradAIPromo out/video.mp4 --quality=100

# FPS שונה
remotion render remotion/index.ts MisradAIPromo out/video.mp4 --fps=60

# קודק אחר
remotion render remotion/index.ts MisradAIPromo out/video.mp4 --codec=prores
```

## 📁 מבנה קבצים

```
remotion/
├── index.ts                    # Entry point
├── Root.tsx                    # Remotion root
├── config.ts                   # קונפיגורציה (צבעים, טיימינג)
├── compositions/
│   └── MisradAIPromo.tsx      # קומפוזיציה ראשית
└── scenes/
    ├── HookScene.tsx          # סצנת פתיחה
    ├── ProblemScene.tsx       # סצנת בעיות
    ├── SolutionScene.tsx      # סצנת פתרון
    ├── FeaturesScene.tsx      # סצנת מודולים
    └── CTAScene.tsx           # סצנת CTA
```

## 🎯 תכונות מיוחדות

### אפקטים ויזואליים
- ✅ Glitch effects
- ✅ Shock waves
- ✅ Gradient orbs
- ✅ Particle systems
- ✅ Dynamic shadows and glows
- ✅ Backdrop blur effects

### אנימציות
- ✅ Spring-based animations (Remotion)
- ✅ Interpolation מתקדם
- ✅ Staggered animations
- ✅ Camera movements
- ✅ Scale & opacity transitions

### טיפוגרפיה
- ✅ RTL support (עברית)
- ✅ Gradient text effects
- ✅ Text shadows and glows
- ✅ Responsive font sizes

## 📝 הוספת קריינות

לאחר רינדור הסרטון, תוכל להוסיף קריינות באמצעות עורך וידאו:
1. Adobe Premiere Pro
2. DaVinci Resolve
3. Final Cut Pro
4. או כל עורך וידאו אחר

פשוט ייבא את `out/video.mp4` והוסף את קובץ האודיו שלך.

## 🔧 התאמה אישית

### שינוי צבעים
ערוך את `remotion/config.ts`:
```typescript
export const MISRAD_COLORS = {
  primary: '#A21D3C',
  // שנה כאן...
};
```

### שינוי טקסטים
ערוך את הקבצים ב-`remotion/scenes/`

### שינוי זמנים
ערוך את `remotion/config.ts`:
```typescript
export const TIMING = {
  scenes: {
    hook: { start: 0, duration: 90 },
    // שנה כאן...
  },
};
```

## 🎬 תוצאה סופית

**משך**: 60 שניות  
**רזולוציה**: 1920x1080 (Full HD)  
**FPS**: 30  
**פורמט**: MP4 (H.264)  
**גודל משוער**: ~20-30MB

---

**נוצר עבור MISRAD AI** • מערכת AI לניהול ארגונים
