import React from 'react';
import { Composition } from 'remotion';
import { SystemVideo } from './modules/system/SystemVideo';
import { FPS, SOCIAL_WIDTH, SOCIAL_HEIGHT, TV_WIDTH, TV_HEIGHT } from './shared/config';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* A1: System (מכירות) — Social 9:16 */}
      <Composition
        id="System-Social"
        component={SystemVideo}
        durationInFrames={18 * FPS}
        fps={FPS}
        width={SOCIAL_WIDTH}
        height={SOCIAL_HEIGHT}
        defaultProps={{}}
      />
      {/* A1: System (מכירות) — TV 16:9 */}
      <Composition
        id="System-TV"
        component={SystemVideo}
        durationInFrames={18 * FPS}
        fps={FPS}
        width={TV_WIDTH}
        height={TV_HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};
