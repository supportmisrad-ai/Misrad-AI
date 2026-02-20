import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';

/**
 * SFXTrigger — Plays a sound effect at a specific frame.
 * Place SFX files in public/audio/sfx/.
 */
export const SFXTrigger: React.FC<{
  src: string;
  frame: number;
  volume?: number;
  durationInFrames?: number;
}> = ({ src, frame: triggerFrame, volume = 0.4, durationInFrames = 30 }) => (
  <Sequence from={triggerFrame} durationInFrames={durationInFrames}>
    <Audio src={staticFile(src)} volume={volume} />
  </Sequence>
);

/**
 * SFXLayer — Renders multiple sound effects at their designated frames.
 * Example usage:
 *   <SFXLayer effects={[
 *     { src: 'audio/sfx/whoosh.mp3', frame: 0 },
 *     { src: 'audio/sfx/pop.mp3', frame: 90, volume: 0.3 },
 *     { src: 'audio/sfx/success.mp3', frame: 1500, volume: 0.5 },
 *   ]} />
 */
export const SFXLayer: React.FC<{
  effects: Array<{
    src: string;
    frame: number;
    volume?: number;
    durationInFrames?: number;
  }>;
}> = ({ effects }) => (
  <>
    {effects.map((fx, i) => (
      <SFXTrigger
        key={`${fx.src}-${fx.frame}-${i}`}
        src={fx.src}
        frame={fx.frame}
        volume={fx.volume}
        durationInFrames={fx.durationInFrames}
      />
    ))}
  </>
);
