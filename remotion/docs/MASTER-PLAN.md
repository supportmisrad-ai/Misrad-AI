# 🎬 MISRAD AI — Video Production Master Plan
## סטנדרט: פרסומות טלוויזיה / Netflix

---

## 📐 סטנדרט טכני (חוקי ברזל)

### Color & Anti-Banding
- **Color Depth:** 32-bit (Remotion default float) — no 8-bit banding
- **Film Grain Overlay:** שכבת noise 1.5% על כל גרדיאנט/רקע בהיר — מחליק מעברים
- **Gradient Dithering:** כל gradient עובר דרך `noiseLayer()` shared component

### Camera & Depth
- **Virtual Camera:** 3D perspective transforms עם DoF simulation
- **Macro Shots:** focus חד על אלמנט אחד + bokeh blur (6-12px gaussian) על שאר
- **Camera Moves:** dolly, truck, crane — לא static cuts

### Animation & Easing
- **Custom Bezier Only:** `cubicBezier(0.16, 1, 0.3, 1)` — aggressive start, silk landing
- **No generic ease-in/ease-out** — כל תנועה custom
- **Spring Physics:** `damping: 14, stiffness: 180` — punch with control
- **Motion Blur:** CSS `filter: blur()` dynamic לפי velocity

### Lighting & Material
- **Directional Light:** virtual light source top-left — creates depth
- **Soft Drop Shadows:** `0 20px 60px rgba(0,0,0,0.08)` — float effect
- **Glassmorphism:** `backdrop-filter: blur(40px)` + semi-transparent bg
- **Specular Highlights:** subtle white gradient overlays on glass cards

### Hook (שנייה ראשונה)
- **כל סרטון מתחיל בהוק ויזואלי** — zoom-in דרמטי / pixel-explosion / shockwave
- **אסור fade-in רגיל** — חובה movement שתופס עין

### Format
- **Social (Primary):** 1080×1920 (9:16) @ 30fps
- **TV/Landscape:** 1920×1080 (16:9) @ 30fps  
- **Duration:** 15-20 שניות per video (social optimal)

---

## 🎨 Brand Design System

### Colors (from tailwind.config.ts + registry.ts)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#A21D3C` | Deep Rose/Wine — CTA, highlights |
| `indigo` | `#3730A3` | Indigo — secondary, gradients |
| `nexus` | `#3730A3` | Module: ניהול, משימות וצוות |
| `system` | `#A21D3C` | Module: מכירות |
| `social` | `#7C3AED` | Module: שיווק |
| `finance` | `#059669` | Module: כספים |
| `client` | `#C5A572` | Module: מעקב לקוחות |
| `operations` | `#0EA5E9` | Module: תפעול |
| `bg-dark` | `#09090B` | Dark theme bg |
| `bg-light` | `#F8FAFC` | Light theme bg |
| `surface` | `#18181B` | Dark cards |
| `surface-light` | `#F1F5F9` | Light cards |

### Typography
- **Headlines:** Heebo 900 (Black)
- **Body:** Heebo 600-700
- **Data/Numbers:** Rubik 700-800
- **Direction:** RTL always

### Brand Gradient
```
linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)
```

---

## 📋 Video Map — 15 סרטונים

### קטגוריה A: מודולים (6 סרטונים)
כל אחד מראה UI אמיתי של המודול + AI advantage

| # | מודול | צבע | Hook | קהל יעד | רקע |
|---|-------|------|------|----------|-----|
| A1 | **System** (מכירות) | `#A21D3C` | זום-אין לליד שנסגר 75% | מנהלי מכירות, סוכנויות | Dark → Light |
| A2 | **Nexus** (ניהול צוות) | `#3730A3` | Dashboard pulse → task assignment | מנכ"לים, מנהלי HR | Light |
| A3 | **Social** (שיווק) | `#7C3AED` | Post publish → analytics explosion | מנהלי שיווק, SMB | Dark |
| A4 | **Finance** (כספים) | `#059669` | Cash flow chart growing | בעלי עסקים, CFO | Light → Dark |
| A5 | **Client** (לקוחות) | `#C5A572` | Health score pulsing | מנהלי שירות, coaches | Light (premium) |
| A6 | **Operations** (תפעול) | `#0EA5E9` | Kanban cards auto-sorting | מנהלי תפעול, שטח | Dark |

### קטגוריה B: חבילות (6 סרטונים)
כל אחד מראה את השילוב בין המודולים + ערך לקהל ספציפי

| # | חבילה | מחיר | מודולים | קהל יעד | Hook |
|---|--------|-------|---------|----------|------|
| B1 | **Solo** (מודול בודד) | ₪149 | 1 לבחירה | פרילנסרים, עצמאיים | "מודול אחד. כל מה שצריך." |
| B2 | **The Closer** (מכירות) | ₪249 | System + Nexus | אנשי מכירות, סוכנויות | "סוגר עסקאות. לא מפספס לידים." |
| B3 | **The Authority** (שיווק) | ₪349 | Social + Client + Nexus | מותגים, יוצרי תוכן | "המותג שלך. AI שלנו." |
| B4 | **The Operator** (תפעול) | ₪349 | Operations + Nexus | קבלנים, חברות שטח | "תפעול חכם. אפס בלגן." |
| B5 | **The Empire** (הכל כלול) | ₪499 | All 5 modules | ארגונים 10-200 | "הכל. במערכת אחת." |
| B6 | **The Mentor** (כל החבילות) | ₪499 | All 5 modules | יועצים, מאמנים | "תלמד. תנהל. תצמיח." |

### קטגוריה C: UI Demo (3 סרטונים)
מראים את חווית השימוש האמיתית במובייל

| # | נושא | Hook | רקע |
|---|------|------|-----|
| C1 | **הרשמה + טביעת אצבע** | Macro zoom על אצבע → סורק | Light |
| C2 | **ניווט מובייל** | Swipe בין מודולים | Light/Dark |
| C3 | **AI בפעולה** | שיחה עם AI → תובנות live | Dark → Light |

---

## 🎬 מבנה סרטון סטנדרטי (15-20 שניות)

```
[0.0s-1.0s]  HOOK — ויזואלי מטורף, תופס גלילה
[1.0s-3.0s]  SETUP — מה הבעיה / מה המודול
[3.0s-10.0s] SHOWCASE — UI אמיתי, macro shots, DoF
[10.0s-14.0s] AI MOMENT — ה-AI עושה משהו מדהים
[14.0s-16.0s] RESULT — מספר / תוצאה / הבטחה
[16.0s-18.0s] CTA — לוגו + URL + מחיר (אם רלוונטי)
```

---

## 🏗️ Remotion Architecture

```
remotion/
├── index.ts                    # Entry point
├── Root.tsx                    # All compositions registered
├── shared/
│   ├── config.ts               # Colors, fonts, motion, brand tokens
│   ├── components/
│   │   ├── NoiseLayer.tsx       # Anti-banding grain overlay
│   │   ├── VirtualCamera.tsx    # 3D perspective + DoF
│   │   ├── GlassCard.tsx        # Glassmorphism UI card
│   │   ├── PhoneFrame.tsx       # Mobile device mockup frame
│   │   ├── BrandGradient.tsx    # Consistent gradient backgrounds
│   │   ├── HookTransition.tsx   # Dramatic opening hooks
│   │   ├── DirectionalLight.tsx # Virtual lighting system
│   │   ├── CTAEndcard.tsx       # Logo + URL + pricing endcard
│   │   └── TextReveal.tsx       # Animated Hebrew RTL text
│   └── utils/
│       ├── easing.ts            # Custom bezier curves
│       └── camera.ts            # Camera movement helpers
├── modules/
│   ├── system/                  # A1: מכירות
│   ├── nexus/                   # A2: ניהול צוות
│   ├── social/                  # A3: שיווק
│   ├── finance/                 # A4: כספים
│   ├── client/                  # A5: לקוחות
│   └── operations/              # A6: תפעול
├── packages/
│   ├── solo/                    # B1
│   ├── closer/                  # B2
│   ├── authority/               # B3
│   ├── operator/                # B4
│   ├── empire/                  # B5
│   └── mentor/                  # B6
└── ui-demos/
    ├── registration/            # C1
    ├── navigation/              # C2
    └── ai-action/               # C3
```

---

## 🎯 סדר עבודה

1. **תשתית Shared** — config, NoiseLayer, VirtualCamera, GlassCard, easing
2. **סרטון A1: System (מכירות)** — ה-benchmark, מקבע את הרמה
3. **Review + iterate** — מעבר עם הלקוח
4. **A2-A6** — שאר המודולים
5. **B1-B6** — חבילות
6. **C1-C3** — UI demos
7. **TV/Landscape variants** — resize + adapt

---

## 📝 נקודות חשובות

- **"פרוטוקול"** — אסור להשתמש במילה הזו
- **השם:** MISRAD AI (לא Scale CRM, לא Nexus OS)
- **RTL:** כל טקסט בעברית, direction: rtl
- **AI במרכז:** כל סרטון חייב להדגיש שה-AI הוא הבסיס, לא תוספת
- **קהלי יעד:** מ-2 עובדים ועד 200+
- **מחירים:** להציג רק בסרטוני חבילות
