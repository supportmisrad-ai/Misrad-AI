# MISRAD AI — Email Image Assets

All images referenced by the email system live here.
Each image is configurable via environment variables (see `lib/email-assets.ts`).

## Required Images

Upload the following images to this folder. Recommended format: **PNG or JPG**, optimized for email (< 200KB each).

### Brand
| File | Size | Description |
|------|------|-------------|
| `logo-wide.png` | 400×80 px | Wide horizontal logo for email headers |

### Founder
| File | Size | Description |
|------|------|-------------|
| `founder-itsik.jpg` | 200×200 px | Founder headshot (circular crop). Used in founder cards, unsubscribe page |

### Welcome / Onboarding
| File | Size | Description |
|------|------|-------------|
| `welcome-hero.png` | 1080×540 px | Welcome email hero banner |
| `dashboard-preview.png` | 1080×600 px | Screenshot of MISRAD AI dashboard (for welcome, re-engagement) |
| `onboard-step1.png` | 540×300 px | Step 1 screenshot (create org) |
| `onboard-step2.png` | 540×300 px | Step 2 screenshot (invite team) |
| `onboard-step3.png` | 540×300 px | Step 3 screenshot (start using) |

### Features / Product
| File | Size | Description |
|------|------|-------------|
| `feature-hero.png` | 1080×540 px | Generic feature announcement hero |
| `feature-screenshot.png` | 1080×600 px | Product screenshot for feature emails |
| `ai-module.png` | 540×300 px | AI module screenshot |
| `nexus-preview.png` | 540×300 px | Nexus module screenshot |
| `system-preview.png` | 540×300 px | System module screenshot |
| `finance-preview.png` | 540×300 px | Finance module screenshot |
| `social-preview.png` | 540×300 px | Social module screenshot |

### Reports
| File | Size | Description |
|------|------|-------------|
| `weekly-chart.png` | 1080×400 px | Weekly report chart/dashboard screenshot |
| `monthly-chart.png` | 1080×400 px | Monthly report chart |

### Marketing
| File | Size | Description |
|------|------|-------------|
| `newsletter-banner.png` | 1080×400 px | Newsletter header banner |
| `webinar-banner.png` | 1080×540 px | Webinar invitation banner |
| `special-offer.png` | 1080×540 px | Special offer / promotion banner |
| `miss-you.png` | 1080×400 px | Re-engagement "we miss you" hero |
| `winback-hero.png` | 1080×540 px | Win-back campaign hero |

### Version Updates
| File | Size | Description |
|------|------|-------------|
| `version-update.png` | 1080×540 px | Version update hero (like Capish style) |

### Video Demos
| File | Size | Description |
|------|------|-------------|
| `demo-thumbnail.png` | 1080×600 px | Product demo video thumbnail |
| `quickstart-thumb.png` | 1080×600 px | Quick-start guide video thumbnail |

### Testimonials
| File | Size | Description |
|------|------|-------------|
| `testimonial-1.jpg` | 200×200 px | Customer testimonial avatar |

### Misc
| File | Size | Description |
|------|------|-------------|
| `confetti.png` | 200×200 px | Celebration confetti graphic |
| `payment-success.png` | 200×200 px | Payment success icon |
| `payment-failed.png` | 200×200 px | Payment failed icon |

## Environment Variable Overrides

Every image can be overridden via env vars. Example:
```
EMAIL_ASSET_WELCOME_HERO=https://cdn.misrad-ai.com/email/welcome-hero.png
EMAIL_ASSET_FOUNDER_PHOTO=https://cdn.misrad-ai.com/email/founder.jpg
```

See `lib/email-assets.ts` for the full list of `EMAIL_ASSET_*` keys.

## Image Guidelines

1. **Max width**: 1080px (emails render at ~600px, but 2x for retina)
2. **Format**: PNG for graphics/screenshots, JPG for photos
3. **File size**: Keep under 200KB each (optimize with TinyPNG)
4. **Background**: Use white or transparent backgrounds
5. **RTL**: Text in images should be RTL Hebrew
6. **Brand colors**: `#6366f1` (primary), `#8b5cf6` (secondary), `#0f172a` (dark)
