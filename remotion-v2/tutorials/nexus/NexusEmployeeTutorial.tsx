import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import { HEEBO, RUBIK, SPRING } from '../../shared/config';
import {
  TutorialIntro,
  TutorialOutro,
  AppLayout,
  DataTable,
  FormField,
  StatusBadge,
  HighlightOverlay,
  CalloutLayer,
  ZoomFocus,
  VoiceoverSubtitle,
} from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

const NEXUS_SIDEBAR = [
  { icon: '📊', label: 'דשבורד', id: 'dashboard' },
  { icon: '👥', label: 'עובדים', id: 'employees' },
  { icon: '📋', label: 'משימות', id: 'tasks' },
  { icon: '⏰', label: 'נוכחות', id: 'attendance' },
  { icon: '🔐', label: 'הרשאות', id: 'permissions' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

const SUBTITLES = [
  { text: 'אוקיי, זה סרטון של 40 שניות. אם ייקח יותר — קפה עליי.', from: seconds(3), dur: seconds(3.5) },
  { text: 'נכנסים ל-Nexus ולוחצים על "צוות/עובדים".', from: seconds(8), dur: seconds(3) },
  { text: 'זו רשימת הצוות שלכם. שם, תפקיד, סטטוס.', from: seconds(13), dur: seconds(3.5) },
  { text: 'לוחצים על "+ הוסף עובד" למעלה.', from: seconds(18), dur: seconds(3) },
  { text: 'ממלאים שם מלא — הדבר הראשון שכולם רואים.', from: seconds(23), dur: seconds(3.5) },
  { text: 'מייל — חובה. ההזמנה נשלחת לשם.', from: seconds(28), dur: seconds(3) },
  { text: 'תפקיד — לא חייבים תואר שני. סתם כותבים מה הוא עושה.', from: seconds(33), dur: seconds(4) },
  { text: 'שולחים הזמנה — המערכת כבר תעשה את הקסם.', from: seconds(39), dur: seconds(3.5) },
  { text: 'טיפ: אם העובד לא קיבל — בדקו ספאם. גם לג׳ימייל יש חיים.', from: seconds(44), dur: seconds(4) },
  { text: 'זהו. עכשיו יש לכם עובד חדש. התקדמות.', from: seconds(50), dur: seconds(3.5) },
];

const EMPLOYEES = [
  { name: 'דוד כהן', role: 'מנהל מכירות', status: 'פעיל', color: '#22C55E' },
  { name: 'שרה לוי', role: 'שיווק', status: 'פעיל', color: '#22C55E' },
  { name: 'משה ישראלי', role: 'תפעול', status: 'חופשה', color: '#F59E0B' },
  { name: 'רחל אברהם', role: 'כספים', status: 'פעיל', color: '#22C55E' },
];

const EmployeeListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppLayout moduleKey="nexus" sidebarItems={NEXUS_SIDEBAR} activeItem="employees" headerTitle="עובדים" breadcrumb={['Nexus', 'עובדים']} actionLabel="הוסף עובד">
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'סה"כ', value: '12', color: '#3730A3' },
          { label: 'פעילים', value: '10', color: '#22C55E' },
          { label: 'בחופשה', value: '2', color: '#F59E0B' },
        ].map((s, i) => {
          const sp = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={i} style={{ flex: 1, padding: '16px 18px', borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', boxShadow: APP_THEME.cardShadow, opacity: sp }}>
              <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 700, color: '#94A3B8', direction: 'rtl' }}>{s.label}</div>
              <div style={{ fontFamily: RUBIK, fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          );
        })}
      </div>
      <DataTable
        columns={[{ label: 'שם' }, { label: 'תפקיד' }, { label: 'סטטוס' }]}
        rows={EMPLOYEES.map((e) => [
          <span style={{ fontWeight: 800 }}>{e.name}</span>,
          <span>{e.role}</span>,
          <StatusBadge text={e.status} color={e.color} />,
        ])}
      />
    </AppLayout>
  );
};

const AddEmployeeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const formSpring = spring({ frame: Math.max(0, frame - 10), fps, config: SPRING.hero, durationInFrames: 20 });
  return (
    <AppLayout moduleKey="nexus" sidebarItems={NEXUS_SIDEBAR} activeItem="employees" headerTitle="הוסף עובד" breadcrumb={['Nexus', 'עובדים', 'הוספה']}>
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', opacity: formSpring, zIndex: 10 }}>
        <div style={{ width: 500, background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.15)', transform: `translateY(${interpolate(formSpring, [0, 1], [20, 0])}px)`, direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>👤 הוסף עובד חדש</div>
          <FormField label="שם מלא" value="יעל גולדשטיין" typeDelay={seconds(3)} typingSpeed={4} isFocused={frame > seconds(3) && frame < seconds(7)} />
          <FormField label="מייל" value="yael@company.co.il" typeDelay={seconds(8)} typingSpeed={3} isFocused={frame > seconds(8) && frame < seconds(13)} />
          <FormField label="תפקיד" value="מנהלת שירות לקוחות" typeDelay={seconds(14)} typingSpeed={3} isFocused={frame > seconds(14) && frame < seconds(19)} />
          {frame > seconds(20) && (
            <div style={{ padding: '14px 24px', borderRadius: 14, background: '#3730A3', fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center', boxShadow: '0 4px 16px rgba(55,48,163,0.3)', opacity: spring({ frame: Math.max(0, frame - seconds(20)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
              שלח הזמנה 📧
            </div>
          )}
          {frame > seconds(24) && (
            <div style={{ marginTop: 14, padding: '12px 18px', borderRadius: 14, background: '#EEF2FF', border: '1px solid #3730A320', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#3730A3', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(24)), fps, config: SPRING.punch, durationInFrames: 12 }) }}>
              ✅ הזמנה נשלחה! העובד יקבל מייל תוך דקה.
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AppLayout>
  );
};

export const NexusEmployeeTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}>
      <TutorialIntro moduleKey="nexus" title="איך מוסיפים עובד (בלי לחפש את זה 20 דקות)" subtitle="40 שניות. אם ייקח יותר — קפה עליי." stepNumber={1} />
    </Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(15)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(4), duration: seconds(4), centerX: 15, centerY: 35, scale: 1.3 },
        { startFrame: seconds(10), duration: seconds(4), centerX: 85, centerY: 10, scale: 1.5 },
      ]}>
        <EmployeeListScene />
      </ZoomFocus>
      <HighlightOverlay highlights={[
        { x: 2, y: 22, width: 12, height: 8, showAt: seconds(4), duration: seconds(3.5), style: 'rectangle', color: '#3730A3' },
        { x: 78, y: 3, width: 18, height: 6, showAt: seconds(10), duration: seconds(4), style: 'pulse', color: '#3730A3' },
      ]} />
      <CalloutLayer callouts={[
        { text: '👆 "עובדים" בתפריט', x: 3, y: 16, showAt: seconds(4), duration: seconds(3), bgColor: '#3730A3' },
        { text: '👆 "+ הוסף עובד"', x: 70, y: 10, showAt: seconds(10), duration: seconds(4), bgColor: '#3730A3' },
      ]} />
    </Sequence>
    <Sequence from={seconds(18)} durationInFrames={seconds(32)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(3), duration: seconds(5), centerX: 50, centerY: 35, scale: 1.3 },
        { startFrame: seconds(10), duration: seconds(5), centerX: 50, centerY: 50, scale: 1.3 },
      ]}>
        <AddEmployeeScene />
      </ZoomFocus>
      <CalloutLayer callouts={[
        { text: '📝 שם — חובה', x: 55, y: 25, showAt: seconds(3), duration: seconds(4), bgColor: '#1E293B' },
        { text: '📧 מייל — ההזמנה נשלחת לשם', x: 55, y: 38, showAt: seconds(8), duration: seconds(4), bgColor: '#1E293B' },
        { text: '💼 תפקיד — לא חייבים תואר שני', x: 55, y: 50, showAt: seconds(14), duration: seconds(4), bgColor: '#3730A3' },
      ]} />
    </Sequence>
    <Sequence from={seconds(50)} durationInFrames={seconds(10)}>
      <TutorialOutro moduleKey="nexus" nextTitle="איך מנהלים משימות (בלי להפוך לאנשי 'אקסל')" />
    </Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const NexusEmployeeTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}>
      <TutorialIntro moduleKey="nexus" title="איך מוסיפים עובד" subtitle="40 שניות. קצר וקולע." stepNumber={1} />
    </Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(15)}>
      <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
        <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>עובדים</div>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: '#3730A3', fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#fff' }}>+ חדש</div>
        </div>
        <MobileEmployeeList />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={seconds(18)} durationInFrames={seconds(32)}>
      <MobileAddEmployee />
    </Sequence>
    <Sequence from={seconds(50)} durationInFrames={seconds(10)}>
      <TutorialOutro moduleKey="nexus" nextTitle="איך מנהלים משימות" />
    </Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

const MobileEmployeeList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {EMPLOYEES.map((e, i) => {
        const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
        return (
          <div key={i} style={{ padding: '16px', borderRadius: 18, background: '#fff', border: '1px solid #E2E8F0', opacity: s, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: HEEBO, fontSize: 16, fontWeight: 800, color: '#1E293B' }}>{e.name}</div>
              <div style={{ fontFamily: HEEBO, fontSize: 13, color: '#94A3B8' }}>{e.role}</div>
            </div>
            <StatusBadge text={e.status} color={e.color} />
          </div>
        );
      })}
    </div>
  );
};

const MobileAddEmployee: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#fff', direction: 'rtl' }}>
      <div style={{ height: 60, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>👤 הוסף עובד</div>
      </div>
      <div style={{ padding: 20 }}>
        <FormField label="שם מלא" value="יעל גולדשטיין" typeDelay={seconds(3)} typingSpeed={4} isFocused={frame > seconds(3) && frame < seconds(7)} />
        <FormField label="מייל" value="yael@company.co.il" typeDelay={seconds(8)} typingSpeed={3} isFocused={frame > seconds(8) && frame < seconds(13)} />
        <FormField label="תפקיד" value="מנהלת שירות לקוחות" typeDelay={seconds(14)} typingSpeed={3} isFocused={frame > seconds(14) && frame < seconds(19)} />
        {frame > seconds(20) && (
          <div style={{ padding: '16px', borderRadius: 14, background: '#3730A3', fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center', marginTop: 20, opacity: spring({ frame: Math.max(0, frame - seconds(20)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
            שלח הזמנה 📧
          </div>
        )}
        {frame > seconds(24) && (
          <div style={{ marginTop: 14, padding: '14px', borderRadius: 14, background: '#EEF2FF', border: '1px solid #3730A320', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#3730A3', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(24)), fps, config: SPRING.punch, durationInFrames: 12 }) }}>
            ✅ הזמנה נשלחה!
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
