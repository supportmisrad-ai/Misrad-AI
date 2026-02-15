'use client';

import React, { useEffect, useRef } from 'react';
import {
  Clock,
  Delete,
  GripHorizontal,
  MessageSquare,
  Mic,
  MicOff,
  Paperclip,
  Pause,
  Phone,
  PhoneOff,
  Play,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import type { CommunicationLead } from './types';

interface AISuggestion {
  title?: string;
  content?: string;
  [key: string]: unknown;
}

interface CommPhoneTabProps {
  isCalling: boolean;
  activeCall: CommunicationLead | null;
  callDuration: number;
  dialNumber: string;
  isMuted: boolean;
  isOnHold: boolean;
  transcript: { sender: string; text: string }[];
  aiSuggestions: AISuggestion[];
  isUploadingRecording: boolean;
  showUploadRecording: boolean;
  onSetDialNumber: (fn: (prev: string) => string) => void;
  onSetIsMuted: (fn: (prev: boolean) => boolean) => void;
  onSetIsOnHold: (fn: (prev: boolean) => boolean) => void;
  onHangup: () => void;
  onCall: (number?: string) => void;
  onUploadRecording: (file: File) => void;
}

const CommPhoneTab: React.FC<CommPhoneTabProps> = ({
  isCalling,
  activeCall,
  callDuration,
  dialNumber,
  isMuted,
  isOnHold,
  transcript,
  aiSuggestions,
  isUploadingRecording,
  showUploadRecording,
  onSetDialNumber,
  onSetIsMuted,
  onSetIsOnHold,
  onHangup,
  onCall,
  onUploadRecording,
}) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  if (isCalling && activeCall) {
    return (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 p-4 md:p-8 gap-8 overflow-y-auto">
        <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-200 p-8 shadow-inner">
          <div
            className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl font-bold mb-6 shadow-xl border-4 border-white ${
              isOnHold ? 'bg-amber-100 text-amber-500 animate-pulse' : 'bg-onyx-900 text-white'
            }`}
          >
            {activeCall.name.charAt(0)}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1 text-center">{activeCall.name}</h2>
          <p className="text-slate-500 font-mono text-lg mb-6">{activeCall.phone}</p>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-sm font-bold text-primary shadow-sm mb-12">
            <Clock size={16} /> {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
            <button
              onClick={() => onSetIsMuted((prev) => !prev)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
                isMuted ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              <span className="text-xs font-bold mt-2">השתק</span>
            </button>
            <button
              onClick={() => onSetIsOnHold((prev) => !prev)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
                isOnHold ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {isOnHold ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
              <span className="text-xs font-bold mt-2">המתנה</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all">
              <GripHorizontal size={24} />
              <span className="text-xs font-bold mt-2">מקשים</span>
            </button>
          </div>

          <button
            onClick={onHangup}
            className="mt-8 w-full max-w-sm bg-red-500 text-white font-bold py-4 rounded-2xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
          >
            <PhoneOff size={24} fill="currentColor" /> נתק שיחה
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" /> תמלול AI בזמן אמת
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 bg-slate-50 p-4 rounded-xl">
              {transcript.map((line, i) => (
                <div key={i} className={`flex ${line.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed font-medium ${
                      line.sender === 'agent' ? 'bg-onyx-800 text-white' : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                    }`}
                  >
                    <span className="font-black block mb-1 opacity-70 text-[9px] uppercase tracking-wider">{line.sender === 'agent' ? 'אני (סוכן)' : 'לקוח'}</span>
                    {line.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef}></div>
            </div>
          </div>

          <div className="h-1/3 bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-3xl p-6 shadow-sm overflow-y-auto min-h-[150px]">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Zap size={18} className="text-primary" /> המלצות טקטיות (Nexus AI)
            </h3>
            <div className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex gap-3 animate-scale-in">
                  <div className="mt-0.5 text-amber-500">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{s.title}</div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">{s.content}</div>
                  </div>
                </div>
              ))}
              {aiSuggestions.length === 0 && <p className="text-xs text-slate-400 text-center mt-4 font-bold">המערכת מאזינה ומנתחת התנגדויות...</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/30">
      <div className="w-full max-w-sm bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200">
        {showUploadRecording ? (
          <div className="mb-5 flex justify-center">
            <label
              className={`px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black cursor-pointer ${
                isUploadingRecording ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {isUploadingRecording ? (
                <>
                  <Skeleton className="inline-block ml-2 w-4 h-4 rounded-full" /> מעבד...
                </>
              ) : (
                <>
                  <Paperclip size={16} className="inline-block ml-2" /> העלה הקלטה
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = '';
                  if (!f) return;
                  onUploadRecording(f);
                }}
              />
            </label>
          </div>
        ) : null}
        <div className="mb-8 relative">
          <input
            type="text"
            readOnly
            value={dialNumber}
            placeholder="חייג מספר..."
            dir="ltr"
            className="w-full text-4xl font-mono text-center bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-200 h-16 font-black tracking-wider"
          />
          {dialNumber && (
            <button
              onClick={() => onSetDialNumber((prev) => prev.slice(0, -1))}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Delete size={24} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
            <button
              key={d}
              onClick={() => onSetDialNumber((prev) => prev + d)}
              className="h-16 rounded-full bg-slate-50 shadow-sm border border-slate-100 text-2xl font-bold text-slate-700 hover:bg-white hover:border-rose-200 hover:text-primary active:scale-95 transition-all flex items-center justify-center"
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => onCall()}
            disabled={!dialNumber}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl text-white transition-all transform hover:scale-105 active:scale-95 ${
              dialNumber ? 'bg-emerald-50 hover:bg-emerald-600 shadow-emerald-200' : 'bg-slate-200 cursor-not-allowed'
            }`}
          >
            <Phone size={32} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommPhoneTab;
