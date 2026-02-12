/**
 * Content Management Types
 * טיפוסים לניהול תוכן ומדיה
 */

export type ContentType = 'image' | 'video' | 'document' | 'audio' | 'link' | 'text' | 'template';
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
export type MediaFormat = 'jpeg' | 'png' | 'gif' | 'svg' | 'mp4' | 'mov' | 'pdf' | 'docx' | 'xlsx';

export interface Content {
  id: string;
  title: string;
  type: ContentType;
  format?: MediaFormat;
  status: ContentStatus;
  description?: string;
  url?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number; // for video/audio in seconds
  dimensions?: {
    width: number;
    height: number;
  };
  tags: string[];
  categories: string[];
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  version: number;
}

export interface ContentLibrary {
  id: string;
  name: string;
  description?: string;
  items: Content[];
  organizationId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: ContentType;
  template: string; // Template string or JSON
  variables: ContentTemplateVariable[];
  previewUrl?: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentTemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'image' | 'color';
  defaultValue?: string | number;
  required: boolean;
  description?: string;
}

export interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  url: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
}

export interface ContentUsage {
  contentId: string;
  usedIn: {
    type: 'campaign' | 'post' | 'email' | 'website';
    id: string;
    name: string;
    date: Date;
  }[];
  totalViews?: number;
  totalEngagements?: number;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: ContentType;
  format: MediaFormat;
  url: string;
  thumbnailUrl?: string;
  size: number;
  width?: number;
  height?: number;
  uploadedBy: string;
  uploadedAt: Date;
  tags: string[];
  altText?: string;
  caption?: string;
}

export interface ContentCalendar {
  id: string;
  title: string;
  description?: string;
  items: ContentCalendarItem[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentCalendarItem {
  id: string;
  contentId: string;
  scheduledDate: Date;
  publishedDate?: Date;
  platform?: string;
  status: 'scheduled' | 'published' | 'cancelled';
  notes?: string;
}
