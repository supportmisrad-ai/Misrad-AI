
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Check, Sparkles, Save, CircleAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { AIAnalysisResult, Priority } from '../types';
import { Skeleton } from '@/components/ui/skeletons';

interface VoiceRecorderProps {
  onClose: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onClose }) => {
  const { addVoiceTask, addToast } = useData();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const handleStreamSetup = (stream: MediaStream) => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      // Visualizer Setup - Only if AudioContext is allowed
      try {
          const AudioContextClass = (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext);
          if (AudioContextClass) {
              if (!audioContextRef.current) {
                  audioContextRef.current = new AudioContextClass();
              }
              if (audioContextRef.current.state === 'suspended') {
                 audioContextRef.current.resume();
              }
              
              analyserRef.current = audioContextRef.current.createAnalyser();
              sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
              sourceRef.current.connect(analyserRef.current);
              analyserRef.current.fftSize = 256;
              const bufferLength = analyserRef.current.frequencyBinCount;
              dataArrayRef.current = new Uint8Array(bufferLength);
              drawVisualizer();
          }
      } catch (e) {
          console.warn("Visualizer failed to initialize (minor issue)", e);
      }

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stopRecordingCleanup();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
  };

  const startSimulation = () => {
      setIsSimulation(true);
      addToast('מיקרופון לא נמצא - עבר למצב ללא מיקרופון', 'warning');
      try {
          const AudioContextClass = (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext);
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          
          const dest = ctx.createMediaStreamDestination();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.connect(gain);
          gain.connect(dest);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          
          osc.start();
          
          // Modulate sound to create visualizer movement
          simulationIntervalRef.current = window.setInterval(() => {
              if (ctx.state === 'closed') return;
              const time = ctx.currentTime;
              gain.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.4, time + 0.1);
              osc.frequency.linearRampToValueAtTime(150 + Math.random() * 200, time + 0.1);
          }, 200);

          handleStreamSetup(dest.stream);
      } catch (e) {
          console.error("Fallback audio setup failed", e);
          alert("לא ניתן לגשת למיקרופון.");
          onClose();
      }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      handleStreamSetup(stream);
    } catch (err: unknown) {
      console.warn('Error accessing microphone:', err);
      // Fallback to simulation if device not found (common in certain web containers or if no mic exists)
      const errObj = err instanceof DOMException ? err : (err instanceof Error ? err : null);
      const errName = errObj?.name || '';
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError' || errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          startSimulation();
      } else {
          alert('שגיאה בגישה למיקרופון: ' + (errObj?.message || 'שגיאה לא ידועה'));
          onClose();
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    
    // Safely close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
            audioContextRef.current.close();
        } catch (e) {
            console.error("Error closing AudioContext:", e);
        }
    }
    
    // Stop all tracks
    if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArrayRef.current! as Uint8Array<ArrayBuffer>);

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / dataArrayRef.current!.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArrayRef.current!.length; i++) {
        barHeight = dataArrayRef.current![i] / 2;

        const r = barHeight + 25 * (i / dataArrayRef.current!.length);
        const g = 250 * (i / dataArrayRef.current!.length);
        const b = 50;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSave = async () => {
    if (audioBlob) {
      setIsProcessing(true);
      
      try {
        let aiResult: AIAnalysisResult | undefined;

        // Marketing-safe: no client-side AI processing.
        await new Promise(resolve => setTimeout(resolve, 600));
        aiResult = {
          title: isSimulation ? 'משימה קולית חדשה (ללא מיקרופון)' : 'משימה קולית חדשה',
          description: 'נשמרה הקלטה. תמלול/AI ירוץ בצד שרת בגרסה הבאה.',
          priority: Priority.MEDIUM,
          tags: ['Voice'],
        };

        addVoiceTask(audioBlob, aiResult);
        onClose();

      } catch (error) {
        console.error("Error processing:", error);
        addVoiceTask(audioBlob);
        onClose();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-between py-12 px-6 backdrop-blur-xl">
      <button 
        onClick={onClose}
        disabled={isProcessing}
        className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 disabled:opacity-50"
        aria-label="סגור הקלטה"
      >
        <X size={32} />
      </button>

      <div className="flex flex-col items-center gap-4 mt-10">
        <h2 className="text-white text-2xl font-bold tracking-tight">הקלטת משימה</h2>
        {!isProcessing && (
            <div className="flex items-center gap-2 text-red-500 font-mono text-xl font-bold bg-red-500/10 px-4 py-1 rounded-full">
                <div className={`w-3 h-3 bg-red-500 rounded-full ${isRecording ? 'animate-pulse' : ''}`} />
                {formatTime(recordingTime)}
            </div>
        )}
        {isSimulation && (
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <CircleAlert size={12} /> מצב ללא מיקרופון
            </div>
        )}
      </div>

      <div className="w-full h-32 flex items-center justify-center my-8">
        {isProcessing ? (
             <div className="flex flex-col items-center gap-4">
                 <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                    <Sparkles size={64} className="text-blue-400 animate-pulse relative z-10" />
                 </div>
                 <p className="text-blue-200 text-sm font-medium animate-pulse">מפענח ומייצר משימה...</p>
             </div>
        ) : (
            /* Visualizer Canvas */
            <canvas 
                ref={canvasRef} 
                width={300} 
                height={100} 
                className="w-full h-full object-contain opacity-50 filter grayscale invert"
            />
        )}
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {isRecording ? (
           <div className="relative">
             <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping"></div>
             <button 
                onClick={stopRecording}
                className="relative w-24 h-24 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 border-4 border-red-800"
             >
                <Square size={32} fill="currentColor" />
             </button>
             <p className="text-white/60 text-center mt-4 text-sm font-medium">לחץ לסיום הקלטה</p>
           </div>
        ) : isProcessing ? (
            <div className="flex justify-center">
                <Skeleton className="w-12 h-12 rounded-full bg-white/20" />
            </div>
        ) : (
           <div className="flex gap-6 w-full justify-center">
             <button 
                onClick={onClose}
                className="flex-1 bg-gray-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
             >
               <X size={20} /> ביטול
             </button>
             <button 
                onClick={handleSave}
                className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all"
             >
               <Save size={24} /> שמור משימה
             </button>
           </div>
        )}
      </div>

      {!isProcessing && (
          <p className="text-white/30 text-xs mt-4 text-center">
            {isSimulation ? 'הקלטת דמה תיווצר לצורך הדגמה.' : 'המערכת תמיר את הקול שלך לטקסט ותפתח משימה חדשה.'}
          </p>
      )}
    </div>
  );
};
