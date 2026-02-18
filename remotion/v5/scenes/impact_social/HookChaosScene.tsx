import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } from 'remotion';
import { S, RUBIK_S } from '../../config_impact_social';

// Chaos icons to represent "work overload"
const ICONS = ['📧', '📅', '📊', '📞', '❌', '⏳', '💡', '🔔'];

export const HookChaosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // --- Animation Drivers ---

  // 1. Text slams in hard
  const textEntrance = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  // 2. Glitch Intensity (starts high, settles, then spikes at end)
  const glitchIntensity = interpolate(
    frame,
    [0, 10, 60, 80, 90],
    [20, 0, 0, 15, 50], // Pixel displacement amount
    { extrapolateRight: 'clamp' }
  );

  // 3. Shake effect (random x/y jitter)
  const shakeX = random(frame) * glitchIntensity - (glitchIntensity / 2);
  const shakeY = random(frame + 1) * glitchIntensity - (glitchIntensity / 2);

  // --- Chaos Particles Generation ---
  // Memoize random positions so they are consistent per render
  const particles = useMemo(() => {
    return new Array(20).fill(0).map((_, i) => ({
      icon: ICONS[Math.floor(random(i) * ICONS.length)],
      x: random(i + 10) * width,
      y: random(i + 20) * height,
      scale: 0.5 + random(i + 30) * 1.5,
      rotation: random(i + 40) * 360,
      delay: random(i + 50) * 20, // Random start time
    }));
  }, [width, height]);

  // Helper for RGB Split Text (The "Glitch" look)
  const renderGlitchText = (text: string, size: number, color: string, yOffset: number, isMain: boolean = false) => {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Red Channel (Offset Left) */}
        <span style={{
          position: 'absolute', top: 0, left: -shakeX * 0.2,
          color: '#ff004c', opacity: glitchIntensity > 2 ? 0.8 : 0,
          mixBlendMode: 'screen',
        }}>{text}</span>
        
        {/* Blue Channel (Offset Right) */}
        <span style={{
          position: 'absolute', top: 0, left: shakeX * 0.2,
          color: '#00ccff', opacity: glitchIntensity > 2 ? 0.8 : 0,
          mixBlendMode: 'screen',
        }}>{text}</span>

        {/* Main Text */}
        <span style={{ 
          color: color,
          position: 'relative',
          zIndex: 2,
          textShadow: isMain ? `0 0 ${glitchIntensity + 10}px ${color}` : 'none'
        }}>{text}</span>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, overflow: 'hidden', direction: 'rtl' }}>
      
      {/* 1. Background Grid that distorts */}
      <div style={{
        position: 'absolute', inset: -50,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        transform: `translate(${shakeX}px, ${shakeY}px) scale(${1 + glitchIntensity * 0.002})`,
        opacity: 0.4,
      }} />

      {/* 2. Chaos Floating Icons */}
      {particles.map((p, i) => {
        const pProgress = interpolate(frame - p.delay, [0, 40], [0, 1], { extrapolateRight: 'clamp' });
        const pOpacity = interpolate(frame - p.delay, [0, 10, 35, 45], [0, 0.4, 0.4, 0]);
        
        if (frame < p.delay) return null;

        return (
          <div key={i} style={{
            position: 'absolute',
            left: p.x, top: p.y,
            fontSize: 40 * p.scale,
            opacity: pOpacity,
            transform: `scale(${pProgress}) rotate(${p.rotation + frame * 2}deg)`,
            filter: 'blur(2px) grayscale(100%)', // Ghostly look
            zIndex: 1,
          }}>
            {p.icon}
          </div>
        );
      })}

      {/* 3. Main Content Container (Centered) */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        transform: `translate(${shakeX}px, ${shakeY}px) scale(${textEntrance})`,
        gap: 10,
        zIndex: 10,
      }}>
        
        {/* TOP LINE: Small, sharp */}
        <div style={{
          fontFamily: RUBIK_S,
          fontSize: 50,
          fontWeight: 300,
          color: '#fff',
          letterSpacing: 2,
          opacity: interpolate(frame, [0, 10], [0, 1]),
        }}>
          {renderGlitchText("כך נראה", 50, "#ffffff", 0)}
        </div>

        {/* MIDDLE LINE: Huge, Messy, Neon */}
        <div style={{
          fontFamily: RUBIK_S,
          fontSize: 110,
          fontWeight: 900,
          lineHeight: 0.9,
          transform: `scale(${1 + Math.sin(frame * 0.5) * 0.05})`, // Breathing effect
        }}>
           {renderGlitchText("הבוס הממוצע", 110, S.nexus, 0, true)}
        </div>

        {/* BOTTOM LINE: Date, Critical Red */}
        <div style={{
          marginTop: 10,
          fontFamily: RUBIK_S,
          fontSize: 90,
          fontWeight: 800,
          background: '#A21D3C', // Red background box
          color: '#fff',
          padding: '0 20px',
          transform: `rotate(${-2 + random(frame)*4}deg)`, // Slight tilt jitter
          boxShadow: `10px 10px 0px rgba(0,0,0,0.5)`,
        }}>
           ב-2026
        </div>

      </div>

      {/* 4. Digital Noise / Scanlines Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent 0px,
          rgba(0,0,0,0.3) 2px,
          transparent 4px
        )`,
        pointerEvents: 'none',
        opacity: 0.3,
        zIndex: 20,
      }} />

      {/* 5. Flash Wipe at end (Transition out) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: '#fff',
        opacity: interpolate(frame, [85, 90], [0, 1], { extrapolateLeft: 'clamp' }),
        zIndex: 100,
      }} />

    </AbsoluteFill>
  );
};