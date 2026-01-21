
import { LucideIcon } from 'lucide-react';

export type PermissionId = 
    | 'view_financials' 
    | 'manage_team'      // Includes inviting employees
    | 'manage_system' 
    | 'delete_data' 
    | 'view_intelligence' 
    | 'view_crm'       // Clients & Leads access
    | 'view_assets';   // Files & Credentials access

export type ModuleId = 'crm' | 'finance' | 'ai' | 'team' | 'content' | 'assets' | 'operations';

export type SystemScreenStatus = 'active' | 'maintenance' | 'hidden';

export interface ScreenDefinition {
    id: string;
    label: string;
    description?: string;
    category: 'main' | 'settings' | 'sub-feature';
}

export interface RoleDefinition {
    id?: string;
    name: string;
    permissions: PermissionId[];
    isSystem?: boolean;
}

export interface OrganizationProfile {
    name: string;
    logo: string; // Base64 or URL
    primaryColor: string; // Hex for accent
    enabledModules: ModuleId[]; // NEW: Controls global visibility per tenant
    systemFlags?: Record<string, SystemScreenStatus>; // NEW: Global overrides
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum Status {
  BACKLOG = 'Backlog',
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  WAITING = 'Waiting for Review',
  DONE = 'Done',
  CANCELED = 'Canceled'
}

export enum LeadStatus {
    NEW = 'New',
    QUALIFIED = 'Qualified',
    MEETING = 'Meeting',
    NEGOTIATION = 'Negotiation',
    WON = 'Won',
    LOST = 'Lost'
}

export interface User {
    id: string;
    name: string;
    role: string;
    department?: string; // NEW: Controls visibility scope
    avatar: string;
    online: boolean;
    capacity: number;
    email?: string;
    phone?: string;
    location?: string;
    bio?: string; 
    
    // Payroll Info
    paymentType?: 'hourly' | 'monthly'; 
    hourlyRate?: number; 
    monthlySalary?: number; 
    
    // Incentives & Gamification
    commissionPct?: number; // % from sales (0-100)
    bonusPerTask?: number; // Fixed amount per completed task
    accumulatedBonus?: number; // NEW: Approved one-off bonuses (from AI recommendations)
    
    // Gamification State (NEW)
    streakDays?: number; // How many days in a row they hit targets
    weeklyScore?: number; // Calculated efficiency score
    pendingReward?: { // AI Suggestion
        reason: string;
        suggestedBonus: number;
        type: 'performance' | 'sales' | 'consistency';
    };

    targets?: {
        tasksMonth: number;
        leadsMonth?: number;
    };
    notificationPreferences?: NotificationPreferences;
    uiPreferences?: UIPreferences;
    twoFactorEnabled?: boolean;
    isSuperAdmin?: boolean; // NEW: Grants access to SaaS Console
    isTenantAdmin?: boolean;
    managerId?: string | null; // NEW: Hierarchy - ID of the user's manager
    managedDepartment?: string | null; // NEW: Department this user manages (if they are a department manager)
    tenantId?: string | null; // NEW: Tenant ID for multi-tenant support
    billingInfo?: {
        last4Digits: string;
        cardType: string;
        nextBillingDate: string;
        planName: string;
    };
}

export interface NotificationPreferences {
    emailNewTask: boolean;
    browserPush: boolean;
    morningBrief: boolean;
    soundEffects: boolean;
    marketing: boolean;
}

export interface UIPreferences {
    showHebrewCalendar?: boolean;
    showHebrewDates?: boolean;
}

export interface Attachment {
    name: string;
    type: 'image' | 'video' | 'file';
    url: string;
}

export interface Message {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
    type?: 'user' | 'system' | 'guest';
    attachment?: Attachment;
}

export interface TaskContributor {
    userId: string;
    timeSpent: number; // Seconds
}

export interface TaskCompletionDetails {
    actualTime: number; // Final seconds recorded (Total)
    contributors?: TaskContributor[]; // Breakdown per user
    originalEstimate?: number;
    completedAt: string;
    snoozeCount: number;
    delayDays: number; // Days late
    rating?: number; // 1-5
    reflection?: string; // Lessons learned
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: Priority;
    assigneeIds?: string[];
    assigneeId?: string; // Legacy support
    creatorId?: string;
    tags: string[];
    createdAt: string;
    dueDate?: string;
    dueTime?: string; // HH:mm format
    timeSpent: number;
    estimatedTime?: number; // In minutes
    approvalStatus?: 'pending' | 'approved' | 'rejected'; // New Approval Flow
    isTimerRunning: boolean;
    messages: Message[];
    clientId?: string;
    isPrivate?: boolean;
    audioUrl?: string;
    snoozeCount?: number;
    isFocus?: boolean; // New field: Is selected for today's focus
    completionDetails?: TaskCompletionDetails; // New Field for Post Mortem
    department?: string;
}

export interface Client {
    id: string;
    name: string;
    companyName: string;
    avatar: string;
    package: string;
    status: 'Active' | 'Onboarding' | 'Paused';
    contactPerson: string;
    email: string;
    phone: string;
    joinedAt: string;
    assetsFolderUrl?: string;
    source?: string; // NEW: Referral source / Platform
}

export interface Invoice {
    id: string;
    number: string;
    date: string;
    amount: number;
    currency: 'ILS' | 'USD';
    status: 'Paid' | 'Pending' | 'Overdue';
    url: string;
    clientId?: string; // Linked to Client
    userId?: string;   // Linked to Internal User (SaaS billing)
    description: string;
}

export interface SalesActivity {
    id: string;
    leadId: string;
    type: 'call' | 'email' | 'meeting' | 'note';
    description: string;
    timestamp: string;
    performedBy: string;
}

export interface Lead {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    status: LeadStatus;
    value: number;
    source: string;
    createdAt: string;
    lastContact: string;
    interestedIn?: string;
    probability?: number; // 0-100
    expectedCloseDate?: string;
    activities?: SalesActivity[];
}

export interface Campaign {
    id: string;
    name: string;
    platform: string;
    status: 'active' | 'paused' | 'draft';
    budget: number;
    spent: number;
    leads: number;
    cpl: number;
    roas: number;
    impressions: number;
}

export interface Asset {
    id: string;
    title: string;
    type: 'file' | 'link' | 'credential';
    value: string;
    tags: string[];
    clientId?: string;
}

export type TemplateCategory = 'onboarding' | 'general' | 'content';
export type TemplateActionType = 'task' | 'email' | 'meeting' | 'doc';

export interface TemplateItem {
    title: string;
    priority: Priority;
    targetRole: string;
    tags: string[];
    daysDueOffset: number;
    actionType?: TemplateActionType; // New: What kind of step is this?
    description?: string; // New: Default description for the task
}

export interface Template {
    id: string;
    name: string;
    icon: string;
    category: TemplateCategory; // New: To filter onboarding vs others
    description?: string;
    items: TemplateItem[];
}

export interface WorkflowStage {
    id: string;
    name: string;
    color: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    color: string;
    modules: ModuleId[]; // Which modules/features this plan includes
    maxUsers?: number; // Maximum users allowed
    maxStorageGB?: number; // Storage limit (GB)
    maxClients?: number; // Maximum clients/companies
    maxTasks?: number; // Maximum tasks per month
    maxLeads?: number; // Maximum leads per month
    maxApiCalls?: number; // Maximum API calls per month
    maxIntegrations?: number; // Maximum external integrations
    maxDepartments?: number; // Maximum departments
    maxCustomFields?: number; // Maximum custom fields
    allowCustomBranding?: boolean; // Allow custom logo/colors
    allowApiAccess?: boolean; // Allow API access
    allowWebhooks?: boolean; // Allow webhook integrations
    allowExport?: boolean; // Allow data export
    allowAdvancedReports?: boolean; // Allow advanced reporting
    allowAiFeatures?: boolean; // Allow AI features (separate from AI module)
    allowPrioritySupport?: boolean; // Priority support access
    features?: string[]; // Additional feature descriptions
    limits?: Record<string, number | boolean>; // Flexible custom limits
}

export interface Notification {
    id: string;
    recipientId: string; // 'all' for system-wide, or specific user ID
    type: 'mention' | 'alert' | 'system' | 'info' | 'reward'; // Added 'reward'
    text: string;
    time: string;
    read: boolean;
    actorName?: string;
    actorAvatar?: string;
    taskId?: string;
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export interface TimeEntry {
    id: string;
    userId: string;
    startTime: string;
    endTime?: string;
    date: string;
    durationMinutes?: number;
    // Audit Trail Fields
    voidReason?: string; 
    voidedBy?: string;
    voidedAt?: string;
}

export interface MonthlyGoals {
    revenue: number;
    tasksCompletion: number;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    color?: string;
}

export interface IncomingCall {
    id: string;
    callerName: string;
    phoneNumber: string;
    company?: string;
    isClient: boolean;
}

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    modifiedAt: string;
    owner: string;
}

export interface AnalysisReport {
    id: string;
    date: string;
    query: string;
    summary: string;
    score: number;
    actionableSteps: string[];
    suggestedLinks?: { label: string; path: string }[]; // NEW: For navigation buttons
    mode: 'manager' | 'employee';
    employees?: {
        id: string;
        name: string;
        efficiency: number;
        workload: string;
        suggestion: string;
        outputTrend: string;
    }[];
    personalTasksAnalysis?: {
        completedCount: number;
        avgCompletionTime: string;
        focusArea: string;
    };
    revenueInsight?: string;
}

export interface AIAnalysisResult {
    title: string;
    description: string;
    priority: Priority;
    tags: string[];
}

export interface TaskCreationDefaults {
    title?: string;
    description?: string;
    priority?: Priority;
    status?: string; 
    assigneeId?: string;
    clientId?: string;
    tags?: string[];
    dueDate?: string; // New: Allow pre-filling date
}

export interface SupportDefaults {
    category?: 'Tech' | 'Account' | 'Billing' | 'Feature' | 'Other';
    subject?: string;
    message?: string;
}

export interface NavItem {
    label: string;
    path: string;
    icon: LucideIcon;
    moduleId?: ModuleId; // NEW: Link to feature flag
    screenId?: string; // NEW: Link to system flag
}

export type FeatureRequestType = 'feature' | 'bug' | 'improvement' | 'integration';
export type FeatureRequestStatus = 'pending' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'rejected';

export interface FeatureRequest {
    id: string;
    user_id: string;
    tenant_id?: string;
    title: string;
    description: string;
    type: FeatureRequestType;
    status: FeatureRequestStatus;
    priority: Priority;
    votes: string[]; 
    creatorId?: string; // Legacy field
    createdAt: string;
    updated_at?: string;
    assigned_to?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    completed_at?: string;
    admin_notes?: string;
    rejection_reason?: string;
    metadata?: Record<string, unknown>;
}

export type SupportTicketCategory = 'Tech' | 'Account' | 'Billing' | 'Feature';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
    id: string;
    user_id: string;
    tenant_id?: string;
    category: SupportTicketCategory;
    subject: string;
    message: string;
    ticket_number: string;
    status: SupportTicketStatus;
    priority: Priority;
    assigned_to?: string;
    resolved_by?: string;
    created_at: string;
    updated_at?: string;
    resolved_at?: string;
    closed_at?: string;
    admin_response?: string;
    resolution_notes?: string;
    metadata?: Record<string, unknown>;
}

export interface SystemUpdate {
    id: string;
    version: string;
    title: string;
    date: string;
    features: string[]; 
    authorId: string;
    type: 'major' | 'minor' | 'patch';
}

export interface ChangeRequest {
    id: string;
    userId: string;
    userName: string;
    requestedName: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

// NEW: User Approval System
export interface UserApprovalRequest {
    id: string;
    email: string;
    name?: string;
    tenantId?: string; // Which tenant they're requesting access to
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string; // Admin user ID who approved/rejected
    approvedAt?: string;
    rejectionReason?: string;
}

export interface Tenant {
    id: string;
    name: string;
    ownerEmail: string;
    subdomain: string; // NEW: Critical for real SaaS
    plan: string; // Linked to Product Name
    status: 'Active' | 'Trial' | 'Churned' | 'Provisioning'; // Added Provisioning status
    joinedAt: string;
    mrr: number;
    usersCount: number;
    logo?: string;
    modules: ModuleId[]; // NEW: Per tenant module config
    region?: 'eu-west' | 'us-east' | 'il-central'; // NEW: Infrastructure location
    version?: string; // NEW: System version for this tenant (e.g., "2.5.0", "2.6.0-beta")
    allowedEmails?: string[]; // NEW: Whitelist of approved email domains/addresses
    requireApproval?: boolean; // NEW: Whether new users need admin approval
}

// NEW: Feedback and Report Types
export interface Feedback {
    id: string;
    userId: string;
    userName: string;
    query: string;
    aiResponseSummary: string;
    date: string;
    status: 'new' | 'reviewed';
}

export type ReportPeriod = 'monthly' | 'quarterly' | 'annual';

export interface GeneratedReport {
    id: string;
    title: string;
    period: ReportPeriod;
    dateGenerated: string;
    data: {
        totalRevenue: number;
        totalCost: number; // Based on hourly rates
        netProfit: number;
        tasksCompleted: number;
        topPerformerId: string;
        efficiencyScore: number;
    };
    isRead: boolean;
}

// NEW: Content Machine Types
export type ContentType = 'image' | 'video' | 'text' | 'document' | 'idea';
export type Platform = 'Youtube' | 'Instagram' | 'Linkedin' | 'Facebook' | 'Twitter' | 'TikTok' | 'Website' | 'Newsletter' | 'Other';
export type ContentStatus = 'draft' | 'scheduled' | 'published';

export interface PlatformDefinition {
    id: string;
    label: string;
    icon: string; // Lucide icon name
    color: string; // Tailwind color class
}

export interface ContentStage {
    id: string;
    name: string;
    color: string;
    tagTrigger: string; // The tag that moves a task to this stage in pipeline view
}

export interface ContentItem {
    id: string;
    title: string;
    description?: string;
    type: ContentType;
    platforms: Platform[]; // IDs of platforms
    status: ContentStatus;
    scheduledAt?: string;
    publishedAt?: string;
    thumbnailUrl?: string; // or fileUrl
    fileName?: string;
    tags: string[];
    createdAt: string;
    creatorId: string;
    performance?: {
        views?: number;
        likes?: number;
        shares?: number;
    };
}

// NEW: Team Events & Leave Requests Types
export type TeamEventType = 'training' | 'fun_day' | 'group_meeting' | 'enrichment' | 'company_event' | 'other';
export type TeamEventStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type LeaveRequestType = 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AttendanceStatus = 'invited' | 'attending' | 'not_attending' | 'attended' | 'absent';

export interface TeamEvent {
    id: string;
    tenantId?: string;
    title: string;
    description?: string;
    eventType: TeamEventType;
    startDate: string; // ISO timestamp
    endDate: string; // ISO timestamp
    allDay?: boolean;
    location?: string;
    organizerId?: string;
    requiredAttendees?: string[]; // User IDs
    optionalAttendees?: string[]; // User IDs
    status: TeamEventStatus;
    requiresApproval?: boolean;
    approvedBy?: string;
    approvedAt?: string;
    notificationSent?: boolean;
    reminderSent?: boolean;
    reminderDaysBefore?: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    createdBy?: string;
    updatedAt: string;
}

export interface LeaveRequest {
    id: string;
    tenantId?: string;
    employeeId: string;
    leaveType: LeaveRequestType;
    startDate: string; // Date string
    endDate: string; // Date string
    daysRequested: number; // Can be decimal (0.5, 1.5, etc.)
    reason?: string;
    status: LeaveRequestStatus;
    requestedBy?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    notificationSent?: boolean;
    employeeNotified?: boolean;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface EventAttendance {
    id: string;
    eventId: string;
    userId: string;
    status: AttendanceStatus;
    rsvpAt?: string;
    attendedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
