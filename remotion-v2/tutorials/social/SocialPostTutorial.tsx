import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { HEEBO, RUBIK, SPRING } from '../../shared/config';
import { TutorialIntro, TutorialOutro, AppLayout, FormField, StatusBadge, HighlightOverlay, CalloutLayer, ZoomFocus, VoiceoverSubtitle } from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

const SOCIAL_SIDEBAR = [
  { icon: '📊', label: 'דשבורד', id: 'dashboard' },
  { icon: '✍️', label: 'Machine', id: 'machine' },
  { icon: '📅', label: 'לוח שידורים', id: 'calendar' },
  { icon: '📈', label: 'אנליטיקס', id: 'analytics' },
  { icon: '💬', label: 'תגובות', id: 'inbox' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

const SUBTITLES = [
  { text: 'AI לא מחליף אותך. הוא רק עושה לך קיצורי דרך.', from: seconds(3), dur: seconds(3.5) },
  { text: 'נכנסים ל-Social ולוחצים על "Machine / פוסט בקליק".', from: seconds(8), dur: seconds(4) },
  { text: 'בוחרים לקוח או טון דיבור.', from: seconds(14), dur: seconds(3) },
  { text: 'כותבים רעיון בשורה אחת — מספיק.', from: seconds(19), dur: seconds(3) },
  { text: 'לוחצים Generate — ו-AI יוצר תוכן מלא.', from: seconds(24), dur: seconds(3.5) },
  { text: 'עורכים 10 שניות שיהיה אנושי.', from: seconds(29), dur: seconds(3) },
  { text: 'אם תשאירו את זה כמו שזה — כולם יבינו שזה AI. כולל הכלב.', from: seconds(34), dur: seconds(4) },
  { text: 'בוחרים פלטפורמה, תאריך, שעה — ומפרסמים.', from: seconds(40), dur: seconds(4) },
  { text: 'AI מייצר, אתם עושים טאצ׳. בום.', from: seconds(46), dur: seconds(3) },
];

const MachineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const aiGenerating = frame > seconds(10) && frame < seconds(16);
  const aiDone = frame > seconds(16);
  const loadingDots = '.'.repeat(1 + Math.floor((frame % 30) / 10));

  return (
    <AppLayout moduleKey="social" sidebarItems={SOCIAL_SIDEBAR} activeItem="machine" headerTitle="Machine — פוסט בקליק" breadcrumb={['Social', 'Machine']}>
      <div style={{ maxWidth: 700, margin: '0 auto', direction: 'rtl' }}>
        {/* Tone selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          {['מקצועי', 'שיחתי', 'הומוריסטי', 'מעורר השראה'].map((tone, i) => {
            const isActive = i === 1;
            return (
              <div key={i} style={{
                padding: '8px 16px', borderRadius: 12,
                background: isActive ? '#7C3AED08' : '#F8FAFC',
                border: `1px solid ${isActive ? '#7C3AED20' : '#E2E8F0'}`,
                fontFamily: HEEBO, fontSize: 13, fontWeight: isActive ? 800 : 600,
                color: isActive ? '#7C3AED' : '#64748B',
              }}>{tone}</div>
            );
          })}
        </div>

        {/* Idea input */}
        <FormField label="רעיון בשורה אחת" value="טיפ לעסקים קטנים: איך לנהל זמן עם AI" typeDelay={seconds(3)} typingSpeed={2} isFocused={frame > seconds(3) && frame < seconds(9)} />

        {/* Generate button */}
        {frame > seconds(9) && !aiDone && (
          <div style={{
            padding: '14px 24px', borderRadius: 14,
            background: aiGenerating ? '#7C3AED80' : '#7C3AED',
            fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff',
            textAlign: 'center', marginBottom: 16,
            opacity: spring({ frame: Math.max(0, frame - seconds(9)), fps, config: SPRING.punch, durationInFrames: 12 }),
          }}>
            {aiGenerating ? `🧠 AI מייצר${loadingDots}` : '✨ Generate'}
          </div>
        )}

        {/* AI Generated content */}
        {aiDone && (
          <div style={{
            padding: '20px 24px', borderRadius: 20,
            background: 'linear-gradient(135deg, #7C3AED04, #3730A304)',
            border: '1px solid #7C3AED10', marginBottom: 16,
            opacity: spring({ frame: Math.max(0, frame - seconds(16)), fps, config: SPRING.hero, durationInFrames: 20 }),
          }}>
            <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: 900, color: '#7C3AED', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              🧠 תוכן שנוצר ב-AI
            </div>
            <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 600, color: '#1E293B', lineHeight: 1.8 }}>
              💡 טיפ לעסקים קטנים: איך AI חוסך לכם 3 שעות ביום
              {'\n\n'}
              ניהול זמן זה לא רק לוח שנה — זה הבנה מה חשוב באמת.
              {'\n\n'}
              עם MISRAD AI, ה-AI מדרג לידים, מסכם שיחות, ומחלק משימות — אוטומטית.
              {'\n\n'}
              התוצאה? 3 שעות נחסכות. כל יום. 🚀
              {'\n\n'}
              #ניהול_עסק #AI #טיפים_לעסקים
            </div>
          </div>
        )}

        {/* Platform + Schedule */}
        {frame > seconds(22) && (
          <div style={{
            display: 'flex', gap: 12, marginBottom: 16,
            opacity: spring({ frame: Math.max(0, frame - seconds(22)), fps, config: SPRING.ui, durationInFrames: 14 }),
          }}>
            {[
              { icon: '📘', label: 'Facebook', active: true },
              { icon: '📸', label: 'Instagram', active: false },
              { icon: '💼', label: 'LinkedIn', active: true },
            ].map((p, i) => (
              <div key={i} style={{
                flex: 1, padding: '12px', borderRadius: 14, textAlign: 'center',
                background: p.active ? '#7C3AED08' : '#F8FAFC',
                border: `1px solid ${p.active ? '#7C3AED20' : '#E2E8F0'}`,
              }}>
                <div style={{ fontSize: 18 }}>{p.icon}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 12, fontWeight: p.active ? 800 : 600, color: p.active ? '#7C3AED' : '#94A3B8', marginTop: 4 }}>{p.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Publish */}
        {frame > seconds(26) && (
          <div style={{
            padding: '14px 24px', borderRadius: 14, background: '#7C3AED',
            fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            opacity: spring({ frame: Math.max(0, frame - seconds(26)), fps, config: SPRING.punch, durationInFrames: 14 }),
          }}>
            פרסם עכשיו 🚀
          </div>
        )}

        {frame > seconds(30) && (
          <div style={{
            marginTop: 14, padding: '12px 18px', borderRadius: 14,
            background: '#F5F3FF', border: '1px solid #7C3AED20',
            fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#7C3AED', textAlign: 'center',
            opacity: spring({ frame: Math.max(0, frame - seconds(30)), fps, config: SPRING.punch, durationInFrames: 12 }),
          }}>
            ✅ פורסם ב-Facebook + LinkedIn!
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export const SocialPostTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="social" title="איך יוצרים פוסט ב-AI (בקטע טוב, לא ׳רובוטי׳)" subtitle="AI לא מחליף אותך. הוא רק קיצור דרך." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(43)}>
      <ZoomFocus zoomSteps={[
        { startFrame: seconds(3), duration: seconds(6), centerX: 50, centerY: 25, scale: 1.3 },
        { startFrame: seconds(13), duration: seconds(8), centerX: 50, centerY: 45, scale: 1.3 },
        { startFrame: seconds(22), duration: seconds(6), centerX: 50, centerY: 65, scale: 1.3 },
      ]}><MachineScene /></ZoomFocus>
      <CalloutLayer callouts={[
        { text: '📝 כותבים רעיון — שורה אחת מספיקה', x: 55, y: 18, showAt: seconds(3), duration: seconds(5), bgColor: '#7C3AED' },
        { text: '🧠 AI יצר תוכן מלא!', x: 55, y: 35, showAt: seconds(13), duration: seconds(5), bgColor: '#7C3AED' },
        { text: '👆 עורכים טאצ׳ קטן', x: 55, y: 48, showAt: seconds(19), duration: seconds(3), bgColor: '#1E293B' },
        { text: '📘 בוחרים פלטפורמה', x: 40, y: 60, showAt: seconds(22), duration: seconds(4), bgColor: '#7C3AED' },
      ]} />
    </Sequence>
    <Sequence from={seconds(46)} durationInFrames={seconds(14)}><TutorialOutro moduleKey="social" nextTitle="איך מתזמנים פוסט (כדי שלא תפרסמו ב-02:00)" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const SocialPostTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="social" title="איך יוצרים פוסט ב-AI" subtitle="שורה אחת → פוסט מלא." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(43)}><MobileMachineScene /></Sequence>
    <Sequence from={seconds(46)} durationInFrames={seconds(14)}><TutorialOutro moduleKey="social" nextTitle="איך מתזמנים פוסט" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

const MobileMachineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aiDone = frame > seconds(16);
  const aiGenerating = frame > seconds(10) && !aiDone;
  return (
    <AbsoluteFill style={{ background: '#fff', direction: 'rtl' }}>
      <div style={{ height: 60, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>✍️ Machine</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['מקצועי', 'שיחתי', 'הומוריסטי'].map((t, i) => (
            <div key={i} style={{ padding: '6px 14px', borderRadius: 10, background: i === 1 ? '#7C3AED08' : '#F8FAFC', border: `1px solid ${i === 1 ? '#7C3AED20' : '#E2E8F0'}`, fontFamily: HEEBO, fontSize: 12, fontWeight: i === 1 ? 800 : 600, color: i === 1 ? '#7C3AED' : '#64748B' }}>{t}</div>
          ))}
        </div>
        <FormField label="רעיון" value="טיפ לעסקים: AI חוסך זמן" typeDelay={seconds(3)} typingSpeed={3} isFocused={frame > seconds(3) && frame < seconds(9)} />
        {frame > seconds(9) && !aiDone && (
          <div style={{ padding: 14, borderRadius: 14, background: aiGenerating ? '#7C3AED80' : '#7C3AED', fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 14 }}>
            {aiGenerating ? '🧠 מייצר...' : '✨ Generate'}
          </div>
        )}
        {aiDone && (
          <div style={{ padding: 16, borderRadius: 16, background: '#7C3AED04', border: '1px solid #7C3AED10', marginBottom: 14, opacity: spring({ frame: Math.max(0, frame - seconds(16)), fps, config: SPRING.hero, durationInFrames: 18 }) }}>
            <div style={{ fontFamily: HEEBO, fontSize: 11, fontWeight: 900, color: '#7C3AED', marginBottom: 8 }}>🧠 תוכן AI</div>
            <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 600, color: '#1E293B', lineHeight: 1.7 }}>
              💡 טיפ: AI חוסך 3 שעות ביום. מדרג לידים, מסכם שיחות, מחלק משימות. אוטומטית. #AI #עסקים
            </div>
          </div>
        )}
        {frame > seconds(26) && (
          <div style={{ padding: 14, borderRadius: 14, background: '#7C3AED', fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: '#fff', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(26)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
            פרסם 🚀
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
