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
  { text: 'משימות. הדבר הזה שכולנו אוהבים… לשכוח.', from: seconds(3), dur: seconds(3) },
  { text: 'נכנסים ל-משימות בתפריט.', from: seconds(8), dur: seconds(3) },
  { text: 'לוח קנבאן — גרירה בין סטטוסים.', from: seconds(13), dur: seconds(3.5) },
  { text: 'לוחצים "+ משימה חדשה".', from: seconds(18), dur: seconds(3) },
  { text: 'כותרת קצרה. מה צריך לעשות.', from: seconds(23), dur: seconds(3) },
  { text: 'תאריך יעד — כדי שלא ישכחו.', from: seconds(28), dur: seconds(3) },
  { text: 'משייכים למי שמסכן תורן היום.', from: seconds(33), dur: seconds(3.5) },
  { text: 'גרירה בין סטטוסים: חדש ← בתהליך ← הושלם.', from: seconds(38), dur: seconds(4) },
  { text: 'אם גררת ל-"הושלם" בלי לעשות — זה נקרא אופטימיות.', from: seconds(44), dur: seconds(4) },
  { text: 'תתחילו קטן. משימה אחת. אחר כך עוד אחת.', from: seconds(50), dur: seconds(3.5) },
];

const KANBAN_COLUMNS = [
  { label: 'חדש', color: '#3B82F6', tasks: [
    { title: 'לעדכן הצעת מחיר ללקוח גולד', assignee: 'דוד', priority: 'גבוהה' },
    { title: 'להכין מצגת לפגישה', assignee: 'שרה', priority: 'בינונית' },
  ]},
  { label: 'בתהליך', color: '#F59E0B', tasks: [
    { title: 'מעקב גבייה חודשי', assignee: 'רחל', priority: 'גבוהה' },
  ]},
  { label: 'בבדיקה', color: '#8B5CF6', tasks: [
    { title: 'קמפיין פייסבוק חדש', assignee: 'שרה', priority: 'בינונית' },
  ]},
  { label: 'הושלם', color: '#22C55E', tasks: [
    { title: 'הגדרת מע"מ במערכת', assignee: 'רחל', priority: 'נמוכה' },
    { title: 'הוספת עובד חדש', assignee: 'דוד', priority: 'בינונית' },
  ]},
];

const KanbanScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AppLayout moduleKey="nexus" sidebarItems={NEXUS_SIDEBAR} activeItem="tasks" headerTitle="משימות" breadcrumb={['Nexus', 'משימות']} actionLabel="משימה חדשה">
      <div style={{ display: 'flex', gap: 14, height: '100%' }}>
        {KANBAN_COLUMNS.map((col, ci) => {
          const colSpring = spring({ frame: Math.max(0, frame - ci * 6), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={ci} style={{
              flex: 1, borderRadius: 18, background: `${col.color}04`,
              border: `1px solid ${col.color}12`, padding: 14,
              opacity: colSpring, display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, direction: 'rtl' }}>
                <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: col.color }}>{col.label}</span>
                <span style={{ fontFamily: RUBIK, fontSize: 12, fontWeight: 800, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 8 }}>{col.tasks.length}</span>
              </div>
              {col.tasks.map((task, ti) => {
                const taskSpring = spring({ frame: Math.max(0, frame - ci * 6 - ti * 4 - 10), fps, config: SPRING.ui, durationInFrames: 12 });
                const isDragging = ci === 0 && ti === 0 && frame > seconds(20) && frame < seconds(26);
                return (
                  <div key={ti} style={{
                    padding: '14px 16px', borderRadius: 14, marginBottom: 8,
                    background: isDragging ? '#EFF6FF' : '#fff',
                    border: `1px solid ${isDragging ? '#3B82F6' : '#E2E8F0'}`,
                    boxShadow: isDragging ? '0 8px 24px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                    direction: 'rtl', opacity: taskSpring,
                    transform: isDragging ? `translateY(${Math.sin(frame * 0.1) * 3}px)` : undefined,
                  }}>
                    <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{task.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>👤 {task.assignee}</span>
                      <StatusBadge text={task.priority} color={task.priority === 'גבוהה' ? '#EF4444' : task.priority === 'בינונית' ? '#F59E0B' : '#94A3B8'} />
                    </div>
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

export const NexusTasksTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}>
      <TutorialIntro moduleKey="nexus" title="איך מנהלים משימות (בלי להפוך לאנשי ׳אקסל׳)" subtitle="משימות. הדבר הזה שכולנו אוהבים… לשכוח." stepNumber={2} />
    </Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(47)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(4), duration: seconds(4), centerX: 15, centerY: 40, scale: 1.3 },
        { startFrame: seconds(10), duration: seconds(6), centerX: 50, centerY: 50, scale: 1.2 },
        { startFrame: seconds(20), duration: seconds(8), centerX: 20, centerY: 35, scale: 1.5 },
      ]}>
        <KanbanScene />
      </ZoomFocus>
      <HighlightOverlay highlights={[
        { x: 2, y: 30, width: 12, height: 8, showAt: seconds(4), duration: seconds(3.5), style: 'rectangle', color: '#3730A3' },
        { x: 78, y: 3, width: 18, height: 6, showAt: seconds(10), duration: seconds(4), style: 'pulse', color: '#3730A3' },
      ]} />
      <CalloutLayer callouts={[
        { text: '📋 לוחצים "משימות"', x: 3, y: 24, showAt: seconds(4), duration: seconds(3), bgColor: '#3730A3' },
        { text: '➕ "+ משימה חדשה"', x: 70, y: 10, showAt: seconds(10), duration: seconds(4), bgColor: '#3730A3' },
        { text: '🖱️ גוררים בין עמודות!', x: 15, y: 25, showAt: seconds(20), duration: seconds(6), bgColor: '#3B82F6' },
        { text: '✅ הושלם!', x: 70, y: 30, showAt: seconds(28), duration: seconds(4), bgColor: '#22C55E' },
      ]} />
    </Sequence>
    <Sequence from={seconds(50)} durationInFrames={seconds(10)}>
      <TutorialOutro moduleKey="nexus" nextTitle="איך רואים נוכחות (כדי לדעת מי באמת פה)" />
    </Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const NexusTasksTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}>
      <TutorialIntro moduleKey="nexus" title="איך מנהלים משימות" subtitle="גרירה, סטטוסים, ביצוע." stepNumber={2} />
    </Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(47)}>
      <MobileKanban />
    </Sequence>
    <Sequence from={seconds(50)} durationInFrames={seconds(10)}>
      <TutorialOutro moduleKey="nexus" nextTitle="איך רואים נוכחות" />
    </Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

const MobileKanban: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // On mobile, show as vertical list grouped by status
  return (
    <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
      <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>משימות</div>
        <div style={{ padding: '8px 16px', borderRadius: 12, background: '#3730A3', fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#fff' }}>+ חדשה</div>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        {KANBAN_COLUMNS.slice(0, 3).map((col, ci) => {
          const s = spring({ frame: Math.max(0, frame - ci * 8), fps, config: SPRING.ui, durationInFrames: 14 });
          return (
            <div key={ci} style={{ opacity: s }}>
              <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: col.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                {col.label} ({col.tasks.length})
              </div>
              {col.tasks.map((task, ti) => (
                <div key={ti} style={{ padding: '14px 16px', borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', marginBottom: 8 }}>
                  <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{task.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontFamily: HEEBO, fontSize: 12, color: '#94A3B8' }}>👤 {task.assignee}</span>
                    <StatusBadge text={task.priority} color={task.priority === 'גבוהה' ? '#EF4444' : '#F59E0B'} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
