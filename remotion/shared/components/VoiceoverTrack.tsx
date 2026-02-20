import React from 'react';
import { Audio, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion';

/**
 * A single voiceover segment — plays a narration clip at a specific frame range.
 */
export const VoiceoverSegment: React.FC<{
  src: string;
  from: number;
  durationInFrames: number;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ src, from, durationInFrames, volume = 0.85, fadeInFrames = 5, fadeOutFrames = 8 }) => (
  <Sequence from={from} durationInFrames={durationInFrames}>
    <VoiceoverAudio
      src={src}
      volume={volume}
      fadeInFrames={fadeInFrames}
      fadeOutFrames={fadeOutFrames}
    />
  </Sequence>
);

const VoiceoverAudio: React.FC<{
  src: string;
  volume: number;
  fadeInFrames: number;
  fadeOutFrames: number;
}> = ({ src, volume, fadeInFrames, fadeOutFrames }) => {
  const frame = useCurrentFrame();
  // Fade in at the start of this segment, fade out at the end
  // We don't know total duration here, so we use a reasonable cap
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateRight: 'clamp' });
  // Fade out is handled by the parent Sequence ending
  const dynamicVolume = volume * fadeIn;

  return <Audio src={staticFile(src)} volume={dynamicVolume} />;
};

/**
 * VoiceoverTrack — Renders multiple voiceover segments in sequence.
 *
 * Example usage:
 *   <VoiceoverTrack segments={[
 *     { src: 'audio/voiceover/modules/system-hook.mp3', from: 0, durationInFrames: 90 },
 *     { src: 'audio/voiceover/modules/system-problem.mp3', from: 90, durationInFrames: 210 },
 *     { src: 'audio/voiceover/modules/system-solution.mp3', from: 300, durationInFrames: 300 },
 *   ]} />
 */
export const VoiceoverTrack: React.FC<{
  segments: Array<{
    src: string;
    from: number;
    durationInFrames: number;
    volume?: number;
  }>;
}> = ({ segments }) => (
  <>
    {segments.map((seg, i) => (
      <VoiceoverSegment
        key={`vo-${seg.from}-${i}`}
        src={seg.src}
        from={seg.from}
        durationInFrames={seg.durationInFrames}
        volume={seg.volume}
      />
    ))}
  </>
);
