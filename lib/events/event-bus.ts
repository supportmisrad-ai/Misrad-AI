import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

// ═══════════════════════════════════════════════════════════════════
// AI Tower - Event Bus
// מערכת אירועים מאוחדת לכל המודולים
// ═══════════════════════════════════════════════════════════════════

// סוגי אירועים מכל המודולים
export type EventType =
  // Nexus Events
  | 'TASK_CREATED'
  | 'TASK_COMPLETED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_OVERDUE'
  | 'PROJECT_CREATED'
  | 'PROJECT_STARTED'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_CANCELLED'
  | 'CYCLE_CREATED'
  | 'CYCLE_COMPLETED'
  // Booking Events
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_RESCHEDULED'
  | 'SLOT_AVAILABLE'
  | 'APPOINTMENT_REMINDER'
  // Finance Events
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'INVOICE_OVERDUE'
  | 'INVOICE_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_EXPIRED'
  // Attendance Events
  | 'ATTENDANCE_PUNCH_IN'
  | 'ATTENDANCE_PUNCH_OUT'
  | 'LATE_ARRIVAL'
  | 'EARLY_DEPARTURE'
  | 'OVERTIME_STARTED'
  | 'SHIFT_COMPLETED'
  // Client Events
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_STATUS_CHANGED'
  | 'CLIENT_RISK_DETECTED'
  | 'CLIENT_CHURNED'
  | 'CLIENT_REACTIVATED'
  // Social Events
  | 'POST_PUBLISHED'
  | 'POST_SCHEDULED'
  | 'POST_FAILED'
  | 'ENGAGEMENT_SPIKE'
  | 'LEAD_CAPTURED'
  // System Events
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'ORGANIZATION_CREATED'
  | 'SETTINGS_CHANGED';

// מבנה אירוע אחיד
export interface AppEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  organizationId: string;
  userId: string;
  payload: unknown;
  metadata: {
    source: string;
    version: string;
    ip?: string;
    userAgent?: string;
  };
}

// פירוט Payload לכל סוג אירוע
export interface TaskCompletedPayload {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  clientId?: string;
  completedBy: string;
  completedByName: string;
  duration?: number; // דקות
  wasOverdue: boolean;
}

export interface BookingCreatedPayload {
  appointmentId: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  startTime: Date;
  endTime: Date;
  value: number;
}

export interface InvoiceOverduePayload {
  invoiceId: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: string;
  daysOverdue: number;
  originalDueDate: Date;
  totalAttempts: number;
}

export interface AttendancePunchInPayload {
  entryId: string;
  userId: string;
  userName: string;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  scheduledStart?: Date;
  isLate: boolean;
  minutesLate: number;
}

export interface ClientRiskDetectedPayload {
  clientId: string;
  clientName: string;
  riskType: 'payment' | 'activity' | 'engagement' | 'churn';
  riskScore: number; // 0-100
  factors: string[];
  lastActivityAt: Date;
}

export interface PaymentReceivedPayload {
  paymentId: string;
  invoiceId: string;
  clientId: string;
  clientName: string;
  amount: number;
  method: string;
  isLate: boolean;
  daysLate?: number;
}

// ═══════════════════════════════════════════════════════════════════
// Event Bus Class
// ═══════════════════════════════════════════════════════════════════

class EventBus {
  private static instance: EventBus;
  private listeners: Map<EventType, Array<(event: AppEvent) => void | Promise<void>>> = new Map();
  private beforeEmitHooks: Array<(event: AppEvent) => AppEvent | null> = [];

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * רישום מאזין לאירוע (Subscriber)
   */
  on<T = unknown>(
    eventType: EventType,
    handler: (event: AppEvent & { payload: T }) => void | Promise<void>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    const handlers = this.listeners.get(eventType)!;
    handlers.push(handler as (event: AppEvent) => void | Promise<void>);

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler as (event: AppEvent) => void | Promise<void>);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * רישום מאזין לכל האירועים (Wildcard)
   */
  onAny(handler: (event: AppEvent) => void | Promise<void>): () => void {
    const allTypes = Object.keys(this.listeners) as EventType[];
    const unsubscribers = allTypes.map(type => this.on(type, handler));
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * הרצת Hook לפני Emit
   */
  beforeEmit(hook: (event: AppEvent) => AppEvent | null): () => void {
    this.beforeEmitHooks.push(hook);
    return () => {
      const index = this.beforeEmitHooks.indexOf(hook);
      if (index > -1) {
        this.beforeEmitHooks.splice(index, 1);
      }
    };
  }

  /**
   * ירי אירוע (Emit)
   * Fire-and-forget - לא חוסם את ה-UI
   */
  async emit<T = unknown>(
    type: EventType,
    payload: T,
    context: {
      organizationId: string;
      userId: string;
      source: string;
      ip?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    // יצירת אירוע
    let event: AppEvent = {
      id: randomUUID(),
      type,
      timestamp: new Date(),
      organizationId: context.organizationId,
      userId: context.userId,
      payload,
      metadata: {
        source: context.source,
        version: '1.0',
        ip: context.ip,
        userAgent: context.userAgent,
      },
    };

    // הרצת Hooks לפני Emit
    for (const hook of this.beforeEmitHooks) {
      const result = hook(event);
      if (result === null) {
        // Hook החליט לבטל את האירוע
        return;
      }
      event = result;
    }

    // שמירה ב-DB ברקע (לא חוסם)
    this.persistEvent(event).catch(err => {
      console.error('[EventBus] Failed to persist event:', err);
    });

    // הפצה למאזינים (async - לא מחכים)
    const handlers = this.listeners.get(type) || [];
    handlers.forEach(handler => {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch(err => {
            console.error(`[EventBus] Handler error for ${type}:`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Sync handler error for ${type}:`, err);
      }
    });
  }

  /**
   * ירי אירוע מקוצר (פשוט יותר לשימוש)
   */
  async emitSimple<T = unknown>(
    type: EventType,
    payload: T,
    organizationId: string,
    userId: string,
    source: string
  ): Promise<void> {
    return this.emit(type, payload, {
      organizationId,
      userId,
      source,
    });
  }

  /**
   * שמירת אירוע ב-DB
   */
  private async persistEvent(event: AppEvent): Promise<void> {
    try {
      await prisma.aIEvent.create({
        data: {
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          organizationId: event.organizationId,
          userId: event.userId,
          payload: JSON.stringify(event.payload),
          processed: false,
          metadata: JSON.stringify(event.metadata),
        },
      });
    } catch (error) {
      // אם הטבלה לא קיימת עדיין, נכשיק
      console.warn('[EventBus] Could not persist event (table may not exist yet):', error);
    }
  }

  /**
   * שליפת אירועים אחרונים לארגון
   */
  async getRecentEvents(
    organizationId: string,
    options: {
      limit?: number;
      types?: EventType[];
      since?: Date;
    } = {}
  ): Promise<AppEvent[]> {
    const { limit = 50, types, since } = options;

    try {
      const events = await prisma.aIEvent.findMany({
        where: {
          organizationId,
          ...(types ? { type: { in: types } } : {}),
          ...(since ? { timestamp: { gte: since } } : {}),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return events.map((e: { id: string; type: EventType; timestamp: Date; organizationId: string; userId: string; payload: string; metadata: string; processed: boolean }) => ({
        ...e,
        payload: JSON.parse(e.payload),
        metadata: JSON.parse(e.metadata),
      })) as AppEvent[];
    } catch (error) {
      console.error('[EventBus] Failed to fetch events:', error);
      return [];
    }
  }

  /**
   * סימון אירועים כמעובדים
   */
  async markAsProcessed(eventIds: string[]): Promise<void> {
    try {
      await prisma.aIEvent.updateMany({
        where: { id: { in: eventIds } },
        data: { processed: true },
      });
    } catch (error) {
      console.error('[EventBus] Failed to mark events as processed:', error);
    }
  }
}

// Export Singleton Instance
export const eventBus = EventBus.getInstance();

// Export class for testing
export { EventBus };
