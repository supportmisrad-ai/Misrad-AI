# 🎬 MISRAD AI Launch Videos — Asset Manifest

## מבנה תיקיות
```
public/launch-assets/
├── icons/          ← אייקונים SVG/PNG (שקוף)
├── characters/     ← דמות קריין/מגיש (Lottie JSON או PNG sequence)
├── backgrounds/    ← טקסטורות רקע, וידאו loops
├── lottie/         ← אנימציות Lottie (JSON)
└── videos/         ← קליפים MP4/WebM
```

---

## 📋 רשימת נכסים נדרשים

### 1. לוגו
| קובץ | פורמט | גודל מומלץ | הערות |
|-------|--------|-------------|-------|
| `icons/logo.svg` | SVG | 512×512 | לוגו MISRAD AI **בצבע המקורי** (כהה/כחול כהה) |
| `icons/logo-white.svg` | SVG | 512×512 | לוגו לבן לרקעים כהים |
| `icons/logo-glow.png` | PNG | 512×512 | לוגו עם אפקט bloom/הילה (אם יש) |

### 2. דמות קריין מונפש (CHARACTER)
| קובץ | פורמט | הערות |
|-------|--------|-------|
| `characters/narrator-idle.json` | Lottie JSON | דמות עומדת/נושמת — לופ |
| `characters/narrator-talking.json` | Lottie JSON | דמות מדברת — לופ |
| `characters/narrator-pointing.json` | Lottie JSON | דמות מצביעה — חד פעמי |
| **או:** `characters/narrator.webm` | WebM (שקוף) | סרטון דמות על רקע שקוף |
| **או:** `characters/narrator.png` | PNG | תמונה סטטית של הדמות |

> 💡 אפשרות: תייצר דמות ב-[LottieFiles](https://lottiefiles.com), [Ready Player Me](https://readyplayer.me), או [Canva Animate](https://canva.com)

### 3. אייקונים — אינפוגרפיקות (ICONS)
| קובץ | שימוש | פורמט |
|-------|--------|--------|
| `icons/lead.svg` | ליד/לקוח פוטנציאלי | SVG שקוף |
| `icons/invoice.svg` | חשבונית | SVG שקוף |
| `icons/crm.svg` | CRM/ניהול לקוחות | SVG שקוף |
| `icons/team.svg` | ניהול צוות | SVG שקוף |
| `icons/ai-brain.svg` | AI / בינה מלאכותית | SVG שקוף |
| `icons/calendar-hebrew.svg` | לוח עברי | SVG שקוף |
| `icons/shabbat.svg` | שבת/נרות | SVG שקוף |
| `icons/whatsapp.svg` | וואטסאפ | SVG שקוף |
| `icons/phone-alert.svg` | טלפון/התראה | SVG שקוף |
| `icons/lock.svg` | נעילה/אבטחה | SVG שקוף |
| `icons/chart-up.svg` | גרף עולה/צמיחה | SVG שקוף |
| `icons/workflow.svg` | תהליך/זרימה | SVG שקוף |
| `icons/checkmark.svg` | וי/אישור | SVG שקוף |
| `icons/danger.svg` | סכנה/בעיה | SVG שקוף |

> 💡 מקורות מומלצים: [Flaticon](https://flaticon.com), [Iconify](https://iconify.design), [Lucide](https://lucide.dev), [SVGRepo](https://svgrepo.com)
> סגנון מומלץ: outline/linear, צבע אחיד (לבן או זהב), line-weight 2px

### 4. רקעים (BACKGROUNDS)
| קובץ | שימוש | פורמט |
|-------|--------|--------|
| `backgrounds/dark-texture.mp4` | רקע כהה עם טקסטורה/grain — לופ 5-10 שניות | MP4 1080×1920 |
| `backgrounds/warm-texture.mp4` | רקע חם (שבת) עם grain — לופ 5-10 שניות | MP4 1080×1920 |
| `backgrounds/particles-dark.mp4` | חלקיקים צפים על רקע כהה | MP4 1080×1920 |
| **או:** `backgrounds/dark-texture.webp` | טקסטורה כהה סטטית | WebP 1080×1920 |
| **או:** `backgrounds/grain-overlay.png` | grain שקוף להנחה מעל | PNG 1080×1920 |

> 💡 מקורות: [Pexels](https://pexels.com/search/videos/dark%20particles), [Pixabay](https://pixabay.com), ייצור ב-Canva

### 5. אנימציות Lottie (LOTTIE)
| קובץ | שימוש |
|-------|--------|
| `lottie/candle-flame.json` | להבת נר מונפשת |
| `lottie/checkmark-anim.json` | וי מונפש (נכנס) |
| `lottie/loading-dots.json` | נקודות טעינה |
| `lottie/confetti.json` | קונפטי/חגיגה (לסצנת CTA) |
| `lottie/phone-ring.json` | טלפון מצלצל |

> 💡 מקור: [LottieFiles.com](https://lottiefiles.com) — חיפוש חינמי

### 6. קליפי וידאו (VIDEOS)
| קובץ | שימוש |
|-------|--------|
| `videos/candles-loop.mp4` | נרות שבת אמיתיים — לופ 5 שניות | 
| `videos/office-blur.mp4` | רקע משרד מטושטש |
| `videos/phone-notifications.mp4` | טלפון עם התראות (stock) |

---

## 🎨 כללי עיצוב

### פלטת צבעים — עקבית!
| שימוש | צבע | HEX |
|-------|------|-----|
| **Primary (מותג)** | כחול כהה (מהלוגו) | `#0F172A` |
| **Accent (הדגשה)** | זהב חם | `#D4A04A` |
| **Success** | ירוק | `#22C55E` |
| **Error** | אדום | `#EF4444` |
| **טקסט ראשי** | לבן | `#FFFFFF` |
| **טקסט משני** | אפור בהיר | `#94A3B8` |

> ⚠️ **כלל: מקסימום 2 צבעים בסצנה** (primary + accent). לא קשת!

### TikTok Safe Zone
```
Top:    150px  (סטטוס בר + שם משתמש)
Bottom: 280px  (כפתורים + תיאור)
Left:   40px
Right:  40px
```

### טיפוגרפיה
- כותרות: **RUBIK 800** — גודל 72-96px
- גוף: **HEEBO 700** — גודל 40-52px  
- מספרים: **RUBIK 800** — תמיד

---

## 🏗️ מבנה כל סרטון — 60 שניות (לא 75!)

### L1 — Hero (כללי)
| # | שניות | סצנה | מה מראים |
|---|--------|-------|----------|
| 1 | 0-3 | HOOK | לוגו + משפט אחד מזעזע |
| 2 | 3-10 | PROBLEM | טלפון + כאב (3 פריטים מקס) |
| 3 | 10-20 | SOLUTION | מסך מערכת + 3 פיצ'רים |
| 4 | 20-30 | DEMO | UI mockup חי |
| 5 | 30-40 | PROOF | 3 מספרים גדולים |
| 6 | 40-50 | DIFFERENTIATOR | מה שונה (2 נקודות) |
| 7 | 50-60 | CTA | לוגו + כפתור + URL |

### L2 — Shabbat
| # | שניות | סצנה |
|---|--------|-------|
| 1 | 0-3 | HOOK — נרות + "שבת שלום" |
| 2 | 3-12 | PAIN — בלי מערכת (3 כאבים) |
| 3 | 12-25 | ANSWER — מה המערכת עושה (3 פעולות) |
| 4 | 25-40 | CALENDAR — לוח עברי (3 אירועים) |
| 5 | 40-50 | LOCK — נעילת שבת |
| 6 | 50-60 | CTA — לוגו + נרות + כפתור |

### L3 — Workflow  
| # | שניות | סצנה |
|---|--------|-------|
| 1 | 0-3 | HOOK — "מליד לחשבונית" |
| 2 | 3-15 | CALL — שיחה נכנסת |
| 3 | 15-25 | QUOTE — הצעת מחיר |
| 4 | 25-35 | CLIENT — כרטיס לקוח |
| 5 | 35-45 | INVOICE — חשבונית |
| 6 | 45-52 | PROOF — סיכום pipeline |
| 7 | 52-60 | CTA — לוגו + כפתור |

---

## ✅ מה אני (Cascade) עושה אחרי שתשים נכסים

1. טוען את כל הנכסים עם `staticFile()`
2. מרכיב קומפוזיציה עם תזמון, טרנזישנים, טקסט
3. מוסיף דמות קריין (Lottie/Video) לסצנות
4. מוסיף רקעים וידאו + grain
5. מחליף SVG ידניים באייקונים מקצועיים
6. רנדר + בדיקה
