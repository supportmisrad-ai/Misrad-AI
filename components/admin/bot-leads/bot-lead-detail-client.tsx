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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 bg-[#f8fafc] min-h-screen font-sans" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.push('/admin/bot-leads')}
            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all active:scale-95"
            title="חזרה לרשימה"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {lead.name || lead.first_name || 'ליד ללא שם'}
              </h1>
              {getStatusBadge(lead.status)}
            </div>
            <div className="flex items-center gap-4 text-slate-500 font-bold">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-100 shadow-sm">
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                <span dir="ltr">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>נוצר ב-{format(new Date(lead.created_at), 'dd/MM/yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-12 px-6 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
            <Edit className="w-4 h-4 text-slate-400" />
            עריכת פרטים
          </button>
          <button className="h-12 px-8 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-95 shadow-md flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            שלח וואטסאפ
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Cards and Info */}
        <div className="lg:col-span-8 space-y-8">
          {/* Action Center Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 p-2">
              <div className="flex gap-1">
                {[
                  { id: 'overview', label: 'סקירה כללית', icon: User },
                  { id: 'conversations', label: 'היסטוריית שיחה', icon: MessageSquare },
                  { id: 'details', label: 'כל הנתונים', icon: Tag },
                  { id: 'activity', label: 'ציר זמן', icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3.5 text-xs font-black rounded-2xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                    }`}
                  >
                    <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-blue-500' : 'text-slate-300'}`} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8">
              {/* Content based on Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-10">
                  {/* Lead Stats Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">ציון ליד (AI)</div>
                        <div className="flex items-end gap-2">
                          <div className="text-4xl font-black text-blue-700">{lead.lead_score || 0}</div>
                          <div className="text-sm font-bold text-blue-400 mb-1.5">/ 100</div>
                        </div>
                      </div>
                      <Star className="absolute -bottom-4 -left-4 w-24 h-24 text-blue-100/50 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">תוכנית נבחרת</div>
                        <div className="text-xl font-black text-emerald-700 truncate">{lead.selected_plan || 'טרם נבחר'}</div>
                        {lead.plan_price && <div className="text-sm font-bold text-emerald-500 mt-1">₪{lead.plan_price} לחודש</div>}
                      </div>
                      <Building2 className="absolute -bottom-4 -left-4 w-24 h-24 text-emerald-100/50 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="bg-purple-50/50 border border-purple-100 rounded-3xl p-6 relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">סטטוס ושלב</div>
                        <div className="text-xl font-black text-purple-700 truncate">{statusLabels[lead.status] || lead.status}</div>
                        <div className="text-sm font-bold text-purple-500 mt-1">שלב: {lead.stage || 'חדש'}</div>
                      </div>
                      <CheckCircle className="absolute -bottom-4 -left-4 w-24 h-24 text-purple-100/50 group-hover:scale-110 transition-transform" />
                    </div>
                  </div>

                  {/* Contact & Business Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-slate-900 border-r-4 border-blue-500 pr-3">פרטי קשר וזיהוי</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">שם מלא</div>
                              <div className="text-sm font-black text-slate-700">{lead.name || '-'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-blue-200 transition-all cursor-pointer" onClick={() => lead.email && window.open(`mailto:${lead.email}`)}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">כתובת אימייל</div>
                              <div className="text-sm font-black text-slate-700">{lead.email || 'לא הוזן'}</div>
                            </div>
                          </div>
                          {lead.email && <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-blue-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">מיקום</div>
                              <div className="text-sm font-black text-slate-700">{lead.city || lead.address || 'לא צוין'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-slate-900 border-r-4 border-purple-500 pr-3">נתונים עסקיים</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-purple-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-colors">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">שם העסק</div>
                              <div className="text-sm font-black text-slate-700">{lead.business_name || 'לקוח פרטי'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-purple-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-colors">
                              <Star className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">תעשייה / סקטור</div>
                              <div className="text-sm font-black text-slate-700">{lead.industry || 'לא צוין'}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-purple-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-colors">
                              <Tag className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">גודל ארגון</div>
                              <div className="text-sm font-black text-slate-700">{lead.org_size || 'לא ידוע'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pain Points Section */}
                  {lead.pain_point && (
                    <div className="bg-amber-50/30 border border-amber-100 rounded-[2rem] p-8">
                      <div className="flex items-center gap-2 mb-4 text-amber-700">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="text-base font-black uppercase tracking-tight">נקודות כאב וצרכים שעלו</h3>
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed bg-white/60 p-6 rounded-2xl border border-white shadow-sm italic">
                        "{lead.pain_point}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Conversations Tab */}
              {activeTab === 'conversations' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900">היסטוריית שיחות בוט</h3>
                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                      {conversations.length} הודעות
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">אין היסטוריית שיחות להצגה</p>
                      </div>
                    ) : (
                      conversations.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-4 p-5 rounded-3xl border shadow-sm transition-all ${
                            msg.direction === 'in' 
                              ? 'bg-white border-slate-100 mr-12 ml-4' 
                              : 'bg-blue-50/50 border-blue-100 ml-12 mr-4'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                            msg.direction === 'in' 
                              ? 'bg-slate-50 text-slate-400 border-slate-100' 
                              : 'bg-blue-100 text-blue-600 border-blue-200'
                          }`}>
                            {msg.direction === 'in' ? <User className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${msg.direction === 'in' ? 'text-slate-400' : 'text-blue-500'}`}>
                                {msg.direction === 'in' ? 'הלקוח' : 'מערכת (BOT)'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {format(new Date(msg.created_at), 'HH:mm • dd/MM/yy')}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            {msg.rule_id && (
                              <div className="mt-3 pt-3 border-t border-slate-100/50 flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">כלל: {msg.rule_id}</span>
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
                <div className="space-y-6">
                  <h3 className="text-lg font-black text-slate-900 border-r-4 border-slate-900 pr-3">כל שדות המידע (Raw Data)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                    {Object.entries(lead).map(([key, value]) => {
                      if (value === null || value === undefined) return null;
                      if (key === 'conversations' || key === 'tags' || key === 'custom_fields') return null;
                      if (typeof value === 'object') return null;
                      
                      return (
                        <div key={key} className="flex justify-between py-3 border-b border-slate-200/50 group hover:border-blue-300 transition-colors">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{key.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-black text-slate-700 pr-4">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-8">
                  <h3 className="text-lg font-black text-slate-900 mb-6">ציר זמן פעילות</h3>
                  <div className="relative pr-8 border-r-2 border-slate-100 space-y-10 mr-4">
                    <div className="relative group">
                      <div className="absolute top-0 right-[-41px] w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-md z-10" />
                      <div>
                        <div className="text-[10px] font-black text-blue-600 uppercase mb-1">יצירת הליד</div>
                        <p className="text-sm font-black text-slate-900">הליד נכנס למערכת מהמקור: {lead.source || 'לא ידוע'}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">
                          {format(new Date(lead.created_at), 'dd MMMM yyyy, HH:mm', { locale: he })}
                        </p>
                      </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute top-0 right-[-41px] w-6 h-6 bg-slate-200 rounded-full border-4 border-white shadow-md z-10 group-hover:bg-blue-400 transition-colors" />
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">עדכון אחרון</div>
                        <p className="text-sm font-black text-slate-700">פעילות או עדכון אחרון בנתוני הליד</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: he })}
                        </p>
                      </div>
                    </div>

                    {lead.last_interaction && (
                      <div className="relative group">
                        <div className="absolute top-0 right-[-41px] w-6 h-6 bg-amber-500 rounded-full border-4 border-white shadow-md z-10" />
                        <div>
                          <div className="text-[10px] font-black text-amber-600 uppercase mb-1">אינטראקציה אחרונה</div>
                          <p className="text-sm font-black text-slate-700">הלקוח הגיב או יצר קשר עם הבוט</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">
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
        <div className="lg:col-span-4 space-y-8">
          {/* Scheduling Card */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">טיפול הבא</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">תאריך יעד</label>
                <CustomDatePicker
                  showHebrewDate
                  value={lead.next_action_date ? new Date(lead.next_action_date).toISOString().split('T')[0] : ''}
                  onChange={(date) => {}} // Handle update
                  placeholder="בחר תאריך לטיפול"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">שעה מועדפת</label>
                <div className="relative group">
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="time"
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl pr-11 pl-4 py-2.5 text-sm font-black focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    defaultValue="10:00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">משימה לביצוע</label>
                <textarea
                  placeholder="מה המשימה הבאה?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[100px] resize-none"
                  defaultValue={lead.next_action || ''}
                />
              </div>

              <button className="w-full py-4 bg-slate-900 text-white rounded-[1.25rem] text-sm font-black shadow-lg hover:bg-blue-600 hover:shadow-blue-200 transition-all active:scale-95">
                עדכן משימת מעקב
              </button>
            </div>
          </div>

          {/* Tags & Quick Metadata */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">תגיות (AI)</h3>
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lead.tags.length > 0 ? lead.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 text-[11px] font-black hover:border-blue-200 hover:bg-white transition-all cursor-default">
                    #{tag}
                  </span>
                )) : (
                  <span className="text-xs font-bold text-slate-400 italic">אין תגיות עדיין</span>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">מקור ההגעה</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-400">קמפיין:</span>
                  <span className="font-black text-slate-700">{lead.campaign || 'אורגני'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-400">פלטפורמה:</span>
                  <span className="font-black text-slate-700">{lead.source || 'לא ידוע'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-400">מזהה חיצוני:</span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{lead.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
