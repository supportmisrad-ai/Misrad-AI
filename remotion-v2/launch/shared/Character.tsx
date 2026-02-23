import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { SPRING } from '../../shared/config';

/**
 * MISRAD AI — Launch Video Character
 * Professional man with כיפה. SVG with volume (gradients, not flat).
 * Minimalist but dignified — not cartoon, not flat silhouette.
 *
 * Poses: standing, pointing, confident, frustrated, phoneHolding, walking
 * Expressions: neutral, smile, frustrated, confident
 */

type Pose = 'standing' | 'pointing' | 'confident' | 'frustrated' | 'phoneHolding' | 'walking';
type Expression = 'neutral' | 'smile' | 'frustrated' | 'confident';

interface CharacterProps {
  pose?: Pose;
  expression?: Expression;
  /** Shirt color variant */
  shirtColor?: 'white' | 'blue';
  /** Scale multiplier (default 1) */
  scale?: number;
  /** Mirror horizontally */
  flipX?: boolean;
  /** Entrance delay in frames */
  delay?: number;
  /** Override opacity */
  opacity?: number;
  /** Extra CSS on the wrapper */
  style?: React.CSSProperties;
}

// ─── Arm path generators ──────────────────────────────
const getLeftArm = (pose: Pose): string => {
  switch (pose) {
    case 'pointing':
      return 'M 32,68 Q 18,62 8,48'; // arm extended, pointing forward
    case 'frustrated':
      return 'M 32,68 Q 22,50 28,38'; // hands up toward head
    case 'confident':
      return 'M 32,68 Q 20,78 18,88'; // arms at sides, relaxed
    case 'phoneHolding':
      return 'M 32,68 Q 24,72 22,64'; // holding something
    case 'walking':
      return 'M 32,68 Q 22,78 20,90'; // natural swing
    default: // standing
      return 'M 32,68 Q 22,80 20,92';
  }
};

const getRightArm = (pose: Pose): string => {
  switch (pose) {
    case 'pointing':
      return 'M 68,68 Q 78,80 76,92'; // other arm relaxed
    case 'frustrated':
      return 'M 68,68 Q 78,50 72,38'; // hands up toward head
    case 'confident':
      return 'M 68,68 Q 80,78 82,88'; // arms at sides
    case 'phoneHolding':
      return 'M 68,68 Q 76,64 78,58'; // holding phone up
    case 'walking':
      return 'M 68,68 Q 78,76 80,88'; // natural swing
    default:
      return 'M 68,68 Q 78,80 80,92';
  }
};

// ─── Expression helpers ───────────────────────────────
const getEyeShape = (expr: Expression) => {
  switch (expr) {
    case 'smile':
    case 'confident':
      return { ry: 2.2, yOffset: 0 }; // slightly squinted (happy)
    case 'frustrated':
      return { ry: 3, yOffset: -1 }; // wide, tense
    default:
      return { ry: 2.5, yOffset: 0 };
  }
};

const getMouthPath = (expr: Expression): string => {
  switch (expr) {
    case 'smile':
      return 'M 43,46 Q 50,51 57,46'; // smile arc
    case 'confident':
      return 'M 44,46 Q 50,49 56,46'; // slight smile
    case 'frustrated':
      return 'M 44,47 Q 50,44 56,47'; // slight frown
    default:
      return 'M 44,46 L 56,46'; // neutral line
  }
};

export const Character: React.FC<CharacterProps> = ({
  pose = 'standing',
  expression = 'neutral',
  shirtColor = 'white',
  scale = 1,
  flipX = false,
  delay = 0,
  opacity: overrideOpacity,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const entrance = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: SPRING.hero,
    durationInFrames: 22,
  });

  const entranceY = interpolate(entrance, [0, 1], [30, 0]);
  const entranceOpacity = overrideOpacity ?? entrance;

  // Subtle breathing animation (natural micro-movement)
  const breathe = Math.sin((frame - delay) * 0.06) * 1.2;

  // Head micro-tilt based on pose
  const headTilt = pose === 'frustrated' ? -3 : pose === 'confident' ? 2 : 0;
  const headTiltAnimated = interpolate(entrance, [0, 1], [0, headTilt]);

  const eyes = getEyeShape(expression);
  const mouthPath = getMouthPath(expression);
  const leftArm = getLeftArm(pose);
  const rightArm = getRightArm(pose);

  const shirtFill = shirtColor === 'blue' ? '#3B5998' : '#F0EDE8';
  const shirtHighlight = shirtColor === 'blue' ? '#5B7BB8' : '#FFFFFF';

  return (
    <div
      style={{
        transform: `translateY(${entranceY}px) scale(${scale}) ${flipX ? 'scaleX(-1)' : ''}`,
        opacity: entranceOpacity,
        willChange: 'transform, opacity',
        display: 'inline-block',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 100 140"
        width={100 * scale}
        height={140 * scale}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Skin gradient — warm, natural */}
          <radialGradient id="skinGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#F5D5B8" />
            <stop offset="70%" stopColor="#E8C4A0" />
            <stop offset="100%" stopColor="#D4A574" />
          </radialGradient>

          {/* Shirt gradient */}
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={shirtHighlight} />
            <stop offset="50%" stopColor={shirtFill} />
            <stop offset="100%" stopColor={shirtFill} stopOpacity={0.9} />
          </linearGradient>

          {/* Pants gradient */}
          <linearGradient id="pantsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2D2D3A" />
            <stop offset="100%" stopColor="#1A1A24" />
          </linearGradient>

          {/* Kippah gradient — black with subtle sheen */}
          <radialGradient id="kippahGrad" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#3A3A42" />
            <stop offset="100%" stopColor="#1A1A20" />
          </radialGradient>

          {/* Shadow under character */}
          <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="50" cy="138" rx="22" ry="4" fill="url(#shadowGrad)" />

        {/* ─── LEGS ─── */}
        <g>
          {/* Left leg */}
          <path
            d="M 40,100 L 38,128 L 34,130 L 44,130 L 42,100"
            fill="url(#pantsGrad)"
            stroke="#151520"
            strokeWidth={0.5}
          />
          {/* Right leg */}
          <path
            d="M 58,100 L 56,128 L 52,130 L 62,130 L 60,100"
            fill="url(#pantsGrad)"
            stroke="#151520"
            strokeWidth={0.5}
          />
          {/* Shoes */}
          <ellipse cx="39" cy="131" rx="7" ry="3" fill="#1A1A20" />
          <ellipse cx="57" cy="131" rx="7" ry="3" fill="#1A1A20" />
        </g>

        {/* ─── TORSO (SHIRT) ─── */}
        <g transform={`translate(0, ${breathe * 0.3})`}>
          <path
            d="M 32,65 Q 30,68 30,75 L 30,102 Q 30,105 34,105 L 66,105 Q 70,105 70,102 L 70,75 Q 70,68 68,65 L 56,60 Q 50,58 44,60 Z"
            fill="url(#shirtGrad)"
            stroke={shirtColor === 'blue' ? '#2A4570' : '#D0CCC4'}
            strokeWidth={0.6}
          />
          {/* Collar */}
          <path
            d="M 44,60 Q 47,64 50,65 Q 53,64 56,60"
            fill="none"
            stroke={shirtColor === 'blue' ? '#2A4570' : '#C8C4BC'}
            strokeWidth={0.8}
          />
          {/* Center button line */}
          <line x1="50" y1="66" x2="50" y2="100" stroke={shirtColor === 'blue' ? '#2A4570' : '#D0CCC4'} strokeWidth={0.4} />
          {/* Buttons */}
          {[72, 80, 88, 96].map((y) => (
            <circle key={y} cx={50} cy={y} r={1} fill={shirtColor === 'blue' ? '#2A4570' : '#B8B4AC'} />
          ))}
        </g>

        {/* ─── ARMS ─── */}
        <g transform={`translate(0, ${breathe * 0.2})`}>
          <path
            d={leftArm}
            fill="none"
            stroke="url(#shirtGrad)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          {/* Left hand */}
          <circle
            cx={parseFloat(leftArm.split(' ').pop()?.split(',')[0] || '20')}
            cy={parseFloat(leftArm.split(' ').pop()?.split(',')[1] || '92')}
            r={4}
            fill="url(#skinGrad)"
          />
          <path
            d={rightArm}
            fill="none"
            stroke="url(#shirtGrad)"
            strokeWidth={7}
            strokeLinecap="round"
          />
          {/* Right hand */}
          <circle
            cx={parseFloat(rightArm.split(' ').pop()?.split(',')[0] || '80')}
            cy={parseFloat(rightArm.split(' ').pop()?.split(',')[1] || '92')}
            r={4}
            fill="url(#skinGrad)"
          />
        </g>

        {/* ─── HEAD ─── */}
        <g transform={`rotate(${headTiltAnimated}, 50, 42) translate(0, ${breathe * 0.5})`}>
          {/* Neck */}
          <rect x="46" y="54" width="8" height="8" rx="3" fill="url(#skinGrad)" />

          {/* Head shape */}
          <ellipse cx="50" cy="40" rx="17" ry="20" fill="url(#skinGrad)" />

          {/* Ears */}
          <ellipse cx="33" cy="40" rx="3" ry="5" fill="#E8C4A0" />
          <ellipse cx="67" cy="40" rx="3" ry="5" fill="#E8C4A0" />

          {/* ─── KIPPAH ─── */}
          <path
            d="M 38,28 Q 44,18 50,17 Q 56,18 62,28"
            fill="url(#kippahGrad)"
            stroke="#0A0A10"
            strokeWidth={0.4}
          />
          {/* Kippah rim */}
          <path
            d="M 37,28 Q 50,32 63,28"
            fill="none"
            stroke="#2A2A32"
            strokeWidth={0.6}
          />

          {/* Hair (sides, under kippah) */}
          <path d="M 34,30 Q 33,38 34,44" fill="none" stroke="#2A1F14" strokeWidth={2.5} strokeLinecap="round" />
          <path d="M 66,30 Q 67,38 66,44" fill="none" stroke="#2A1F14" strokeWidth={2.5} strokeLinecap="round" />

          {/* Eyebrows */}
          <path d="M 39,33 Q 42,31 46,33" fill="none" stroke="#2A1F14" strokeWidth={1.2} strokeLinecap="round" />
          <path d="M 54,33 Q 58,31 61,33" fill="none" stroke="#2A1F14" strokeWidth={1.2} strokeLinecap="round" />

          {/* Eyes */}
          <ellipse cx="43" cy={37 + eyes.yOffset} rx="2.8" ry={eyes.ry} fill="#1A1A20" />
          <ellipse cx="57" cy={37 + eyes.yOffset} rx="2.8" ry={eyes.ry} fill="#1A1A20" />
          {/* Eye highlights */}
          <circle cx="44" cy={36 + eyes.yOffset} r="0.8" fill="#FFFFFF" opacity={0.7} />
          <circle cx="58" cy={36 + eyes.yOffset} r="0.8" fill="#FFFFFF" opacity={0.7} />

          {/* Nose */}
          <path d="M 50,38 Q 48,43 50,44 Q 52,43 50,38" fill="none" stroke="#D4A574" strokeWidth={0.6} />

          {/* Mouth */}
          <path d={mouthPath} fill="none" stroke="#8B6B50" strokeWidth={1} strokeLinecap="round" />

          {/* Beard shadow (subtle — professional, trimmed) */}
          <path
            d="M 38,44 Q 42,52 50,54 Q 58,52 62,44"
            fill="none"
            stroke="#C8A888"
            strokeWidth={0.4}
            opacity={0.3}
          />
        </g>

        {/* Phone (when phoneHolding pose) */}
        {pose === 'phoneHolding' && (
          <g>
            <rect x="72" y="50" width="12" height="20" rx="2" fill="#18181B" stroke="#333" strokeWidth={0.5} />
            <rect x="73" y="52" width="10" height="15" rx="1" fill="#1E40AF" opacity={0.6} />
          </g>
        )}
      </svg>
    </div>
  );
};
