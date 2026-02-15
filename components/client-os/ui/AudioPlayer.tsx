'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';

interface AudioPlayerProps {
  src?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Mock duration for demo if no src
    useEffect(() => {
        if (!src) setDuration(135); // 2:15 mock duration
    }, [src]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const togglePlay = () => {
        if (audioRef.current && src) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        } else {
            // Mock Playback
            setIsPlaying(!isPlaying);
        }
    };

    // Mock progress interval
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isPlaying && !src) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, src, duration]);

    return (
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex items-center gap-6 shadow-luxury border border-white/5">
            {src && <audio ref={audioRef} src={src} onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />}
            
            <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg active:scale-[0.95]">
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>

            <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between text-[11px] font-black text-slate-500 tracking-widest uppercase">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group">
                    <motion.div 
                        className="h-full bg-primary" 
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 text-slate-500">
                <button className="p-2 hover:text-white transition-colors"><Rewind size={20} /></button>
                <button className="p-2 hover:text-white transition-colors"><FastForward size={20} /></button>
            </div>
        </div>
    );
};
