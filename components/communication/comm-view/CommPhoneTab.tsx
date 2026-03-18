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
    const node = transcriptEndRef.current;
    if (!node) return;

    // Use instant scrolling for very long transcripts to avoid jank
    const behavior = transcript.length > 100 ? 'auto' : 'smooth';
    node.scrollIntoView({ behavior });
  }, [transcript]);

    if (isCalling && activeCall) {
    return (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 p-4 md:p-6 gap-6 overflow-y-auto">
        <div className="flex flex-col items-center justify-center pt-4 md:pt-0">
          {/* Avatar & Info - Clean & Centered */}
          <div className="relative mb-6">
            <div
              className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-5xl font-medium border border-slate-100 ${
                isOnHold ? 'bg-amber-50 text-amber-500 animate-pulse' : 'bg-slate-50 text-slate-700'
              }`}
            >
              {activeCall.name.charAt(0)}
            </div>
            {isOnHold && (
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-full border-4 border-white">
                <Pause size={20} fill="currentColor" />
              </div>
            )}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 text-center tracking-tight">{activeCall.name}</h2>
          <p className="text-slate-500 text-lg mb-6 font-medium">{activeCall.phone}</p>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-slate-500 border border-slate-200 mb-10">
            <Clock size={14} /> {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </div>

          {/* Call Controls - Minimalist */}
          <div className="flex flex-col items-center gap-8 w-full max-w-sm">
            <div className="grid grid-cols-3 gap-6 w-full px-4">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onSetIsMuted((prev) => !prev)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
                    isMuted ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <span className="text-[11px] font-bold text-slate-400">השתק</span>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <button className="w-14 h-14 rounded-full flex items-center justify-center bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">
                  <GripHorizontal size={24} />
                </button>
                <span className="text-[11px] font-bold text-slate-400">מקשים</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onSetIsOnHold((prev) => !prev)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
                    isOnHold ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isOnHold ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                </button>
                <span className="text-[11px] font-bold text-slate-400">המתנה</span>
              </div>
            </div>

            <button
              onClick={onHangup}
              className="w-16 h-16 rounded-full bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-red-100"
            >
              <PhoneOff size={28} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Right Side: AI & Transcript - Minimalist Cards */}
        <div className="flex flex-col gap-4 pt-4 lg:pt-0">
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col overflow-hidden min-h-[300px]">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
              <MessageSquare size={14} className="text-indigo-500" /> תמלול שיחה
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {transcript.map((line, i) => (
                <div key={i} className={`flex ${line.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed ${
                      line.sender === 'agent' ? 'bg-slate-50 text-slate-600 rounded-tl-none' : 'bg-indigo-50 text-indigo-900 rounded-tr-none'
                    }`}
                  >
                    {line.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef}></div>
            </div>
          </div>

          <div className="h-1/3 bg-rose-50/30 border border-rose-100 rounded-2xl p-4 overflow-y-auto min-h-[150px]">
            <h3 className="font-bold text-rose-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
              <Zap size={14} className="text-rose-500" /> המלצות Nexus
            </h3>
            <div className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-rose-100/50 shadow-sm flex gap-3 animate-scale-in">
                  <div className="mt-0.5 text-rose-500">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{s.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.content}</div>
                  </div>
                </div>
              ))}
              {aiSuggestions.length === 0 && <p className="text-xs text-slate-400/70 text-center mt-4 font-bold">ממתין לתובנות...</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent overflow-hidden">
      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col px-4 py-2 relative">
        {/* Upload Recording Button - Discreet Icon (Top Left) */}
        {showUploadRecording && (
          <div className="absolute top-2 left-6 z-20">
            <label
              className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer ${
                isUploadingRecording ? 'opacity-50 pointer-events-none' : ''
              }`}
              title="העלה הקלטה"
            >
              {isUploadingRecording ? (
                <Skeleton className="w-4 h-4 rounded-full" />
              ) : (
                <Paperclip size={20} />
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
        )}

        {/* Display Area */}
        <div className="shrink-0 py-4 md:py-8 relative text-center mt-4">
          <input
            type="text"
            readOnly
            value={dialNumber}
            placeholder="חייג מספר..."
            dir="ltr"
            className="w-full text-4xl md:text-5xl font-mono text-center bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-300 font-bold tracking-widest h-16 md:h-20"
          />
          {dialNumber && (
            <button
              onClick={() => onSetDialNumber((prev) => prev.slice(0, -1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-slate-50"
            >
              <Delete size={24} />
            </button>
          )}
        </div>

        {/* Keypad Area - Grow to fill space */}
        <div className="flex-1 flex flex-col justify-center min-h-0" dir="ltr">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4 md:gap-6 w-full max-w-[300px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
              <button
                key={d}
                onClick={() => onSetDialNumber((prev) => prev + d)}
                className="aspect-square rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-2xl font-medium text-slate-700 transition-all flex items-center justify-center select-none active:scale-95 border border-transparent hover:border-slate-200"
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Call Button Area */}
        <div className="shrink-0 py-6 md:py-8 flex justify-center">
          <button
            onClick={() => onCall()}
            disabled={!dialNumber}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg text-white transition-all transform hover:scale-105 active:scale-95 ${
              dialNumber ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 ring-4 ring-emerald-50' : 'bg-slate-200 cursor-not-allowed'
            }`}
          >
            <Phone size={28} className="md:w-8 md:h-8" fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommPhoneTab;
