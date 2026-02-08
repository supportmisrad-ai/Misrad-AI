export type ClientStatus = 'Active' | 'Paused' | 'Archived' | 'Pending Payment' | 'Onboarding' | 'Overdue';
export type OnboardingStatus = 'invited' | 'completed';
export type PostStatus = 'draft' | 'internal_review' | 'scheduled' | 'published' | 'failed' | 'pending_approval';
export type PricingPlan = 'starter' | 'pro' | 'agency' | 'custom';
export type UserRole = 'super_admin' | 'owner' | 'team_member';
export type TeamMemberRole = 'account_manager' | 'content_creator' | 'designer'; // Roles within an organization
export type MemberType = 'employee' | 'freelancer';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export type SocialPlatform = 
  | 'facebook' 
  | 'instagram' 
  | 'linkedin' 
  | 'tiktok' 
  | 'twitter' 
  | 'google' 
  | 'whatsapp' 
  | 'threads' 
  | 'youtube' 
  | 'pinterest'
  | 'portal';

export interface GlobalSystemMetrics {
  totalMRR: number;
  activeSubscriptions: number;
  overdueInvoicesCount: number;
  apiHealthScore: number; // 0-100
  geminiTokenUsage: number;
  newClientsThisMonth: number;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string; // User ID of the owner
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan?: PricingPlan;
  trialStartDate?: string;
  trialDays: number;
  subscriptionStartDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId?: string;
  organizationId: string;
  name: string;
  role: TeamMemberRole; // Role within the organization
  memberType: MemberType;
  avatar: string;
  assignedClients: string[]; // Client IDs
  activeTasksCount: number;
  capacityScore: number; // 0-100
  hourlyRate?: number; // Cost for the agency per hour
  monthlySalary?: number; // For employees
  recentActivity?: ActivityLog[];
}

export interface ActivityLog {
  id: string;
  memberId: string;
  action: string;
  targetId: string;
  targetType: 'post' | 'client' | 'task' | 'system';
  timestamp: string;
}

export interface TeamComment {
  id: string;
  memberId: string;
  text: string;
  timestamp: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  isConnected: boolean;
  apiKey?: string;
  lastSync?: string;
}

export interface BusinessMetrics {
  timeSpentMinutes: number;
  expectedHours: number;
  punctualityScore: number;
  responsivenessScore: number;
  revisionCount: number;
  lastAIBusinessAudit?: string;
  daysOverdue?: number;
}

export interface AutomationRule {
  id: string;
  type: 'whatsapp' | 'email' | 'lockdown';
  triggerDays: number;
  isEnabled: boolean;
  title: string;
  description: string;
}

// REMOVED: PlatformCredential with password storage
// We don't store passwords for security, legal, and UX reasons.
// See VaultTab component for detailed explanation.
// If needed, we can store platform usernames only (without passwords):
export interface PlatformInfo {
  platform: SocialPlatform;
  username?: string; // Optional - just for reference, not for authentication
  notes?: string;
}

export interface AgencyServiceConfig {
  id: SocialPlatform | string;
  label: string;
  isEnabled: boolean;
  basePrice: number;
  category?: 'platform' | 'content' | 'strategy';
  description?: string;
  isRecurring?: boolean;
}

export interface PlatformQuota {
  platform: SocialPlatform;
  monthlyLimit: number;
  currentUsage: number;
}

export interface StrategicCharacterization {
  targetAudience: string;
  painPoints: string;
  uniqueValue: string;
  competitors: string;
  mainGoal: string;
  aiStrategySummary?: string;
}

export interface ClientDNA {
  brandSummary: string;
  voice: {
    formal: number;
    funny: number;
    length: number;
  };
  vocabulary: {
    loved: string[];
    forbidden: string[];
  };
  colors: {
    primary: string;
    secondary: string;
  };
  strategy?: StrategicCharacterization;
}

export interface Client {
  id: string;
  name: string;
  companyName: string;
  businessId?: string;
  phone?: string;
  email?: string;
  avatar: string;
  brandVoice: string;
  dna: ClientDNA;
  credentials: PlatformInfo[]; // Platform info only - NO PASSWORDS stored
  postingRhythm: string;
  status: ClientStatus;
  activePlatforms: SocialPlatform[];
  quotas: PlatformQuota[];
  onboardingStatus?: OnboardingStatus;
  invitationToken?: string;
  portalToken: string;
  color: string;
  plan?: PricingPlan;
  monthlyFee?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  autoRemindersEnabled: boolean;
  savedCardThumbnail?: string;
  businessMetrics: BusinessMetrics;
  internalNotes?: string;
  organizationId: string; // Which organization owns this client
}

export interface SocialPost {
  id: string;
  clientId: string;
  content: string;
  mediaUrl?: string;
  mediaRef?: string;
  platforms: SocialPlatform[];
  status: PostStatus;
  scheduledAt: string;
  publishedAt?: string;
  isLate?: boolean;
  createdBy?: string; // Member ID
  internalComments?: TeamComment[];
}

export interface AIOpportunity {
  id: string;
  clientId: string;
  title: string;
  description: string;
  type: 'event' | 'gap' | 'trend' | 'payment_alert' | 'client_request';
  draftContent?: string;
  mediaUrl?: string;
  mediaRef?: string;
}

export interface PostVariation {
  id: string;
  type: string;
  content: string;
  imageSuggestion: string;
}

export interface SocialTask {
  id: string;
  clientId?: string;
  assignedTo?: string; // Member ID
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'completed' | 'in_progress';
  type: 'approval' | 'message' | 'creative' | 'general' | 'payment';
}

export interface Idea {
  id: string;
  clientId: string;
  text?: string; // For simple ideas
  title?: string; // For detailed ideas
  description?: string;
  category?: string;
  mediaUrl?: string;
  mediaRef?: string;
  status?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  clientId: string;
  platform: SocialPlatform;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Message[];
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  downloadUrl: string;
}

export interface PaymentOrder {
  id: string;
  clientId: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  installmentsAllowed: 1 | 2;
}

export interface ManagerRequest {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'rejected';
  type: 'media' | 'info' | 'feedback';
  createdAt: string;
  feedbackFromClient?: string;
  managerComment?: string; // Comment from manager to client
}

export interface ClientRequest {
  id: string;
  clientId: string;
  type: 'media' | 'text' | 'campaign';
  content: string;
  mediaUrl?: string;
  mediaRef?: string;
  timestamp: string;
  status: 'new' | 'processed' | 'needs_fix';
  managerComment?: string;
}

// Legacy types for backward compatibility
export type SocialRole = 'admin' | 'creator' | 'client';

export interface Campaign {
  id: string;
  name: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'all';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  budget?: number;
  content: ContentItem[];
  metrics?: CampaignMetrics;
}

export interface ContentItem {
  id: string;
  title: string;
  type: 'image' | 'video' | 'carousel' | 'reel' | 'story';
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok';
  status: 'draft' | 'approved' | 'scheduled' | 'published';
  fileUrl?: string;
  caption: string;
  hashtags: string[];
  scheduledDate?: Date;
  publishedDate?: Date;
  metrics?: ContentMetrics;
}

export interface CampaignMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  conversions: number;
  roas?: number; // Return on Ad Spend
}

export interface ContentMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  engagementRate: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  goals: string[];
  platforms: ('instagram' | 'facebook' | 'linkedin' | 'tiktok')[];
  contentThemes: string[];
  postingSchedule: PostingSchedule;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostingSchedule {
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
  sunday: string[];
}

export interface Trend {
  id: string;
  name: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'tiktok';
  description: string;
  hashtags: string[];
  exampleContent?: string;
  popularity: number; // 0-100
  createdAt: Date;
}

export interface ContentBankItem {
  id: string;
  title: string;
  type: 'image' | 'video' | 'template';
  category: string;
  tags: string[];
  fileUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  usedInCampaigns: string[];
}
