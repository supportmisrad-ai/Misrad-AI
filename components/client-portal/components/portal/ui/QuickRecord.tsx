'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic2, Square, Play, Trash2, Send, Loader2, Brain } from 'lucide-react';
import { getClientOsOrgId } from '../../../lib/getOrgId';

interface QuickRecordProps {
  clientId: string;
  phaseId?: string;
  templateId?: string;
  onSuccess?: (meetingId: string) => void;
}

export const QuickRecord: React.FC<QuickRecordProps> = ({ clientId, phaseId, templateId, onSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'uploading' | 'analyzing'>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus('recorded');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'לא ניתן לגשת למיקרופון', type: 'error' } 
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    setStatus('uploading');
    
    try {
      const orgId = getClientOsOrgId();
      if (!orgId) throw new Error('No organization ID');

      // 1. Upload to storage (mock logic for now as we don't have the direct storage action here)
      // In a real scenario, we'd call a server action to upload to Supabase/S3
      
      // 2. Trigger analysis
      // This is where we'd call analyzeAndStoreMeeting
      
      setStatus('analyzing');
      
      // Simulated delay for AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'המפגש הוקלט ונותח בהצלחה!', type: 'success' } 
      }));
      
      if (onSuccess) onSuccess('mock-id');
      reset();
    } catch (err) {
      console.error('Upload failed:', err);
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'העלאה נכשלה. נסה שוב.', type: 'error' } 
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setStatus('idle');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 transition-all hover:shadow-md">
      {status === 'idle' && (
        <>
          <button 
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm"
          >
            <Mic2 size={24} />
          </button>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 leading-tight">הקלטה מהירה</h4>
            <p className="text-[10px] text-gray-400 font-medium">הקלט סיכום קולי או מפגש קצר</p>
          </div>
        </>
      )}

      {status === 'recording' && (
        <>
          <button 
            onClick={stopRecording}
            className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center animate-pulse shadow-lg"
          >
            <Square size={20} fill="currentColor" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-sm font-mono font-bold text-gray-900">{formatTime(recordingTime)}</span>
            </div>
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">מקליט כעת...</p>
          </div>
        </>
      )}

      {status === 'recorded' && (
        <>
          <div className="flex gap-2">
            <button 
              onClick={reset}
              className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={handleUpload}
              className="px-4 h-10 rounded-xl bg-nexus-primary text-white flex items-center gap-2 font-bold text-sm shadow-sm hover:opacity-95 transition-all"
            >
              <Send size={16} /> שלח לפיצוח AI
            </button>
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-mono font-bold text-gray-900">{formatTime(recordingTime)}</div>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">מוכן לשליחה</p>
          </div>
        </>
      )}

      {(status === 'uploading' || status === 'analyzing') && (
        <>
          <div className="w-12 h-12 rounded-full bg-nexus-primary/10 text-nexus-primary flex items-center justify-center">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Brain size={14} className="text-nexus-primary" />
              {status === 'uploading' ? 'מעלה קובץ...' : 'ה-AI מנתח את הפגישה...'}
            </h4>
            <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-nexus-primary animate-progress-indefinite"></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
