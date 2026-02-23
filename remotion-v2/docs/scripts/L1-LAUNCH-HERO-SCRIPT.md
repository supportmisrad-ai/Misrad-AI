# L1 — "הבלגן" | סרטון השקה ראשי (Hero)

> **אורך:** 75 שניות (2,250 פריימים @ 30fps)
> **פורמט:** Social (1080×1920) + TV (1920×1080)
> **קהל יעד:** בעלי עסקים קטנים-בינוניים בישראל, שומרי שבת, דתיים, מסורתיים, חילוניים שמכבדים
> **מטרה:** להכאיב את הבעיה → להראות שיש פתרון אחד → לבנות אמינות מיידית → לשכנע להירשם
> **גישה:** "פתרון לבעיה שלך" — לא "מערכת עם 6 מודולים"
> **דמות:** גבר עם כיפה, חולצה מכופתרת, נראה מקצועי ומכובד. SVG מינימליסטי עם נפח — קווי מתאר כהים, מילוי רך. לא קריקטורה. לא צללית שטוחה.

---

## הנחיות ויזואליות גלובליות

- **אפס אייקונים.** רק אינפוגרפיקות, גרפים, UI screenshots, טקסט מעוצב.
- **אפס מדרגות.** כל מעבר צבע/בהירות בהדרגה רציפה (CSS transitions, interpolate רך).
- **אפס ריצוד.** כל אנימציה עם spring physics או cubic-bezier חלק.
- **ניגודיות מקסימלית** בין טקסט לרקע. טקסט לבן על כהה, או כהה על בהיר. לא אפור על אפור.
- **Noise 2%** על כל רקע (לא שטוח לעולם).
- **כל 30–90 פריימים (1–3 שניות)** = שינוי ויזואלי ברור.
- **מוזיקה:** Corporate cinematic, תחילה מינימלי, מתגבר לקראת פתרון, שיא ב-CTA.
- **SFX:** Whoosh במעברים, subtle click בלחיצות, "lock" sound ב-Slot Machine Roll.

---

## סצנה 1: HOOK — "הבלגן שלך" [0:00–0:05]
**פריימים: 0–150 | מוזיקה: Piano note יחיד, מהדהד | SFX: notification sounds מדורגים**

| שנייה | פריימים | מה רואים | אנימציה | קריינות | מוזיקה/SFX |
|-------|---------|----------|---------|---------|------------|
| 0:00–0:01.5 | 0–45 | **רקע כהה חם (#0A0A0F) עם noise 2%.** באמצע — טלפון (DeviceFrame). על המסך: **5 notification badges** מתממשים אחד-אחד — "וואטסאפ (47)" / "אקסל" / "גוגל שיטס" / "CRM ישן" / "חשבונית ידנית". כל badge = frosted glass אדמדם. **הדמות** (גבר עם כיפה, חולצה מכופתרת) עומדת ליד הטלפון — ידיים על הראש, שפת גוף של "אני טובע". | Phone: materializes from blur (15 frames). Badges: stagger appear (6 frames apart). Character: materializes in parallel, subtle head shake. Background: slow radial gradient pulse (dark red). | (שקט — רק SFX) | Piano: single low note. SFX: notification ping ×5, staggered. |
| 0:01.5–0:03 | 45–90 | **הטלפון "מתפוצץ" — badges נפרשים החוצה** ב-3D space, כל אחד צף בזווית אחרת. **"47 הודעות. 5 אפליקציות. אף אחת לא מדברת עם השנייה."** — טקסט materialize, white, Heebo 700. | Badges: explode outward with physics (spring overshoot). Phone: slight push-back. Character: steps back. Text: word-by-word reveal from right. | "47 הודעות. 5 אפליקציות. אף אחת לא מדברת עם השנייה." | SFX: glass scatter. Music: tension string enters. |
| 0:03–0:05 | 90–150 | **Camera slow dolly in על הדמות.** הדמות מביטה ישירות קדימה (אל הצופה). **"מכיר את הסיפור?"** — טקסט גדול, brushed metal, 60% מהפריים. Bloom רך. | Camera: dolly in (VirtualCamera zoom 1.0→1.15). Character: turns to face camera. Text: materializes enormous from blur. | "מכיר את הסיפור?" | Music: beat drop — silence for 0.5s. |

---

## סצנה 2: PROBLEM — "הכאב" [0:05–0:15]
**פריימים: 150–450 | מוזיקה: Tense strings, low BPM | SFX: error sounds, typing**

| שנייה | פריימים | מה רואים | אנימציה | קריינות | מוזיקה/SFX |
|-------|---------|----------|---------|---------|------------|
| 0:05–0:08 | 150–240 | **3 "כאבים" — frosted glass cards אדומים מתממשים ב-3D space, אחד-אחד.** Camera dolly ביניהם. **Card 1:** "ליד חדש הגיע — שכחת לחזור" — אינפוגרפיקה: timeline עם gap אדום. **Card 2:** "חשבונית שנשלחה באיחור — הלקוח עצבני" — אינפוגרפיקה: invoice עם שעון אדום. **Card 3:** "יום שישי 14:00 — עדיין לא סיימת" — אינפוגרפיקה: שעון עם יום שישי מודגש. | Cards: materialize from transparency, 20 frames each, stagger 25 frames. Camera: dolly between cards. Each card: frosted glass dark + red accent border. Infographics inside: simple line art, animate on. | "ליד שנשרף כי שכחת לחזור. חשבונית שנתקעה כי האקסל קרס. ויום שישי — עוד לא סגרת את השבוע." | Music: tension builds. SFX: subtle error sound per card. |
| 0:08–0:11 | 240–330 | **הדמות — medium shot.** יושבת ליד שולחן עם 3 מסכים (laptop + tablet + phone) — כולם מראים דברים שונים. **"אתה הראוטר. אתה מעביר מידע בין מערכות שלא מכירות אחת את השנייה."** הדמות מסתכלת מאחד לשני — frustrated. | Character: head turns between devices (3 positions, spring animation). Devices: frosted glass frames, each shows different UI. Background: subtle red vignette. | "אתה הראוטר. אתה מעביר מידע ביד — בין מערכות שלא מכירות אחת את השנייה." | Music: strings sustain. |
| 0:11–0:15 | 330–450 | **מעבר דרמטי:** כל ה-cards + מסכים + badges **מתפוררים** (disintegration particles) → **מסך שחור לרגע (15 frames)** → **ואז — נקודת אור אחת** במרכז. Bloom חם. **"מה אם הכל היה במקום אחד?"** | All elements: disintegrate simultaneously (40 particles each). Black: 15 frames of silence. Light dot: materializes with warm bloom, expands slowly. Text: materializes from the light, brushed warm metal. | "מה אם הכל — הכל — היה במקום אחד?" | Music: silence during black. Then: warm pad enters. SFX: reverse shatter (rebuild). |

---

## סצנה 3: SOLUTION — "הפתרון" [0:15–0:30]
**פריימים: 450–900 | מוזיקה: Uplifting corporate, building | SFX: whoosh, crystallize**

| שנייה | פריימים | מה רואים | אנימציה | קריינות | מוזיקה/SFX |
|-------|---------|----------|---------|---------|------------|
| 0:15–0:18 | 450–540 | **נקודת האור מתרחבת** → **הלוגו של MISRAD AI מתגבש מתוכה.** לא flat — refraction, depth, כאילו עשוי מזכוכית חמה. מתחתיו: **"מקום אחד. לכל העסק."** — brushed metal, warm tone. הדמות חוזרת — עכשיו עומדת ישר, ידיים על המותניים, ביטחון. | Logo: crystallizes from light particles (30 frames). Text: materializes word-by-word. Character: enters from right, confident pose. Background: dark→warm dark gradient transition (smooth, no steps). | "MISRAD AI. מקום אחד. לכל העסק." | Music: uplifting pad + subtle beat enters. SFX: crystallize sound. |
| 0:18–0:22 | 540–660 | **טלפון חדש — UI נקי.** Camera dolly in. המסך מראה **4 "פתרונות"** — לא כמודולים אלא כפעולות: "ליד חדש → AI מדרג" / "חשבונית → נשלחת בלחיצה" / "צוות → רואים מי עושה מה" / "תוכן → AI כותב בעברית". כל פעולה = שורה ב-UI עם badge ירוק "✓ פועל". | Phone: materializes from blur. UI rows: stagger appear (8 frames each). Each row: slide from right (RTL), badge turns green with bloom. Camera: slow dolly in. | "ליד נכנס — AI מדרג אותו. חשבונית — נשלחת בלחיצה. הצוות — רואים מי עושה מה. ותוכן — AI כותב לך בעברית." | Music: beat strengthens. SFX: soft "ding" per row. |
| 0:22–0:26 | 660–780 | **THE MAGIC MOMENT.** Camera עוקבת אחרי **"מסע של ליד"** — animation path רציף: **ליד נכנס** (badge כחול) → **AI מדרג** (badge הופך ירוק) → **שיחה מתועדת** (waveform) → **הצעת מחיר נשלחת** (envelope animation) → **לקוח חותם** (V ירוק) → **חשבונית יוצאת** (invoice slides out). **מסע אחד רציף, אנימציה פיזית — לא steps infographic.** | Path animation: continuous morph chain. Each step: shape+color transform (15 frames per morph). Camera: follows the path horizontally. Background: gradient shifts warm→cool→warm per step. Character: walks alongside the path, pointing. | "מהליד הראשון — ועד החשבונית האחרונה. מסע אחד. מסך אחד. בלי להעתיק. בלי לחפש. בלי לשכוח." | Music: building momentum. SFX: whoosh between morphs. |
| 0:26–0:30 | 780–900 | **Camera pulls back** — כל המסע נראה כ"קו זהב" אחד שרץ לאורך המסך. הדמות עומדת בסוף הקו, מחייכת. **"והכל — עם AI שמבין עברית."** — brushed gold, Bloom. **מתחת:** "לא תרגום. שפת אם." — smaller, muted. | Dolly out: full path visible as golden line. Character: at end, satisfied pose. Text: materializes from blur, gold brushed metal. Sub-text: fade in, smaller. | "והכל — עם AI שמבין עברית. לא תרגום. שפת אם." | Music: arrives at confident plateau. |

---

## סצנה 4: DIFFERENTIATOR — "מה שאין לאף אחד" [0:30–0:45]
**פריימים: 900–1350 | מוזיקה: Warm, confident, gold tone | SFX: clock tick, shabbat siren**

| שנייה | פריימים | מה רואים | אנימציה | קריינות | מוזיקה/SFX |
|-------|---------|----------|---------|---------|------------|
| 0:30–0:35 | 900–1050 | **שומר שבת — THE BIG DIFFERENTIATOR.** רקע מתחמם — warm dark amber. **שעון גדול:** "יום שישי, 14:00". הדמות לוחצת כפתור אחד — **"מצב שבת"**. **כל המסך "נרגע":** notifications נעלמות, UI הופך חשוך-חם, **frosted glass "מנעול"** ננעל על המסך עם animation רכה. **"המערכת יוצאת לשבת. לבד."** — gold brushed metal, enormous. | Clock: ticks with subtle animation. Button press: scale 0.95→1.0 with bloom. UI transition: all elements fade to warm dark (30 frames, smooth). Lock: materializes frosted glass with gold border. Text: materializes enormous. Character: hands at sides, peaceful expression. | "יום שישי. לוחצים כפתור אחד. המערכת יוצאת לשבת. לבד. אף ליד לא הולך לאיבוד — הוא בכספת. אף חשבונית לא נשלחת. שקט מוחלט." | Music: warm, slower. SFX: soft clock ticks, then silence, then gentle "lock" sound. |
| 0:35–0:40 | 1050–1200 | **לוח עברי — THE SECOND DIFFERENTIATOR.** מתוך ה"שקט" — **לוח שנה מתממש.** לא גרגוריאני — **תאריכים עבריים מודגשים:** "י"ז בתמוז" / "ט' באב" / "ערב ראש השנה". **כל תאריך = frosted badge זהוב.** Camera dolly between dates. **"לוח שמבין מתי ערב חג. מתי לגבות. מתי לא לשלוח."** | Calendar: materializes from transparency. Hebrew dates: stagger appear with gold bloom. Camera: gentle dolly. Character: points at calendar, nods. | "ולוח עברי. שמבין מתי ערב חג. מתי לגבות לפני שהעסק סוגר. מתי לא לשלוח הודעה. אין עוד מערכת כזו. בשום מקום." | Music: gold tone, pride. |
| 0:40–0:45 | 1200–1350 | **"אין עוד מערכת כזו."** — ENORMOUS, 80% מהפריים, brushed gold, Bloom. **הדמות — close-up, מביטה ישירות לצופה.** ברקע: soft focus of calendar + lock. **Beat.** 2 שניות של שקט עם הטקסט על המסך — לתת לזה לשקוע. | Text: materializes from center, enormous. Camera: slow push-in on character face. Background: soft bokeh of previous elements. Hold: 2 seconds of stillness (important!). | "אין עוד מערכת כזו. בשום מקום." | Music: holds — single warm chord. SFX: none (power of silence). |

---

## סצנה 5: PROOF — "מספרים אמיתיים" [0:45–0:55]
**פריימים: 1350–1650 | מוזיקה: Confident beat returns | SFX: slot machine locks**

| שנייה | פריימים | מה רואים | אנימציה | קריינות | מוזיקה/SFX |
|-------|---------|----------|---------|---------|------------|
| 0:45–0:49 | 1350–1470 | **3 "facts" — frosted glass cards, enormous:** **"₪149 — מתחילים"** (Slot Machine Roll, green bloom) / **"5 דקות — מההרשמה לעבודה"** (Slot Machine Roll) / **"7 ימים — ניסיון חינם"** (Slot Machine Roll, gold bloom). Rack focus between them. | Cards: materialize in 3D space. Numbers: slot machine roll → lock with overshoot. Rack focus: shifts between cards (spring animation). Each card: frosted glass + colored bloom. | "149 שקל בחודש — מתחילים. 5 דקות מההרשמה — ואתה עובד. 7 ימים ניסיון — בלי כרטיס אשראי." | Music: confident beat. SFX: slot machine lock ×3. |
| 0:49–0:55 | 1470–1650 | **"מה כלול?"** — 4 frosted glass rows מתממשות: "מכירות חכמות + AI" / "חשבוניות + מעקב תשלומים" / "ניהול לקוחות + פורטל" / "שיווק + תוכן AI בעברית". כל שורה = פעולה, לא מודול. Badge ירוק ליד כל אחת. **הדמות עומדת ליד — ביטחון, עם חיוך קל.** | Rows: stagger appear (10 frames apart), slide from right. Badges: turn green with bloom. Character: confident stance, slight nod per row. | "מכירות חכמות עם AI. חשבוניות ומעקב תשלומים. ניהול לקוחות ופורטל שלהם. שיווק ותוכן — AI כותב בעברית. הכל — ממסך אחד." | Music: building to finale. |

---

## סצנה 6: IDENTITY + CTA [0:55–1:15]
**פריימים: 1650–2250 | מוזיקה: Peak → warm resolve | SFX: whoosh, bloom**

| שנייה | פריימים | מה רואים | אנימציה | קריינות | מוזיקה/SFX |
|-------|---------|----------|---------|---------|------------|
| 0:55–1:00 | 1650–1800 | **Brand gradient (warm) עם noise 2%.** **"MISRAD AI"** — enormous, brushed metal, Bloom. מתחתיו: **"מערכת הפעלה לעסק. בעברית. עם AI. ושומרת שבת."** — 4 שורות, כל אחת מתממשת. **הדמות — full body, confident, ליד הלוגו.** | Background: smooth gradient transition. Logo: materializes from particles. Tag lines: stagger word-by-word reveal. Character: walks in from right, stands beside logo. | "MISRAD AI. מערכת הפעלה לעסק. בעברית. עם AI. ושומרת שבת." | Music: peak moment. |
| 1:00–1:05 | 1800–1950 | **3 frosted glass badges מתממשים:** "🕎 שומרת שבת" / "📅 לוח עברי" / "🔐 7 ימי ניסיון חינם". כל badge = frosted glass + gold border + bloom. | Badges: materialize from transparency, stagger 10 frames. Gold border: animated gradient rotation (subtle). Bloom: warm. | "שומרת שבת. לוח עברי. 7 ימי ניסיון — חינם." | Music: warm resolve. |
| 1:05–1:10 | 1950–2100 | **CTA — "הכפתור".** רקע כהה חם. **כפתור ענק:** "להתחיל — חינם" — Brand gradient, pulsing bloom. מתחתיו: **"misrad-ai.com"** — brushed, clean. **הדמות מצביעה על הכפתור.** | Button: materializes with spring. Pulse: breathing bloom (sin wave). URL: materializes below. Character: points at button, encouraging. | "לחיצה אחת. להתחיל — חינם. misrad-ai.com." | Music: resolves to warm final chord. |
| 1:10–1:15 | 2100–2250 | **Outro — שקט מכובד.** לוגו + URL + **"AI שמקדם את העסק שלך"** — על רקע כהה חם. Noise 2%. Breathing bloom. **הדמות — medium shot מאחור, הולכת לעבר האור.** Fade to warm dark. | Logo + URL: hold. Character: walks forward (into the future). Background: slow vignette closing. Fade: gradual over 30 frames. | (שקט — רק מוזיקה) | Music: final warm note, fade out. |

---

## טבלת מוזיקה ו-SFX

| שנייה | מוזיקה (עוצמה 0–100) | SFX |
|-------|----------------------|-----|
| 0:00–0:03 | Piano solo (20) | Notification pings ×5 |
| 0:03–0:05 | Tension string (30) | Glass scatter |
| 0:05–0:11 | Tense strings (40) | Error sounds ×3 |
| 0:11–0:13 | Silence (0) | Reverse shatter |
| 0:13–0:15 | Warm pad enters (20) | — |
| 0:15–0:26 | Uplifting build (40→60) | Crystallize, dings, whoosh |
| 0:26–0:30 | Confident plateau (60) | — |
| 0:30–0:35 | Warm, slower (45) | Clock ticks, lock sound |
| 0:35–0:45 | Gold tone (50) | — |
| 0:45–0:55 | Confident beat (65) | Slot machine locks ×3 |
| 0:55–1:05 | Peak (75) | — |
| 1:05–1:15 | Resolve + fade (60→0) | — |

---

## הערות הפקה

1. **הדמות:** SVG מונפש — גבר עם כיפה סרוגה/שחורה, חולצה מכופתרת לבנה, מכנסיים כהים. פנים: עיניים + גבות + אף מינימלי (לא ריאליסטי, לא קריקטורה). תנועות: head tilt, arm gestures, walking — כולן spring-based.
2. **אפס אייקונים.** כל "פיצ'ר" מוצג כ-frosted glass card עם אינפוגרפיקה פנימית (graphs, timelines, waveforms) — לא כאייקון עם label.
3. **מעברים:** כל מעבר בין סצנות = cross-fade חלק (15 frames) או morph פיזי. אפס hard cuts (חוץ מהרגע השחור ב-0:13 שהוא מכוון).
4. **RTL:** כל טקסט מימין לשמאל. כל animation direction = מימין.
5. **Slot Machine Roll:** ספרות מסתובבות עם motion blur, ננעלות עם overshoot spring. לא counter מ-0.
