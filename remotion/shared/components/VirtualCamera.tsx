import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { SPRING } from '../config';

/**
 * Virtual 3D Camera wrapper.
 * Applies perspective, dolly/truck/crane movements, and depth-of-field simulation.
 * 
 * Usage:
 *   <VirtualCamera zoom={1.2} panX={-50} panY={20} rotateY={2} dofBlur={8}>
 *     <YourScene />
 *   </VirtualCamera>
 */
interface CameraKeyframe {
  frame: number;
  zoom?: number;
  panX?: number;
  panY?: number;
  rotateX?: number;
  rotateY?: number;
}

export const VirtualCamera: React.FC<{
  children: React.ReactNode;
  perspective?: number;
  /** Static or animated zoom (1 = 100%) */
  zoom?: number;
  panX?: number;
  panY?: number;
  rotateX?: number;
  rotateY?: number;
  /** Keyframe-based camera path (overrides static values) */
  keyframes?: CameraKeyframe[];
  /** Background blur for DoF simulation (px) */
  dofBlur?: number;
}> = ({
  children,
  perspective = 1200,
  zoom = 1,
  panX = 0,
  panY = 0,
  rotateX = 0,
  rotateY = 0,
  keyframes,
  dofBlur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let currentZoom = zoom;
  let currentPanX = panX;
  let currentPanY = panY;
  let currentRotateX = rotateX;
  let currentRotateY = rotateY;

  // Interpolate between keyframes if provided
  if (keyframes && keyframes.length >= 2) {
    const frames = keyframes.map((k) => k.frame);
    const zooms = keyframes.map((k) => k.zoom ?? 1);
    const panXs = keyframes.map((k) => k.panX ?? 0);
    const panYs = keyframes.map((k) => k.panY ?? 0);
    const rotXs = keyframes.map((k) => k.rotateX ?? 0);
    const rotYs = keyframes.map((k) => k.rotateY ?? 0);

    currentZoom = interpolate(frame, frames, zooms, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    currentPanX = interpolate(frame, frames, panXs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    currentPanY = interpolate(frame, frames, panYs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    currentRotateX = interpolate(frame, frames, rotXs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    currentRotateY = interpolate(frame, frames, rotYs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }

  // Smooth camera entrance via spring
  const smoothFactor = spring({
    frame,
    fps,
    config: SPRING.camera,
    durationInFrames: 30,
  });

  const effectiveZoom = 1 + (currentZoom - 1) * smoothFactor;
  const effectivePanX = currentPanX * smoothFactor;
  const effectivePanY = currentPanY * smoothFactor;

  const transform = [
    `perspective(${perspective}px)`,
    `scale(${effectiveZoom})`,
    `translate3d(${effectivePanX}px, ${effectivePanY}px, 0)`,
    `rotateX(${currentRotateX * smoothFactor}deg)`,
    `rotateY(${currentRotateY * smoothFactor}deg)`,
  ].join(' ');

  return (
    <AbsoluteFill
      style={{
        perspective: `${perspective}px`,
        transformStyle: 'preserve-3d',
      }}
    >
      <AbsoluteFill
        style={{
          transform,
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Depth of Field — vignette blur overlay */}
      {dofBlur && dofBlur > 0 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            zIndex: 100,
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.01) 60%, rgba(0,0,0,0.03) 100%)`,
            backdropFilter: `blur(${dofBlur * 0.3}px)`,
            WebkitBackdropFilter: `blur(${dofBlur * 0.3}px)`,
            mask: 'radial-gradient(ellipse 55% 45% at 50% 50%, transparent 30%, black 100%)',
            WebkitMask: 'radial-gradient(ellipse 55% 45% at 50% 50%, transparent 30%, black 100%)',
          }}
        />
      )}
    </AbsoluteFill>
  );
};
