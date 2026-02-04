
import React, { useState } from 'react';
import { 
    Bot, Zap, Play, Settings, ChartBar, Plus, ArrowRight, 
    MousePointer, Mail, Database, MessageSquare, Clock, 
    CheckCircle, X, MoreHorizontal, Layout, Save, Trash2, Workflow
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { AutomationRule, VisualNode, VisualEdge } from './system/types';

// --- MOCK DATA FOR VISUAL BUILDER ---

const AVAILABLE_TRIGGERS = [
    { id: 't_lead_new', label: 'ליד נפתח', icon: 'UserPlus' },
    { id: 't_status_change', label: 'סטטוס שונה ל...', icon: 'GitCommit' },
    { id: 't_form_submit', label: 'טופס נשלח באתר', icon: 'FileText' },
    { id: 't_deal_won', label: 'עסקה נסגרה (זכייה)', icon: 'Trophy' },
];

const AVAILABLE_ACTIONS = [
    { id: 'a_send_whatsapp', label: 'שלח הודעת וואטסאפ', icon: 'MessageSquare' },
    { id: 'a_send_email', label: 'שלח אימייל', icon: 'Mail' },
    { id: 'a_create_task', label: 'צור משימה', icon: 'CheckSquare' },
    { id: 'a_create_project', label: 'פתיחת תיק פרויקט', icon: 'Layout' },
    { id: 'a_notify_manager', label: 'התראה למנהל', icon: 'Bell' },
    { id: 'a_create_invoice', label: 'הפקת חשבונית', icon: 'FileText' },
];

const INITIAL_RULES: AutomationRule[] = [
    {
        id: '1',
        name: 'קבלת פנים לליד נפתח',
        description: 'שליחת וואטסאפ ומייל אוטומטי בעת יצירת ליד.',
        active: true,
        stats: { runs: 142, lastRun: new Date(), successRate: 98 },
        nodes: [
            { id: 'n1', type: 'trigger', label: 'ליד נפתח', iconName: 'UserPlus', x: 50, y: 100 },
            { id: 'n2', type: 'action', label: 'שליחת וואטסאפ', iconName: 'MessageSquare', x: 300, y: 50 },
            { id: 'n3', type: 'action', label: 'שליחת אימייל', iconName: 'Mail', x: 300, y: 150 },
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n1', target: 'n3' },
        ]
    },
    {
        id: '2',
        name: 'פתיחת פרויקט לאחר סגירה',
        description: 'יצירת פרויקט חדש ועדכון פיננסי.',
        active: true,
        stats: { runs: 12, lastRun: new Date(Date.now() - 3600000), successRate: 100 },
        nodes: [
            { id: 'n1', type: 'trigger', label: 'סגירת עסקה', iconName: 'Trophy', x: 50, y: 100 },
            { id: 'n2', type: 'action', label: 'פתיחת פרויקט', iconName: 'Layout', x: 300, y: 100 },
            { id: 'n3', type: 'action', label: 'הפקת חשבונית', iconName: 'FileText', x: 550, y: 100 },
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2' },
            { id: 'e2', source: 'n2', target: 'n3' },
        ]
    }
];

const AutomationsView: React.FC = () => {
    const { addToast } = useToast();
    const [mode, setMode] = useState<'list' | 'builder'>('list');
    const [rules, setRules] = useState<AutomationRule[]>(INITIAL_RULES);
    const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
    
    // Builder State
    const [builderNodes, setBuilderNodes] = useState<VisualNode[]>([]);
    const [builderEdges, setBuilderEdges] = useState<VisualEdge[]>([]);
    const [builderName, setBuilderName] = useState('אוטומציה חדשה');

    const handleEditRule = (rule: AutomationRule) => {
        setSelectedRuleId(rule.id);
        setBuilderNodes(rule.nodes);
        setBuilderEdges(rule.edges);
        setBuilderName(rule.name);
        setMode('builder');
    };

    const handleNewRule = () => {
        setSelectedRuleId(null);
        setBuilderNodes([{ id: 'start', type: 'trigger', label: 'בחר אירוע מחולל', iconName: 'Zap', x: 50, y: 150 }]);
        setBuilderEdges([]);
        setBuilderName('אוטומציה חדשה');
        setMode('builder');
    };

    const handleSave = () => {
        if (selectedRuleId) {
            setRules(prev => prev.map(r => r.id === selectedRuleId ? { ...r, nodes: builderNodes, edges: builderEdges, name: builderName } : r));
            addToast('השינויים נשמרו בהצלחה', 'success');
        } else {
            const newRule: AutomationRule = {
                id: `rule_${Date.now()}`,
                name: builderName,
                description: 'נוצר ב-עורך הויזואלי',
                active: true,
                stats: { runs: 0, lastRun: null, successRate: 0 },
                nodes: builderNodes,
                edges: builderEdges
            };
            setRules([...rules, newRule]);
            addToast('אוטומציה חדשה נוצרה!', 'success');
        }
        setMode('list');
    };

    const addNode = (type: 'trigger' | 'action', label: string, iconName: string) => {
        const newNodeId = `n_${Date.now()}`;
        const lastNode = builderNodes[builderNodes.length - 1];
        
        const newNode: VisualNode = {
            id: newNodeId,
            type,
            label,
            iconName,
            x: lastNode ? lastNode.x + 250 : 50,
            y: lastNode ? lastNode.y : 150
        };

        setBuilderNodes([...builderNodes, newNode]);
        
        if (lastNode) {
            setBuilderEdges([...builderEdges, { id: `e_${Date.now()}`, source: lastNode.id, target: newNodeId }]);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Workflow className="text-primary" strokeWidth={2.5} />
                        אוטומציה מלאה
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">המערכת עובדת בשבילך 24/7.</p>
                </div>
                
                {mode === 'list' ? (
                    <button 
                        onClick={handleNewRule}
                        className="bg-onyx-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> צור רובוט חדש
                    </button>
                ) : (
                    <div className="flex gap-3">
                        <button onClick={() => setMode('list')} className="text-slate-500 font-bold hover:text-slate-800 px-4 py-2">ביטול</button>
                        <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                            <Save size={18} /> שמור והפעל
                        </button>
                    </div>
                )}
            </div>

            {/* LIST MODE */}
            {mode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rules.map(rule => (
                        <div 
                            key={rule.id} 
                            onClick={() => handleEditRule(rule)}
                            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-1.5 h-full ${rule.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl group-hover:bg-onyx-900 group-hover:text-white transition-colors">
                                    <Bot size={24} fill="currentColor" />
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${rule.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {rule.active ? 'פעיל' : 'כבוי'}
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-slate-800 text-lg mb-2">{rule.name}</h3>
                            <p className="text-slate-500 text-sm mb-6 line-clamp-2 h-10">{rule.description}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Play size={12} /> {rule.stats.runs} ריצות
                                </div>
                                <div className="text-xs font-bold text-emerald-600">
                                    {rule.stats.successRate}% הצלחה
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleNewRule}
                        className="border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-rose-300 hover:bg-rose-50/30 transition-all min-h-[250px] group"
                    >
                        <div className="w-14 h-14 rounded-full bg-slate-50 group-hover:bg-white border border-slate-200 flex items-center justify-center mb-4 transition-colors shadow-sm">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg">בנה רובוט חדש</span>
                    </button>
                </div>
            )}

            {/* BUILDER MODE */}
            {mode === 'builder' && (
                <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px] flex-1">
                    
                    {/* Toolbar Sidebar */}
                    <div className="w-full lg:w-72 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col gap-6 shrink-0 h-fit">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">שם האוטומציה</label>
                            <input 
                                type="text" 
                                value={builderName} 
                                onChange={(e) => setBuilderName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-rose-500 transition-colors"
                            />
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Zap size={16} className="text-amber-500" /> מתי זה קורה?
                            </h4>
                            <div className="space-y-2">
                                {AVAILABLE_TRIGGERS.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => addNode('trigger', t.label, t.icon)}
                                        className="w-full text-right p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:border-amber-200 rounded-xl text-xs font-bold text-slate-600 hover:text-amber-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Play size={16} className="text-onyx-800" /> מה לעשות?
                            </h4>
                            <div className="space-y-2">
                                {AVAILABLE_ACTIONS.map(a => (
                                    <button 
                                        key={a.id}
                                        onClick={() => addNode('action', a.label, a.icon)}
                                        className="w-full text-right p-3 bg-slate-50 hover:bg-white border border-slate-100 hover:border-onyx-200 rounded-xl text-xs font-bold text-slate-600 hover:text-onyx-900 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-onyx-900"></div>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner relative overflow-hidden group">
                        {/* Grid Background */}
                        <div className="absolute inset-0 opacity-[0.05]" 
                            style={{ 
                                backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
                                backgroundSize: '20px 20px' 
                            }}>
                        </div>

                        {/* Rendering Nodes & Edges */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {builderEdges.map(edge => {
                                const source = builderNodes.find(n => n.id === edge.source);
                                const target = builderNodes.find(n => n.id === edge.target);
                                if (!source || !target) return null;
                                
                                return (
                                    <path 
                                        key={edge.id}
                                        d={`M ${source.x + 100} ${source.y + 40} C ${source.x + 150} ${source.y + 40}, ${target.x - 50} ${target.y + 40}, ${target.x} ${target.y + 40}`}
                                        stroke="#cbd5e1" 
                                        strokeWidth="3" 
                                        fill="none" 
                                        className="flow-line"
                                        strokeDasharray="10"
                                    />
                                );
                            })}
                        </svg>

                        {builderNodes.map(node => (
                            <div 
                                key={node.id}
                                className={`absolute w-[200px] bg-white p-4 rounded-2xl shadow-lg border-2 transition-all cursor-grab active:cursor-grabbing hover:scale-105 z-10 ${
                                    node.type === 'trigger' ? 'border-amber-400' : 'border-onyx-900'
                                }`}
                                style={{ left: node.x, top: node.y }}
                            >
                                {/* Connection Point Left */}
                                {node.type !== 'trigger' && (
                                    <div className="absolute top-1/2 -left-3 w-3 h-3 bg-slate-400 rounded-full border-2 border-white"></div>
                                )}
                                {/* Connection Point Right */}
                                <div className="absolute top-1/2 -right-3 w-3 h-3 bg-slate-400 rounded-full border-2 border-white"></div>

                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`p-2 rounded-lg ${node.type === 'trigger' ? 'bg-amber-100 text-amber-600' : 'bg-onyx-900 text-white'}`}>
                                        {/* Simplified Icon Rendering for Demo */}
                                        <Zap size={16} /> 
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {node.type === 'trigger' ? 'אירוע' : 'פעולה'}
                                        </div>
                                        <div className="font-bold text-slate-800 text-sm">{node.label}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                                    לחץ להגדרות נוספות...
                                </div>
                                
                                {/* Delete Button */}
                                <button 
                                    onClick={() => {
                                        setBuilderNodes(prev => prev.filter(n => n.id !== node.id));
                                        setBuilderEdges(prev => prev.filter(e => e.source !== node.id && e.target !== node.id));
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}

                    </div>
                </div>
            )}

        </div>
    );
};

export default AutomationsView;
