'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { CallAnalysisState, CallAnalysisResult, CallAnalysisTask } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { usePathname } from 'next/navigation';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === 'string' ? v : null;
}

function getNumberProp(obj: Record<string, unknown> | null, key: string): number | null {
  const v = obj?.[key];
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

function coerceCallAnalysisIntent(value: unknown): CallAnalysisResult['intent'] {
  const v = typeof value === 'string' ? value : '';
  if (v === 'buying' || v === 'window_shopping' || v === 'angry' || v === 'churn_risk') return v;
  return 'window_shopping';
}

function coerceObjections(value: unknown): CallAnalysisResult['objections'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const o = asObject(item);
      const objection = getStringProp(o, 'objection') ?? '';
      const reply = getStringProp(o, 'reply') ?? '';
      const next_question = getStringProp(o, 'next_question') ?? undefined;
      if (!objection && !reply) return null;
      return { objection, reply, ...(next_question ? { next_question } : {}) };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
}

function coerceTranscript(value: unknown): CallAnalysisResult['transcript'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const o = asObject(item);
      const speakerRaw = getStringProp(o, 'speaker');
      const speaker: 'Agent' | 'Customer' = speakerRaw === 'Agent' ? 'Agent' : speakerRaw === 'Customer' ? 'Customer' : 'Customer';
      const text = getStringProp(o, 'text') ?? '';
      const timestamp = getNumberProp(o, 'timestamp') ?? 0;
      const sentimentRaw = getStringProp(o, 'sentiment');
      const sentiment: 'positive' | 'negative' | 'neutral' =
        sentimentRaw === 'positive' ? 'positive' : sentimentRaw === 'negative' ? 'negative' : sentimentRaw === 'neutral' ? 'neutral' : 'neutral';
      if (!text) return null;
      return { speaker, text, timestamp, sentiment };
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
}

/**
 * Parse raw transcript text (with [MM:SS] timestamps and דובר labels) into structured segments.
 * Handles formats like:
 *   [00:05] דובר 1: שלום מה שלומך
 *   [01:30] דובר 2: תודה בסדר
 *   [00:05] Just text without speaker
 */
function parseTranscriptTextToSegments(rawText: string): CallAnalysisResult['transcript'] {
  if (!rawText) return [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const segments: CallAnalysisResult['transcript'] = [];
  // Track speaker numbers to alternate Agent/Customer
  const speakerRoleMap = new Map<string, 'Agent' | 'Customer'>();
  let nextRole: 'Agent' | 'Customer' = 'Agent';

  for (const line of lines) {
    // Match [MM:SS] optionally followed by דובר X: or Speaker X:
    const match = line.match(/^\[(\d{1,2}):(\d{2})\]\s*(?:(דובר\s*\d+|Speaker\s*\d+)\s*:\s*)?(.+)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const timestamp = minutes * 60 + seconds;
      const speakerLabel = match[3] || '';
      const text = match[4].trim();
      if (!text) continue;

      let speaker: 'Agent' | 'Customer' = 'Customer';
      if (speakerLabel) {
        if (!speakerRoleMap.has(speakerLabel)) {
          speakerRoleMap.set(speakerLabel, nextRole);
          nextRole = nextRole === 'Agent' ? 'Customer' : 'Agent';
        }
        speaker = speakerRoleMap.get(speakerLabel) || 'Customer';
      }

      segments.push({ speaker, text, timestamp, sentiment: 'neutral' });
    } else {
      // Line without timestamp — try speaker label only
      const speakerMatch = line.match(/^(דובר\s*\d+|Speaker\s*\d+)\s*:\s*(.+)$/);
      if (speakerMatch) {
        const speakerLabel = speakerMatch[1];
        const text = speakerMatch[2].trim();
        if (!text) continue;
        if (!speakerRoleMap.has(speakerLabel)) {
          speakerRoleMap.set(speakerLabel, nextRole);
          nextRole = nextRole === 'Agent' ? 'Customer' : 'Agent';
        }
        const speaker = speakerRoleMap.get(speakerLabel) || 'Customer';
        segments.push({ speaker, text, timestamp: 0, sentiment: 'neutral' });
      } else if (line.length > 2) {
        // Plain text line
        segments.push({ speaker: 'Customer', text: line, timestamp: 0, sentiment: 'neutral' });
      }
    }
  }
  return segments;
}

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
  'audio/ogg', 'audio/webm', 'audio/flac',
]);

const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.flac']);

const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function validateAudioFile(file: File): string | null {
  if (!file || file.size === 0) return 'הקובץ ריק. בחר קובץ שמע תקין.';
  if (file.size > MAX_FILE_SIZE_BYTES) return `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB).`;

  const ext = (file.name || '').toLowerCase().replace(/^.*\./, '.');
  const mime = (file.type || '').toLowerCase();

  const extOk = ALLOWED_EXTENSIONS.has(ext);
  const mimeOk = mime ? ALLOWED_AUDIO_MIME_TYPES.has(mime) || mime.startsWith('audio/') : false;

  if (!extOk && !mimeOk) {
    return `פורמט לא נתמך (${ext || mime || 'לא ידוע'}). פורמטים נתמכים: MP3, WAV, M4A, AAC, OGG, WebM, FLAC.`;
  }
  return null;
}

function normalizeAudioMimeType(file: File): string {
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_AUDIO_MIME_TYPES.has(mime)) return mime;

  const ext = (file.name || '').toLowerCase();
  if (ext.endsWith('.mp3')) return 'audio/mpeg';
  if (ext.endsWith('.wav')) return 'audio/wav';
  if (ext.endsWith('.m4a')) return 'audio/mp4';
  if (ext.endsWith('.aac')) return 'audio/aac';
  if (ext.endsWith('.ogg')) return 'audio/ogg';
  if (ext.endsWith('.webm')) return 'audio/webm';
  if (ext.endsWith('.flac')) return 'audio/flac';

  if (mime && mime.startsWith('audio/')) return mime;
  return 'audio/mpeg';
}

interface CallAnalysisContextType {
  state: CallAnalysisState;
  history: CallAnalysisResult[];
  startAnalysis: (file: File) => void;
  analyzeTranscriptText: (
    transcriptText: string,
    opts?: {
      title?: string;
      fileName?: string;
      audioUrl?: string;
      leadId?: string | null;
    }
  ) => void;
  cancelAnalysis: () => void;
  resetAnalysis: () => void;
  loadFromHistory: (result: CallAnalysisResult) => void;
  deleteFromHistory: (id: string) => void;
  updateHistoryItem: (id: string, updates: Partial<CallAnalysisResult>) => void;
  creditsModal: {
    open: boolean;
    outputsCount: number;
    savedHours: number;
  };
  closeCreditsModal: () => void;
}

const CallAnalysisContext = createContext<CallAnalysisContextType | undefined>(undefined);

// Launch-safe: AI schema and client-side Gemini processing are disabled.

export const CallAnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [state, setState] = useState<CallAnalysisState>({
    isProcessing: false,
    progress: 0,
    currentStep: '',
    fileName: null,
    result: null,
    error: null,
  });

  const [history, setHistory] = useLocalStorage<CallAnalysisResult[]>('call_analysis_history', []);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [creditsModal, setCreditsModal] = useState<{ open: boolean; outputsCount: number; savedHours: number }>({
    open: false,
    outputsCount: 0,
    savedHours: 0,
  });

  const closeCreditsModal = () => setCreditsModal((p) => ({ ...p, open: false }));

  const getOrgSlugFromPath = (p: string | null | undefined): string | null => {
    if (!p) return null;
    const parts = p.split('/').filter(Boolean);
    const wIndex = parts.indexOf('w');
    const orgSlug = wIndex !== -1 ? parts[wIndex + 1] : null;
    return orgSlug ? String(orgSlug) : null;
  };

  const inferSocialProof = (items: CallAnalysisResult[]) => {
    const outputsCount = Array.isArray(items) ? items.length : 0;
    const savedHours = Math.round(outputsCount * 0.6 * 10) / 10;
    return { outputsCount, savedHours };
  };

  const fileToInlineData = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const normalizeTasks = (rawTasks: unknown): Array<string | CallAnalysisTask> => {
    if (!Array.isArray(rawTasks)) return [];
    return rawTasks
      .map((t) => {
        if (typeof t === 'string') {
          const s = String(t).trim();
          return s ? s : null;
        }

        const obj = asObject(t);
        if (!obj) return null;

        const title = String(getStringProp(obj, 'title') ?? '').trim();
        if (!title) return null;

        const dueAtSuggestionRaw = obj.dueAtSuggestion;
        const dueAtSuggestion = dueAtSuggestionRaw == null ? null : String(dueAtSuggestionRaw);
        const dueAtConfidence = getNumberProp(obj, 'dueAtConfidence') ?? 0;
        const dueAtRationale = String(getStringProp(obj, 'dueAtRationale') ?? '');
        const confirmedDueAt = obj.confirmedDueAt == null ? null : String(obj.confirmedDueAt);
        const systemTaskId = obj.systemTaskId == null ? null : String(obj.systemTaskId);
        const dismissed = Boolean(obj.dismissed);

        const task: CallAnalysisTask = {
          title,
          dueAtSuggestion,
          dueAtConfidence,
          dueAtRationale,
          ...(confirmedDueAt != null ? { confirmedDueAt } : {}),
          ...(systemTaskId != null ? { systemTaskId } : {}),
          ...(dismissed ? { dismissed } : {}),
        };

        return task;
      })
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
  };

  const analyzeTranscriptText = async (
    transcriptText: string,
    opts?: {
      title?: string;
      fileName?: string;
      audioUrl?: string;
      leadId?: string | null;
    }
  ) => {
    const clean = String(transcriptText || '').trim();
    if (!clean) {
      setState((prev) => ({ ...prev, isProcessing: false, currentStep: 'תמלול ריק', progress: 0 }));
      return;
    }

    abortControllerRef.current = new AbortController();

    setState({
      isProcessing: true,
      progress: 60,
      currentStep: 'מייצר תובנות והצעות מענה...',
      fileName: opts?.fileName ? String(opts.fileName) : 'Live',
      result: null,
      error: null,
    });

    try {
      const orgSlug = getOrgSlugFromPath(pathname);
      if (!orgSlug) {
        throw new Error('חסר orgSlug בכתובת. נסה לרענן את הדף.');
      }

      const suggestRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/suggest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcriptText: clean }),
        signal: abortControllerRef.current?.signal,
      });

      if (suggestRes.status === 402) {
        const { outputsCount, savedHours } = inferSocialProof(history);
        setCreditsModal({ open: true, outputsCount, savedHours });
        setState((prev) => ({ ...prev, isProcessing: false, progress: 0, currentStep: 'נגמרו נקודות AI' }));
        return;
      }

      if (!suggestRes.ok) {
        const errJson = (await suggestRes.json().catch(() => ({}))) as unknown;
        const msg = getStringProp(asObject(errJson), 'error') ?? '';
        throw new Error(msg || 'שגיאה בניתוח');
      }

      const suggestJson = (await suggestRes.json()) as unknown;
      const aiResult = asObject(asObject(suggestJson)?.result) ?? {};
      const topicsRaw = asObject(aiResult.topics) ?? {};
      const normalizedTopics = {
        promises: coerceStringArray(topicsRaw.promises),
        painPoints: coerceStringArray(topicsRaw.painPoints),
        likes: coerceStringArray(topicsRaw.likes),
        slang: coerceStringArray(topicsRaw.slang),
        stories: coerceStringArray(topicsRaw.stories),
        decisions: coerceStringArray(topicsRaw.decisions),
        tasks: normalizeTasks(topicsRaw.tasks),
      };

      const feedbackObj = asObject(aiResult.feedback);
      const feedback: CallAnalysisResult['feedback'] = {
        positive: Array.isArray(feedbackObj?.positive) ? feedbackObj!.positive.map((v) => String(v)) : [],
        improvements: Array.isArray(feedbackObj?.improvements) ? feedbackObj!.improvements.map((v) => String(v)) : [],
      };

      // Use AI transcript segments if available, otherwise parse from raw text
      const aiTranscript2 = coerceTranscript(aiResult.transcript);
      const parsedTranscript2 = aiTranscript2.length > 0 ? aiTranscript2 : parseTranscriptTextToSegments(clean);

      const finalResult: CallAnalysisResult = {
        id: `analysis_${Date.now()}`,
        fileName: opts?.fileName ? String(opts.fileName) : 'Live',
        title: opts?.title ? String(opts.title) : (opts?.fileName ? String(opts.fileName) : 'שיחה חיה'),
        audioUrl: opts?.audioUrl ? String(opts.audioUrl) : '',
        date: new Date().toISOString(),
        duration: '0:00',
        summary: String(aiResult.summary || ''),
        score: getNumberProp(aiResult, 'score') ?? 0,
        intent: coerceCallAnalysisIntent(aiResult.intent),
        objections: coerceObjections(aiResult.objections),
        transcript: parsedTranscript2,
        topics: normalizedTopics,
        feedback,
        leadId: opts?.leadId == null ? undefined : String(opts.leadId),
      };

      setHistory((prev) => [finalResult, ...prev]);
      setState((prev) => ({ ...prev, progress: 100, currentStep: 'הניתוח הושלם!', result: finalResult, isProcessing: false }));
    } catch (error: unknown) {
      console.error('Analysis error:', error);
      const message = error instanceof Error ? error.message : '';
      setState((prev) => ({ ...prev, isProcessing: false, currentStep: '', progress: 0, error: message || 'שגיאה בניתוח השיחה. נסה שוב.' }));
    }
  };

  // Threshold: files above 4MB go through presigned upload to avoid Vercel's body size limit
  const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024;

  const startAnalysis = async (file: File) => {
    // Client-side file validation
    const validationError = validateAudioFile(file);
    if (validationError) {
      setState((prev) => ({ ...prev, isProcessing: false, progress: 0, currentStep: '', result: null, error: validationError }));
      return;
    }

    const audioUrl = URL.createObjectURL(file);
    abortControllerRef.current = new AbortController();

    setState({
      isProcessing: true,
      progress: 10,
      currentStep: 'מעלה קובץ ומתחיל ניתוח...',
      fileName: file.name,
      result: null,
      error: null,
    });

    try {
      const orgSlug = getOrgSlugFromPath(pathname);
      if (!orgSlug) {
        throw new Error('חסר orgSlug בכתובת. נסה לרענן את הדף.');
      }

      setState((prev) => ({ ...prev, progress: 15, currentStep: 'מעלה קובץ לתמלול...' }));

      let transcribeRes: Response;

      const normalizedMime = normalizeAudioMimeType(file);

      if (file.size > DIRECT_UPLOAD_THRESHOLD) {
        // Large file: upload to Supabase Storage via presigned URL, then transcribe from storage
        const uploadUrlRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/upload-url`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: normalizedMime,
            fileSize: file.size,
          }),
          signal: abortControllerRef.current?.signal,
        });

        if (!uploadUrlRes.ok) {
          const errJson = (await uploadUrlRes.json().catch(() => ({}))) as unknown;
          const msg = getStringProp(asObject(errJson), 'error') ?? '';
          throw new Error(msg || 'שגיאה בהכנת ההעלאה');
        }

        const uploadUrlJson = asObject(await uploadUrlRes.json()) ?? {};
        const dataObj = asObject(uploadUrlJson.data) ?? uploadUrlJson;
        const bucket = String(dataObj.bucket || '');
        const storagePath = String(dataObj.path || '');
        const signedUrl = String(dataObj.signedUrl || '');
        const token = String(dataObj.token || '');
        const mimeType = String(dataObj.mimeType || file.type || '');

        if (!signedUrl || !token || !storagePath) {
          throw new Error('שגיאה בקבלת קישור העלאה');
        }

        setState((prev) => ({ ...prev, progress: 25, currentStep: 'מעלה קובץ לאחסון מאובטח...' }));

        // Upload directly to Supabase Storage (bypasses Vercel's 4.5MB limit)
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'false',
          },
          body: file,
          signal: abortControllerRef.current?.signal,
        });

        if (!uploadRes.ok) {
          throw new Error('שגיאה בהעלאת הקובץ לאחסון');
        }

        setState((prev) => ({ ...prev, progress: 40, currentStep: 'מתמלל את ההקלטה...' }));

        // Now call transcribe with the storage path
        transcribeRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            bucket,
            path: storagePath,
            mimeType,
            fileName: file.name,
          }),
          signal: abortControllerRef.current?.signal,
        });
      } else {
        // Small file: direct FormData upload
        setState((prev) => ({ ...prev, progress: 25, currentStep: 'מתמלל את ההקלטה...' }));

        const fd = new FormData();
        // Re-wrap the file with corrected MIME type if needed
        const correctedFile = normalizedMime !== file.type
          ? new File([file], file.name, { type: normalizedMime })
          : file;
        fd.append('file', correctedFile);

        transcribeRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`, {
          method: 'POST',
          body: fd,
          signal: abortControllerRef.current?.signal,
        });
      }

      if (transcribeRes.status === 402) {
        const { outputsCount, savedHours } = inferSocialProof(history);
        setCreditsModal({ open: true, outputsCount, savedHours });
        setState((prev) => ({ ...prev, isProcessing: false, progress: 0, currentStep: 'נגמרו נקודות AI' }));
        return;
      }

      if (!transcribeRes.ok) {
        const errJson = (await transcribeRes.json().catch(() => ({}))) as unknown;
        const msg = getStringProp(asObject(errJson), 'error') ?? '';
        throw new Error(msg || 'שגיאה בתמלול');
      }

      const transcribeJson = (await transcribeRes.json()) as unknown;
      const transcribeData = asObject(asObject(transcribeJson)?.data) ?? asObject(transcribeJson) ?? {};
      const transcriptText = String(getStringProp(transcribeData, 'transcriptText') ?? '').trim();
      if (!transcriptText) {
        throw new Error('תמלול ריק');
      }

      setState((prev) => ({ ...prev, progress: 60, currentStep: 'מייצר תובנות והצעות מענה...' }));

      const suggestRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/suggest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcriptText }),
        signal: abortControllerRef.current?.signal,
      });

      if (suggestRes.status === 402) {
        const { outputsCount, savedHours } = inferSocialProof(history);
        setCreditsModal({ open: true, outputsCount, savedHours });
        setState((prev) => ({ ...prev, isProcessing: false, progress: 0, currentStep: 'נגמרו נקודות AI' }));
        return;
      }

      if (!suggestRes.ok) {
        const errJson = (await suggestRes.json().catch(() => ({}))) as unknown;
        const msg = getStringProp(asObject(errJson), 'error') ?? '';
        throw new Error(msg || 'שגיאה בניתוח');
      }

      const suggestJson = (await suggestRes.json()) as unknown;
      const aiResult = asObject(asObject(suggestJson)?.result) ?? {};
      const topicsRaw = asObject(aiResult.topics) ?? {};
      const normalizedTopics = {
        promises: coerceStringArray(topicsRaw.promises),
        painPoints: coerceStringArray(topicsRaw.painPoints),
        likes: coerceStringArray(topicsRaw.likes),
        slang: coerceStringArray(topicsRaw.slang),
        stories: coerceStringArray(topicsRaw.stories),
        decisions: coerceStringArray(topicsRaw.decisions),
        tasks: normalizeTasks(topicsRaw.tasks),
      };

      const feedbackObj = asObject(aiResult.feedback);
      const feedback: CallAnalysisResult['feedback'] = {
        positive: Array.isArray(feedbackObj?.positive) ? feedbackObj!.positive.map((v) => String(v)) : [],
        improvements: Array.isArray(feedbackObj?.improvements) ? feedbackObj!.improvements.map((v) => String(v)) : [],
      };

      // Use AI transcript segments if available, otherwise parse from raw text
      const aiTranscript = coerceTranscript(aiResult.transcript);
      const parsedTranscript = aiTranscript.length > 0 ? aiTranscript : parseTranscriptTextToSegments(transcriptText);

      const finalResult: CallAnalysisResult = {
        id: `analysis_${Date.now()}`,
        fileName: file.name,
        title: file.name,
        audioUrl,
        date: new Date().toISOString(),
        duration: '0:00',
        summary: String(aiResult.summary || ''),
        score: getNumberProp(aiResult, 'score') ?? 0,
        intent: coerceCallAnalysisIntent(aiResult.intent),
        objections: coerceObjections(aiResult.objections),
        transcript: parsedTranscript,
        topics: normalizedTopics,
        feedback,
      };

      setHistory((prev) => [finalResult, ...prev]);
      setState((prev) => ({ ...prev, progress: 100, currentStep: 'הניתוח הושלם!', result: finalResult, isProcessing: false }));
    } catch (error: unknown) {
      console.error('Analysis error:', error);
      const message = error instanceof Error ? error.message : '';
      const userFriendly = message.includes('aborted')
        ? 'הניתוח בוטל.'
        : message || 'שגיאה בניתוח השיחה. נסה שוב או בדוק שהקובץ תקין.';
      setState((prev) => ({ ...prev, isProcessing: false, currentStep: '', progress: 0, error: userFriendly }));
    }
  };

  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      isProcessing: false,
      progress: 0,
      currentStep: '',
      fileName: null,
      result: null,
      error: null,
    });
  };

  const resetAnalysis = () => {
    setState({
        isProcessing: false,
        progress: 0,
        currentStep: '',
        fileName: null,
        result: null,
        error: null,
    });
  };

  const loadFromHistory = (result: CallAnalysisResult) => {
      setState({
          isProcessing: false,
          progress: 100,
          currentStep: 'Loaded from History',
          fileName: result.fileName || 'Unknown File',
          result: result,
          error: null,
      });
  };

  const deleteFromHistory = (id: string) => {
      setHistory(prev => prev.filter(item => item.id !== id));
      if (state.result?.id === id) {
          resetAnalysis();
      }
  };

  const updateHistoryItem = (id: string, updates: Partial<CallAnalysisResult>) => {
      setHistory(prev => prev.map(item => 
          item.id === id ? { ...item, ...updates } : item
      ));
      
      if (state.result?.id === id) {
          setState(prev => ({
              ...prev,
              result: prev.result ? { ...prev.result, ...updates } : null
          }));
      }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <CallAnalysisContext.Provider value={{ 
        state, history, startAnalysis, cancelAnalysis, 
        resetAnalysis, loadFromHistory, deleteFromHistory, updateHistoryItem,
        analyzeTranscriptText,
        creditsModal,
        closeCreditsModal,
    }}>
      {children}
    </CallAnalysisContext.Provider>
  );
};

export const useCallAnalysis = () => {
  const context = useContext(CallAnalysisContext);
  if (context === undefined) {
    throw new Error('useCallAnalysis must be used within a CallAnalysisProvider');
  }
  return context;
};

