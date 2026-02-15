
import React, { useState } from 'react';
import { 
    FileInput, Plus, Monitor, Smartphone, Eye, Code, 
    Share2, Palette, Settings, Type, List, Layout, 
    CheckSquare, GripVertical, Trash2, ArrowRight, Save, 
    Link, MousePointer, Copy, CheckCircle2
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface FormField {
    id: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[]; // For select
}

interface Form {
    id: string;
    title: string;
    status: 'active' | 'draft';
    views: number;
    conversions: number;
    fields: FormField[];
}

const INITIAL_FORMS: Form[] = [
    {
        id: '1',
        title: 'טופס יצירת קשר - ראשי',
        status: 'active',
        views: 1250,
        conversions: 48,
        fields: [
            { id: 'f1', type: 'text', label: 'שם מלא', required: true, placeholder: 'ישראל ישראלי' },
            { id: 'f2', type: 'phone', label: 'טלפון', required: true, placeholder: '050-0000000' },
            { id: 'f3', type: 'email', label: 'אימייל', required: false, placeholder: 'email@example.com' },
        ]
    },
    {
        id: '2',
        title: 'שאלון התאמה (Quiz)',
        status: 'active',
        views: 450,
        conversions: 85,
        fields: []
    }
];

const FormsView: React.FC = () => {
    const { addToast } = useToast();
    const [mode, setMode] = useState<'list' | 'builder'>('list');
    const [forms, setForms] = useState<Form[]>(INITIAL_FORMS);
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    
    // Builder State
    const [builderFields, setBuilderFields] = useState<FormField[]>([]);
    const [builderTitle, setBuilderTitle] = useState('טופס חדש');

    const handleEdit = (form: Form) => {
        setSelectedFormId(form.id);
        setBuilderFields(form.fields);
        setBuilderTitle(form.title);
        setMode('builder');
    };

    const handleNewForm = () => {
        setSelectedFormId(null);
        setBuilderFields([
            { id: 'f_name', type: 'text', label: 'שם מלא', required: true, placeholder: '' },
            { id: 'f_phone', type: 'phone', label: 'טלפון', required: true, placeholder: '' }
        ]);
        setBuilderTitle('טופס ללא שם');
        setMode('builder');
    };

    const addField = (type: FormField['type']) => {
        const newField: FormField = {
            id: `f_${Date.now()}`,
            type,
            label: type === 'text' ? 'טקסט קצר' : type === 'email' ? 'אימייל' : type === 'phone' ? 'טלפון' : type === 'textarea' ? 'פסקה' : 'בחירה',
            required: false,
            placeholder: ''
        };
        setBuilderFields([...builderFields, newField]);
    };

    const removeField = (id: string) => {
        setBuilderFields(prev => prev.filter(f => f.id !== id));
    };

    const handleSave = () => {
        if (selectedFormId) {
            setForms(prev => prev.map(f => f.id === selectedFormId ? { ...f, title: builderTitle, fields: builderFields } : f));
            addToast('הטופס עודכן בהצלחה', 'success');
        } else {
            const newForm: Form = {
                id: `form_${Date.now()}`,
                title: builderTitle,
                status: 'active',
                views: 0,
                conversions: 0,
                fields: builderFields
            };
            setForms([...forms, newForm]);
            addToast('טופס חדש נוצר!', 'success');
        }
        setMode('list');
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText('https://forms.nexus.os/f/xyz123');
        addToast('קישור לטופס הועתק', 'success');
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <FileInput className="text-indigo-600" strokeWidth={2.5} />
                        טפסים
                    </h2>
                </div>
                
                {mode === 'list' ? (
                    <button 
                        onClick={handleNewForm}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                    >
                        <Plus size={18} /> צור דף חדש
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button onClick={() => setMode('list')} className="text-slate-500 font-bold hover:text-slate-800 px-4 py-2">ביטול</button>
                        <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                            <Save size={18} /> שמור ופרסם
                        </button>
                    </div>
                )}
            </div>

            {/* LIST MODE */}
            {mode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map(form => (
                        <div 
                            key={form.id} 
                            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden flex flex-col h-[280px]"
                            onClick={() => handleEdit(form)}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl ${form.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Layout size={24} />
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${form.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {form.status === 'active' ? 'פעיל' : 'טיוטה'}
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-slate-800 text-lg mb-2">{form.title}</h3>
                            <div className="text-xs text-slate-400 mb-6 flex items-center gap-1">
                                <Link size={12} /> forms.nexus.os/f/{form.id}
                            </div>
                            
                            <div className="mt-auto pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">צפיות</div>
                                    <div className="text-xl font-mono font-bold text-slate-700">{form.views.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">המרות</div>
                                    <div className="text-xl font-mono font-bold text-emerald-600">{form.conversions.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Conversion Rate Sparkline Simulation */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                                <div className="h-full bg-emerald-500" style={{ width: `${(form.conversions / Math.max(form.views, 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleNewForm}
                        className="border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all min-h-[280px] group"
                    >
                        <div className="w-14 h-14 rounded-full bg-slate-50 group-hover:bg-white border border-slate-200 flex items-center justify-center mb-4 transition-colors shadow-sm">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg">צור דף חדש</span>
                    </button>
                </div>
            )}

            {/* BUILDER MODE */}
            {mode === 'builder' && (
                <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px] flex-1">
                    
                    {/* Components Toolbar */}
                    <div className="w-full lg:w-64 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col gap-6 shrink-0 h-fit">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">רכיבי טופס</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { type: 'text', label: 'טקסט', icon: Type },
                                    { type: 'email', label: 'מייל', icon: Layout },
                                    { type: 'phone', label: 'טלפון', icon: Smartphone },
                                    { type: 'textarea', label: 'פסקה', icon: FileInput },
                                    { type: 'select', label: 'בחירה', icon: List },
                                    { type: 'checkbox', label: 'תיבה', icon: CheckSquare },
                                ].map((field) => (
                                    <button
                                        key={field.type}
                                        onClick={() => addField(field.type as FormField['type'])}
                                        className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-all gap-2"
                                    >
                                        <field.icon size={20} />
                                        <span className="text-xs font-bold">{field.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">הגדרות עיצוב</h4>
                            <div className="space-y-2">
                                <button className="w-full text-right p-3 rounded-xl hover:bg-slate-50 text-slate-600 font-medium text-sm flex items-center gap-3">
                                    <Palette size={16} /> צבעים ומיתוג
                                </button>
                                <button className="w-full text-right p-3 rounded-xl hover:bg-slate-50 text-slate-600 font-medium text-sm flex items-center gap-3">
                                    <Settings size={16} /> הגדרות שדה
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-slate-100/50 rounded-3xl border border-slate-200 shadow-inner relative flex flex-col overflow-hidden">
                        
                        {/* Canvas Toolbar */}
                        <div className="p-4 flex justify-between items-center bg-white/80 backdrop-blur-sm border-b border-slate-200">
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`p-2 rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Monitor size={16} />
                                </button>
                                <button 
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`p-2 rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Smartphone size={16} />
                                </button>
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={handleCopyLink} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                                    <Share2 size={14} /> שיתוף
                                </button>
                                <button className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                                    <Eye size={14} /> תצוגה מקדימה
                                </button>
                            </div>
                        </div>

                        {/* The Form Preview */}
                        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#f1f5f9]">
                            <div 
                                className={`bg-white shadow-2xl transition-all duration-500 flex flex-col ${
                                    previewMode === 'mobile' ? 'w-[375px] rounded-[40px] border-8 border-slate-800 my-4 h-[700px]' : 'w-full max-w-2xl rounded-xl min-h-[600px]'
                                }`}
                            >
                                {/* Form Content */}
                                <div className={`flex-1 p-8 flex flex-col ${previewMode === 'mobile' ? 'overflow-y-auto custom-scrollbar' : ''}`}>
                                    
                                    {/* Editable Title */}
                                    <input 
                                        type="text" 
                                        value={builderTitle}
                                        onChange={(e) => setBuilderTitle(e.target.value)}
                                        className="text-3xl font-extrabold text-slate-900 bg-transparent border-none focus:ring-0 text-center mb-2 placeholder-slate-300 w-full"
                                        placeholder="כותרת הטופס"
                                    />
                                    <p className="text-center text-slate-500 text-sm mb-8">השאירו פרטים ונחזור אליכם בהקדם</p>

                                    {/* Fields */}
                                    <div className="space-y-4 flex-1">
                                        {builderFields.map((field, index) => (
                                            <div key={field.id} className="group relative bg-white border border-transparent hover:border-indigo-100 hover:shadow-sm rounded-xl p-3 transition-all">
                                                
                                                <div className="absolute left-[-30px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                    <button onClick={() => removeField(field.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={14} /></button>
                                                    <button className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 cursor-grab"><GripVertical size={14} /></button>
                                                </div>

                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                {field.type === 'textarea' ? (
                                                    <textarea disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none h-24" placeholder={field.placeholder}></textarea>
                                                ) : field.type === 'select' ? (
                                                    <select disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"><option>בחר אפשרות...</option></select>
                                                ) : (
                                                    <input type={field.type} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder={field.placeholder} />
                                                )}
                                            </div>
                                        ))}
                                        
                                        {builderFields.length === 0 && (
                                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
                                                גרור רכיבים לכאן או לחץ על הכפתורים בצד ימין
                                            </div>
                                        )}
                                    </div>

                                    <button className="mt-8 w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 pointer-events-none opacity-90">
                                        שלח טופס <ArrowRight size={16} />
                                    </button>
                                    
                                    <div className="mt-6 flex justify-center items-center gap-1.5 text-[10px] text-slate-400 font-medium opacity-60">
                                        <CheckCircle2 size={10} /> מאובטח ע"י Nexus Forms
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default FormsView;
