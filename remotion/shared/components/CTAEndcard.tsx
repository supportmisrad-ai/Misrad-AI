import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { SPRING, BRAND, HEEBO, RUBIK } from '../config';
import { NoiseLayer } from './NoiseLayer';

/**
 * Universal CTA endcard — logo, tagline, URL, optional pricing.
 * Used as the last 2-3 seconds of every video.
 */
export const CTAEndcard: React.FC<{
  /** Price string like "₪249/חודש" — omit for non-pricing videos */
  price?: string;
  /** Tagline under logo */
  tagline?: string;
  /** Background: 'dark' | 'light' */
  variant?: 'dark' | 'light';
  /** Module accent color for glow */
  accentColor?: string;
}> = ({
  price,
  tagline = 'AI שמקדם את הארגון שלך',
  variant = 'dark',
  accentColor = BRAND.primary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isDark = variant === 'dark';
  const bg = isDark ? BRAND.bgDark : BRAND.bgLight;
  const textColor = isDark ? BRAND.white : '#1E293B';
  const mutedColor = isDark ? BRAND.muted : '#64748B';

  // Logo entrance
  const logoSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 20 });
  const logoScale = interpolate(logoSpring, [0, 1], [0.3, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Text entrance (staggered)
  const textSpring = spring({ frame: Math.max(0, frame - 8), fps, config: SPRING.ui, durationInFrames: 18 });
  const textY = interpolate(textSpring, [0, 1], [30, 0]);

  // URL entrance
  const urlSpring = spring({ frame: Math.max(0, frame - 14), fps, config: SPRING.ui, durationInFrames: 18 });
  const urlScale = interpolate(urlSpring, [0, 1], [0.9, 1]);

  // Price entrance
  const priceSpring = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.punch, durationInFrames: 15 });

  // Breathing glow
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      {/* Accent glow orb */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
          opacity: glowPulse,
          transform: `scale(${1 + Math.sin(frame * 0.04) * 0.1})`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 24,
          filter: `drop-shadow(0 0 ${20 * glowPulse}px ${accentColor}40)`,
        }}
      >
        <Img
          src={staticFile('icons/misrad-icon.svg')}
          style={{ width: 120, height: 120 }}
        />
      </div>

      {/* Brand name */}
      <div
        style={{
          fontFamily: HEEBO,
          fontSize: 72,
          fontWeight: 900,
          color: textColor,
          letterSpacing: -1,
          transform: `translateY(${textY}px)`,
          opacity: textSpring,
          textShadow: isDark ? `0 0 40px ${accentColor}30` : 'none',
        }}
      >
        MISRAD AI
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: HEEBO,
          fontSize: 28,
          fontWeight: 600,
          color: mutedColor,
          direction: 'rtl',
          transform: `translateY(${textY}px)`,
          opacity: textSpring,
          marginTop: 8,
        }}
      >
        {tagline}
      </div>

      {/* URL pill */}
      <div
        style={{
          marginTop: 40,
          padding: '16px 56px',
          background: BRAND.gradient,
          borderRadius: 50,
          transform: `scale(${urlScale})`,
          opacity: urlSpring,
          boxShadow: `0 12px 40px ${accentColor}30`,
        }}
      >
        <span
          style={{
            fontFamily: RUBIK,
            fontSize: 32,
            fontWeight: 800,
            color: '#fff',
          }}
        >
          misrad-ai.com
        </span>
      </div>

      {/* Price (optional) */}
      {price && (
        <div
          style={{
            marginTop: 24,
            fontFamily: RUBIK,
            fontSize: 38,
            fontWeight: 800,
            background: BRAND.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            opacity: priceSpring,
            transform: `scale(${interpolate(priceSpring, [0, 1], [0.8, 1])})`,
          }}
        >
          {price}
        </div>
      )}

      {/* Shabbat-friendly badge */}
      <div
        style={{
          marginTop: price ? 20 : 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 28px',
          borderRadius: 30,
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.08)',
          opacity: spring({ frame: Math.max(0, frame - 26), fps, config: SPRING.ui, durationInFrames: 18 }),
          transform: `translateY(${interpolate(
            spring({ frame: Math.max(0, frame - 26), fps, config: SPRING.ui, durationInFrames: 18 }),
            [0, 1], [15, 0]
          )}px)`,
        }}
      >
        <span style={{ fontSize: 18 }}>🕎</span>
        <span
          style={{
            fontFamily: HEEBO,
            fontSize: 16,
            fontWeight: 700,
            color: mutedColor,
            direction: 'rtl',
          }}
        >
          מותאם לשומרי שבת וחג
        </span>
      </div>

      <NoiseLayer opacity={isDark ? 0.02 : 0.015} />
    </AbsoluteFill>
  );
};
