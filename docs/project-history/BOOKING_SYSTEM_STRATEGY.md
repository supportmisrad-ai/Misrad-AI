# תוכנית אסטרטגית וארכיטקטונית: מערכת קביעת תורים MISRAD AI

> **מסמך תכנון מקיף | גרסה 1.0 | 12 מרץ 2026**

---

## 📋 סיכום מנהלים (Executive Summary)

### מטרת המערכת
בניית **פאנל קביעת תורים מתקדם** לאדמין פאנל MISRAD AI שמאפשר:
- קביעת פגישות **ללא ביטולים** (מדיניות קשיחה)
- **לוח שנה עברי מובנה** על גבי לוח לועזי
- **לינקים ציבוריים** עם הגדרות גמישות למטרות שונות
- אינטגרציה עם **מערכת תשלומים קיימת**
- **סנכרון דו-כיווני** עם Google Calendar / Outlook

### עקרונות מרכזיים
1. **זמן = כסף** - כל דקה של אדמין חייבת להיות מוגנת
2. **החלטה חד-משמעית** - המשתמש צריך להתחייב לפגישה
3. **אוטומציה מלאה** - מינימום התערבות ידנית
4. **חוויה עברית** - לוח שנה עברי, חגים ישראלים, שבתות

---

## 🎯 דרישות עסקיות (Business Requirements)

### 1. מניעת ביטולים והברזות (No-Show Protection)
| פיצ'ר | תיאור | עדיפות |
|-------|-------|--------|
| **מדיניות "אין ביטולים"** | ברירת מחדל - ביטולים אסורים | 🔴 חובה |
| **Lock-out Period** | חסימת שינוי תור X שעות לפני | 🔴 חובה |
| **דרישת אישור ידני** | "בקשה" בלבד עד אישור אדמין | 🟡 בינוני |
| **דרישת סיבת פגישה** | שדה חובה עם פירוט | 🟢 עדיף |
| **תשלום מראש** | אינטגרציה עם מערכת תשלומים | 🟢 עדיף |

### 2. מערכת לינקים ציבוריים (Public Booking Links)
| יכולת | תיאור |
|-------|-------|
| **מספר לינקים** | אפשרות ליצור כמה לינקים שונים |
| **מטרה ללינק** | כל לינק עם כותרת ותיאור משלו ("הדרכת מוצר", "שיחת ייעוץ") |
| **משך זמן** | הגדרה פר-לינק: 15/30/45/60 דקות |
| **סוג פגישה** | Zoom אוטומטי / Google Meet / פרונטלי (כתובת) |
| **זמינות ספציפית** | "רק ימי שלישי" למרות שעות עבודה רגילות |
| **שדות נוספים** | הגדרת שדות חובה (טלפון, חברה, הערות) |

### 3. לוח שנה עברי-לועזי (Hebrew-Gregorian Calendar)
| רכיב | מימוש |
|------|-------|
| **תצוגה כפולה** | לועזי עיקרי + עברי משני בכל תא |
| **חגים עבריים** | חסימה אוטומטית של חגי ישראל |
| **שבתות** | חסימה אוטומטית של ימי שבת |
| **המרה** | שכבת המרה (Hebcal / date-fns-hebrew) |
| **תזכורות עבריות** | "פגישה ביום שלישי כ"ג באדר" |

---

## 🏗️ ארכיטקטורת נתונים (Database Schema)

### יחסי Entity (Entity Relationships)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Booking System Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│   │ Organization │◄────►│  Provider    │◄────►│  Service     │          │
│   │   (טננט)     │      │(נותן שירות)  │      │(סוג תור)     │          │
│   └──────────────┘      └──────────────┘      └──────────────┘          │
│           │                    │                    │                   │
│           │                    ▼                    │                   │
│           │           ┌──────────────┐              │                   │
│           │           │Availability  │              │                   │
│           │           │  (זמינות)    │              │                   │
│           │           └──────────────┘              │                   │
│           │                                         ▼                   │
│           │                              ┌──────────────────────┐      │
│           │                              │    BookingLink       │      │
│           │                              │   (לינק ציבורי)      │      │
│           │                              └──────────────────────┘      │
│           │                                         │                   │
│           ▼                                         ▼                   │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │                    Appointment (תור שנקבע)                    │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │   │
│   │  │  User   │  │ Provider│  │ Service │  │  Payment        │  │   │
│   │  │(מזמין) │  │(נותן)   │  │(סוג)    │  │  (אופציונלי)    │  │   │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘  │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │              Reminder + Notification Queue                  │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Prisma Schema (הגדרות טבלאות)

```prisma
// ============================================
// 1. PROVIDERS - נותני שירות (יומנים)
// ============================================
model BookingProvider {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  userId            String?  @map("user_id") @db.Uuid  // קישור למשתמש במערכת
  
  // פרטים בסיסיים
  name              String   // שם תצוגה
  email             String   // לאישורים
  phone             String?  // לתזכורות SMS
  avatar            String?  // תמונת פרופיל
  
  // הגדרות
  isActive          Boolean  @default(true) @map("is_active")
  bufferMinutes     Int      @default(15) @map("buffer_minutes") // זמן מנוחה בין תורים
  maxDailyAppointments Int   @default(8) @map("max_daily_appointments")
  
  // קשרים
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  services          BookingProviderService[]
  availabilities    BookingAvailability[]
  appointments      BookingAppointment[]
  links             BookingLink[]
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([organizationId])
  @@index([userId])
  @@map("booking_providers")
}

// ============================================
// 2. SERVICES - סוגי תורים (טיפולים)
// ============================================
model BookingService {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  
  // פרטים בסיסיים
  name              String   // "ייעוץ ראשוני"
  description       String?  // תיאור שמוצג למשתמש
  color             String   @default("#6366f1") // צבע ביומן
  
  // הגדרות זמן ומחיר
  durationMinutes   Int      @map("duration_minutes") // 30, 60, 90
  bufferAfterMinutes Int     @default(0) @map("buffer_after_minutes")
  priceAmount       Decimal? @map("price_amount") @db.Decimal(10, 2)
  currency          String   @default("ILS")
  
  // הגדרות קבלה
  requiresPayment   Boolean  @default(false) @map("requires_payment") // תשלום מראש?
  requiresApproval  Boolean  @default(false) @map("requires_approval") // אישור ידני?
  requiresReason    Boolean  @default(false) @map("requires_reason") // דרישת סיבה?
  
  isActive          Boolean  @default(true) @map("is_active")
  
  // קשרים
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  providers         BookingProviderService[]
  links           BookingLinkService[]
  appointments      BookingAppointment[]
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([organizationId])
  @@map("booking_services")
}

// ============================================
// 3. PROVIDER_SERVICES - קשר many-to-many
// ============================================
model BookingProviderService {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  providerId        String   @map("provider_id") @db.Uuid
  serviceId         String   @map("service_id") @db.Uuid
  
  // הגדרות ספציפיות לשילוב
  customDuration    Int?     @map("custom_duration") // אופציונלי: דריסת משך
  customPrice       Decimal? @map("custom_price") @db.Decimal(10, 2)
  isActive          Boolean  @default(true) @map("is_active")
  
  provider          BookingProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  service           BookingService @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  
  @@unique([providerId, serviceId])
  @@index([providerId])
  @@index([serviceId])
  @@map("booking_provider_services")
}

// ============================================
// 4. AVAILABILITY - חלונות זמן פנויים
// ============================================
model BookingAvailability {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  providerId        String   @map("provider_id") @db.Uuid
  
  // סוג חלון: WEEKLY (חוזר) או OVERRIDE (חד פעמי)
  type              String   // "weekly" | "override" | "blocked"
  
  // לחזור שבועי
  dayOfWeek         Int?     @map("day_of_week") // 0=ראשון, 6=שבת
  
  // לחד פעמי
  specificDate      DateTime? @map("specific_date") @db.Date
  
  // שעות
  startTime         String   @map("start_time") // "09:00" (ישראל)
  endTime           String   @map("end_time")   // "17:00"
  timezone          String   @default("Asia/Jerusalem")
  
  // הגדרות
  isAvailable       Boolean  @default(true) @map("is_available") // false = חסימה
  reason            String?  // "חופש", "חג", "פגישה פנימית"
  
  provider          BookingProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([organizationId])
  @@index([providerId])
  @@index([dayOfWeek])
  @@index([specificDate])
  @@map("booking_availabilities")
}

// ============================================
// 5. BOOKING_LINKS - לינקים ציבוריים
// ============================================
model BookingLink {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  providerId        String   @map("provider_id") @db.Uuid
  
  // זיהוי
  slug              String   @unique // URL-friendly ID
  title             String   // "הדרכת מוצר - 30 דקות"
  description       String?  // תיאור שמוצג בדף
  
  // הגדרות זמן
  availableDays     Int[]    @map("available_days") // [0,1,2,3,4] = א'-ה'
  minNoticeHours    Int      @default(24) @map("min_notice_hours")
  maxBookingDays    Int      @default(30) @map("max_booking_days") // עד כמה זמן קדימה
  
  // הגדרות ביטול
  allowCancellations Boolean @default(false) @map("allow_cancellations")
  cancellationDeadlineHours Int @default(48) @map("cancellation_deadline_hours")
  
  // הגדרות תשלום
  requirePayment    Boolean  @default(false) @map("require_payment")
  paymentAmount     Decimal? @map("payment_amount") @db.Decimal(10, 2)
  
  // הגדרות אישור
  requireApproval   Boolean  @default(false) @map("require_approval")
  
  // סוג מיקום
  locationType      String   @default("zoom") @map("location_type") // "zoom" | "meet" | "phone" | "address"
  locationDetails   String?  @map("location_details") // כתובת / מספר טלפון
  
  // קישור לשירותים (מה ניתן לקבוע דרך הלינק)
  services          BookingLinkService[]
  
  // קשרים
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  provider          BookingProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  appointments      BookingAppointment[]
  
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([organizationId])
  @@index([providerId])
  @@index([slug])
  @@map("booking_links")
}

model BookingLinkService {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  linkId            String   @map("link_id") @db.Uuid
  serviceId         String   @map("service_id") @db.Uuid
  
  link              BookingLink @relation(fields: [linkId], references: [id], onDelete: Cascade)
  service           BookingService @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  
  @@unique([linkId, serviceId])
  @@index([linkId])
  @@index([serviceId])
  @@map("booking_link_services")
}

// ============================================
// 6. APPOINTMENTS - התורים שנקבעו
// ============================================
model BookingAppointment {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  linkId            String   @map("link_id") @db.Uuid
  providerId        String   @map("provider_id") @db.Uuid
  serviceId         String   @map("service_id") @db.Uuid
  
  // פרטי המזמין
  customerName      String   @map("customer_name")
  customerEmail     String   @map("customer_email")
  customerPhone     String?  @map("customer_phone")
  customerCompany   String?  @map("customer_company")
  customerReason    String?  @map("customer_reason") // סיבת הפגישה
  
  // פרטי הפגישה
  startTime         DateTime @map("start_time") @db.Timestamptz(6)
  endTime           DateTime @map("end_time") @db.Timestamptz(6)
  timezone          String   @default("Asia/Jerusalem")
  
  // מיקום
  locationType      String   @map("location_type") // "zoom" | "meet" | "phone" | "address"
  locationDetails   String?  @map("location_details") // לינק זום / כתובת
  meetingUrl        String?  @map("meeting_url") // לינק שנוצר אוטומטית
  
  // סטטוס
  status            String   @default("confirmed") // "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
  approvedBy        String?  @map("approved_by") @db.Uuid // מי אישר (אם נדרש אישור)
  approvedAt        DateTime? @map("approved_at") @db.Timestamptz(6)
  
  // הגדרות ביטול
  cancelledAt       DateTime? @map("cancelled_at") @db.Timestamptz(6)
  cancelledBy       String?   @map("cancelled_by") // "customer" | "admin"
  cancellationReason String?  @map("cancellation_reason")
  
  // הערות אדמין
  adminNotes        String?  @map("admin_notes")
  attended          Boolean? // האם הגיע
  
  // קשרים
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  link              BookingLink @relation(fields: [linkId], references: [id], onDelete: Cascade)
  provider          BookingProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  service           BookingService @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  payment           BookingPayment?
  reminders         BookingReminder[]
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([organizationId])
  @@index([providerId])
  @@index([linkId])
  @@index([serviceId])
  @@index([startTime])
  @@index([status])
  @@index([customerEmail])
  @@map("booking_appointments")
}

// ============================================
// 7. PAYMENTS - תשלומים (קישור למערכת קיימת)
// ============================================
model BookingPayment {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  appointmentId     String   @unique @map("appointment_id") @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  
  // פרטי תשלום
  amount            Decimal  @db.Decimal(10, 2)
  currency          String   @default("ILS")
  
  // סטטוס
  status            String   @default("pending") // "pending" | "completed" | "failed" | "refunded"
  
  // קישור למערכת קיימת
  chargeId          String?  @map("charge_id") @db.Uuid // קישור לטבלת charges הקיימת
  invoiceId         String?  @map("invoice_id") @db.Uuid // קישור ל-billing_invoices
  
  // מטא-דאטה
  provider          String   @default("morning") // "stripe" | "payplus" | "morning"
  transactionId     String?  @map("transaction_id") // מזהה חיצוני
  receiptUrl        String?  @map("receipt_url")
  paidAt            DateTime? @map("paid_at") @db.Timestamptz(6)
  
  appointment       BookingAppointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([appointmentId])
  @@index([organizationId])
  @@index([status])
  @@map("booking_payments")
}

// ============================================
// 8. REMINDERS - תזכורות
// ============================================
model BookingReminder {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  appointmentId     String   @map("appointment_id") @db.Uuid
  
  // מתי לשלוח
  scheduledFor      DateTime @map("scheduled_for") @db.Timestamptz(6)
  type              String   // "email" | "sms" | "whatsapp"
  template          String   // תבנית הודעה
  
  // סטטוס
  status            String   @default("pending") // "pending" | "sent" | "failed"
  sentAt            DateTime? @map("sent_at") @db.Timestamptz(6)
  error             String?
  
  appointment       BookingAppointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@index([appointmentId])
  @@index([scheduledFor])
  @@index([status])
  @@map("booking_reminders")
}

// ============================================
// 9. EXTERNAL_CALENDAR_SYNC - סנכרון חיצוני
// ============================================
model BookingCalendarSync {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId    String   @map("organization_id") @db.Uuid
  providerId        String   @map("provider_id") @db.Uuid
  
  // סוג החיבור
  provider          String   // "google" | "outlook" | "apple"
  accessToken       String   @map("access_token")
  refreshToken      String?  @map("refresh_token")
  tokenExpiresAt    DateTime? @map("token_expires_at") @db.Timestamptz(6)
  
  // הגדרות
  syncDirection     String   @default("bidirectional") @map("sync_direction") // "to_external" | "from_external" | "bidirectional"
  calendarId        String?  @map("calendar_id") // ID של יומן ספציפי
  
  // מטא-דאטה
  lastSyncedAt      DateTime? @map("last_synced_at") @db.Timestamptz(6)
  isActive          Boolean  @default(true) @map("is_active")
  
  provider          BookingProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  @@index([organizationId])
  @@index([providerId])
  @@map("booking_calendar_syncs")
}

// ============================================
// 10. HEBREW_DATE_CACHE - מטמון תאריכים עבריים
// ============================================
model BookingHebrewDateCache {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  
  gregorianDate     DateTime @unique @map("gregorian_date") @db.Date
  hebrewDate        String   @map("hebrew_date") // "כ"ג באדר ב' תשפ"ו"
  hebrewShort       String   @map("hebrew_short") // "כ"ג באדר"
  parasha           String?  // פרשת השבוע
  isHoliday         Boolean  @default(false) @map("is_holiday")
  holidayName       String?  @map("holiday_name")
  isShabbat         Boolean  @default(false) @map("is_shabbat")
  
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@index([gregorianDate])
  @@index([isHoliday])
  @@map("booking_hebrew_date_cache")
}
```

---

## 🖥️ ארכיטקטורת UI/UX (חוויית משתמש)

### מבנה הניווט באדמין פאנל

```
┌─────────────────────────────────────────────────────────────────┐
│  Booking Admin Panel                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────┐   │
│  │   Sidebar    │  │           Main Content                │   │
│  │              │  │                                       │   │
│  │ Dashboard    │  │  ┌─────────────────────────────────┐  │   │
│  │ Calendar     │  │  │      Daily/Weekly/Monthly      │  │   │
│  │ Links        │  │  │         Calendar View           │  │   │
│  │ Services     │  │  └─────────────────────────────────┘  │   │
│  │ Providers    │  │                                       │   │
│  │ Settings     │  │  ┌─────────────────────────────────┐  │   │
│  │              │  │  │     Appointments List/Grid     │  │   │
│  └──────────────┘  │  └─────────────────────────────────┘  │   │
│                    │                                       │   │
│                    │  ┌─────────────────────────────────┐  │   │
│                    │  │      Quick Actions Sidebar     │  │   │
│                    │  │   (Drag-to-create, Filters)    │  │   │
│                    │  └─────────────────────────────────┘  │   │
│                    └──────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### רכיבי UI מרכזיים

#### 1. BookingCalendar (לוח השנה הראשי)

```typescript
interface BookingCalendarProps {
  // תצוגה
  view: 'day' | 'week' | 'month' | 'agenda';
  date: Date;
  
  // סינון
  providerId?: string;     // סינון לפי נותן שירות
  serviceId?: string;      // סינון לפי סוג תור
  status?: AppointmentStatus[];
  
  // אינטראקציה
  onSlotClick: (slot: TimeSlot) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onDrop: (appointment: Appointment, newSlot: TimeSlot) => void;
  
  // תצוגה עברית
  showHebrewDates: boolean;
  highlightHolidays: boolean;
}
```

**תכונות:**
- **Drag & Drop** - גרירת תורים בין שעות/ימים
- **Resize** - מתיחת תור לשינוי משך
- **Quick Create** - לחיצה על חלון ריק פותחת יצירה מהירה
- **Hebrew Overlay** - תאריך עברי בכל תא
- **Holiday Blocking** - חגים מסומנים באדום וחסומים לקביעה

#### 2. LinkBuilder (יוצר הלינקים)

```typescript
interface LinkBuilderProps {
  // הגדרות בסיסיות
  title: string;
  slug: string;
  description?: string;
  
  // זמן
  availableDays: number[];      // [0,1,2,3,4] = א'-ה'
  minNoticeHours: number;       // 24
  maxBookingDays: number;       // 30
  
  // הגדרות מדיניות
  allowCancellations: boolean;
  cancellationDeadlineHours: number;
  requireApproval: boolean;
  requirePayment: boolean;
  paymentAmount?: number;
  
  // שירותים מקושרים
  services: LinkServiceConfig[];
  
  // מיקום
  locationType: 'zoom' | 'meet' | 'phone' | 'address';
  locationDetails?: string;
}
```

**Flow יצירת לינק:**
1. הגדרת כותרת ותיאור
2. בחירת נותן שירות
3. בחירת שירותים מוצעים + משך זמן
4. הגדרת ימי זמינות (ימי השבוע)
5. הגדרת מדיניות (ביטולים, אישור, תשלום)
6. הגדרת מיקום (Zoom אוטומטי / כתובת)
7. שמירה → קבלת URL ציבורי

#### 3. PublicBookingPage (דף קביעת תור ציבורי)

```
┌─────────────────────────────────────────┐
│  🗓️ {Link Title}                        │
│  {Description}                           │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │     Calendar (Hebrew + Gregorian)│   │
│  │     ▼                           │   │
│  │   כ'ג באדר    |    12 מרץ       │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │   Available Slots:              │   │
│  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐  │   │
│  │   │09:00│ │10:00│ │11:00│ │14:00│ │   │
│  │   └────┘ └────┘ └────┘ └────┘  │   │
│  └─────────────────────────────────┘   │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │   ⚠️ מדיניות חשובה:             │   │
│  │   • אין אפשרות ביטול            │   │
│  │   • נדרשת סיבת פגישה            │   │
│  │   • התשלום הוא סופי             │   │
│  └─────────────────────────────────┘   │
│                                          │
│  [מלא פרטים ←]                          │
└─────────────────────────────────────────┘
```

---

## 🔧 ארכיטקטורת Backend (לוגיקת שרת)

### 1. Availability Engine (מנוע זמינות)

```typescript
// לוגיקת חישוב זמנים פנויים
class AvailabilityEngine {
  async getAvailableSlots(
    providerId: string,
    date: Date,
    durationMinutes: number,
    linkId?: string
  ): Promise<TimeSlot[]> {
    // שלב 1: קבלת הגדרות זמינות (weekly + overrides)
    const availability = await this.getAvailabilityRules(providerId, date);
    
    // שלב 2: קבלת תורים קיימים
    const existingAppointments = await this.getExistingAppointments(
      providerId, 
      date
    );
    
    // שלב 3: קבלת חסימות מיומן חיצוני (Google/Outlook)
    const externalBlocks = await this.getExternalCalendarBlocks(
      providerId, 
      date
    );
    
    // שלב 4: חישוב חלונות פנויים
    const freeSlots = this.calculateFreeSlots(
      availability,
      existingAppointments,
      externalBlocks,
      durationMinutes
    );
    
    // שלב 5: הוספת Buffer Time בין תורים
    return this.applyBufferTime(freeSlots, providerId);
  }
  
  private calculateFreeSlots(
    availability: AvailabilityRule[],
    appointments: Appointment[],
    externalBlocks: CalendarBlock[],
    duration: number
  ): TimeSlot[] {
    // אלגוריתם חישוב חלונות זמן פנויים
    // מחסיר תורים קיימים וחסימות מהזמינות
  }
}
```

### 2. Double-Booking Prevention (מניעת כפילויות)

```typescript
// שימוש ב-Prisma Transactions לנעילה
async createAppointment(data: CreateAppointmentInput) {
  return await prisma.$transaction(async (tx) => {
    // שלב 1: בדיקת זמינות עם SELECT FOR UPDATE
    const existing = await tx.bookingAppointment.findFirst({
      where: {
        providerId: data.providerId,
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
        status: { notIn: ['cancelled', 'no_show'] }
      },
      // נעילה על השורות המושפעות
      lock: { mode: 'exclusive' }
    });
    
    if (existing) {
      throw new ConflictError('הזמן כבר תפוס');
    }
    
    // שלב 2: יצירת התור
    const appointment = await tx.bookingAppointment.create({ data });
    
    // שלב 3: יצירת תזכורות
    await this.scheduleReminders(tx, appointment);
    
    // שלב 4: יצירת אירוע ביומן חיצוני (אם מחובר)
    if (data.syncToCalendar) {
      await this.syncToExternalCalendar(appointment);
    }
    
    return appointment;
  }, {
    // הגדרות transaction
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000
  });
}
```

### 3. Hebrew Calendar Integration

```typescript
// שכבת המרה לוח עברי
class HebrewCalendarService {
  private hebcal: HebcalAPI;
  
  async getHebrewDate(gregorianDate: Date): Promise<HebrewDate> {
    // בדיקה במטמון
    const cached = await this.getCachedHebrewDate(gregorianDate);
    if (cached) return cached;
    
    // חישוב דרך Hebcal
    const hebrew = this.hebcal.gregorianToHebrew(gregorianDate);
    
    // שמירה במטמון
    await this.cacheHebrewDate(gregorianDate, hebrew);
    
    return hebrew;
  }
  
  async getHolidays(year: number): Promise<Holiday[]> {
    // קבלת חגי ישראל לשנה נתונה
    return [
      { name: 'ראש השנה', date: '2026-09-11', type: 'major' },
      { name: 'יום כיפור', date: '2026-09-20', type: 'major' },
      // ...
    ];
  }
  
  isShabbat(date: Date): boolean {
    return date.getDay() === 6; // יום שבת
  }
  
  isHoliday(date: Date): boolean {
    // בדיקה מול מטמון חגים
  }
}
```

---

## 📅 מערכת תזכורות והתראות

### תזמון תזכורות (Reminder Scheduler)

```typescript
interface ReminderSchedule {
  // מיד לאחר קביעה
  confirmation: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    includeICS: boolean; // קובץ ICS ליומן
  };
  
  // תזכורות לפני
  reminders: {
    '24h': { email: boolean; sms: boolean; whatsapp: boolean };
    '1h': { email: boolean; sms: boolean; whatsapp: boolean };
  };
  
  // לאחר הפגישה
  followUp: {
    enabled: boolean;
    delay: '1h' | 'morning_after';
    type: 'thank_you' | 'summary' | 'feedback_request';
  };
}

// יצירת תזכורות בעת קביעת תור
async function createAppointmentReminders(
  appointment: BookingAppointment
): Promise<void> {
  const reminders: CreateReminderInput[] = [];
  
  // אישור מיידי
  reminders.push({
    appointmentId: appointment.id,
    scheduledFor: new Date(), // מיידי
    type: 'email',
    template: 'confirmation',
    status: 'pending'
  });
  
  // תזכורת 24 שעות לפני
  const reminder24h = subHours(appointment.startTime, 24);
  if (reminder24h > new Date()) {
    reminders.push({
      appointmentId: appointment.id,
      scheduledFor: reminder24h,
      type: 'email',
      template: 'reminder_24h',
      status: 'pending'
    });
  }
  
  // תזכורת שעה לפני
  const reminder1h = subHours(appointment.startTime, 1);
  if (reminder1h > new Date()) {
    reminders.push({
      appointmentId: appointment.id,
      scheduledFor: reminder1h,
      type: 'sms',
      template: 'reminder_1h',
      status: 'pending'
    });
  }
  
  // שמירה בבסיס הנתונים
  await prisma.bookingReminder.createMany({ data: reminders });
}
```

### Cron Job לשליחת תזכורות

```typescript
// app/api/cron/booking-reminders/route.ts
export async function GET(request: Request) {
  // אימות קרון
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // קבלת תזכורות שמוכנות לשליחה
  const pendingReminders = await prisma.bookingReminder.findMany({
    where: {
      status: 'pending',
      scheduledFor: { lte: new Date() }
    },
    include: { appointment: true },
    take: 100
  });
  
  // שליחה במקביל
  await Promise.all(
    pendingReminders.map(async (reminder) => {
      try {
        await sendReminder(reminder);
        await prisma.bookingReminder.update({
          where: { id: reminder.id },
          data: { status: 'sent', sentAt: new Date() }
        });
      } catch (error) {
        await prisma.bookingReminder.update({
          where: { id: reminder.id },
          data: { status: 'failed', error: String(error) }
        });
      }
    })
  );
  
  return Response.json({ processed: pendingReminders.length });
}
```

---

## 💳 אינטגרציה עם מערכת תשלומים

### Flow תשלום מראש

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   לקוח בוחר │────►│  בדיקת זמן  │────►│  יצירת תור  │
│   שעה בלינק │     │   פנוי?     │     │   (ממתין)   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                                                ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   אישור סופי │◄────│   חזרה ללינק  │◄────│   העברה לדף  │
│   + שליחת אישור│    │   עם אסמכתא   │     │   תשלום     │
│              │     │              │     │  (PayPlus/   │
└──────────────┘     └──────────────┘     │   Stripe)    │
                                          └──────────────┘
                                                ▲
                                                │ Webhook
                                          ┌──────────────┐
                                          │   סליקה    │
                                          │  הצליחה!    │
                                          └──────────────┘
```

### קוד אינטגרציה

```typescript
// יצירת תור עם תשלום מראש
async function createAppointmentWithPayment(
  input: CreateAppointmentInput
): Promise<AppointmentResult> {
  // שלב 1: בדיקת זמינות (ללא lock עדיין)
  const isAvailable = await availabilityEngine.checkAvailability(
    input.providerId,
    input.startTime,
    input.endTime
  );
  
  if (!isAvailable) {
    throw new Error('הזמן כבר תפוס');
  }
  
  // שלב 2: יצירת תור בסטטוס "pending_payment"
  const appointment = await prisma.bookingAppointment.create({
    data: {
      ...input,
      status: 'pending_payment',
      expiresAt: addMinutes(new Date(), 15) // תפוגה אחרי 15 דקות
    }
  });
  
  // שלב 3: יצירת חובה במערכת התשלומים הקיימת
  const charge = await createCharge({
    organizationId: input.organizationId,
    amount: input.paymentAmount,
    currency: 'ILS',
    description: `תור: ${input.serviceName} - ${input.customerName}`,
    metadata: {
      appointmentId: appointment.id,
      type: 'booking_payment'
    }
  });
  
  // שלב 4: עדכון התור עם מזהה החובה
  await prisma.bookingAppointment.update({
    where: { id: appointment.id },
    data: { 
      payment: {
        create: {
          organizationId: input.organizationId,
          amount: input.paymentAmount,
          currency: 'ILS',
          chargeId: charge.id,
          status: 'pending'
        }
      }
    }
  });
  
  // שלב 5: החזרת URL לתשלום
  return {
    appointmentId: appointment.id,
    paymentUrl: charge.paymentUrl,
    expiresAt: appointment.expiresAt
  };
}

// Webhook לקבלת אישור תשלום
export async function POST(request: Request) {
  const payload = await request.json();
  
  // אימות webhook
  if (!verifyWebhookSignature(payload)) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  const { chargeId, status, appointmentId } = payload;
  
  if (status === 'completed') {
    // עדכון התור לאישור סופי
    await prisma.$transaction(async (tx) => {
      await tx.bookingPayment.update({
        where: { chargeId },
        data: { status: 'completed', paidAt: new Date() }
      });
      
      await tx.bookingAppointment.update({
        where: { id: appointmentId },
        data: { status: 'confirmed' }
      });
      
      // שליחת אישור למזמין
      await sendConfirmation(appointmentId);
    });
  } else if (status === 'failed') {
    // מחיקת התור הממתין
    await prisma.bookingAppointment.delete({
      where: { id: appointmentId }
    });
  }
  
  return Response.json({ received: true });
}
```

---

## 🔄 סנכרון קלנדר חיצוני

### Google Calendar Sync

```typescript
// סנכרון דו-כיווני
class GoogleCalendarSync {
  async syncToGoogle(appointment: BookingAppointment): Promise<string> {
    const event = {
      summary: `תור: ${appointment.customerName}`,
      description: appointment.customerReason || '',
      start: { dateTime: appointment.startTime.toISOString() },
      end: { dateTime: appointment.endTime.toISOString() },
      attendees: [{ email: appointment.customerEmail }],
      conferenceData: appointment.meetingUrl ? {
        createRequest: {
          requestId: appointment.id,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      } : undefined
    };
    
    const created = await google.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1
    });
    
    return created.data.id;
  }
  
  async syncFromGoogle(
    providerId: string,
    syncToken?: string
  ): Promise<CalendarBlock[]> {
    // קבלת שינויים מיומן Google
    const response = await google.calendar.events.list({
      calendarId: 'primary',
      syncToken,
      timeMin: new Date().toISOString()
    });
    
    // המרה לחסימות פנימיות
    return response.data.items.map(event => ({
      providerId,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      title: event.summary,
      source: 'google_calendar'
    }));
  }
}
```

---

## 🗺️ מפת דפים וניתובים (Page Routes)

### Admin Panel Routes

```typescript
// app/admin/booking/page.tsx                    // Dashboard כללי
// app/admin/booking/calendar/page.tsx           // יומן ראשי
// app/admin/booking/appointments/page.tsx       // רשימת תורים
// app/admin/booking/links/page.tsx              // ניהול לינקים
// app/admin/booking/links/new/page.tsx          // יצירת לינק חדש
// app/admin/booking/links/[id]/edit/page.tsx    // עריכת לינק
// app/admin/booking/services/page.tsx           // ניהול שירותים
// app/admin/booking/providers/page.tsx          // ניהול נותני שירות
// app/admin/booking/settings/page.tsx          // הגדרות מערכת
// app/admin/booking/availability/page.tsx       // ניהול זמינות

// Public Routes (לא דורשות התחברות)
// app/book/[slug]/page.tsx                      // דף קביעת תור ציבורי
// app/book/[slug]/success/page.tsx              // אישור קביעה
// app/book/manage/page.tsx                      // ניהול תורים (הזנת מייל)
```

---

## 🧪 מערכת הגנה על זמן האדמין

### מניעת "No-Show" והברזות

| מנגנון | תיאור | מימוש |
|--------|-------|-------|
| **Buffer Time** | 10-15 דקות מנוחה בין פגישות | נוסף אוטומטית ל-endTime |
| **Lock-out Period** | חסימת שינוי 24-48 שעות לפני | בדיקה ב-UI + server |
| **Manual Approval** | "בקשה" בלבד עד אישור | סטטוס "pending" → "confirmed" |
| **Required Reason** | חובת פירוט מטרת הפגישה | validation על שדה |
| **Pre-payment** | תשלום מראש דרך PayPlus/Stripe | אינטגרציה עם billing |
| **No-Cancel Policy** | הסרת כפתור ביטול | UI-only, מוסבר במדיניות |

### UI Indicators למדיניות קשיחה

```tsx
// Public Booking Page - הצגת מדיניות בולטת
<PolicyNotice severity="strict">
  <PolicyItem icon={<Lock />}>
    ⚠️ אין אפשרות ביטול לאחר הקביעה
  </PolicyItem>
  <PolicyItem icon={<Clock />}>
    נדרשת הגעה בדיוק בזמן (15 דקות איחור = ביטול אוטומטי)
  </PolicyItem>
  <PolicyItem icon={<CreditCard />}>
    התשלום הוא סופי ואינו מוחזר
  </PolicyItem>
</PolicyNotice>

// Checkbox אישור
<ConsentCheckbox required>
  אני מסכים למדיניות הקביעה ומבין שהזמן שמור במיוחד עבורי
</ConsentCheckbox>
```

---

## 📊 שלבי יישום (Implementation Roadmap)

### Phase 1: יסודות (שבוע 1-2)
- [ ] יצירת Prisma Schema
- [ ] CRUD בסיסי ל-Providers ו-Services
- [ ] טבלת Availabilities עם weekly + overrides
- [ ] API לבדיקת זמינות (AvailabilityEngine)

### Phase 2: לינקים ציבוריים (שבוע 2-3)
- [ ] טבלת BookingLinks
- [ ] דף קביעת תור ציבורי (PublicBookingPage)
- [ ] לוגיקת חישוב slots פנויים
- [ ] מניעת כפילויות (DB transactions)

### Phase 3: לוח שנה וניהול (שבוע 3-4)
- [ ] BookingCalendar component עם Hebrew dates
- [ ] Drag & Drop ביומן
- [ ] Quick Actions Sidebar
- [ ] Dashboard לאדמין

### Phase 4: אוטומציה (שבוע 4-5)
- [ ] מערכת תזכורות (Reminders)
- [ ] Cron job לשליחת התראות
- [ ] יצירת קבצי ICS
- [ ] סנכרון Google Calendar

### Phase 5: תשלומים והגנה (שבוע 5-6)
- [ ] אינטגרציה עם PayPlus/Stripe
- [ ] Flow תשלום מראש
- [ ] מנגנון "No-Show Protection"
- [ ] Waitlist לתורים מתפנים

### Phase 6: פוליש ואופטימיזציה (שבוע 6-7)
- [ ] ביצועים - caching לזמינות
- [ ] דוחות וסטטיסטיקות
- [ ] Mobile optimization
- [ ] בדיקות ו-Bug fixes

---

## 🎨 קונבנציות UI (Design System)

### צבעי מערכת

```css
/* צבעי בסיס */
--booking-primary: #6366f1;      /* אינדיגו */
--booking-success: #10b981;     /* ירוק - אישור */
--booking-warning: #f59e0b;       /* כתום - תזכורת */
--booking-danger: #ef4444;       /* אדום - ביטול */
--booking-info: #3b82f6;         /* כחול - מידע */

/* צבעי סטטוס תור */
--appointment-confirmed: #10b981;
--appointment-pending: #f59e0b;
--appointment-cancelled: #ef4444;
--appointment-completed: #6366f1;

/* צבעי לוח שנה */
--calendar-today: #fef3c7;       /* צהוב בהיר */
--calendar-shabbat: #fee2e2;     /* אדום בהיר */
--calendar-holiday: #fecaca;     /* אדום */
--calendar-selected: #c7d2fe;     /* אינדיגו בהיר */
```

### אייקונוגרפיה

| פעולה | אייקון |
|-------|--------|
| קביעת תור | `CalendarPlus` |
| ביטול | `XCircle` |
| אישור | `CheckCircle` |
| תזכורת | `Bell` |
| זום | `Video` |
| פרונטלי | `MapPin` |
| שעון | `Clock` |
| תשלום | `CreditCard` |
| לינק ציבורי | `Link` |
| יומן עברי | `CalendarDays` |

---

## 🔐 אבטחה והרשאות

### Role-Based Access Control

```typescript
type BookingRole = 
  | 'super_admin'    // כל הפעולות
  | 'admin'          // ניהול מערכת, לא כל הקונפיג
  | 'provider'       // רק התורים שלו
  | 'viewer';        // צפייה בלבד

interface BookingPermissions {
  // Appointments
  canCreateAppointment: boolean;
  canCancelAppointment: boolean;
  canRescheduleAppointment: boolean;
  canViewAllAppointments: boolean;
  
  // Links
  canCreateLink: boolean;
  canEditLink: boolean;
  canDeleteLink: boolean;
  
  // Settings
  canManageAvailability: boolean;
  canManageServices: boolean;
  canManageProviders: boolean;
  canManageSettings: boolean;
}
```

### הגנות נוספות
- Rate limiting על API ציבורי (booking links)
- CAPTCHA על טפסים ציבוריים
- Audit log לכל שינוי בתורים
- GDPR - אפשרות למחיקת נתוני לקוח

---

## 📈 מדדים ו-KPIs

### מדדי ביצועים
- **Conversion Rate** - אחוז ממלאי טופס שמסיימים קביעה
- **No-Show Rate** - אחוז שאינם מופיעים
- **Cancellation Rate** - אחוז ביטולים
- **Buffer Utilization** - שימוש בזמני מנוחה
- **Sync Success Rate** - אחוז הצלחת סנכרון קלנדר

### מדדי UX
- **Time to Book** - זמן מכניסה לאתר עד קביעה
- **Abandonment Rate** - אחוז נטישה בטופס
- **Reschedule Requests** - כמות בקשות לשינוי

---

## � שדרוגי UX ולוגיקה מתקדמים (V2 Enhancements)

### 1. מנגנון אנטי-פייק (Fake Booking Prevention)

בעיה: אנשים קובעים תורים "סתם" כדי לתפוס מקום, או בוטים שסורקים לינקים.

**הפתרון - אימות טלפון (OTP) חובה:**

```typescript
// Flow אימות לפני הצגת זמנים
interface BookingVerificationFlow {
  // שלב 1: משתמש נכנס ללינק
  // שלב 2: הזנת מייל + טלפון
  // שלב 3: שליחת קוד OTP ב-SMS/WhatsApp
  // שלב 4: אימות קוד → הצגת לוח שנה
}

// טבלה לניהול אימותים
model BookingVerification {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  linkId        String   @map("link_id") @db.Uuid
  phone         String
  email         String
  otpCode       String   @map("otp_code") // קוד 6 ספרות
  expiresAt     DateTime @map("expires_at") @db.Timestamptz(6)
  verifiedAt    DateTime? @map("verified_at") @db.Timestamptz(6)
  attempts      Int      @default(0) // ניסיונות הזנה
  isVerified    Boolean  @default(false) @map("is_verified")
  
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@index([linkId])
  @@index([phone])
  @@map("booking_verifications")
}
```

**UI Flow:**
```
┌─────────────────────────────────────────┐
│  🔐 אימות זהות נדרש                    │
│                                         │
│  כדי לראות זמינות, אנא אמת:           │
│                                         │
│  [📧 מייל________]                    │
│  [📱 טלפון________]                   │
│                                         │
│  [שלח קוד אימות]                       │
│                                         │
│  🔢 הזן קוד בן 6 ספרות:               │
│  [___] [___] [___] [___] [___] [___]  │
│                                         │
│  ✓ פועל פעם אחת | ✓ ללא ביטולים       │
└─────────────────────────────────────────┘
```

**יתרונות:**
- מסנן 90% מהספאמרים
- יוצר Commitment אמיתי מהמשתמש
- מונע "מילוי יומן פיקטיבי"

---

### 2. שיטת "הרמזור" ביומן (Visual Traffic Light System)

היומן לא צריך להיראות כמו אקסל. צבעים = מידע.

#### סכמת צבעים (Color Coding)

| צבע | משמעות | תצוגה |
|-----|--------|-------|
| 🔴 **אדום בוהק** | Buffer Time / חסימה ידנית | פס אנכי בין תורים |
| 🟡 **זהב** | תור ששולם (High Priority) | מסגרת זהב + אייקון 💎 |
| 🟠 **כתום מהבהב** | ממתין לאישור אדמין | אנימצית Pulse |
| ⚪ **אפור** | בוטל / לא הגיע | מחוק עם Strikethrough |
| 🟣 **סגול** | ועידת זום | אייקון וידאו |
| 🟢 **ירוק** | הושלם בהצלחה | סימן V |
| ⚫ **שחור שקוף** | זמן שבת/חג | Frosted Glass Overlay |

#### UI Implementation

```typescript
// קומפוננטת תא ביומן
interface CalendarCellProps {
  appointment: BookingAppointment;
  style: 'glassmorphism' | 'flat';
}

const AppointmentCard: React.FC<CalendarCellProps> = ({ appointment }) => {
  const style = getAppointmentStyle(appointment);
  
  return (
    <div className={`
      relative overflow-hidden rounded-xl p-3
      ${style.bgColor}
      ${style.hasPayment ? 'border-2 border-yellow-400 shadow-yellow-400/20' : 'border border-white/10'}
      ${style.needsApproval ? 'animate-pulse-slow' : ''}
      backdrop-blur-md
    `}>
      {/* Gradient Overlay for Glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Priority Badge */}
      {style.hasPayment && (
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full 
                       flex items-center justify-center text-black text-xs font-bold shadow-lg">
          💎
        </span>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        <span className="text-xs font-mono opacity-70">{appointment.time}</span>
        <h4 className="font-bold text-sm truncate">{appointment.customerName}</h4>
        <p className="text-xs opacity-60 truncate">{appointment.serviceName}</p>
      </div>
    </div>
  );
};
```

#### Sabbath/Holiday Visualization

```css
/* Frosted Glass for Shabbat/Holidays */
.shabbat-block {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(50, 50, 50, 0.8) 100%);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.shabbat-block::before {
  content: "🕯️ שבת קודש";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  color: rgba(255, 215, 0, 0.6);
  letter-spacing: 0.1em;
}
```

---

### 3. זמן נשימה דינמי (Contextual Buffer Time)

לא כל פגישה צריכה את אותו Buffer. זה תלוי בסוג הפגישה והמיקום.

#### לוגיקה חכמה

```typescript
interface BufferRule {
  // Base buffer by meeting type
  locationBufferMap: {
    zoom: 10;        // 10 דקות מנוחה אחרי זום
    meet: 10;        // Google Meet
    phone: 5;        // שיחת טלפון
    address: 30;     // 30 דקות (נסיעה/סידור)
  };
  
  // Dynamic adjustments
  conditionalRules: [
    {
      condition: "sameLocationAsPrevious";
      reduction: 15;  // אם באותו מיקום → הפחת 15 דקות
    },
    {
      condition: "highPriorityClient";
      reduction: 5;   // לקוח VIP → פחות זמן מנוחה
    },
    {
      condition: "backToBackMeetings";
      minimumBuffer: 5; // לפחות 5 דקות תמיד
    }
  ];
}

// חישוב Buffer דינמי
function calculateDynamicBuffer(
  currentAppointment: Appointment,
  previousAppointment: Appointment | null,
  nextAppointment: Appointment | null
): number {
  const baseBuffer = BufferRule.locationBufferMap[currentAppointment.locationType];
  let adjustedBuffer = baseBuffer;
  
  // בדיקת מיקום משותף
  if (previousAppointment && 
      previousAppointment.locationType === currentAppointment.locationType &&
      previousAppointment.locationDetails === currentAppointment.locationDetails) {
    adjustedBuffer -= 15;
  }
  
  // בדיקת VIP
  if (currentAppointment.customerTier === 'VIP') {
    adjustedBuffer -= 5;
  }
  
  // מינימום בטוח
  return Math.max(adjustedBuffer, 5);
}
```

#### תצוגה ביומן

```
┌────────────────────────────────────────┐
│  09:00  👤 ישראל ישראלי                │
│         💼 ייעוץ ראשוני               │
├────────────────────────────────────────┤
│  🔴 BUFFER (10 דקות)                   │ ← מוצג בבירור!
│     ↓ זמן מנוחה אוטומטי              │
├────────────────────────────────────────┤
│  09:40  👤 שרה כהן                     │
│         📞 שיחת מעקב                   │
└────────────────────────────────────────┘
```

---

### 4. Social Proof & FOMO (דף קביעת תור מתקדם)

כמו Booking.com - יצירת דחיפות ומחסור.

#### רכיבי Social Proof

```typescript
interface SocialProofData {
  // Real-time data
  currentlyViewing: number;      // כמה אנשים צופים בלינק עכשיו
  recentlyBooked: {              // מי קבע לאחרונה
    customerName: string;
    timeAgo: string;              // "לפני 5 דקות"
    avatar?: string;
  }[];
  
  // Scarcity indicators
  slotsRemainingToday: number;  // נשארו X חלונות היום
  nextAvailableSlot: Date;       // החלון הבא פנוי בעוד Y שעות
  
  // Urgency
  lastSlotWarning: boolean;      // "זה החלון האחרון לשבוע"
}
```

#### UI Design

```tsx
// Social Proof Banner
<SocialProofBanner>
  <LiveIndicator>
    <PulseDot color="green" />
    <span>3 אנשים צופים בלינק הזה כרגע</span>
  </LiveIndicator>
  
  <RecentBookings>
    <TinyAvatarStack>
      {[1,2,3].map(i => <Avatar key={i} size="xs" />)}
    </TinyAvatarStack>
    <span>שרה, דוד ו-5 אחרים קבעו השבוע</span>
  </RecentBookings>
  
  <ScarcityAlert severity="high">
    <Icon name="flame" />
    <span>⚠️ נשאר רק חלון אחד ליום שלישי הקרוב!</span>
  </ScarcityAlert>
</SocialProofBanner>

// Slot Selection with Urgency
<TimeSlot 
  time="10:00"
  urgency="last_slot"  // משנה צבע לכתום/אדום
  tooltip="החלון האחרון ליום זה"
/>
```

#### אפקטים חזותיים

```css
/* Pulse animation for live indicator */
@keyframes live-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.live-dot {
  animation: live-pulse 2s infinite;
}

/* Urgent slot styling */
.slot-urgent {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
  border: 2px solid #ff4757;
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
  animation: subtle-shake 3s infinite;
}
```

---

### 5. רשימת המתנה חכמה (Smart Waitlist)

מישהו ביטל? תפס את המחכים הראשון אוטומטית.

#### לוגיקת Waitlist

```typescript
// טבלה
model BookingWaitlist {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  linkId          String   @map("link_id") @db.Uuid
  organizationId  String   @map("organization_id") @db.Uuid
  
  // פרטי הממתין
  customerName    String   @map("customer_name")
  customerEmail   String   @map("customer_email")
  customerPhone   String   @map("customer_phone")
  
  // העדפות
  preferredDays   Int[]    @map("preferred_days") // [0,2,4] = א',ג',ה'
  preferredTimes  String[] @map("preferred_times") // ["morning", "afternoon"]
  urgency         String   @default("normal") // "low" | "normal" | "high" | "urgent"
  
  // סטטוס
  status          String   @default("active") // "active" | "notified" | "converted" | "expired"
  position        Int      // מיקום בתור
  
  // קשר
  convertedToAppointmentId String? @map("converted_to_appointment_id") @db.Uuid
  
  expiresAt       DateTime? @map("expires_at") @db.Timestamptz(6)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@index([linkId, status])
  @@index([position])
  @@map("booking_waitlist")
}
```

#### Flow אוטומטי

```typescript
// כאשר תור מתבטל
async function handleCancellation(appointmentId: string) {
  // 1. מציאת ה-waitlist הפעילים ללינק הזה
  const waiters = await prisma.bookingWaitlist.findMany({
    where: {
      linkId: cancelledAppointment.linkId,
      status: 'active',
      expiresAt: { gt: new Date() }
    },
    orderBy: [
      { urgency: 'desc' },  // דחיפים קודם
      { position: 'asc' }, // ואז לפי מיקום
      { createdAt: 'asc' } // ואז מי שנרשם ראשון
    ],
    take: 3 // שליחה ל-3 הראשונים
  });
  
  // 2. שליחת הודעת "זמן התפנה" במקביל
  await Promise.all(
    waiters.map(async (waiter, index) => {
      // הראשון שעונה תופס
      const message = `
🔥 התפנה חלון זמן ${formatHebrewDate(cancelledAppointment.startTime)} 
בשעה ${formatTime(cancelledAppointment.startTime)}!

אתה מס' ${index + 1} ברשימה.
⏰ הראשון שמאשר תופס.

[לחץ לאישור מיידי]
      `.trim();
      
      await sendWhatsApp(waiter.customerPhone, message);
      await sendEmail(waiter.customerEmail, 'חלון זמן התפנה!', message);
      
      // עדכון סטטוס
      await prisma.bookingWaitlist.update({
        where: { id: waiter.id },
        data: { 
          status: 'notified',
          notifiedAt: new Date()
        }
      });
    })
  );
  
  // 3. הגדרת timeout - אם אף אחד לא ענה תוך 30 דקות, 
  // החלון חוזר לזמינות כללית
  scheduleReopenSlot(cancelledAppointment, 30 * 60 * 1000);
}
```

#### WhatsApp Template

```
🔔 *התראת זמן מתפנה*

היי {firstName},

מישהו ביטל תור ו*התפנה חלון זמן*:

📅 *{hebrewDate}* ({gregorianDate})
🕐 *{time}*
📍 *{serviceName}*

⚡ *אתה מס' {position} ברשימת המתנה*
ה*ראשון שמאשר תופס* את המקום!

[✅ אשר תור מיידי] [❌ ויתור]
```

---

### 6. Command Center UI - Dark Mode יוקרתי

האדמין פאנל צריך להרגיש כמו מרכז בקרה, לא כמו טופס.

#### עיצוב Glassmorphism

```css
/* Design System - Dark Mode */
:root {
  /* Background layers */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-tertiary: #1a1a25;
  --bg-glass: rgba(26, 26, 37, 0.7);
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  
  /* Accent colors */
  --accent-primary: #6366f1;
  --accent-secondary: #8b5cf6;
  --accent-gold: #fbbf24;
  --accent-danger: #ef4444;
  --accent-success: #10b981;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);
}

/* Card Component */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
  padding: 24px;
}

/* Gradient borders */
.gradient-border {
  position: relative;
  background: var(--bg-secondary);
  border-radius: 16px;
}

.gradient-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, 
    rgba(99, 102, 241, 0.5), 
    rgba(139, 92, 246, 0.2),
    rgba(255, 255, 255, 0.1)
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, 
                linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

#### Dashboard Layout

```tsx
// Admin Dashboard - Command Center
<CommandCenterLayout>
  {/* Header Stats */}
  <StatsRow>
    <StatCard 
      icon="calendar" 
      value={12} 
      label="פגישות היום"
      trend="+2 מהשבוע שעבר"
      color="indigo"
    />
    <StatCard 
      icon="dollar" 
      value="₪4,200" 
      label="הכנסות יומיות"
      trend="+15%"
      color="green"
    />
    <StatCard 
      icon="clock" 
      value="85%" 
      label="שיעור הגעה"
      trend="-3%"
      color="yellow"
    />
    <StatCard 
      icon="users" 
      value={3} 
      label="ברשימת המתנה"
      alert
      color="purple"
    />
  </StatsRow>
  
  {/* Main Calendar */}
  <GlassCard className="h-[600px]">
    <CalendarHeader>
      <ViewToggle options={['day', 'week', 'month']} />
      <ProviderSelector multiSelect />
      <QuickActions>
        <Button variant="glow" onClick={createAppointment}>
          <PlusIcon /> תור חדש
        </Button>
        <Button variant="outline" onClick={blockTime}>
          <LockIcon /> חסום זמן
        </Button>
      </QuickActions>
    </CalendarHeader>
    
    <CalendarGrid 
      view={currentView}
      appointments={appointments}
      onDragStart={handleDrag}
      onResize={handleResize}
    />
  </GlassCard>
  
  {/* Side Panel - Today's Timeline */}
  <SidePanel>
    <GlassCard>
      <h3>📅 היום שלי</h3>
      <Timeline 
        appointments={todaysAppointments}
        currentTimeIndicator
      />
    </GlassCard>
    
    <GlassCard>
      <h3>🔔 התראות</h3>
      <NotificationList />
    </GlassCard>
  </SidePanel>
</CommandCenterLayout>
```

#### Glow Effects

```css
/* Button Glow */
.btn-glow {
  position: relative;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-glow::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  filter: blur(12px);
  transition: opacity 0.3s ease;
}

.btn-glow:hover::before {
  opacity: 0.6;
}

/* Card Hover Glow */
.card-glow:hover {
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
}
```

---

### 7. אינטגרציה רגשית עברית (Hebrew Emotional Design)

#### זמני שבת בולטים

```typescript
interface ShabbatTimes {
  date: Date;
  candleLighting: string;  // "17:44"
  havdalah: string;        // "18:52"
  parasha: string;         // "פרשת פקודי"
}

// תצוגה ביומן
<ShabbatIndicator>
  <div className="shabbat-banner">
    <span className="candle-icon">🕯️</span>
    <div>
      <span className="shabbat-label">שבת קודש</span>
      <span className="parasha">{parasha}</span>
      <span className="times">
        כניסה: {candleLighting} | יציאה: {havdalah}
      </span>
    </div>
  </div>
</ShabbatIndicator>
```

```css
/* Shabbat Banner */
.shabbat-banner {
  background: linear-gradient(135deg, 
    rgba(30, 30, 30, 0.95) 0%, 
    rgba(50, 45, 40, 0.9) 100%
  );
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.shabbat-banner .candle-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 8px rgba(255, 200, 100, 0.5));
}

.shabbat-banner .shabbat-label {
  color: #ffd700;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.1em;
  display: block;
}

.shabbat-banner .parasha {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  font-weight: 600;
}

.shabbat-banner .times {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  display: block;
  margin-top: 4px;
}
```

#### הודעות בעברית מחברת

```typescript
// Templates בעברית עשירה
const hebrewTemplates = {
  confirmation: (data: AppointmentData) => `
✨ *התור נקבע בהצלחה!*

היי ${data.customerName},

הפגישה שלך נשמרה ביומן:
📅 *${data.hebrewDate}* (${data.gregorianDate})
🕐 *${data.time}*
📍 *${data.location}*

⏰ *חשוב:* נדרשת הגעה בדיוק בזמן.
הזמן הזה שמור במיוחד עבורך.

להוספה ליומן שלך:
[📆 הוסף ליומן Google]
[📆 הוסף ליומן Apple]

מחכה לראותך,
${data.providerName}
  `,
  
  reminder24h: (data: AppointmentData) => `
🗓️ *תזכורת: מחר הפגישה שלך*

היי ${data.customerName},

מחר ב-*${data.time}* יש לנו פגישה.

📍 פרטי ההגעה:
${data.locationDetails}

⚠️ *לא ניתן לבטל* | *נדרשת הגעה בזמן*

צריך לדבר לפני? השב "כן"
  `,
  
  followup: (data: AppointmentData) => `
🙏 *תודה על הפגישה*

היי ${data.customerName},

תודה שהקדשת מזמנך לפגישה היום.

האם יש משהו נוסף שאוכל לעזור בו?
[💬 שלח הודעה]
[📅 קבע פגישה נוספת]
  `
};
```

#### אפקט רגשי בלינק ציבורי

```tsx
// Hero Section of Public Booking Page
<BookingHero>
  <div className="hebrew-ornament top">
    ✦ ✡ ✦
  </div>
  
  <h1 className="hebrew-title">
    {link.title}
  </h1>
  
  <p className="hebrew-subtitle">
    {link.description}
  </p>
  
  <div className="trust-indicators">
    <TrustBadge icon="shield">מערכת מאובטחת</TrustBadge>
    <TrustBadge icon="clock">אישור מיידי</TrustBadge>
    <TrustBadge icon="calendar-hebrew">
      תומך בלוח עברי
    </TrustBadge>
  </div>
  
  <div className="hebrew-ornament bottom">
    ✦ ✡ ✦
  </div>
</BookingHero>

```css
.hebrew-title {
  font-family: 'Heebo', 'Rubik', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.hebrew-ornament {
  text-align: center;
  color: rgba(255, 215, 0, 0.5);
  font-size: 1.2rem;
  letter-spacing: 0.5em;
  margin: 1.5rem 0;
}
```

---

## 🎯 נקודות UX נוספות שחשוב להכיר

### Progressive Disclosure

לא להציג הכל בבת אחת. שכבות מידע:

```
שכבה 1: בחירת תאריך + שעה (הכי קל)
    ↓
שכבה 2: מילוי פרטים אישיים (שם, מייל, טלפון)
    ↓
שכבה 3: פרטי פגישה (סיבה, הערות)
    ↓
שכבה 4: אישור תשלום (אם נדרש)
    ↓
שכבה 5: אישור סופי + הוספה ליומן
```

### Micro-interactions

```css
/* Slot selection animation */
@keyframes slot-select {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.time-slot.selected {
  animation: slot-select 0.2s ease;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
}

/* Success animation */
@keyframes success-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.success-icon {
  animation: success-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Accessibility (נגישות)

```tsx
// ARIA labels בעברית
<button 
  aria-label="בחר שעה 10:00 בבוקר"
  aria-pressed={isSelected}
  role="button"
>
  10:00
</button>

// High contrast mode
@media (prefers-contrast: high) {
  .time-slot {
    border: 2px solid currentColor;
  }
  
  .shabbat-block {
    background: #000;
    color: #fff;
  }
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

---

## 💎 עקרונות הפשטות והיעילות (Simple & Clean UX)

> **"פשטות היא התחכום האולטימטיבי"** - המערכת מיועדת לאנשים שאוהבים ישירות, יעילות מקסימלית ונקיות ויזואלית.

### 1. גישת "אפס הסחות דעת" (Zero-Distraction Design)
במקום עומס של כפתורים ותפריטים, הממשק יתמקד בפעולה אחת בכל רגע נתון.

*   **Mobile-First:** כל כפתור גדול מספיק ללחיצה עם האגודל (מינימום 48px).
*   **מינימליזם ויזואלי:** שימוש במרווחים (White Space) כדי לתת לעין לנוח.
*   **פונטים קריאים:** שימוש ב-Heebo/Rubik במשקלים ברורים, ללא פונטים דקורטיביים מורכבים.
*   **Direct Messaging:** ללא "סלופ" שיווקי. משפטים קצרים וברורים: "בחר שעה", "אמת טלפון", "התור נקבע".

### 2. ממשק המשתמש (Public Side) - פשטות מקסימלית
המשתמש הפשוט לא רוצה "לעבוד" בשביל לקבוע תור.

*   **Single-Scroll Flow:** דף אחד ארוך ונוח, ללא מעברי דפים מיותרים.
*   **בחירה מהירה:** לחיצה על תאריך → לחיצה על שעה → אישור. זהו.
*   **No-Login Approach:** אין צורך בשם משתמש וסיסמה. המייל והטלפון הם המזהים היחידים.
*   **סיכום ברור:** בסיום, מוצג כרטיס פשוט עם כל הפרטים וצמד כפתורים: "הוסף ליומן" ו"ניווט ליעד" (אם פרונטלי).

### 3. ממשק האדמין (Admin Side) - יעילות ומהירות
האדמין צריך לנהל את היום שלו במינימום קליקים.

*   **One-Click Status:** שינוי סטטוס תור (הגיע/בוטל/הושלם) ישירות מהיומן ללא פתיחת מודאלים מורכבים.
*   **Smart Shortcuts:**
    *   `Double Click` על משבצת ריקה = פתיחת תור מהיר.
    *   `Drag & Drop` = שינוי שעה מיידי.
    *   `Right Click` = ביטול/חסימה מהירה.
*   **תצוגת "מבט על" נקייה:** צבעים רכים שאינם מעייפים את העין בעבודה ממושכת.

### 4. רספונסיביות מלאה (Adaptive Layout)
המערכת תיראה ותרגיש "טבעית" בכל מכשיר.

| רכיב | חוויית מובייל (Mobile) | חוויית דסקטופ (Desktop) |
|------|------------------------|-------------------------|
| **יומן** | תצוגת רשימה (Agenda) או יומן יחיד | תצוגת רשת (Grid) רב-ערוצית |
| **תפריטים** | Drawer (תחתון) נשלף | Sidebar (צדדי) קבוע |
| **טפסים** | שדות רחבים במיוחד | חלוקה ל-2 עמודות |
| **תזכורות** | קיצורי דרך ל-WhatsApp/טלפון | מיילים מפורטים |

### 5. שפת ה-UX: ישירות דוגרי (Protocol Dughri)
בהתאם לפרוטוקול השיווקי של המערכת, גם ה-UI ידבר "דוגרי":
*   במקום: "נשמח אם תואיל בטובך לציין את סיבת פגישתך"
*   **דוגרי:** "למה אנחנו נפגשים? (כדי שאבוא מוכן)"

---

## 📝 נספח: טבלאות קיימות במערכת

לפי ניתוח הקוד, יש כבר מערכת קלנדר בסיסית:

### SystemCalendarEvent (קיים)
- מודל בסיסי לפגישות
- תומך ב-zoom/frontal/group_session
- מערכת תזכורות built-in
- אינטגרציה עם leads

### תכנון אינטגרציה
המערכת החדשה תשתמש ב-SystemCalendarEvent הקיים כבסיס, ותוסיף שכבת "Booking" מעל:
- **SystemCalendarEvent** = האירוע עצמו (זמן, מיקום)
- **BookingAppointment** = המטה-דאטה של הקביעה (לקוח, תשלום, סטטוס)

---

## ✅ סיכום והמלצות

### נקודות מפתח:

1. **הפרדת זמינות מיומן** - Availability נפרדת מ-Appointments לביצועים
2. **Buffer Time אוטומטי** - הגנה על זמן האדמין בין פגישות
3. **Hebrew Calendar Layer** - תצוגה עברית מעל תאריכים לועזיים
4. **Link-based Configuration** - כל לינק עם הגדרות משלו
5. **No-Cancel Policy** - ברירת מחדל קשיחה למניעת הברזות
6. **Payment Integration** - חיבור למערכת Billing הקיימת

### הערכת זמן כוללת: **6-7 שבועות**

---

**מסמך זה נכתב עבור MISRAD AI | תאריך: 12 מרץ 2026**
