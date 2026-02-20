import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { HEEBO, RUBIK, SPRING } from '../../shared/config';
import { TutorialIntro, TutorialOutro, AppLayout, FormField, StatusBadge, DataTable, CalloutLayer, ZoomFocus, VoiceoverSubtitle } from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

const CLIENT_SIDEBAR = [
  { icon: '📊', label: 'דשבורד', id: 'dashboard' },
  { icon: '👤', label: 'לקוחות', id: 'clients' },
  { icon: '🌐', label: 'פורטל', id: 'portal' },
  { icon: '📋', label: 'טפסים', id: 'forms' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

const SUBTITLES = [
  { text: 'פורטל לקוחות: המקום שבו הלקוח מרגיש VIP.', from: seconds(3), dur: seconds(3.5) },
  { text: 'נכנסים ל-Client ולוחצים על "לקוחות".', from: seconds(8), dur: seconds(3) },
  { text: 'בוחרים לקוח מהרשימה.', from: seconds(13), dur: seconds(3) },
  { text: 'לוחצים "הפעל פורטל" — הלקוח מקבל גישה.', from: seconds(18), dur: seconds(3.5) },
  { text: 'הפורטל מציג: פרויקטים, חשבוניות, מסמכים.', from: seconds(23), dur: seconds(3.5) },
  { text: 'הלקוח יכול לשלוח הודעות ולהעלות קבצים.', from: seconds(28), dur: seconds(3.5) },
  { text: 'אתם שולטים במה הוא רואה. 100% שקיפות, 0% בלגן.', from: seconds(33), dur: seconds(4) },
  { text: 'פורטל = פחות שיחות "מה הסטטוס?". נשמע טוב?', from: seconds(39), dur: seconds(3.5) },
];

const CLIENTS = [
  { name: 'חברת גולד בע"מ', contact: 'דני גולד', projects: 3, status: 'פעיל', color: '#22C55E', portal: true },
  { name: 'אורי מזרחי - עיצוב', contact: 'אורי מזרחי', projects: 1, status: 'פעיל', color: '#22C55E', portal: false },
  { name: 'שרה לוי קונסלטינג', contact: 'שרה לוי', projects: 2, status: 'פעיל', color: '#22C55E', portal: true },
  { name: 'טק סולושנס', contact: 'משה כהן', projects: 1, status: 'ממתין', color: '#F59E0B', portal: false },
];

const ClientListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppLayout moduleKey="client" sidebarItems={CLIENT_SIDEBAR} activeItem="clients" headerTitle="לקוחות" breadcrumb={['Client', 'לקוחות']} actionLabel="לקוח חדש">
      <DataTable
        columns={[{ label: 'חברה' }, { label: 'איש קשר' }, { label: 'פרויקטים' }, { label: 'פורטל' }, { label: 'סטטוס' }]}
        rows={CLIENTS.map((c) => [
          <span style={{ fontWeight: 800 }}>{c.name}</span>,
          <span style={{ color: '#64748B' }}>{c.contact}</span>,
          <span style={{ fontFamily: RUBIK, fontWeight: 800 }}>{c.projects}</span>,
          <span style={{ fontSize: 14 }}>{c.portal ? '🟢 פעיל' : '⚪ לא פעיל'}</span>,
          <StatusBadge text={c.status} color={c.color} />,
        ])}
        highlightRow={0}
      />
    </AppLayout>
  );
};

const PortalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const portalSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ background: '#FFFBEB', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        width: 800, background: '#fff', borderRadius: 24, padding: 32,
        boxShadow: '0 24px 60px rgba(0,0,0,0.1)', direction: 'rtl',
        opacity: portalSpring, transform: `translateY(${interpolate(portalSpring, [0, 1], [20, 0])}px)`,
      }}>
        {/* Portal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: HEEBO, fontSize: 24, fontWeight: 900, color: '#1E293B' }}>🌐 פורטל לקוח — חברת גולד בע"מ</div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#94A3B8', marginTop: 4 }}>ברוך הבא, דני!</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: '#C5A57220', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 24 }}>🏢</div>
        </div>

        {/* Portal tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['פרויקטים', 'חשבוניות', 'מסמכים', 'הודעות'].map((tab, i) => (
            <div key={i} style={{
              padding: '10px 18px', borderRadius: 14,
              background: i === 0 ? '#C5A57210' : '#F8FAFC',
              border: `1px solid ${i === 0 ? '#C5A57225' : '#E2E8F0'}`,
              fontFamily: HEEBO, fontSize: 14, fontWeight: i === 0 ? 800 : 600,
              color: i === 0 ? '#C5A572' : '#64748B',
            }}>{tab}</div>
          ))}
        </div>

        {/* Projects list */}
        {[
          { name: 'אתר חדש', progress: 75, status: 'בתהליך' },
          { name: 'קמפיין Q1', progress: 100, status: 'הושלם' },
          { name: 'מיתוג', progress: 30, status: 'חדש' },
        ].map((proj, i) => {
          const projSpring = spring({ frame: Math.max(0, frame - 20 - i * 8), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{
              padding: '16px 20px', borderRadius: 16, marginBottom: 10,
              background: '#FFFBEB', border: '1px solid #C5A57215',
              opacity: projSpring,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{proj.name}</span>
                <StatusBadge text={proj.status} color={proj.progress === 100 ? '#22C55E' : proj.progress > 50 ? '#F59E0B' : '#3B82F6'} />
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${proj.progress * projSpring}%`, borderRadius: 3, background: proj.progress === 100 ? '#22C55E' : '#C5A572', transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontFamily: RUBIK, fontSize: 11, fontWeight: 700, color: '#94A3B8', marginTop: 4, textAlign: 'left' }}>{Math.round(proj.progress * projSpring)}%</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ClientPortalTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="client" title="איך מפעילים פורטל ללקוח (ולהפסיק לענות ׳מה הסטטוס׳)" subtitle="פורטל: הלקוח רואה הכל. אתם שולטים במה." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(12)}>
      <ZoomFocus zoomSteps={[{ startFrame: seconds(3), duration: seconds(5), centerX: 60, centerY: 30, scale: 1.3 }]}><ClientListScene /></ZoomFocus>
      <CalloutLayer callouts={[{ text: '👆 בוחרים לקוח', x: 40, y: 20, showAt: seconds(3), duration: seconds(4), bgColor: '#C5A572' }]} />
    </Sequence>
    <Sequence from={seconds(15)} durationInFrames={seconds(25)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(2), duration: seconds(6), centerX: 50, centerY: 25, scale: 1.3 },
        { startFrame: seconds(10), duration: seconds(8), centerX: 50, centerY: 55, scale: 1.3 },
      ]}><PortalScene /></ZoomFocus>
      <CalloutLayer callouts={[
        { text: '🌐 הפורטל של הלקוח', x: 25, y: 10, showAt: seconds(2), duration: seconds(5), bgColor: '#C5A572' },
        { text: '📊 הלקוח רואה התקדמות בזמן אמת', x: 30, y: 45, showAt: seconds(10), duration: seconds(5), bgColor: '#1E293B' },
      ]} />
    </Sequence>
    <Sequence from={seconds(40)} durationInFrames={seconds(10)}><TutorialOutro moduleKey="client" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const ClientPortalTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="client" title="איך מפעילים פורטל ללקוח" subtitle="הלקוח רואה הכל. אתם שולטים." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(12)}>
      <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
        <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>לקוחות</div>
        </div>
        <MobileClientList />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={seconds(15)} durationInFrames={seconds(25)}><MobilePortal /></Sequence>
    <Sequence from={seconds(40)} durationInFrames={seconds(10)}><TutorialOutro moduleKey="client" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

const MobileClientList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {CLIENTS.map((c, i) => {
        const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
        return (
          <div key={i} style={{ padding: 16, borderRadius: 18, background: '#fff', border: '1px solid #E2E8F0', opacity: s }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{c.name}</span>
              <StatusBadge text={c.status} color={c.color} />
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 12, color: '#94A3B8' }}>{c.contact} · {c.projects} פרויקטים · {c.portal ? '🟢 פורטל' : '⚪'}</div>
          </div>
        );
      })}
    </div>
  );
};

const MobilePortal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#FFFBEB', direction: 'rtl' }}>
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
        <div style={{ fontSize: 20 }}>🌐</div>
        <div style={{ fontFamily: HEEBO, fontSize: 18, fontWeight: 900, color: '#1E293B' }}>פורטל — חברת גולד</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {['פרויקטים', 'חשבוניות', 'מסמכים', 'הודעות'].map((tab, i) => (
            <div key={i} style={{ padding: '8px 14px', borderRadius: 12, background: i === 0 ? '#C5A57210' : '#F8FAFC', border: `1px solid ${i === 0 ? '#C5A57225' : '#E2E8F0'}`, fontFamily: HEEBO, fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#C5A572' : '#64748B', whiteSpace: 'nowrap' }}>{tab}</div>
          ))}
        </div>
        {[
          { name: 'אתר חדש', progress: 75, status: 'בתהליך' },
          { name: 'קמפיין Q1', progress: 100, status: 'הושלם' },
          { name: 'מיתוג', progress: 30, status: 'חדש' },
        ].map((proj, i) => {
          const s = spring({ frame: Math.max(0, frame - 10 - i * 6), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{ padding: 16, borderRadius: 16, background: '#fff', border: '1px solid #C5A57210', marginBottom: 10, opacity: s }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{proj.name}</span>
                <StatusBadge text={proj.status} color={proj.progress === 100 ? '#22C55E' : '#F59E0B'} />
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#E2E8F0' }}>
                <div style={{ height: '100%', width: `${proj.progress}%`, borderRadius: 3, background: proj.progress === 100 ? '#22C55E' : '#C5A572' }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
