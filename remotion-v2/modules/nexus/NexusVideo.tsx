import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, MODULE_COLORS, HEEBO, RUBIK, SPRING } from '../../shared/config';
import {
  NoiseLayer,
  TextReveal,
  CTAEndcard,
  DeviceFrame,
  VirtualCamera,
  IconCheck,
} from '../../shared/components';

const NX = MODULE_COLORS.nexus;

// ─── Script-accurate timing (A2-NEXUS-SCRIPT.md) ──────────
const T = {
  HOOK:     { from: 0,    dur: 90 },
  PROBLEM:  { from: 90,   dur: 270 },
  SOLUTION: { from: 360,  dur: 390 },
  SHOWCASE: { from: 750,  dur: 450 },
  PROOF:    { from: 1200, dur: 240 },
  IDENTITY: { from: 1440, dur: 150 },
  TAGLINE:  { from: 1590, dur: 120 },
  CTA:      { from: 1710, dur: 90 },
} as const;

// ─── Shared visual helpers (same architecture as A1) ────────

const useSlotRoll = (
  frame: number, fps: number, target: string, startFrame: number, rollDuration = 20,
) => {
  const f = Math.max(0, frame - startFrame);
  const progress = spring({ frame: f, fps, config: { damping: 12, stiffness: 200, mass: 0.8 }, durationInFrames: rollDuration });
  const motionBlur = interpolate(progress, [0, 0.8, 1], [6, 2, 0]);
  const locked = progress > 0.95;
  const display = locked ? target : target.replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)));
  return { display, progress, motionBlur, locked };
};

const brushedIndigo = (fontSize: number, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: RUBIK, fontSize, fontWeight: 800,
  background: 'linear-gradient(160deg, #9DA5E8 0%, #6366F1 30%, #A5B4FC 50%, #4F46E5 75%, #818CF8 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  letterSpacing: -2, textShadow: '0 2px 20px rgba(55,48,163,0.3)', ...extra,
});

const LIGHT_BG: React.CSSProperties = {
  background: 'linear-gradient(170deg, #FDF8F3 0%, #F5F0EB 40%, #EDE8E2 100%)',
};

const PaperGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => (
  <NoiseLayer opacity={opacity} />
);

const WarmVignette: React.FC = () => (
  <AbsoluteFill style={{
    background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(180,140,100,0.06) 100%)',
    pointerEvents: 'none',
  }} />
);

// ═══════════════════════════════════════════════════════════
// SCENE 1: HOOK — "הכיסא הריק" [0:00–0:03] frames 0–90
// Macro on empty Kanban, stacked unassigned tasks → "7 משימות"
// ═══════════════════════════════════════════════════════════
const KANBAN_COLS = ['לביצוע', 'בתהליך', 'לבדיקה', 'לא משויך'];
const STACKED_TASKS = [
  'עדכון מסמך פרויקט', 'שליחת דוח שבועי', 'תיאום פגישה', 'בדיקת תקציב',
  'הכנת מצגת', 'מענה ללקוח', 'תכנון ספרינט',
];

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text reveal: "7 משימות. אף אחד."
  const textSpring = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 14, stiffness: 160, mass: 1 }, durationInFrames: 20 });
  const textBlur = interpolate(textSpring, [0, 1], [12, 0]);
  const subSpring = spring({ frame: Math.max(0, frame - 62), fps, config: SPRING.ui, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{ ...LIGHT_BG, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <WarmVignette />

      <VirtualCamera zoom={1.35} rotateY={2} dofBlur={7}>
        {/* Kanban board — 4 columns, only "unassigned" has cards */}
        <div style={{
          position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 10, direction: 'rtl',
        }}>
          {KANBAN_COLS.map((col, ci) => {
            const isUnassigned = ci === 3;
            return (
              <div key={ci} style={{
                width: 160, minHeight: 280, padding: '10px 8px', borderRadius: 16,
                background: isUnassigned ? 'rgba(239,68,68,0.04)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isUnassigned ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.05)'}`,
                filter: isUnassigned ? 'none' : 'blur(3px)',
                opacity: isUnassigned ? 1 : 0.5,
              }}>
                <div style={{
                  fontFamily: HEEBO, fontSize: 11, fontWeight: 700, textAlign: 'center',
                  color: isUnassigned ? '#DC2626' : '#94A3B8', marginBottom: 8,
                }}>
                  {col}
                </div>
                {isUnassigned && STACKED_TASKS.map((task, ti) => (
                  <div key={ti} style={{
                    padding: '6px 8px', marginBottom: 3, borderRadius: 8,
                    background: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(239,68,68,0.12)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#374151',
                    transform: `rotate(${(ti - 3) * 1.5}deg) translateY(${ti * -2}px)`,
                  }}>
                    {task}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </VirtualCamera>

      {/* "7 משימות. אף אחד." — brushed indigo, enormous */}
      {frame >= 45 && (
        <div style={{
          position: 'absolute', top: '60%',
          ...brushedIndigo(100),
          opacity: textSpring, filter: `blur(${textBlur}px)`,
          transform: `scale(${interpolate(textSpring, [0, 1], [1.1, 1])})`,
        }}>
          7 משימות. אף אחד.
        </div>
      )}

      {frame >= 62 && (
        <div style={{
          position: 'absolute', top: '75%',
          fontFamily: HEEBO, fontSize: 28, fontWeight: 700, color: '#64748B',
          direction: 'rtl', opacity: subSpring,
          transform: `translateY(${interpolate(subSpring, [0, 1], [10, 0])}px)`,
        }}>
          מי עובד על מה?
        </div>
      )}

      <PaperGrain />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 2: PROBLEM — Rack focus through dashboard rows [0:03–0:12]
// ═══════════════════════════════════════════════════════════
const DASHBOARD_ROWS = [
  { project: 'פרויקט אלפא', status: 'איחור 5 ימים', assignee: 'לא משויך', load: 0, isLate: true },
  { project: 'יוסי כהן', status: '14 משימות', assignee: 'עומס 140%', load: 140, isLate: false },
  { project: 'מיכל לוי', status: '0 משימות', assignee: 'עומס 0%', load: 0, isLate: false },
  { project: 'ספרינט Q2', status: 'ממתין', assignee: 'דני', load: 60, isLate: false },
  { project: 'הדרכת עובדים', status: 'מתוכנן', assignee: 'נועה', load: 80, isLate: false },
];

const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Rack focus shifts: row 0 at f0, row 1 at f90, row 2 at f90 (together — the contrast)
  const focusIndex = frame < 90 ? 0 : frame < 180 ? 1 : 2;
  const pullBack = interpolate(frame, [180, 270], [1.15, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [180, 210], [0, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const painSpring = spring({ frame: Math.max(0, frame - 220), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ ...LIGHT_BG, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <WarmVignette />

      <VirtualCamera zoom={pullBack} rotateY={-2} dofBlur={8}>
        <DeviceFrame scale={1.15} delay={0}>
          <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 14px 14px', direction: 'rtl' }}>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 10 }}>
              Dashboard
            </div>

            {DASHBOARD_ROWS.map((row, i) => {
              const isFocused = i === focusIndex || (focusIndex >= 1 && (i === 1 || i === 2));
              const entrySpring = spring({ frame: Math.max(0, frame - i * 5), fps, config: SPRING.ui, durationInFrames: 14 });
              const barColor = row.load > 100 ? '#EF4444' : row.load > 50 ? '#F59E0B' : row.load > 0 ? '#22C55E' : '#E2E8F0';
              const barWidth = Math.min(row.load, 140) / 140 * 100;

              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', marginBottom: 7, borderRadius: 14,
                  background: isFocused ? (row.isLate ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.9)') : 'rgba(0,0,0,0.015)',
                  border: `1px solid ${isFocused ? (row.isLate ? 'rgba(239,68,68,0.2)' : 'rgba(55,48,163,0.1)') : 'rgba(0,0,0,0.04)'}`,
                  boxShadow: isFocused ? '0 4px 16px rgba(0,0,0,0.05)' : 'none',
                  opacity: entrySpring,
                  filter: isFocused ? 'none' : 'blur(1.5px)',
                  transform: `translateX(${interpolate(entrySpring, [0, 1], [25, 0])}px)`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: isFocused ? '#1E293B' : '#94A3B8' }}>
                      {row.project}
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 600, color: row.isLate ? '#EF4444' : '#64748B' }}>
                      {row.status} · {row.assignee}
                    </div>
                  </div>
                  {row.load > 0 && (
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: '#E2E8F0' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 3, background: barColor }} />
                    </div>
                  )}
                  {row.isLate && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
                      boxShadow: isFocused ? '0 0 10px rgba(239,68,68,0.4)' : 'none', marginRight: 8,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </DeviceFrame>
      </VirtualCamera>

      {/* Warm frosted overlay */}
      {frame >= 180 && (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, rgba(180,140,100,${overlayOpacity * 0.08}) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Pain text */}
      {frame >= 220 && (
        <div style={{
          position: 'absolute', bottom: 130,
          fontFamily: HEEBO, fontSize: 30, fontWeight: 900, color: '#334155',
          direction: 'rtl', opacity: painSpring,
          transform: `translateY(${interpolate(painSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 2px 20px rgba(0,0,0,0.06)',
        }}>
          בלי תמונת מצב — אתה לא מנהל. אתה מגיב.
        </div>
      )}

      <PaperGrain />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 3: SOLUTION — "Nexus" entrance + KPIs + task drag + AI
// [0:12–0:25] frames 0–390
// ═══════════════════════════════════════════════════════════
const KPI_CARDS = [
  { label: 'משימות פעילות', value: '12', color: NX.accent },
  { label: 'בוצעו היום', value: '3', color: '#22C55E' },
  { label: 'SLA', value: '98%', color: '#F59E0B' },
  { label: 'בצנרת', value: '340K', prefix: '₪', color: '#7C3AED' },
];

const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Glass shatter + "Nexus" title (f0–60)
  const shatterProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  // Phase 2: Phone with KPIs (f60–150)
  const phoneSpring = spring({ frame: Math.max(0, frame - 60), fps, config: SPRING.hero, durationInFrames: 25 });

  // Phase 3: Task drag demo (f150–240)
  const dragProgress = interpolate(frame, [160, 210], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dragSpring = spring({ frame: Math.max(0, frame - 150), fps, config: SPRING.hero, durationInFrames: 20 });
  const assignDone = frame > 220;

  // Phase 4: AI insight card (f220–310)
  const insightSpring = spring({ frame: Math.max(0, frame - 240), fps, config: SPRING.ui, durationInFrames: 20 });

  // Phase 5: Full dashboard pullback (f310–390)
  const fullSpring = spring({ frame: Math.max(0, frame - 320), fps, config: SPRING.hero, durationInFrames: 22 });

  // Light sweep
  const sweepX = interpolate(frame, [0, 30], [-200, 1200], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ ...LIGHT_BG, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <WarmVignette />

      {/* Light sweep */}
      <div style={{
        position: 'absolute', width: 150, height: '100%',
        background: `linear-gradient(90deg, transparent, ${NX.accent}08, transparent)`,
        transform: `translateX(${sweepX}px)`, pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Glass shards from warm overlay */}
      {frame < 40 && Array.from({ length: 8 }).map((_, i) => {
        const seed = i * 47;
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = shatterProgress * (80 + seed % 100);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(angle) * dist}px)`,
            top: `calc(40% + ${Math.sin(angle) * dist}px)`,
            width: 14 + seed % 18, height: 6 + seed % 10,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 3, opacity: 1 - shatterProgress,
            transform: `rotate(${seed % 180}deg)`, pointerEvents: 'none',
          }} />
        );
      })}

      {/* "Nexus" — brushed indigo title */}
      {frame >= 10 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '22%',
          ...brushedIndigo(110),
          opacity: titleSpring * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
          transform: `scale(${interpolate(titleSpring, [0, 1], [1.1, 1])})`,
          filter: `blur(${interpolate(titleSpring, [0, 1], [8, 0])}px)`,
        }}>
          Nexus
        </div>
      )}

      {frame >= 20 && frame < 80 && (
        <div style={{
          position: 'absolute', top: '36%',
          fontFamily: HEEBO, fontSize: 26, fontWeight: 700, color: '#64748B', direction: 'rtl',
          opacity: spring({ frame: Math.max(0, frame - 20), fps, config: SPRING.ui, durationInFrames: 15 })
            * (frame < 60 ? 1 : interpolate(frame, [60, 80], [1, 0], { extrapolateRight: 'clamp' })),
        }}>
          חדר הפיקוד שלך.
        </div>
      )}

      {/* Phase 2: Phone with KPI cards */}
      {frame >= 60 && frame < 310 && (
        <VirtualCamera zoom={1.1} rotateY={2} dofBlur={5}>
          <div style={{ opacity: phoneSpring, transform: `translateY(${interpolate(phoneSpring, [0, 1], [40, 0])}px)` }}>
            <DeviceFrame scale={1.15} delay={0}>
              <div style={{ width: '100%', height: '100%', background: '#FAFBFC', padding: '55px 14px 14px', direction: 'rtl' }}>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 10 }}>
                  Dashboard Nexus
                </div>

                {/* KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {KPI_CARDS.map((kpi, i) => {
                    const s = spring({ frame: Math.max(0, frame - 80 - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
                    const slot = useSlotRoll(frame, fps, kpi.value, 85 + i * 8, 18);
                    return (
                      <div key={i} style={{
                        padding: '12px 10px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.85)',
                        border: `1px solid ${kpi.color}15`,
                        boxShadow: `0 4px 16px rgba(0,0,0,0.04)`,
                        textAlign: 'center', opacity: s,
                        transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px)`,
                      }}>
                        <div style={{
                          fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: kpi.color,
                          filter: `blur(${slot.motionBlur}px)`,
                        }}>
                          {kpi.prefix || ''}{slot.display}
                        </div>
                        <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 2 }}>
                          {kpi.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Task drag demo: "פרויקט אלפא" dragged to "שמעון" */}
                {frame >= 150 && (
                  <div style={{ opacity: dragSpring }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>
                      הקצאת משימה
                    </div>
                    <div style={{
                      padding: '10px 12px', borderRadius: 12,
                      background: `${NX.accent}08`, border: `1px solid ${NX.accent}15`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transform: `translateX(${interpolate(dragProgress, [0, 0.5, 1], [0, -30, 0])}px)`,
                    }}>
                      <div>
                        <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#1E293B' }}>פרויקט אלפא</div>
                        <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 600, color: '#64748B' }}>
                          {assignDone ? 'שמעון · הוקצה' : 'לא משויך · 5 ימים איחור'}
                        </div>
                      </div>
                      {assignDone && (
                        <div style={{
                          padding: '4px 10px', borderRadius: 8, background: '#22C55E15',
                          border: '1px solid #22C55E30', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <IconCheck size={12} color="#22C55E" />
                          <span style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: '#22C55E' }}>הוקצה</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI insight — callback to scene 2 gap */}
                {frame >= 240 && (
                  <div style={{
                    marginTop: 10, padding: '10px 12px', borderRadius: 12,
                    background: `linear-gradient(135deg, ${NX.accent}08, rgba(124,58,237,0.04))`,
                    border: `1px solid ${NX.accent}12`,
                    opacity: insightSpring,
                    transform: `translateY(${interpolate(insightSpring, [0, 1], [8, 0])}px)`,
                  }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: NX.accent, marginBottom: 3 }}>
                      Intelligence
                    </div>
                    <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#1E293B', lineHeight: 1.5 }}>
                      יוסי — עומס +40%. מומלץ: העבר 2 משימות למיכל (עומס 0%).
                    </div>
                  </div>
                )}
              </div>
            </DeviceFrame>
          </div>
        </VirtualCamera>
      )}

      {/* Phase 5: Full dashboard text */}
      {frame >= 320 && (
        <div style={{
          position: 'absolute', bottom: 160,
          fontFamily: HEEBO, fontSize: 32, fontWeight: 900, color: '#334155',
          direction: 'rtl', opacity: fullSpring,
          transform: `translateY(${interpolate(fullSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 2px 16px rgba(0,0,0,0.04)',
        }}>
          ראש שקט. שליטה אמיתית. בזמן אמת.
        </div>
      )}

      <PaperGrain />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 4: SHOWCASE — Module hub + Kiosk + demos [0:25–0:40]
// frames 0–450
// ═══════════════════════════════════════════════════════════
const MODULES = [
  { name: 'System', nameHe: 'מכירות', color: MODULE_COLORS.system.accent },
  { name: 'Social', nameHe: 'שיווק', color: MODULE_COLORS.social.accent },
  { name: 'Client', nameHe: 'לקוחות', color: MODULE_COLORS.client.accent },
  { name: 'Finance', nameHe: 'כספים', color: MODULE_COLORS.finance.accent },
  { name: 'Operations', nameHe: 'תפעול', color: MODULE_COLORS.operations.accent },
];

const ShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Module hub phase (f0–200)
  const hubCameraX = interpolate(frame, [0, 200], [30, -30], { extrapolateRight: 'clamp' });

  // Phone demo phase (f160–280)
  const demoSpring = spring({ frame: Math.max(0, frame - 160), fps, config: SPRING.hero, durationInFrames: 22 });

  // Kiosk phase (f250–380)
  const kioskSpring = spring({ frame: Math.max(0, frame - 260), fps, config: SPRING.hero, durationInFrames: 22 });

  // Final pull-back (f390+)
  const finalSpring = spring({ frame: Math.max(0, frame - 390), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <VirtualCamera panX={hubCameraX} dofBlur={6} zoom={1.05}>
        {/* Module hub: Nexus center, 5 modules orbiting */}
        {frame < 220 && (
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            {/* Nexus center card */}
            <div style={{
              width: 160, height: 100, borderRadius: 24,
              background: 'rgba(55,48,163,0.15)', backdropFilter: 'blur(40px)',
              border: `2px solid ${NX.accent}40`,
              boxShadow: `0 30px 80px rgba(0,0,0,0.4), 0 0 50px ${NX.accent}15`,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              position: 'relative', zIndex: 2,
            }}>
              <div style={{ fontFamily: RUBIK, fontSize: 24, fontWeight: 800, color: BRAND.white }}>Nexus</div>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: BRAND.muted }}>חדר פיקוד</div>
            </div>

            {/* Orbiting modules */}
            {MODULES.map((mod, i) => {
              const angle = (i / MODULES.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 200;
              const x = Math.cos(angle + frame * 0.003) * radius;
              const y = Math.sin(angle + frame * 0.003) * radius * 0.6;
              const s = spring({ frame: Math.max(0, frame - 10 - i * 8), fps, config: SPRING.ui, durationInFrames: 16 });

              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `calc(50% + ${x}px - 55px)`,
                  top: `calc(50% + ${y}px - 30px)`,
                  width: 110, padding: '10px 8px', borderRadius: 16,
                  background: 'rgba(24,24,27,0.6)', backdropFilter: 'blur(30px)',
                  border: `1px solid ${mod.color}30`,
                  boxShadow: `0 15px 40px rgba(0,0,0,0.3)`,
                  textAlign: 'center', opacity: s,
                  transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                }}>
                  <div style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: mod.color }}>{mod.name}</div>
                  <div style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: BRAND.muted }}>{mod.nameHe}</div>
                </div>
              );
            })}

            {/* Refraction light paths */}
            <svg style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', pointerEvents: 'none', zIndex: 1 }}>
              {MODULES.map((mod, i) => {
                const angle = (i / MODULES.length) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle + frame * 0.003) * 200;
                const y = Math.sin(angle + frame * 0.003) * 120;
                const s = spring({ frame: Math.max(0, frame - 20 - i * 8), fps, config: SPRING.smooth, durationInFrames: 30 });
                return (
                  <line key={i}
                    x1="50%" y1="50%"
                    x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                    stroke={mod.color} strokeWidth={1} opacity={0.12 * s}
                    strokeDasharray="4 6"
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* Kiosk demo */}
        {frame >= 260 && frame < 400 && (
          <div style={{
            position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, 0)',
            opacity: kioskSpring,
          }}>
            {/* Tablet frame — thick bezels, tactical */}
            <div style={{
              width: 500, height: 340, borderRadius: 20,
              background: '#1A1A1E', padding: 16,
              boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.06)',
              border: '3px solid #27272A',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: 8,
                background: '#0C0C0F', padding: '20px 24px', direction: 'rtl',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                {/* Clock */}
                <div style={{
                  fontFamily: RUBIK, fontSize: 48, fontWeight: 800, color: BRAND.white,
                  textAlign: 'center',
                }}>
                  08:47
                </div>

                {/* 3 tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['התקנת מזגן — קומה 3', 'תיקון דלת — חדר 12', 'בדיקת חשמל — מטבח'].map((task, i) => (
                    <div key={i} style={{
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                      fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: BRAND.white,
                    }}>
                      {task}
                    </div>
                  ))}
                </div>

                {/* Giant "Done" button */}
                <div style={{
                  padding: '16px 0', borderRadius: 14,
                  background: NX.gradient, textAlign: 'center',
                  fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#fff',
                  boxShadow: `0 8px 30px ${NX.accent}30`,
                }}>
                  סיימתי
                </div>
              </div>
            </div>

            {/* Silhouette */}
            <svg width="60" height="90" viewBox="0 0 60 90" fill="none" style={{
              position: 'absolute', right: -80, top: '20%', opacity: 0.3,
            }}>
              <circle cx="30" cy="18" r="14" stroke={NX.accent} strokeWidth="1.5" />
              <path d="M8 85 C8 55 18 40 30 40 C42 40 52 55 52 85" stroke={NX.accent} strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </VirtualCamera>

      {/* Final text */}
      {frame >= 390 && (
        <div style={{
          position: 'absolute', bottom: 160,
          fontFamily: HEEBO, fontSize: 34, fontWeight: 900, color: BRAND.white,
          direction: 'rtl', opacity: finalSpring,
          transform: `translateY(${interpolate(finalSpring, [0, 1], [15, 0])}px)`,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          הכל מחובר. הכל תחת Nexus.
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 5: PROOF — Stats + quote [0:40–0:48]
// ═══════════════════════════════════════════════════════════
const STATS = [
  { value: '15', suffix: ' שעות/שבוע', label: 'חזרו אליך', delay: 0 },
  { value: '0', suffix: '', label: 'משימות שנפלו בין הכיסאות', delay: 12 },
  { value: '100%', suffix: '', label: 'שקיפות — כל עובד רואה את שלו', delay: 24 },
];

const ProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteSpring = spring({ frame: Math.max(0, frame - 130), fps, config: SPRING.hero, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bgDark, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${NX.accent}05 0%, transparent 60%)` }} />

      <VirtualCamera zoom={1.05} dofBlur={4}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
          {STATS.map((stat, i) => {
            const s = spring({ frame: Math.max(0, frame - stat.delay), fps, config: SPRING.punch, durationInFrames: 20 });
            const slot = useSlotRoll(frame, fps, stat.value, stat.delay, 20);
            const isFocused = Math.floor(frame / 40) % 3 === i;
            return (
              <div key={i} style={{
                width: 700, padding: '28px 36px', borderRadius: 24,
                background: 'rgba(24,24,27,0.65)', backdropFilter: 'blur(40px)',
                border: `1px solid rgba(255,255,255,${isFocused ? '0.14' : '0.06'})`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.4)${isFocused ? `, 0 0 30px ${NX.accent}10` : ''}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl',
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                filter: isFocused ? 'none' : 'blur(1px)',
              }}>
                <span style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 700, color: BRAND.muted }}>{stat.label}</span>
                <span style={{
                  ...brushedIndigo(56),
                  filter: `blur(${slot.motionBlur}px)`,
                  transform: `scale(${interpolate(s, [0, 1], [1.2, 1])})`, display: 'inline-block',
                }}>
                  {slot.display}{stat.suffix}
                </span>
              </div>
            );
          })}
        </div>
      </VirtualCamera>

      {/* Quote + desktop silhouette */}
      {frame >= 130 && (
        <div style={{
          position: 'absolute', bottom: 110, maxWidth: 750,
          padding: '24px 32px', borderRadius: 24,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          direction: 'rtl', opacity: quoteSpring,
          transform: `translateY(${interpolate(quoteSpring, [0, 1], [15, 0])}px)`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <svg width="50" height="70" viewBox="0 0 50 70" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
            <circle cx="25" cy="16" r="12" stroke={NX.accent} strokeWidth="1.5" />
            <path d="M5 65 C5 45 15 35 25 35 C35 35 45 45 45 65" stroke={NX.accent} strokeWidth="1.5" />
          </svg>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 700, color: BRAND.white, lineHeight: 1.6 }}>
              "הפסקתי לשאול מי עושה מה. פותח Nexus — ותוך שנייה יש תמונה."
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: BRAND.muted, marginTop: 8 }}>
              — מנכ״ל, חברת שירותים
            </div>
          </div>
        </div>
      )}

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 6: IDENTITY — Hebrew DNA badges [0:48–0:53]
// ═══════════════════════════════════════════════════════════
const BADGES = [
  { text: 'לוח עברי — יודע מתי חופשות ומועדים', delay: 0 },
  { text: 'שומר שבת — אפס notifications בשבת', delay: 15 },
  { text: 'Kiosk — לעובד שטח עם ידיים מלאות, לא עם סיסמא', delay: 30 },
];

const IdentityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING.hero, durationInFrames: 18 });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.bgDark} 0%, ${NX.accent}08 50%, ${BRAND.bgDark} 100%)`,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    }}>
      <div style={{
        ...brushedIndigo(48, { fontFamily: HEEBO, letterSpacing: 0 }),
        fontFamily: HEEBO, fontSize: 42, fontWeight: 900,
        direction: 'rtl', marginBottom: 40,
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
      }}>
        ניהול בשפה שלך.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {BADGES.map((badge, i) => {
          const s = spring({ frame: Math.max(0, frame - badge.delay - 20), fps, config: SPRING.ui, durationInFrames: 18 });
          const focusBadge = Math.min(2, Math.floor((frame - 20) / 40));
          const isFocused = i === focusBadge;
          return (
            <div key={i} style={{
              padding: '18px 32px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)',
              border: `1px solid rgba(255,255,255,${isFocused ? '0.15' : '0.06'})`,
              boxShadow: `0 15px 40px rgba(0,0,0,0.3)${isFocused ? `, 0 0 20px ${NX.accent}10` : ''}`,
              direction: 'rtl', fontFamily: HEEBO, fontSize: 20, fontWeight: 700,
              color: isFocused ? BRAND.white : BRAND.muted,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px) scale(${isFocused ? 1.02 : 0.98})`,
              filter: isFocused ? 'none' : 'blur(1px)',
            }}>
              {badge.text}
            </div>
          );
        })}
      </div>

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// SCENE 7: TAGLINE [0:53–0:57]
// ═══════════════════════════════════════════════════════════
const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: NX.gradient,
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
      opacity: bgOpacity,
    }}>
      <TextReveal
        text="ראש שקט. שליטה מלאה. אפס הפתעות."
        delay={5} fontSize={56} fontWeight={900} color="#fff"
        mode="words" stagger={3}
        style={{ textAlign: 'center' }}
      />

      <NoiseLayer opacity={0.02} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPOSITION — A2 Nexus Video
// ═══════════════════════════════════════════════════════════
export const NexusVideoV2: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={T.HOOK.from} durationInFrames={T.HOOK.dur}><HookScene /></Sequence>
      <Sequence from={T.PROBLEM.from} durationInFrames={T.PROBLEM.dur}><ProblemScene /></Sequence>
      <Sequence from={T.SOLUTION.from} durationInFrames={T.SOLUTION.dur}><SolutionScene /></Sequence>
      <Sequence from={T.SHOWCASE.from} durationInFrames={T.SHOWCASE.dur}><ShowcaseScene /></Sequence>
      <Sequence from={T.PROOF.from} durationInFrames={T.PROOF.dur}><ProofScene /></Sequence>
      <Sequence from={T.IDENTITY.from} durationInFrames={T.IDENTITY.dur}><IdentityScene /></Sequence>
      <Sequence from={T.TAGLINE.from} durationInFrames={T.TAGLINE.dur}><TaglineScene /></Sequence>
      <Sequence from={T.CTA.from} durationInFrames={T.CTA.dur}>
        <CTAEndcard variant="light" accentColor={NX.accent} tagline="ראש שקט. שליטה מלאה. אפס הפתעות." />
      </Sequence>
    </AbsoluteFill>
  );
};
