import { Rocket, Zap, ShieldCheck, Moon } from 'lucide-react';

export const DEFAULT_TESTIMONIALS = [
  {
    name: 'לירון אביב',
    role: 'בעלים, AVIV Digital',
    quote: 'המעבר ל-Social חסך לנו 15 שעות עבודה בשבוע רק על אישורים מול לקוחות. זה פשוט מוצר מטורף.',
    avatar: 'https://i.pravatar.cc/150?u=liron',
  },
  {
    name: 'יונתן לוי',
    role: 'מנהל קריאייטיב, Blue Ocean',
    quote: 'ה-DNA של ה-AI כל כך מדויק שהלקוחות שלי בטוחים שאני כותב כל מילה בעצמי. מומלץ בחום.',
    avatar: 'https://i.pravatar.cc/150?u=yonatan',
  },
  {
    name: 'מיכל כהן',
    role: 'פרילנסרית סושיאל',
    quote: 'הגבייה האוטומטית שינתה לי את החיים. אני כבר לא צריכה לרדוף אחרי כסף, המערכת עושה את זה בשבילי.',
    avatar: 'https://i.pravatar.cc/150?u=michal',
  },
];

export const DEFAULT_FEATURES = [
  {
    title: 'הקמת לקוח ב-60 שניות',
    desc: 'שלחו לינק וואטסאפ ללקוח, והוא כבר יזין הכל: לוגו, DNA, פרטי תשלום וגישה לרשתות.',
    icon: Rocket,
    color: 'bg-blue-600',
  },
  {
    title: 'The Machine ✨',
    desc: 'Gemini 3 בונה עבורכם פוסטים בטון המדויק של המותג. מכירתי, מצחיק או רשמי - בלחיצת כפתור.',
    icon: Zap,
    color: 'bg-purple-600',
  },
  {
    title: 'גבייה ללא מגע אדם',
    desc: 'תזכורות אוטומטיות, חסימת גישה לפורטל בפיגור וסנכרון מלא מול מורנינג/חשבונית ירוקה.',
    icon: ShieldCheck,
    color: 'bg-red-600',
  },
  {
    title: 'מצב שבת אוטומטי',
    desc: 'המערכת שומרת שבת בשבילך - חוסמת את עצמה אוטומטית מרגע הדלקת נרות ועד צאת הכוכבים. ללא צורך בהתערבות ידנית.',
    icon: Moon,
    color: 'bg-indigo-600',
  },
];

export const ICON_MAP: Record<string, any> = {
  Rocket,
  Zap,
  ShieldCheck,
};
