import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';

interface AudioPlayerProps {
  src?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!src) setDuration(135);
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
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isPlaying && !src) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
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
    <div className="bg-nexus-primary text-white p-4 rounded-xl flex items-center gap-4 shadow-lg">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}

      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-white text-nexus-primary flex items-center justify-center hover:bg-nexus-accent hover:text-white transition-all"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-bold text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative group">
          <div className="h-full bg-nexus-accent transition-all duration-300" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-gray-400">
        <button className="p-1 hover:text-white">
          <Rewind size={16} />
        </button>
        <button className="p-1 hover:text-white">
          <FastForward size={16} />
        </button>
      </div>
    </div>
  );
};
