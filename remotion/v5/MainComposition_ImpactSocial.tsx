import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { S, SS } from './config_impact_social';
import { GlitchRevealScene } from './scenes/impact_social/GlitchRevealScene';
import { PainStackScene } from './scenes/impact_social/PainStackScene';
import { AIBrainScene } from './scenes/impact_social/AIBrainScene';
import { ImpactCTAScene } from './scenes/impact_social/ImpactCTAScene';

export const MainComposition_ImpactSocial: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: S.bg }}>
      <Sequence from={SS.glitch.start} durationInFrames={SS.glitch.duration}>
        <GlitchRevealScene />
      </Sequence>

      <Sequence from={SS.pain.start} durationInFrames={SS.pain.duration}>
        <PainStackScene />
      </Sequence>

      <Sequence from={SS.brain.start} durationInFrames={SS.brain.duration}>
        <AIBrainScene />
      </Sequence>

      <Sequence from={SS.cta.start} durationInFrames={SS.cta.duration}>
        <ImpactCTAScene />
      </Sequence>

      {/* Background music */}
      <Audio
        src={staticFile('audio/bg-social.wav')}
        volume={(f) =>
          f < 30  ? f / 30 * 0.58 :          // fade in over 1s
          f > 870 ? (900 - f) / 30 * 0.58 :  // fade out over 1s
          0.58                                 // boosted mix volume
        }
      />
    </AbsoluteFill>
  );
};
