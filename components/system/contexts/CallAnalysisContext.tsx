'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { CallAnalysisState, CallAnalysisResult } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface CallAnalysisContextType {
  state: CallAnalysisState;
  history: CallAnalysisResult[];
  startAnalysis: (file: File) => void;
  cancelAnalysis: () => void;
  resetAnalysis: () => void;
  loadFromHistory: (result: CallAnalysisResult) => void;
  deleteFromHistory: (id: string) => void;
  updateHistoryItem: (id: string, updates: Partial<CallAnalysisResult>) => void;
}

const CallAnalysisContext = createContext<CallAnalysisContextType | undefined>(undefined);

// Launch-safe: AI schema and client-side Gemini processing are disabled.

export const CallAnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CallAnalysisState>({
    isProcessing: false,
    progress: 0,
    currentStep: '',
    fileName: null,
    result: null
  });

  const [history, setHistory] = useLocalStorage<CallAnalysisResult[]>('call_analysis_history', []);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setState(prev => ({ ...prev, progress: 40, currentStep: 'מנתח שיחה (מושבת לערב השקה)...' }));
      await new Promise(resolve => setTimeout(resolve, 800));

      const finalResult: CallAnalysisResult = {
        id: `analysis_${Date.now()}`,
        fileName: file.name,
        title: file.name,
        createdAt: new Date().toISOString(),
        audioUrl,
        summary: 'ניתוח סימולציה לערב השקה: זוהו נקודות כאב מרכזיות והמלצות המשך. ניתוח AI מלא יופעל מהשרת אחרי ההשקה.',
        score: 78,
        intent: 'buying',
        transcript: [],
        topics: {
          promises: [],
          painPoints: [],
          likes: [],
          slang: [],
          stories: [],
          decisions: [],
          tasks: ['לקבוע שיחת המשך', 'לשלוח הצעת מחיר']
        } as any,
        feedback: {
          positive: ['טון שיחה מקצועי'],
          improvements: ['לחדד הצעת ערך בתחילת השיחה']
        } as any,
      } as any;

      setHistory(prev => [finalResult, ...prev]);
      setState(prev => ({ ...prev, progress: 100, currentStep: 'הניתוח הושלם!', result: finalResult, isProcessing: false }));
    } catch (error: any) {
      console.error('Analysis error:', error);
      setState(prev => ({ ...prev, isProcessing: false, currentStep: 'שגיאה בניתוח', progress: 0 }));
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
        resetAnalysis, loadFromHistory, deleteFromHistory, updateHistoryItem 
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

