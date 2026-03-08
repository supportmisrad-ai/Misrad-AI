
import { MeetingAnalysisResult } from "../types";

// Fix: Removed global initialization of GoogleGenAI to ensure it's created per-call with the latest API key.

const getOrgIdFromClientOsContext = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = ((window as unknown) as { [key: string]: unknown }).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined;
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
  const orgId = getOrgIdFromClientOsContext();
  const res = await fetch('/api/client-os/meetings/analyze-transcript', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ transcript, orgId }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({} as Record<string, unknown>));
    throw new Error((errJson as Record<string, unknown>)?.error as string || 'ניתוח השיחה נכשל');
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const dataObj = data?.data as Record<string, unknown> | undefined;
  const analysis = (data?.analysis || dataObj?.analysis || data) as MeetingAnalysisResult | undefined;
  if (!analysis) throw new Error('לא התקבל ניתוח מהשרת');
  return analysis;
};
