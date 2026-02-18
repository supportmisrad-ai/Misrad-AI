import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { V5, SCENES } from './config';
import { OpeningScene } from './scenes/OpeningScene';
import { ModulesDiveScene } from './scenes/ModulesDiveScene';
import { ProtocolRevealScene } from './scenes/ProtocolRevealScene';
import { CTAClosingScene } from './scenes/CTAClosingScene';
import { SubtitleLayer } from './components/SubtitleLayer';

export const MainComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: V5.bgDeep }}>
      <Sequence
        from={SCENES.opening.start}
        durationInFrames={SCENES.opening.duration}
      >
        <OpeningScene />
      </Sequence>

      <Sequence
        from={SCENES.modules.start}
        durationInFrames={SCENES.modules.duration}
      >
        <ModulesDiveScene />
      </Sequence>

      <Sequence
        from={SCENES.reveal.start}
        durationInFrames={SCENES.reveal.duration}
      >
        <ProtocolRevealScene />
      </Sequence>

      <Sequence
        from={SCENES.cta.start}
        durationInFrames={SCENES.cta.duration}
      >
        <CTAClosingScene />
      </Sequence>

      <SubtitleLayer />
    </AbsoluteFill>
  );
};
