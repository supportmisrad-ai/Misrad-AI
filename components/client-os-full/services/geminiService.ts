
import { MeetingAnalysisResult, WorkflowBlueprint, FormTemplate } from "../types";
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

const getOrgHeaders = () => {
  const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
  const headers: Record<string, string> = {};
  if (orgSlug) headers['x-org-id'] = orgSlug;
  return headers;
};

const getOrgIdFromClientOsContext = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = (window as unknown as Record<string, unknown>).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined;
    const orgId = raw?.organizationId ? String(raw.organizationId) : null;
    return orgId || null;
  } catch {
    return null;
  }
};

export const analyzeMeetingTranscript = async (transcript: string): Promise<MeetingAnalysisResult> => {
  const orgId = getOrgIdFromClientOsContext();
  const res = await fetch('/api/client-os/meetings/analyze-transcript', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...getOrgHeaders() },
    body: JSON.stringify({ transcript, orgId }),
  });

  if (!res.ok) {
    return {
      summary: '',
      sentimentScore: 0,
      frictionKeywords: [],
      objections: [],
      compliments: [],
      decisions: [],
      agencyTasks: [],
      clientTasks: [],
      liabilityRisks: [],
    };
  }

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return { summary: '', sentimentScore: 0, frictionKeywords: [], objections: [], compliments: [], decisions: [], agencyTasks: [], clientTasks: [], liabilityRisks: [] };
  const nested = (data.data && typeof data.data === 'object' ? data.data : null) as Record<string, unknown> | null;
  return (data.analysis || nested?.analysis || data) as unknown as MeetingAnalysisResult;
};

export const generateClientInsight = async (clientName: string, healthScore: number, sentimentTrend: string[]) => {
  const res = await fetch('/api/client-os/ai/success-recommendation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...getOrgHeaders() },
    body: JSON.stringify({ clientName, healthScore, sentimentTrend }),
  });

  const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return { insight: 'הלקוח דורש תשומת לב מוגברת סביב נושאי תקציב.', action: 'קבע שיחת בירור' };

  return {
    insight: String(parsed?.tip || parsed?.insight || 'הלקוח דורש תשומת לב מוגברת סביב נושאי תקציב.'),
    action: String(parsed?.expectedBenefit || parsed?.action || 'קבע שיחת בירור'),
  };
};

export const generateDailyBriefing = async (riskyClientsCount: number, opportunitiesCount: number, meetingsCount: number) => {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...getOrgHeaders() },
      body: JSON.stringify({
        query: `Morning briefing. Data: risky=${riskyClientsCount}, opportunities=${opportunitiesCount}, meetings=${meetingsCount}. Return JSON {greeting, focusPoints, quote} in Hebrew.`,
        rawData: { riskyClientsCount, opportunitiesCount, meetingsCount },
      }),
    });

    if (!res.ok) {
      return { greeting: 'בוקר טוב.', focusPoints: [], quote: '' };
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const result = (data?.result && typeof data.result === 'object' ? data.result : null) as Record<string, unknown> | null;
    if (!result) return { greeting: 'בוקר טוב.', focusPoints: [], quote: '' };

    return {
      greeting: String(result.greeting || 'בוקר טוב.'),
      focusPoints: (Array.isArray(result.focusPoints) ? result.focusPoints : Array.isArray(result.actionableSteps) ? result.actionableSteps : []) as string[],
      quote: String(result.quote || ''),
    };
};

export const generateCycleKickoff = async (cycleName: string, clients: string[]) => {
    return { message: `ברוכים הבאים למחזור "${cycleName}"! אנחנו מתרגשים להתחיל את המסע המשותף עם ${clients.length} לקוחות.` };
};

export const generateTestimonial = async (clientName: string, bulletPoints: string) => {
    return { quote: `עבודה מקצועית ומדויקת עם תוצאות מורגשות.`, linkedinPost: `שמחים על השותפות עם ${clientName}. ${bulletPoints}` };
};

export const generateProgressSummary = async (goalTitle: string, current: number, target: number, unit: string) => {
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;
    return { summary: `התקדמות של כ-${progress}% לעבר היעד.`, forecast: 'נמשיך באותו קצב ונבדוק התאמות בדרך.' };
};

export const generateSuccessRecommendation = async (clientName: string, healthScore: number) => {
    const res = await fetch('/api/client-os/ai/success-recommendation', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...getOrgHeaders() },
      body: JSON.stringify({ clientName, healthScore }),
    });

    const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { tip: 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.', expectedBenefit: 'שיפור בשימור לקוח (Retention)' };
    }

    return {
      tip: String(parsed?.tip || 'שקיפות מלאה במדדי הצלחה מחזקת את האמון בטווח הארוך.'),
      expectedBenefit: String(parsed?.expectedBenefit || 'שיפור בשימור לקוח (Retention)'),
    };
};

export const generateEmailDraft = async (clientName: string, contactName: string, intent: string, tone: string, healthContext: string) => {
    return {
      subject: `עדכון לגבי ${clientName}`,
      body: `היי ${contactName || ''},\n\n${intent}\n\n${healthContext}\n\nבברכה,`,
    };
};

export const generateSmartReply = async (emailBody: string, senderName: string, tone: string = 'professional'): Promise<string> => {
    const res = await fetch('/api/client-os/email/smart-reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...getOrgHeaders() },
      body: JSON.stringify({ emailBody, senderName, tone }),
    });

    if (!res.ok) return 'תודה על המייל, קיבלתי ומטפל.';
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return String(data?.draft || 'תודה על המייל, קיבלתי ומטפל.');
};

export const generateWorkflowBlueprint = async (prompt: string): Promise<WorkflowBlueprint> => {
    return {
      id: `bp-${Date.now()}`,
      name: '',
      description: prompt,
      totalDuration: '',
      tags: [],
      stages: [],
    } as unknown as WorkflowBlueprint;
};

export const generateFormTemplate = async (prompt: string): Promise<FormTemplate> => {
   return {
     id: `form-${Date.now()}`,
     title: '',
     description: prompt,
     category: 'ONBOARDING',
     steps: [],
     isActive: true,
   } as unknown as FormTemplate;
};

export const generateVideoScript = async (clientName: string, recentSuccess: string) => {
    return { script: `היי, אני רוצה לשתף בהצלחה: ${recentSuccess}. העבודה עם ${clientName} הייתה מקצועית, מדויקת ומקדמת תוצאות.` };
};
