'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BotLeadDTO, GetBotLeadsParams, getBotLeads, updateBotLeadStatus, updateBotLeadAssignment } from '@/app/actions/bot-leads';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

interface BotLeadsClientProps {
  initialLeads: BotLeadDTO[];
  initialTotal: number;
  campaigns: string[];
}

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

const priorityLabels: Record<string, string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  urgent: 'דחוף',
};

export function BotLeadsClient({ initialLeads, initialTotal, campaigns }: BotLeadsClientProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<BotLeadDTO[]>(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<GetBotLeadsParams>({
    status: 'all',
    priority: 'all',
    campaign: 'all',
    assignedTo: 'all',
    pageSize: 50,
  });

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getBotLeads({
        ...filters,
        search: search || undefined,
        page,
        pageSize,
      });
      setLeads(result.leads);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, search, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const toggleRowExpansion = (leadId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>לידים מהבוט</h1>
        <p style={{ color: '#6b7280' }}>ניהול לידים מבלאסטר וואטסאפ ({total.toLocaleString()} לידים)</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>סה"כ לידים</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{total.toLocaleString()}</div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>חדשים היום</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
            {leads.filter(l => new Date().toDateString() === new Date(l.created_at).toDateString()).length}
          </div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>ממתינים</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#eab308' }}>
            {leads.filter(l => l.status === 'new').length}
          </div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>ציון ממוצע</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {leads.length > 0 ? Math.round(leads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / leads.length) : 0}
          </div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>עם מדיה</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333ea' }}>
            {leads.filter(l => l.has_media).length}
          </div>
        </div>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>לקוחות</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
            {leads.filter(l => l.status === 'customer').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <input
            type="text"
            placeholder="חיפוש לפי שם, טלפון, אימייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="all">כל הסטטוסים</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="all">כל העדיפויות</option>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filters.campaign}
            onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="all">כל הקמפיינים</option>
            {campaigns.map((campaign) => (
              <option key={campaign} value={campaign}>{campaign}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}></th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>ליד</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>פרטי קשר</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>חברה</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>סטטוס</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>מקור</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>מכירות</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>ציון</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>נוצר</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>אין לידים להצגה</div>
                    <div style={{ color: '#6b7280', marginTop: '8px' }}>הלידים יופיעו כאן כשהבוט יתחיל לשלוח נתונים</div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <>
                    <tr key={lead.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => toggleRowExpansion(lead.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        >
                          {expandedRows.has(lead.id) ? '▲' : '▼'}
                        </button>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '18px' }}>👤</span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{lead.name || lead.first_name || 'ליד ללא שם'}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{lead.phone}</div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                              {lead.priority && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#dbeafe' }}>
                                  {priorityLabels[lead.priority]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {lead.email && <div>📧 {lead.email}</div>}
                        {lead.alternative_phone && <div style={{ color: '#6b7280' }}>📞 {lead.alternative_phone}</div>}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {lead.business_name && <div style={{ fontWeight: 500 }}>🏢 {lead.business_name}</div>}
                        {lead.industry && <div style={{ color: '#6b7280' }}>{lead.industry}</div>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          background: lead.status === 'new' ? '#dbeafe' : 
                                    lead.status === 'customer' ? '#dcfce7' :
                                    lead.status === 'lost' ? '#fee2e2' : '#f3f4f6'
                        }}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <div>{lead.source || 'לא ידוע'}</div>
                        {lead.campaign && <div style={{ color: '#6b7280', fontSize: '12px' }}>{lead.campaign}</div>}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {lead.selected_plan && <div style={{ fontWeight: 500 }}>{lead.selected_plan}</div>}
                        {lead.plan_price && <div style={{ color: '#16a34a' }}>₪{lead.plan_price}</div>}
                        {lead.coupon_code && <div style={{ fontSize: '12px' }}>🏷️ {lead.coupon_code}</div>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: (lead.lead_score || 0) > 70 ? '#eab308' : '#374151' }}>
                          ⭐ {lead.lead_score || 0}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <div>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: he })}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                          style={{ 
                            padding: '6px 12px', 
                            background: '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          פרטים
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED ROW - ALL 70+ FIELDS */}
                    {expandedRows.has(lead.id) && (
                      <tr style={{ background: '#f9fafb' }}>
                        <td colSpan={10} style={{ padding: '24px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #3b82f6', paddingBottom: '8px' }}>
                            כל הפרטים ({Object.keys(lead).length} שדות)
                          </h3>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', fontSize: '13px' }}>
                            {/* Column 1: Basic Info (20 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                פרטי בסיס
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>ID:</span> <code style={{ fontSize: '11px' }}>{lead.id}</code></div>
                                <div><span style={{ color: '#6b7280' }}>שם מלא:</span> {lead.name}</div>
                                <div><span style={{ color: '#6b7280' }}>שם פרטי:</span> {lead.first_name || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>שם משפחה:</span> {lead.last_name || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>טלפון:</span> {lead.phone}</div>
                                <div><span style={{ color: '#6b7280' }}>טלפון נוסף:</span> {lead.alternative_phone || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אימייל:</span> {lead.email || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אימייל מאומת:</span> {lead.email_validated ? '✅' : '❌'}</div>
                                <div><span style={{ color: '#6b7280' }}>שפה:</span> {lead.preferred_language || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>תקשורת מועדפת:</span> {lead.communication_pref || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>זמן מועדף:</span> {lead.best_time_to_call || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>טיים זון:</span> {lead.timezone || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>ID ארגון:</span> {lead.organization_id || '-'}</div>
                              </div>
                            </div>

                            {/* Column 2: Company Info (20 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                פרטי חברה
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>שם עסק:</span> {lead.business_name || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>סוג עסק:</span> {lead.business_type || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>תעשייה:</span> {lead.industry || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>תת-תעשייה:</span> {lead.sub_industry || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>גודל ארגון:</span> {lead.org_size || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>מספר עובדים:</span> {lead.employee_count || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>הכנסה שנתית:</span> {lead.annual_revenue || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>שנים בעסקים:</span> {lead.years_in_business || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אתר אינטרנט:</span> {lead.website ? <a href={lead.website} target="_blank" style={{ color: '#3b82f6' }}>קישור ↗</a> : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>לינקדאין:</span> {lead.linkedin_company || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>פייסבוק:</span> {lead.facebook_page || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אינסטגרם:</span> {lead.instagram_handle || '-'}</div>
                              </div>
                            </div>

                            {/* Column 3: Location (15 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                מיקום
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>כתובת:</span> {lead.address || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>עיר:</span> {lead.city || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אזור:</span> {lead.region || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>מדינה:</span> {lead.country || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>מיקוד:</span> {lead.zip_code || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>קו רוחב:</span> {lead.latitude || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>קו אורך:</span> {lead.longitude || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>שם מיקום:</span> {lead.location_name || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>סוג מיקום:</span> {lead.location_type || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אזור שירות:</span> {lead.service_area || '-'}</div>
                              </div>
                            </div>

                            {/* Column 4: Source & Tracking (20 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                מקור ומעקב
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>מקור:</span> {lead.source || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>מדיום:</span> {lead.medium || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>קמפיין:</span> {lead.campaign || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>קמפיין ID:</span> {lead.campaign_id || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>שם מפנה:</span> {lead.referrer_name || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>קוד מפנה:</span> {lead.referrer_code || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>UTM Source:</span> {lead.utm_source || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>UTM Medium:</span> {lead.utm_medium || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>UTM Campaign:</span> {lead.utm_campaign || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>דף נחיתה:</span> {lead.landing_page || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>כפתור נלחץ:</span> {lead.button_clicked || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>QR נסרק:</span> {lead.qr_scanned ? '✅' : '❌'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Second Row: Sales, Coupons, Media, Dates */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', fontSize: '13px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                            {/* Sales & Product (15 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#16a34a', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                מוצר ומכירות
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>תוכנית נבחרת:</span> {lead.selected_plan || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>מחיר תוכנית:</span> {lead.plan_price ? `₪${lead.plan_price}` : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>נקודת כאב:</span> {lead.pain_point || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>רמת כאב:</span> {lead.pain_level || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>טווח תקציב:</span> {lead.budget_range || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>רמת דחיפות:</span> {lead.urgency_level || '-'}</div>
                              </div>
                            </div>

                            {/* Coupons (5 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#16a34a', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                קופונים והנחות
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>קוד קופון:</span> {lead.coupon_code || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>סוג קופון:</span> {lead.coupon_type || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>סכום הנחה:</span> {lead.discount_amount ? `₪${lead.discount_amount}` : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>אחוז הנחה:</span> {lead.discount_percent ? `${lead.discount_percent}%` : '-'}</div>
                              </div>
                            </div>

                            {/* Media (5 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#9333ea', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                מדיה וקבצים
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>יש מדיה:</span> {lead.has_media ? '✅ כן' : '❌ לא'}</div>
                                <div><span style={{ color: '#6b7280' }}>סוג מדיה:</span> {lead.media_type || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>כתובת תמונה:</span> {lead.image_url ? <a href={lead.image_url} target="_blank" style={{ color: '#3b82f6' }}>צפה ↗</a> : '-'}</div>
                              </div>
                            </div>

                            {/* Dates (12 fields) */}
                            <div>
                              <h4 style={{ fontWeight: 'bold', color: '#ea580c', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                תאריכים
                              </h4>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                <div><span style={{ color: '#6b7280' }}>נוצר:</span> {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}</div>
                                <div><span style={{ color: '#6b7280' }}>עודכן:</span> {format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm')}</div>
                                <div><span style={{ color: '#6b7280' }}>אינטראקציה אחרונה:</span> {lead.last_interaction ? format(new Date(lead.last_interaction), 'dd/MM/yyyy') : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>קשר ראשון:</span> {lead.first_contact_date ? format(new Date(lead.first_contact_date), 'dd/MM/yyyy') : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>פעילות אחרונה:</span> {lead.last_activity_date ? format(new Date(lead.last_activity_date), 'dd/MM/yyyy') : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>דמו מתוזמן:</span> {lead.demo_scheduled_date ? format(new Date(lead.demo_scheduled_date), 'dd/MM/yyyy') : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>תחילת ניסיון:</span> {lead.trial_start_date ? format(new Date(lead.trial_start_date), 'dd/MM/yyyy') : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>תאריך סגירה:</span> {lead.closed_date ? format(new Date(lead.closed_date), 'dd/MM/yyyy') : '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>פעולה הבאה:</span> {lead.next_action || '-'}</div>
                                <div><span style={{ color: '#6b7280' }}>תאריך פעולה הבאה:</span> {lead.next_action_date ? format(new Date(lead.next_action_date), 'dd/MM/yyyy') : '-'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Third Row: Status, Notes, Tags */}
                          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                              <div style={{ fontSize: '13px' }}>
                                <h4 style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                  סטטוס ושיוך
                                </h4>
                                <div style={{ display: 'grid', gap: '6px' }}>
                                  <div><span style={{ color: '#6b7280' }}>סטטוס:</span> {lead.status}</div>
                                  <div><span style={{ color: '#6b7280' }}>עדיפות:</span> {lead.priority || '-'}</div>
                                  <div><span style={{ color: '#6b7280' }}>שלב:</span> {lead.stage || '-'}</div>
                                  <div><span style={{ color: '#6b7280' }}>איכות:</span> {lead.lead_quality || '-'}</div>
                                  <div><span style={{ color: '#6b7280' }}>ציון:</span> {lead.lead_score || 0}</div>
                                  <div><span style={{ color: '#6b7280' }}>משויך ל:</span> {lead.assigned_to || 'לא משויך'}</div>
                                  <div><span style={{ color: '#6b7280' }}>כמות שיחות:</span> {lead.conversation_count || 0}</div>
                                </div>
                              </div>

                              <div style={{ fontSize: '13px' }}>
                                <h4 style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '12px', borderBottom: '1px solid #d1d5db', paddingBottom: '4px' }}>
                                  הערות ותגיות
                                </h4>
                                {lead.tags.length > 0 && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>תגיות: </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                      {lead.tags.map((tag, idx) => (
                                        <span key={idx} style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{tag}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {lead.notes && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <span style={{ color: '#6b7280' }}>הערות: </span>
                                    <p style={{ marginTop: '4px', background: '#f3f4f6', padding: '12px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>{lead.notes}</p>
                                  </div>
                                )}
                                {lead.custom_fields && (
                                  <div>
                                    <span style={{ color: '#6b7280' }}>שדות מותאמים: </span>
                                    <pre style={{ marginTop: '4px', background: '#f3f4f6', padding: '8px', borderRadius: '4px', fontSize: '11px', overflow: 'auto' }}>
                                      {JSON.stringify(lead.custom_fields, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => router.push(`/admin/bot-leads/${lead.id}`)}
                              style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              ערוך ליד
                            </button>
                            <button
                              style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              שלח הודעה
                            </button>
                            <button
                              style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              שנה סטטוס
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
