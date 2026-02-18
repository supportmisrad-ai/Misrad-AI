import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { IMPACT, IMPACT_SCENES } from './config_impact';
import { ParticleShieldScene } from './scenes/impact/ParticleShieldScene';
import { ChaosFloodScene } from './scenes/impact/ChaosFloodScene';
import { DashboardRevealScene } from './scenes/impact/DashboardRevealScene';
import { ShieldCTAScene } from './scenes/impact/ShieldCTAScene';
import { SubtitleLayer_Impact } from './components/SubtitleLayer_Impact';

export const MainComposition_Impact: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: IMPACT.bgDeep }}>
      <Sequence
        from={IMPACT_SCENES.shield.start}
        durationInFrames={IMPACT_SCENES.shield.duration}
      >
        <ParticleShieldScene />
      </Sequence>

      <Sequence
        from={IMPACT_SCENES.chaos.start}
        durationInFrames={IMPACT_SCENES.chaos.duration}
      >
        <ChaosFloodScene />
      </Sequence>

      <Sequence
        from={IMPACT_SCENES.dashboard.start}
        durationInFrames={IMPACT_SCENES.dashboard.duration}
      >
        <DashboardRevealScene />
      </Sequence>

      <Sequence
        from={IMPACT_SCENES.cta.start}
        durationInFrames={IMPACT_SCENES.cta.duration}
      >
        <ShieldCTAScene />
      </Sequence>

      <SubtitleLayer_Impact />
    </AbsoluteFill>
  );
};
