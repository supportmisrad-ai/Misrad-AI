# 🔍 דו"ח ניתוח סכימה - Production Database

**תאריך:** 15 בפברואר 2026  
**מטרה:** זיהוי פערים בין הסכימה הנוכחית למה שקיים ב-Production, מניעת אובדן נתונים

---

## 📊 סיכום מנהלים

### תמונת מצב
- **Production DB:** 179 טבלאות (180 עם `_prisma_migrations`)
- **Schema.prisma הנוכחי:** 181 models
- **פער:** **143 טבלאות קיימות ב-Production אבל חסרות בסכימה הנוכחית**

### ממצא קריטי ⚠️
**הסכימה הנוכחית שלנו חלקית ואינה משקפת את מלוא המערכת!**

---

## 🗂️ פילוח לפי מודולים

### 1️⃣ NEXUS Module
**5 טבלאות חסרות:**
- `nexus_clients` - ניהול לקוחות Nexus
- `nexus_tasks` - משימות צוות
- `nexus_tenants` - ניהול שוכרים
- `nexus_time_entries` - רישום שעות עבודה
- `nexus_users` - משתמשי Nexus

**סטטוס:** 🔴 **CRITICAL** - אלו טבלאות ליבה של מודול Nexus!

---

### 2️⃣ SOCIALMEDIA Module (Social OS)
**27 טבלאות חסרות:**

**ניהול תוכן:**
- `socialmedia_posts` - פוסטים
- `socialmedia_post_platforms` - פלטפורמות לפוסט
- `socialmedia_post_variations` - וריאציות פוסטים
- `socialmedia_post_comments` - תגובות
- `socialmedia_site_content` - תוכן אתר

**ניהול לקוחות:**
- `socialmedia_clients` - לקוחות Social
- `socialmedia_client_platforms` - פלטפורמות לקוח
- `socialmedia_client_requests` - בקשות לקוח
- `socialmedia_client_dna` - DNA לקוח

**תקשורת:**
- `socialmedia_conversations` - שיחות
- `socialmedia_messages` - הודעות
- `socialmedia_manager_requests` - בקשות מנהל

**אוטומציות ואינטגרציות:**
- `socialmedia_automation_rules` - חוקי אוטומציה
- `socialmedia_sheets_sync_configs` - סנכרון Google Sheets
- `socialmedia_sync_logs` - לוגי סנכרון
- `socialmedia_platform_credentials` - אישורי פלטפורמות
- `socialmedia_platform_quotas` - מכסות

**ניהול:**
- `socialmedia_campaigns` - קמפיינים
- `socialmedia_tasks` - משימות
- `socialmedia_ideas` - רעיונות תוכן
- `socialmedia_feedback` - פידבק
- `socialmedia_invoices` - חשבוניות
- `socialmedia_payment_orders` - הזמנות תשלום
- `socialmedia_calendar_events` - אירועי לוח שנה
- `socialmedia_drive_files` - קבצי Drive
- `socialmedia_business_metrics` - מדדים עסקיים
- `socialmedia_ai_opportunities` - הזדמנויות AI
- `socialmedia_agency_configs` - הגדרות סוכנות

**סטטוס:** 🔴 **CRITICAL** - מודול שלם חסר!

---

### 3️⃣ SYSTEM Module (System OS - CRM/Leads)
**22 טבלאות חסרות:**

**ניהול לידים:**
- `system_leads` - לידים
- `system_lead_activities` - פעילויות ליד
- `system_lead_handovers` - העברות ליד
- `system_lead_custom_field_definitions` - שדות מותאמים
- `system_pipeline_stages` - שלבי משפך

**ניהול משימות ואירועים:**
- `system_tasks` - משימות
- `system_calendar_events` - אירועי לוח שנה
- `system_call_analyses` - ניתוחי שיחות

**תוכן וקמפיינים:**
- `system_campaigns` - קמפיינים
- `system_content_items` - פריטי תוכן

**טפסים ופורטל:**
- `system_forms` - טפסים
- `system_portal_tasks` - משימות פורטל
- `system_portal_approvals` - אישורי פורטל

**ניהול:**
- `system_invoices` - חשבוניות
- `system_support_tickets` - פניות תמיכה
- `system_assets` - נכסים
- `system_automations` - אוטומציות
- `system_partners` - שותפים
- `system_students` - סטודנטים
- `system_field_agents` - סוכני שטח
- `system_webhook_logs` - לוגי webhooks
- `system_backups` - גיבויים (🗑️ אפשר למחוק)

**סטטוס:** 🔴 **CRITICAL** - ליבת ה-CRM חסרה!

---

### 4️⃣ CLIENT Module (Client OS)
**14 טבלאות חסרות:**

- `client_clients` - לקוחות
- `client_profiles` - פרופילים
- `client_tasks` - משימות
- `client_approvals` - אישורים
- `client_feedbacks` - פידבקים
- `client_documents` - מסמכים
- `client_document_files` - קבצי מסמכים
- `client_shared_files` - קבצים משותפים
- `client_internal_notes` - הערות פנימיות
- `client_portal_content` - תוכן פורטל
- `client_portal_invites` - הזמנות לפורטל
- `client_portal_users` - משתמשי פורטל
- `client_service_tiers` - רמות שירות
- `client_sessions` - סשנים

**סטטוס:** 🔴 **CRITICAL** - מודול Client OS חסר!

---

### 5️⃣ OPERATIONS Module
**5 טבלאות חסרות:**

- `operations_inventory` - מלאי
- `operations_items` - פריטים
- `operations_projects` - פרויקטים
- `operations_suppliers` - ספקים
- `operations_work_orders` - הזמנות עבודה

**סטטוס:** 🟡 **IMPORTANT** - מודול Operations חסר

---

### 6️⃣ MISRAD Module (ניהול פרויקטים מתקדם)
**45 טבלאות חסרות:**

**ניהול לקוחות:**
- `misrad_clients` - לקוחות
- `misrad_client_actions` - פעולות לקוח
- `misrad_client_agreements` - הסכמים
- `misrad_client_assets` - נכסי לקוח
- `misrad_client_deliverables` - תוצרים
- `misrad_client_handoffs` - העברות
- `misrad_client_transformations` - טרנספורמציות

**מחזורים ומשימות:**
- `misrad_cycles` - מחזורים
- `misrad_cycle_tasks` - משימות מחזור
- `misrad_cycle_assets` - נכסי מחזור
- `misrad_tasks` - משימות (שונה מ-ai_tasks)

**תקשורת:**
- `misrad_messages` - הודעות
- `misrad_message_attachments` - קבצים מצורפים
- `misrad_emails` - אימיילים
- `misrad_meetings` - פגישות
- `misrad_meeting_files` - קבצי פגישה
- `misrad_meeting_analysis_results` - ניתוחי פגישות

**טפסים:**
- `misrad_form_templates` - תבניות טפסים (🗑️ אפשר למחוק - backup)
- `misrad_form_fields` - שדות טפסים
- `misrad_form_steps` - שלבי טפסים
- `misrad_form_responses` - תגובות טפסים
- `misrad_assigned_forms` - טפסים משויכים

**ניהול:**
- `misrad_invoices` - חשבוניות
- `misrad_opportunities` - הזדמנויות
- `misrad_milestones` - אבני דרך
- `misrad_journey_stages` - שלבי מסע
- `misrad_success_goals` - יעדי הצלחה
- `misrad_roi_records` - רשומות ROI
- `misrad_stakeholders` - בעלי עניין
- `misrad_metric_history` - היסטוריית מדדים

**Workflows:**
- `misrad_workflow_blueprints` - תבניות workflows
- `misrad_workflow_stages` - שלבי workflow
- `misrad_workflow_items` - פריטי workflow

**מערכת:**
- `misrad_activity_logs` - לוגי פעילות
- `misrad_notifications` - התראות
- `misrad_feedback_items` - פריטי פידבק
- `misrad_feature_requests` - בקשות פיצ'רים
- `misrad_support_tickets` - פניות תמיכה
- `misrad_integrations` - אינטגרציות
- `misrad_calendar_sync_log` - לוג סנכרון לוח שנה
- `misrad_module_settings` - הגדרות מודול
- `misrad_permissions` - הרשאות
- `misrad_roles` - תפקידים
- `misrad_group_events` - אירועי קבוצה
- `misrad_ai_liability_risks` - סיכוני אחריות AI

**סטטוס:** 🔴 **CRITICAL** - מודול ענק חסר לחלוטין!

---

## 🌐 טבלאות Global/System (48 טבלאות)

אלו טבלאות שאין להן קשר ישיר ל-`organization_id`:

### Core System:
- `core_system_settings` ✅ (קיים בסכימה)
- `global_system_metrics`
- `navigation_menu`
- `notifications`
- `activity_logs`

### Authentication & Integrations:
- `oauth_tokens`
- `integration_credentials`
- `integration_status`
- `impersonation_sessions`

### Teams & Partnerships:
- `team_members` ✅ (קיים)
- `team_member_clients`
- `team_comments`
- `partners`

### Other:
- `app_updates`
- `device_pairing_tokens`
- `web_push_subscriptions`
- `webhook_configs`
- `user_update_views`
- `work_listings`

**סטטוס:** 🟡 **לבדוק** - ייתכן שחלקן deprecated או legacy

---

## 🗑️ טבלאות "זבל" - מומלץ למחיקה

**2 טבלאות בלבד:**
1. `system_backups` - טבלת גיבויים ישנה
2. `misrad_form_templates` - backup של תבניות טפסים (שם מטעה)

---

## 🔗 ניתוח Relations

### מחוברות ל-Organizations: 94 טבלאות
אלו טבלאות שיש להן `organization_id` - **ליבת ה-CRM**.

### לא מחוברות: 49 טבלאות
טבלאות global/system או legacy.

---

## ⚠️ סיכוני אובדן נתונים

### 🔴 סיכון גבוה - CORE TABLES (93 טבלאות)
**אסור לגעת בהן ללא הסכימה המלאה!**

אלו טבלאות שמחוברות ל-`organizations` ולא זבל:
- כל 5 טבלאות Nexus
- כל 27 טבלאות SocialMedia  
- כל 22 טבלאות System (מלבד backups)
- כל 14 טבלאות Client
- כל 5 טבלאות Operations
- 44 מתוך 45 טבלאות Misrad

**אם נמחק/נשנה את אלו - נאבד נתונים קריטיים של 6 מודולי CRM!**

---

## 💡 המלצות

### ✅ מה לעשות עכשיו:

1. **עצרנו את תהליך המיגרציה** ✅
2. **משכנו את הסכימה המלאה מ-Production** ✅  
   (`prisma/schema.prod-pulled.prisma`)
3. **זיהינו את הפערים** ✅

### 🚫 מה לא לעשות:

1. **אל תריץ migrate deploy** - זה ימחק 143 טבלאות!
2. **אל תריץ db push** - אותה בעיה
3. **אל תנקה את _prisma_migrations** - זה ישבור את ההיסטוריה

### 🔄 מה כן לעשות:

#### אופציה 1: שימור Production (מומלץ!)
1. **השתמש ב-`schema.prod-pulled.prisma` כבסיס**
2. העתק אותו ל-`schema.prisma`
3. הרץ `prisma generate` כדי ליצור Client מעודכן
4. בדוק שהקוד עובד עם כל 179 הטבלאות

#### אופציה 2: מיזוג סכימות
1. מזג את `schema.prisma` הנוכחי עם `schema.prod-pulled.prisma`
2. פתור קונפליקטים ידנית
3. אמת שכל הטבלאות נשמרות

#### אופציה 3: DEV חדש מאפס
1. **רק אם** Production זה באמת רק טסטים
2. יצירת DEV חדש מהסכימה הנוכחית (החלקית)
3. **אובדן** של 6 מודולים שלמים!

---

## 📋 רשימה מלאה של טבלאות חסרות

<details>
<summary>לחץ לצפייה ב-143 הטבלאות החסרות</summary>

### NEXUS (5):
- nexus_clients
- nexus_tasks
- nexus_tenants
- nexus_time_entries
- nexus_users

### SOCIALMEDIA (27):
- socialmedia_agency_configs
- socialmedia_ai_opportunities
- socialmedia_automation_rules
- socialmedia_business_metrics
- socialmedia_calendar_events
- socialmedia_campaigns
- socialmedia_client_dna
- socialmedia_client_platforms
- socialmedia_client_requests
- socialmedia_clients
- socialmedia_conversations
- socialmedia_drive_files
- socialmedia_feedback
- socialmedia_ideas
- socialmedia_invoices
- socialmedia_manager_requests
- socialmedia_messages
- socialmedia_payment_orders
- socialmedia_platform_credentials
- socialmedia_platform_quotas
- socialmedia_post_comments
- socialmedia_post_platforms
- socialmedia_post_variations
- socialmedia_posts
- socialmedia_sheets_sync_configs
- socialmedia_site_content
- socialmedia_sync_logs
- socialmedia_tasks

### SYSTEM (22):
- system_assets
- system_automations
- system_backups (🗑️ למחיקה)
- system_calendar_events
- system_call_analyses
- system_campaigns
- system_content_items
- system_field_agents
- system_forms
- system_invoices
- system_lead_activities
- system_lead_custom_field_definitions
- system_lead_handovers
- system_leads
- system_partners
- system_pipeline_stages
- system_portal_approvals
- system_portal_tasks
- system_students
- system_support_tickets
- system_tasks
- system_webhook_logs

### CLIENT (14):
- client_approvals
- client_clients
- client_document_files
- client_documents
- client_feedbacks
- client_internal_notes
- client_portal_content
- client_portal_invites
- client_portal_users
- client_profiles
- client_service_tiers
- client_sessions
- client_shared_files
- client_tasks

### OPERATIONS (5):
- operations_inventory
- operations_items
- operations_projects
- operations_suppliers
- operations_work_orders

### MISRAD (45):
- misrad_activity_logs
- misrad_ai_liability_risks
- misrad_ai_tasks
- misrad_assigned_forms
- misrad_calendar_sync_log
- misrad_client_actions
- misrad_client_agreements
- misrad_client_assets
- misrad_client_deliverables
- misrad_client_handoffs
- misrad_client_transformations
- misrad_clients
- misrad_cycle_assets
- misrad_cycle_tasks
- misrad_cycles
- misrad_emails
- misrad_feature_requests
- misrad_feedback_items
- misrad_form_fields
- misrad_form_responses
- misrad_form_steps
- misrad_form_templates (🗑️ למחיקה)
- misrad_group_events
- misrad_integrations
- misrad_invoices
- misrad_journey_stages
- misrad_meeting_analysis_results
- misrad_meeting_files
- misrad_meetings
- misrad_message_attachments
- misrad_messages
- misrad_metric_history
- misrad_milestones
- misrad_module_settings
- misrad_notifications
- misrad_opportunities
- misrad_permissions
- misrad_roi_records
- misrad_roles
- misrad_stakeholders
- misrad_success_goals
- misrad_support_tickets
- misrad_workflow_blueprints
- misrad_workflow_items
- misrad_workflow_stages

### GLOBAL (20):
- activity_logs
- app_updates
- connect_marketplace_listings
- customer_accounts
- device_pairing_tokens
- impersonation_sessions
- integration_credentials
- integration_status
- navigation_menu
- notifications
- oauth_tokens
- partners
- profiles (✅ קיים)
- team_comments
- team_member_clients
- user_update_views
- web_push_subscriptions
- webhook_configs
- work_listings

### CORE (2):
- core_system_settings (✅ קיים)
- global_system_metrics

### ORGANIZATION (2):
- organization_users (✅ קיים)
- organizations (✅ קיים)

</details>

---

## 🎯 מסקנה

**Production DB שלנו מכיל 6 מודולי CRM מלאים:**
1. ✅ Nexus - ניהול צוות ושעות
2. ✅ Social - ניהול רשתות חברתיות
3. ✅ System - CRM ולידים
4. ✅ Client - ניהול לקוחות
5. ✅ Operations - ניהול מלאי ופרויקטים
6. ✅ Misrad - ניהול פרויקטים מתקדם

**הסכימה הנוכחית שלנו חלקית וחסרים בה רוב המודולים!**

**לכן: אסור לנו לגעת ב-Production עד שנשלב את הסכימה המלאה.**

---

## 📁 קבצים שנוצרו

1. `prisma/schema.prod-pulled.prisma` - הסכימה המלאה מ-Production (179 models)
2. `docs/SCHEMA_ANALYSIS_REPORT.json` - ניתוח מפורט בפורמט JSON
3. `docs/PRODUCTION_SCHEMA_ANALYSIS_REPORT.md` - דו"ח זה

---

**עודכן:** {{ now }}  
**סטטוס:** 🛑 **MIGRATION STOPPED** - ממתין להחלטה
