'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO } from '@/app/actions/bot-leads';
import { 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Calendar,
  MessageSquare,
  Tag,
  Star,
  ArrowLeft,
  Edit,
  Send,
  User,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
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
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-white text-sm ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/bot-leads')}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {lead.name || lead.first_name || 'ליד ללא שם'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(lead.status)}
              <span className="text-gray-500">{lead.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Edit className="w-4 h-4" />
            ערוך
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
            <Send className="w-4 h-4" />
            שלח הודעה
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            {[
              { id: 'overview', label: 'סקירה כללית' },
              { id: 'conversations', label: `שיחות (${conversations.length})` },
              { id: 'details', label: 'פרטים מלאים' },
              { id: 'activity', label: 'פעילות' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contact Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="flex items-center gap-2 font-semibold mb-3">
                    <User className="w-5 h-5" />
                    פרטי קשר
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{lead.phone}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="flex items-center gap-2 font-semibold mb-3">
                    <Building2 className="w-5 h-5" />
                    פרטי חברה
                  </h3>
                  <div className="space-y-2">
                    {lead.business_name && (
                      <div className="font-medium">{lead.business_name}</div>
                    )}
                    {lead.industry && (
                      <div className="text-sm text-gray-500">תעשייה: {lead.industry}</div>
                    )}
                    {lead.org_size && (
                      <div className="text-sm text-gray-500">גודל: {lead.org_size}</div>
                    )}
                  </div>
                </div>

                {/* Lead Score */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="flex items-center gap-2 font-semibold mb-3">
                    <Star className="w-5 h-5" />
                    ציון ואיכות
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{lead.lead_score || 0}</span>
                      <span className="text-gray-500">/ 100</span>
                    </div>
                    <div className="text-sm">
                      איכות: <span className="font-medium">{lead.lead_quality || 'לא דורג'}</span>
                    </div>
                    <div className="text-sm">
                      שלב: <span className="font-medium">{lead.stage || 'new_lead'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source & Campaign */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">מקור וקמפיין</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">מקור</div>
                    <div className="font-medium">{lead.source || 'לא ידוע'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">קמפיין</div>
                    <div className="font-medium">{lead.campaign || 'ללא קמפיין'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">נוצר</div>
                    <div className="font-medium">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: he })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">עדכון אחרון</div>
                    <div className="font-medium">
                      {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: he })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pain Points & Interests */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">נקודות כאב</h3>
                  {lead.pain_point ? (
                    <p>{lead.pain_point}</p>
                  ) : (
                    <p className="text-gray-500">לא תועדו נקודות כאב</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">תוכנית נבחרת</h3>
                  {lead.selected_plan ? (
                    <div>
                      <p className="font-medium">{lead.selected_plan}</p>
                      {lead.plan_price && (
                        <p className="text-gray-500">₪{lead.plan_price}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">לא נבחרה תוכנית</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conversations Tab */}
          {activeTab === 'conversations' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="flex items-center gap-2 font-semibold mb-4">
                <MessageSquare className="w-5 h-5" />
                היסטוריית שיחות
              </h3>
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">אין שיחות להצגה</p>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`flex gap-4 p-4 rounded-lg ${
                        conversation.direction === 'in' ? 'bg-white' : 'bg-blue-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        conversation.direction === 'in' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {conversation.direction === 'in' ? (
                          <User className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Send className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {conversation.direction === 'in' ? 'לקוח' : 'בוט'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(conversation.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </span>
                        </div>
                        <p className="text-sm">{conversation.message}</p>
                        {conversation.rule_id && (
                          <div className="text-xs text-gray-500 mt-2">
                            כלל: {conversation.rule_id}
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
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-4">כל הפרטים</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {Object.entries(lead).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  if (key === 'conversations') return null;
                  if (typeof value === 'object') return null;
                  
                  return (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-500">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-4">פעילות אחרונה</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">ליד נוצר</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">עודכן לאחרונה</p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: he })}
                    </p>
                  </div>
                </div>
                {lead.last_interaction && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">אינטראקציה אחרונה</p>
                      <p className="text-sm text-gray-500">
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
  );
}
