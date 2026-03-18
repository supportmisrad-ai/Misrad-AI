'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO } from '@/app/actions/bot-leads';
import { 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Calendar as CalendarIcon,
  MessageSquare,
  Tag,
  Star,
  ArrowLeft,
  Edit,
  Send,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Plus
} from 'lucide-react';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מועמד',
  demo_scheduled: 'דמו מתוזמן',
  demo_completed: 'דמו הושלם',
  proposal_sent: 'הצעת מחיר נשלחה',
  negotiation: 'במשא ומתן',
  trial: 'בתקופת ניסיון',
  customer: 'לקוח',
  churned: 'נטש',
  lost: 'אבוד',
  unsubscribed: 'הסיר הרשמה',
};

interface BotLeadDetailClientProps {
  lead: BotLeadDTO;
  conversations: Array<{
    id: string;
    direction: string;
    message: string;
    rule_id: string | null;
    variables: any;
    created_at: Date;
  }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'חדש', color: 'bg-blue-500' },
  contacted: { label: 'נוצר קשר', color: 'bg-yellow-500' },
  qualified: { label: 'מועמד', color: 'bg-purple-500' },
  demo_scheduled: { label: 'דמו מתוזמן', color: 'bg-indigo-500' },
  demo_completed: { label: 'דמו הושלם', color: 'bg-green-500' },
  proposal_sent: { label: 'הצעת מחיר נשלחה', color: 'bg-orange-500' },
  negotiation: { label: 'במשא ומתן', color: 'bg-amber-500' },
  trial: { label: 'בתקופת ניסיון', color: 'bg-cyan-500' },
  customer: { label: 'לקוח', color: 'bg-emerald-500' },
  churned: { label: 'נטש', color: 'bg-red-500' },
  lost: { label: 'אבוד', color: 'bg-gray-500' },
  unsubscribed: { label: 'הסיר הרשמה', color: 'bg-slate-500' },
};

export function BotLeadDetailClient({ lead, conversations }: BotLeadDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.new;
    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-2xl text-[11px] font-black border transition-all ${
        status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-50' : 
        status === 'customer' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-50' :
        status === 'lost' ? 'bg-slate-100 text-slate-500 border-slate-200' :
        'bg-white text-slate-700 border-slate-200'
      }`}>
        {status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-1.5" />}
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 bg-[#f8fafc] min-h-screen font-sans text-slate-900" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/bot-leads')}
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
            title="חזרה לרשימה"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {lead.name || lead.first_name || 'ליד ללא שם'}
              </h1>
              {getStatusBadge(lead.status)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-500 text-sm font-medium">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span dir="ltr" className="font-bold text-slate-700">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>נוצר ב-{format(new Date(lead.created_at), 'dd/MM/yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
            <Edit className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">עריכה</span>
          </button>
          <button className="h-10 px-5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">וואטסאפ</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cards and Info */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-slate-100 px-4 pt-4">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'overview', label: 'סקירה כללית', icon: User },
                  { id: 'conversations', label: 'היסטוריית שיחה', icon: MessageSquare },
                  { id: 'details', label: 'כל הנתונים', icon: Tag },
                  { id: 'activity', label: 'ציר זמן', icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* Content based on Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Lead Stats Bar - Clean Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between h-24">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">ציון ליד</div>
                      <div className="flex items-baseline gap-1">
                        <div className={`text-3xl font-black ${
                          (lead.lead_score || 0) > 80 ? 'text-amber-500' : 'text-slate-900'
                        }`}>{lead.lead_score || 0}</div>
                        <div className="text-xs font-bold text-slate-400">/ 100</div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between h-24">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">תוכנית</div>
                      <div>
                        <div className="text-lg font-black text-slate-900 truncate">{lead.selected_plan || 'טרם נבחר'}</div>
                        {lead.plan_price && <div className="text-xs font-bold text-emerald-600 mt-0.5">₪{lead.plan_price}/חודש</div>}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between h-24">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">סטטוס</div>
                      <div>
                        <div className="text-lg font-black text-slate-900 truncate">{statusLabels[lead.status] || lead.status}</div>
                        <div className="text-xs font-bold text-slate-400 mt-0.5">שלב: {lead.stage || 'חדש'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Business Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        פרטי קשר
                      </h3>
                      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">שם מלא</span>
                          <span className="text-sm font-bold text-slate-900">{lead.name || '-'}</span>
                        </div>
                        <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50" onClick={() => lead.email && window.open(`mailto:${lead.email}`)}>
                          <span className="text-xs text-slate-500 font-medium">אימייל</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{lead.email || '-'}</span>
                            {lead.email && <ExternalLink className="w-3 h-3 text-slate-400" />}
                          </div>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">מיקום</span>
                          <span className="text-sm font-bold text-slate-900">{lead.city || lead.address || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-500" />
                        עסקי
                      </h3>
                      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">עסק</span>
                          <span className="text-sm font-bold text-slate-900">{lead.business_name || 'פרטי'}</span>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">תעשייה</span>
                          <span className="text-sm font-bold text-slate-900">{lead.industry || '-'}</span>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">גודל ארגון</span>
                          <span className="text-sm font-bold text-slate-900">{lead.org_size || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pain Points Section */}
                  {lead.pain_point && (
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                      <div className="flex items-center gap-2 mb-2 text-amber-700">
                        <AlertCircle className="w-4 h-4" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">נקודות כאב</h3>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed italic">
                        "{lead.pain_point}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Conversations Tab */}
              {activeTab === 'conversations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900">היסטוריית שיחות</h3>
                    <span className="text-xs font-medium text-slate-500">{conversations.length} הודעות</span>
                  </div>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {conversations.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">אין הודעות</p>
                      </div>
                    ) : (
                      conversations.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 p-4 rounded-2xl border transition-all ${
                            msg.direction === 'in' 
                              ? 'bg-white border-slate-200 mr-8' 
                              : 'bg-blue-50 border-blue-100 ml-8'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                            msg.direction === 'in' 
                              ? 'bg-slate-100 text-slate-500 border-slate-200' 
                              : 'bg-blue-100 text-blue-600 border-blue-200'
                          }`}>
                            {msg.direction === 'in' ? <User className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.direction === 'in' ? 'text-slate-500' : 'text-blue-600'}`}>
                                {msg.direction === 'in' ? 'לקוח' : 'בוט'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                {format(new Date(msg.created_at), 'HH:mm dd/MM')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            {msg.rule_id && (
                              <div className="mt-2 inline-flex text-[9px] font-bold text-slate-400 bg-black/5 px-1.5 py-0.5 rounded">
                                RULE: {msg.rule_id}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-r-4 border-slate-900 pr-3">כל שדות המידע (Raw)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    {Object.entries(lead).map(([key, value], idx) => {
                      if (value === null || value === undefined) return null;
                      if (key === 'conversations' || key === 'tags' || key === 'custom_fields') return null;
                      if (typeof value === 'object') return null;
                      
                      return (
                        <div key={key} className={`flex justify-between py-3 px-6 border-b border-slate-200/50 hover:bg-white transition-colors ${idx % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]" title={String(value)}>{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-900">ציר זמן פעילות</h3>
                  <div className="relative pr-6 border-r-2 border-slate-100 space-y-8 mr-2">
                    <div className="relative">
                      <div className="absolute top-1.5 right-[-31px] w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-sm z-10" />
                      <div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">יצירה</div>
                        <p className="text-sm font-bold text-slate-900">הליד נכנס למערכת ({lead.source || 'מקור לא ידוע'})</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">
                          {format(new Date(lead.created_at), 'dd MMMM yyyy, HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute top-1.5 right-[-31px] w-4 h-4 bg-slate-300 rounded-full border-2 border-white shadow-sm z-10" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">עדכון אחרון</div>
                        <p className="text-sm font-bold text-slate-700">שינוי בפרטי הליד</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: he })}
                        </p>
                      </div>
                    </div>

                    {lead.last_interaction && (
                      <div className="relative">
                        <div className="absolute top-1.5 right-[-31px] w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow-sm z-10" />
                        <div>
                          <div className="text-[10px] font-bold text-amber-600 uppercase mb-0.5">אינטראקציה אחרונה</div>
                          <p className="text-sm font-bold text-slate-700">תגובת משתמש / בוט</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(lead.last_interaction), { addSuffix: true, locale: he })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: CRM Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Scheduling Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-900 rounded-lg text-white">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">טיפול ומעקב</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">תאריך יעד</label>
                <CustomDatePicker
                  showHebrewDate
                  value={lead.next_action_date ? new Date(lead.next_action_date).toISOString().split('T')[0] : ''}
                  onChange={(date) => {}} 
                  placeholder="בחר תאריך..."
                  className="w-full !text-sm !h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">שעה</label>
                <div className="relative">
                  <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    className="w-full h-10 bg-white border border-slate-200 rounded-lg pr-10 pl-3 text-sm font-bold focus:border-slate-400 outline-none transition-all"
                    defaultValue="10:00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">משימה</label>
                <textarea
                  placeholder="פרט את המשימה לביצוע..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-medium focus:bg-white focus:border-slate-400 outline-none transition-all min-h-[80px] resize-none"
                  defaultValue={lead.next_action || ''}
                />
              </div>

              <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm">
                שמור משימה
              </button>
            </div>
          </div>

          {/* Tags & Quick Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">תגיות</h3>
                <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> הוסף
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lead.tags.length > 0 ? lead.tags.map((tag, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-[10px] font-bold">
                    #{tag}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400 italic">אין תגיות</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">מקור ליד</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">קמפיין:</span>
                  <span className="font-bold text-slate-700">{lead.campaign || 'אורגני'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">פלטפורמה:</span>
                  <span className="font-bold text-slate-700">{lead.source || 'לא ידוע'}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-500">מזהה:</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 rounded">{lead.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
