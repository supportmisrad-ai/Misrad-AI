'use client';

import React, { useState } from 'react';
import {
    Phone,
    Shield,
    CheckCircle2,
    Building2,
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
    FileText,
    Mail,
    AlertTriangle,
    ArrowLeft,
    Globe,
    Lock,
    Headphones,
    PhoneCall,
    Mic,
    BarChart3,
    Settings,
    Users,
    Receipt,
    CircleDollarSign,
    Info,
    Send,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface TelephonyRequestForm {
    businessName: string;
    businessId: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    employeeCount: string;
    currentProvider: string;
    selectedPackage: string;
    portNumbers: boolean;
    portNumbersList: string;
    billingCycle: 'monthly' | 'annual';
    agreeTerms: boolean;
    notes: string;
}

// ─── Data ───────────────────────────────────────────────────────────

const PACKAGES = [
    {
        id: 'basic',
        name: 'בסיסי',
        subtitle: 'לעסקים קטנים',
        extensions: '1-5 שלוחות',
        numbers: '1 מספר',
        monthlyPrice: 99,
        annualPrice: 79,
        setupFee: 0,
        features: [
            'מרכזייה בענן מלאה',
            'הקלטות שיחות (30 יום)',
            'IVR בסיסי (תפריט קולי)',
            'חייגן מובנה ב-MISRAD AI',
            'דוחות שיחות בסיסיים',
            'תמיכה טכנית בעברית',
        ],
        recommended: false,
        color: 'slate',
    },
    {
        id: 'business',
        name: 'עסקי',
        subtitle: 'לצוותי מכירות',
        extensions: '5-20 שלוחות',
        numbers: '2-3 מספרים',
        monthlyPrice: 249,
        annualPrice: 199,
        setupFee: 0,
        features: [
            'כל הבסיסי +',
            'ניתוב חכם (ACD)',
            'תורים מתקדמים',
            'דוחות בזמן אמת',
            'אינטגרציית CRM מובנית',
            'הקלטות ללא הגבלה',
            'IVR רב-שלבי',
            'ליווי הטמעה אישי',
        ],
        recommended: true,
        color: 'rose',
    },
    {
        id: 'enterprise',
        name: 'ארגוני',
        subtitle: 'למוקדים גדולים',
        extensions: '20+ שלוחות',
        numbers: 'ללא הגבלה',
        monthlyPrice: 0,
        annualPrice: 0,
        setupFee: 0,
        features: [
            'כל העסקי +',
            'מספר אתרים/סניפים',
            'API מלא',
            'SLA מובטח (99.9%)',
            'מנהל לקוח ייעודי',
            'התאמות בהזמנה',
            'הדרכה צוותית',
            'גיבוי מתקדם',
        ],
        recommended: false,
        color: 'indigo',
    },
];

const PROCESS_STEPS = [
    {
        step: 1,
        title: 'הגשת בקשה',
        description: 'ממלאים את הטופס עם פרטי העסק ובוחרים חבילה מתאימה',
        details: [
            'פרטי העסק ואיש הקשר',
            'בחירת חבילה ומספר שלוחות',
            'ציון אם יש צורך בניוד מספרים קיימים',
            'הגשת הבקשה מיידית — ללא התחייבות',
        ],
        icon: FileText,
        duration: '2 דקות',
    },
    {
        step: 2,
        title: 'אישור ותיאום',
        description: 'נחזור אליכם תוך יום עסקים עם הצעת מחיר סופית ותנאים',
        details: [
            'בדיקת התאמה ואישור הבקשה',
            'הצעת מחיר מפורטת במייל',
            'חתימה דיגיטלית על הסכם שירות',
            'תיאום מועד הפעלה',
        ],
        icon: Mail,
        duration: '1 יום עסקים',
    },
    {
        step: 3,
        title: 'הקמה והגדרה',
        description: 'Voicenter מקימה את המרכזייה ואנחנו מגדירים את החיבור ב-MISRAD AI',
        details: [
            'פתיחת חשבון Voicenter',
            'הקצאת מספרי טלפון',
            'הגדרת שלוחות, IVR ותורים',
            'חיבור אוטומטי לחייגן ב-MISRAD AI',
        ],
        icon: Server,
        duration: '1-3 ימי עסקים',
    },
    {
        step: 4,
        title: 'הפעלה ובדיקות',
        description: 'המרכזייה פעילה — מבצעים בדיקות ומוודאים שהכל עובד מושלם',
        details: [
            'בדיקת שיחות נכנסות ויוצאות',
            'אימות הקלטות',
            'בדיקת ניתוב ותורים',
            'הדרכה קצרה לצוות (אם נדרש)',
        ],
        icon: PhoneCall,
        duration: 'שעה',
    },
];

const INCLUDED_FEATURES = [
    { icon: PhoneCall, title: 'שיחות יוצאות ונכנסות', desc: 'דרך החייגן המובנה ב-MISRAD AI' },
    { icon: Mic, title: 'הקלטות שיחות', desc: 'שמירה אוטומטית עם חיפוש ושמיעה' },
    { icon: BarChart3, title: 'דוחות ואנליטיקות', desc: 'סטטיסטיקות שיחות בזמן אמת' },
    { icon: Settings, title: 'IVR / תפריט קולי', desc: 'ניתוב אוטומטי עם הקלטות מותאמות' },
    { icon: Users, title: 'ניהול שלוחות', desc: 'הוספה, שינוי ומחיקה של שלוחות' },
    { icon: Shield, title: 'אבטחה מקסימלית', desc: 'הצפנה מקצה לקצה, מבודד לכל tenant' },
];

const FAQ_ITEMS = [
    {
        q: 'האם אני חייב להחליף ספק טלפוניה קיים?',
        a: 'לא. ניתן לנייד מספרים קיימים ל-Voicenter או להשתמש במספרים חדשים במקביל לספק הנוכחי. אנחנו מלווים את תהליך הניוד מא\' עד ת\'.',
    },
    {
        q: 'כמה זמן לוקחת ההתקנה?',
        a: 'ברוב המקרים, המרכזייה פעילה תוך 1-3 ימי עסקים מרגע האישור. ניוד מספרים עשוי לקחת עד 5 ימי עסקים נוספים (תלוי בספק הקיים).',
    },
    {
        q: 'מה ההבדל בין לפנות ישירות ל-Voicenter לבין דרככם?',
        a: 'דרכנו אתם מקבלים: אינטגרציה מובנית לחייגן ב-MISRAD AI, ליווי בעברית, הגדרה אוטומטית, ומחיר שווה או טוב יותר. כל שאר הפונקציונליות זהה — אנחנו שותף רשמי.',
    },
    {
        q: 'מה קורה אם אני רוצה לבטל?',
        a: 'ניתן לבטל בכל עת עם הודעה מראש של 30 יום. אין דמי ביטול. המספרים שלכם יישארו שלכם ותוכלו לנייד אותם חזרה.',
    },
    {
        q: 'איך מתבצע החיוב?',
        a: 'חיוב חודשי אוטומטי בכרטיס אשראי או הוראת קבע. חשבונית מס נשלחת אוטומטית מדי חודש. תשלום שנתי מקנה הנחה של ~20%.',
    },
    {
        q: 'האם יש תמיכה טכנית?',
        a: 'כן. תמיכה טכנית בעברית דרך MISRAD AI, בנוסף לתמיכה הישירה של Voicenter. זמני מענה: עד 4 שעות בימי עסקים.',
    },
];

// ─── Component ──────────────────────────────────────────────────────

export const VoicenterClientInfoPage: React.FC<{
    onBackAction?: () => void;
    isEmbedded?: boolean;
}> = ({ onBackAction, isEmbedded = false }) => {
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [expandedStep, setExpandedStep] = useState<number | null>(1);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [selectedPackage, setSelectedPackage] = useState<string>('business');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [formData, setFormData] = useState<TelephonyRequestForm>({
        businessName: '',
        businessId: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        employeeCount: '',
        currentProvider: '',
        selectedPackage: 'business',
        portNumbers: false,
        portNumbersList: '',
        billingCycle: 'monthly',
        agreeTerms: false,
        notes: '',
    });

    const updateForm = (field: keyof TelephonyRequestForm, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.businessName || !formData.contactName || !formData.contactPhone || !formData.contactEmail || !formData.agreeTerms) {
            setSubmitError('נא למלא את כל השדות הנדרשים ולאשר את התנאים');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const response = await fetch('/api/telephony/onboarding-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    selectedPackage,
                    billingCycle,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'שגיאה בשליחת הבקשה');
            }

            setIsSubmitted(true);
        } catch (err: unknown) {
            setSubmitError(err instanceof Error ? err.message : 'שגיאה בשליחת הבקשה. נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedPkg = PACKAGES.find((p) => p.id === selectedPackage);

    return (
        <div className={`space-y-10 ${isEmbedded ? '' : 'max-w-5xl mx-auto px-4 py-8'}`}>
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
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">מרכזיית ענן לעסק שלך</h1>
                            <p className="text-sm text-slate-500 font-medium">Powered by Voicenter · דרך MISRAD AI</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">שותף רשמי</span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">ללא התחייבות</span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">ניוד מספרים חינם</span>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <BadgeCheck size={18} className="text-rose-400" />
                        <span className="text-[10px] font-black text-rose-300 uppercase tracking-[0.15em]">Authorized Voicenter Partner</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black mb-4 leading-snug">
                        מרכזייה מקצועית בענן,<br />משולבת ישירות ב-MISRAD AI
                    </h2>
                    <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed mb-6">
                        חייג ללידים, הקלט שיחות, נהל תורים ושלוחות — הכל מתוך המערכת שלך.
                        אנחנו שותפים רשמיים של Voicenter ומטפלים בכל תהליך ההרשמה, ההגדרה וההפעלה בשבילך.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                            <Clock size={16} className="text-emerald-400" />
                            <span className="text-sm font-bold">הפעלה תוך 1-3 ימים</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                            <Lock size={16} className="text-amber-400" />
                            <span className="text-sm font-bold">ללא התחייבות</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                            <Headphones size={16} className="text-blue-400" />
                            <span className="text-sm font-bold">תמיכה בעברית</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* What's Included */}
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    מה כלול בשירות?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {INCLUDED_FEATURES.map((f) => (
                        <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all group">
                            <f.icon size={20} className="text-rose-600 mb-3 group-hover:scale-110 transition-transform" />
                            <h4 className="font-bold text-slate-900 text-sm mb-1">{f.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pricing */}
            <div id="pricing">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <CreditCard size={18} className="text-blue-600" />
                        מחירון ותכניות
                    </h3>
                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            חודשי
                        </button>
                        <button
                            onClick={() => setBillingCycle('annual')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            שנתי <span className="text-emerald-600 mr-1">חסכון 20%</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {PACKAGES.map((pkg) => {
                        const price = billingCycle === 'monthly' ? pkg.monthlyPrice : pkg.annualPrice;
                        const isSelected = selectedPackage === pkg.id;
                        const isCustom = pkg.monthlyPrice === 0;

                        return (
                            <button
                                key={pkg.id}
                                type="button"
                                onClick={() => {
                                    setSelectedPackage(pkg.id);
                                    updateForm('selectedPackage', pkg.id);
                                }}
                                className={`text-right rounded-2xl border p-6 transition-all hover:shadow-lg ${
                                    isSelected
                                        ? 'border-rose-400 bg-gradient-to-b from-rose-50/50 to-white shadow-lg ring-2 ring-rose-200'
                                        : pkg.recommended
                                        ? 'border-rose-200 bg-white'
                                        : 'border-slate-200 bg-white'
                                }`}
                            >
                                {pkg.recommended && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 mb-3 inline-block">
                                        מומלץ
                                    </span>
                                )}
                                {isSelected && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mb-3 inline-block mr-2">
                                        נבחר ✓
                                    </span>
                                )}
                                <h4 className="font-black text-slate-900 text-lg">{pkg.name}</h4>
                                <p className="text-xs text-slate-500 mb-3">{pkg.subtitle}</p>
                                {isCustom ? (
                                    <div className="text-xl font-black text-slate-900 mb-1">מותאם אישית</div>
                                ) : (
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-3xl font-black text-slate-900">₪{price}</span>
                                        <span className="text-sm text-slate-400">/חודש</span>
                                    </div>
                                )}
                                <div className="text-xs text-slate-400 mb-4">{pkg.extensions} · {pkg.numbers}</div>
                                {pkg.setupFee > 0 && (
                                    <div className="text-xs text-amber-600 font-bold mb-3">דמי הקמה: ₪{pkg.setupFee} (חד-פעמי)</div>
                                )}
                                <ul className="space-y-1.5">
                                    {pkg.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                        <strong>שימו לב:</strong> המחירים המוצגים הם מחירי בסיס משוערים. המחיר הסופי נקבע בהתאם לצרכים הספציפיים שלכם ויאושר
                        בהצעת מחיר מפורטת לפני החיוב. כל המחירים כוללים מע&quot;מ.
                    </div>
                </div>
            </div>

            {/* Process Steps */}
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                    <Zap size={18} className="text-blue-600" />
                    איך התהליך עובד?
                </h3>
                <div className="space-y-3">
                    {PROCESS_STEPS.map((step) => {
                        const isExpanded = expandedStep === step.step;
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.step}
                                className={`border rounded-2xl overflow-hidden transition-all ${
                                    isExpanded ? 'border-slate-300 shadow-lg' : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                                    className="w-full flex items-center gap-4 p-5 bg-white hover:bg-slate-50/50 transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border flex items-center justify-center shrink-0">
                                        <Icon size={22} className="text-slate-600" />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">שלב {step.step}</span>
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{step.duration}</span>
                                        </div>
                                        <div className="font-bold text-slate-900 text-sm mt-0.5">{step.title}</div>
                                        <div className="text-xs text-slate-500">{step.description}</div>
                                    </div>
                                    {isExpanded ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 bg-slate-50/30">
                                        <ul className="space-y-2">
                                            {step.details.map((detail, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
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

            {/* Billing & Terms Info */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-200 p-6 md:p-8">
                <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                    <Receipt size={18} className="text-emerald-600" />
                    חיוב ותנאים
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CircleDollarSign size={18} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-sm text-slate-900">אמצעי תשלום</h5>
                                <p className="text-xs text-slate-500">כרטיס אשראי / הוראת קבע. חשבונית מס אוטומטית מדי חודש.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Clock size={18} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-sm text-slate-900">תקופת חיוב</h5>
                                <p className="text-xs text-slate-500">חודשי (חיוב ב-1 לכל חודש) או שנתי (חיוב חד-פעמי עם הנחה של 20%).</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Shield size={18} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-sm text-slate-900">ללא התחייבות</h5>
                                <p className="text-xs text-slate-500">ביטול בכל עת עם הודעה של 30 יום. ללא דמי ביטול. המספרים נשארים שלכם.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <FileText size={18} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-sm text-slate-900">הסכם שירות</h5>
                                <p className="text-xs text-slate-500">לאחר אישור הבקשה, תקבלו הסכם שירות דיגיטלי לחתימה עם כל הפרטים.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Globe size={18} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-sm text-slate-900">ניוד מספרים</h5>
                                <p className="text-xs text-slate-500">ניוד מספרים קיימים מכל ספק ישראלי — חינם וללא הפסקת שירות.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <HeadphonesIcon size={18} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <h5 className="font-bold text-sm text-slate-900">תמיכה</h5>
                                <p className="text-xs text-slate-500">תמיכה טכנית בעברית. זמן מענה: עד 4 שעות בימי עסקים. חירום — מיידי.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Form */}
            <div id="request-form" className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-l from-rose-50 to-white p-6 md:p-8 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Send size={20} className="text-rose-600" />
                        הגשת בקשה להפעלת מרכזייה
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        מלאו את הפרטים ונחזור אליכם תוך יום עסקים אחד עם הצעת מחיר סופית
                    </p>
                </div>

                {isSubmitted ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-emerald-200">
                            <CheckCircle2 size={40} className="text-emerald-600" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 mb-3">הבקשה נשלחה בהצלחה!</h4>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                            ניצור איתכם קשר תוך יום עסקים אחד לתיאום הפעלת המרכזייה.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                            <div className="flex items-center gap-2 justify-center text-blue-700">
                                <Mail size={16} />
                                <span className="text-sm font-bold">מייל אישור נשלח לכתובת {formData.contactEmail}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                        {submitError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-red-700">{submitError}</span>
                            </div>
                        )}

                        {/* Selected Package Summary */}
                        {selectedPkg && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-500">חבילה נבחרת:</span>
                                    <span className="font-black text-slate-900 mr-2">{selectedPkg.name}</span>
                                    <span className="text-xs text-slate-400">({selectedPkg.extensions})</span>
                                </div>
                                <div className="font-black text-slate-900">
                                    {selectedPkg.monthlyPrice === 0 ? 'מותאם אישית' : `₪${billingCycle === 'monthly' ? selectedPkg.monthlyPrice : selectedPkg.annualPrice}/חודש`}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">שם העסק *</label>
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => updateForm('businessName', e.target.value)}
                                    placeholder="שם החברה / העסק"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">ח.פ. / ע.מ.</label>
                                <input
                                    type="text"
                                    value={formData.businessId}
                                    onChange={(e) => updateForm('businessId', e.target.value)}
                                    placeholder="מספר חברה או עוסק מורשה"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white font-mono"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">איש קשר *</label>
                                <input
                                    type="text"
                                    value={formData.contactName}
                                    onChange={(e) => updateForm('contactName', e.target.value)}
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
                                    onChange={(e) => updateForm('contactPhone', e.target.value)}
                                    placeholder="050-0000000"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white font-mono"
                                    dir="ltr"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">אימייל *</label>
                                <input
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => updateForm('contactEmail', e.target.value)}
                                    placeholder="email@company.com"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white font-mono"
                                    dir="ltr"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">מספר עובדים / שלוחות</label>
                                <select
                                    value={formData.employeeCount}
                                    onChange={(e) => updateForm('employeeCount', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                                >
                                    <option value="">בחר...</option>
                                    <option value="1-5">1-5</option>
                                    <option value="6-10">6-10</option>
                                    <option value="11-20">11-20</option>
                                    <option value="21-50">21-50</option>
                                    <option value="50+">50+</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">ספק טלפוניה נוכחי</label>
                            <input
                                type="text"
                                value={formData.currentProvider}
                                onChange={(e) => updateForm('currentProvider', e.target.value)}
                                placeholder="בזק, סלקום, פרטנר, HOT, אין..."
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white"
                            />
                        </div>

                        {/* Number Porting */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.portNumbers}
                                    onChange={(e) => updateForm('portNumbers', e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                />
                                <div>
                                    <span className="text-sm font-bold text-slate-900">אני רוצה לנייד מספרי טלפון קיימים</span>
                                    <p className="text-xs text-slate-500">ניוד מספרים חינם — ללא הפסקת שירות</p>
                                </div>
                            </label>
                            {formData.portNumbers && (
                                <div className="mt-3">
                                    <input
                                        type="text"
                                        value={formData.portNumbersList}
                                        onChange={(e) => updateForm('portNumbersList', e.target.value)}
                                        placeholder="רשום את המספרים לניוד (מופרדים בפסיק)"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white font-mono"
                                        dir="ltr"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">הערות נוספות</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => updateForm('notes', e.target.value)}
                                placeholder="דרישות מיוחדות, IVR מותאם, שעות פעילות..."
                                rows={3}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white resize-none"
                            />
                        </div>

                        {/* Terms */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.agreeTerms}
                                    onChange={(e) => updateForm('agreeTerms', e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5"
                                />
                                <div className="text-xs text-slate-600 leading-relaxed">
                                    אני מאשר/ת שקראתי והבנתי את תנאי השירות. הגשת הבקשה אינה מהווה התחייבות — החיוב יתחיל רק לאחר
                                    אישור הצעת המחיר וחתימה על הסכם שירות. ידוע לי שניתן לבטל בכל עת עם הודעה של 30 יום.
                                </div>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.agreeTerms}
                            className="w-full bg-gradient-to-l from-rose-600 to-rose-700 text-white py-4 rounded-2xl font-black text-sm hover:from-rose-700 hover:to-rose-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">שולח בקשה...</span>
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

            {/* FAQ */}
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                    <Info size={18} className="text-indigo-600" />
                    שאלות נפוצות
                </h3>
                <div className="space-y-2">
                    {FAQ_ITEMS.map((faq, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <span className="font-bold text-sm text-slate-900 text-right">{faq.q}</span>
                                {expandedFaq === idx ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                            </button>
                            {expandedFaq === idx && (
                                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex items-start gap-3">
                <Globe size={20} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2">למידע נוסף</h4>
                    <p className="text-xs text-slate-500 mb-3">
                        Voicenter — חברת טלקום ישראלית מובילה. מעל 15 שנות ניסיון, אלפי לקוחות, ותשתית SLA 99.9%.
                        MISRAD AI הוא שותף רשמי של Voicenter ומציע את כל פתרונות הטלפוניה דרך ממשק אחד.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <a href="https://www.voicenter.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline">
                            <ExternalLink size={12} /> Voicenter.com
                        </a>
                        <a href="https://misrad-ai.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
                            <ExternalLink size={12} /> Misrad-AI.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoicenterClientInfoPage;
