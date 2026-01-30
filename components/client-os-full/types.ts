
export enum HealthStatus {
  CRITICAL = 'CRITICAL', // Red
  AT_RISK = 'AT_RISK',   // Orange
  STABLE = 'STABLE',     // Blue
  THRIVING = 'THRIVING'  // Green/Purple
}

export enum Sentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  ANXIOUS = 'ANXIOUS'
}

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  LEAD = 'LEAD',
  ARCHIVED = 'ARCHIVED',
  LOST = 'LOST',
  CHURNED = 'CHURNED' 
}

export enum ClientType {
  RETAINER = 'RETAINER',
  PROJECT = 'PROJECT',
  HOURLY = 'HOURLY'
}

export interface Milestone {
  id: string;
  label: string;
  isCompleted: boolean;
  required: boolean;
}

export interface JourneyStage {
  id: string;
  name: string;
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING';
  date?: string;
  milestones: Milestone[];
  completionPercentage?: number;
}

export interface Opportunity {
  id: string;
  title: string;
  value: number;
  matchScore: number;
  status: 'NEW' | 'PROPOSED' | 'CLOSED';
}

export interface MetricHistory {
  date: string;
  value: number;
}

export interface SuccessGoal {
  id: string;
  title: string;
  metricCurrent: number;
  metricTarget: number;
  unit: string;
  deadline: string;
  status: 'IN_PROGRESS' | 'ACHIEVED' | 'AT_RISK';
  lastUpdated: string;
  history?: MetricHistory[];
  aiForecast?: string;
}

export interface UpsellItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: 'HOURS' | 'SPEED' | 'ADDON' | 'CONSULTING';
  isPopular?: boolean;
}

export interface HealthBreakdown {
  financial: number;
  engagement: number;
  sentiment: number;
}

export interface EngagementMetrics {
  daysSinceLastLogin: number;
  unopenedEmails: number;
  lastReportDownloadDate: string | null;
  lastReportName?: string;
  silentChurnDetected: boolean;
}

export interface ClientAction {
  id: string;
  title: string;
  description: string;
  type: 'APPROVAL' | 'UPLOAD' | 'SIGNATURE' | 'FORM' | 'FEEDBACK';
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  dueDate: string;
  isBlocking: boolean;
  lastReminderSent?: string;
}

export interface AssignedForm {
  id: string;
  templateId: string;
  title: string;
  status: 'SENT' | 'OPENED' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number;
  dateSent: string;
  lastActivity?: string;
}

export interface FeedbackItem {
  id: string;
  clientId: string;
  clientName: string;
  score: number;
  comment: string;
  date: string;
  keywords: string[];
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  source: 'EMAIL_SURVEY' | 'PLATFORM_POPUP' | 'WHATSAPP_BOT' | 'EXIT_INTERVIEW' | 'PORTAL_FRICTION';
}

export interface ClientHandoff {
  salesRep: string;
  handoffDate: string;
  keyPromises: string[];
  mainPainPoint: string;
  successDefinition30Days: string;
  notes: string;
}

export interface ROIRecord {
  id: string;
  date: string;
  value: number; 
  description: string;
  category: 'REVENUE_LIFT' | 'COST_SAVING' | 'EFFICIENCY' | 'REFUND';
}

export interface ClientAsset {
    id: string;
    name: string;
    type: 'PDF' | 'IMAGE' | 'LINK' | 'FIGMA' | 'DOC';
    url: string;
    category: 'BRANDING' | 'LEGAL' | 'INPUT' | 'STRATEGY';
    uploadedBy: 'CLIENT' | 'AGENCY';
    date: string;
}

export interface ClientDeliverable {
    id: string;
    title: string;
    description: string;
    type: 'CAMPAIGN' | 'REPORT' | 'DESIGN' | 'STRATEGY' | 'DEV';
    thumbnailUrl?: string;
    status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED';
    date: string;
    tags: string[];
}

export interface TransformationState {
    date: string;
    mediaType: 'VIDEO' | 'IMAGE' | 'TEXT';
    mediaUrl?: string;
    description: string;
    emotionalState: string;
    quote?: string;
}

export interface ClientTransformation {
    id: string;
    title: string;
    before: TransformationState;
    after: TransformationState;
    metrics?: string;
    isPublished: boolean;
}

export type StakeholderRole = 'CHAMPION' | 'DECISION_MAKER' | 'INFLUENCER' | 'BLOCKER' | 'GATEKEEPER' | 'USER';

export interface Stakeholder {
    id: string;
    name: string;
    jobTitle: string; 
    nexusRole: StakeholderRole;
    influence: number;
    sentiment: number;
    lastContact: string;
    email?: string;
    avatarUrl?: string;
    notes: string;
}

export interface ScheduledAutomation {
    id: string;
    type: 'EMAIL_SUMMARY' | 'TASK_REMINDER' | 'CHECK_IN' | 'MEETING_INVITE';
    title: string;
    scheduledFor: string;
    status: 'PENDING' | 'SENT' | 'CANCELLED';
    recipient: string;
}

export interface AutomationSequence {
    id: string;
    name: string;
    trigger: 'POST_MEETING' | 'NO_CONTACT' | 'TASK_OVERDUE';
    status: 'ACTIVE' | 'PAUSED';
    nextActionDate: string;
    description: string;
}

export type RSVPStatus = 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'WAITLIST';

export interface EventAttendee {
    name: string;
    role: string;
    company: string;
    status: RSVPStatus;
    avatarUrl?: string;
}

export interface GroupEvent {
    id: string;
    title: string;
    type: 'WEBINAR' | 'WORKSHOP' | 'MASTERCLASS';
    date: string;
    targetSegment: string;
    attendeesCount: number;
    attendees: EventAttendee[];
    link: string;
    status: 'UPCOMING' | 'COMPLETED';
}

export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  clientId?: string;
  tags: string[];
  avatarUrl?: string;
}

export interface Invoice {
    id: string;
    number: string;
    amount: number;
    date: string;
    dueDate: string;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
    downloadUrl: string;
}

export interface ClientAgreement {
    id: string;
    title: string;
    type: 'MSA' | 'SOW' | 'NDA' | 'ADDENDUM';
    signedDate: string;
    expiryDate?: string;
    status: 'ACTIVE' | 'EXPIRED';
    fileUrl: string;
}

export enum CycleStatus {
  RECRUITING = 'RECRUITING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Cycle {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  clientIds: string[];
  sharedTasks: ClientAction[];
  sharedAssets: ClientAsset[];
  groupLinks: {
    whatsapp?: string;
    slack?: string;
    zoom?: string;
  };
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  employeeCount: number;
  logoInitials: string;
  healthScore: number;
  healthBreakdown: HealthBreakdown;
  healthStatus: HealthStatus;
  status: ClientStatus;
  type: ClientType;
  tags: string[];
  engagementMetrics: EngagementMetrics;
  pendingActions: ClientAction[];
  assignedForms: AssignedForm[];
  successGoals: SuccessGoal[];
  monthlyRetainer: number;
  profitMargin: number;
  lifetimeValue: number;
  hoursLogged: number;
  internalHourlyRate: number;
  directExpenses: number;
  profitabilityVerdict: string;
  lastContact: string;
  nextRenewal: string;
  mainContact: string;
  mainContactRole: string;
  strengths: string[];
  weaknesses: string[];
  sentimentTrend: Sentiment[];
  journey: JourneyStage[];
  opportunities: Opportunity[];
  handoffData?: ClientHandoff;
  roiHistory: ROIRecord[];
  referralStatus: 'UNLOCKED' | 'LOCKED' | 'REDEEMED';
  assets: ClientAsset[];
  deliverables: ClientDeliverable[];
  transformations: ClientTransformation[];
  stakeholders: Stakeholder[];
  activeAutomations?: AutomationSequence[];
  scheduledQueue?: ScheduledAutomation[];
  cancellationDate?: string;
  cancellationReason?: string;
  cancellationNote?: string;
  invoices?: Invoice[];
  agreements?: ClientAgreement[];
  cycleId?: string;
}

export interface MeetingFile {
    name: string;
    url: string;
    type: 'PDF' | 'DOC' | 'IMG';
}

export interface Meeting {
  id: string;
  clientId: string;
  date: string;
  title: string;
  location: 'ZOOM' | 'FRONTAL' | 'PHONE';
  attendees: string[];
  transcript: string;
  summary?: string;
  aiAnalysis?: MeetingAnalysisResult;
  files?: MeetingFile[];
  recordingUrl?: string;
  manualNotes?: string;
}

export interface ActivityLog {
  id: string;
  clientId: string;
  type: 'EMAIL' | 'MEETING' | 'DELIVERABLE' | 'SYSTEM' | 'FINANCIAL' | 'STATUS_CHANGE';
  description: string;
  date: string;
  isRisk: boolean;
}

export interface AITask {
  id: string;
  task: string;
  deadline: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'COMPLETED';
}

export interface AILiabilityRisk {
  quote: string;
  context: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MeetingAnalysisResult {
  summary: string;
  sentimentScore: number;
  frictionKeywords: string[];
  objections: string[];
  compliments: string[];
  decisions: string[];
  agencyTasks: AITask[];
  clientTasks: AITask[];
  liabilityRisks: AILiabilityRisk[];
  intents?: string[];
  stories?: string[];
  slang?: string[];
  rating?: {
      professionalism: number;
      warmth: number;
      clarity: number;
  };
}

export type FieldType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'UPLOAD' | 'DATE' | 'CHECKBOX' | 'RADIO';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helperText?: string;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  steps: FormStep[];
  isActive: boolean;
  category: 'ONBOARDING' | 'FEEDBACK' | 'STRATEGY';
}

export type WorkflowItemType = 'MEETING_ZOOM' | 'MEETING_FRONTAL' | 'TASK_CLIENT' | 'TASK_AGENCY' | 'FORM_SEND' | 'CONTENT_DELIVERY';

export interface WorkflowItem {
  id: string;
  type: WorkflowItemType;
  title: string;
  description: string;
  isAutomated: boolean;
  assetLink?: string;
}

export interface WorkflowStage {
  id: string;
  title: string;
  duration: string;
  items: WorkflowItem[];
}

export interface WorkflowBlueprint {
  id: string;
  name: string;
  description: string;
  totalDuration: string;
  stages: WorkflowStage[];
  tags: string[];
}

export type NotificationType = 'ALERT' | 'MESSAGE' | 'SUCCESS' | 'TASK' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
  clientId?: string;
}
