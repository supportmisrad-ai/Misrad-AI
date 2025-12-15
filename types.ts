
import { LucideIcon } from 'lucide-react';

export type PermissionId = 
    | 'view_financials' 
    | 'manage_team' 
    | 'manage_system' 
    | 'delete_data' 
    | 'view_intelligence' 
    | 'view_crm'       // Clients & Leads access
    | 'view_assets';   // Files & Credentials access

export type ModuleId = 'crm' | 'finance' | 'ai' | 'team' | 'content';

export type SystemScreenStatus = 'active' | 'maintenance' | 'hidden';

export interface ScreenDefinition {
    id: string;
    label: string;
    description?: string;
    category: 'main' | 'settings' | 'sub-feature';
}

export interface RoleDefinition {
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
    twoFactorEnabled?: boolean;
    isSuperAdmin?: boolean; // NEW: Grants access to SaaS Console
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

export type FeatureRequestType = 'feature' | 'bug' | 'change';
export type FeatureRequestStatus = 'new' | 'reviewing' | 'approved' | 'done';

export interface FeatureRequest {
    id: string;
    title: string;
    description: string;
    type: FeatureRequestType;
    status: FeatureRequestStatus;
    priority: Priority;
    votes: string[]; 
    creatorId: string;
    createdAt: string;
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
