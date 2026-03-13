import { randomUUID } from 'crypto';
import { eventBus, EventType, AppEvent, TaskCompletedPayload, InvoiceOverduePayload, AttendancePunchInPayload, ClientRiskDetectedPayload } from '@/lib/events/event-bus';
import { prisma } from '@/lib/prisma';
import { requireBetaAccess } from './beta-guard';

// ═══════════════════════════════════════════════════════════════════
// AI Tower - Watchtower Engine
// מנגנון חוקים ותובנות חכמות
// ═══════════════════════════════════════════════════════════════════

// סוגי חומרת תובנה
export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// סטטוס תובנה
export type InsightStatus = 'active' | 'resolved' | 'dismissed' | 'pending_action';

// מבנה תובנה
export interface AIInsight {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  status: InsightStatus;
  ruleId: string;
  ruleName: string;
  relatedEventIds: string[];
  suggestedAction?: {
    type: string;
    label: string;
    params: Record<string, unknown>;
    requiresApproval: boolean;
  };
  entityId?: string;
  entityType?: 'client' | 'user' | 'task' | 'project' | 'invoice' | 'booking';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// מבנה חוק AI
export interface AIRule {
  id: string;
  name: string;
  description: string;
  eventTypes: EventType[];
  severity: InsightSeverity;
  isActive: boolean;
  priority: number;
  cooldownMinutes: number;
  condition: (context: RuleContext) => boolean | Promise<boolean>;
  action: (context: RuleContext) => AIInsight | null | Promise<AIInsight | null>;
}

// הקשר לחוק
export interface RuleContext {
  event: AppEvent;
  organizationId: string;
  prisma: typeof prisma;
  recentEvents: AppEvent[];
  existingInsights: AIInsight[];
}

// ═══════════════════════════════════════════════════════════════════
// חוקי AI מובנים
// ═══════════════════════════════════════════════════════════════════

const RULES: AIRule[] = [
  // ═════════════════════════════════════════════════════════════════
  // RULE 1: Churn Risk (סיכון נטישת לקוח)
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'rule-churn-risk-001',
    name: 'Churn Risk Detection',
    description: 'זיהוי לקוח בסיכון נטישה על בסיס חוסר פעילות',
    eventTypes: ['TASK_COMPLETED', 'PROJECT_COMPLETED'],
    severity: 'high',
    isActive: true,
    priority: 10,
    cooldownMinutes: 1440,
    
    condition: async (ctx) => {
      const payload = ctx.event.payload as TaskCompletedPayload;
      if (!payload.clientId) return false;

      const existing = ctx.existingInsights.find(
        i => i.entityId === payload.clientId && 
             i.ruleId === 'rule-churn-risk-001' && 
             i.status === 'active'
      );
      if (existing) return false;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivity = await ctx.prisma.cycleTaskCompletion.count({
        where: {
          clientId: payload.clientId,
          completedAt: { gte: thirtyDaysAgo },
        },
      });

      return recentActivity < 2;
    },

    action: async (ctx) => {
      const payload = ctx.event.payload as TaskCompletedPayload;
      
      return {
        id: `insight-${Date.now()}`,
        organizationId: ctx.organizationId,
        title: '⚠️ סיכון נטישת לקוח',
        description: `לקוח ${payload.clientId} הסתיים מעקב אחרי משימות. יש לו רק פעילות מינימלית ב-30 הימים האחרונים.`,
        severity: 'high',
        status: 'active',
        ruleId: 'rule-churn-risk-001',
        ruleName: 'Churn Risk Detection',
        relatedEventIds: [ctx.event.id],
        entityId: payload.clientId,
        entityType: 'client',
        suggestedAction: {
          type: 'SEND_WHATSAPP',
          label: 'שלח הודעת בירור',
          params: {
            template: 'churn_prevention',
            clientId: payload.clientId,
          },
          requiresApproval: true,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RULE 2: Invoice Opportunity
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'rule-invoice-opportunity-001',
    name: 'Invoice Opportunity',
    description: 'הצע להוצאת חשבונית לאחר סיום פרויקט',
    eventTypes: ['PROJECT_COMPLETED', 'CYCLE_COMPLETED'],
    severity: 'medium',
    isActive: true,
    priority: 20,
    cooldownMinutes: 60,

    condition: async (ctx) => {
      const payload = ctx.event.payload as { clientId?: string; projectId?: string };
      if (!payload.clientId) return false;

      const openInvoice = await ctx.prisma.invoice?.findFirst({
        where: {
          clientId: payload.clientId,
          status: { in: ['draft', 'sent'] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      return !openInvoice;
    },

    action: async (ctx) => {
      const payload = ctx.event.payload as { clientId?: string; clientName?: string; projectId?: string };
      
      return {
        id: `insight-${Date.now()}`,
        organizationId: ctx.organizationId,
        title: '💰 הזדמנות להוצאת חשבונית',
        description: `פרויקט הסתיים בהצלחה עבור ${payload.clientName || 'לקוח'}. זה הזמן להוציא חשבונית.`,
        severity: 'medium',
        status: 'active',
        ruleId: 'rule-invoice-opportunity-001',
        ruleName: 'Invoice Opportunity',
        relatedEventIds: [ctx.event.id],
        entityId: payload.clientId,
        entityType: 'client',
        suggestedAction: {
          type: 'CREATE_INVOICE',
          label: 'צור חשבונית',
          params: {
            clientId: payload.clientId,
            projectId: payload.projectId,
            autoFill: true,
          },
          requiresApproval: true,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      };
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RULE 3: Employee Overload Alert
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'rule-employee-overload-001',
    name: 'Employee Overload Alert',
    description: 'התראה כאשר עובד נכנס למשמרת עם יותר מדי משימות בפיגור',
    eventTypes: ['ATTENDANCE_PUNCH_IN'],
    severity: 'high',
    isActive: true,
    priority: 5,
    cooldownMinutes: 240,

    condition: async (ctx) => {
      const payload = ctx.event.payload as AttendancePunchInPayload;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingToday = ctx.existingInsights.find(
        i => i.entityId === payload.userId &&
             i.ruleId === 'rule-employee-overload-001' &&
             i.createdAt >= today
      );
      if (existingToday) return false;

      const overdueTasks = await ctx.prisma.cycleTask.count({
        where: {
          cycle: {
            tasks: {
              some: {
                completions: { none: {} },
                dueDate: { lt: new Date() },
              }
            }
          }
        },
      });

      return overdueTasks >= 5;
    },

    action: async (ctx) => {
      const payload = ctx.event.payload as AttendancePunchInPayload;
      
      return {
        id: `insight-${Date.now()}`,
        organizationId: ctx.organizationId,
        title: '🔥 עומס יתר על עובד',
        description: `${payload.userName} נכנס למשמרת עם 5+ משימות בפיגור. ייתכן שיש צורך בהקצאת משאבים נוספים.`,
        severity: 'high',
        status: 'active',
        ruleId: 'rule-employee-overload-001',
        ruleName: 'Employee Overload Alert',
        relatedEventIds: [ctx.event.id],
        entityId: payload.userId,
        entityType: 'user',
        suggestedAction: {
          type: 'REASSIGN_TASKS',
          label: 'חלק משימות מחדש',
          params: {
            fromUserId: payload.userId,
            maxTasks: 3,
          },
          requiresApproval: true,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RULE 4: Late Payment Follow-up
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'rule-late-payment-001',
    name: 'Late Payment Follow-up',
    description: 'תזכורת ללקוח עם חשבונית באיחור 7+ ימים',
    eventTypes: ['INVOICE_OVERDUE'],
    severity: 'high',
    isActive: true,
    priority: 15,
    cooldownMinutes: 2880,

    condition: async (ctx) => {
      const payload = ctx.event.payload as InvoiceOverduePayload;
      if (payload.daysOverdue < 7) return false;

      const existing = ctx.existingInsights.find(
        i => i.entityId === payload.clientId &&
             i.ruleId === 'rule-late-payment-001' &&
             i.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      
      return !existing;
    },

    action: async (ctx) => {
      const payload = ctx.event.payload as InvoiceOverduePayload;
      
      return {
        id: `insight-${Date.now()}`,
        organizationId: ctx.organizationId,
        title: '⏰ תזכורת תשלום דחוף',
        description: `לקוח ${payload.clientName} חייב ${payload.amount} ${payload.currency} כבר ${payload.daysOverdue} ימים. ניסיון תשלום ${payload.totalAttempts}.`,
        severity: 'critical',
        status: 'active',
        ruleId: 'rule-late-payment-001',
        ruleName: 'Late Payment Follow-up',
        relatedEventIds: [ctx.event.id],
        entityId: payload.clientId,
        entityType: 'client',
        suggestedAction: {
          type: 'SEND_PAYMENT_REMINDER',
          label: 'שלח תזכורת WhatsApp',
          params: {
            clientId: payload.clientId,
            invoiceId: payload.invoiceId,
            amount: payload.amount,
            daysOverdue: payload.daysOverdue,
          },
          requiresApproval: true,
        },
        metadata: {
          amount: payload.amount,
          daysOverdue: payload.daysOverdue,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RULE 5: Booking Gap
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'rule-booking-gap-001',
    name: 'Booking Gap Marketing',
    description: 'זיהוי חלונות זמן פנויים רצופים להצעת שיווק',
    eventTypes: ['SLOT_AVAILABLE'],
    severity: 'low',
    isActive: true,
    priority: 50,
    cooldownMinutes: 10080,

    condition: async (ctx) => {
      const recentSlots = ctx.recentEvents.filter(
        e => e.type === 'SLOT_AVAILABLE' &&
             e.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      return recentSlots.length >= 3;
    },

    action: async (ctx) => {
      return {
        id: `insight-${Date.now()}`,
        organizationId: ctx.organizationId,
        title: '📅 חלונות זמן פנויים זמינים',
        description: 'זוהו 3+ חלונות זמן פנויים ברציפות. זה הזמן לשלוח הצעות ללקוחות פוטנציאליים.',
        severity: 'low',
        status: 'active',
        ruleId: 'rule-booking-gap-001',
        ruleName: 'Booking Gap Marketing',
        relatedEventIds: ctx.recentEvents
          .filter(e => e.type === 'SLOT_AVAILABLE')
          .slice(0, 3)
          .map(e => e.id),
        suggestedAction: {
          type: 'SEND_MARKETING_BLAST',
          label: 'שלח הצעות ללקוחות',
          params: {
            targetSegment: 'inactive_clients',
            offerType: 'last_minute_discount',
          },
          requiresApproval: true,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      };
    },
  },

  // ═════════════════════════════════════════════════════════════════
  // RULE 6: Win Back Opportunity
  // ═════════════════════════════════════════════════════════════════
  {
    id: 'rule-win-back-001',
    name: 'Win Back Opportunity',
    description: 'זיהוי לקוח לשעבר עם היסטוריה טובה להצעת חזרה',
    eventTypes: ['CLIENT_RISK_DETECTED'],
    severity: 'medium',
    isActive: true,
    priority: 30,
    cooldownMinutes: 10080,

    condition: async (ctx) => {
      const payload = ctx.event.payload as ClientRiskDetectedPayload;
      if (payload.riskScore > 70) return false;

      const paymentHistory = await ctx.prisma.payment?.aggregate({
        where: { clientId: payload.clientId },
        _count: true,
        _sum: { amount: true },
      });

      return (paymentHistory?._count || 0) >= 3 &&
             (paymentHistory?._sum?.amount || 0) > 5000;
    },

    action: async (ctx) => {
      const payload = ctx.event.payload as ClientRiskDetectedPayload;
      
      return {
        id: `insight-${Date.now()}`,
        organizationId: ctx.organizationId,
        title: '🎯 הזדמנות לקוח חוזר',
        description: `${payload.clientName} היה לקוח טוב בעבר. רמת הסיכון הנוכחית: ${payload.riskScore}%. מומלץ לשלוח הצעה מיוחדת.`,
        severity: 'medium',
        status: 'active',
        ruleId: 'rule-win-back-001',
        ruleName: 'Win Back Opportunity',
        relatedEventIds: [ctx.event.id],
        entityId: payload.clientId,
        entityType: 'client',
        suggestedAction: {
          type: 'SEND_WIN_BACK_OFFER',
          label: 'שלח הצעת חזרה',
          params: {
            clientId: payload.clientId,
            discountPercent: 15,
            offerValidDays: 7,
          },
          requiresApproval: true,
        },
        metadata: {
          riskScore: payload.riskScore,
          factors: payload.factors,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
// Watchtower Engine Class
// ═══════════════════════════════════════════════════════════════════

class WatchtowerEngine {
  private rules: Map<string, AIRule> = new Map();
  private insightCache: Map<string, AIInsight[]> = new Map();
  private isInitialized = false;

  constructor() {
    this.loadRules();
  }

  private loadRules() {
    RULES.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * אתחול המערכת והתחלת האזנה לאירועים
   */
  initialize() {
    if (this.isInitialized) return;

    RULES.forEach(rule => {
      rule.eventTypes.forEach(eventType => {
        eventBus.on(eventType, async (event) => {
          await this.processEvent(event);
        });
      });
    });

    this.isInitialized = true;
    console.log('[Watchtower] Initialized with', RULES.length, 'rules');
  }

  /**
   * עיבוד אירוע והפעלת חוקים
   */
  private async processEvent(event: AppEvent) {
    const relevantRules = Array.from(this.rules.values()).filter(
      rule => rule.isActive && rule.eventTypes.includes(event.type)
    );

    for (const rule of relevantRules.sort((a, b) => a.priority - b.priority)) {
      try {
        if (await this.isInCooldown(rule, event.organizationId)) {
          continue;
        }

        const recentEvents = await eventBus.getRecentEvents(event.organizationId, {
          limit: 20,
          since: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });

        const existingInsights = this.insightCache.get(event.organizationId) || [];

        const context: RuleContext = {
          event,
          organizationId: event.organizationId,
          prisma,
          recentEvents,
          existingInsights,
        };

        const conditionMet = await rule.condition(context);
        if (!conditionMet) continue;

        const insight = await rule.action(context);
        if (insight) {
          await this.saveInsight(insight);
          
          const orgInsights = this.insightCache.get(event.organizationId) || [];
          orgInsights.unshift(insight);
          this.insightCache.set(event.organizationId, orgInsights);

          console.log('[Watchtower] Generated insight:', insight.title);
        }
      } catch (error) {
        console.error(`[Watchtower] Rule ${rule.id} failed:`, error);
      }
    }
  }

  private async isInCooldown(rule: AIRule, organizationId: string): Promise<boolean> {
    try {
      const recentInsight = await prisma.aIInsight?.findFirst({
        where: {
          organizationId,
          ruleId: rule.id,
          createdAt: {
            gte: new Date(Date.now() - rule.cooldownMinutes * 60 * 1000),
          },
        },
      });

      return !!recentInsight;
    } catch {
      return false;
    }
  }

  private async saveInsight(insight: AIInsight) {
    try {
      await prisma.aIInsight?.create({
        data: {
          id: insight.id,
          organizationId: insight.organizationId,
          title: insight.title,
          description: insight.description,
          severity: insight.severity,
          status: insight.status,
          ruleId: insight.ruleId,
          ruleName: insight.ruleName,
          relatedEventIds: insight.relatedEventIds,
          suggestedAction: insight.suggestedAction ? JSON.stringify(insight.suggestedAction) : null,
          entityId: insight.entityId,
          entityType: insight.entityType,
          metadata: insight.metadata ? JSON.stringify(insight.metadata) : null,
          createdAt: insight.createdAt,
          expiresAt: insight.expiresAt,
        },
      });
    } catch (error) {
      console.warn('[Watchtower] Could not save insight to DB:', error);
    }
  }

  /**
   * שליפת תובנות פעילות לארגון
   */
  async getActiveInsights(organizationId: string): Promise<AIInsight[]> {
    try {
      await requireBetaAccess();
    } catch {
      return [];
    }

    const cached = this.insightCache.get(organizationId);
    if (cached) {
      return cached.filter(i => i.status === 'active');
    }

    try {
      const insights = await prisma.aIInsight?.findMany({
        where: {
          organizationId,
          status: 'active',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'desc' },
        ],
      }) || [];

      const formatted: AIInsight[] = insights.map((i: { id: string; organizationId: string; title: string; description: string; severity: string; status: string; ruleId: string; ruleName: string; relatedEventIds: string[]; suggestedAction: string | null; entityId: string | null; entityType: string | null; metadata: string | null; createdAt: Date; expiresAt: Date | null; resolvedAt: Date | null; resolvedBy: string | null }) => ({
        ...i,
        severity: i.severity as InsightSeverity,
        status: i.status as InsightStatus,
        suggestedAction: i.suggestedAction ? JSON.parse(i.suggestedAction) : undefined,
        metadata: i.metadata ? JSON.parse(i.metadata) : undefined,
      }));

      this.insightCache.set(organizationId, formatted);

      return formatted;
    } catch (error) {
      console.error('[Watchtower] Failed to fetch insights:', error);
      return [];
    }
  }

  /**
   * פתרון תובנה
   */
  async resolveInsight(insightId: string, userId: string) {
    try {
      await prisma.aIInsight?.update({
        where: { id: insightId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: userId,
        },
      });

      this.insightCache.clear();
    } catch (error) {
      console.error('[Watchtower] Failed to resolve insight:', error);
    }
  }

  /**
   * דחיית תובנה
   */
  async dismissInsight(insightId: string, userId: string) {
    try {
      await prisma.aIInsight?.update({
        where: { id: insightId },
        data: {
          status: 'dismissed',
          resolvedAt: new Date(),
          resolvedBy: userId,
        },
      });

      this.insightCache.clear();
    } catch (error) {
      console.error('[Watchtower] Failed to dismiss insight:', error);
    }
  }

  /**
   * הרצת Action
   */
  async executeAction(insightId: string, actionType: string, params: Record<string, unknown>) {
    console.log('[Watchtower] Executing action:', actionType, params);
    
    try {
      await prisma.aIInsight?.update({
        where: { id: insightId },
        data: { status: 'pending_action' },
      });
    } catch (error) {
      console.error('[Watchtower] Failed to update insight status:', error);
    }
  }
}

// Export Singleton
export const watchtower = new WatchtowerEngine();
