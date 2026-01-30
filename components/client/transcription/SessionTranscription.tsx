'use client';

import React, { useState } from 'react';
import { Mic, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../../system/contexts/ToastContext';
import { Skeleton } from '@/components/ui/skeletons';

/**
 * Session Transcription Component
 * 
 * Killer Feature: תמלול פגישות עם Whisper API
 * - העלאת אודיו/וידאו
 * - תמלול אוטומטי
 * - יצירת סיכומים ותובנות עם LLM
 */
const SessionTranscription: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { addToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[]>([]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      addToast('נא להעלות קובץ אודיו או וידאו', 'error');
      return;
    }

    setIsProcessing(true);
    addToast('מתחיל תמלול... זה עשוי לקחת כמה דקות', 'info');

    try {
      // TODO: Implement Whisper API integration
      // 1. Upload file to storage
      // 2. Call Whisper API for transcription
      // 3. Call LLM for summary and insights
      
      // Mock implementation
      setTimeout(() => {
        setTranscription('תמלול דוגמה: הלקוח דיבר על חרדה חברתית...');
        setSummary('סיכום: בפגישה דנו בחרדה חברתית. הוסכם על תרגילים...');
        setInsights(['שיפור משמעותי בביטחון עצמי', 'צריך להתמקד בניהול זמן']);
        setIsProcessing(false);
        addToast('תמלול הושלם בהצלחה!', 'success');
      }, 3000);
    } catch (error) {
      console.error('Transcription error:', error);
      addToast('שגיאה בתמלול', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center border border-white/10 shadow-sm">
            <Mic className="text-[#C5A572]" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">תמלול פגישה</h3>
            <p className="text-sm text-slate-500">העלה קובץ אודיו או וידאו לתמלול אוטומטי</p>
          </div>
        </div>

        <input
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          disabled={isProcessing}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        />

        {isProcessing && (
          <div className="mt-4 flex items-center gap-3 text-[#0F172A]">
            <Skeleton className="w-5 h-5 rounded-full bg-[#C5A572]/30" />
            <span className="text-sm font-medium">מעבד תמלול...</span>
          </div>
        )}
      </div>

      {transcription && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-[#C5A572]" size={20} />
            <h3 className="text-lg font-bold text-slate-900">תמלול</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
            {transcription}
          </div>
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-[#C5A572]" size={20} />
            <h3 className="text-lg font-bold text-slate-900">סיכום אוטומטי</h3>
          </div>
          <div className="bg-[#0F172A]/5 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
            {summary}
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-[#C5A572]" size={20} />
            <h3 className="text-lg font-bold text-slate-900">תובנות</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div key={index} className="bg-[#0F172A]/5 rounded-xl p-3 text-sm text-slate-700">
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>איך זה עובד?</strong> המערכת משתמשת ב-Whisper API לתמלול ו-LLM ליצירת סיכומים ותובנות אוטומטיות.
        </p>
      </div>
    </div>
  );
};

export default SessionTranscription;

