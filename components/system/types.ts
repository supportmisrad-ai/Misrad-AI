'use client';

import React from 'react';

export type PipelineStage = 
  | SystemStage
  | string;

export type SystemStage =
  | 'incoming'
  | 'contacted'
  | 'meeting'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'churned';

export function isSystemStage(value: unknown): value is SystemStage {
  return (
    value === 'incoming' ||
    value === 'contacted' ||
    value === 'meeting' ||
    value === 'proposal' ||
    value === 'negotiation' ||
    value === 'won' ||
    value === 'lost' ||
    value === 'churned'
  );
}

export type UserRole = 'admin' | 'agent' | 'viewer';

export type ProductType = 'premium_1on1' | 'mastermind_group' | 'digital_course';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  email?: string;
}

export interface SquareActivity {
  id: string;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note' | 'system' | 'financial' | 'sms' | 'feedback' | 'support';
  content: string;
  timestamp: Date;
  direction?: 'inbound' | 'outbound'; 
  metadata?: Record<string, unknown>; 
}

export type Activity = SquareActivity;

export interface HandoverData {
  nonStandardPromises: string;
  biggestPain: string;
  expectations30Days: string;
  filledAt: Date;
}

export interface Lead {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  source: string;
  status: PipelineStage;
  value: number;
  lastContact: Date;
  createdAt: Date;
  activities: SquareActivity[];
  isHot: boolean;
  address?: string;
  location?: { x: number; y: number };
  assignedAgentId?: string;
  subscriptionEndDate?: Date;
  productInterest?: ProductType;
  nextActionDate?: Date | null;
  nextActionDateSuggestion?: Date | null;
  nextActionNote?: string | null;
  nextActionDateRationale?: string | null;
  
  score: number;
  closureProbability?: number | null;
  closureRationale?: string | null;
  recommendedAction?: string | null;
  playbookStep?: string;
  aiTags?: string[];

  budgetHours?: number;
  loggedHours?: number;
  
  handover?: HandoverData;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  tags: string[];
}

export interface Invoice {
    id: string;
    client: string;
    amount: number;
    date: string;
    status: 'paid' | 'pending' | 'overdue' | 'refunded'; 
    item: string;
    refundReason?: string;
}

export interface CalendarEvent {
    id: string;
    title: string; 
    leadId?: string | null;
    leadName: string;
    leadCompany: string;
    dayName: string;
    date: string;
    time: string;
    type: 'zoom' | 'frontal' | 'group_session';
    location: string;
    participants?: number;
    reminders?: {
        whatsapp: boolean;
        sms: boolean;
        email: boolean;
        timing: 'immediate' | '1h_before' | '24h_before';
    };
    postMeeting?: {
        enabled: boolean;
        type: 'thank_you' | 'summary' | 'proposal_link';
        delay: '1h_after' | 'morning_after';
        channel: 'whatsapp' | 'email';
    };
}

export interface PortalApproval {
  id: string;
  type: 'proposal' | 'design' | 'contract' | 'feedback';
  title: string;
  date: string;
  status: 'waiting' | 'approved' | 'rejected';
}

export interface PortalTask {
  id: string;
  title: string;
  type: 'text' | 'form' | 'feedback' | 'support';
  status: 'pending' | 'completed';
  formFields?: {
    id: string;
    label: string;
    type: 'text' | 'select' | 'radio' | 'rating';
    options?: string[];
  }[];
}

export interface SupportTicket {
    id: string;
    category: 'technical' | 'billing' | 'service' | 'other';
    subject: string;
    status: 'open' | 'in_progress' | 'closed';
    createdAt: Date;
}

export interface FieldAgent {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  location: { x: number; y: number };
  avatar: string;
  phone: string;
  area: string;
  currentTask?: string;
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

export interface Student {
  id: string;
  name: string;
  company: string;
  avatar: string;
  progress: number;
  status: 'on_track' | 'needs_help' | 'at_risk';
  cohort: string;
  lastCheckIn: Date;
  nextHotSeat?: Date;
}

export type ContentStage = 'idea' | 'scripting' | 'filming' | 'editing' | 'ready' | 'published';

export interface ContentItem {
  id: string;
  title: string;
  format: 'pillar' | 'short';
  platform: string;
  status: ContentStage;
  assignee: string;
  views?: number;
}

export interface DashboardStats {
  totalValue: number;
  totalLeads: number;
  conversionRate: number;
  leadsNeedingAttention: number;
}

export interface WebhookLog {
  id: string;
  timestamp: Date;
  channel: string;
  event: string;
  status: string;
}

export interface VisualNode {
  id: string;
  type: 'trigger' | 'action';
  label: string;
  iconName: string;
  x: number;
  y: number;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  active: boolean;
  stats: {
    runs: number;
    lastRun: Date | null;
    successRate: number;
  };
  nodes: VisualNode[];
  edges: VisualEdge[];
}

export interface AIReport {
  id: string;
  date: Date;
  type: 'team' | 'personal';
  score: number;
  summary: string;
  insights: {
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'positive';
    actionItem?: string;
  }[];
  metrics: {
    label: string;
    value: number;
    target: number;
    unit: string;
  }[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  type: 'Tutorial' | 'SOP' | 'Policy';
  lastUpdated: Date;
  author: string;
  readTime: string;
  requiredRoles: UserRole[];
  verificationRequired: boolean;
  tags: string[];
  content: React.ReactNode;
}

export interface OnboardingTask {
  id: string;
  title: string;
  type: 'read' | 'video' | 'quiz';
  completed: boolean;
  itemId?: string;
}

export interface CallAnalysisTask {
  title: string;
  dueAtSuggestion: string | null;
  dueAtConfidence: number;
  dueAtRationale: string;
  confirmedDueAt?: string | null;
  systemTaskId?: string | null;
  dismissed?: boolean;
}

export interface CallAnalysisResult {
  id: string;
  fileName: string;
  title: string;
  audioUrl: string;
  date: string;
  duration: string;
  summary: string;
  score: number;
  intent: 'buying' | 'window_shopping' | 'angry' | 'churn_risk';
  objections?: {
    objection: string;
    reply: string;
    next_question?: string;
  }[];
  transcript: {
    speaker: 'Agent' | 'Customer';
    text: string;
    timestamp: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  topics: {
    promises: string[];
    painPoints: string[];
    likes: string[];
    slang: string[];
    stories: string[];
    decisions: string[];
    tasks: Array<string | CallAnalysisTask>;
  };
  feedback: {
    positive: string[];
    improvements: string[];
  };
  userNotes?: string;
  leadId?: string;
}

export interface CallAnalysisState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  fileName: string | null;
  result: CallAnalysisResult | null;
  error: string | null;
}
