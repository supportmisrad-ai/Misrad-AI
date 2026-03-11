# 30 פרומפטים סטוריז 9:16 — סט ב׳ (גרסה קולנועית)
# מבוסס על launch-design.tsx protocol

> **כללי פרוטוקול (מתוך launch-design.tsx):**
> - ❌ **NO flat backgrounds** — תמיד multi-layer radial gradients
> - ❌ **NO "glow"** — רק **Optical Bloom** (refracted light halos, blur 30px)
> - ✅ **Film grain overlay** על כל סצנה (fractalNoise, mixBlendMode: overlay, 4% opacity)
> - ✅ **Glass cards** — rgba(255,255,255,0.07), backdrop-filter blur(30px), 1.5px rgba border
> - ✅ **80-90% fill** — אין dead space, אלמנטים ממלאים את המסך
> - ✅ **2-5° Dutch tilt** לתחושה קולנועית
> - ✅ **Safe Zone:** 150px top, 280px bottom
> - ✅ **Typography:** Rubik 800 (מספרים/EN), Heebo (כותרות HE)
> - ✅ **Logo:** Shield M mark (#0F172A) + "MISRAD AI" Rubik 800

---

## 🎨 הפלטה המאושרת

### Brand Accent (Indigo)
- Primary: `#6366F1` / Light: `#818CF8` / Dim: `rgba(99,102,241,0.15)`

### WARM Palette (launch-config.ts)
- Amber: `#C5A572` / Light: `#EAD7A1` / Dark: `#8B6B3A`
- Gold: `#D4A04A` / Cream: `#F5F0E8`
- WarmDark: `#0A0A0F` / WarmSurface: `#1A1520`

### sceneBg Base (NEVER flat)
```
background:
  radial-gradient(ellipse 120% 60% at 50% 35%, [BLOOM_COLOR at 8%], transparent),
  radial-gradient(ellipse 80% 40% at 20% 80%, rgba(55,48,163,0.04), transparent),
  radial-gradient(ellipse 60% 30% at 80% 20%, rgba(197,165,114,0.03), transparent),
  linear-gradient(180deg, #12101C 0%, #0E0C16 40%, #0A0910 70%, #080810 100%);
```

### Gradient Text Variants
- **warm:** #FFFFFF → #E8E2D8 → #F0EDE8
- **gold:** #C7D2FE → #6366F1 → #818CF8 → #A5B4FC
- **brand:** #FFFFFF → #6366F1 → #818CF8
- **white:** #FFFFFF → #E0E0E0 → #FFFFFF

---

## סטורי 1 — Package: The Closer
**סוג:** חבילה | **bloom:** rgba(99,102,241,0.12) | **קונספט:** Pipeline
```
1080×1920 vertical story. RTL Hebrew.
BACKGROUND: sceneBg with bloom rgba(99,102,241,0.12) at 50% 35%. 
  Additional BloomOrb indigo #6366F1, size 500, at 50% 40%, blur 30px, intensity 12%.
  Film grain overlay 4% opacity.
LAYOUT (safeFill, 80-90% fill, 2° Dutch tilt):
  TOP: MisradLogo shield (80px) + "MISRAD AI" Rubik 800.
  Badge pill: "💼 חבילת מכירות · ₪249/חודש" — rgba(99,102,241,0.15) bg, 1px indigo border.
  CENTER: 4-stage pipeline in glass row cards (960px wide, rgba(255,255,255,0.07), blur 30px):
    "ליד חדש" → "פגישה" → "הצעת מחיר" → "סגירה ✓"
    FlowArrow SVG between each. Active stage has indigo left border accent.
  HEADLINE: gradientText 72px variant 'brand': "מליד — לכסף."
  SUBTITLE: Heebo 40px #818CF8: "CRM חכם + AI שמדרג + תיעוד שיחות"
  BOTTOM (safe zone): Glass card — "System + Nexus · 1 משתמש · 7 ימים חינם"
  CTA pill: bg indigo gradient, Rubik 800 32px white: "נסה את ה-CRM" + misrad-ai.com
```

---

## סטורי 2 — Package: The Operator
**סוג:** חבילה | **bloom:** rgba(16,185,129,0.10) | **קונספט:** Field HUD
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(16,185,129,0.10) at 50% 30%.
  BloomOrb emerald #10B981, 450px, at 40% 45%, intensity 10%.
  Second BloomOrb teal #0D9488, 300px, at 70% 70%, intensity 6%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo + badge "🔧 תפעול ושטח · ₪349/חודש" emerald pill.
  CENTER: 3 stacked rowCards (960px, glass, indigo-replaced with emerald accent):
    Row 1: DangerDot green + "דני — בדרך ליעד" + GPS pin icon
    Row 2: DangerDot amber + "יוסי — בביצוע" + wrench icon
    Row 3: CheckIcon green + "עמית — סיים + חתימה" + signature icon
  HEADLINE: gradientText 72px 'warm': "הסוף לבלגן בשטח."
  SUBTITLE: 40px emerald: "קריאות · טכנאים · מלאי · חתימה דיגיטלית"
  BOTTOM: Glass card "Operations + Nexus + Finance · 5 משתמשים"
  CTA: emerald gradient "התחל ניסיון חינם" + misrad-ai.com
```

---

## סטורי 3 — Package: The Authority
**סוג:** חבילה | **bloom:** rgba(139,92,246,0.10) | **קונספט:** Content Flow
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(139,92,246,0.10) at 50% 35%.
  BloomOrb purple #8B5CF6, 500px, at 45% 40%, intensity 12%.
  BloomOrb pink #EC4899, 300px, at 65% 65%, intensity 6%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + badge "🎨 שיווק ומיתוג · ₪349/חודש" purple pill.
  CENTER: 3 glass cards (social post mockups) with colored left borders:
    📱 Instagram post card (pink border) — AI-generated caption preview
    💼 LinkedIn post card (blue border) — professional tone
    📧 Email template card (amber border) — marketing email
    Sparkle icons between cards (AI flow).
  HEADLINE: gradientText 72px 'gold': "מהתוכן — ללקוח משלם."
  SUBTITLE: 40px #818CF8: "AI תוכן · קמפיינים · תיק לקוח חכם"
  Feature pills: "#️⃣ Hashtags" | "⏰ שעות מיטביות" | "📊 ניתוח"
  BOTTOM: Glass card "Social + Client + Nexus · 5 משתמשים"
  CTA: purple gradient "התחל לשווק חכם" + misrad-ai.com
```

---

## סטורי 4 — Package: The Empire
**סוג:** חבילה | **bloom:** rgba(212,160,74,0.12) | **קונספט:** Command Ring
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.12) at 50% 40%.
  BloomOrb gold #D4A04A, 600px, center, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo (larger 100px) + 👑 crown.
  CENTER: Circular composition — MisradLogo at center, 6 module icons orbiting in a ring:
    Each icon in a small glass circle with module-color accent border:
    🟢 Operations · 🔴 System · 🟣 Nexus · 🩷 Social · 🟡 Client · 🔵 Finance
    Thin connecting lines between all (rgba white 10%).
  HEADLINE: gradientText 96px 'gold': "360° שליטה."
  SUBTITLE: Heebo 40px cream #F5F0E8: "כל 6 המודולים · 5 משתמשים · AI מלא"
  STAT glass card: "₪499/חודש במקום ₪1,260 — חיסכון 60%"
  CTA: gold gradient WARM.amber → WARM.gold "קבל גישה מלאה" + misrad-ai.com
```

---

## סטורי 5 — Package: Solo
**סוג:** חבילה | **bloom:** rgba(99,102,241,0.06) | **קונספט:** Minimal Focus
```
1080×1920. RTL.
BACKGROUND: Light variant — linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 50%, #F1F5F9 100%).
  Soft BloomOrb indigo, 400px, 50% 50%, intensity 4% (barely visible).
  Film grain 2% (light grain for white bg).
LAYOUT (safeFill, 0° tilt — clean/flat):
  TOP: MisradLogo dark shield.
  CENTER: Single large module icon outline (thin stroke, not filled).
    Below: 6 minimal icons in a row — 5 gray outlines, 1 filled indigo.
    Arrow → "אתה בוחר."
  HEADLINE: Rubik 800 96px #0F172A: "₪149"
  SUBTITLE: Heebo 52px #475569: "נקסוס בלבד. התחלה חכמה."
  Glass card (light variant: rgba(0,0,0,0.03), border slate-200):
    "משתמש 1 · ניהול צוות ומשימות · גדל איתך"
  CTA: Dark pill #0F172A, white text "התחל עכשיו" + misrad-ai.com
```

---

## סטורי 6 — AI: חיזוי סגירות
**סוג:** AI | **bloom:** rgba(6,182,212,0.10) | **קונספט:** Neural Nodes
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(6,182,212,0.10) at 50% 35%.
  BloomOrb cyan #06B6D4, 500px, 50% 40%, intensity 12%.
  BloomOrb indigo #6366F1, 300px, 30% 70%, intensity 6%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "🤖 AI" badge.
  CENTER: Network of connected nodes (glass circles).
    Central node: HUGE "87%" in gradientText 110px 'gold'.
    4 input nodes (smaller) connected by lines: "שיחות" "פגישות" "מיילים" "זמן תגובה"
    Output arrow → statCard cyan accent: "87% סיכוי סגירה"
  HEADLINE: gradientText 72px 'brand': "AI יודע מי ייסגר."
  SUBTITLE: 40px cyan: "מנתח התנהגות · מדרג לידים · חוסך זמן"
  Small: "GPT-4o + Claude · מתעדכן אוטומטית"
  CTA: cyan-to-blue gradient "ראה AI בפעולה" + misrad-ai.com
```

---

## סטורי 7 — AI: תיעוד קולי
**סוג:** AI | **bloom:** rgba(167,139,250,0.10) | **קונספט:** Voice→Structure
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(167,139,250,0.10) at 50% 30%.
  BloomOrb lavender #A78BFA, 450px, 45% 35%, intensity 10%.
  BloomOrb mint #34D399, 300px, 60% 70%, intensity 6%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo + "✨ תיעוד חכם" badge lavender.
  CENTER: Visual flow (top to bottom):
    Microphone icon (large, lavender accent) →
    Sound wave bars (animated feel) →
    Glass card (structured output):
      "לקוח: רון כהן" | "נושא: הצעת מחיר" | "סטטוס: מעוניין" | "Follow-up: יום ראשון"
  HEADLINE: gradientText 72px 'warm': "מדבר — המערכת מתעדת."
  SUBTITLE: 40px gradient lavender→mint: "AI שומע ויוצר תיעוד מלא"
  CTA: lavender gradient "נסה קלט קולי" + misrad-ai.com
```

---

## סטורי 8 — AI: רווחיות עובדים
**סוג:** AI | **bloom:** rgba(16,185,129,0.08) | **קונספט:** Profit Dashboard
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(16,185,129,0.08) at 50% 40%.
  BloomOrb emerald #10B981, 400px, 50% 45%, intensity 8%.
  Film grain 4%.
LAYOUT (safeTop, 2° tilt):
  TOP: MisradLogo + "📊 ניתוח AI" badge emerald.
  CENTER: Mini bar chart — 4 bars in glass container:
    "דני 140%" (tall, emerald) · "רון 110%" (medium, emerald) · 
    "מיכל 62%" (short, amber warning) · "עמית 95%" (medium, emerald)
  Below chart: Glass rowCard with AI suggestion:
    "💡 AI: להעביר 2 לקוחות מדני למיכל — +35% רווחיות צפויה"
  HEADLINE: gradientText 72px 'warm': "מי מרוויח. מי מפסיד."
  SUBTITLE: 40px emerald: "AI מנתח רווחיות לכל עובד"
  CTA: emerald gradient "גלה את הנתונים" + misrad-ai.com
```

---

## סטורי 9 — AI: מכונת תוכן
**סוג:** AI | **bloom:** rgba(139,92,246,0.10) | **קונספט:** Input→Outputs
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(139,92,246,0.10) at 50% 35%.
  BloomOrb purple #8B5CF6, 450px, 50% 35%, intensity 10%.
  BloomOrb amber #F59E0B, 250px, 65% 70%, intensity 5%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo + "🎨 מכונת תוכן" badge.
  CENTER: Input→Output flow:
    Glass input card: "נושא: מבצע קיץ" (text field mockup)
    FlowArrow ↓
    3 output glass cards fanned out (slight rotation each):
      📱 IG post (pink accent border)
      💼 LinkedIn (blue accent)
      📧 Email (amber accent)
  HEADLINE: gradientText 72px 'gold': "נושא אחד — 3 פוסטים."
  SUBTITLE: 40px white: "AI שמבין עברית ויודע מה עובד"
  CTA: purple gradient "צור תוכן עכשיו" + misrad-ai.com
```

---

## סטורי 10 — Killer: קלט קולי
**סוג:** פיצ׳ר | **bloom:** rgba(212,160,74,0.10) | **קונספט:** Voice Command
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.10) at 50% 35%.
  BloomOrb warm amber #C5A572, 450px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "🎤 חדש!" badge amber.
  CENTER: Large microphone SVG (amber accent, similar to PhoneAlertIcon style).
    3 glass rowCards flowing from mic:
      "פתח קריאה — אבי כהן" + CheckIcon ✓
      "שלח חשבונית ₪5,000" + CheckIcon ✓
      "עדכן ליד — מעוניין" + CheckIcon ✓
  HEADLINE: gradientText 72px 'warm': "תגיד — המערכת עושה."
  SUBTITLE: 40px #EAD7A1: "קלט קולי מלא. בלי כפפות. בלי מקלדת."
  Small 24px: "טכנאים · נהגים · אנשי מכירות"
  CTA: amber WARM gradient "נסה שליטה קולית" + misrad-ai.com
```

---

## סטורי 11 — Killer: טאבלט משותף
**סוג:** פיצ׳ר | **bloom:** rgba(99,102,241,0.10) | **קונספט:** Kiosk Clock
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(99,102,241,0.10) at 50% 30%.
  BloomOrb indigo, 500px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "📱 שעון נוכחות" badge indigo.
  CENTER: Tablet frame (960×600, glass card, thick border).
    Inside: 4 avatar circles in a grid:
      "דני ✅ 08:01" | "יוסי ✅ 08:03" | "מיכל 🕐 —" | "עמית ✅ 07:58"
    Large green button: "כניסה"
    GPS pin: "📍 מאושר ✓"
  HEADLINE: gradientText 72px 'brand': "טאבלט אחד. כל הצוות."
  SUBTITLE: 40px #818CF8: "שעון נוכחות · GPS · הרשאות"
  CTA: indigo gradient "התחל חינם" + misrad-ai.com
```

---

## סטורי 12 — Killer: העברת לידים
**סוג:** פיצ׳ר | **bloom:** rgba(212,160,74,0.12) | **קונספט:** Network
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.12) at 50% 40%.
  BloomOrb gold #D4A04A, 500px, 50% 45%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo + "🤝 רשת לידים" badge gold.
  CENTER: Network diagram — 3 person icons connected by gold lines.
    Person A → Lead card (glass) → Person B
    Below: FlowArrow back to A + "₪500 עמלה"
    Gold connection lines between all nodes.
  HEADLINE: gradientText 72px 'gold': "ליד שלא מתאים = כסף."
  SUBTITLE: 40px cream: "העבר לקולגה · קבל עמלה · כולם מרוויחים"
  CTA: gold gradient "הצטרף לרשת" + misrad-ai.com
```

---

## סטורי 13 — Security: הכספת
**סוג:** אבטחה | **bloom:** rgba(16,185,129,0.08) | **קונספט:** Shield Vault
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(16,185,129,0.08) at 50% 40%.
  BloomOrb emerald #10B981, 400px, 50% 45%, intensity 8%.
  BloomOrb blue #3B82F6, 300px, 30% 30%, intensity 5%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo.
  CENTER: ShieldCheckIcon (large, 160px, emerald accent).
    4 glass statCards in 2×2 grid around shield:
      "🔐 AES-256" | "🛡️ TLS 1.3" | "🏛️ GDPR" | "🇮🇱 חוק הפרטיות"
  HEADLINE: gradientText 72px 'warm': "המידע שלך בכספת."
  SUBTITLE: 40px emerald: "הצפנה בנקאית · שרתים מאובטחים · גיבוי יומי"
  Small: "99.9% זמינות · הנתונים לא משמשים לאימון AI"
  CTA: emerald gradient "ראה מדיניות אבטחה" + misrad-ai.com
```

---

## סטורי 14 — Security: ריבונות נתונים
**סוג:** אבטחה | **bloom:** rgba(6,182,212,0.08) | **קונספט:** Open Door
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(6,182,212,0.08) at 50% 35%.
  BloomOrb cyan #06B6D4, 450px, 50% 40%, intensity 8%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "📦 ריבונות" badge cyan.
  CENTER: LockOpenIcon (large 120px, green #22C55E).
    3 stacked glass rowCards:
      "📥 ייצוא מלא בקליק — CSV / Excel" + CheckIcon
      "🔓 ללא נעילת ספק — עוזב מתי שרוצה" + CheckIcon
      "🔑 הנתונים שייכים לך — חוקית" + CheckIcon
  HEADLINE: gradientText 72px 'warm': "תצא עם הכל."
  SUBTITLE: 40px cyan: "ללא עמלות · ללא עיכובים · ללא שאלות"
  CTA: cyan gradient "התחל בביטחון" + misrad-ai.com
```

---

## סטורי 15 — Tech: שקיפות
**סוג:** שקיפות | **bloom:** rgba(139,92,246,0.10) | **קונספט:** Circuit Board
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(139,92,246,0.10) at 50% 35%.
  BloomOrb purple #8B5CF6, 450px, 40% 35%, intensity 10%.
  BloomOrb indigo #6366F1, 300px, 65% 65%, intensity 6%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo + "⚙️ שקיפות טכנולוגית" badge purple.
  CENTER: 2×2 glass cards grid:
    🧠 "GPT-4o + Claude" (purple accent) — "מודלי AI מהשורה הראשונה"
    🔄 "עדכון אוטומטי" (indigo accent) — "תמיד חדש"
    🔌 "API פתוח" (emerald accent) — "Zapier · Make · ישיר"
    🇮🇱 "עברית מהיסוד" (amber accent) — "לא תרגום"
  HEADLINE: gradientText 72px 'brand': "מה מפעיל אותנו?"
  SUBTITLE: 40px gradient purple→indigo: "הנה התשובה המלאה."
  CTA: purple gradient "גלה עוד" + misrad-ai.com
```

---

## סטורי 16 — Competitive: למה לא Monday?
**סוג:** תחרותי | **bloom:** rgba(99,102,241,0.08) | **קונספט:** 4 Reasons
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(99,102,241,0.08) at 50% 40%.
  BloomOrb indigo, 400px, 50% 45%, intensity 8%.
  Film grain 4%.
LAYOUT (safeTop, 2° tilt):
  TOP: MisradLogo.
  HEADLINE: gradientText 72px 'white': "למה לא Monday?"
  CENTER: 4 stacked glass rowCards with colored left borders:
    1. Rose border: "ליווי אישי — לא טיקט"
    2. Indigo border: "עברית מהשורש — לא תרגום"
    3. Emerald border: "רגולציה ישראלית — חגים, שבת, פרטיות"
    4. Amber border: "עסק ישראלי — לא סטארטאפ"
  SUBTITLE: 40px #818CF8: "הבחירה ברורה."
  CTA: indigo gradient "נסו בעצמכם — חינם" + misrad-ai.com
```

---

## סטורי 17 — Cost: קבלה מפורטת
**סוג:** חיסכון | **bloom:** rgba(212,160,74,0.08) | **קונספט:** Receipt
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.08) at 50% 35%.
  BloomOrb amber, 400px, 50% 40%, intensity 8%.
  Film grain 4%.
LAYOUT (safeTop, 2° tilt):
  TOP: MisradLogo + "💰 המספרים" badge.
  CENTER: Large glass card (receipt style, 960px):
    Line items (Heebo 32px, left-aligned prices):
      "CRM ₪200" — strikethrough red
      "צוות ₪100" — strikethrough red
      "AI ₪150" — strikethrough red
      "שיווק ₪200" — strikethrough red
      "כספים ₪130" — strikethrough red
      "נוכחות ₪80" — strikethrough red
    Divider line.
    "סה״כ: ₪860" — crossed out, DangerDot red.
    Below: Highlighted emerald row:
    "MISRAD AI הכל כלול: ₪499 ✓" — CheckIcon green.
  HEADLINE: gradientText 52px 'gold': "חיסכון ₪4,332 בשנה."
  CTA: emerald gradient "התחל לחסוך" + misrad-ai.com
```

---

## סטורי 18 — Modularity: בלוקים
**סוג:** מודולריות | **bloom:** subtle | **קונספט:** Building Blocks (light)
```
1080×1920. RTL.
BACKGROUND: Light — linear-gradient(180deg, #FFFFFF, #F8FAFC, #F1F5F9).
  Very subtle BloomOrb indigo, 300px, 50% 50%, intensity 3%.
  Film grain 2%.
LAYOUT (safeFill, 0° tilt):
  TOP: MisradLogo dark.
  CENTER: 6 module "blocks" in 2×3 grid — each a rounded card with colored top border:
    🟢 Operations | 🔴 System | 🟣 Nexus | 🩷 Social | 🟡 Client | 🔵 Finance
    One is "selected" (full color fill). Rest are outline only.
  HEADLINE: Rubik 800 72px #0F172A: "שלם רק על מה שצריך."
  SUBTITLE: Heebo 40px #475569: "מודול 1 = ₪149 · הכל כלול = ₪499"
  4 pills: "מודולריות" | "גמישות" | "פשטות" | "מדרג"
  CTA: dark pill "בחר חבילה" + misrad-ai.com
```

---

## סטורי 19 — Industry: סוכנים/נדל״ן
**סוג:** קהל | **bloom:** rgba(99,102,241,0.10) | **קונספט:** Deal Cards
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(99,102,241,0.10) at 50% 35%.
  BloomOrb indigo, 500px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "🏠 סוכנים" badge indigo.
  CENTER: 3 glass deal cards stacked:
    "דירה 4 חד׳ · ₪2.1M · 75% סגירה" (emerald accent) + progress bar
    "משרד · ₪850K · פגישה מחר" (indigo accent) + calendar icon
    "מגרש · ₪3.5M · ממתין" (amber accent) + clock icon
  HEADLINE: gradientText 72px 'brand': "CRM לסוכנים."
  SUBTITLE: 40px: "Pipeline · תיעוד שיחות · AI שמדרג"
  Pain text small: "לידים על פתקים? זה נגמר."
  CTA: indigo gradient "התחל חינם" + misrad-ai.com
```

---

## סטורי 20 — Industry: קבלנים
**סוג:** קהל | **bloom:** rgba(16,185,129,0.10) | **קונספט:** Field Map
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(16,185,129,0.10) at 50% 30%.
  BloomOrb emerald, 450px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo + "🔧 קבלנים" badge emerald.
  CENTER: Glass card with map mockup (dark, route line from A to B).
    Below: Split — phone screen left (service call), signature pad right (חתימה ✓).
    Voice bubble at bottom: "🎤 פתח קריאה — הרצל 15"
  HEADLINE: gradientText 72px 'warm': "הטכנאי בשטח. אתה שולט."
  SUBTITLE: 40px emerald: "קריאות · ניווט · חתימה · קלט קולי"
  Features: "📷 AI זיהוי חלקים" | "📋 הוכחת ביצוע" | "📦 מלאי"
  CTA: emerald gradient "נסה 7 ימים" + misrad-ai.com
```

---

## סטורי 21 — Industry: סושיאל/סוכנויות
**סוג:** קהל | **bloom:** rgba(139,92,246,0.10) | **קונספט:** Multi-Platform
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(139,92,246,0.10) at 50% 35%.
  BloomOrb purple, 500px, 45% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "📱 סושיאל" badge purple.
  CENTER: 3-column glass card (platform headers: IG · FB · LinkedIn).
    Each column: mini engagement graph + post preview.
    AI row below: "💡 זמן מיטבי: רביעי 11:00" + sparkle icon.
    Hashtag glass pill: "#עסקיםקטנים #שיווקדיגיטלי"
  HEADLINE: gradientText 72px 'gold': "עוקבים → לקוחות."
  SUBTITLE: 40px purple: "תוכן AI · קמפיינים · ניתוח · תיק לקוח"
  CTA: purple gradient "התחל חינם" + misrad-ai.com
```

---

## סטורי 22 — Feature: פורטל לקוח
**סוג:** פיצ׳ר | **bloom:** rgba(212,160,74,0.08) | **קונספט:** Client Portal
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.08) at 50% 40%.
  BloomOrb amber WARM.amber, 400px, 50% 45%, intensity 8%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "🤝 פורטל לקוח" badge amber.
  CENTER: Phone-frame glass card (client portal screen):
    "הפרויקטים שלי" — 2 project rows with progress bars
    "מסמכים" — 3 file icons
    "חשבוניות" — "₪3,500 שולם ✓"
    "פגישה" — "יום ג׳ 10:00 · Zoom"
  HEADLINE: gradientText 72px 'warm': "הלקוח רואה הכל."
  SUBTITLE: 40px #EAD7A1: "פורטל · מסמכים · חשבוניות · פגישות"
  Small: "אתה נראה מקצועי. הלקוח מרוצה."
  CTA: amber gradient "הפעל פורטל" + misrad-ai.com
```

---

## סטורי 23 — Feature: חשבונית ירוקה
**סוג:** פיצ׳ר | **bloom:** rgba(20,184,166,0.10) | **קונספט:** Invoice Flow
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(20,184,166,0.10) at 50% 35%.
  BloomOrb teal #14B8A6, 450px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "📄 כספים" badge teal.
  CENTER: Vertical flow with FlowArrows between glass cards:
    Step 1: "בחר לקוח" (glass card, teal border)
    ↓ FlowArrow
    Step 2: "₪5,000" (statCard, large number)
    ↓ FlowArrow
    Step 3: WhatsApp icon + Email icon → "חשבונית ירוקה ✓"
  HEADLINE: gradientText 72px 'warm': "מליד לחשבונית."
  SUBTITLE: 40px teal: "הנפקה · וואטסאפ · גבייה אוטומטית"
  Small: "חיבור Morning (חשבונית ירוקה)"
  CTA: teal gradient "התחל לגבות" + misrad-ai.com
```

---

## סטורי 24 — Feature: שעון נוכחות
**סוג:** פיצ׳ר | **bloom:** rgba(99,102,241,0.10) | **קונספט:** Clock-In
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(99,102,241,0.10) at 50% 40%.
  BloomOrb indigo, 450px, 50% 45%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo + "⏰ נוכחות" badge indigo.
  CENTER: AnalogClock SVG (420px, indigo accent, showing 8:00).
    Below clock: Glass card:
      "בוקר טוב, דני 👋"
      Large green button "כניסה ✓"
      "📍 מיקום מאושר"
    Stat row: "34.5 / 42 שעות" | "4/5 ימים"
  HEADLINE: gradientText 72px 'brand': "שעון שלא צריך הסבר."
  SUBTITLE: 40px #818CF8: "כניסה · GPS · דוחות"
  CTA: indigo gradient "נסה חינם" + misrad-ai.com
```

---

## סטורי 25 — Emotional: AI לילי
**סוג:** רגשי | **bloom:** rgba(99,102,241,0.06) | **קונספט:** Night Watch
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(99,102,241,0.06) at 50% 50%.
  BloomOrb indigo, 600px, 50% 50%, intensity 5% (very subtle — nighttime).
  Film grain 5% (grainier for mood).
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo (opacity 0.6).
  CENTER: CalendarIcon (large) → 3 glass rowCards appearing sequentially:
    "02:17 — תזכורת גבייה נשלחה" + CheckIcon
    "03:45 — דוח שבועי הוכן" + CheckIcon
    "06:00 — סיכום בוקר מוכן" + CheckIcon
  HEADLINE: gradientText 96px 'warm': "אתה ישן."
  SUBTITLE: gradientText 52px 'gold': "המערכת ערה."
  Small 32px rgba white 60%: "AI 24/7 — תזכורות, דוחות, אוטומציות"
  CTA: subtle indigo gradient "תן ל-AI לעבוד" + misrad-ai.com
```

---

## סטורי 26 — Emotional: שבת שלום
**סוג:** רגשי | **bloom:** rgba(212,160,74,0.15) | **קונספט:** Candle Warmth
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.15) at 50% 30%.
  BloomOrb WARM.candleGlow rgba(255,200,100,0.4), 500px, 50% 25%, intensity 15%.
  Film grain 4%.
LAYOUT (safeFill, 0° tilt — respectful, stable):
  TOP: MisradLogo.
  CENTER: Two CandleSVG (160px each, side by side, with bloom halos).
    Below candles: Glass card (warm accent):
      "🕯️ סיכום שבועי"
      "15 עסקאות · ₪47,500 הכנסה"
      "0 משימות פתוחות"
      "🔒 נעול עד מוצ״ש"
  HEADLINE: gradientText 72px 'warm': "שבת שלום."
  SUBTITLE: 40px #EAD7A1: "סיכום אוטומטי · נעילה · מנוחה"
  Small: "מערכת שמכבדת את הזמן שלך."
  CTA: warm gold gradient "גלה מצב שבת" + misrad-ai.com
```

---

## סטורי 27 — Stat: חיסכון שנתי
**סוג:** מספר | **bloom:** rgba(16,185,129,0.10) | **קונספט:** Big Number
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(16,185,129,0.10) at 50% 40%.
  BloomOrb emerald, 500px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 2° tilt):
  TOP: MisradLogo.
  CENTER: HUGE number — gradientText 110px 'gold': "₪4,332"
  Below: Heebo 52px emerald: "חיסכון שנתי"
  Glass card (breakdown):
    "בנפרד: ₪860 × 12 = ₪10,320"
    "MISRAD AI: ₪499 × 12 = ₪5,988"
    "הפרש: ₪4,332 ✓" (emerald highlight)
  Small: "+ 520 שעות חיסכון בזמן"
  CTA: emerald gradient "התחל לחסוך" + misrad-ai.com
```

---

## סטורי 28 — Stat: 520 שעות
**סוג:** מספר | **bloom:** rgba(212,160,74,0.10) | **קונספט:** Time Freed
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.10) at 50% 35%.
  BloomOrb gold, 500px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 3° tilt):
  TOP: MisradLogo.
  CENTER: HUGE — gradientText 110px 'gold': "520"
  Below: Heebo 52px cream: "שעות בשנה."
  Glass card:
    "10 שעות/שבוע × 52 = 520 שעות"
    "= 65 ימי עבודה = חודשיים וחצי חופש"
  3 statCards in a row:
    "👨‍👩‍👧 משפחה" | "📈 צמיחה" | "🏖️ מנוחה"
  CTA: gold gradient "תתחיל לחסוך זמן" + misrad-ai.com
```

---

## סטורי 29 — Carousel: 6 מודולים
**סוג:** אינפוגרפיקה | **bloom:** rgba(99,102,241,0.08) | **קונספט:** Module Stack
```
1080×1920. RTL.
BACKGROUND: sceneBg bloom rgba(99,102,241,0.08) at 50% 40%.
  BloomOrb indigo, 400px, 50% 50%, intensity 8%.
  Film grain 4%.
LAYOUT (safeTop, 2° tilt):
  TOP: MisradLogo + "6 מודולים · מערכת אחת" badge.
  CENTER: 6 stacked glass rowCards, each with module-color left border (4px):
    🟢 emerald: "תפעול — קריאות, טכנאים, מלאי"
    🔴 rose: "מכירות — Pipeline, AI, תיעוד"
    🟣 indigo: "צוות — משימות, נוכחות, יעדים"
    🩷 purple: "שיווק — AI תוכן, קמפיינים"
    🟡 amber: "לקוחות — פורטל, פגישות"
    🔵 teal: "כספים — חשבוניות, גבייה"
  HEADLINE: gradientText 52px 'brand': "בחר מה שצריך. או קח הכל."
  Price pills: "₪149 → ₪499/חודש"
  CTA: indigo gradient "בנה את המשרד שלך" + misrad-ai.com
```

---

## סטורי 30 — Brand: הסיפור
**סוג:** מותג | **bloom:** rgba(212,160,74,0.10) | **קונספט:** Origin Timeline
```
1080×1920. RTL.
BACKGROUND: warmSceneBg bloom rgba(212,160,74,0.10) at 50% 40%.
  BloomOrb gold, 500px, 50% 40%, intensity 10%.
  Film grain 4%.
LAYOUT (safeFill, 0° tilt — stable/authentic):
  TOP: MisradLogo large (100px).
  CENTER: Vertical timeline — gold line connecting 3 milestone glass cards:
    📌 "הבעיה" — "5 תוכנות אמריקאיות שלא מבינות עברית"
    💡 "הרעיון" — "מערכת אחת, בעברית, עם AI, שמנהלת הכל"
    🚀 "MISRAD AI" — "AI שמנהל. לא CRM עם AI."
  HEADLINE: gradientText 72px 'warm': "לא סטארטאפ."
  SUBTITLE: 40px cream: "חברה ישראלית. כלי שלא היה קיים."
  Bottom: "🇮🇱 תוצרת ישראל · עברית · AI מהשורה הראשונה"
  CTA: dark pill with gold border "גלו את MISRAD AI" + misrad-ai.com
```

---

## טבלת סיכום — סט ב׳ (קולנועי)

| # | סוג | bloom color | קונספט | מסר |
|---|------|-------------|--------|-----|
| 1 | Package: Closer | indigo 0.12 | Pipeline | מליד לכסף |
| 2 | Package: Operator | emerald 0.10 | Field HUD | הסוף לבלגן |
| 3 | Package: Authority | purple 0.10 | Content Flow | מהתוכן ללקוח |
| 4 | Package: Empire | gold 0.12 | Command Ring | 360° שליטה |
| 5 | Package: Solo | indigo 0.06 | Minimal (light) | ₪149 התחלה |
| 6 | AI: חיזוי | cyan 0.10 | Neural Nodes | AI יודע מי ייסגר |
| 7 | AI: תיעוד | lavender 0.10 | Voice→Structure | מדבר — מתעד |
| 8 | AI: רווחיות | emerald 0.08 | Dashboard | מי מרוויח |
| 9 | AI: תוכן | purple 0.10 | Input→Outputs | נושא → 3 פוסטים |
| 10 | Killer: קולי | amber 0.10 | Voice Command | תגיד — עושה |
| 11 | Killer: טאבלט | indigo 0.10 | Kiosk Clock | טאבלט אחד |
| 12 | Killer: לידים | gold 0.12 | Network | ליד = כסף |
| 13 | Security: כספת | emerald 0.08 | Shield Vault | בכספת |
| 14 | Security: ריבונות | cyan 0.08 | Open Door | תצא עם הכל |
| 15 | Tech: שקיפות | purple 0.10 | Circuit Board | מה מפעיל |
| 16 | Competitive | indigo 0.08 | 4 Reasons | למה לא Monday |
| 17 | Cost | amber 0.08 | Receipt | ₪4,332 חיסכון |
| 18 | Modularity | subtle (light) | Blocks | שלם על מה שצריך |
| 19 | Industry: סוכנים | indigo 0.10 | Deal Cards | CRM לסוכנים |
| 20 | Industry: קבלנים | emerald 0.10 | Field Map | שליטה מהשטח |
| 21 | Industry: סושיאל | purple 0.10 | Multi-Platform | עוקבים → לקוחות |
| 22 | Feature: פורטל | amber 0.08 | Client Portal | הלקוח רואה הכל |
| 23 | Feature: חשבונית | teal 0.10 | Invoice Flow | מליד לחשבונית |
| 24 | Feature: נוכחות | indigo 0.10 | AnalogClock | שעון פשוט |
| 25 | Emotional: לילה | indigo 0.06 | Night Watch | ישן — ערה |
| 26 | Emotional: שבת | candleGlow 0.15 | CandleSVG | שבת שלום |
| 27 | Stat: כסף | emerald 0.10 | Big Number | ₪4,332 |
| 28 | Stat: זמן | gold 0.10 | Time Freed | 520 שעות |
| 29 | Carousel | indigo 0.08 | Module Stack | 6 מודולים |
| 30 | Brand | gold 0.10 | Origin Timeline | לא סטארטאפ |
