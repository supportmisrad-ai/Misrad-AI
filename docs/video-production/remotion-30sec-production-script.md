# 🎬 Production Script — MISRAD AI | סרטון 30 שניות
**גרסה:** 1.0 | **פורמט:** 1080×1920 (Vertical / Reels) או 1920×1080 (Landscape)  
**FPS:** 30 | **משך:** 30 שניות = 900 frames  
**סגנון:** Dark Luxury × Claymation Chaos × UI Reveal

---

## 🎨 פלטת צבעים רשמית

| שם | HEX | שימוש |
|---|---|---|
| **Onyx Black** | `#09090B` | רקע ראשי |
| **Deep Wine** | `#A21D3C` | אקסנט ראשי, גלואו |
| **Royal Indigo** | `#3730A3` | אקסנט משני, גרדיאנט |
| **Nexus Gradient** | `#A21D3C → #3730A3` | קווים, הדגשות, לוגו |
| **Ghost White** | `#F8FAFC` | טקסט, UI elements |
| **Smoke** | `rgba(255,255,255,0.08)` | Glass cards |

**פונטים:** Heebo Bold (עברית) / Inter (מספרים/אנגלית)

---

## 🛡️ לוגו — ניתוח ויזואלי

הלוגו הוא **מגן (Shield)** כהה עם האות **M** בלבן — מטאפורה טבעית: הגנה, כוח, מבצר.  
בסרטון: המגן יהיה נוכח כ-leitmotif — מופיע, מתפרק, מתאחד מחדש.

---

## ⏱️ מבנה הסרטון — שלב אחר שלב

---

### 🔴 SCENE 1 | שניות 0–5 | "הפצצה הפותחת"
**Frames:** 0–150

#### מה רואים (Visual)
קליפ Opal. רקע שחור מוחלט. מהמרכז פורץ **ענן של חלקיקי אבק כסוף-אדום** — כמו פיצוץ איטי בחלל. מתוך האבק מתגבש לאט לאט צורת המגן של MISRAD AI, אבל **לא שלם** — קצוות שבורים, חלקים צפים בנפרד. הכל בתנועה איטית מאוד (slow-mo). המצלמה מתחילה מ-**macro קיצוני** (רואים רק טקסטורה של חלקיקים) ומושכת אחורה (pull-back reveal).

#### הנחייה ל-Opal (Prompt)
```
Cinematic slow-motion explosion of metallic crimson and silver dust particles in deep black void space. 
Particles gradually coalesce into a fragmented geometric shield shape. 
Macro lens pull-back reveal. 
Hyper-realistic claymation texture on particles. 
Color palette: deep black #09090B background, crimson #A21D3C particles with indigo #3730A3 glow edges. 
No light sources except particle self-illumination. 
Mood: controlled chaos becoming order. 
Camera: starts extreme macro (particles fill frame), slowly pulls back to reveal shield silhouette. 
Duration: 5 seconds, 30fps.
```

#### הנחייה לקוד (Remotion)
```
- frame 0–60: opacity 0→1 (interpolate, easing: easeInCubic)
- frame 0–150: scale 3.0→1.0 (spring, stiffness:40, damping:18) — pull-back effect
- frame 120–150: logo SVG overlay מתחיל להופיע עם opacity 0→0.3 (hint בלבד)
- blur: frame 0–90 = blur(8px)→blur(0px) — פוקוס מתחדד עם ה-pull-back
```

#### טקסט/כתוביות
```
[אין טקסט — רק ויזואל]
```
**הגיון:** 5 שניות ראשונות = hook ויזואלי טהור. אסור לטקסט להפריע.

---

### 🟠 SCENE 2 | שניות 5–15 | "הבעיה — בלי רחמים"
**Frames:** 150–450

#### מה רואים (Visual)
**פיצול מסך (Split):** 
- **שמאל (60%):** קליפ Opal — **דמות קלאיימיישן** (ראש בלבד, ללא פנים — רק צורה) שוקעת לתוך **ים של נייר** — דפים, הודעות, לוגואים של אפליקציות (WhatsApp, Excel, Gmail) נופלים עליה כמו גשם. הדמות מנסה לתפוס הכל ונכשלת. הכל בצבעי אפור-לבן מנוגד לרקע השחור.
- **ימין (40%):** קומפוננטת React — **"notification flood"**: התראות מזייפות נופלות מלמעלה למטה כמו Matrix, כל אחת מייצגת כלי אחר (📊 Excel, 💬 WhatsApp, 📧 Gmail, 📅 Calendar). כל כרטיסייה מגיעה עם spring animation ונעלמת.

**הולכת עין:** המצלמה ב-Opal מתמקדת בידיים של הדמות — **close-up על ידיים שמנסות לתפוס** ונכשלות. הפוקוס עובר בין שמאל לימין כל 2 שניות.

#### הנחייה ל-Opal (Prompt)
```
Claymation style. Faceless clay humanoid figure drowning in an avalanche of paper documents, 
app logos (WhatsApp green, Excel green, Gmail red), and notification bubbles falling from above. 
The figure's clay hands reach up desperately trying to catch papers but they slip through. 
Background: pure black. 
Clay texture: matte, slightly glossy. 
Color: figure in warm grey clay, papers in white/light grey, app logos in their original colors but desaturated 50%. 
Camera: tight close-up on the hands, slight dutch angle. 
Mood: overwhelm, controlled chaos. 
No faces, no eyes — abstract humanoid only. 
Duration: 10 seconds, 30fps.
```

#### הנחייה לקוד (Remotion)
```
NotificationFlood Component:
- מערך של 12 כרטיסיות התראה
- כל כרטיסייה: translateY(-100vh)→translateY(+110vh) 
  duration: 60–80 frames, staggered delay: כל כרטיסייה מתחילה 15 frames אחרי הקודמת
- spring({ stiffness: 60, damping: 20 }) על כניסה
- opacity: 1→0 ב-20 frames האחרונים של כל כרטיסייה
- רקע כרטיסייה: rgba(255,255,255,0.06) glass effect
- border: 1px solid rgba(255,255,255,0.1)

Split layout:
- frame 150–160: clip מגיע מ-translateX(-100%)→0 (spring)
- frame 150–165: React panel מגיע מ-translateX(+100%)→0 (spring)
```

#### טקסט/כתוביות
```
[frame 200, center-bottom, fade-in spring]
"5 כלים. 3 אפליקציות. אפס שליטה."

[frame 320, center-bottom, replace previous]
"הצוות שלך טובע."
```
**סגנון טקסט:** Heebo Bold, 52px, Ghost White, letter-spacing: -0.02em  
**אנימציה:** כל מילה נכנסת בנפרד עם `spring({ stiffness: 200, damping: 25 })` מ-translateY(+20px)

---

### 🔵 SCENE 3 | שניות 15–25 | "הפתרון — הדגמה חיה"
**Frames:** 450–750

#### מה רואים (Visual)
**מעבר:** הנייר והכאוס "נשאב" למרכז המסך כמו black hole — כל ה-notifications מתכנסות לנקודה אחת ונעלמות. **פלאש לבן קצר (2 frames).**

אחרי הפלאש: **ממשק MISRAD AI** מופיע — קומפוננטת React מלאה. לא screenshot — **UI חי ואמיתי** עם:
1. **Dashboard card** עם מספרים שמתעדכנים בזמן אמת (counter animation)
2. **AI insight bubble** שמופיע מהצד: *"לקוח X עומד לעזוב — סיכוי 78%"*
3. **Task card** שמסמנת את עצמה כ-Done אוטומטית
4. **Revenue counter** שעולה: ₪0 → ₪47,200

**הולכת עין:** הממשק מופיע תחילה מטושטש (blur) ומתחדד. המצלמה "מתקרבת" (scale 0.85→1.0) לכרטיס ה-AI insight — הוא הכוכב.

#### הנחייה ל-Opal (Prompt)
```
[לסצנה זו אין קליפ Opal — כולה React UI]
```
*הערה: הסצנה הזו היא showcase טכנולוגי — קוד בלבד מעביר את המסר טוב יותר מ-Claymation.*

#### הנחייה לקוד (Remotion)
```
Black hole transition (frames 440–460):
- כל ה-notification cards: translateX/Y → (0,0) + scale 1→0 בו-זמנית
- spring({ stiffness: 300, damping: 30 })
- frame 458–460: white flash, opacity 0→1→0

Dashboard reveal (frames 460–520):
- scale: 0.85→1.0, spring({ stiffness: 80, damping: 20 })
- blur: 12px→0px, interpolate linear
- opacity: 0→1, frames 460–490

AI Insight bubble (frames 530–560):
- translateX: +200px→0, spring({ stiffness: 120, damping: 18 })
- background: linear-gradient(135deg, #A21D3C, #3730A3)
- border-radius: 16px
- pulse glow: box-shadow animate 0→"0 0 30px rgba(162,29,60,0.6)"→0, loop

Revenue counter (frames 560–720):
- interpolate(frame, [560,720], [0, 47200])
- Math.floor() לתצוגה
- easing: easeOutExpo
- צבע: #A21D3C → #10B981 (אדום לירוק בעת עלייה)

Task auto-complete (frame 650):
- checkbox scale: 0→1.2→1.0, spring bounce
- strike-through line: width 0→100%, 20 frames
```

#### טקסט/כתוביות
```
[frame 470, top-left, small label]
"MISRAD AI — בזמן אמת"

[frame 540, center, large — מעל ה-AI bubble]
"ה-AI שלך רואה מה שאתה מפספס."

[frame 680, bottom]
"כל הצוות. כל הנתונים. מקום אחד."
```

---

### 🟣 SCENE 4 | שניות 25–30 | "הסגירה — לא מנומסת"
**Frames:** 750–900

#### מה רואים (Visual)
**קליפ Opal + לוגו React overlay.**

הממשק "מתקפל" לתוך עצמו כמו origami — כל ה-cards מתקפלות לריבוע אחד, הריבוע הופך למגן (Shield), המגן הופך ללוגו MISRAD AI המלא. **Claymation texture** על המגן — הוא נראה כמו חפץ פיזי, תלת-ממדי, עם משקל.

הלוגו מרחף במרכז על רקע שחור. מתחתיו: CTA.

**הולכת עין:** כל הפריים מתכנס למרכז. הלוגו הוא הנקודה היחידה שנשארת. שום דבר אחר לא מסיח.

#### הנחייה ל-Opal (Prompt)
```
Claymation 3D shield logo floating in black void. 
Shield has deep navy/black clay body with glossy finish, white letter "M" embossed on surface. 
Subtle crimson glow emanating from shield edges (#A21D3C). 
Shield slowly rotates 15 degrees left-right (pendulum motion). 
Realistic clay material: slight fingerprint texture, matte with specular highlights. 
Dramatic single light source from top-right casting soft shadow below. 
Background: pure black, no gradients. 
Camera: static, centered, slight low-angle (shooting up at shield = power). 
Duration: 5 seconds, 30fps.
```

#### הנחייה לקוד (Remotion)
```
Origami fold transition (frames 750–810):
- כל dashboard card: rotateY 0→90deg, scale 1→0.1, staggered 5 frames each
- spring({ stiffness: 200, damping: 28 })
- כולן מתכנסות ל-center point

Logo reveal (frames 800–840):
- Opal clip fade-in: opacity 0→1, 40 frames
- scale: 0.3→1.0, spring({ stiffness: 60, damping: 14 }) — bounce קל
- glow pulse: box-shadow "0 0 0px #A21D3C" → "0 0 60px #A21D3C" → "0 0 20px #A21D3C"
  interpolate, frames 840–900, loop

CTA text (frames 840–870):
- "misrad.ai" — Inter Bold, 28px, opacity 0→1, translateY +10→0
- spring({ stiffness: 300, damping: 30 })

Final tagline (frames 860–900):
- "תנהל פחות. תשלוט יותר."
- Heebo Bold, 44px, Ghost White
- כל מילה נכנסת בנפרד, stagger 8 frames
- opacity 0→1 + translateY +15→0
```

#### טקסט/כתוביות
```
[frame 840, center-bottom, small]
"misrad.ai"

[frame 865, center, large — HERO LINE]
"תנהל פחות. תשלוט יותר."

[frame 890, bottom, very small]
"הצטרף עכשיו — חינם ל-14 יום"
```

---

## 📋 טבלת סיכום מהיר

| זמן | סצנה | סוג | טקסט מרכזי | מצב רגשי |
|---|---|---|---|---|
| **0–5s** | פיצוץ → מגן | Opal בלבד | — | מתח, סקרנות |
| **5–15s** | כאוס + notifications | Opal + React | "הצוות שלך טובע." | כאב, זיהוי |
| **15–25s** | Dashboard חי + AI | React בלבד | "ה-AI שלך רואה מה שאתה מפספס." | הקלה, השתאות |
| **25–30s** | לוגו + CTA | Opal + React | "תנהל פחות. תשלוט יותר." | כוח, החלטה |

---

## 🎵 המלצת מוזיקה / Sound Design

| שלב | סאונד |
|---|---|
| 0–5s | שקט מוחלט + single low bass hit בframe 0 |
| 5–15s | Tension build — strings + hi-hat מהיר |
| 15–25s | Drop — beat נכנס, אנרגטי אבל לא אגרסיבי |
| 25–30s | Resolve — chord אחד נקי + silence לפני CTA |

**המלצת track:** Artlist / Epidemic Sound — חפש: "dark tech minimal cinematic"

---

## 🔧 סדר עבודה מומלץ

1. **קודם** — צור את 3 קליפי Opal (Scene 1, Scene 2, Scene 4) לפי ה-prompts
2. **אחר כך** — בנה את ה-React components (NotificationFlood, Dashboard, AIInsightBubble)
3. **לבסוף** — הרכב ב-Remotion עם timing מדויק לפי ה-frames
4. **בדיקה** — ייצא preview ב-x0.5 speed לוודא שה-transitions חלקים

---

## ⚠️ דגלים אדומים (מה לא לעשות)

- ❌ אל תשים טקסט על גבי קליפ Opal ב-Scene 1 — הוא חייב לנשום לבד
- ❌ אל תשתמש ב-white background בשום סצנה — הכל Onyx Black
- ❌ אל תאט את ה-Scene 3 — הקצב שם חייב להיות מהיר ואנרגטי
- ❌ אל תוסיף מוזיקה חזקה מדי ב-Scene 4 — הלוגו צריך שקט סביבו
- ❌ אל תשים יותר מ-2 שורות טקסט בו-זמנית בשום מקום
