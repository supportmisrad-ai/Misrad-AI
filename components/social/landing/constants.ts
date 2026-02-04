import { Rocket, Zap, ShieldCheck, Moon } from 'lucide-react';

export const DEFAULT_TESTIMONIALS: Array<{
  name: string;
  role: string;
  quote: string;
  avatar?: string;
}> = [];
// הסרנו את עדויות הדמו - יתמלאו ע"י המנהל דרך פאנל האדמין

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
