import { LucideIcon } from 'lucide-react';

export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'completed' | 'inactive';

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type ProgramStatus = 'active' | 'completed' | 'paused';

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  joinedDate: Date;
  lastSessionDate?: Date;
  nextSessionDate?: Date;
  coachId: string;
  notes?: string;
  goals?: string[];
  progress?: ClientProgress;
  metadata?: Record<string, any>;
}

export interface ClientProgress {
  overallProgress: number; // 0-100
  milestones: Milestone[];
  achievements: Achievement[];
  lastUpdated: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  isCompleted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedDate: Date;
  icon?: string;
}

export interface Session {
  id: string;
  clientId: string;
  coachId: string;
  scheduledDate: Date;
  duration: number; // minutes
  status: SessionStatus;
  type: 'individual' | 'group' | 'workshop';
  notes?: string;
  transcription?: Transcription;
  summary?: SessionSummary;
  insights?: SessionInsight[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Transcription {
  id: string;
  sessionId: string;
  audioUrl?: string;
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  confidence: number; // 0-1
  createdAt: Date;
}

export interface TranscriptionSegment {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  speaker?: string;
}

export interface SessionSummary {
  id: string;
  sessionId: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  mood?: 'positive' | 'neutral' | 'concerned';
  generatedAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  assignedTo: 'client' | 'coach' | 'both';
  dueDate?: Date;
  completed: boolean;
}

export interface SessionInsight {
  id: string;
  sessionId: string;
  type: 'pattern' | 'breakthrough' | 'concern' | 'achievement';
  title: string;
  description: string;
  confidence: number; // 0-1
  generatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  coachId: string;
  clientIds: string[];
  maxParticipants?: number;
  status: 'active' | 'completed' | 'paused';
  schedule?: GroupSchedule;
  createdAt: Date;
}

export interface GroupSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  time: string; // HH:mm
  duration: number; // minutes
}

export interface Program {
  id: string;
  name: string;
  description: string;
  clientId: string;
  coachId: string;
  status: ProgramStatus;
  startDate: Date;
  endDate?: Date;
  modules: ProgramModule[];
  progress: number; // 0-100
  createdAt: Date;
}

export interface ProgramModule {
  id: string;
  title: string;
  description: string;
  order: number;
  content: ProgramContent[];
  completed: boolean;
  completedAt?: Date;
}

export interface ProgramContent {
  id: string;
  type: 'video' | 'article' | 'exercise' | 'quiz';
  title: string;
  url?: string;
  content?: string;
  completed: boolean;
}

export interface ClientInsight {
  id: string;
  clientId: string;
  type: 'progress' | 'engagement' | 'concern' | 'achievement';
  title: string;
  description: string;
  data?: Record<string, any>;
  createdAt: Date;
}

export interface ClientFeedback {
  id: string;
  clientId: string;
  sessionId?: string;
  rating: number; // 1-5
  comment?: string;
  submittedAt: Date;
}

