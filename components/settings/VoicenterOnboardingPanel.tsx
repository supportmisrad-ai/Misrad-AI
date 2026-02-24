'use client';

import React, { useState } from 'react';
import {
    Phone,
    Shield,
    CheckCircle2,
    ArrowLeft,
    Building2,
    Users,
    Globe,
    Zap,
    Clock,
    HeadphonesIcon,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Sparkles,
    BadgeCheck,
    Server,
    CreditCard,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    details: string[];
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

// ─── Data ───────────────────────────────────────────────────────────

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 1,
        title: 'הרשמה דרך MISRAD AI',
        description: 'הלקוח ממלא טופס קצר ואנחנו מעבירים את הבקשה ל-Voicenter',
        details: [
            'שם העסק, מספר עובדים, מספר טלפון קיים',
            'בחירת חבילה (מספר שלוחות, מספרים)',
            'פרטי איש קשר לתיאום',
            'הכל דרך ממשק MISRAD AI — ללא צורך לפנות ל-Voicenter ישירות',
        ],
        icon: Building2,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
    },
    {
        id: 2,
        title: 'פתיחת חשבון Voicenter',
        description: 'Voicenter פותחת חשבון חדש ומספקת קרדנשיאלס',
        details: [
            'Voicenter יוצרת Organization ו-UserCode ייעודיים',
            'הקצאת מספרי טלפון (חדשים או ניוד קיימים)',
            'הגדרת שלוחות, IVR ותורים',
            'התהליך לוקח 1-3 ימי עסקים',
        ],
        icon: Server,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    {
        id: 3,
        title: 'הגדרה אוטומטית ב-MISRAD AI',
        description: 'מזינים את הקרדנשיאלס ומתחילים לעבוד',
        details: [
            'הלקוח מקבל UserCode + OrganizationCode',
            'מזין בהגדרות → טלפוניה במערכת',
            'החייגן המובנה מתחבר אוטומטית',
            'שיחות יוצאות, הקלטות ותיעוד — מיידי',
        ],
        icon: Zap,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
    },
];

const PACKAGES = [
    {
        name: 'בסיסי',
        subtitle: 'לעסקים קטנים',
        extensions: '1-5 שלוחות',
        numbers: '1 מספר',
        price: '~₪99/חודש',
        features: ['מרכזייה בענן', 'הקלטות שיחות', 'IVR בסיסי', 'חייגן ב-MISRAD AI'],
        recommended: false,
    },
    {
        name: 'עסקי',
        subtitle: 'לצוותי מכירות',
        extensions: '5-20 שלוחות',
        numbers: '2-3 מספרים',
        price: '~₪249/חודש',
        features: ['כל הבסיסי +', 'ניתוב חכם (ACD)', 'תורים מתקדמים', 'דוחות בזמן אמת', 'אינטגרציית CRM'],
        recommended: true,
    },
    {
        name: 'ארגוני',
        subtitle: 'למוקדים גדולים',
        extensions: '20+ שלוחות',
        numbers: 'ללא הגבלה',
        price: 'מותאם אישית',
        features: ['כל העסקי +', 'מספר אתרים', 'API מלא', 'SLA מובטח', 'מנהל לקוח ייעודי'],
        recommended: false,
    },
];

const ADVANTAGES = [
    { icon: Clock, title: 'חיסכון בזמן', desc: 'ללא צורך בפנייה ישירה ל-Voicenter — הכל דרך ממשק אחד' },
    { icon: HeadphonesIcon, title: 'תמיכה בעברית', desc: 'ליווי אישי בכל שלב, מהרשמה ועד הפעלה' },
    { icon: Zap, title: 'אינטגרציה מובנית', desc: 'החייגן מוכן מראש ב-MISRAD AI — אפס הגדרות טכניות' },
    { icon: Shield, title: 'אבטחה מקסימלית', desc: 'הקרדנשיאלס מאוחסנים מוצפנים, מבודדים לכל tenant' },
];

// ─── Component ──────────────────────────────────────────────────────

export const VoicenterOnboardingPanel: React.FC<{
    onBackAction?: () => void;
}> = ({ onBackAction }) => {
    const [expandedStep, setExpandedStep] = useState<number | null>(1);
    const [formData, setFormData] = useState({
        businessName: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        employeeCount: '',
        currentProvider: '',
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.businessName || !formData.contactName || !formData.contactPhone) return;

        setIsSubmitting(true);
        // Simulate submission — in production this would send to an API or email
        await new Promise((r) => setTimeout(r, 1500));
        setIsSubmitted(true);
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4">
                {onBackAction && (
                    <button
                        onClick={onBackAction}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors mt-1"
                    >
                        <ArrowLeft size={18} className="text-slate-600" />
                    </button>
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl border border-rose-200 shadow-sm">
                            <Phone size={24} className="text-rose-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">מרכזיית ענן Voicenter</h1>
                            <p className="text-sm text-slate-500 font-medium">הפעל מרכזייה מקצועית דרך MISRAD AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">Authorized Partner</span>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">Reseller Program</span>
                    </div>
                </div>
            </div>

            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <BadgeCheck size={20} className="text-rose-400" />
                        <span className="text-xs font-bold text-rose-300 uppercase tracking-widest">Powered by Voicenter</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black mb-3">מרכזיית ענן מקצועית,<br />ישירות מתוך MISRAD AI</h2>
                    <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
                        חייג ללידים, הקלט שיחות, נהל תורים ושלוחות — הכל דרך המערכת שלך.
                        בתור שותפי Voicenter, אנחנו מטפלים בכל תהליך ההרשמה והחיבור בשבילך.
                    </p>
                </div>
            </div>

            {/* Advantages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ADVANTAGES.map((adv) => (
                    <div key={adv.title} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all group">
                        <adv.icon size={20} className="text-rose-600 mb-3 group-hover:scale-110 transition-transform" />
                        <h4 className="font-bold text-slate-900 text-sm mb-1">{adv.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{adv.desc}</p>
                    </div>
                ))}
            </div>

            {/* Onboarding Steps */}
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    איך זה עובד?
                </h3>
                <div className="space-y-3">
                    {ONBOARDING_STEPS.map((step) => {
                        const isExpanded = expandedStep === step.id;
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.id}
                                className={`border rounded-2xl overflow-hidden transition-all ${
                                    isExpanded ? 'border-slate-300 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                                    className="w-full flex items-center gap-4 p-5 bg-white hover:bg-slate-50/50 transition-colors"
                                >
                                    <div className={`w-12 h-12 rounded-2xl ${step.bgColor} border flex items-center justify-center shrink-0`}>
                                        <Icon size={22} className={step.color} />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-slate-400">שלב {step.id}</span>
                                        </div>
                                        <div className="font-bold text-slate-900 text-sm">{step.title}</div>
                                        <div className="text-xs text-slate-500">{step.description}</div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 bg-slate-50/30">
                                        <ul className="space-y-2">
                                            {step.details.map((detail, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                    <CheckCircle2 size={16} className={`${step.color} shrink-0 mt-0.5`} />
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Packages */}
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-600" />
                    חבילות Voicenter
                </h3>
                <p className="text-xs text-slate-500 mb-4">המחירים הם הערכה — המחיר הסופי נקבע בהתאם לצרכים של כל ארגון.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PACKAGES.map((pkg) => (
                        <div
                            key={pkg.name}
                            className={`rounded-2xl border p-6 transition-all hover:shadow-lg ${
                                pkg.recommended
                                    ? 'border-rose-300 bg-gradient-to-b from-rose-50/50 to-white shadow-md ring-1 ring-rose-100'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            {pkg.recommended && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 mb-3 inline-block">
                                    מומלץ
                                </span>
                            )}
                            <h4 className="font-black text-slate-900 text-lg">{pkg.name}</h4>
                            <p className="text-xs text-slate-500 mb-2">{pkg.subtitle}</p>
                            <div className="text-2xl font-black text-slate-900 mb-1">{pkg.price}</div>
                            <div className="text-xs text-slate-400 mb-4">{pkg.extensions} • {pkg.numbers}</div>
                            <ul className="space-y-1.5">
                                {pkg.features.map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Onboarding Form */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-l from-rose-50 to-white p-6 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Users size={20} className="text-rose-600" />
                        הגשת בקשה להפעלת מרכזייה
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">מלא את הפרטים ונחזור אליך תוך יום עסקים אחד</p>
                </div>

                {isSubmitted ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <CheckCircle2 size={32} className="text-emerald-600" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">הבקשה נשלחה בהצלחה!</h4>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            ניצור איתך קשר תוך יום עסקים אחד לתיאום הפעלת המרכזייה.
                            בינתיים, תוכל להמשיך לעבוד עם כל הפיצ׳רים האחרים ב-MISRAD AI.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">שם העסק *</label>
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => setFormData((p) => ({ ...p, businessName: e.target.value }))}
                                    placeholder="שם החברה / העסק"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">איש קשר *</label>
                                <input
                                    type="text"
                                    value={formData.contactName}
                                    onChange={(e) => setFormData((p) => ({ ...p, contactName: e.target.value }))}
                                    placeholder="שם מלא"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">טלפון *</label>
                                <input
                                    type="tel"
                                    value={formData.contactPhone}
                                    onChange={(e) => setFormData((p) => ({ ...p, contactPhone: e.target.value }))}
                                    placeholder="050-0000000"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white font-mono"
                                    dir="ltr"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">אימייל</label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData((p) => ({ ...p, contactEmail: e.target.value }))}
                                    placeholder="email@company.com"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white font-mono"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">מספר עובדים (שלוחות)</label>
                                <select
                                    value={formData.employeeCount}
                                    onChange={(e) => setFormData((p) => ({ ...p, employeeCount: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                                >
                                    <option value="">בחר...</option>
                                    <option value="1-5">1-5</option>
                                    <option value="6-20">6-20</option>
                                    <option value="21-50">21-50</option>
                                    <option value="50+">50+</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">ספק טלפוניה נוכחי</label>
                                <input
                                    type="text"
                                    value={formData.currentProvider}
                                    onChange={(e) => setFormData((p) => ({ ...p, currentProvider: e.target.value }))}
                                    placeholder="בזק, סלקום, ללא..."
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">הערות נוספות</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                                placeholder="דרישות מיוחדות, ניוד מספרים, IVR מותאם..."
                                rows={3}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.businessName || !formData.contactName || !formData.contactPhone}
                            className="w-full bg-gradient-to-l from-rose-600 to-rose-700 text-white py-4 rounded-2xl font-black text-sm hover:from-rose-700 hover:to-rose-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">שולח...</span>
                            ) : (
                                <>
                                    <Phone size={18} />
                                    שלח בקשה להפעלת מרכזייה
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Footer Info */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start gap-3">
                    <Globe size={20} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm mb-2">למידע נוסף על Voicenter</h4>
                        <p className="text-xs text-slate-500 mb-3">
                            Voicenter היא חברת טלקום ישראלית מובילה המספקת פתרונות מרכזייה בענן לארגונים בכל הגדלים.
                            מעל 15 שנות ניסיון, אלפי לקוחות, ותשתית יציבה ואמינה.
                        </p>
                        <a
                            href="https://www.voicenter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline"
                        >
                            <ExternalLink size={12} />
                            www.voicenter.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoicenterOnboardingPanel;
