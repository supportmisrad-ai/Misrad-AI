'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO } from '@/app/actions/bot-leads';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';

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
      <Badge className={cn(config.color, 'text-white')}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/bot-leads')}
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזרה לרשימה
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {lead.name || lead.first_name || 'ליד ללא שם'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(lead.status)}
              <span className="text-muted-foreground">{lead.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 ml-2" />
            ערוך
          </Button>
          <Button>
            <Send className="w-4 h-4 ml-2" />
            שלח הודעה
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="conversations">שיחות ({conversations.length})</TabsTrigger>
          <TabsTrigger value="details">פרטים מלאים</TabsTrigger>
          <TabsTrigger value="activity">פעילות</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  פרטי קשר
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{lead.phone}</span>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.alternative_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{lead.alternative_phone} (alt)</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  פרטי חברה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.business_name && (
                  <div>
                    <span className="font-medium">{lead.business_name}</span>
                  </div>
                )}
                {lead.industry && (
                  <div className="text-sm text-muted-foreground">
                    תעשייה: {lead.industry}
                  </div>
                )}
                {lead.org_size && (
                  <div className="text-sm text-muted-foreground">
                    גודל: {lead.org_size}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  ציון ואיכות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{lead.lead_score || 0}</span>
                  <span className="text-muted-foreground">/ 100</span>
                </div>
                <div className="text-sm">
                  איכות: <span className="font-medium">{lead.lead_quality || 'לא דורג'}</span>
                </div>
                <div className="text-sm">
                  שלב: <span className="font-medium">{lead.stage || 'new_lead'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source & Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>מקור וקמפיין</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">מקור</div>
                  <div className="font-medium">{lead.source || 'לא ידוע'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">קמפיין</div>
                  <div className="font-medium">{lead.campaign || 'ללא קמפיין'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">נוצר</div>
                  <div className="font-medium">
                    {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: he })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">עדכון אחרון</div>
                  <div className="font-medium">
                    {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: he })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pain Points & Interests */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>נקודות כאב</CardTitle>
              </CardHeader>
              <CardContent>
                {lead.pain_point ? (
                  <p>{lead.pain_point}</p>
                ) : (
                  <p className="text-muted-foreground">לא תועדו נקודות כאב</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>תוכנית נבחרת</CardTitle>
              </CardHeader>
              <CardContent>
                {lead.selected_plan ? (
                  <div>
                    <p className="font-medium">{lead.selected_plan}</p>
                    {lead.plan_price && (
                      <p className="text-muted-foreground">₪{lead.plan_price}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">לא נבחרה תוכנית</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversations Tab */}
        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                היסטוריית שיחות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conversations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    אין שיחות להצגה
                  </p>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        'flex gap-4 p-4 rounded-lg',
                        conversation.direction === 'in' ? 'bg-muted/50' : 'bg-primary/5'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        conversation.direction === 'in' ? 'bg-blue-100' : 'bg-green-100'
                      )}>
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
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(conversation.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </span>
                        </div>
                        <p className="text-sm">{conversation.message}</p>
                        {conversation.rule_id && (
                          <div className="text-xs text-muted-foreground mt-2">
                            כלל: {conversation.rule_id}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>כל הפרטים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {Object.entries(lead).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  if (key === 'conversations') return null;
                  if (typeof value === 'object') return null;
                  
                  return (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>פעילות אחרונה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">ליד נוצר</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">עודכן לאחרונה</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: he })}
                    </p>
                  </div>
                </div>
                {lead.last_interaction && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">אינטראקציה אחרונה</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.last_interaction), { addSuffix: true, locale: he })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
