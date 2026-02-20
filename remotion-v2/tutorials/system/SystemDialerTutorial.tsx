import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { BRAND, HEEBO, RUBIK, SPRING } from '../../shared/config';
import { NoiseLayer } from '../../shared/components';
import {
  TutorialIntro,
  TutorialOutro,
  AppLayout,
  FormField,
  StatusBadge,
  HighlightOverlay,
  CalloutLayer,
  CursorPointer,
  ZoomFocus,
  VoiceoverSubtitle,
} from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

const DURATION = seconds(80);

const SYSTEM_SIDEBAR = [
  { icon: '📊', label: 'דשבורד', id: 'dashboard' },
  { icon: '🎯', label: 'לידים', id: 'leads' },
  { icon: '📞', label: 'חייגן', id: 'dialer' },
  { icon: '💼', label: 'צינור מכירות', id: 'pipeline' },
  { icon: '📈', label: 'דוחות', id: 'reports' },
  { icon: '📅', label: 'יומן', id: 'calendar' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

const SUBTITLES = [
  { text: 'חייגן. המקום שבו אומרים "הלו" הכי הרבה ביום.', from: seconds(3), dur: seconds(3.5) },
  { text: 'נכנסים ל-חייגן דרך התפריט.', from: seconds(8), dur: seconds(3) },
  { text: 'רואים את רשימת הלידים/אנשי הקשר — מוכנים לשיחה.', from: seconds(13), dur: seconds(4) },
  { text: 'מחפשים ליד ספציפי? יש חיפוש מהיר.', from: seconds(19), dur: seconds(3) },
  { text: 'לוחצים על "התקשר" ליד השיחה מתחילה.', from: seconds(24), dur: seconds(3.5) },
  { text: 'השיחה פעילה — רואים טיימר, פרטי הליד, והיסטוריה.', from: seconds(29), dur: seconds(4) },
  { text: 'בסוף השיחה — מסכמים בשורה אחת. AI עוזר.', from: seconds(35), dur: seconds(4) },
  { text: 'AI מסכם אוטומטית את השיחה. חוסך לכם זמן.', from: seconds(41), dur: seconds(3.5) },
  { text: 'מגדירים המשך: משימה, פגישה, או פולואפ.', from: seconds(46), dur: seconds(4) },
  { text: 'אם לא סיכמת — זה כאילו השיחה קרתה ביקום אחר.', from: seconds(52), dur: seconds(3.5) },
  { text: 'הסיכום נשמר בכרטיס הליד. כל הצוות רואה.', from: seconds(57), dur: seconds(4) },
  { text: 'שיחה, סיכום, המשך. 3 צעדים. בלי חפירות.', from: seconds(63), dur: seconds(3.5) },
];

// ═══════════════════════════════════════════════════════════
// Dialer Contact List Scene [3s–22s]
// ═══════════════════════════════════════════════════════════
const DialerListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contacts = [
    { name: 'אורי מזרחי', phone: '054-8765432', status: 'חם', color: '#EF4444', score: 75 },
    { name: 'דוד כהן', phone: '054-1234567', status: 'חדש', color: '#3B82F6', score: 42 },
    { name: 'שרה לוי', phone: '052-9876543', status: 'בטיפול', color: '#F59E0B', score: 60 },
    { name: 'משה ישראלי', phone: '050-5551234', status: 'חם', color: '#EF4444', score: 88 },
    { name: 'רחל אברהם', phone: '053-7778899', status: 'חדש', color: '#3B82F6', score: 35 },
  ];

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="dialer"
      headerTitle="חייגן"
      breadcrumb={['System', 'חייגן']}
    >
      {/* Search bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20,
      }}>
        <div style={{
          flex: 1, padding: '12px 18px', borderRadius: 14, background: '#fff',
          border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10,
          direction: 'rtl',
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>
            {frame > seconds(8) ? 'אורי מזרחי' : 'חפש ליד או איש קשר...'}
          </span>
        </div>
        <div style={{ padding: '12px 20px', borderRadius: 14, background: '#A21D3C', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
          📞 חייג מהיר
        </div>
      </div>

      {/* Contact cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contacts.map((c, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
          const isSelected = i === 0 && frame > seconds(10);
          return (
            <div key={i} style={{
              padding: '16px 20px', borderRadius: 18, background: isSelected ? '#FFF1F2' : '#fff',
              border: `1px solid ${isSelected ? '#A21D3C20' : '#E2E8F0'}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              direction: 'rtl', opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [8, 0])}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${c.color}10`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: c.color }}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{c.name}</div>
                  <div style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{c.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge text={c.status} color={c.color} />
                <div style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: '#94A3B8' }}>🧠 {c.score}</div>
                <div style={{
                  padding: '8px 14px', borderRadius: 12, background: '#22C55E',
                  fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#fff',
                  opacity: isSelected ? 1 : 0.6,
                }}>📞 התקשר</div>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Active Call Scene [22s–45s]
// ═══════════════════════════════════════════════════════════
const ActiveCallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const callSeconds = Math.floor(frame / 30);
  const minutes = Math.floor(callSeconds / 60);
  const secs = callSeconds % 60;
  const timer = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const pulseScale = 1 + Math.sin(frame * 0.1) * 0.03;

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="dialer"
      headerTitle="שיחה פעילה"
      breadcrumb={['System', 'חייגן', 'שיחה פעילה']}
    >
      <div style={{ display: 'flex', gap: 24, height: '100%' }}>
        {/* Call panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {/* Avatar */}
          <div style={{
            width: 100, height: 100, borderRadius: 30, background: 'linear-gradient(135deg, #A21D3C, #3730A3)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontSize: 44, boxShadow: '0 12px 40px rgba(162,29,60,0.2)',
            transform: `scale(${pulseScale})`,
          }}>👤</div>

          <div style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: '#1E293B', marginTop: 16 }}>אורי מזרחי</div>
          <div style={{ fontFamily: RUBIK, fontSize: 14, color: '#94A3B8', marginTop: 4 }}>054-8765432</div>

          {/* Timer */}
          <div style={{
            marginTop: 16, padding: '8px 20px', borderRadius: 12,
            background: '#22C55E10', border: '1px solid #22C55E20',
          }}>
            <div style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: '#22C55E' }}>{timer}</div>
          </div>

          {/* Call controls */}
          <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
            {[
              { icon: '🔇', label: 'השתק', color: '#64748B' },
              { icon: '⏸️', label: 'המתנה', color: '#F59E0B' },
              { icon: '📝', label: 'הערה', color: '#3B82F6' },
              { icon: '❌', label: 'סיים', color: '#EF4444' },
            ].map((ctrl, i) => (
              <div key={i} style={{
                width: 60, height: 60, borderRadius: 18,
                background: `${ctrl.color}08`, border: `1px solid ${ctrl.color}15`,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 20 }}>{ctrl.icon}</span>
                <span style={{ fontFamily: HEEBO, fontSize: 10, fontWeight: 700, color: ctrl.color }}>{ctrl.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead details panel */}
        <div style={{
          width: 320, background: '#fff', borderRadius: 20,
          border: '1px solid #E2E8F0', padding: 20, direction: 'rtl',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden',
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 900, color: '#1E293B', marginBottom: 14 }}>פרטי ליד</div>

          {[
            { label: 'מקור', value: 'Google Ads' },
            { label: 'סטטוס', value: 'חם' },
            { label: 'דירוג AI', value: '75 — סיכוי גבוה' },
            { label: 'שיחה אחרונה', value: 'לפני 3 ימים' },
            { label: 'הערה', value: 'מעוניין בחבילת מכירות' },
          ].map((detail, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{detail.label}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{detail.value}</div>
            </div>
          ))}

          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 900, color: '#1E293B', marginTop: 20, marginBottom: 10, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>היסטוריית שיחות</div>
          {[
            { date: '12.02', dur: '3:45', note: 'שאל על מחירים' },
            { date: '09.02', dur: '1:20', note: 'ביקש חזרה' },
          ].map((h, i) => (
            <div key={i} style={{ padding: '8px 12px', borderRadius: 12, background: '#F8FAFC', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#64748B' }}>{h.note}</span>
              <span style={{ fontFamily: RUBIK, fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{h.date} · {h.dur}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Call Summary Scene [45s–68s]
// ═══════════════════════════════════════════════════════════
const CallSummaryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const aiSummarySpring = spring({ frame: Math.max(0, frame - seconds(5)), fps, config: { damping: 14, stiffness: 100, mass: 1 }, durationInFrames: 25 });

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="dialer"
      headerTitle="סיכום שיחה"
      breadcrumb={['System', 'חייגן', 'סיכום שיחה']}
    >
      <div style={{ maxWidth: 640, margin: '0 auto', direction: 'rtl' }}>
        {/* Call ended badge */}
        <div style={{
          padding: '12px 20px', borderRadius: 16, background: '#F0FDF4',
          border: '1px solid #22C55E20', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#22C55E' }}>שיחה הסתיימה</div>
            <div style={{ fontFamily: RUBIK, fontSize: 12, color: '#64748B' }}>אורי מזרחי · 04:12 · 054-8765432</div>
          </div>
        </div>

        {/* Manual note */}
        <FormField label="סיכום שלך" value="מעוניין בחבילת מכירות. ביקש הצעת מחיר עד יום ראשון." typeDelay={seconds(1)} typingSpeed={2} isFocused={frame > seconds(1) && frame < seconds(8)} />

        {/* AI Summary */}
        {frame > seconds(4) && (
          <div style={{
            padding: '18px 22px', borderRadius: 18,
            background: 'linear-gradient(135deg, #A21D3C04, #3730A304)',
            border: '1px solid #A21D3C10', marginBottom: 16,
            opacity: aiSummarySpring,
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 900, color: '#A21D3C', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🧠 סיכום AI אוטומטי
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: '#1E293B', lineHeight: 1.7 }}>
              הליד התעניין בחבילת "The Closer" ₪249/חודש. ביקש הצעת מחיר פורמלית. ציין שמשווה ל-2 מתחרים. נקודת כאב: ניהול לידים ידני. תגובה חיובית לדמו של AI דירוג לידים.
            </div>
          </div>
        )}

        {/* Next action */}
        <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 900, color: '#1E293B', marginBottom: 10 }}>פעולה הבאה</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { icon: '📋', label: 'משימה', active: frame > seconds(12) },
            { icon: '📅', label: 'פגישה', active: false },
            { icon: '🔔', label: 'פולואפ', active: false },
          ].map((action, i) => (
            <div key={i} style={{
              flex: 1, padding: '14px', borderRadius: 14, textAlign: 'center',
              background: action.active ? '#A21D3C08' : '#F8FAFC',
              border: `1px solid ${action.active ? '#A21D3C20' : '#E2E8F0'}`,
            }}>
              <div style={{ fontSize: 20 }}>{action.icon}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: action.active ? '#A21D3C' : '#64748B', marginTop: 4 }}>{action.label}</div>
            </div>
          ))}
        </div>

        {/* Save button */}
        {frame > seconds(14) && (
          <div style={{
            padding: '14px 24px', borderRadius: 14, background: '#A21D3C',
            fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center',
            boxShadow: '0 4px 16px rgba(162,29,60,0.3)',
            opacity: spring({ frame: Math.max(0, frame - seconds(14)), fps, config: SPRING.punch, durationInFrames: 14 }),
          }}>
            שמור סיכום 💾
          </div>
        )}

        {frame > seconds(18) && (
          <div style={{
            marginTop: 14, padding: '12px 18px', borderRadius: 14,
            background: '#F0FDF4', border: '1px solid #22C55E30',
            fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#22C55E', textAlign: 'center',
            opacity: spring({ frame: Math.max(0, frame - seconds(18)), fps, config: SPRING.punch, durationInFrames: 12 }),
          }}>
            ✅ נשמר! משימה נוצרה אוטומטית.
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Main Compositions
// ═══════════════════════════════════════════════════════════
export const SystemDialerTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}>
      <TutorialIntro moduleKey="system" title="איך משתמשים בחייגן (בלי ׳אני אחזור אליו׳)" subtitle="חייגן. המקום שבו אומרים 'הלו' הכי הרבה ביום." stepNumber={2} />
    </Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(19)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(5), duration: seconds(4), centerX: 15, centerY: 35, scale: 1.3 },
        { startFrame: seconds(12), duration: seconds(5), centerX: 80, centerY: 20, scale: 1.4 },
      ]}>
        <DialerListScene />
      </ZoomFocus>
      <HighlightOverlay highlights={[
        { x: 2, y: 28, width: 12, height: 8, showAt: seconds(4), duration: seconds(3.5), style: 'rectangle', color: '#A21D3C' },
        { x: 78, y: 18, width: 16, height: 6, showAt: seconds(12), duration: seconds(4), style: 'pulse', color: '#22C55E' },
      ]} />
      <CalloutLayer callouts={[
        { text: '👆 לוחצים "חייגן"', x: 3, y: 22, showAt: seconds(4), duration: seconds(3), bgColor: '#A21D3C' },
        { text: '📞 לוחצים "התקשר"', x: 70, y: 14, showAt: seconds(12), duration: seconds(4), bgColor: '#22C55E' },
      ]} />
    </Sequence>
    <Sequence from={seconds(22)} durationInFrames={seconds(23)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(5), duration: seconds(6), centerX: 75, centerY: 30, scale: 1.4 },
      ]}>
        <ActiveCallScene />
      </ZoomFocus>
      <CalloutLayer callouts={[
        { text: '⏱️ שיחה פעילה — רואים טיימר', x: 30, y: 35, showAt: seconds(2), duration: seconds(4), bgColor: '#22C55E' },
        { text: '📋 כל הפרטים של הליד בצד', x: 55, y: 15, showAt: seconds(8), duration: seconds(4), bgColor: '#3B82F6' },
      ]} />
    </Sequence>
    <Sequence from={seconds(45)} durationInFrames={seconds(23)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(4), duration: seconds(6), centerX: 50, centerY: 40, scale: 1.3 },
        { startFrame: seconds(12), duration: seconds(5), centerX: 50, centerY: 60, scale: 1.3 },
      ]}>
        <CallSummaryScene />
      </ZoomFocus>
      <CalloutLayer callouts={[
        { text: '🧠 AI מסכם אוטומטית!', x: 25, y: 30, showAt: seconds(5), duration: seconds(5), bgColor: '#A21D3C' },
        { text: '📋 בחר פעולה הבאה', x: 30, y: 55, showAt: seconds(12), duration: seconds(4), bgColor: '#1E293B' },
      ]} />
    </Sequence>
    <Sequence from={seconds(68)} durationInFrames={seconds(12)}>
      <TutorialOutro moduleKey="system" nextTitle="איך סוגרים עסקה (בלי ללכת לאיבוד)" />
    </Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const SystemDialerTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}>
      <TutorialIntro moduleKey="system" title="איך משתמשים בחייגן" subtitle="שיחה, סיכום, המשך." stepNumber={2} />
    </Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(19)}>
      <MobileDialerList />
    </Sequence>
    <Sequence from={seconds(22)} durationInFrames={seconds(23)}>
      <MobileActiveCall />
    </Sequence>
    <Sequence from={seconds(45)} durationInFrames={seconds(23)}>
      <MobileCallSummary />
    </Sequence>
    <Sequence from={seconds(68)} durationInFrames={seconds(12)}>
      <TutorialOutro moduleKey="system" nextTitle="איך סוגרים עסקה" />
    </Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

// ─── Mobile Scenes ────────────────────────────────────────
const MobileDialerList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const contacts = [
    { name: 'אורי מזרחי', phone: '054-8765432', status: 'חם', color: '#EF4444', score: 75 },
    { name: 'דוד כהן', phone: '054-1234567', status: 'חדש', color: '#3B82F6', score: 42 },
    { name: 'שרה לוי', phone: '052-9876543', status: 'בטיפול', color: '#F59E0B', score: 60 },
  ];
  return (
    <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>חייגן</div>
        <div style={{ padding: '8px 14px', borderRadius: 12, background: '#A21D3C', fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: '#fff' }}>📞 חייג</div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {contacts.map((c, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              padding: '16px', borderRadius: 18, background: '#fff',
              border: '1px solid #E2E8F0', opacity: s, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{c.name}</div>
                <div style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{c.phone} · 🧠 {c.score}</div>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: 12, background: '#22C55E', fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: '#fff' }}>📞</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MobileActiveCall: React.FC = () => {
  const frame = useCurrentFrame();
  const callSecs = Math.floor(frame / 30);
  const timer = `${String(Math.floor(callSecs / 60)).padStart(2, '0')}:${String(callSecs % 60).padStart(2, '0')}`;
  const pulse = 1 + Math.sin(frame * 0.1) * 0.03;
  return (
    <AbsoluteFill style={{ background: '#0C0A1A', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 90, height: 90, borderRadius: 28, background: 'linear-gradient(135deg, #A21D3C, #3730A3)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 40, transform: `scale(${pulse})`, boxShadow: '0 12px 40px rgba(162,29,60,0.3)' }}>👤</div>
      <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 16 }}>אורי מזרחי</div>
      <div style={{ fontFamily: RUBIK, fontSize: 14, color: '#94A3B8', marginTop: 4 }}>054-8765432</div>
      <div style={{ fontFamily: RUBIK, fontSize: 36, fontWeight: 800, color: '#22C55E', marginTop: 20 }}>{timer}</div>
      <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
        {['🔇', '⏸️', '📝', '❌'].map((icon, i) => (
          <div key={i} style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24 }}>{icon}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const MobileCallSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aiSpring = spring({ frame: Math.max(0, frame - seconds(5)), fps, config: { damping: 14, stiffness: 100, mass: 1 }, durationInFrames: 22 });
  return (
    <AbsoluteFill style={{ background: '#fff', direction: 'rtl' }}>
      <div style={{ height: 60, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>סיכום שיחה</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ padding: '12px 16px', borderRadius: 14, background: '#F0FDF4', border: '1px solid #22C55E20', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#22C55E' }}>שיחה הסתיימה · 04:12</div>
        </div>
        <FormField label="סיכום שלך" value="מעוניין בחבילת מכירות. ביקש הצעת מחיר." typeDelay={seconds(1)} typingSpeed={2} isFocused={frame > seconds(1) && frame < seconds(8)} />
        {frame > seconds(4) && (
          <div style={{ padding: '14px 18px', borderRadius: 16, background: '#A21D3C04', border: '1px solid #A21D3C10', marginBottom: 14, opacity: aiSpring }}>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 900, color: '#A21D3C', marginBottom: 6 }}>🧠 סיכום AI</div>
            <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 600, color: '#1E293B', lineHeight: 1.6 }}>ליד חם. מעוניין ב-Closer. משווה מתחרים. ביקש הצעה.</div>
          </div>
        )}
        {frame > seconds(14) && (
          <div style={{ padding: '14px', borderRadius: 14, background: '#A21D3C', fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(14)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
            שמור 💾
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
