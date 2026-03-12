# MIGRATION_BLUEPRINT

> Planning-only artifacts for Client merge into MISRAD AI.
> No runtime code changes. No deletions.

## Scope
- Reverse-engineered DB schema (Prisma models + enums) for Client
- Refactoring Plan for splitting large files in the monorepo (nexus/social/system)
- Supabase SQL migration output (separate file)

## Naming & multi-tenancy conventions
- All Client tables: `misrad_*`
- Every table includes: `organization_id` (uuid)
- Any record belonging to a specific client also includes: `client_id` (uuid) FK -> `misrad_clients.id`
- Primary keys: `id uuid`

## Sources scanned
- `Downloads/client-os/types.ts`
- `Downloads/client-os/constants.ts`
- `Downloads/client-os/components/*` (EmailCenter, FormsManager, WorkflowBuilder, Meetings, ClientView, ClientPortal)

---

# 1) Reverse-engineered Prisma schema (Client)

## 1.1 Enums
```prisma
enum MisradHealthStatus {
  CRITICAL
  AT_RISK
  STABLE
  THRIVING
}

enum MisradSentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
  ANXIOUS
}

enum MisradClientStatus {
  ACTIVE
  LEAD
  ARCHIVED
  LOST
  CHURNED
}

enum MisradClientType {
  RETAINER
  PROJECT
  HOURLY
}

enum MisradJourneyStageStatus {
  COMPLETED
  ACTIVE
  PENDING
}

enum MisradOpportunityStatus {
  NEW
  PROPOSED
  CLOSED
}

enum MisradSuccessGoalStatus {
  IN_PROGRESS
  ACHIEVED
  AT_RISK
}

enum MisradClientActionType {
  APPROVAL
  UPLOAD
  SIGNATURE
  FORM
  FEEDBACK
}

enum MisradClientActionStatus {
  PENDING
  COMPLETED
  OVERDUE
}

enum MisradAssignedFormStatus {
  SENT
  OPENED
  IN_PROGRESS
  COMPLETED
}

enum MisradFeedbackSentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

enum MisradFeedbackSource {
  EMAIL_SURVEY
  PLATFORM_POPUP
  WHATSAPP_BOT
  EXIT_INTERVIEW
  PORTAL_FRICTION
}

enum MisradRoiCategory {
  REVENUE_LIFT
  COST_SAVING
  EFFICIENCY
  REFUND
}

enum MisradAssetType {
  PDF
  IMAGE
  LINK
  FIGMA
  DOC
}

enum MisradAssetCategory {
  BRANDING
  LEGAL
  INPUT
  STRATEGY
}

enum MisradUploadedBy {
  CLIENT
  AGENCY
}

enum MisradDeliverableType {
  CAMPAIGN
  REPORT
  DESIGN
  STRATEGY
  DEV
}

enum MisradDeliverableStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  PUBLISHED
}

enum MisradTransformationMediaType {
  VIDEO
  IMAGE
  TEXT
}

enum MisradStakeholderRole {
  CHAMPION
  DECISION_MAKER
  INFLUENCER
  BLOCKER
  GATEKEEPER
  USER
}

enum MisradScheduledAutomationType {
  EMAIL_SUMMARY
  TASK_REMINDER
  CHECK_IN
  MEETING_INVITE
}

enum MisradScheduledAutomationStatus {
  PENDING
  SENT
  CANCELLED
}

enum MisradAutomationTrigger {
  POST_MEETING
  NO_CONTACT
  TASK_OVERDUE
}

enum MisradAutomationStatus {
  ACTIVE
  PAUSED
}

enum MisradRsvpStatus {
  CONFIRMED
  PENDING
  DECLINED
  WAITLIST
}

enum MisradGroupEventType {
  WEBINAR
  WORKSHOP
  MASTERCLASS
}

enum MisradGroupEventStatus {
  UPCOMING
  COMPLETED
}

enum MisradInvoiceStatus {
  PAID
  PENDING
  OVERDUE
}

enum MisradAgreementType {
  MSA
  SOW
  NDA
  ADDENDUM
}

enum MisradAgreementStatus {
  ACTIVE
  EXPIRED
}

enum MisradCycleStatus {
  RECRUITING
  ACTIVE
  COMPLETED
  CANCELLED
}

enum MisradMeetingLocation {
  ZOOM
  FRONTAL
  PHONE
}

enum MisradMeetingFileType {
  PDF
  DOC
  IMG
}

enum MisradActivityLogType {
  EMAIL
  MEETING
  DELIVERABLE
  SYSTEM
  FINANCIAL
  STATUS_CHANGE
}

enum MisradTaskPriority {
  HIGH
  NORMAL
  LOW
}

enum MisradTaskStatus {
  PENDING
  COMPLETED
}

enum MisradLiabilityRiskLevel {
  HIGH
  MEDIUM
  LOW
}

enum MisradFieldType {
  TEXT
  TEXTAREA
  SELECT
  UPLOAD
  DATE
  CHECKBOX
  RADIO
}

enum MisradFormCategory {
  ONBOARDING
  FEEDBACK
  STRATEGY
}

enum MisradWorkflowItemType {
  MEETING_ZOOM
  MEETING_FRONTAL
  TASK_CLIENT
  TASK_AGENCY
  FORM_SEND
  CONTENT_DELIVERY
}

enum MisradNotificationType {
  ALERT
  MESSAGE
  SUCCESS
  TASK
  SYSTEM
}
```

## 1.2 Models
### 1.2.1 Core: Clients + health/engagement

```prisma
model MisradClient {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid

  name            String
  industry        String
  employeeCount   Int
  logoInitials    String

  healthScore     Int
  healthStatus    MisradHealthStatus
  status          MisradClientStatus
  type            MisradClientType

  // from types.ts
  tags            String[]
  monthlyRetainer Int
  profitMargin    Int
  lifetimeValue   Int
  hoursLogged     Int
  internalHourlyRate Int
  directExpenses  Int
  profitabilityVerdict String

  lastContact     String
  nextRenewal     String
  mainContact     String
  mainContactRole String

  strengths       String[]
  weaknesses      String[]
  sentimentTrend  MisradSentiment[]

  referralStatus  String // UNLOCKED | LOCKED | REDEEMED (stored as string for forward compatibility)

  cancellationDate   String?
  cancellationReason String?
  cancellationNote   String?

  // optional relationship to cycles
  cycleId         String?  @db.Uuid

  // JSON blobs (kept as-is from UI structures)
  healthBreakdown   Json // {financial, engagement, sentiment}
  engagementMetrics Json // {daysSinceLastLogin, unopenedEmails, lastReportDownloadDate, lastReportName?, silentChurnDetected}

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  // relations
  journeyStages      MisradJourneyStage[]
  milestones         MisradMilestone[]
  opportunities      MisradOpportunity[]
  successGoals       MisradSuccessGoal[]
  metricHistory      MisradMetricHistory[]
  handoff            MisradClientHandoff?
  roiRecords         MisradRoiRecord[]
  actions            MisradClientAction[]
  assignedForms      MisradAssignedForm[]
  feedbackItems      MisradFeedbackItem[]

  @@map("misrad_clients")
  @@index([organization_id])
  @@index([cycleId])
}

model MisradJourneyStage {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  name            String
  status          MisradJourneyStageStatus
  date            String?
  completionPercentage Int?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)
  milestones      MisradMilestone[]

  @@map("misrad_journey_stages")
  @@index([organization_id])
  @@index([client_id])
}

model MisradMilestone {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  stage_id        String   @db.Uuid

  label           String
  isCompleted     Boolean
  required        Boolean

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient      @relation(fields: [client_id], references: [id], onDelete: Cascade)
  stage           MisradJourneyStage @relation(fields: [stage_id], references: [id], onDelete: Cascade)

  @@map("misrad_milestones")
  @@index([organization_id])
  @@index([client_id])
  @@index([stage_id])
}

model MisradOpportunity {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String
  value           Int
  matchScore      Int
  status          MisradOpportunityStatus

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_opportunities")
  @@index([organization_id])
  @@index([client_id])
}

model MisradSuccessGoal {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String
  metricCurrent   Float
  metricTarget    Float
  unit            String
  deadline        String
  status          MisradSuccessGoalStatus
  lastUpdated     String
  aiForecast      String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)
  history         MisradMetricHistory[]

  @@map("misrad_success_goals")
  @@index([organization_id])
  @@index([client_id])
}

model MisradMetricHistory {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  goal_id         String   @db.Uuid

  date            String
  value           Float

  created_at      DateTime @default(now())

  client          MisradClient      @relation(fields: [client_id], references: [id], onDelete: Cascade)
  goal            MisradSuccessGoal @relation(fields: [goal_id], references: [id], onDelete: Cascade)

  @@map("misrad_metric_history")
  @@index([organization_id])
  @@index([client_id])
  @@index([goal_id])
}

model MisradClientHandoff {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @unique @db.Uuid

  salesRep        String
  handoffDate     String
  keyPromises     String[]
  mainPainPoint   String
  successDefinition30Days String
  notes           String

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_client_handoffs")
  @@index([organization_id])
}

model MisradRoiRecord {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  date            String
  value           Float
  description     String
  category        MisradRoiCategory

  created_at      DateTime @default(now())

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_roi_records")
  @@index([organization_id])
  @@index([client_id])
  @@index([category])
}

model MisradClientAction {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String
  description     String
  type            MisradClientActionType
  status          MisradClientActionStatus
  dueDate         String
  isBlocking      Boolean
  lastReminderSent String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_client_actions")
  @@index([organization_id])
  @@index([client_id])
  @@index([status])
}

model MisradAssignedForm {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  templateId      String
  title           String
  status          MisradAssignedFormStatus
  progress        Int
  dateSent        String
  lastActivity    String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_assigned_forms")
  @@index([organization_id])
  @@index([client_id])
  @@index([templateId])
}

model MisradFeedbackItem {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  clientName      String
  score           Int
  comment         String
  date            String
  keywords        String[]
  sentiment       MisradFeedbackSentiment
  source          MisradFeedbackSource

  created_at      DateTime @default(now())

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_feedback_items")
  @@index([organization_id])
  @@index([client_id])
  @@index([source])
}
```

### 1.2.2 Assets / Deliverables / Transformations / Stakeholders

```prisma
model MisradClientAsset {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  name            String
  type            MisradAssetType
  url             String
  category        MisradAssetCategory
  uploadedBy      MisradUploadedBy
  date            String

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_client_assets")
  @@index([organization_id])
  @@index([client_id])
  @@index([category])
}

model MisradClientDeliverable {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String
  description     String
  type            MisradDeliverableType
  thumbnailUrl    String?
  status          MisradDeliverableStatus
  date            String
  tags            String[]

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_client_deliverables")
  @@index([organization_id])
  @@index([client_id])
  @@index([status])
}

model MisradClientTransformation {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String
  metrics         String?
  isPublished     Boolean

  // TransformationState (before/after) kept as JSON to avoid losing nested fields
  before          Json
  after           Json

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_client_transformations")
  @@index([organization_id])
  @@index([client_id])
  @@index([isPublished])
}

model MisradStakeholder {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  name            String
  jobTitle        String
  nexusRole       MisradStakeholderRole
  influence       Int
  sentiment       Int
  lastContact     String
  email           String?
  avatarUrl       String?
  notes           String

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_stakeholders")
  @@index([organization_id])
  @@index([client_id])
  @@index([nexusRole])
}
```

### 1.2.3 Meetings + AI analysis

```prisma
model MisradMeeting {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  date            String
  title           String
  location        MisradMeetingLocation
  attendees       String[]

  transcript      String
  summary         String?
  recordingUrl    String?
  manualNotes     String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)
  files           MisradMeetingFile[]
  analysis        MisradMeetingAnalysisResult?

  @@map("misrad_meetings")
  @@index([organization_id])
  @@index([client_id])
}

model MisradMeetingFile {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  meeting_id      String   @db.Uuid

  name            String
  url             String
  type            MisradMeetingFileType

  created_at      DateTime @default(now())

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)
  meeting         MisradMeeting @relation(fields: [meeting_id], references: [id], onDelete: Cascade)

  @@map("misrad_meeting_files")
  @@index([organization_id])
  @@index([client_id])
  @@index([meeting_id])
}

model MisradMeetingAnalysisResult {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  meeting_id      String   @unique @db.Uuid

  summary         String
  sentimentScore  Int

  frictionKeywords String[]
  objections      String[]
  compliments     String[]
  decisions       String[]

  intents         String[]
  stories         String[]
  slang           String[]

  // rating: { professionalism, warmth, clarity }
  rating          Json

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient  @relation(fields: [client_id], references: [id], onDelete: Cascade)
  meeting         MisradMeeting @relation(fields: [meeting_id], references: [id], onDelete: Cascade)

  aiTasks         MisradAiTask[]
  liabilityRisks  MisradAiLiabilityRisk[]

  @@map("misrad_meeting_analysis_results")
  @@index([organization_id])
  @@index([client_id])
}

model MisradAiTask {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  analysis_id     String   @db.Uuid

  // original UI splits tasks to agencyTasks/clientTasks.
  // we persist that via bucket.
  bucket          String // 'agency' | 'client'

  task            String
  deadline        String
  priority        MisradTaskPriority
  status          MisradTaskStatus

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  analysis        MisradMeetingAnalysisResult @relation(fields: [analysis_id], references: [id], onDelete: Cascade)

  @@map("misrad_ai_tasks")
  @@index([organization_id])
  @@index([client_id])
  @@index([analysis_id])
  @@index([bucket])
}

model MisradAiLiabilityRisk {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  analysis_id     String   @db.Uuid

  quote           String
  context         String
  riskLevel       MisradLiabilityRiskLevel

  created_at      DateTime @default(now())

  analysis        MisradMeetingAnalysisResult @relation(fields: [analysis_id], references: [id], onDelete: Cascade)

  @@map("misrad_ai_liability_risks")
  @@index([organization_id])
  @@index([client_id])
  @@index([analysis_id])
  @@index([riskLevel])
}
```

### 1.2.4 Emails + invoices + agreements

```prisma
model MisradEmail {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String?  @db.Uuid

  sender          String
  senderEmail     String
  subject         String
  snippet         String
  body            String
  timestamp       String
  isRead          Boolean
  tags            String[]
  avatarUrl       String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient? @relation(fields: [client_id], references: [id], onDelete: SetNull)

  @@map("misrad_emails")
  @@index([organization_id])
  @@index([client_id])
  @@index([isRead])
}

model MisradInvoice {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  number          String
  amount          Int
  date            String
  dueDate         String
  status          MisradInvoiceStatus
  downloadUrl     String

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_invoices")
  @@index([organization_id])
  @@index([client_id])
  @@index([status])
}

model MisradClientAgreement {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String
  type            MisradAgreementType
  signedDate      String
  expiryDate      String?
  status          MisradAgreementStatus
  fileUrl         String

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_client_agreements")
  @@index([organization_id])
  @@index([client_id])
  @@index([status])
}
```

### 1.2.5 Cycles + group events

```prisma
model MisradCycle {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid

  name            String
  description     String
  startDate       String
  endDate         String
  status          MisradCycleStatus

  // { whatsapp?, slack?, zoom? }
  groupLinks      Json

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  clients         MisradClient[]
  sharedTasks     MisradCycleTask[]
  sharedAssets    MisradCycleAsset[]
  groupEvents     MisradGroupEvent[]

  @@map("misrad_cycles")
  @@index([organization_id])
  @@index([status])
}

model MisradCycleTask {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  cycle_id        String   @db.Uuid

  title           String
  description     String
  type            MisradClientActionType
  status          MisradClientActionStatus
  dueDate         String
  isBlocking      Boolean
  lastReminderSent String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  cycle           MisradCycle @relation(fields: [cycle_id], references: [id], onDelete: Cascade)

  @@map("misrad_cycle_tasks")
  @@index([organization_id])
  @@index([cycle_id])
}

model MisradCycleAsset {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  cycle_id        String   @db.Uuid

  name            String
  type            MisradAssetType
  url             String
  category        MisradAssetCategory
  uploadedBy      MisradUploadedBy
  date            String

  created_at      DateTime @default(now())

  cycle           MisradCycle @relation(fields: [cycle_id], references: [id], onDelete: Cascade)

  @@map("misrad_cycle_assets")
  @@index([organization_id])
  @@index([cycle_id])
}

model MisradGroupEvent {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  cycle_id        String?  @db.Uuid

  title           String
  type            MisradGroupEventType
  date            String
  targetSegment   String
  attendeesCount  Int
  link            String
  status          MisradGroupEventStatus

  attendees       Json // EventAttendee[]

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  cycle           MisradCycle? @relation(fields: [cycle_id], references: [id], onDelete: SetNull)

  @@map("misrad_group_events")
  @@index([organization_id])
  @@index([cycle_id])
  @@index([status])
}
```

### 1.2.6 Workflow Builder

```prisma
model MisradWorkflowBlueprint {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid

  name            String
  description     String
  totalDuration   String
  tags            String[]

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  stages          MisradWorkflowStage[]

  @@map("misrad_workflow_blueprints")
  @@index([organization_id])
}

model MisradWorkflowStage {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  blueprint_id    String   @db.Uuid

  title           String
  duration        String

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  blueprint       MisradWorkflowBlueprint @relation(fields: [blueprint_id], references: [id], onDelete: Cascade)
  items           MisradWorkflowItem[]

  @@map("misrad_workflow_stages")
  @@index([organization_id])
  @@index([blueprint_id])
}

model MisradWorkflowItem {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  stage_id        String   @db.Uuid

  type            MisradWorkflowItemType
  title           String
  description     String
  isAutomated     Boolean
  assetLink       String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  stage           MisradWorkflowStage @relation(fields: [stage_id], references: [id], onDelete: Cascade)

  @@map("misrad_workflow_items")
  @@index([organization_id])
  @@index([stage_id])
}
```

### 1.2.7 Forms Manager

```prisma
model MisradFormTemplate {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid

  title           String
  description     String
  isActive        Boolean
  category        MisradFormCategory

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  steps           MisradFormStep[]

  @@map("misrad_form_templates")
  @@index([organization_id])
  @@index([category])
}

model MisradFormStep {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  template_id     String   @db.Uuid

  title           String
  description     String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  template        MisradFormTemplate @relation(fields: [template_id], references: [id], onDelete: Cascade)
  fields          MisradFormField[]

  @@map("misrad_form_steps")
  @@index([organization_id])
  @@index([template_id])
}

model MisradFormField {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  step_id         String   @db.Uuid

  label           String
  type            MisradFieldType
  required        Boolean
  options         String[]
  placeholder     String?
  helperText      String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  step            MisradFormStep @relation(fields: [step_id], references: [id], onDelete: Cascade)

  @@map("misrad_form_fields")
  @@index([organization_id])
  @@index([step_id])
}

// Added for real DB usage (not explicitly in client-os types.ts)
model MisradFormResponse {
  id               String   @id @default(uuid()) @db.Uuid
  organization_id  String   @db.Uuid
  client_id        String   @db.Uuid

  template_id      String   @db.Uuid
  assigned_form_id String?  @db.Uuid

  status           MisradAssignedFormStatus
  progress         Int
  answers          Json

  submitted_at     DateTime?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  client           MisradClient       @relation(fields: [client_id], references: [id], onDelete: Cascade)
  template         MisradFormTemplate @relation(fields: [template_id], references: [id], onDelete: Cascade)

  @@map("misrad_form_responses")
  @@index([organization_id])
  @@index([client_id])
  @@index([template_id])
  @@index([assigned_form_id])
}
```

### 1.2.8 Notifications + activity log + module settings

```prisma
model MisradNotification {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String?  @db.Uuid

  type            MisradNotificationType
  title           String
  message         String
  timestamp       String
  isRead          Boolean
  link            String?

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient? @relation(fields: [client_id], references: [id], onDelete: SetNull)

  @@map("misrad_notifications")
  @@index([organization_id])
  @@index([client_id])
  @@index([isRead])
}

model MisradActivityLog {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  type            MisradActivityLogType
  description     String
  date            String
  isRisk          Boolean

  created_at      DateTime @default(now())

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)

  @@map("misrad_activity_logs")
  @@index([organization_id])
  @@index([client_id])
  @@index([type])
  @@index([isRisk])
}

model MisradModuleSettings {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid

  cycles       Boolean
  intelligence Boolean
  portals      Boolean
  workflows    Boolean
  feedback     Boolean

  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@map("misrad_module_settings")
  @@unique([organization_id])
}
```

### 1.2.9 OPTIONAL: Chat schema (requested)

Client source includes EmailCenter + ActivityLog but no formal chat thread model.
If you want true chat threads in DB, add this minimal layer:

```prisma
model MisradConversation {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid

  title           String?
  channel         String // whatsapp/sms/email/internal

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  client          MisradClient @relation(fields: [client_id], references: [id], onDelete: Cascade)
  messages        MisradConversationMessage[]

  @@map("misrad_conversations")
  @@index([organization_id])
  @@index([client_id])
}

model MisradConversationMessage {
  id              String   @id @default(uuid()) @db.Uuid
  organization_id String   @db.Uuid
  client_id       String   @db.Uuid
  conversation_id String   @db.Uuid

  direction       String // inbound/outbound
  sender          String?
  senderRef       String? // e.g. clerk_user_id or external identifier
  body            String
  sentAt          DateTime
  metadata        Json?

  created_at      DateTime @default(now())

  conversation    MisradConversation @relation(fields: [conversation_id], references: [id], onDelete: Cascade)

  @@map("misrad_conversation_messages")
  @@index([organization_id])
  @@index([client_id])
  @@index([conversation_id])
  @@index([sentAt])
}
```

---

# 2) Refactoring Plan (files to split)

## 2.1 Principles
- Extract reusable UI pieces to `components/shared/*`
- Extract reusable hooks to `hooks/*` or `components/**/hooks/*` (depending on feature ownership)
- Keep behavior unchanged (pure refactor)

## 2.2 Candidate files (initial scan)
Below is a concrete, non-breaking split plan. **Do not perform these moves yet**.

### System OS (`components/system/*`)

#### `components/system/SystemApp.tsx` (very large, app composition)
- **Extract: Boot screen**
  - **From**: `SystemApp.tsx` (`SystemBootScreen`)
  - **To**: `components/system/components/SystemBootScreen.tsx`
- **Extract: goldenPayload builder**
  - **From**: `SystemApp.tsx` (`goldenPayload` useMemo)
  - **To**: `components/system/utils/goldenPayload.ts`
  - **API**: `buildGoldenPayloadFromLead(lead: Lead): GoldenPayload`
- **Extract: keyboard shortcut handler**
  - **From**: `SystemApp.tsx` (Cmd/Ctrl+K)
  - **To**: `components/system/hooks/useCommandPaletteHotkey.ts`
- **Extract: session boot flag helper**
  - **From**: `SystemApp.tsx` (sessionStorage `nexus_booted`)
  - **To**: `components/system/utils/bootState.ts`

#### `components/system/CommunicationView.tsx` (unified inbox + dialer)
- **Extract: chat list transformation**
  - **From**: `CommunicationView.tsx` (`chatList` useMemo)
  - **To**: `components/system/utils/chatList.ts`
  - **API**: `buildChatList(leads, { searchTerm, channelFilter }): ChatListItem[]`
- **Extract: message mapping**
  - **From**: `CommunicationView.tsx` (`activeMessages` useMemo)
  - **To**: `components/system/utils/messageMapping.ts`
  - **API**: `mapLeadActivitiesToMessages(lead): MessageVM[]`
- **Extract: AI drafting**
  - **From**: `CommunicationView.tsx` (`handleAIDraft`)
  - **To**: `components/system/services/aiDrafting.ts`
  - **Note**: keep current placeholder behavior; later wire to Gemini.
- **Extract: channel filter UI**
  - **From**: `CommunicationView.tsx` (tab header + filters)
  - **To**: `components/system/components/communication/InboxHeader.tsx`
- **Extract: conversation pane**
  - **To**: `components/system/components/communication/ConversationPane.tsx`
- **Extract: dialer pane**
  - **To**: `components/system/components/communication/DialerPane.tsx`

#### Other large System OS candidates (scan-based)
- **`components/system/AutomationsView.tsx`**
  - Extract “AutomationCard”, “AutomationEditor”, “AutomationRunLog” into `components/system/components/automations/*`
  - Extract any mapping/normalization utils into `components/system/utils/automations/*`
- **`components/system/KnowledgeBaseView.tsx`**
  - Extract markdown/article renderer and search index utils.
- **`components/system/SettingsView.tsx`**
  - Extract sections into `components/system/components/settings/*`

### Social OS (`components/social/*`)

#### `components/social/LandingPage.tsx` (marketing page, huge)
- **Extract: content loading**
  - **From**: `LandingPage.tsx` (`loadContent`)
  - **To**: `components/social/hooks/useLandingContent.ts`
- **Extract: accessibility widget**
  - **From**: `LandingPage.tsx` (font size + high-contrast state)
  - **To**: `components/social/components/AccessibilityWidget.tsx`
- **Extract: sections**
  - **To**:
    - `components/social/components/landing/HeroSection.tsx`
    - `components/social/components/landing/FeaturesSection.tsx`
    - `components/social/components/landing/TestimonialsSection.tsx`
    - `components/social/components/landing/FaqSection.tsx`
    - `components/social/components/landing/FooterSection.tsx`

### Shared layout (`components/layout/*` + `components/shared/*`)

#### `components/layout/MobileMenu.tsx` (very large, lots of UI branches)
- **Extract: menu grids**
  - **To**:
    - `components/layout/mobile/PrimaryNavGrid.tsx`
    - `components/layout/mobile/SecondaryNavGrid.tsx`
- **Extract: plus/fab overlay**
  - **To**: `components/layout/mobile/PlusActionOverlay.tsx`
- **Extract: external systems cards**
  - **To**: `components/layout/mobile/ExternalSystemsGrid.tsx`

#### `components/shared/RoomSwitcher.tsx`
- **Extract: entitlement fetching**
  - **To**: `components/shared/hooks/useRoomEntitlements.ts`
  - Keep `RoomSwitcher` as a pure UI wrapper.
- **Extract: locked-room modal**
  - **To**: `components/shared/rooms/LockedRoomModal.tsx`

#### `components/shared/NexusHeader.tsx` + `components/layout/Header.tsx`
- **Goal**: converge duplicated “header primitives”.
- **Plan**:
  - Create `components/shared/header/HeaderShell.tsx` (logo slot + actions slot)
  - Create `components/shared/header/UserMenu.tsx`
  - Keep existing exports for backward compatibility and re-export composition.

---

# 3) SQL Migration Output

Generated in: `supabase-final-migration.sql`

## 3.1 Execution notes
### Safety / non-breaking
- This migration **only creates** `misrad_*` tables and types.
- It does **not** drop or modify existing non-Client-OS tables.
- It is designed to be **re-runnable** (uses `if not exists` patterns).

### How to run (after approval)
- Run in Supabase SQL editor as a single transaction.
- Verify the database has `pgcrypto` enabled (migration includes it).

### `updated_at`
- Tables that include `updated_at` require a trigger to behave like Prisma `@updatedAt`.
- The SQL migration includes a shared trigger function and attaches it to every table that has `updated_at`.

### Multi-tenancy expectations
- `organization_id` is required on every table.
- Any record attached to a single client includes `client_id` with FK to `misrad_clients(id)`.

### Optional Chat
- The `client-os` source does not contain a formal chat entity; it has emails + activity log.
- If you want “real chat”, use the **OPTIONAL** models in section 1.2.9 and extend the SQL accordingly (not included by default).
