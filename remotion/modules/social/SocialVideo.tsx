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
import { PhoneFrame } from '../../shared/components/PhoneFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';

const SOCIAL = MODULE_COLORS.social;

// ═══════════════════════════════════════════════════════════
// HOOK — Post publish explosion → engagement counter
// [0-36f]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Send button press
  const pressScale = frame < 6 ? interpolate(frame, [0, 3, 6], [1, 0.85, 1.1]) : 1;

  // Explosion of social icons
  const icons = ['❤️', '💬', '🔄', '📈', '👁️', '🔥', '⭐', '🚀', '💡', '📱'];
  const explodeStart = 6;

  // Engagement counter
  const counterSpring = spring({ frame: Math.max(0, frame - 16), fps, config: SPRING.punch, durationInFrames: 12 });
  const counterValue = Math.round(interpolate(counterSpring, [0, 1], [0, 12400]));

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Purple ambient */}
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}15 0%, transparent 60%)` }} />

      {/* Send button */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: SOCIAL.gradient,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${pressScale})`,
          boxShadow: `0 0 ${frame > 6 ? 60 : 20}px ${SOCIAL.accent}50`,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 36 }}>📤</span>
      </div>

      {/* Exploding icons */}
      {frame >= explodeStart && icons.map((icon, i) => {
        const angle = (i / icons.length) * Math.PI * 2 + Math.PI / 6;
        const progress = interpolate(frame - explodeStart, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
        const dist = progress * (250 + i * 30);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 0.3]);
        const scale = interpolate(progress, [0, 0.2, 1], [0, 1.3, 0.8]);

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              fontSize: 28,
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              opacity,
            }}
          >
            {icon}
          </div>
        );
      })}

      {/* Engagement counter */}
      <div
        style={{
          position: 'absolute',
          marginTop: 240,
          fontFamily: RUBIK,
          fontSize: 72,
          fontWeight: 800,
          color: BRAND.white,
          opacity: counterSpring,
          textShadow: `0 0 40px ${SOCIAL.accent}40`,
        }}
      >
        {counterValue.toLocaleString()}
      </div>
      <div
        style={{
          position: 'absolute',
          marginTop: 330,
          fontFamily: HEEBO,
          fontSize: 26,
          fontWeight: 700,
          color: BRAND.muted,
          opacity: counterSpring,
          direction: 'rtl',
        }}
      >
        חשיפות ב-24 שעות
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SETUP — Content calendar chaos
// [36-105f]
// ═══════════════════════════════════════════════════════════
const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const POSTS = [
    { platform: '📘', text: 'פוסט פייסבוק', status: 'טיוטה', color: '#3B82F6' },
    { platform: '📸', text: 'סטורי אינסטגרם', status: 'לא פורסם', color: '#E4405F' },
    { platform: '💼', text: 'מאמר לינקדאין', status: 'טיוטה', color: '#0A66C2' },
    { platform: '🐦', text: 'ציוץ X', status: 'רעיון', color: '#1DA1F2' },
    { platform: '📹', text: 'Reel קצר', status: 'מחכה', color: '#FF0050' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <PhoneFrame scale={1.1} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 20px 20px', direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: BRAND.white, marginBottom: 6 }}>
            לוח תוכן
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 16 }}>
            ⚠️ 5 פוסטים ממתינים, 0 מתוזמנים
          </div>

          {POSTS.map((post, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  marginBottom: 8,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{post.platform}</span>
                  <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white }}>{post.text}</span>
                </div>
                <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 8 }}>
                  {post.status}
                </span>
              </div>
            );
          })}
        </div>
      </PhoneFrame>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// AI ENTRANCE — Content auto-generation
// [105-180f]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sweepProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Typing effect for AI-generated content
  const fullText = 'איך AI משנה את ניהול העסק שלך ב-2026...';
  const typedChars = Math.min(Math.floor((frame - 25) * 0.8), fullText.length);
  const displayText = frame >= 25 ? fullText.slice(0, Math.max(0, typedChars)) : '';

  // Hashtags pop in
  const hashtags = ['#AI', '#עסקים', '#שיווק_דיגיטלי', '#MISRAD'];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      {/* Purple sweep */}
      <div style={{ position: 'absolute', width: 1000, height: 1000, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}12 0%, transparent 60%)`, transform: `scale(${0.3 + sweepProgress * 1.5})` }} />

      {/* AI writing card */}
      <GlassCard variant="dark" delay={5} width={800} glowColor={SOCIAL.accent}>
        <div style={{ padding: 32, direction: 'rtl' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>🧠</span>
            </div>
            <span style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 700, color: BRAND.white }}>
              AI יוצר תוכן...
            </span>
            {/* Blinking cursor */}
            {frame >= 25 && typedChars < fullText.length && (
              <div style={{ width: 2, height: 18, background: SOCIAL.accent, opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }} />
            )}
          </div>

          {/* Generated text */}
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 600, color: BRAND.white, lineHeight: 1.6, minHeight: 60 }}>
            {displayText}
            {frame >= 25 && typedChars < fullText.length && (
              <span style={{ color: SOCIAL.accent, opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>|</span>
            )}
          </div>

          {/* Hashtags */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {hashtags.map((tag, i) => {
              const tagSpring = spring({ frame: Math.max(0, frame - 50 - i * 4), fps, config: SPRING.punch, durationInFrames: 12 });
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: HEEBO,
                    fontSize: 14,
                    fontWeight: 700,
                    color: SOCIAL.accent,
                    background: `${SOCIAL.accent}15`,
                    padding: '5px 14px',
                    borderRadius: 20,
                    opacity: tagSpring,
                    transform: `scale(${interpolate(tagSpring, [0, 1], [0.6, 1])})`,
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Bottom text */}
      <div style={{ position: 'absolute', bottom: 340 }}>
        <TextReveal text="AI שכותב, מתזמן ומפרסם." delay={35} fontSize={44} fontWeight={900} color={BRAND.white} mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SHOWCASE — Scheduled posts + analytics
// [180-300f]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 120], [50, -30], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}08 0%, transparent 60%)`, top: '25%' }} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <PhoneFrame scale={1.1} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '60px 20px 20px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: BRAND.white, marginBottom: 4 }}>
              לוח תוכן חכם
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#22C55E', marginBottom: 16 }}>
              ✅ 5 פוסטים מתוזמנים, הכל אוטומטי
            </div>

            {/* Scheduled posts */}
            {[
              { platform: '📘', text: 'פייסבוק', time: 'רביעי 11:00', engagement: '+340%' },
              { platform: '📸', text: 'אינסטגרם', time: 'חמישי 14:00', engagement: '+210%' },
              { platform: '💼', text: 'לינקדאין', time: 'שני 09:00', engagement: '+180%' },
            ].map((post, i) => {
              const s = spring({ frame: Math.max(0, frame - 10 - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{ padding: '14px 16px', marginBottom: 10, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{post.platform}</span>
                      <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white }}>{post.text}</span>
                    </div>
                    <span style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 700, color: '#22C55E' }}>{post.engagement}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted }}>⏰ {post.time}</span>
                    <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: SOCIAL.accent, background: `${SOCIAL.accent}15`, padding: '2px 8px', borderRadius: 6 }}>שעה מיטבית AI</span>
                  </div>
                </div>
              );
            })}

            {/* Analytics mini chart */}
            <div
              style={{
                marginTop: 14,
                padding: 16,
                borderRadius: 16,
                background: SOCIAL.gradient,
                boxShadow: `0 10px 30px ${SOCIAL.accent}25`,
                opacity: spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 }),
              }}
            >
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>📊 ביצועים השבוע</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'].map((day, i) => {
                  const barH = [30, 45, 35, 80, 65][i];
                  const barAnim = spring({ frame: Math.max(0, frame - 55 - i * 3), fps, config: { damping: 15, stiffness: 80, mass: 1 }, durationInFrames: 20 });
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 24, height: barH * barAnim, borderRadius: 4, background: 'rgba(255,255,255,0.3)' }} />
                      <span style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// RESULTS
// [300-390f]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: '+340%', label: 'חשיפות', delay: 0 },
    { value: '-90%', label: 'זמן יצירת תוכן', delay: 8 },
    { value: '24/7', label: 'פרסום אוטומטי', delay: 16 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL.accent}06 0%, transparent 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 15 });
          return (
            <GlassCard key={i} variant="dark" delay={stat.delay} width={700} glowColor={SOCIAL.accent}>
              <div style={{ padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 64, fontWeight: 800, background: SOCIAL.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transform: `scale(${interpolate(s, [0, 1], [1.5, 1])})`, filter: `blur(${interpolate(s, [0, 1], [8, 0])}px)`, display: 'inline-block' }}>
                  {stat.value}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// TAGLINE [390-450f]
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: SOCIAL.gradient, justifyContent: 'center', alignItems: 'center', opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <TextReveal text="AI שמשווק את העסק שלך" delay={5} fontSize={52} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />
      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// MAIN
export const SocialVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={36}><HookScene /></Sequence>
      <Sequence from={36} durationInFrames={69}><SetupScene /></Sequence>
      <Sequence from={105} durationInFrames={75}><AIEntranceScene /></Sequence>
      <Sequence from={180} durationInFrames={120}><ShowcaseScene /></Sequence>
      <Sequence from={300} durationInFrames={90}><ResultsScene /></Sequence>
      <Sequence from={390} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={450} durationInFrames={90}>
        <CTAEndcard variant="dark" accentColor={SOCIAL.accent} tagline="AI שמקדם את הארגון שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
