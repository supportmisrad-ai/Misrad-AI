'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { CallAnalysisState, CallAnalysisResult } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { usePathname } from 'next/navigation';

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
    result: null
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

  const normalizeTasks = (rawTasks: any): any[] => {
    if (!Array.isArray(rawTasks)) return [];
    return rawTasks
      .map((t) => {
        if (typeof t === 'string') {
          const s = String(t).trim();
          return s ? s : null;
        }
        if (t && typeof t === 'object') {
          const title = String((t as any).title || '').trim();
          if (!title) return null;
          const dueAtSuggestionRaw = (t as any).dueAtSuggestion;
          const dueAtSuggestion = dueAtSuggestionRaw == null ? null : String(dueAtSuggestionRaw);
          const dueAtConfidence = Number.isFinite(Number((t as any).dueAtConfidence)) ? Number((t as any).dueAtConfidence) : 0;
          const dueAtRationale = String((t as any).dueAtRationale || '');
          return {
            ...t,
            title,
            dueAtSuggestion,
            dueAtConfidence,
            dueAtRationale,
            confirmedDueAt: (t as any).confirmedDueAt == null ? null : String((t as any).confirmedDueAt),
            systemTaskId: (t as any).systemTaskId == null ? null : String((t as any).systemTaskId),
            dismissed: Boolean((t as any).dismissed),
          };
        }
        return null;
      })
      .filter(Boolean);
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
        const err = await suggestRes.json().catch(() => ({} as any));
        throw new Error(err?.error || 'שגיאה בניתוח');
      }

      const suggestJson = (await suggestRes.json()) as {
        result?: any;
      };

      const aiResult = (suggestJson as any)?.result || {};

      const topicsRaw = (aiResult as any)?.topics || {};
      const normalizedTopics = {
        promises: Array.isArray(topicsRaw.promises) ? topicsRaw.promises : [],
        painPoints: Array.isArray(topicsRaw.painPoints) ? topicsRaw.painPoints : [],
        likes: Array.isArray(topicsRaw.likes) ? topicsRaw.likes : [],
        slang: Array.isArray(topicsRaw.slang) ? topicsRaw.slang : [],
        stories: Array.isArray(topicsRaw.stories) ? topicsRaw.stories : [],
        decisions: Array.isArray(topicsRaw.decisions) ? topicsRaw.decisions : [],
        tasks: normalizeTasks(topicsRaw.tasks),
      };

      const finalResult: CallAnalysisResult = {
        id: `analysis_${Date.now()}`,
        fileName: opts?.fileName ? String(opts.fileName) : 'Live',
        title: opts?.title ? String(opts.title) : (opts?.fileName ? String(opts.fileName) : 'שיחה חיה'),
        createdAt: new Date().toISOString(),
        audioUrl: opts?.audioUrl ? String(opts.audioUrl) : '',
        date: new Date().toISOString(),
        duration: '0:00',
        summary: String(aiResult.summary || ''),
        score: Number.isFinite(Number(aiResult.score)) ? Number(aiResult.score) : 0,
        intent: (aiResult.intent as any) || 'window_shopping',
        objections: Array.isArray(aiResult.objections) ? aiResult.objections : [],
        transcript: Array.isArray(aiResult.transcript) ? aiResult.transcript : [],
        topics: normalizedTopics as any,
        feedback: aiResult.feedback || { positive: [], improvements: [] },
        leadId: opts?.leadId == null ? undefined : String(opts.leadId),
      } as any;

      setHistory((prev) => [finalResult, ...prev]);
      setState((prev) => ({ ...prev, progress: 100, currentStep: 'הניתוח הושלם!', result: finalResult, isProcessing: false }));
    } catch (error: any) {
      console.error('Analysis error:', error);
      setState((prev) => ({ ...prev, isProcessing: false, currentStep: error?.message || 'שגיאה בניתוח', progress: 0 }));
    }
  };

  const startAnalysis = async (file: File) => {
    const audioUrl = URL.createObjectURL(file);
    abortControllerRef.current = new AbortController();

    setState({
      isProcessing: true,
      progress: 10,
      currentStep: 'מעלה קובץ ומתחיל ניתוח...',
      fileName: file.name,
      result: null
    });

    try {
      const orgSlug = getOrgSlugFromPath(pathname);
      if (!orgSlug) {
        throw new Error('חסר orgSlug בכתובת. נסה לרענן את הדף.');
      }

      setState((prev) => ({ ...prev, progress: 25, currentStep: 'מעלה קובץ לתמלול...' }));

      const fd = new FormData();
      fd.append('file', file);

      const transcribeRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`, {
        method: 'POST',
        body: fd,
        signal: abortControllerRef.current?.signal,
      });

      if (transcribeRes.status === 402) {
        const { outputsCount, savedHours } = inferSocialProof(history);
        setCreditsModal({ open: true, outputsCount, savedHours });
        setState((prev) => ({ ...prev, isProcessing: false, progress: 0, currentStep: 'נגמרו נקודות AI' }));
        return;
      }

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({} as any));
        throw new Error(err?.error || 'שגיאה בתמלול');
      }

      const transcribeJson = (await transcribeRes.json()) as {
        transcriptText: string;
      };

      const transcriptText = String(transcribeJson.transcriptText || '').trim();
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
        const err = await suggestRes.json().catch(() => ({} as any));
        throw new Error(err?.error || 'שגיאה בניתוח');
      }

      const suggestJson = (await suggestRes.json()) as {
        result?: any;
      };

      const aiResult = (suggestJson as any)?.result || {};

      const topicsRaw = (aiResult as any)?.topics || {};
      const normalizedTopics = {
        promises: Array.isArray(topicsRaw.promises) ? topicsRaw.promises : [],
        painPoints: Array.isArray(topicsRaw.painPoints) ? topicsRaw.painPoints : [],
        likes: Array.isArray(topicsRaw.likes) ? topicsRaw.likes : [],
        slang: Array.isArray(topicsRaw.slang) ? topicsRaw.slang : [],
        stories: Array.isArray(topicsRaw.stories) ? topicsRaw.stories : [],
        decisions: Array.isArray(topicsRaw.decisions) ? topicsRaw.decisions : [],
        tasks: normalizeTasks(topicsRaw.tasks),
      };

      const finalResult: CallAnalysisResult = {
        id: `analysis_${Date.now()}`,
        fileName: file.name,
        title: file.name,
        createdAt: new Date().toISOString(),
        audioUrl,
        date: new Date().toISOString(),
        duration: '0:00',
        summary: String(aiResult.summary || ''),
        score: Number.isFinite(Number(aiResult.score)) ? Number(aiResult.score) : 0,
        intent: (aiResult.intent as any) || 'window_shopping',
        objections: Array.isArray(aiResult.objections) ? aiResult.objections : [],
        transcript: Array.isArray(aiResult.transcript) ? aiResult.transcript : [],
        topics: normalizedTopics as any,
        feedback: aiResult.feedback || { positive: [], improvements: [] },
      } as any;

      setHistory((prev) => [finalResult, ...prev]);
      setState((prev) => ({ ...prev, progress: 100, currentStep: 'הניתוח הושלם!', result: finalResult, isProcessing: false }));
    } catch (error: any) {
      console.error('Analysis error:', error);
      setState((prev) => ({ ...prev, isProcessing: false, currentStep: error?.message || 'שגיאה בניתוח', progress: 0 }));
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
      result: null
    });
  };

  const resetAnalysis = () => {
    setState({
        isProcessing: false,
        progress: 0,
        currentStep: '',
        fileName: null,
        result: null
    });
  };

  const loadFromHistory = (result: CallAnalysisResult) => {
      setState({
          isProcessing: false,
          progress: 100,
          currentStep: 'Loaded from History',
          fileName: result.fileName || 'Unknown File',
          result: result
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

