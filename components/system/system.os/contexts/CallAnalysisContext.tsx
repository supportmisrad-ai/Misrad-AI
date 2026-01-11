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

// Launch-safe: client-side Gemini is disabled.

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
        audioUrl,
        date: new Date().toISOString(),
        duration: '0:00',
        summary: 'ניתוח סימולציה לערב השקה. ניתוח AI מלא יופעל מהשרת אחרי ההשקה.',
        score: 78,
        intent: 'buying',
        transcript: [],
        topics: { promises: [], painPoints: [], likes: [], slang: [], stories: [], decisions: [], tasks: ['לקבוע שיחת המשך'] } as any,
        feedback: { positive: ['טון מקצועי'], improvements: ['לחדד הצעת ערך'] } as any,
      } as any;

      setHistory(prev => [finalResult, ...prev]);
      setState({ isProcessing: false, progress: 100, currentStep: 'הושלם', fileName: file.name, result: finalResult });
    } catch (error) {
      console.error('Analysis failed:', error);
      setState({ isProcessing: false, progress: 0, currentStep: 'שגיאה בניתוח הקובץ', fileName: null, result: null });
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