/**
 * Operations & Business Process Types
 * טיפוסים לתהליכים עסקיים ואופרציות
 */

export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type OperationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type OperationType = 'onboarding' | 'delivery' | 'support' | 'maintenance' | 'upgrade';

export interface Operation {
  id: string;
  type: OperationType;
  title: string;
  description?: string;
  status: OperationStatus;
  priority: OperationPriority;
  assignedTo?: string; // User ID
  clientId?: string;
  projectId?: string;
  startDate?: Date;
  dueDate?: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  attachments?: OperationAttachment[];
  checklist?: OperationChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface OperationAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface OperationChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  order: number;
}

export interface OperationTemplate {
  id: string;
  name: string;
  type: OperationType;
  description?: string;
  defaultPriority: OperationPriority;
  estimatedHours?: number;
  checklist: Omit<OperationChecklistItem, 'id' | 'completed' | 'completedAt' | 'completedBy'>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationHistory {
  id: string;
  operationId: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed' | 'cancelled';
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: Date;
  notes?: string;
}

export interface OperationMetrics {
  totalOperations: number;
  completedOperations: number;
  averageCompletionTime: number; // hours
  onTimeCompletionRate: number; // percentage
  operationsByType: Record<OperationType, number>;
  operationsByStatus: Record<OperationStatus, number>;
}
