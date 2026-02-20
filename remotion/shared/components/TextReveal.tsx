import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SPRING, HEEBO } from '../config';

/**
 * Cinematic Hebrew RTL text reveal with per-character stagger.
 * Supports headline and subtitle variants.
 */
export const TextReveal: React.FC<{
  text: string;
  /** Delay entrance by N frames */
  delay?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  /** 'chars' = per character stagger, 'words' = per word, 'line' = whole line */
  mode?: 'chars' | 'words' | 'line';
  /** Stagger delay between units (frames) */
  stagger?: number;
  style?: React.CSSProperties;
}> = ({
  text,
  delay = 0,
  fontSize = 64,
  fontWeight = 900,
  color = '#FAFAFA',
  mode = 'words',
  stagger = 2,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  if (mode === 'line') {
    const progress = spring({
      frame: adjustedFrame,
      fps,
      config: SPRING.hero,
      durationInFrames: 20,
    });

    const y = interpolate(progress, [0, 1], [40, 0]);
    const blur = interpolate(progress, [0, 1], [8, 0]);

    return (
      <div
        style={{
          fontFamily: HEEBO,
          fontSize,
          fontWeight,
          color,
          direction: 'rtl',
          textAlign: 'right',
          transform: `translateY(${y}px)`,
          filter: `blur(${blur}px)`,
          opacity: progress,
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          willChange: 'transform, filter, opacity',
          ...style,
        }}
      >
        {text}
      </div>
    );
  }

  const units = mode === 'chars' ? text.split('') : text.split(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        direction: 'rtl',
        justifyContent: 'flex-start',
        gap: mode === 'chars' ? 0 : fontSize * 0.25,
        ...style,
      }}
    >
      {units.map((unit, i) => {
        const unitDelay = i * stagger;
        const progress = spring({
          frame: Math.max(0, adjustedFrame - unitDelay),
          fps,
          config: SPRING.punch,
          durationInFrames: 15,
        });

        const y = interpolate(progress, [0, 1], [30, 0]);
        const blur = interpolate(progress, [0, 1], [6, 0]);

        return (
          <span
            key={i}
            style={{
              fontFamily: HEEBO,
              fontSize,
              fontWeight,
              color,
              display: 'inline-block',
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              opacity: progress,
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              willChange: 'transform, filter, opacity',
            }}
          >
            {unit}
            {mode === 'chars' ? '' : '\u00A0'}
          </span>
        );
      })}
    </div>
  );
};
