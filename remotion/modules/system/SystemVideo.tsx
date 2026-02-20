import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Img,
  staticFile,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING, FPS } from '../../shared/config';
import { NoiseLayer } from '../../shared/components/NoiseLayer';
import { GlassCard } from '../../shared/components/GlassCard';
import { DeviceFrame } from '../../shared/components/DeviceFrame';
import { TextReveal } from '../../shared/components/TextReveal';
import { CTAEndcard } from '../../shared/components/CTAEndcard';
import { pulse, FloatingOrbs, ScanLines } from '../../shared/components/MicroAnimations';

const SYS = MODULE_COLORS.system;

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — Score explosion + pulsing rings [0-75f = 0-2.5s]
// ═══════════════════════════════════════════════════════════
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pixelScale = spring({ frame, fps, config: { damping: 6, stiffness: 300, mass: 0.4 }, durationInFrames: 12 });
  const shockwave = spring({ frame: Math.max(0, frame - 8), fps, config: SPRING.punch, durationInFrames: 18 });
  const shockSize = interpolate(shockwave, [0, 1], [0, 1200]);
  const shockOp = interpolate(shockwave, [0, 1], [0.8, 0]);

  const scoreFrame = Math.max(0, frame - 12);
  const scoreProgress = spring({ frame: scoreFrame, fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 30 });
  const score = Math.round(75 * scoreProgress);

  const subSpring = spring({ frame: Math.max(0, frame - 35), fps, config: SPRING.hero, durationInFrames: 18 });
  const hook2 = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 18 });

  // Continuous pulsing ring
  const ringScale = pulse(frame, 0.08, 1.0, 1.15);
  const ringOp = pulse(frame, 0.06, 0.1, 0.25);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={6} color={SYS.accent} speed={0.015} />

      {/* Persistent pulsing ring */}
      {frame > 25 && (
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          border: `2px solid ${SYS.accent}`, opacity: ringOp,
          transform: `scale(${ringScale})`,
        }} />
      )}

      {/* Shockwave ring */}
      <div style={{
        position: 'absolute', width: shockSize, height: shockSize, borderRadius: '50%',
        border: `3px solid ${SYS.accent}`, opacity: shockOp,
        boxShadow: `0 0 60px ${SYS.accent}40`,
      }} />

      {/* Radial particles */}
      {frame >= 8 && Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const dist = shockwave * 500 + Math.sin(i * 1.5) * 60;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const op = interpolate(shockwave, [0, 0.5, 1], [0, 1, 0]);
        return (
          <div key={i} style={{
            position: 'absolute', width: 5, height: 5, borderRadius: '50%',
            backgroundColor: i % 3 === 0 ? SYS.accent : i % 3 === 1 ? BRAND.indigoLight : BRAND.white,
            left: '50%', top: '50%',
            transform: `translate(${x}px, ${y}px)`,
            opacity: op * 0.7, boxShadow: `0 0 10px ${SYS.accent}`,
          }} />
        );
      })}

      {/* Flash */}
      <AbsoluteFill style={{ backgroundColor: SYS.accent, opacity: interpolate(frame, [8, 12, 20], [0, 0.2, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), pointerEvents: 'none' }} />

      {/* Score number */}
      {frame >= 12 && (
        <div style={{
          fontFamily: RUBIK, fontSize: 160, fontWeight: 800,
          background: SYS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          transform: `scale(${interpolate(scoreProgress, [0, 1], [1.6, 1])})`,
          filter: `blur(${interpolate(scoreProgress, [0, 1], [8, 0])}px)`,
          textShadow: `0 0 80px ${SYS.accent}40`,
          letterSpacing: -4,
        }}>
          {score}%
        </div>
      )}

      {/* "סיכוי לסגירה" */}
      <div style={{
        position: 'absolute', marginTop: 180,
        padding: '10px 28px', borderRadius: 16,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
        fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: BRAND.white,
        direction: 'rtl', opacity: subSpring,
        transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
      }}>
        סיכוי לסגירה
      </div>

      {/* "הלידים שלך כבר מחכים" */}
      <div style={{
        position: 'absolute', marginTop: 260,
        padding: '6px 20px', borderRadius: 12,
        background: 'rgba(0,0,0,0.4)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted,
        direction: 'rtl', opacity: hook2,
        transform: `translateY(${interpolate(hook2, [0, 1], [15, 0])}px)`,
      }}>
        הלידים שלך כבר מחכים. AI יודע מי יסגור.
      </div>

      <ScanLines color={SYS.accent} />
      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Chaotic leads with live warning counter [75-210f = 2.5-7s]
// ═══════════════════════════════════════════════════════════
const CHAOTIC_LEADS = [
  { name: 'דני כהן', phone: '054-XXX', status: 'לא חזר', daysAgo: 14, risk: 'high' },
  { name: 'שרה לוי', phone: '050-XXX', status: 'שלח הצעה', daysAgo: 7, risk: 'medium' },
  { name: 'יוסי אברהם', phone: '052-XXX', status: 'ממתין', daysAgo: 21, risk: 'high' },
  { name: 'רונית כץ', phone: '058-XXX', status: 'מעוניינת?', daysAgo: 3, risk: 'low' },
  { name: 'אלי מזרחי', phone: '053-XXX', status: 'אין תגובה', daysAgo: 30, risk: 'high' },
  { name: 'מיכל דוד', phone: '054-XXX', status: 'התקשר שוב', daysAgo: 10, risk: 'medium' },
  { name: 'עומר חדד', phone: '052-XXX', status: 'ללא מעקב', daysAgo: 18, risk: 'high' },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  // Live counter that increments over time
  const missedCount = Math.min(Math.floor(frame / 6), 14);

  // Warning flash that pulses
  const warningPulse = pulse(frame, 0.12, 0.6, 1.0);

  // Money lost counter
  const moneyLost = Math.min(Math.floor(frame / 3) * 150, 12000);

  const painSpring = spring({ frame: Math.max(0, frame - 90), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Red danger glow that pulses */}
      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: `radial-gradient(circle, #EF444415 0%, transparent 60%)`,
        opacity: warningPulse, transform: `scale(${pulse(frame, 0.05, 0.9, 1.1)})`,
      }} />

      <FloatingOrbs count={4} color="#EF4444" speed={0.025} />

      <DeviceFrame scale={1.05} delay={0}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl' }}>
          {/* Header with live counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: BRAND.white }}>הלידים שלי</div>
            <div style={{
              padding: '4px 12px', borderRadius: 10, background: '#EF444420',
              fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: '#EF4444',
              opacity: warningPulse,
            }}>
              ⚠️ {missedCount} לא טופלו
            </div>
          </div>

          {/* Money lost ticker */}
          <div style={{
            padding: '6px 12px', borderRadius: 10, background: '#EF444410',
            border: '1px solid #EF444420', marginBottom: 10,
            fontFamily: RUBIK, fontSize: 11, fontWeight: 700, color: '#EF4444',
            textAlign: 'center',
          }}>
            💸 הפסד משוער: ₪{moneyLost.toLocaleString()}
          </div>

          {/* Lead cards with continuous shake */}
          {CHAOTIC_LEADS.map((lead, i) => {
            const s = spring({ frame: Math.max(0, frame - i * 4 - 5), fps, config: SPRING.ui, durationInFrames: 12 });
            const shake = lead.risk === 'high' ? Math.sin(frame * 0.25 + i * 2.5) * 3 : 0;
            const riskColor = lead.risk === 'high' ? '#EF4444' : lead.risk === 'medium' ? '#F59E0B' : '#22C55E';
            const riskGlow = lead.risk === 'high' ? pulse(frame, 0.1 + i * 0.01, 0.4, 1.0) : 1;
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', marginBottom: 4, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${riskColor}${lead.risk === 'high' ? '25' : '10'}`,
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + shake}px)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: riskColor,
                    boxShadow: `0 0 ${6 + 4 * riskGlow}px ${riskColor}60`,
                    opacity: riskGlow,
                  }} />
                  <div>
                    <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white }}>{lead.name}</div>
                    <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: riskColor }}>
                      {lead.status} · {lead.daysAgo} ימים
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: RUBIK, fontSize: 9, fontWeight: 700, color: '#64748B' }}>{lead.phone}</div>
              </div>
            );
          })}
        </div>
      </DeviceFrame>

      {/* Pain text with proper background */}
      {frame > 90 && (
        <div style={{
          position: 'absolute', bottom: 80,
          padding: '14px 28px', borderRadius: 18,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid #EF444430',
          fontFamily: HEEBO, fontSize: 24, fontWeight: 900,
          color: '#EF4444', direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [20, 0])}px)`,
        }}>
          כל ליד שלא טופל = כסף שהלך 💸
        </div>
      )}

      <ScanLines color="#EF4444" />
      <NoiseLayer opacity={0.03} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: AI ENTRANCE — Dramatic sweep + sorted UI [210-375f = 7-12.5s]
// ═══════════════════════════════════════════════════════════
const SORTED_LEADS = [
  { name: 'רונית כץ', score: 92, action: 'שלח הצעת מחיר עכשיו', color: '#22C55E' },
  { name: 'שרה לוי', score: 78, action: 'תזמן שיחת פולואפ', color: '#22C55E' },
  { name: 'מיכל דוד', score: 65, action: 'שלח תזכורת אוטומטית', color: '#F59E0B' },
  { name: 'דני כהן', score: 41, action: 'העבר לנרטור', color: '#F59E0B' },
  { name: 'יוסי אברהם', score: 23, action: 'סגור — לא רלוונטי', color: '#EF4444' },
];

const AIEntranceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dramatic flash
  const flashOp = interpolate(frame, [0, 6, 18], [0, 0.5, 0], { extrapolateRight: 'clamp' });

  // Light sweep
  const sweepX = interpolate(frame, [3, 35], [-300, 1500], { extrapolateRight: 'clamp' });

  // Background transition dark→slightly lighter
  const bgProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  // "AI מנתח..." text
  const analyzeSpring = spring({ frame: Math.max(0, frame - 8), fps, config: SPRING.hero, durationInFrames: 18 });

  // Scanning line that sweeps over the phone
  const scanY = interpolate(frame, [30, 80, 130], [0, 100, 0], { extrapolateRight: 'extend' });

  // List appears staggered
  const listStart = 50;

  // AI insight card at end
  const insightSpring = spring({ frame: Math.max(0, frame - 120), fps, config: SPRING.ui, durationInFrames: 20 });

  // Continuous breathing glow
  const breathe = pulse(frame, 0.04, 0.8, 1.2);

  return (
    <AbsoluteFill style={{ backgroundColor: interpolate(bgProgress, [0, 1], [0, 0], { extrapolateRight: 'clamp' }) === 0 ? '#0A0A0F' : '#0D0D14', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Flash */}
      <AbsoluteFill style={{ background: SYS.gradient, opacity: flashOp, pointerEvents: 'none' }} />

      {/* Light sweep bar */}
      <div style={{
        position: 'absolute', width: 120, height: '100%',
        background: `linear-gradient(90deg, transparent, ${SYS.accent}20, transparent)`,
        transform: `translateX(${sweepX}px)`, pointerEvents: 'none',
      }} />

      <FloatingOrbs count={5} color={SYS.accent} speed={0.018} />

      {/* "AI מנתח..." */}
      <div style={{
        position: 'absolute', top: 50,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
        border: `1px solid ${SYS.accent}30`,
        fontFamily: HEEBO, fontSize: 20, fontWeight: 900,
        color: SYS.accent, direction: 'rtl', opacity: analyzeSpring,
        transform: `translateY(${interpolate(analyzeSpring, [0, 1], [15, 0])}px) scale(${breathe})`,
      }}>
        🧠 AI מנתח {SORTED_LEADS.length} לידים...
      </div>

      {/* Sorted phone UI */}
      <DeviceFrame scale={0.95} delay={25}>
        <div style={{ width: '100%', height: '100%', background: '#0F0F12', padding: '55px 16px 16px', direction: 'rtl', position: 'relative' }}>
          {/* Scan line overlay */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: `${scanY}%`,
            height: 2, background: `linear-gradient(90deg, transparent 5%, ${SYS.accent}60 50%, transparent 95%)`,
            boxShadow: `0 0 20px ${SYS.accent}40`,
            opacity: frame > 30 && frame < 140 ? 0.8 : 0,
            pointerEvents: 'none', zIndex: 10,
          }} />

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: BRAND.white }}>לידים — מדורגים AI</div>
            <div style={{
              padding: '3px 10px', borderRadius: 8, background: '#22C55E20',
              fontFamily: RUBIK, fontSize: 10, fontWeight: 800, color: '#22C55E',
            }}>✅ מנותח</div>
          </div>

          {SORTED_LEADS.map((lead, i) => {
            const delay = listStart + i * 10;
            const s = spring({ frame: Math.max(0, frame - delay), fps, config: SPRING.ui, durationInFrames: 14 });
            // Score counter animation
            const scoreS = spring({ frame: Math.max(0, frame - delay - 5), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 25 });
            const displayScore = Math.round(lead.score * scoreS);
            // Bar glow
            const barGlow = pulse(frame, 0.06 + i * 0.01, 0.5, 1.0);
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', marginBottom: 4, borderRadius: 12,
                background: `${lead.color}08`, border: `1px solid ${lead.color}15`,
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: BRAND.white }}>{lead.name}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: lead.color }}>{lead.action}</div>
                  {/* Mini score bar */}
                  <div style={{ marginTop: 3, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', width: '100%' }}>
                    <div style={{
                      height: '100%', width: `${displayScore}%`, borderRadius: 2,
                      background: lead.color, opacity: barGlow,
                      boxShadow: `0 0 6px ${lead.color}40`,
                    }} />
                  </div>
                </div>
                <div style={{
                  fontFamily: RUBIK, fontSize: 20, fontWeight: 800, color: lead.color,
                  marginRight: 8, minWidth: 44, textAlign: 'center',
                }}>
                  {displayScore}%
                </div>
              </div>
            );
          })}

          {/* AI insight */}
          {frame > 120 && (
            <div style={{
              marginTop: 6, padding: '8px 12px', borderRadius: 12,
              background: `linear-gradient(135deg, ${SYS.accent}18, ${BRAND.indigo}12)`,
              border: `1px solid ${SYS.accent}25`, opacity: insightSpring,
              transform: `translateY(${interpolate(insightSpring, [0, 1], [10, 0])}px)`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>🧠 תובנת AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                רונית כץ — 92% סיכוי. שלח הצעה מותאמת. זמן סגירה: 2.3 ימים.
              </div>
            </div>
          )}
        </div>
      </DeviceFrame>

      <ScanLines color={SYS.accent} />
      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Lead profile deep-dive [375-540f = 12.5-18s]
// ═══════════════════════════════════════════════════════════
const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const craneY = interpolate(frame, [0, 165], [50, -30], { extrapolateRight: 'clamp' });

  const barFill = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 20, stiffness: 60, mass: 1 }, durationInFrames: 40 });
  const healthScore = Math.round(75 * barFill);

  const badgePop = spring({ frame: Math.max(0, frame - 30), fps, config: SPRING.punch, durationInFrames: 12 });
  const recSlide = spring({ frame: Math.max(0, frame - 50), fps, config: SPRING.hero, durationInFrames: 20 });

  // Activity timeline animation
  const timelineStart = 70;

  // Continuous elements
  const glowPulse = pulse(frame, 0.05, 0.6, 1.0);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {/* Soft ambient orbs */}
      <FloatingOrbs count={3} color={SYS.accent} speed={0.01} />

      <div style={{ transform: `translateY(${craneY}px)` }}>
        <DeviceFrame scale={1.05} delay={0} shadowIntensity={0.6}>
          <div style={{ width: '100%', height: '100%', background: BRAND.bgLight, padding: '55px 16px 16px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 12 }}>
              פרופיל ליד — דנה לוי
            </div>

            {/* Health Score Card */}
            <div style={{
              padding: 16, borderRadius: 18, background: '#fff',
              boxShadow: `0 8px 30px rgba(0,0,0,0.06), 0 0 ${20 * glowPulse}px ${SYS.accent}08`,
              marginBottom: 12, border: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#64748B' }}>Health Score</span>
                <span style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: SYS.accent }}>{healthScore}%</span>
              </div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#F1F5F9' }}>
                <div style={{
                  width: `${healthScore}%`, height: '100%', borderRadius: 4,
                  background: SYS.gradient, boxShadow: `0 0 ${12 * glowPulse}px ${SYS.accent}40`,
                }} />
              </div>
            </div>

            {/* AI Badge */}
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              background: `${SYS.accent}10`, border: `1px solid ${SYS.accent}25`,
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              transform: `scale(${interpolate(badgePop, [0, 1], [0.7, 1])})`, opacity: badgePop,
            }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: SYS.accent }}>
                שלח הצעה עד יום רביעי — חלון הזדמנות
              </span>
            </div>

            {/* AI Recommendation */}
            <div style={{
              padding: 14, borderRadius: 18, background: SYS.gradient,
              marginBottom: 12, transform: `translateY(${interpolate(recSlide, [0, 1], [60, 0])}px)`,
              opacity: recSlide, boxShadow: `0 12px 40px ${SYS.accent}30`,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>🧠 המלצת AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                דנה פתחה 3 אימיילים השבוע. סיכוי סגירה 75%. מומלץ: הצעת מחיר מותאמת.
              </div>
            </div>

            {/* Activity timeline */}
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 800, color: '#94A3B8', marginBottom: 6 }}>היסטוריה</div>
            {[
              { text: 'פתחה אימייל', time: 'לפני שעה', icon: '📧' },
              { text: 'ביקרה בדף מחירים', time: 'אתמול', icon: '👁️' },
              { text: 'שיחה טלפונית', time: 'לפני 3 ימים', icon: '📞' },
            ].map((ev, i) => {
              const evS = spring({ frame: Math.max(0, frame - timelineStart - i * 12), fps, config: SPRING.ui, durationInFrames: 14 });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  borderRadius: 10, background: '#fff', marginBottom: 4,
                  border: '1px solid rgba(0,0,0,0.04)',
                  opacity: evS, transform: `translateX(${interpolate(evS, [0, 1], [20, 0])}px)`,
                }}>
                  <span style={{ fontSize: 12 }}>{ev.icon}</span>
                  <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#1E293B', flex: 1 }}>{ev.text}</span>
                  <span style={{ fontFamily: HEEBO, fontSize: 9, fontWeight: 600, color: '#94A3B8' }}>{ev.time}</span>
                </div>
              );
            })}
          </div>
        </DeviceFrame>
      </div>

      <NoiseLayer opacity={0.015} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: FEATURES — Animated feature cards [540-690f = 18-23s]
// ═══════════════════════════════════════════════════════════
const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: '🎯', title: 'דירוג לידים AI', desc: 'כל ליד מקבל ציון 0-100. אתה תמיד יודע על מי לשים דגש.', color: SYS.accent },
    { icon: '⏰', title: 'תזמון חכם', desc: 'ה-AI יודע מתי הליד פתוח — ומתזמן שיחה ברגע הנכון.', color: '#F59E0B' },
    { icon: '📊', title: 'דשבורד מכירות', desc: 'תמונת מצב של pipeline בזמן אמת. חיזוי הכנסות חודשי.', color: BRAND.indigo },
    { icon: '🤖', title: 'פולואפ אוטומטי', desc: 'ליד לא ענה? AI שולח תזכורת — וואטסאפ, SMS, או מייל.', color: '#22C55E' },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={5} color={SYS.accent} speed={0.012} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 60,
        padding: '10px 24px', borderRadius: 16,
        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontFamily: HEEBO, fontSize: 28, fontWeight: 900, color: BRAND.white,
        direction: 'rtl',
        opacity: spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 }),
      }}>
        מה System יודע לעשות?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', marginTop: 60 }}>
        {features.map((f, i) => {
          const delay = i * 20;
          const s = spring({ frame: Math.max(0, frame - delay - 15), fps, config: SPRING.ui, durationInFrames: 20 });
          const iconPulse = pulse(frame, 0.05 + i * 0.008, 0.9, 1.1);
          return (
            <div key={i} style={{
              width: 700, padding: '20px 24px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
              border: `1px solid ${f.color}20`,
              display: 'flex', alignItems: 'flex-start', gap: 16, direction: 'rtl',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${f.color}12`, border: `1px solid ${f.color}25`,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                fontSize: 24, flexShrink: 0,
                transform: `scale(${iconPulse})`,
                boxShadow: `0 0 ${12 * iconPulse}px ${f.color}20`,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 800, color: f.color }}>{f.title}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, lineHeight: 1.6, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <ScanLines color={SYS.accent} />
      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: RESULTS — Animated counters + social proof [690-810f = 23-27s]
// ═══════════════════════════════════════════════════════════
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { target: 340, prefix: '+', suffix: '%', label: 'שיעור סגירת עסקאות', delay: 0 },
    { target: 60, prefix: '-', suffix: '%', label: 'זמן טיפול בליד', delay: 15 },
    { target: 92, prefix: '', suffix: '%', label: 'דיוק חיזוי AI', delay: 30 },
    { target: 0, prefix: '', suffix: '', label: 'לידים שנשכחו', delay: 45 },
  ];

  const testSpring = spring({ frame: Math.max(0, frame - 80), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <FloatingOrbs count={4} color={SYS.accent} speed={0.01} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 50,
        padding: '8px 20px', borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
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
              border: `1px solid ${SYS.accent}15`,
              textAlign: 'center', direction: 'rtl',
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
              boxShadow: `0 0 ${glowAmount}px ${SYS.accent}10`,
            }}>
              <div style={{
                fontFamily: RUBIK, fontSize: 48, fontWeight: 800,
                background: SYS.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.prefix}{displayVal}{stat.suffix}
              </div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.muted, marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Testimonial */}
      {frame > 80 && (
        <div style={{
          position: 'absolute', bottom: 50, maxWidth: 700,
          padding: '16px 24px', borderRadius: 20,
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
          direction: 'rtl', opacity: testSpring,
          transform: `translateY(${interpolate(testSpring, [0, 1], [20, 0])}px)`,
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
            "מאז שהתחלנו עם System — שיעור הסגירות עלה ב-340%. ה-AI פשוט יודע."
          </div>
          <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 600, color: BRAND.muted, marginTop: 6 }}>
            — מנהל מכירות, חברת ביטוח
          </div>
        </div>
      )}

      <ScanLines color={SYS.accent} />
      <NoiseLayer opacity={0.025} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7: TAGLINE — Brand moment [810-870f = 27-29s]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subSpring = spring({ frame: Math.max(0, frame - 25), fps, config: SPRING.hero, durationInFrames: 18 });

  // Continuous glow ring
  const ringScale = pulse(frame, 0.06, 0.95, 1.05);
  const ringOp = pulse(frame, 0.04, 0.1, 0.2);

  return (
    <AbsoluteFill style={{ background: SYS.gradient, justifyContent: 'center', alignItems: 'center', opacity: bgOp, overflow: 'hidden' }}>
      {/* Animated ring */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.1)',
        transform: `scale(${ringScale})`, opacity: ringOp,
      }} />

      <TextReveal text="AI שיודע מי הליד הבא שלך." delay={5} fontSize={48} fontWeight={900} color="#fff" mode="words" stagger={3} style={{ textAlign: 'center' }} />

      <div style={{
        marginTop: 24, padding: '8px 20px', borderRadius: 12,
        background: 'rgba(255,255,255,0.12)',
        fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)', direction: 'rtl',
        opacity: subSpring, transform: `translateY(${interpolate(subSpring, [0, 1], [15, 0])}px)`,
      }}>
        כניסה אחת. טביעת אצבע. הכל AI.
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — 30 seconds (900 frames)
// ═══════════════════════════════════════════════════════════
export const SystemVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Hook: 0-2.5s (0-75f) */}
      <Sequence from={0} durationInFrames={75}><HookScene /></Sequence>

      {/* Problem: 2.5-7s (75-210f) */}
      <Sequence from={75} durationInFrames={135}><ProblemScene /></Sequence>

      {/* AI Entrance + Sorted: 7-12.5s (210-375f) */}
      <Sequence from={210} durationInFrames={165}><AIEntranceScene /></Sequence>

      {/* Showcase — Lead Profile: 12.5-18s (375-540f) */}
      <Sequence from={375} durationInFrames={165}><ShowcaseScene /></Sequence>

      {/* Features: 18-23s (540-690f) */}
      <Sequence from={540} durationInFrames={150}><FeaturesScene /></Sequence>

      {/* Results: 23-27s (690-810f) */}
      <Sequence from={690} durationInFrames={120}><ResultsScene /></Sequence>

      {/* Tagline: 27-29s (810-870f) */}
      <Sequence from={810} durationInFrames={60}><TaglineScene /></Sequence>

      {/* CTA: 29-30s (870-900f) */}
      <Sequence from={870} durationInFrames={30}>
        <CTAEndcard variant="dark" accentColor={SYS.accent} tagline="AI שמקדם את המכירות שלך" />
      </Sequence>
    </AbsoluteFill>
  );
};
