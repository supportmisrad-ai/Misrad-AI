import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from 'remotion';
import { HEEBO, RUBIK, SPRING } from '../../shared/config';
import { TutorialIntro, TutorialOutro, AppLayout, FormField, StatusBadge, DataTable, HighlightOverlay, CalloutLayer, ZoomFocus, VoiceoverSubtitle } from '../shared/TutorialComponents';
import { seconds, APP_THEME } from '../shared/tutorial-config';

const FINANCE_SIDEBAR = [
  { icon: '📊', label: 'סקירה', id: 'overview' },
  { icon: '🧾', label: 'חשבוניות', id: 'invoices' },
  { icon: '💸', label: 'גבייה', id: 'collection' },
  { icon: '📑', label: 'הוצאות', id: 'expenses' },
  { icon: '📈', label: 'דוחות', id: 'reports' },
  { icon: '⚙️', label: 'הגדרות', id: 'settings' },
];

const SUBTITLES = [
  { text: 'חשבונית: הדבר שגורם לכסף לזוז.', from: seconds(3), dur: seconds(3) },
  { text: 'נכנסים ל-Finance ולוחצים על "חשבוניות".', from: seconds(8), dur: seconds(3.5) },
  { text: 'רואים את כל החשבוניות — ממוינות לפי תאריך.', from: seconds(13), dur: seconds(3.5) },
  { text: 'לוחצים "+ חשבונית חדשה".', from: seconds(18), dur: seconds(3) },
  { text: 'בוחרים לקוח מהרשימה.', from: seconds(23), dur: seconds(3) },
  { text: 'מוסיפים פריטים — שם, כמות, מחיר.', from: seconds(28), dur: seconds(3.5) },
  { text: 'המערכת מחשבת מע"מ אוטומטית.', from: seconds(33), dur: seconds(3) },
  { text: 'טיפ: לפני שליחה — בדקו שם לקוח ומייל. 2 שניות שחוסכות מבוכה.', from: seconds(38), dur: seconds(4.5) },
  { text: 'מפיקים ושולחים — הלקוח מקבל חשבונית מקצועית.', from: seconds(44), dur: seconds(4) },
  { text: 'שלחתם? יופי. עכשיו אפשר לנשום.', from: seconds(50), dur: seconds(3) },
];

const INVOICES = [
  { number: 'INV-1047', client: 'חברת גולד בע"מ', amount: '₪12,400', status: 'שולם', color: '#22C55E', date: '15.02.26' },
  { number: 'INV-1046', client: 'אורי מזרחי', amount: '₪3,200', status: 'פתוח', color: '#F59E0B', date: '12.02.26' },
  { number: 'INV-1045', client: 'שרה לוי - עיצוב', amount: '₪8,500', status: 'באיחור', color: '#EF4444', date: '01.02.26' },
  { number: 'INV-1044', client: 'משה ישראלי', amount: '₪5,600', status: 'שולם', color: '#22C55E', date: '28.01.26' },
];

const InvoiceListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppLayout moduleKey="finance" sidebarItems={FINANCE_SIDEBAR} activeItem="invoices" headerTitle="חשבוניות" breadcrumb={['Finance', 'חשבוניות']} actionLabel="חשבונית חדשה">
      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'הכנסות החודש', value: '₪47,200', color: '#059669' },
          { label: 'ממתין לגבייה', value: '₪11,700', color: '#F59E0B' },
          { label: 'באיחור', value: '₪8,500', color: '#EF4444' },
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
        columns={[{ label: 'מספר' }, { label: 'לקוח' }, { label: 'סכום' }, { label: 'סטטוס' }, { label: 'תאריך' }]}
        rows={INVOICES.map((inv) => [
          <span style={{ fontFamily: RUBIK, fontSize: 13, fontWeight: 800, color: '#64748B' }}>{inv.number}</span>,
          <span style={{ fontWeight: 800 }}>{inv.client}</span>,
          <span style={{ fontFamily: RUBIK, fontWeight: 800, color: '#059669' }}>{inv.amount}</span>,
          <StatusBadge text={inv.status} color={inv.color} />,
          <span style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{inv.date}</span>,
        ])}
      />
    </AppLayout>
  );
};

const NewInvoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const formSpring = spring({ frame: Math.max(0, frame - 8), fps, config: SPRING.hero, durationInFrames: 20 });
  return (
    <AppLayout moduleKey="finance" sidebarItems={FINANCE_SIDEBAR} activeItem="invoices" headerTitle="חשבונית חדשה" breadcrumb={['Finance', 'חשבוניות', 'חדשה']}>
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', opacity: formSpring, zIndex: 10 }}>
        <div style={{ width: 560, background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.15)', transform: `translateY(${interpolate(formSpring, [0, 1], [20, 0])}px)`, direction: 'rtl' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 22, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>🧾 חשבונית חדשה</div>
          <FormField label="לקוח" value="אורי מזרחי" typeDelay={seconds(2)} typingSpeed={4} isFocused={frame > seconds(2) && frame < seconds(5)} />
          <div style={{ fontFamily: HEEBO, fontSize: 13, fontWeight: 900, color: '#1E293B', marginBottom: 10 }}>פריטים</div>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ flex: 3, fontFamily: HEEBO, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{frame > seconds(8) ? 'ייעוץ עסקי - חודש פברואר' : '...'}</div>
            <div style={{ flex: 1, fontFamily: RUBIK, fontSize: 14, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>{frame > seconds(10) ? '1' : '-'}</div>
            <div style={{ flex: 1, fontFamily: RUBIK, fontSize: 14, fontWeight: 700, color: '#059669', textAlign: 'center' }}>{frame > seconds(12) ? '₪4,500' : '-'}</div>
          </div>
          {frame > seconds(14) && (
            <div style={{ padding: '12px 16px', borderRadius: 14, background: '#ECFDF5', border: '1px solid #059669 20', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#059669' }}>סה"כ כולל מע"מ</span>
              <span style={{ fontFamily: RUBIK, fontSize: 18, fontWeight: 800, color: '#059669' }}>₪5,265</span>
            </div>
          )}
          {frame > seconds(18) && (
            <div style={{ padding: '14px 24px', borderRadius: 14, background: '#059669', fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center', boxShadow: '0 4px 16px rgba(5,150,105,0.3)', opacity: spring({ frame: Math.max(0, frame - seconds(18)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
              הפק ושלח 📧
            </div>
          )}
          {frame > seconds(22) && (
            <div style={{ marginTop: 14, padding: '12px 18px', borderRadius: 14, background: '#ECFDF5', border: '1px solid #059669 20', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#059669', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(22)), fps, config: SPRING.punch, durationInFrames: 12 }) }}>
              ✅ חשבונית INV-1048 נשלחה ללקוח!
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AppLayout>
  );
};

export const FinanceInvoiceTutorialDesktop: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="finance" title="איך מוציאים חשבונית (בלי לשאול את הנה״ח כל פעם)" subtitle="חשבונית: הדבר שגורם לכסף לזוז." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(15)}>
      <ZoomFocus zoomSteps={[{ startFrame: seconds(4), duration: seconds(4), centerX: 15, centerY: 30, scale: 1.3 }, { startFrame: seconds(10), duration: seconds(4), centerX: 85, centerY: 10, scale: 1.5 }]}><InvoiceListScene /></ZoomFocus>
      <CalloutLayer callouts={[{ text: '🧾 "חשבוניות" בתפריט', x: 3, y: 22, showAt: seconds(4), duration: seconds(3), bgColor: '#059669' }, { text: '➕ "+ חשבונית חדשה"', x: 70, y: 10, showAt: seconds(10), duration: seconds(4), bgColor: '#059669' }]} />
    </Sequence>
    <Sequence from={seconds(18)} durationInFrames={seconds(30)}>
      <ZoomFocus zoomSteps={[{ startFrame: seconds(2), duration: seconds(5), centerX: 50, centerY: 35, scale: 1.3 }, { startFrame: seconds(14), duration: seconds(5), centerX: 50, centerY: 55, scale: 1.3 }]}><NewInvoiceScene /></ZoomFocus>
      <CalloutLayer callouts={[{ text: '👤 בוחרים לקוח', x: 55, y: 25, showAt: seconds(2), duration: seconds(3), bgColor: '#1E293B' }, { text: '📦 מוסיפים פריטים', x: 55, y: 40, showAt: seconds(8), duration: seconds(4), bgColor: '#059669' }, { text: '🧮 מע"מ — אוטומטי!', x: 55, y: 55, showAt: seconds(14), duration: seconds(3), bgColor: '#059669' }]} />
    </Sequence>
    <Sequence from={seconds(48)} durationInFrames={seconds(12)}><TutorialOutro moduleKey="finance" nextTitle="איך רואים מי חייב כסף" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

export const FinanceInvoiceTutorialMobile: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={seconds(3)}><TutorialIntro moduleKey="finance" title="איך מוציאים חשבונית" subtitle="קליק אחד, חשבונית בדרך." stepNumber={1} /></Sequence>
    <Sequence from={seconds(3)} durationInFrames={seconds(15)}>
      <AbsoluteFill style={{ background: APP_THEME.bg, direction: 'rtl' }}>
        <div style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>חשבוניות</div>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: '#059669', fontFamily: HEEBO, fontSize: 13, fontWeight: 800, color: '#fff' }}>+ חדשה</div>
        </div>
        <MobileInvoiceList />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={seconds(18)} durationInFrames={seconds(30)}><MobileNewInvoice /></Sequence>
    <Sequence from={seconds(48)} durationInFrames={seconds(12)}><TutorialOutro moduleKey="finance" nextTitle="איך רואים מי חייב כסף" /></Sequence>
    <VoiceoverSubtitle segments={SUBTITLES} />
  </AbsoluteFill>
);

const MobileInvoiceList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {INVOICES.map((inv, i) => {
        const s = spring({ frame: Math.max(0, frame - i * 4), fps, config: SPRING.ui, durationInFrames: 14 });
        return (
          <div key={i} style={{ padding: 16, borderRadius: 18, background: '#fff', border: '1px solid #E2E8F0', opacity: s }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: HEEBO, fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{inv.client}</span>
              <StatusBadge text={inv.status} color={inv.color} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: RUBIK, fontSize: 12, color: '#94A3B8' }}>{inv.number} · {inv.date}</span>
              <span style={{ fontFamily: RUBIK, fontSize: 14, fontWeight: 800, color: '#059669' }}>{inv.amount}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MobileNewInvoice: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#fff', direction: 'rtl' }}>
      <div style={{ height: 60, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
        <div style={{ fontFamily: HEEBO, fontSize: 20, fontWeight: 900, color: '#1E293B' }}>🧾 חשבונית חדשה</div>
      </div>
      <div style={{ padding: 20 }}>
        <FormField label="לקוח" value="אורי מזרחי" typeDelay={seconds(2)} typingSpeed={4} isFocused={frame > seconds(2) && frame < seconds(5)} />
        <FormField label="פריט" value="ייעוץ עסקי - פברואר" typeDelay={seconds(8)} typingSpeed={3} isFocused={frame > seconds(8) && frame < seconds(12)} />
        <FormField label="סכום" value="₪4,500" typeDelay={seconds(13)} typingSpeed={5} isFocused={frame > seconds(13) && frame < seconds(15)} />
        {frame > seconds(14) && (
          <div style={{ padding: '12px 16px', borderRadius: 14, background: '#ECFDF5', border: '1px solid #05966920', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#059669' }}>סה"כ + מע"מ</span>
            <span style={{ fontFamily: RUBIK, fontSize: 16, fontWeight: 800, color: '#059669' }}>₪5,265</span>
          </div>
        )}
        {frame > seconds(18) && (
          <div style={{ padding: 14, borderRadius: 14, background: '#059669', fontFamily: HEEBO, fontSize: 16, fontWeight: 900, color: '#fff', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(18)), fps, config: SPRING.punch, durationInFrames: 14 }) }}>
            הפק ושלח 📧
          </div>
        )}
        {frame > seconds(22) && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#ECFDF5', border: '1px solid #05966920', fontFamily: HEEBO, fontSize: 14, fontWeight: 800, color: '#059669', textAlign: 'center', opacity: spring({ frame: Math.max(0, frame - seconds(22)), fps, config: SPRING.punch, durationInFrames: 12 }) }}>
            ✅ נשלחה!
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
