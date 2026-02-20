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
import { pulse, FloatingOrbs, MorphBlob, ParticleField, BreathingRing } from '../../shared/components/MicroAnimations';

const SC = MODULE_COLORS.social;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Post publish explosion + counter [0-75f = 0-2.5s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pressScale = frame < 6 ? interpolate(frame, [0, 3, 6], [1, 0.85, 1.15]) : 1;

  const icons = ['❤️', '💬', '🔄', '📈', '👁️', '🔥', '⭐', '🚀', '💡', '📱', '✨', '🎯'];
  const explodeStart = 6;

  const counterSpring = spring({ frame: Math.max(0, frame - 16), fps, config: { damping: 18, stiffness: 50, mass: 1 }, durationInFrames: 35 });
  const counterValue = Math.round(12400 * counterSpring);

  const subSpring = spring({ frame: Math.max(0, frame - 40), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0A14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <MorphBlob color={SC.accent} size={500} speed={0.025} />
      <FloatingOrbs count={5} color={SC.accent} speed={0.02} />

      {/* Send button with pulsing glow */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: SC.gradient,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        transform: `scale(${pressScale})`,
        boxShadow: `0 0 ${pulse(frame, 0.08, 30, 60)}px ${SC.accent}50`,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 36 }}>📤</span>
      </div>

      <BreathingRing color={SC.accent} size={250} speed={0.07} />

      {/* Exploding icons that keep orbiting */}
      {frame >= explodeStart && icons.map((icon, i) => {
        const angle = (i / icons.length) * Math.PI * 2 + Math.PI / 6;
        const progress = interpolate(frame - explodeStart, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
        const dist = progress * (200 + i * 25);
        const orbit = frame * 0.008 * (i % 2 === 0 ? 1 : -1);
        const x = Math.cos(angle + orbit) * dist;
        const y = Math.sin(angle + orbit) * dist;
        const opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 0.5]);
        const scale = interpolate(progress, [0, 0.2, 1], [0, 1.3, 0.9]);

        return (
          <div key={i} style={{
            position: 'absolute', fontSize: 26,
            transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity,
          }}>
            {icon}
          </div>
        );
      })}

      {/* Counter with background */}
      <div style={{
        position: 'absolute', marginTop: 220,
        padding: '10px 30px', borderRadius: 18,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontFamily: RUBIK, fontSize: 68, fontWeight: 800, color: BRAND.white,
          opacity: counterSpring, textShadow: `0 0 40px ${SC.accent}40`, textAlign: 'center',
        }}>
          {counterValue.toLocaleString()}
        </div>
      </div>
      <div style={{
        position: 'absolute', marginTop: 330,
        padding: '6px 18px', borderRadius: 12, background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 700, color: BRAND.muted,
        opacity: subSpring, direction: 'rtl',
      }}>
        חשיפות ב-24 שעות
      </div>

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Content calendar chaos [75-210f = 2.5-7s]
// ═══════════════════════════════════════════════════════════
const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const POSTS = [
    { platform: '📘', text: 'פוסט פייסבוק', status: 'טיוטה', color: '#3B82F6' },
    { platform: '📸', text: 'סטורי אינסטגרם', status: 'לא פורסם', color: '#E4405F' },
    { platform: '💼', text: 'מאמר לינקדאין', status: 'טיוטה', color: '#0A66C2' },
    { platform: '🐦', text: 'ציוץ X', status: 'רעיון', color: '#1DA1F2' },
    { platform: '📹', text: 'Reel קצר', status: 'מחכה', color: '#FF0050' },
    { platform: '📧', text: 'ניוזלטר', status: 'שכחתי', color: '#F59E0B' },
  ];

  const warningPulse = pulse(frame, 0.1, 0.6, 1.0);
  const pendingCount = Math.min(Math.floor(frame / 7), 6);

  const painSpring = spring({ frame: Math.max(0, frame - 100), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0A14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <MorphBlob color="#EF4444" size={400} speed={0.03} />
      <FloatingOrbs count={3} color="#EF4444" speed={0.02} />

      <DeviceFrame scale={1.05} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: BRAND.white }}>לוח תוכן</div>
            <div style={{
              padding: '4px 12px', borderRadius: 10, background: '#EF444420',
              fontFamily: RUBIK, fontSize: 11, fontWeight: 800, color: '#EF4444', opacity: warningPulse,
            }}>
              ⚠️ {pendingCount} ממתינים
            </div>
          </div>
          <div style={{
            fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: '#EF4444', marginBottom: 10,
            padding: '5px 10px', borderRadius: 8, background: '#EF444410', border: '1px solid #EF444420',
          }}>
            0 פוסטים מתוזמנים · המתחרים מפרסמים 3 ביום
          </div>

          {POSTS.map((post, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const drift = Math.sin(frame * 0.15 + i * 1.5) * 2;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', marginBottom: 5, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + drift}px)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{post.platform}</span>
                  <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white }}>{post.text}</span>
                </div>
                <span style={{
                  fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#F59E0B',
                  background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: 6,
                }}>
                  {post.status}
                </span>
              </div>
            );
          })}
        </div>
      </DeviceFrame>

      {frame > 100 && (
        <div style={{
          position: 'absolute', bottom: 70,
          padding: '12px 24px', borderRadius: 16,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid #EF444430',
          fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#EF4444', direction: 'rtl',
          opacity: painSpring,
        }}>
          בלי תוכן = בלי לקוחות 📉
        </div>
      )}

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Content auto-generation [210-375f = 7-12.5s]
// ═══════════════════════════════════════════════════════════
const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sweepProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  const fullText = 'איך AI משנה את ניהול העסק שלך ב-2026 — 5 טיפים שכל בעל עסק חייב לדעת...';
  const typedChars = Math.min(Math.floor((frame - 20) * 0.6), fullText.length);
  const displayText = frame >= 20 ? fullText.slice(0, Math.max(0, typedChars)) : '';
  const isTyping = frame >= 20 && typedChars < fullText.length;
  const cursorBlink = Math.sin(frame * 0.3) > 0 ? 1 : 0;

  const hashtags = ['#AI', '#עסקים', '#שיווק_דיגיטלי', '#MISRAD', '#אוטומציה'];

  const breathe = pulse(frame, 0.04, 0.95, 1.05);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0A14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <MorphBlob color={SC.accent} size={600} speed={0.02} />
      <ParticleField count={10} color={SC.accent} speed={0.5} />

      <div style={{
        position: 'absolute', width: 1000, height: 1000, borderRadius: '50%',
        background: `radial-gradient(circle, ${SC.accent}10 0%, transparent 60%)`,
        transform: `scale(${0.3 + sweepProgress * 1.5})`,
      }} />

      <GlassCard variant="dark" delay={5} width={800} glowColor={SC.accent}>
        <div style={{ padding: 28, direction: 'rtl' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: SC.gradient,
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              transform: `scale(${breathe})`,
              boxShadow: `0 0 ${pulse(frame, 0.06, 8, 16)}px ${SC.accent}40`,
            }}>
              <span style={{ fontSize: 18 }}>🧠</span>
            </div>
            <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 700, color: BRAND.white }}>
              AI יוצר תוכן...
            </span>
            {isTyping && (
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: SC.accent,
                opacity: cursorBlink, boxShadow: `0 0 8px ${SC.accent}60`,
              }} />
            )}
          </div>

          <div style={{
            fontFamily: HEEBO, fontSize: 18, fontWeight: 600, color: BRAND.white,
            lineHeight: 1.7, minHeight: 80, direction: 'rtl',
          }}>
            {displayText}
            {isTyping && <span style={{ color: SC.accent, opacity: cursorBlink }}>|</span>}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {hashtags.map((tag, i) => {
              const tagSpring = spring({ frame: Math.max(0, frame - 80 - i * 5), fps, config: SPRING.punch, durationInFrames: 12 });
              const tagPulse = pulse(frame, 0.03 + i * 0.005, 0.9, 1.05);
              return (
                <span key={i} style={{
                  fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: SC.accent,
                  background: `${SC.accent}12`, padding: '4px 12px', borderRadius: 16,
                  opacity: tagSpring, transform: `scale(${interpolate(tagSpring, [0, 1], [0.6, 1]) * tagPulse})`,
                }}>
                  {tag}
                </span>
              );
            })}
          </div>

          {/* Platform badges */}
          {frame > 110 && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-around',
              opacity: spring({ frame: Math.max(0, frame - 110), fps, config: SPRING.ui, durationInFrames: 14 }),
            }}>
              {['📘 פייסבוק', '📸 אינסטגרם', '💼 לינקדאין', '🐦 X'].map((p, i) => {
                const pS = spring({ frame: Math.max(0, frame - 115 - i * 4), fps, config: SPRING.punch, durationInFrames: 12 });
                return (
                  <div key={i} style={{
                    fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#22C55E',
                    padding: '3px 8px', borderRadius: 8, background: '#22C55E10',
                    opacity: pS, transform: `scale(${interpolate(pS, [0, 1], [0.5, 1])})`,
                  }}>
                    ✅ {p}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>

      <div style={{
        position: 'absolute', bottom: 280,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
      }}>
        <TextReveal text="AI שכותב, מתזמן ומפרסם." delay={30} fontSize={40} fontWeight={900} color={BRAND.white} mode="words" stagger={3} />
      </div>

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Scheduled posts + analytics [375-540f = 12.5-18s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 165], [50, -30], { extrapolateRight: 'clamp' });
  const chartSpring = spring({ frame: Math.max(0, frame - 55), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0A14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <MorphBlob color={SC.accent} size={400} speed={0.015} x="30%" y="60%" />
      <FloatingOrbs count={4} color={SC.accent} speed={0.015} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <DeviceFrame scale={1.05} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white }}>לוח תוכן חכם</div>
              <div style={{
                padding: '3px 10px', borderRadius: 8, background: '#22C55E18',
                fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: '#22C55E',
              }}>✅ אוטומטי</div>
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: '#22C55E', marginBottom: 10 }}>
              5 פוסטים מתוזמנים · שעות מיטביות AI
            </div>

            {[
              { platform: '📘', text: 'פייסבוק', time: 'רביעי 11:00', engagement: '+340%' },
              { platform: '📸', text: 'אינסטגרם', time: 'חמישי 14:00', engagement: '+210%' },
              { platform: '💼', text: 'לינקדאין', time: 'שני 09:00', engagement: '+180%' },
            ].map((post, i) => {
              const s = spring({ frame: Math.max(0, frame - 8 - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
              const engGlow = pulse(frame, 0.05 + i * 0.01, 0.7, 1.0);
              return (
                <div key={i} style={{
                  padding: '10px 12px', marginBottom: 6, borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{post.platform}</span>
                      <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white }}>{post.text}</span>
                    </div>
                    <span style={{
                      fontFamily: RUBIK, fontSize: 12, fontWeight: 700, color: '#22C55E',
                      opacity: engGlow,
                    }}>{post.engagement}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: BRAND.muted }}>⏰ {post.time}</span>
                    <span style={{
                      fontFamily: HEEBO, fontSize: 9, fontWeight: 700, color: SC.accent,
                      background: `${SC.accent}12`, padding: '2px 6px', borderRadius: 6,
                    }}>שעה מיטבית AI</span>
                  </div>
                </div>
              );
            })}

            {/* Analytics chart */}
            <div style={{
              marginTop: 8, padding: 14, borderRadius: 16, background: SC.gradient,
              boxShadow: `0 10px 30px ${SC.accent}25`, opacity: chartSpring,
              transform: `translateY(${interpolate(chartSpring, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>📊 ביצועים השבוע</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 60 }}>
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו'].map((day, i) => {
                  const barH = [25, 40, 30, 70, 55, 45][i];
                  const barAnim = spring({ frame: Math.max(0, frame - 60 - i * 3), fps, config: { damping: 15, stiffness: 80, mass: 1 }, durationInFrames: 20 });
                  const barGlow = pulse(frame, 0.04, 0.5, 1.0);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{
                        width: 20, height: barH * barAnim, borderRadius: 4,
                        background: 'rgba(255,255,255,0.3)',
                        boxShadow: i === 3 ? `0 0 8px rgba(255,255,255,${0.2 * barGlow})` : 'none',
                      }} />
                      <span style={{ fontFamily: HEEBO, fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DeviceFrame>
      </div>
      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: FEATURES — Social capabilities [540-690f = 18-23s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '✍️', title: 'יצירת תוכן AI', desc: 'פוסטים, כיתובים, האשטגים — הכל נכתב אוטומטית בסגנון שלך.', color: SC.accent },
    { icon: '📅', title: 'תזמון חכם', desc: 'AI מזהה מתי הקהל שלך פעיל — ומפרסם בדיוק ברגע הנכון.', color: '#EC4899' },
    { icon: '📊', title: 'אנליטיקס מאוחד', desc: 'כל הפלטפורמות בדשבורד אחד. AI מציע שיפורים.', color: '#3B82F6' },
    { icon: '🎨', title: 'בינה ויזואלית', desc: 'AI מנתח אילו תמונות עובדות — ומציע את הוויזואל המנצח.', color: '#F59E0B' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0A14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <MorphBlob color={SC.accent} size={500} speed={0.02} x="70%" y="30%" />
      <ParticleField count={12} color={SC.accent} speed={0.4} />

      <div style={{
        position: 'absolute', top: 55,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: HEEBO, fontSize: 26, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה Social יודע לעשות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 50 }}>
        {features.map((f, i) => {
          const delay = i * 18;
          const s = spring({ frame: Math.max(0, frame - delay - 12), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconPulse = pulse(frame, 0.04 + i * 0.006, 0.9, 1.1);
          return (
            <div key={i} style={{
              width: 700, padding: '18px 22px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}20`,
              display: 'flex', alignItems: 'flex-start', gap: 14, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: `${f.color}12`, border: `1px solid ${f.color}25`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 22, flexShrink: 0,
                transform: `scale(${iconPulse})`,
                boxShadow: `0 0 ${10 * iconPulse}px ${f.color}18`,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 17, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, lineHeight: 1.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: RESULTS — Animated counters [690-810f = 23-27s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 340, prefix: '+', suffix: '%', label: 'חשיפות', delay: 0 },
    { target: 90, prefix: '-', suffix: '%', label: 'זמן יצירת תוכן', delay: 15 },
    { target: 247, prefix: '+', suffix: '%', label: 'אינגייג׳מנט', delay: 30 },
    { target: 0, prefix: '', suffix: '', label: 'ימים שנשכח לפרסם', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0A14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <MorphBlob color={SC.accent} size={500} speed={0.015} />
      <FloatingOrbs count={4} color={SC.accent} speed={0.01} />

      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)',
        fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: BRAND.white, direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        התוצאות מדברות
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 40, padding: '0 60px', width: '100%', maxWidth: 800 }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 18 });
          const counterS = spring({ frame: Math.max(0, frame - stat.delay - 3), fps, config: { damping: 20, stiffness: 50, mass: 1 }, durationInFrames: 30 });
          const displayVal = Math.round(stat.target * counterS);
          const glowAmount = pulse(frame, 0.04, 8, 16);
          return (
            <div key={i} style={{
              padding: '24px 20px', borderRadius: 22,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${SC.accent}15`, textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 0 ${glowAmount}px ${SC.accent}10`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: SC.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {frame > 80 && (
        <div style={{
          position: 'absolute', bottom: 50, maxWidth: 700,
          padding: '14px 24px', borderRadius: 20,
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
          direction: 'rtl', opacity: testSpring,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
            "פעם יצרתי תוכן יום שלם. היום AI עושה את זה ב-3 דקות — והתוצאות טובות פי 3."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>
            — בעלת סטודיו לעיצוב
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7: TAGLINE [810-870f = 27-29s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ background: SC.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      <BreathingRing color="rgba(255,255,255,0.15)" size={450} speed={0.05} />
      <ParticleField count={15} color="rgba(255,255,255,0.3)" speed={0.6} />

      <TextReveal text="AI שמשווק את העסק שלך" delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={2} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.12)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl',
        opacity: subSpring,
      }}>
        תוכן. תזמון. תוצאות. הכל אוטומטי.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const SocialVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={75}><HookScene /></Sequence>
      <Sequence from={75} durationInFrames={135}><ProblemScene /></Sequence>
      <Sequence from={210} durationInFrames={165}><AIEntranceScene /></Sequence>
      <Sequence from={375} durationInFrames={165}><ShowcaseScene /></Sequence>
      <Sequence from={540} durationInFrames={150}><FeaturesScene /></Sequence>
      <Sequence from={690} durationInFrames={120}><ResultsScene /></Sequence>
      <Sequence from={810} durationInFrames={60}><TaglineScene /></Sequence>
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={SC.accent} tagline="AI שמשווק את העסק שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
