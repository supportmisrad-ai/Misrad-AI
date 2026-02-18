import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { HookScene } from '../scenes/HookScene';
import { ProblemScene } from '../scenes/ProblemScene';
import { SolutionScene } from '../scenes/SolutionScene';
import { FeaturesScene } from '../scenes/FeaturesScene';
import { CTAScene } from '../scenes/CTAScene';
import { TIMING } from '../config';

export const MisradAIPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#09090B' }}>
      <Sequence from={TIMING.scenes.hook.start} durationInFrames={TIMING.scenes.hook.duration}>
        <HookScene />
      </Sequence>
      
      <Sequence from={TIMING.scenes.problem.start} durationInFrames={TIMING.scenes.problem.duration}>
        <ProblemScene />
      </Sequence>
      
      <Sequence from={TIMING.scenes.solution.start} durationInFrames={TIMING.scenes.solution.duration}>
        <SolutionScene />
      </Sequence>
      
      <Sequence from={TIMING.scenes.features.start} durationInFrames={TIMING.scenes.features.duration}>
        <FeaturesScene />
      </Sequence>
      
      <Sequence from={TIMING.scenes.cta.start} durationInFrames={TIMING.scenes.cta.duration}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
