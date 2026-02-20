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
  DataTable,
  FormField,
  StatusBadge,
  HighlightOverlay,
  CalloutLayer,
  CursorPointer,
  ZoomFocus,
  VoiceoverSubtitle,
} from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

/**
 * System Tutorial #1: איך פותחים ליד (ואיך לא משאירים אותו יתום)
 * Duration: ~90 seconds (2700 frames @ 30fps)
 * Desktop (16:9) version
 */

const DURATION = seconds(90); // 2700 frames
const FPS = 30;

// ─── Sidebar items for System module ──────────────────────
const SYSTEM_SIDEBAR = [
  { icon: '📊', label: 'דשבורד', id: 'dashboard' },
  { icon: '🎯', label: 'לידים', id: 'leads' },
  { icon: '📞', label: 'חייגן', id: 'dialer' },
  { icon: '💼', label: 'צינור מכירות', id: 'pipeline' },
  { icon: '📈', label: 'דוחות', id: 'reports' },
  { icon: '📅', label: 'יומן', id: 'calendar' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

// ─── Sample leads data ────────────────────────────────────
const SAMPLE_LEADS = [
  ['דוד כהן', '054-1234567', 'אתר', 'חדש', '#3B82F6'],
  ['שרה לוי', '052-9876543', 'פייסבוק', 'בטיפול', '#F59E0B'],
  ['משה ישראלי', '050-5551234', 'הפניה', 'חם', '#EF4444'],
  ['רחל אברהם', '053-7778899', 'Google Ads', 'חדש', '#3B82F6'],
  ['יוסי גולד', '058-2223344', 'LinkedIn', 'סגור', '#22C55E'],
];

// ─── Voiceover subtitles ──────────────────────────────────
const SUBTITLES = [
  // Intro
  { text: 'ליד חדש זה כמו גור חתולים: חמוד, אבל צריך טיפול.', from: seconds(3), dur: seconds(3.5) },
  // Navigate to leads
  { text: 'נכנסים ל-System ולוחצים על "לידים" בתפריט.', from: seconds(8), dur: seconds(3.5) },
  // Leads list
  { text: 'זו רשימת הלידים שלכם. כל ליד עם סטטוס, מקור, ופרטי קשר.', from: seconds(13), dur: seconds(4) },
  // Click new lead
  { text: 'לוחצים על "+ ליד חדש" למעלה.', from: seconds(19), dur: seconds(3) },
  // Fill form - name
  { text: 'ממלאים שם מלא. זה הדבר הראשון שצוות המכירות רואה.', from: seconds(24), dur: seconds(3.5) },
  // Fill form - phone
  { text: 'מספר טלפון — חובה. בלי זה, אין שיחה.', from: seconds(29), dur: seconds(3) },
  // Fill form - source
  { text: 'מקור הליד. חשוב למדידה — מאיפה הגיע?', from: seconds(34), dur: seconds(3) },
  // Fill form - note
  { text: 'טיפ: תכתבו הערה קצרה — למה הוא פנה. העתיד יודה לכם.', from: seconds(39), dur: seconds(4) },
  // Assign owner
  { text: 'משייכים בעלים — מי מטפל בליד הזה. חובה.', from: seconds(45), dur: seconds(3.5) },
  // Submit
  { text: 'לוחצים "שמור" — והליד נכנס למערכת.', from: seconds(50), dur: seconds(3) },
  // AI scoring
  { text: 'שימו לב: ה-AI מדרג את הליד אוטומטית — חם, קר, או פושר.', from: seconds(55), dur: seconds(4.5) },
  // Lead card
  { text: 'הנה הוא! ליד חדש ברשימה, עם סטטוס "חדש" ודירוג AI.', from: seconds(61), dur: seconds(4) },
  // Pipeline view
  { text: 'הליד גם מופיע אוטומטית בצינור המכירות — מוכן לטיפול.', from: seconds(67), dur: seconds(4) },
  // Follow-up reminder
  { text: 'המערכת תיצור תזכורת פולואפ אוטומטית. לא שוכחים אף ליד.', from: seconds(73), dur: seconds(4) },
  // Summary
  { text: 'שמרתם? יאללה, זה כבר לא ליד אבוד. התקדמות.', from: seconds(79), dur: seconds(3.5) },
];

// ═══════════════════════════════════════════════════════════
// Scene 1: Leads List View [3s-18s]
// ═══════════════════════════════════════════════════════════
const LeadsListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="leads"
      headerTitle="לידים"
      breadcrumb={['System', 'לידים']}
      actionLabel="ליד חדש"
    >
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'סה"כ לידים', value: '47', color: '#3B82F6' },
          { label: 'חמים', value: '12', color: '#EF4444' },
          { label: 'בטיפול', value: '18', color: '#F59E0B' },
          { label: 'סגורים החודש', value: '8', color: '#22C55E' },
        ].map((stat, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              flex: 1, padding: '16px 18px', borderRadius: 16,
              background: APP_THEME.card, border: `1px solid ${APP_THEME.cardBorder}`,
              boxShadow: APP_THEME.cardShadow, opacity: s,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: APP_THEME.textLight, direction: 'rtl' }}>{stat.label}</div>
              <div style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Leads table */}
      <DataTable
        columns={[
          { label: 'שם' },
          { label: 'טלפון' },
          { label: 'מקור' },
          { label: 'סטטוס' },
        ]}
        rows={SAMPLE_LEADS.map(([name, phone, source, status, color]) => [
          <span style={{ fontWeight: 800 }}>{name}</span>,
          <span style={{ fontFamily: RUBIK, fontSize: 13, color: APP_THEME.textMuted }}>{phone}</span>,
          <span>{source}</span>,
          <StatusBadge text={status as string} color={color as string} />,
        ])}
      />
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Scene 2: New Lead Form [18s-53s]
// ═══════════════════════════════════════════════════════════
const NewLeadFormScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Form animation: fields appear and fill one by one
  const formSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="leads"
      headerTitle="ליד חדש"
      breadcrumb={['System', 'לידים', 'ליד חדש']}
    >
      {/* Modal overlay */}
      <AbsoluteFill style={{
        background: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
        opacity: formSpring, zIndex: 10,
      }}>
        <div style={{
          width: 520, background: '#fff', borderRadius: 24, padding: 32,
          boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
          transform: `translateY(${interpolate(formSpring, [0, 1], [20, 0])}px)`,
          direction: 'rtl',
        }}>
          <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: APP_THEME.text, marginBottom: 24 }}>
            ✨ ליד חדש
          </div>

          <FormField label="שם מלא" value="אורי מזרחי" typeDelay={seconds(3)} typingSpeed={4} isFocused={frame > seconds(3) && frame < seconds(7)} />
          <FormField label="טלפון" value="054-8765432" typeDelay={seconds(8)} typingSpeed={3} isFocused={frame > seconds(8) && frame < seconds(11)} />

          {/* Source dropdown */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: APP_THEME.textLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>מקור</div>
            <div style={{
              padding: '12px 16px', borderRadius: 12, background: APP_THEME.input,
              border: `1.5px solid ${frame > seconds(13) && frame < seconds(16) ? APP_THEME.inputFocus : APP_THEME.inputBorder}`,
              fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: APP_THEME.text,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{frame > seconds(14) ? 'Google Ads' : 'בחר מקור...'}</span>
              <span style={{ fontSize: 12, color: APP_THEME.textLight }}>▼</span>
            </div>
          </div>

          {/* Note */}
          <FormField label="הערה" value="מעוניין בחבילת מכירות, פנה דרך מודעה" typeDelay={seconds(16)} typingSpeed={2} isFocused={frame > seconds(16) && frame < seconds(25)} />

          {/* Owner dropdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 800, color: APP_THEME.textLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>בעלים (מטפל)</div>
            <div style={{
              padding: '12px 16px', borderRadius: 12, background: APP_THEME.input,
              border: `1.5px solid ${frame > seconds(24) && frame < seconds(27) ? APP_THEME.inputFocus : APP_THEME.inputBorder}`,
              fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: APP_THEME.text,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{frame > seconds(25) ? '👤 דוד כהן' : 'בחר מטפל...'}</span>
              <span style={{ fontSize: 12, color: APP_THEME.textLight }}>▼</span>
            </div>
          </div>

          {/* Submit button */}
          {frame > seconds(28) && (
            <div style={{
              padding: '14px 24px', borderRadius: 14, background: '#A21D3C',
              fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff',
              textAlign: 'center', cursor: 'pointer',
              opacity: spring({ frame: Math.max(0, frame - seconds(28)), fps, config: SPRING.punch, durationInFrames: 14 }),
              boxShadow: '0 4px 16px rgba(162,29,60,0.3)',
            }}>
              שמור ליד 🚀
            </div>
          )}

          {/* Success state */}
          {frame > seconds(32) && (
            <div style={{
              marginTop: 14, padding: '12px 18px', borderRadius: 14,
              background: '#F0FDF4', border: '1px solid #22C55E30',
              fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#22C55E',
              textAlign: 'center',
              opacity: spring({ frame: Math.max(0, frame - seconds(32)), fps, config: SPRING.punch, durationInFrames: 12 }),
            }}>
              ✅ הליד נשמר בהצלחה! AI מדרג...
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Scene 3: AI Scoring + Lead in List [53s-73s]
// ═══════════════════════════════════════════════════════════
const AIScoreScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const newLeadRow = ['אורי מזרחי', '054-8765432', 'Google Ads', 'חדש', '#3B82F6'];
  const allLeads = [newLeadRow, ...SAMPLE_LEADS];

  const aiScoreSpring = spring({ frame: Math.max(0, frame - seconds(3)), fps, config: { damping: 10, stiffness: 100, mass: 1 }, durationInFrames: 25 });
  const aiScore = Math.round(75 * aiScoreSpring);

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="leads"
      headerTitle="לידים"
      breadcrumb={['System', 'לידים']}
      actionLabel="ליד חדש"
    >
      {/* AI Score overlay for new lead */}
      {frame > seconds(2) && (
        <div style={{
          position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, opacity: aiScoreSpring,
        }}>
          <div style={{
            padding: '16px 28px', borderRadius: 20, background: '#fff',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0',
            display: 'flex', alignItems: 'center', gap: 16, direction: 'rtl',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `conic-gradient(#A21D3C ${aiScore * 3.6}deg, #E2E8F0 0deg)`,
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontFamily: RUBIK, fontSize: 18, fontWeight: 800, color: '#A21D3C' }}>{aiScore}</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 900, color: '#1E293B' }}>🧠 דירוג AI</div>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#64748B' }}>ליד חם — סיכוי גבוה לסגירה</div>
            </div>
          </div>
        </div>
      )}

      {/* Updated table with new lead highlighted */}
      <div style={{ marginTop: frame > seconds(2) ? 100 : 0 }}>
        <DataTable
          columns={[
            { label: 'שם' },
            { label: 'טלפון' },
            { label: 'מקור' },
            { label: 'סטטוס' },
          ]}
          rows={allLeads.map(([name, phone, source, status, color]) => [
            <span style={{ fontWeight: 800 }}>{name}</span>,
            <span style={{ fontFamily: RUBIK, fontSize: 13, color: APP_THEME.textMuted }}>{phone}</span>,
            <span>{source}</span>,
            <StatusBadge text={status as string} color={color as string} />,
          ])}
          highlightRow={0}
        />
      </div>
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Scene 4: Pipeline View [73s-83s]
// ═══════════════════════════════════════════════════════════
const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stages = [
    { label: 'חדש', color: '#3B82F6', count: 5, leads: ['אורי מזרחי', 'רחל אברהם'] },
    { label: 'בטיפול', color: '#F59E0B', count: 4, leads: ['שרה לוי'] },
    { label: 'הצעה', color: '#8B5CF6', count: 3, leads: [] },
    { label: 'משא ומתן', color: '#EF4444', count: 2, leads: ['משה ישראלי'] },
    { label: 'סגור!', color: '#22C55E', count: 8, leads: ['יוסי גולד'] },
  ];

  return (
    <AppLayout
      moduleKey="system"
      sidebarItems={SYSTEM_SIDEBAR}
      activeItem="pipeline"
      headerTitle="צינור מכירות"
      breadcrumb={['System', 'צינור מכירות']}
    >
      <div style={{ display: 'flex', gap: 14, height: '100%' }}>
        {stages.map((stage, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              flex: 1, borderRadius: 18, background: `${stage.color}04`,
              border: `1px solid ${stage.color}15`, padding: 14,
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px)`,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: stage.color }}>{stage.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: APP_THEME.textLight, background: '#F1F5F9', padding: '2px 8px', borderRadius: 8 }}>{stage.count}</span>
              </div>
              {stage.leads.map((lead, j) => {
                const isNewLead = lead === 'אורי מזרחי';
                return (
                  <div key={j} style={{
                    padding: '12px 14px', borderRadius: 14, marginBottom: 8,
                    background: isNewLead ? '#FFF1F2' : '#fff',
                    border: `1px solid ${isNewLead ? '#A21D3C20' : '#E2E8F0'}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    direction: 'rtl',
                  }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{lead}</div>
                    {isNewLead && (
                      <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#A21D3C', marginTop: 4 }}>🧠 AI: 75 — חם</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Main Composition
// ═══════════════════════════════════════════════════════════
export const SystemLeadsTutorialDesktop: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Intro: 0-3s */}
      <Sequence from={0} durationInFrames={seconds(3)}>
        <TutorialIntro
          moduleKey="system"
          title="איך פותחים ליד (ואיך לא משאירים אותו יתום)"
          subtitle="40 שניות. אם ייקח יותר — תדרשו ממני קפה."
          stepNumber={1}
        />
      </Sequence>

      {/* Leads List: 3s-18s */}
      <Sequence from={seconds(3)} durationInFrames={seconds(15)}>
        <ZoomFocus zoomSteps={[
          { startFrame: seconds(4), duration: seconds(4), centerX: 15, centerY: 50, scale: 1.3 },
          { startFrame: seconds(10), duration: seconds(5), centerX: 85, centerY: 10, scale: 1.5 },
        ]}>
          <LeadsListScene />
        </ZoomFocus>
        <HighlightOverlay highlights={[
          { x: 2, y: 20, width: 12, height: 60, showAt: seconds(4), duration: seconds(3.5), style: 'rectangle', color: '#A21D3C' },
          { x: 78, y: 3, width: 18, height: 6, showAt: seconds(10), duration: seconds(4), style: 'pulse', color: '#A21D3C' },
        ]} />
        <CalloutLayer callouts={[
          { text: '👆 לוחצים כאן על "לידים"', x: 3, y: 15, showAt: seconds(4), duration: seconds(3), bgColor: '#A21D3C' },
          { text: '👆 "+ ליד חדש"', x: 70, y: 10, showAt: seconds(10), duration: seconds(4), bgColor: '#A21D3C' },
        ]} />
      </Sequence>

      {/* New Lead Form: 18s-53s */}
      <Sequence from={seconds(18)} durationInFrames={seconds(35)}>
        <ZoomFocus zoomSteps={[
          { startFrame: seconds(3), duration: seconds(5), centerX: 50, centerY: 30, scale: 1.4 },
          { startFrame: seconds(10), duration: seconds(5), centerX: 50, centerY: 42, scale: 1.4 },
          { startFrame: seconds(16), duration: seconds(6), centerX: 50, centerY: 55, scale: 1.3 },
          { startFrame: seconds(24), duration: seconds(5), centerX: 50, centerY: 68, scale: 1.3 },
        ]}>
          <NewLeadFormScene />
        </ZoomFocus>
        <CalloutLayer callouts={[
          { text: '📝 שם מלא — חובה', x: 55, y: 22, showAt: seconds(3), duration: seconds(4), bgColor: '#1E293B' },
          { text: '📞 טלפון — חובה', x: 55, y: 34, showAt: seconds(8), duration: seconds(4), bgColor: '#1E293B' },
          { text: '🔍 מקור — למדידה', x: 55, y: 44, showAt: seconds(13), duration: seconds(3), bgColor: '#1E293B' },
          { text: '💡 טיפ: הערה קצרה', x: 55, y: 55, showAt: seconds(16), duration: seconds(5), bgColor: '#22C55E' },
          { text: '👤 בעלים — מי מטפל', x: 55, y: 65, showAt: seconds(24), duration: seconds(4), bgColor: '#1E293B' },
        ]} />
      </Sequence>

      {/* AI Score + Updated List: 53s-73s */}
      <Sequence from={seconds(53)} durationInFrames={seconds(20)}>
        <ZoomFocus zoomSteps={[
          { startFrame: seconds(2), duration: seconds(8), centerX: 50, centerY: 20, scale: 1.5 },
          { startFrame: seconds(12), duration: seconds(6), centerX: 65, centerY: 30, scale: 1.3 },
        ]}>
          <AIScoreScene />
        </ZoomFocus>
        <CalloutLayer callouts={[
          { text: '🧠 AI דירג אוטומטית: 75 — חם!', x: 25, y: 12, showAt: seconds(3), duration: seconds(6), bgColor: '#A21D3C' },
          { text: '✅ הליד ברשימה, מוכן לטיפול', x: 40, y: 28, showAt: seconds(10), duration: seconds(5), bgColor: '#22C55E' },
        ]} />
      </Sequence>

      {/* Pipeline: 73s-83s */}
      <Sequence from={seconds(73)} durationInFrames={seconds(10)}>
        <ZoomFocus zoomSteps={[
          { startFrame: seconds(1), duration: seconds(7), centerX: 15, centerY: 40, scale: 1.4 },
        ]}>
          <PipelineScene />
        </ZoomFocus>
        <HighlightOverlay highlights={[
          { x: 2, y: 25, width: 18, height: 35, showAt: seconds(2), duration: seconds(6), style: 'rectangle', color: '#A21D3C' },
        ]} />
        <CalloutLayer callouts={[
          { text: '📊 הליד מופיע גם בצינור!', x: 3, y: 18, showAt: seconds(2), duration: seconds(5), bgColor: '#A21D3C' },
        ]} />
      </Sequence>

      {/* Outro: 83s-90s (reduced to fit) */}
      <Sequence from={seconds(83)} durationInFrames={seconds(7)}>
        <TutorialOutro moduleKey="system" nextTitle="איך משתמשים בחייגן (בלי 'אני אחזור אליו')" />
      </Sequence>

      {/* Subtitles */}
      <VoiceoverSubtitle segments={SUBTITLES} />
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════════════════════
// Mobile Version (9:16) — adapted layout
// ═══════════════════════════════════════════════════════════
export const SystemLeadsTutorialMobile: React.FC = () => {
  // Mobile uses the same scenes but with collapsed sidebar and adjusted layout
  return (
    <AbsoluteFill>
      {/* Intro */}
      <Sequence from={0} durationInFrames={seconds(3)}>
        <TutorialIntro
          moduleKey="system"
          title="איך פותחים ליד"
          subtitle="40 שניות. קפה עליי."
          stepNumber={1}
        />
      </Sequence>

      {/* Leads list (simplified mobile view) */}
      <Sequence from={seconds(3)} durationInFrames={seconds(15)}>
        <MobileLeadsScene />
      </Sequence>

      {/* New Lead Form (mobile) */}
      <Sequence from={seconds(18)} durationInFrames={seconds(35)}>
        <MobileNewLeadScene />
      </Sequence>

      {/* AI Score (mobile) */}
      <Sequence from={seconds(53)} durationInFrames={seconds(20)}>
        <MobileAIScoreScene />
      </Sequence>

      {/* Pipeline (mobile) */}
      <Sequence from={seconds(73)} durationInFrames={seconds(10)}>
        <MobilePipelineScene />
      </Sequence>

      {/* Outro */}
      <Sequence from={seconds(83)} durationInFrames={seconds(7)}>
        <TutorialOutro moduleKey="system" nextTitle="איך משתמשים בחייגן" />
      </Sequence>

      <VoiceoverSubtitle segments={SUBTITLES} />
    </AbsoluteFill>
  );
};

// ─── Mobile Scenes ────────────────────────────────────────

const MobileLeadsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
      {/* Mobile header */}
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>לידים</div>
        <div style={{ padding: '8px 16px', borderRadius: 12, background: '#A21D3C', fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#fff' }}>+ חדש</div>
      </div>

      {/* Lead cards (mobile) */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SAMPLE_LEADS.map(([name, phone, source, status, color], i) => {
          const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              padding: '16px 18px', borderRadius: 18, background: '#fff',
              border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{name}</span>
                <StatusBadge text={status as string} color={color as string} />
              </div>
              <div style={{ fontFamily: RUBIK, fontSize: 13, color: '#94A3B8' }}>{phone} · {source}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MobileNewLeadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: '#fff', direction: 'rtl' }}>
      <div style={{ height: 60, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>✨ ליד חדש</div>
      </div>
      <div style={{ padding: 20 }}>
        <FormField label="שם מלא" value="אורי מזרחי" typeDelay={seconds(3)} typingSpeed={4} isFocused={frame > seconds(3) && frame < seconds(7)} />
        <FormField label="טלפון" value="054-8765432" typeDelay={seconds(8)} typingSpeed={3} isFocused={frame > seconds(8) && frame < seconds(11)} />
        <FormField label="מקור" value="Google Ads" typeDelay={seconds(13)} typingSpeed={5} isFocused={frame > seconds(13) && frame < seconds(16)} />
        <FormField label="הערה" value="מעוניין בחבילת מכירות" typeDelay={seconds(16)} typingSpeed={2} isFocused={frame > seconds(16) && frame < seconds(25)} />
        <FormField label="בעלים" value="👤 דוד כהן" typeDelay={seconds(25)} typingSpeed={5} isFocused={frame > seconds(24) && frame < seconds(27)} />

        {frame > seconds(28) && (
          <div style={{
            padding: '16px 24px', borderRadius: 16, background: '#A21D3C', marginTop: 20,
            fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center',
            opacity: spring({ frame: Math.max(0, frame - seconds(28)), fps, config: SPRING.punch, durationInFrames: 14 }),
          }}>
            שמור ליד 🚀
          </div>
        )}

        {frame > seconds(32) && (
          <div style={{
            marginTop: 14, padding: '14px 18px', borderRadius: 14,
            background: '#F0FDF4', border: '1px solid #22C55E30',
            fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#22C55E', textAlign: 'center',
            opacity: spring({ frame: Math.max(0, frame - seconds(32)), fps, config: SPRING.punch, durationInFrames: 12 }),
          }}>
            ✅ נשמר! AI מדרג...
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const MobileAIScoreScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aiScoreSpring = spring({ frame: Math.max(0, frame - seconds(3)), fps, config: { damping: 10, stiffness: 100, mass: 1 }, durationInFrames: 25 });
  const aiScore = Math.round(75 * aiScoreSpring);

  return (
    <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>לידים</div>
      </div>

      {/* AI Score card */}
      {frame > seconds(2) && (
        <div style={{
          margin: '16px 16px 0', padding: '18px 20px', borderRadius: 18,
          background: '#FFF1F2', border: '1px solid #A21D3C15',
          display: 'flex', alignItems: 'center', gap: 14,
          opacity: aiScoreSpring,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: `conic-gradient(#A21D3C ${aiScore * 3.6}deg, #E2E8F0 0deg)`,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ fontFamily: RUBIK, fontSize: 16, fontWeight: 800, color: '#A21D3C' }}>{aiScore}</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 900, color: '#1E293B' }}>🧠 דירוג AI: ליד חם</div>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#64748B' }}>אורי מזרחי — סיכוי גבוה</div>
          </div>
        </div>
      )}

      {/* Updated lead list */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[['אורי מזרחי', '054-8765432', 'Google Ads', 'חדש', '#3B82F6'], ...SAMPLE_LEADS.slice(0, 3)].map(([name, phone, source, status, color], i) => {
          const s = spring({ frame: Math.max(0, frame - seconds(5) - i * 3), fps, config: SPRING.ui, durationInFrames: 12 });
          return (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: 16, background: i === 0 ? '#FFF1F2' : '#fff',
              border: `1px solid ${i === 0 ? '#A21D3C15' : '#E2E8F0'}`,
              opacity: s,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{name}</span>
                <StatusBadge text={status as string} color={color as string} />
              </div>
              <div style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{phone}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const MobilePipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stages = [
    { label: 'חדש', color: '#3B82F6', leads: ['אורי מזרחי', 'רחל אברהם'] },
    { label: 'בטיפול', color: '#F59E0B', leads: ['שרה לוי'] },
    { label: 'סגור!', color: '#22C55E', leads: ['יוסי גולד'] },
  ];

  return (
    <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>צינור מכירות</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stages.map((stage, i) => {
          const s = spring({ frame: Math.max(0, frame - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              padding: 16, borderRadius: 18, background: `${stage.color}04`,
              border: `1px solid ${stage.color}15`, opacity: s,
            }}>
              <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: stage.color, marginBottom: 10 }}>{stage.label}</div>
              {stage.leads.map((lead, j) => {
                const isNew = lead === 'אורי מזרחי';
                return (
                  <div key={j} style={{
                    padding: '12px 14px', borderRadius: 14, marginBottom: 6,
                    background: isNew ? '#FFF1F2' : '#fff',
                    border: `1px solid ${isNew ? '#A21D3C15' : '#E2E8F0'}`,
                  }}>
                    <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{lead}</span>
                    {isNew && <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#A21D3C', marginRight: 8 }}>🧠 75</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
