import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING, FPS } from '../../shared/config';
import { NoiseLayer } from '../../shared/components/NoiseLayer';
import { GlassCard } from '../../shared/components/GlassCard';
import { DeviceFrame } from '../../shared/components/DeviceFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';
import { pulse, FloatingOrbs, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — AI brain pulse [0-90f = 0-3s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse1Scale = interpolate(frame, [0, 20, 40], [0, 2.5, 5], { extrapolateRight: 'clamp' });
  const pulse1Op = interpolate(frame, [0, 10, 40], [0, 0.6, 0], { extrapolateRight: 'clamp' });
  const pulse2Scale = interpolate(frame, [8, 28, 50], [0, 2.5, 5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse2Op = interpolate(frame, [8, 16, 50], [0, 0.4, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const brainSpring = spring({ frame, fps, config: SPRING.punch, durationInFrames: 15 });

  const insights = [
    { text: '3 לידים חמים', emoji: '🔥', x: -220, y: -180 },
    { text: 'פוסט מוכן', emoji: '📝', x: 240, y: -140 },
    { text: 'חשבונית לגבייה', emoji: '💰', x: -200, y: 180 },
    { text: 'משימה דחופה', emoji: '⚡', x: 260, y: 160 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={BRAND.primary} speed={0.012} maxSize={100} />

      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}10 0%, ${BRAND.indigo}08 40%, transparent 70%)`,
        opacity: pulse(frame, 0.04, 0.5, 0.8),
      }} />

      <BreathingRing color={BRAND.primary} size={250} speed={0.04} />

      <div style={{ position: 'absolute', width: 100 * pulse1Scale, height: 100 * pulse1Scale, borderRadius: '50%', border: `2px solid ${BRAND.primary}`, opacity: pulse1Op }} />
      <div style={{ position: 'absolute', width: 100 * pulse2Scale, height: 100 * pulse2Scale, borderRadius: '50%', border: `2px solid ${BRAND.indigo}`, opacity: pulse2Op }} />

      <div style={{
        width: 100, height: 100, borderRadius: '50%', background: BRAND.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize: 48, boxShadow: `0 16px 50px ${BRAND.primary}30, 0 0 ${pulse(frame, 0.05, 12, 22)}px ${BRAND.primary}20`,
        opacity: brainSpring, transform: `scale(${interpolate(brainSpring, [0, 1], [0.4, 1])})`,
        zIndex: 10,
      }}>
        🧠
      </div>

      {insights.map((insight, i) => {
        const s = spring({ frame: Math.max(0, frame - 18 - i * 5), fps, config: SPRING.hero, durationInFrames: 18 });
        return (
          <div key={i} style={{
            position: 'absolute',
            padding: '10px 18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: 8,
            transform: `translate(${insight.x * s}px, ${insight.y * s}px)`,
            opacity: s, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}>
            <span style={{ fontSize: 18 }}>{insight.emoji}</span>
            <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white, direction: 'rtl' }}>{insight.text}</span>
          </div>
        );
      })}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: AI CHAT [90-370f = 3-12.3s]
// ═══════════════════════════════════════════════════════════
const AIChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const messages = [
    { type: 'user', text: 'מה הסטטוס של הלידים החמים?', delay: 8 },
    { type: 'ai', text: 'יש לך 3 לידים חמים. דנה לוי — 75% סיכוי סגירה. מומלץ לשלוח הצעה היום.', delay: 45 },
    { type: 'user', text: 'תכין לי הצעת מחיר לדנה', delay: 100 },
    { type: 'ai', text: '✅ הצעת מחיר נוצרה!\nסכום: ₪12,400\nתוקף: 7 ימים\nנשלח לאישורך.', delay: 140 },
  ];

  const typingDots = (delay: number) => {
    const isTyping = frame >= delay - 15 && frame < delay;
    if (!isTyping) return null;
    const dotOpacity = [
      Math.sin(frame * 0.4) > 0 ? 1 : 0.3,
      Math.sin(frame * 0.4 + 1) > 0 ? 1 : 0.3,
      Math.sin(frame * 0.4 + 2) > 0 ? 1 : 0.3,
    ];
    return (
      <div style={{ display: 'flex', gap: 4, padding: '12px 18px' }}>
        {dotOpacity.map((op, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND.primary, opacity: op }} />
        ))}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={2} color={BRAND.primary} speed={0.008} maxSize={80} />

      <DeviceFrame scale={1.1} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 16px 80px', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '0 4px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: BRAND.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16 }}>🧠</div>
            <div>
              <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: BRAND.white }}>MISRAD AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#22C55E' }}>● מחובר</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            {messages.map((msg, i) => {
              const msgSpring = spring({ frame: Math.max(0, frame - msg.delay), fps, config: SPRING.ui, durationInFrames: 16 });
              const isUser = msg.type === 'user';

              if (frame < msg.delay - 15) return null;

              return (
                <React.Fragment key={i}>
                  {!isUser && typingDots(msg.delay)}

                  {frame >= msg.delay && (
                    <div style={{
                      alignSelf: isUser ? 'flex-start' : 'flex-end',
                      maxWidth: '85%', padding: '11px 16px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isUser ? 'rgba(255,255,255,0.08)' : `${BRAND.primary}20`,
                      border: isUser ? '1px solid rgba(255,255,255,0.06)' : `1px solid ${BRAND.primary}30`,
                      opacity: msgSpring, transform: `translateY(${interpolate(msgSpring, [0, 1], [12, 0])}px)`,
                    }}>
                      {!isUser && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <span style={{ fontSize: 9 }}>🧠</span>
                          <span style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: BRAND.primary }}>AI</span>
                        </div>
                      )}
                      <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.white, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                        {msg.text}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ position: 'absolute', bottom: 22, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 18,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: BRAND.muted, direction: 'rtl',
            }}>
              שאל את ה-AI...
            </div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: BRAND.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16 }}>↑</div>
          </div>
        </div>
      </DeviceFrame>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ACTIONS [370-570f = 12.3-19s]
// ═══════════════════════════════════════════════════════════
const AIActionsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const actions = [
    { emoji: '📄', text: 'הצעת מחיר נשלחה לדנה', status: '✅', color: '#22C55E', delay: 8 },
    { emoji: '📅', text: 'פגישה תואמה ליום רביעי 11:00', status: '✅', color: '#22C55E', delay: 22 },
    { emoji: '📊', text: 'דוח שבועי נוצר אוטומטית', status: '✅', color: '#22C55E', delay: 36 },
    { emoji: '🔔', text: 'תזכורת פולואפ — מחר 09:00', status: '⏰', color: '#F59E0B', delay: 50 },
    { emoji: '📱', text: 'פוסט לינקדאין מוכן לאישור', status: '📝', color: MODULE_COLORS.social.accent, delay: 64 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={3} color={BRAND.primary} speed={0.01} maxSize={90} />
      <ParticleField count={6} color={BRAND.primary} speed={0.25} />

      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND.primary}06 0%, transparent 60%)`,
        opacity: pulse(frame, 0.04, 0.4, 0.7),
      }} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        🧠 AI ביצע עכשיו:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 40 }}>
        {actions.map((action, i) => {
          const s = spring({ frame: Math.max(0, frame - action.delay), fps, config: SPRING.hero, durationInFrames: 18 });
          const iconFloat = pulse(frame, 0.04 + i * 0.005, -1.5, 1.5);
          return (
            <div key={i} style={{
              width: 720, padding: '14px 20px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${action.color}18`,
              boxShadow: `0 4px 16px ${action.color}06`,
              display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
            }}>
              <span style={{ fontSize: 22, transform: `translateY(${iconFloat}px)` }}>{action.emoji}</span>
              <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white, flex: 1 }}>{action.text}</span>
              <span style={{ fontSize: 16 }}>{action.status}</span>
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: TAGLINE [570-870f = 19-29s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subSpring = spring({ frame: Math.max(0, frame - 22), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ background: BRAND.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.12)" size={450} speed={0.05} />
      <ParticleField count={12} color="rgba(255,255,255,0.2)" speed={0.5} />

      <TextReveal text="AI שעובד. אתה מנהל." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.65)', direction: 'rtl',
        opacity: subSpring,
      }}>
        שיחה אחת. AI עושה את השאר.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const AIActionVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={90}><HookScene /></Sequence>
      <Sequence from={90} durationInFrames={280}><AIChatScene /></Sequence>
      <Sequence from={370} durationInFrames={200}><AIActionsScene /></Sequence>
      <Sequence from={570} durationInFrames={300}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={BRAND.primary} tagline="AI שעובד. אתה מנהל." />
      </Sequence>
    </AbsoluteFill>
  );
};
