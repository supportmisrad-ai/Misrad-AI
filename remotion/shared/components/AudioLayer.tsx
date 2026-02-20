import React from 'react';
import { Audio, interpolate, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

/**
 * AudioLayer — Background music with automatic fade-in/out.
 * Place audio files in public/audio/music/.
 */
export const AudioLayer: React.FC<{
  src: string;
  volume?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  startFrom?: number;
  playbackRate?: number;
}> = ({
  src,
  volume = 0.15,
  fadeInFrames = 30,
  fadeOutFrames = 45,
  startFrom = 0,
  playbackRate = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );

  const dynamicVolume = volume * fadeIn * fadeOut;

  return (
    <Audio
      src={staticFile(src)}
      volume={dynamicVolume}
      startFrom={startFrom}
      playbackRate={playbackRate}
    />
  );
};
