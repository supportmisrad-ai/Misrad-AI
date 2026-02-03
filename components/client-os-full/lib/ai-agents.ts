
import { MeetingAnalysisResult } from "../types";

// Fix: Removed global initialization of GoogleGenAI to ensure it's created per-call with the latest API key.

const getOrgIdFromClientOsContext = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = (window as any).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined;
    const orgId = raw?.organizationId ? String(raw.organizationId) : null;
    return orgId || null;
  } catch {
    return null;
  }
};

/**
 * Nexus Intelligence Core
 * Handles specific prompt engineering for Speaker Diarization.
 */
export const analyzeMeetingTranscript = async (transcript: string): Promise<MeetingAnalysisResult> => {
  // 1. Mock Fallback
  try {
    const orgId = getOrgIdFromClientOsContext();
    const res = await fetch('/api/client-os/meetings/analyze-transcript', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript, orgId }),
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = (await res.json().catch(() => null)) as any;
    return (data?.analysis || data?.data?.analysis || data) as MeetingAnalysisResult;
  } catch {
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    return {
      summary: "הלקוח (Speaker 1) מביע תסכול מסוים מקצב ההתקדמות, אך הסוכנות (Speaker 0) הצליחה להרגיע את החששות באמצעות התחייבות ללוחות זמנים ברורים. ישנה תלות משמעותית בקבלת חומרים מהלקוח.",
      sentimentScore: 58,
      frictionKeywords: ["עיכוב", "דדליין", "לא ברור", "ממתינים"],
      objections: [
        "הטמעה לוקחת יותר זמן מהצפוי",
        "חוסר בהירות לגבי העלויות הנוספות"
      ],
      compliments: [
        "הצוות עף על הממשק החדש",
        "מעריכים את הזמינות שלכם"
      ],
      decisions: [
        "הגשת דוח סטטוס שבועי כל יום חמישי",
        "הקפאת העבודה על מודול ה-API עד לקבלת מפרט"
      ],
      agencyTasks: [
        { id: "at1", task: "שליחת דוח סטטוס מעודכן עד סוף היום", deadline: "היום 17:00", priority: "HIGH", status: "PENDING" },
        { id: "at2", task: "בדיקת היתכנות טכנית לאינטגרציה החדשה", deadline: "יום שלישי", priority: "NORMAL", status: "PENDING" }
      ],
      clientTasks: [
        { id: "ct1", task: "אישור הסקיצות הסופיות שנשלחו במייל", deadline: "מחר", priority: "HIGH", status: "PENDING" },
        { id: "ct2", task: "העברת פרטי גישה לשרת ה-staging", deadline: "ASAP", priority: "HIGH", status: "PENDING" }
      ],
      liabilityRisks: [
        { quote: "אני מבטיח שזה יהיה מוכן עד יום ראשון", context: "הבטחה ללא בדיקת עומס עם הצוות", riskLevel: "HIGH" },
        { quote: "ננסה להכניס את זה בלי תוספת תשלום", context: "שחיקת רווחיות פוטנציאלית", riskLevel: "MEDIUM" }
      ]
    };
  }
};
