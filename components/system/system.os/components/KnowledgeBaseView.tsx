
import React, { useState } from 'react';
import { 
    Book, Search, FileText, ChevronRight, PlayCircle, 
    Mic, Video, Plus, Folder, Hash, Sparkles, UserCheck, 
    Shield, Clock, ArrowRight, Share2, Bookmark, CheckSquare, 
    GraduationCap, Layout, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { KnowledgeItem, OnboardingTask, UserRole, Task } from '../types';

// --- MOCK DATA ---

const CATEGORIES = [
    { id: 'sales', label: 'תסריטי מכירה', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'ops', label: 'תפעול ונהלים', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' }, 
    { id: 'tech', label: 'מערכות וטכני', icon: Hash, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'hr', label: 'משאבי אנוש', icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
];

const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
    {
        id: '1',
        title: 'תסריט שיחה: טיפול בהתנגדות "יקר לי"',
        category: 'sales',
        type: 'Tutorial',
        lastUpdated: new Date(),
        author: 'איתמר המנכ"ל',
        readTime: '4 דק\'',
        requiredRoles: ['agent', 'admin'],
        verificationRequired: true,
        tags: ['מכירות', 'התנגדויות', 'מאסטרמיינד'],
        content: (
            <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                    <strong>עקרון מפתח:</strong> אנחנו לא מורידים מחיר, אנחנו מעלים ערך. הלקוח לא קונה "שעות", הוא קונה "תוצאה".
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2">שלב 1: הזדהות ושיקוף</h4>
                    <p className="text-slate-600 leading-relaxed">
                        "אני מבין לגמרי. השקעה של 15,000 ש״ח היא לא דבר של מה בכך. תגיד, כשאתה אומר יקר, אתה משווה את זה למשהו אחר שבדקת, או שזה פשוט מרגיש חורג מהתקציב כרגע?"
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2">שלב 2: פירוק לגורמים</h4>
                    <p className="text-slate-600 leading-relaxed">
                        הסבר ללקוח: "בוא נפרק את זה. מדובר ב-3 חודשים. זה 5,000 ש״ח לחודש. אם השיטה תביא לך רק 2 לקוחות נוספים בחודש, ההשקעה כיסתה את עצמה. כל השאר זה רווח נקי לכל החיים."
                    </p>
                </div>
            </div>
        )
    },
    {
        id: '2',
        title: 'נוהל: קליטת לקוח חדש במערכת',
        category: 'ops',
        type: 'SOP',
        lastUpdated: new Date(Date.now() - 86400000 * 7),
        author: 'מנהל תפעול',
        readTime: '2 דק\'',
        requiredRoles: ['agent', 'admin'],
        verificationRequired: true,
        tags: ['אדמין', 'אוטומציה'],
        content: (
            <div className="space-y-4">
                <p className="text-slate-600">סדר פעולות מחייב בעת סגירת עסקה (Deal Won):</p>
                <ul className="space-y-4 list-none text-slate-700">
                    <li className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">1</span>
                        ודא חתימה על הסכם דיגיטלי.
                    </li>
                    <li className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">2</span>
                        פתח כרטיס לקוח במערכת וודא שכל השדות (כולל ח.פ) מלאים.
                    </li>
                    <li className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">3</span>
                        שלח את "ערכת הקבלה" במייל.
                    </li>
                    <li className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">4</span>
                        <strong>קריטי:</strong> תאם פגישת קיק-אוף ביומן של איתמר (רק לימי שלישי/חמישי).
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: '3',
        title: 'מדיניות ימי חופשה ומחלה',
        category: 'hr',
        type: 'Policy',
        lastUpdated: new Date(Date.now() - 86400000 * 30),
        author: 'משאבי אנוש',
        readTime: '5 דק\'',
        requiredRoles: ['agent', 'admin'],
        verificationRequired: false,
        tags: ['HR', 'נהלים'],
        content: "פירוט ימי חופשה..."
    }
];

const ONBOARDING_TRACK: OnboardingTask[] = [
    { id: 't1', title: 'קרא את נוהל קליטת לקוח', type: 'read', itemId: '2', completed: true },
    { id: 't2', title: 'צפה בסרטון: איך מוכרים את החלום?', type: 'video', completed: false },
    { id: 't3', title: 'למד את תסריט ההתנגדויות', type: 'read', itemId: '1', completed: false },
    { id: 't4', title: 'מבחן הסמכה: בסיס מכירות', type: 'quiz', completed: false },
];

interface KnowledgeBaseViewProps {
    onAddTask?: (task: Task) => void;
}

const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ onAddTask }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'wiki' | 'learning'>('wiki');
    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<KnowledgeItem | null>(null);
    const [myTrack, setMyTrack] = useState(ONBOARDING_TRACK);

    const filteredDocs = KNOWLEDGE_ITEMS.filter(doc => {
        const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
        const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) || doc.tags.some(t => t.includes(search));
        return matchesCategory && matchesSearch;
    });

    const handleShare = () => {
        addToast('קישור למסמך הועתק', 'success');
    };

    const handleFavorite = () => {
        addToast('נוסף למועדפים', 'success');
    };

    const handleSOPToTask = () => {
        if (!selectedDoc || !onAddTask) return;
        
        const newTask: Task = {
            id: `sop_task_${Date.now()}`,
            title: `ביצוע נוהל: ${selectedDoc.title}`,
            description: 'נוצר אוטומטית מתוך מרכז הידע.',
            assigneeId: 'current', 
            dueDate: new Date(Date.now() + 86400000), 
            priority: 'medium',
            status: 'todo',
            tags: ['SOP', 'Operations']
        };
        
        onAddTask(newTask);
    };

    const handleMarkAsRead = (docId: string) => {
        addToast('אושר! התקדמת במסלול ההכשרה.', 'success');
        setMyTrack(prev => prev.map(t => t.itemId === docId ? { ...t, completed: true } : t));
    };

    const progress = Math.round((myTrack.filter(t => t.completed).length / myTrack.length) * 100);

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Book className="text-indigo-600" strokeWidth={2.5} />
                        ידע
                    </h2>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200/50 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('wiki')}
                            className={`px-4 py-2 rounded-lg text-base font-bold transition-all flex items-center gap-2 ${activeTab === 'wiki' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Folder size={16} /> מאגר מידע
                        </button>
                        <button 
                            onClick={() => setActiveTab('learning')}
                            className={`px-4 py-2 rounded-lg text-base font-bold transition-all flex items-center gap-2 ${activeTab === 'learning' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <GraduationCap size={16} /> הכשרה שלי
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'wiki' ? (
                <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0">
                    
                    {/* Sidebar Navigation */}
                    <div className="w-full xl:w-72 shrink-0 space-y-6">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="חיפוש נוהל..." 
                                className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium shadow-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
                            <button 
                                onClick={() => setActiveCategory('all')}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors ${activeCategory === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Folder size={18} />
                                כל התיקיות
                            </button>
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors ${activeCategory === cat.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <div className={`p-1 rounded-md ${cat.bg} ${cat.color}`}>
                                        <cat.icon size={14} />
                                    </div>
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* AI Quick Insight Box */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                                    <Sparkles size={14} /> המלצת מערכת
                                </div>
                                <p className="text-sm font-medium leading-relaxed mb-4">
                                    "שמתי לב שרוב סוכני המכירות נתקעים בשלב 'הצגת המחיר'. הוספתי תסריט חדש שממסגר את המחיר כהשקעה חודשית."
                                </p>
                                <button 
                                    onClick={() => setSelectedDoc(KNOWLEDGE_ITEMS[0])}
                                    className="w-full bg-white text-indigo-700 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors"
                                >
                                    צפה בתסריט המומלץ
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex gap-8 min-h-0">
                        
                        {/* List */}
                        <div className={`${selectedDoc ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 gap-4 overflow-y-auto custom-scrollbar`}>
                            {filteredDocs.map(doc => (
                                <div 
                                    key={doc.id}
                                    onClick={() => setSelectedDoc(doc)}
                                    className={`p-5 rounded-2xl border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                                        selectedDoc?.id === doc.id 
                                        ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200`}>
                                                {CATEGORIES.find(c => c.id === doc.category)?.label}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${doc.type === 'SOP' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {doc.type === 'SOP' ? 'נוהל' : doc.type === 'Tutorial' ? 'הדרכה' : 'מדיניות'}
                                            </span>
                                        </div>
                                        <ChevronRight size={16} className={`text-slate-300 transition-transform ${selectedDoc?.id === doc.id ? 'text-indigo-500 rotate-180' : 'group-hover:text-slate-500'}`} />
                                    </div>
                                    <h3 className={`font-bold text-slate-800 mb-2 leading-snug ${selectedDoc?.id === doc.id ? 'text-indigo-700' : ''}`}>{doc.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {doc.readTime}</span>
                                        <span>•</span>
                                        <span>{doc.author}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reading Pane */}
                        <div className={`${selectedDoc ? 'flex' : 'hidden lg:flex'} flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex-col overflow-hidden h-full relative`}>
                            {selectedDoc ? (
                                <>
                                    {/* Doc Header */}
                                    <div className="p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                                        <div className="flex items-start gap-4">
                                            <button onClick={() => setSelectedDoc(null)} className="lg:hidden p-2 bg-slate-100 rounded-lg text-slate-600"><ArrowRight size={20} /></button>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md border border-indigo-100">
                                                        {CATEGORIES.find(c => c.id === selectedDoc.category)?.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock size={12} /> עודכן: {selectedDoc.lastUpdated.toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4">{selectedDoc.title}</h1>
                                                <div className="flex gap-2">
                                                    {selectedDoc.tags.map(tag => (
                                                        <span key={tag} className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">#{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleFavorite}
                                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                                                    title="שמור במועדפים"
                                                >
                                                    <Bookmark size={20} />
                                                </button>
                                                <button 
                                                    onClick={handleShare}
                                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                                                    title="שתף"
                                                >
                                                    <Share2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                                        <div className="prose prose-slate max-w-none">
                                            {selectedDoc.content}
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                        {selectedDoc.type === 'SOP' ? (
                                            <button 
                                                onClick={handleSOPToTask}
                                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md"
                                            >
                                                <CheckSquare size={18} /> הפוך למשימה לביצוע
                                            </button>
                                        ) : (
                                            <div></div>
                                        )}

                                        {selectedDoc.verificationRequired && (
                                            <button 
                                                onClick={() => handleMarkAsRead(selectedDoc.id)}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md"
                                            >
                                                <CheckCircle2 size={18} /> קראתי והבנתי
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center opacity-60">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <FileText size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-600">בחר מסמך לצפייה</h3>
                                    <p className="text-sm">בחר מתוך הרשימה או השתמש בחיפוש</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            ) : (
                // --- LEARNING CENTER TAB ---
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
                    
                    {/* Left: Stats & Progress */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-2xl"></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 relative z-10">ההתקדמות שלי</h3>
                            
                            <div className="relative pt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-4xl font-bold text-indigo-600">{progress}%</span>
                                    <span className="text-sm font-medium text-slate-500">הושלם מהמסלול</span>
                                </div>
                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <div className="flex-1 bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                                    <div className="text-2xl font-bold text-slate-800">4</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">משימות</div>
                                </div>
                                <div className="flex-1 bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                                    <div className="text-2xl font-bold text-slate-800">1</div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase">פתוחות</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={24} className="text-amber-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-amber-800 mb-1">חובת קריאה</h4>
                                    <p className="text-sm text-amber-700 leading-snug">
                                        עודכן נוהל חדש: "מדיניות שימוש ברכב חברה". עליך לקרוא ולאשר עד סוף השבוע.
                                    </p>
                                    <button className="mt-3 text-xs font-bold bg-white text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50">
                                        קרא עכשיו
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: The Track */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Layout size={20} className="text-slate-400" />
                                מסלול: סוכן מכירות מתחיל
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {myTrack.map((task, index) => (
                                <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    task.completed 
                                    ? 'bg-slate-50 border-slate-200 opacity-60' 
                                    : 'bg-white border-indigo-100 shadow-sm ring-1 ring-indigo-50'
                                }`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 ${
                                        task.completed 
                                        ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
                                        : 'bg-white text-indigo-600 border-indigo-200'
                                    }`}>
                                        {task.completed ? <CheckCircle2 size={20} /> : index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-slate-800 ${task.completed ? 'line-through decoration-slate-400' : ''}`}>
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            {task.type === 'read' && <span className="flex items-center gap-1"><FileText size={10} /> קריאה</span>}
                                            {task.type === 'video' && <span className="flex items-center gap-1"><PlayCircle size={10} /> וידאו</span>}
                                            {task.type === 'quiz' && <span className="flex items-center gap-1"><CheckSquare size={10} /> מבחן</span>}
                                        </div>
                                    </div>
                                    {!task.completed && (
                                        <button 
                                            onClick={() => {
                                                if (task.itemId) setSelectedDoc(KNOWLEDGE_ITEMS.find(d => d.id === task.itemId) || null);
                                                setActiveTab('wiki');
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                                        >
                                            התחל
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeBaseView;
