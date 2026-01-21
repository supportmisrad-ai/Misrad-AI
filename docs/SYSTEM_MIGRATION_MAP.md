# System Module Migration Map (SystemApp.tsx → Workspace Routing)

מטרת המסמך: לשמש כצ׳ק־ליסט מלא להעברת מודול System מארכיטקטורת Client App (`components/system/SystemApp.tsx`) לארכיטקטורת Workspace Routing עם דפים נפרדים תחת:

`/app/w/[orgSlug]/(modules)/system/*`

הקווים המנחים:

- UI/UX זהה (Pixel-perfect) למסכים הקיימים.
- Zero Mock Data (בשלב הבנייה המלאה לכל מסך).
- חיבור ל־DB/Server Actions במקום localStorage/mock.
- ניווט מלא דרך routes שטוחים: `/w/[orgSlug]/system/<tab>`.

---

## 1) Shell / Framework (רכיבי מעטפת גלובליים)

### `components/system/SystemApp.tsx`
- Orchestration: header, sidebar, mobile nav/drawer, מודאלים, overlayים, טעינות.
- Server Actions קיימים בשימוש:
  - `getSystemLeads(orgSlug)`
  - `getMyProfile({ orgSlug })`
  - `/api/strategic-content?module_id=system` (Closer)
  - `/api/ai/analyze` (Communication AI Draft)
- מקורות localStorage/sessionStorage שיש לבטל בהמשך:
  - `sales_os_tasks_v1`
  - `sales_os_content_v1`
  - `sales_os_students_v1`
  - `sales_os_campaigns_v1`
  - `sales_os_invoices_v1`
  - `sales_os_events_v1`
  - `system_admin_first_action_done_*` (localStorage)
  - `nexus_booted` (sessionStorage)

### Shell components
- `components/system/SystemHeader.tsx`
  - Command Palette
  - Notifications
  - Profile
- `components/system/Sidebar.tsx`
  - NAV_ITEMS/NAV_GROUPS
  - special routing:
    - `personal_area` → hub drawer profile
    - `system/settings` → hub drawer system
  - OSAppSwitcher

---

## 2) Tabs (TAB_IDS)

רשימת הטאבים כפי שמוגדרים ב־SystemApp:

- `workspace`
- `sales_pipeline`
- `sales_leads`
- `calendar`
- `comms`
- `dialer`
- `tasks`
- `mkt_campaigns`
- `mkt_content`
- `mkt_forms`
- `mkt_partners`
- `finance`
- `quotes`
- `products`
- `operations`
- `reports`
- `headquarters`
- `system`
- `me`
- `hub`
- `personal_area`
- `notifications_center`
- `focus_mode`
- `data_connectivity`
- `ai_analytics`
- `settings`

---

## 3) מה כל טאב מרנדר בפועל (רכיב/מסך)

### A) `workspace`
- `components/system/WorkspaceHub.tsx`
  - `components/system/SystemCommandCenter.tsx`
  - `components/system/MorningBriefingView.tsx`
  - `components/system/MobileFrontWing.tsx`
- תלות:
  - Leads: DB
  - Events/Tasks/Content/Campaigns/Students: כיום localStorage

### B) `sales_pipeline` / `sales_leads`
- `components/system/LeadsHub.tsx`
  - `pipeline` → `components/system/PipelineBoard.tsx` (drag & drop)
  - `list` → `components/system/ContactsView.tsx`
  - `targets` → `components/system/SystemTargetsView.tsx` (אם מופעל)
- תלות:
  - Leads: DB
- חוב טכני:
  - ContactsView משתמש ב־localStorage עבור search/filter
  - שינוי סטטוס כיום state-only ב־SystemApp (נדרש Server Action)

### C) `calendar`
- `components/system/system.os/components/CalendarView.tsx`
- תלות:
  - Leads: DB
  - Events: כיום localStorage (יש Server Actions קיימים ב־`app/actions/system-leads.ts`)
- Mock:
  - “Sync” (setTimeout)

### D) `comms` / `dialer`
- `components/system/CommunicationView.tsx` → `components/system/system.os/components/CommunicationView.tsx`
- מנוע:
  - `components/communication/CommunicationViewBase`
- תלות:
  - פעילויות לידים: DB (יש Server Action `createSystemLeadActivity`)
  - AI Draft: `/api/ai/analyze`

### E) `tasks`
- `components/nexus/TasksView.tsx` (גרסה פנימית ל-System)
- כיום מקבל tasks מ־localStorage

### F) Marketing (`mkt_*`)
- `components/system/MarketingView.tsx`
  - `ContentStudioView.tsx`
  - `FormsView.tsx`
  - `PartnersView.tsx`
- Mock בולט:
  - connectedPlatforms state
  - INITIAL_FORMS/INITIAL_PARTNERS

### G) `finance` / `quotes`
- `components/system/FinanceView.tsx`
- Mock/חוב:
  - MRR חישוב קשיח
  - invoices כיום localStorage (למרות שבמודול Finance קיימת עבודה עם DB)

### H) `products`
- `components/system/CatalogView.tsx`
- מצב:
  - state פנימי, אין DB

### I) `operations`
- `components/system/OperationsHub.tsx`
  - `DeliveryView.tsx`
  - `FieldManagementView.tsx`
- תלות:
  - Students: localStorage
  - Leads: DB

### J) `reports`
- `components/system/ReportsView.tsx`
- חוב:
  - trendData ריק

### K) `headquarters`
- `components/nexus/HeadquartersView.tsx`

### L) `system` / `settings`
- `components/system/SystemHub.tsx`
  - `AIAnalyticsView.tsx`
  - `AutomationsView.tsx` (localStorage)
  - `IntegrationsView.tsx` (channels mock)
  - `GlobalProfileHub` (drawer)

### M) `me`
- `views/MeView.tsx` עטוף ב־`context/DataContext.tsx` (`DataProvider`)

### N) `hub`
- `components/profile/GlobalProfileHub.tsx`

### O) `personal_area`
- `components/system/PersonalAreaView.tsx`
- חוב:
  - נתונים קשיחים (email/phone/achievements)

### P) `notifications_center`
- `components/system/NotificationsView.tsx`
- Mock:
  - INITIAL_NOTIFICATIONS קשיח

### Q) `focus_mode`
- `components/system/FocusModeView.tsx`
- חוב:
  - משתמש ב־`INITIAL_TASKS`

### R) `data_connectivity`
- `components/system/DataConnectivityView.tsx`
- Mock:
  - metrics קשיחים
  - webhook stream קשיח

### S) `ai_analytics`
- `components/system/AIAnalyticsView.tsx`
- תלות:
  - leads (DB)
  - campaigns/tasks/invoices (חלק localStorage)

---

## 4) מודאלים / Overlays (גלובליים)

- `components/system/CommandPalette.tsx`
  - Ctrl/Cmd+K
  - חיפוש ניווט + חיפוש לידים + AI chat
- `components/system/LeadModal.tsx`
  - Add activity
  - Schedule meeting
  - Open client portal
  - Add task
- `components/system/NewLeadModal.tsx`
- `components/system/NewMeetingModal.tsx`
- `components/system/HandoverDialog.tsx`
  - Trigger: status → `won`
  - כולל payload + “sending” סימולטיבי
- `components/system/ClientPortalView.tsx`
- “Closer Overlay” (SystemApp)
  - `/api/strategic-content?module_id=system`

---

## 5) תלותים/מקורות נתונים (סיכום)

### DB / Server Actions קיימים
- Leads:
  - `getSystemLeads(orgSlug)`
  - `createSystemLeadActivity({ orgSlug, leadId, ... })`
  - `updateSystemLeadStatus({ orgSlug, leadId, status })`
- Calendar:
  - `getSystemCalendarEvents({ orgSlug })`
  - `createSystemCalendarEvent({ orgSlug, ... })`
- Profile:
  - `getMyProfile({ orgSlug })`
  - `upsertMyProfile({ orgSlug, updates })`

### Mock / localStorage שדורש החלפה
- Campaigns, content, students, invoices, tasks, events (ב־SystemApp)
- NotificationsView (INITIAL_NOTIFICATIONS)
- DataConnectivityView metrics
- IntegrationsView channels
- Forms/Partners initial data

---

## 6) Checklist מסכם

- [ ] Shell חדש תחת `/w/[orgSlug]/system/*` כולל Sidebar+Header+מודאלים גלובליים.
- [ ] העברת Core Sales:
  - [ ] `/system/workspace`
  - [ ] `/system/sales_pipeline`
  - [ ] `/system/sales_leads`
  - [ ] `/system/calendar`
  - [ ] `/system/comms`
  - [ ] `/system/dialer`
- [ ] Support:
  - [ ] `/system/me`
  - [ ] `/system/notifications_center`
  - [ ] `/system/focus_mode`
- [ ] Placeholder לטאבים שיופנו למודולים ייעודיים:
  - [ ] Marketing (`mkt_*`) → `/w/[orgSlug]/social`
  - [ ] Finance (`finance/quotes/products`) → `/w/[orgSlug]/finance`
  - [ ] Operations (`operations`) → `/w/[orgSlug]/operations`
