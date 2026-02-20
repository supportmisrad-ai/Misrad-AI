import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { HEEBO, RUBIK, SPRING } from '../../shared/config';
import { TutorialIntro, TutorialOutro, AppLayout, FormField, StatusBadge, DataTable, HighlightOverlay, CalloutLayer, ZoomFocus, VoiceoverSubtitle } from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

const OPS_SIDEBAR = [
  { icon: '📊', label: 'דשבורד', id: 'dashboard' },
  { icon: '📦', label: 'מלאי', id: 'inventory' },
  { icon: '🔧', label: 'קריאות שירות', id: 'work-orders' },
  { icon: '👷', label: 'קבלנים', id: 'contractors' },
  { icon: '📁', label: 'פרויקטים', id: 'projects' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

const SUBTITLES = [
  { text: 'מלאי זה כמו מקרר. תמיד נגמר דווקא כשצריך.', from: seconds(3), dur: seconds(3.5) },
  { text: 'נכנסים ל-Operations ולוחצים על "מלאי".', from: seconds(8), dur: seconds(3) },
  { text: 'רואים את כל הפריטים — שם, כמות, מיקום.', from: seconds(13), dur: seconds(3.5) },
  { text: 'מחפשים פריט ספציפי? חיפוש מהיר.', from: seconds(18), dur: seconds(3) },
  { text: 'לוחצים על פריט — רואים היסטוריית תנועות.', from: seconds(23), dur: seconds(3.5) },
  { text: 'מעדכנים כניסה או יציאה — תנועה חדשה.', from: seconds(28), dur: seconds(3.5) },
  { text: 'AI מתריע על חוסרים לפני שזה הופך לבעיה.', from: seconds(33), dur: seconds(4) },
  { text: 'תנועה אחת נכונה ביום — והמלאי נשאר שפוי.', from: seconds(39), dur: seconds(3.5) },
];

const ITEMS = [
  { name: 'בורג M8×50', sku: 'BLT-001', qty: 245, min: 50, location: 'מדף A3', status: 'תקין', color: '#22C55E' },
  { name: 'צינור PVC 2"', sku: 'PIP-012', qty: 18, min: 20, location: 'מחסן B', status: 'נמוך!', color: '#EF4444' },
  { name: 'מנוע חשמלי 1.5KW', sku: 'MOT-003', qty: 4, min: 2, location: 'מדף C1', status: 'תקין', color: '#22C55E' },
  { name: 'שסתום 3/4"', sku: 'VLV-007', qty: 32, min: 10, location: 'מדף A1', status: 'תקין', color: '#22C55E' },
  { name: 'כבל חשמלי 2.5mm', sku: 'CBL-015', qty: 8, min: 15, location: 'מחסן B', status: 'נמוך!', color: '#EF4444' },
];

const InventoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppLayout moduleKey="operations" sidebarItems={OPS_SIDEBAR} activeItem="inventory" headerTitle="מלאי" breadcrumb={['Operations', 'מלאי']} actionLabel="פריט חדש">
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'סה"כ פריטים', value: '156', color: '#0EA5E9' },
          { label: 'מלאי נמוך', value: '7', color: '#EF4444' },
          { label: 'תנועות היום', value: '12', color: '#22C55E' },
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
        columns={[{ label: 'פריט' }, { label: 'מק"ט' }, { label: 'כמות' }, { label: 'מיקום' }, { label: 'סטטוס' }]}
        rows={ITEMS.map((item) => [
          <span style={{ fontWeight: 800 }}>{item.name}</span>,
          <span style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{item.sku}</span>,
          <span style={{ fontFamily: RUBIK, fontWeight: 800, color: item.qty <= item.min ? '#EF4444' : '#1E293B' }}>{item.qty}</span>,
          <span style={{ fontSize: 12, color: '#64748B' }}>{item.location}</span>,
          <StatusBadge text={item.status} color={item.color} />,
        ])}
        highlightRow={1}
      />
    </AppLayout>
  );
};

const MovementScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const formSpring = spring({ frame: Math.max(0, frame - 8), fps, config: SPRING.hero, durationInFrames: 20 });

  return (
    <AppLayout moduleKey="operations" sidebarItems={OPS_SIDEBAR} activeItem="inventory" headerTitle="תנועת מלאי" breadcrumb={['Operations', 'מלאי', 'תנועה']}>
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', opacity: formSpring, zIndex: 10 }}>
        <div style={{ width: 500, background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.15)', transform: `translateY(${interpolate(formSpring, [0, 1], [20, 0])}px)`, direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>📦 תנועת מלאי</div>
          <div style={{ padding: '14px 18px', borderRadius: 14, background: '#F0F9FF', border: '1px solid #0EA5E920', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#0EA5E9' }}>צינור PVC 2"</div>
            <StatusBadge text="מלאי נמוך!" color="#EF4444" />
            <span style={{ fontFamily: RUBIK, fontSize: 14, color: '#64748B', marginRight: 'auto' }}>כמות: 18</span>
          </div>
          {/* Movement type */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'כניסה', icon: '📥', active: frame > seconds(3) },
              { label: 'יציאה', icon: '📤', active: false },
            ].map((t, i) => (
              <div key={i} style={{ flex: 1, padding: '12px', borderRadius: 14, textAlign: 'center', background: t.active ? '#0EA5E908' : '#F8FAFC', border: `1px solid ${t.active ? '#0EA5E920' : '#E2E8F0'}` }}>
                <div style={{ fontSize: 18 }}>{t.icon}</div>
                <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: t.active ? 800 : 600, color: t.active ? '#0EA5E9' : '#64748B', marginTop: 4 }}>{t.label}</div>
              </div>
            ))}
          </div>
          <FormField label="כמות" value="30" typeDelay={seconds(5)} typingSpeed={8} isFocused={frame > seconds(5) && frame < seconds(8)} />
          <FormField label="הערה" value="הזמנה מספק #2847" typeDelay={seconds(9)} typingSpeed={3} isFocused={frame > seconds(9) && frame < seconds(14)} />
          {frame > seconds(15) && (
            <div style={{ padding: '14px 24px', borderRadius: 14, background: '#0EA5E9', fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center', boxShadow: '0 4px 16px rgba(14,165,233,0.3)', opacity: spring({ frame: Math.max(0, frame - seconds(15)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
              עדכן מלאי ✅
            </div>
          )}
          {frame > seconds(19) && (
            <div style={{ marginTop: 14, padding: '12px 18px', borderRadius: 14, background: '#F0F9FF', border: '1px solid #0EA5E920', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#0EA5E9', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(19)), fps, config: SPRING.punch, durationInFrames: 12 }) }}>
              📦 יתרה חדשה: 48 · סטטוס: תקין ✅
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AppLayout>
  );
};

export const OperationsInventoryTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="operations" title="איך מנהלים מלאי (כדי שלא תגלו שחסר רק כשמאוחר)" subtitle="מלאי זה כמו מקרר. תמיד נגמר דווקא כשצריך." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(18)}>
      <ZoomFocus zoomSteps={[{ startFrame: seconds(4), duration: seconds(4), centerX: 15, centerY: 30, scale: 1.3 }, { startFrame: seconds(10), duration: seconds(5), centerX: 60, centerY: 35, scale: 1.4 }]}><InventoryScene /></ZoomFocus>
      <CalloutLayer callouts={[{ text: '📦 "מלאי" בתפריט', x: 3, y: 22, showAt: seconds(4), duration: seconds(3), bgColor: '#0EA5E9' }, { text: '⚠️ מלאי נמוך — AI מתריע!', x: 45, y: 25, showAt: seconds(10), duration: seconds(5), bgColor: '#EF4444' }]} />
    </Sequence>
    <Sequence from={seconds(21)} durationInFrames={seconds(22)}>
      <ZoomFocus zoomSteps={[{ startFrame: seconds(3), duration: seconds(5), centerX: 50, centerY: 40, scale: 1.3 }, { startFrame: seconds(14), duration: seconds(5), centerX: 50, centerY: 60, scale: 1.3 }]}><MovementScene /></ZoomFocus>
      <CalloutLayer callouts={[{ text: '📥 בוחרים כניסה/יציאה', x: 55, y: 30, showAt: seconds(3), duration: seconds(4), bgColor: '#0EA5E9' }, { text: '✅ יתרה מתעדכנת', x: 55, y: 55, showAt: seconds(19), duration: seconds(3), bgColor: '#22C55E' }]} />
    </Sequence>
    <Sequence from={seconds(43)} durationInFrames={seconds(12)}><TutorialOutro moduleKey="operations" nextTitle="איך פותחים קריאת שירות" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const OperationsInventoryTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="operations" title="איך מנהלים מלאי" subtitle="תנועה נכונה ביום = מלאי שפוי." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(18)}>
      <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
        <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>מלאי</div>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: '#0EA5E9', fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#fff' }}>+ פריט</div>
        </div>
        <MobileInventoryList />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={seconds(21)} durationInFrames={seconds(22)}><MobileMovement /></Sequence>
    <Sequence from={seconds(43)} durationInFrames={seconds(12)}><TutorialOutro moduleKey="operations" nextTitle="איך פותחים קריאת שירות" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

const MobileInventoryList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ITEMS.slice(0, 4).map((item, i) => {
        const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
        return (
          <div key={i} style={{ padding: 16, borderRadius: 18, background: item.qty <= item.min ? '#FEF2F2' : '#fff', border: `1px solid ${item.qty <= item.min ? '#EF444420' : '#E2E8F0'}`, opacity: s }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{item.name}</span>
              <StatusBadge text={item.status} color={item.color} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{item.sku} · {item.location}</span>
              <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: item.qty <= item.min ? '#EF4444' : '#1E293B' }}>{item.qty} יח׳</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MobileMovement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#fff', direction: 'rtl' }}>
      <div style={{ height: 60, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>📦 תנועת מלאי</div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ padding: '12px 16px', borderRadius: 14, background: '#FEF2F2', border: '1px solid #EF444415', marginBottom: 14 }}>
          <div style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#1E293B' }}>צינור PVC 2" · <span style={{ color: '#EF4444' }}>מלאי נמוך (18)</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {['📥 כניסה', '📤 יציאה'].map((t, i) => (
            <div key={i} style={{ flex: 1, padding: 12, borderRadius: 14, textAlign: 'center', background: i === 0 ? '#0EA5E908' : '#F8FAFC', border: `1px solid ${i === 0 ? '#0EA5E920' : '#E2E8F0'}`, fontFamily: HEEBO, fontSize: 14, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#0EA5E9' : '#64748B' }}>{t}</div>
          ))}
        </div>
        <FormField label="כמות" value="30" typeDelay={seconds(5)} typingSpeed={8} isFocused={frame > seconds(5) && frame < seconds(8)} />
        {frame > seconds(15) && (
          <div style={{ padding: 14, borderRadius: 14, background: '#0EA5E9', fontFamily: HEEBO, fontSize: 15, fontWeight: 900, color: '#fff', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(15)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
            עדכן ✅
          </div>
        )}
        {frame > seconds(19) && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#F0F9FF', border: '1px solid #0EA5E920', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#0EA5E9', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(19)), fps, config: SPRING.punch, durationInFrames: 12 }) }}>
            📦 יתרה: 48 · תקין
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
