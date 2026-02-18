import React from 'react';
import { useCurrentFrame, interpolate, staticFile, OffthreadVideo } from 'remotion';
import { V5 } from '../config';

interface ClayVideoSlotProps {
  src: string;
  startFrame: number;
  durationFrames: number;
  maxOpacity?: number;
  scale?: number;
  width?: number;
  height?: number;
  position?: {
    top?: string | number;
    left?: string | number;
    right?: string | number;
    bottom?: string | number;
  };
  useVideo?: boolean;
}

export const ClayVideoSlot: React.FC<ClayVideoSlotProps> = ({
  src,
  startFrame,
  durationFrames,
  maxOpacity = 0.2,
  scale = 1,
  width = 380,
  height = 280,
  position = { top: '50%', left: '50%' },
  useVideo = false,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame > durationFrames) return null;

  const fadeIn = interpolate(localFrame, [0, 25], [0, maxOpacity], {
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    localFrame,
    [durationFrames - 25, durationFrames],
    [maxOpacity, 0],
    { extrapolateRight: 'clamp' }
  );
  const currentOpacity = Math.min(fadeIn, fadeOut);

  const breathe = 1 + Math.sin(localFrame * 0.04) * 0.015;

  return (
    <div
      style={{
        position: 'absolute',
        ...position,
        transform: `translate(-50%, -50%) scale(${scale * breathe})`,
        width,
        height,
        borderRadius: 28,
        overflow: 'hidden',
        opacity: currentOpacity,
      }}
    >
      {useVideo ? (
        <OffthreadVideo
          src={staticFile(src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `radial-gradient(ellipse at center, ${V5.primary}30 0%, ${V5.bgDeep} 85%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1.5px dashed ${V5.primary}40`,
            borderRadius: 28,
          }}
        >
          <p
            style={{
              color: `${V5.primary}90`,
              fontSize: 13,
              fontFamily: 'monospace',
              textAlign: 'center',
              padding: 24,
              lineHeight: 1.6,
            }}
          >
            OPAL CLAY{'\n'}{src}
          </p>
        </div>
      )}
    </div>
  );
};
