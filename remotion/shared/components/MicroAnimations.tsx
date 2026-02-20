import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

/**
 * Continuous sine-wave oscillation between min and max values.
 * Use for pulsing glows, breathing effects, scale oscillations.
 */
export const pulse = (frame: number, speed: number, min: number, max: number) =>
  min + (max - min) * (0.5 + 0.5 * Math.sin(frame * speed));

/**
 * Floating gradient orbs that drift slowly across the scene.
 * Provides continuous background movement so scenes never feel static.
 */
export const FloatingOrbs: React.FC<{
  count: number;
  color: string;
  speed?: number;
  maxSize?: number;
}> = ({ count, color, speed = 0.02, maxSize = 140 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i * 137.5;
        const x = 50 + 40 * Math.sin(frame * speed + seed);
        const y = 50 + 35 * Math.cos(frame * speed * 0.7 + seed * 0.8);
        const size = (maxSize * 0.6) + (maxSize * 0.4) * Math.sin(seed);
        const opacity = 0.015 + 0.01 * Math.sin(frame * 0.015 + i);
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: size, height: size, borderRadius: '50%',
            background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />
        );
      })}
    </>
  );
};

/**
 * Horizontal scan lines that sweep vertically across the scene.
 * Gives a tech/futuristic feel with continuous movement.
 */
export const ScanLines: React.FC<{ color: string; speed1?: number; speed2?: number }> = ({
  color,
  speed1 = 2.5,
  speed2 = 1.8,
}) => {
  const frame = useCurrentFrame();
  const y1 = (frame * speed1) % 120 - 10;
  const y2 = ((frame * speed2) + 60) % 120 - 10;
  return (
    <>
      {[y1, y2].map((y, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0, top: `${y}%`,
          height: 1, background: `linear-gradient(90deg, transparent, ${color}15, transparent)`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
};

/**
 * Grid pattern background for a structured, technical feel.
 */
export const GridBackground: React.FC<{
  color: string;
  spacing?: number;
  opacity?: number;
}> = ({ color, spacing = 60, opacity = 0.04 }) => {
  const frame = useCurrentFrame();
  const drift = frame * 0.1;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: `
        linear-gradient(${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
        linear-gradient(90deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
      `,
      backgroundSize: `${spacing}px ${spacing}px`,
      backgroundPosition: `${drift}px ${drift}px`,
      pointerEvents: 'none',
    }} />
  );
};

/**
 * Particle field — small dots that float upward continuously.
 * Great for creating depth and motion in dark scenes.
 */
export const ParticleField: React.FC<{
  count: number;
  color: string;
  speed?: number;
  direction?: 'up' | 'down';
}> = ({ count, color, speed = 1, direction = 'up' }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i * 73.7;
        const x = (seed * 3.7) % 100;
        const baseY = direction === 'up'
          ? 110 - ((frame * speed * (0.3 + (seed % 1))) % 130)
          : -10 + ((frame * speed * (0.3 + (seed % 1))) % 130);
        const size = 2 + (seed % 3);
        const opacity = 0.08 + 0.07 * Math.sin(frame * 0.03 + seed);
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${baseY}%`,
            width: size, height: size, borderRadius: '50%',
            backgroundColor: color, opacity,
            boxShadow: `0 0 ${size * 2}px ${color}40`,
            pointerEvents: 'none',
          }} />
        );
      })}
    </>
  );
};

/**
 * Radial breathing ring — a ring that gently scales in and out.
 */
export const BreathingRing: React.FC<{
  color: string;
  size?: number;
  strokeWidth?: number;
  speed?: number;
}> = ({ color, size = 400, strokeWidth = 2, speed = 0.06 }) => {
  const frame = useCurrentFrame();
  const scale = pulse(frame, speed, 0.97, 1.03);
  const opacity = pulse(frame, speed * 0.7, 0.015, 0.04);
  return (
    <div style={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      border: `${strokeWidth}px solid ${color}`,
      transform: `scale(${scale})`, opacity,
      pointerEvents: 'none',
    }} />
  );
};

/**
 * Morphing blob background — creates an organic, flowing shape.
 */
export const MorphBlob: React.FC<{
  color: string;
  size?: number;
  speed?: number;
  x?: string;
  y?: string;
}> = ({ color, size = 300, speed = 0.02, x = '50%', y = '50%' }) => {
  const frame = useCurrentFrame();
  const r1 = 40 + 10 * Math.sin(frame * speed);
  const r2 = 50 + 8 * Math.cos(frame * speed * 1.3);
  const r3 = 45 + 12 * Math.sin(frame * speed * 0.8 + 1);
  const r4 = 48 + 6 * Math.cos(frame * speed * 1.1 + 2);
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size,
      background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
      borderRadius: `${r1}% ${r2}% ${r3}% ${r4}%`,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }} />
  );
};
