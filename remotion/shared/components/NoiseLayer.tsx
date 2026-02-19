import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

/**
 * Anti-banding film grain overlay.
 * Renders a subtle noise texture (1-2%) over gradients and light backgrounds
 * to eliminate color banding in 8-bit renders.
 * 
 * Place as the LAST child inside any container with gradients.
 */
export const NoiseLayer: React.FC<{
  opacity?: number;
  animated?: boolean;
}> = ({ opacity = 0.025, animated = true }) => {
  const frame = useCurrentFrame();

  // Generate a unique seed per frame for animated grain
  const seed = animated ? frame : 0;

  const svgFilter = useMemo(() => {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">
        <filter id="grain-${seed}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            seed="${seed}"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
    `;
  }, [seed]);

  const dataUri = useMemo(
    () =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFilter.trim())}`,
    [svgFilter],
  );

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'overlay',
        opacity,
      }}
    >
      {/* SVG filter definition */}
      <div
        style={{ position: 'absolute', width: 0, height: 0 }}
        dangerouslySetInnerHTML={{ __html: svgFilter }}
      />
      {/* Noise fill */}
      <div
        style={{
          width: '100%',
          height: '100%',
          filter: `url(#grain-${seed})`,
        }}
      />
    </AbsoluteFill>
  );
};
