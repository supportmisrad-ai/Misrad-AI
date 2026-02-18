import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { S, SM, HEEBO_S, RUBIK_S, AI_INSIGHTS } from '../../config_impact_social';

// Neuron node positions (relative to center 540, 500)
const NODES = [
  { x: 540, y: 320, r: 18, primary: true  },
  { x: 320, y: 430, r: 12, primary: false },
  { x: 760, y: 430, r: 12, primary: false },
  { x: 200, y: 580, r: 9,  primary: false },
  { x: 440, y: 560, r: 9,  primary: false },
  { x: 640, y: 560, r: 9,  primary: false },
  { x: 860, y: 580, r: 9,  primary: false },
  { x: 280, y: 700, r: 7,  primary: false },
  { x: 540, y: 680, r: 7,  primary: false },
  { x: 800, y: 700, r: 7,  primary: false },
];

const EDGES = [
  [0, 1], [0, 2],
  [1, 3], [1, 4],
  [2, 5], [2, 6],
  [3, 7], [4, 8], [5, 8], [6, 9],
];

export const AIBrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  // ── Neural network pulse ──
  // Each edge fires in sequence
  const pulsePhase = frame * 0.06;

  // ── Node glow breathe ──
  const nodePulse = Math.abs(Math.sin(frame * 0.015));

  // ── Network reveal: nodes appear one by one ──
  const networkReveal = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: 'clamp' });

  // ── "Thinking" label ──
  const thinkOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: 'clamp' });
  const thinkDots = Math.floor(frame / 28) % 4; // slower dot animation

  // ── Insight cards slide up from bottom ──
  const insightSprings = AI_INSIGHTS.map((_, i) =>
    spring({ frame: frame - (80 + i * 45), fps, config: SM.elastic })
  );

  // ── Headline ──
  const headSpring = spring({ frame: frame - 60, fps, config: SM.snappy });
  const headOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });

  // ── Revenue counter ──
  const revenue = Math.floor(
    interpolate(frame, [130, 260], [0, 47200], {
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3),
    })
  );

  // ── Ambient ──
  const ambientPulse = 1 + Math.sin(frame * 0.012) * 0.03;

  return (
    <AbsoluteFill style={{ backgroundColor: S.bg, opacity: sceneIn, overflow: 'hidden' }}>

      {/* Ambient orb — indigo */}
      <div style={{
        position: 'absolute',
        top: 420, left: '50%',
        width: 700, height: 700,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${S.indigo}22 0%, ${S.primary}12 50%, transparent 70%)`,
        transform: `translate(-50%, -50%) scale(${ambientPulse})`,
        filter: 'blur(70px)',
      }} />

      {/* ── Neural network SVG ── */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}
        viewBox="0 0 1080 1920"
      >
        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          const edgeReveal = interpolate(
            frame,
            [i * 5, i * 5 + 25],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          // Travelling pulse along edge
          const pulsePos = (Math.sin(pulsePhase + i * 0.7) + 1) / 2;
          const px = na.x + (nb.x - na.x) * pulsePos;
          const py = na.y + (nb.y - na.y) * pulsePos;

          return (
            <g key={`edge-${i}`} opacity={edgeReveal}>
              <line
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={i % 2 === 0 ? S.primary : S.indigo}
                strokeWidth={1.5}
                strokeOpacity={0.3}
              />
              {/* Travelling dot */}
              <circle
                cx={px} cy={py} r={3}
                fill={i % 2 === 0 ? S.primary : S.indigoLight}
                opacity={0.8}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((node, i) => {
          const nodeReveal = interpolate(
            frame,
            [i * 6, i * 6 + 20],
            [0, 1],
            { extrapolateRight: 'clamp' }
          );
          const glow = node.primary
            ? 20 + nodePulse * 30
            : 8 + nodePulse * 12;
          const color = node.primary ? S.primary : (i % 2 === 0 ? S.indigo : S.indigoLight);

          return (
            <g key={`node-${i}`} opacity={nodeReveal}>
              {/* Glow */}
              <circle cx={node.x} cy={node.y} r={node.r + glow * 0.5}
                fill={color} opacity={0.08} />
              {/* Core */}
              <circle cx={node.x} cy={node.y} r={node.r}
                fill={color} opacity={0.9} />
              {/* Inner highlight */}
              <circle cx={node.x - node.r * 0.3} cy={node.y - node.r * 0.3}
                r={node.r * 0.35}
                fill="white" opacity={0.25} />
            </g>
          );
        })}
      </svg>

      {/* "AI חושב..." label */}
      <div style={{
        position: 'absolute',
        top: 160,
        left: 120, right: 120,
        textAlign: 'center',
        opacity: thinkOpacity,
      }}>
        <p style={{
          fontFamily: HEEBO_S,
          fontSize: 22,
          fontWeight: 600,
          color: S.muted,
          margin: 0,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          AI מנתח{'·'.repeat(thinkDots + 1)}
        </p>
      </div>

      {/* Headline */}
      <div style={{
        position: 'absolute',
        top: 780,
        left: 120, right: 120,
        textAlign: 'center',
        direction: 'rtl',
        opacity: headOpacity,
        transform: `translateY(${interpolate(headSpring, [0, 1], [20, 0])}px)`,
      }}>
        <p style={{
          fontFamily: HEEBO_S,
          fontSize: 48,
          fontWeight: 900,
          color: S.white,
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: -1,
        }}>
          ה-AI שלנו{' '}
          <span style={{
            background: S.nexus,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            רואה
          </span>
          {' '}מה שאתה מפספס
        </p>
      </div>

      {/* AI Insight cards — vertical stack */}
      <div style={{
        position: 'absolute',
        top: 920,
        left: 120, right: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {AI_INSIGHTS.map((insight, i) => {
          const sp = insightSprings[i];
          const cardY  = interpolate(sp, [0, 1], [60, 0]);
          const cardOp = interpolate(sp, [0, 0.1], [0, 1]);

          return (
            <div key={i} style={{
              transform: `translateY(${cardY}px)`,
              opacity: cardOp,
              background: `linear-gradient(135deg, ${S.surface} 0%, ${S.bg} 100%)`,
              border: `1.5px solid ${insight.color}35`,
              borderRadius: 20,
              padding: '22px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              direction: 'rtl',
              boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${insight.color}15`,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Top accent */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${insight.color}, transparent)`,
              }} />

              {/* Icon */}
              <div style={{
                width: 52, height: 52,
                borderRadius: 14,
                background: `${insight.color}18`,
                border: `1px solid ${insight.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                flexShrink: 0,
              }}>
                {insight.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <p style={{
                  fontFamily: HEEBO_S,
                  fontSize: 13,
                  fontWeight: 600,
                  color: insight.color,
                  margin: 0,
                  marginBottom: 4,
                  letterSpacing: 0.5,
                  opacity: 0.85,
                }}>
                  {insight.label}
                </p>
                <p style={{
                  fontFamily: HEEBO_S,
                  fontSize: 20,
                  fontWeight: 600,
                  color: S.white,
                  margin: 0,
                }}>
                  {insight.desc}
                </p>
              </div>

              {/* Value badge */}
              <div style={{
                padding: '8px 18px',
                background: `${insight.color}20`,
                border: `1px solid ${insight.color}50`,
                borderRadius: 10,
                flexShrink: 0,
              }}>
                <p style={{
                  fontFamily: RUBIK_S,
                  fontSize: 26,
                  fontWeight: 800,
                  color: insight.color,
                  margin: 0,
                }}>
                  {insight.value}
                </p>
              </div>
            </div>
          );
        })}

        {/* Revenue counter card */}
        <div style={{
          opacity: interpolate(frame, [220, 250], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateY(${interpolate(
            spring({ frame: frame - 220, fps, config: SM.elastic }),
            [0, 1], [50, 0]
          )}px)`,
          background: S.nexus,
          borderRadius: 20,
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          direction: 'rtl',
          boxShadow: `0 8px 40px ${S.primaryAlpha}`,
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div>
            <p style={{
              fontFamily: HEEBO_S,
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              margin: 0,
              marginBottom: 6,
              letterSpacing: 1,
            }}>
              הכנסות החודש
            </p>
            <p style={{
              fontFamily: RUBIK_S,
              fontSize: 44,
              fontWeight: 800,
              color: S.white,
              margin: 0,
              letterSpacing: -1,
            }}>
              ₪{revenue.toLocaleString('he-IL')}
            </p>
          </div>
          <div style={{
            fontSize: 48,
            filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4))',
          }}>
            📈
          </div>
        </div>
      </div>

    </AbsoluteFill>
  );
};
