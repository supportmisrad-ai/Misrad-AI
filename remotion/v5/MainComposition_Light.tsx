import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { V5_LIGHT, SCENES_LIGHT } from './config_light';
import { OpeningScene } from './scenes/OpeningScene';
import { ModulesDiveScene } from './scenes/ModulesDiveScene';
import { ProtocolRevealScene } from './scenes/ProtocolRevealScene';
import { CTAClosingScene } from './scenes/CTAClosingScene';
import { SubtitleLayer } from './components/SubtitleLayer';

const OpeningSceneLight: React.FC = () => {
  return (
    <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
      <OpeningScene />
    </div>
  );
};

const ModulesSceneLight: React.FC = () => {
  return (
    <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
      <ModulesDiveScene />
    </div>
  );
};

const RevealSceneLight: React.FC = () => {
  return (
    <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
      <ProtocolRevealScene />
    </div>
  );
};

const CTASceneLight: React.FC = () => {
  return (
    <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
      <CTAClosingScene />
    </div>
  );
};

const SubtitleLayerLight: React.FC = () => {
  return (
    <div style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
      <SubtitleLayer />
    </div>
  );
};

export const MainComposition_Light: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: V5_LIGHT.bg }}>
      <Sequence
        from={SCENES_LIGHT.opening.start}
        durationInFrames={SCENES_LIGHT.opening.duration}
      >
        <OpeningSceneLight />
      </Sequence>

      <Sequence
        from={SCENES_LIGHT.modules.start}
        durationInFrames={SCENES_LIGHT.modules.duration}
      >
        <ModulesSceneLight />
      </Sequence>

      <Sequence
        from={SCENES_LIGHT.reveal.start}
        durationInFrames={SCENES_LIGHT.reveal.duration}
      >
        <RevealSceneLight />
      </Sequence>

      <Sequence
        from={SCENES_LIGHT.cta.start}
        durationInFrames={SCENES_LIGHT.cta.duration}
      >
        <CTASceneLight />
      </Sequence>

      <SubtitleLayerLight />
    </AbsoluteFill>
  );
};
