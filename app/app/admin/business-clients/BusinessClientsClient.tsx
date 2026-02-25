'use client';

import React, { useState, useEffect } from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import { Building2, Plus, Search, Filter, Users, Mail, Phone, Globe, MapPin, UserCog, Pencil, Banknote, Ticket, TimerReset, RefreshCw, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddBusinessClientModal from '@/components/admin/AddBusinessClientModal';
import AddContactToClientModal from '@/components/admin/AddContactToClientModal';
import AddOrganizationToClientModal from '@/components/admin/AddOrganizationToClientModal';
import ManageBillingModal from '@/components/admin/ManageBillingModal';
import ApplyCouponModal from '@/components/admin/ApplyCouponModal';
import ExtendTrialModal from '@/components/admin/ExtendTrialModal';
import EditBusinessClientModal from '@/components/admin/EditBusinessClientModal';
import EditContactModal from '@/components/admin/EditContactModal';
import { asObject } from '@/lib/shared/unknown';
import { getBusinessClients, removeContactFromClient, syncOrganizationsToBusinessClients, backfillUnlinkedOrganizations, deleteBusinessClient } from '@/app/actions/business-clients';

type BusinessContact = {
  id?: string;
  user_id: string;
  is_primary?: boolean;
  is_billing_contact?: boolean;
  is_technical_contact?: boolean;
  title?: string | null;
  role?: string;
  department?: string | null;
  user?: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };
  [key: string]: unknown;
};

type BusinessOrg = {
  id: string;
  name?: string;
  slug?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  billing_cycle?: string | null;
  seats_allowed?: number | null;
  active_users_count?: number | null;
  billing_email?: string | null;
  payment_method_id?: string | null;
  mrr?: number | null;
  arr?: number | null;
  next_billing_date?: string | Date | null;
  trial_start_date?: string | Date | null;
  trial_days?: number | null;
  trial_extended_days?: number | null;
  trial_end_date?: string | Date | null;
  created_at?: Date | null;
  [key: string]: unknown;
};

type BusinessClient = {
  id: string;
  company_name: string;
  company_name_en: string | null;
  business_number: string | null;
  primary_email: string;
  phone: string | null;
  website: string | null;
  address_city: string | null;
  industry: string | null;
  company_size: string | null;
  status: string;
  lifecycle_stage: string;
  created_at: Date;
  contacts: BusinessContact[];
  organizations: BusinessOrg[];
  [key: string]: unknown;
};

export default function BusinessClientsClient({ initialClients }: { initialClients?: BusinessClient[] }) {
  const [clients, setClients] = useState<BusinessClient[]>(initialClients ?? []);
  const [loading, setLoading] = useState(!initialClients?.length);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClientForContact, setSelectedClientForContact] = useState<BusinessClient | null>(null);
  const [selectedClientForOrg, setSelectedClientForOrg] = useState<BusinessClient | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Billing modals
  const [selectedOrgForBilling, setSelectedOrgForBilling] = useState<BusinessOrg | null>(null);
  const [selectedOrgForCoupon, setSelectedOrgForCoupon] = useState<BusinessOrg | null>(null);
  const [selectedOrgForTrial, setSelectedOrgForTrial] = useState<BusinessOrg | null>(null);
  
  // Edit modals
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<BusinessClient | null>(null);
  const [selectedContactForEdit, setSelectedContactForEdit] = useState<{ contact: BusinessContact; clientId: string; clientName: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  useEffect(() => {
    if (initialClients?.length) return;
    loadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBusinessClients({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      if (result.ok && result.clients) {
        setClients(result.clients);
      } else if (!result.ok && 'error' in result) {
        setError(String(result.error));
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('שגיאה בטעינת לקוחות עסקיים');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleSearch = () => {
    loadClients();
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      // First: backfill (no auth needed, catches everything)
      const backfilled = await backfillUnlinkedOrganizations().catch(() => 0);
      // Second: full sync (needs admin auth, adds richer data)
      const result = await syncOrganizationsToBusinessClients();
      if (result.ok) {
        const totalLinked = (result.linked || 0) + (backfilled || 0);
        setSyncMessage(
          totalLinked > 0 || result.created > 0
            ? `נוצרו ${result.created} לקוחות עסקיים חדשים, קושרו ${totalLinked} ארגונים`
            : 'הכל מסונכרן — לא נמצאו ארגונים חסרים'
        );
        await loadClients();
      } else if ('error' in result) {
        // Auth-gated sync failed but backfill may have worked
        if (backfilled > 0) {
          setSyncMessage(`קושרו ${backfilled} ארגונים (סנכרון חלקי)`);
          await loadClients();
        } else {
          setError(String(result.error));
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setError('שגיאה בסנכרון');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddClientSuccess = () => {
    loadClients();
  };

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
  };


  const handleRemoveContact = async (clientId: string, userId: string) => {
    try {
      const result = await removeContactFromClient(clientId, userId);
      if (result.ok) {
        loadClients();
      }
    } catch (error) {
      console.error('Failed to remove contact:', error);
    }
  };

  const handleDeleteClient = async (client: BusinessClient) => {
    if (!window.confirm(`למחוק את הלקוח העסקי "${client.company_name}"?\nפעולה זו תסיר אותו מהרשימה (מחיקה רכה).`)) return;
    setDeletingClientId(client.id);
    try {
      const result = await deleteBusinessClient(client.id);
      if (result.ok) {
        setClients((prev) => prev.filter((c) => c.id !== client.id));
      } else if ('error' in result) {
        setError(String(result.error));
      }
    } catch (err) {
      console.error('Failed to delete client:', err);
      setError('שגיאה במחיקת לקוח עסקי');
    } finally {
      setDeletingClientId(null);
    }
  };

  const primaryContact = (client: BusinessClient) => {
    return client.contacts.find((c) => c.is_primary) || client.contacts[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      <AdminPageHeader
        title="לקוחות עסקיים"
        subtitle="ניהול חברות וארגונים עסקיים (B2B)"
        icon={Building2}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSync} variant="outline" disabled={isSyncing} className="w-full sm:w-auto shadow-sm">
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              סנכרן מארגונים
            </Button>
            <Button onClick={() => setIsAddClientModalOpen(true)} className="w-full sm:w-auto shadow-sm">
              <Plus className="w-4 h-4" />
              הוסף לקוח עסקי
            </Button>
          </div>
        }
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-red-600 hover:bg-red-100">
            סגור
          </Button>
        </div>
      )}

      {/* Sync Success Message */}
      {syncMessage && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 flex-1">{syncMessage}</p>
          <Button variant="ghost" size="sm" onClick={() => setSyncMessage(null)} className="text-green-600 hover:bg-green-100">
            סגור
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            <Input
              type="text"
              placeholder="חיפוש לפי שם חברה, מייל, ח.פ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-10 h-11 text-right"
              dir="rtl"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setTimeout(loadClients, 100);
            }}
            placeholder="כל הסטטוסים"
            options={[
              { value: 'active', label: 'פעיל' },
              { value: 'inactive', label: 'לא פעיל' },
              { value: 'suspended', label: 'מושעה' },
            ]}
          />
          <Button onClick={handleSearch} variant="outline" className="h-11">
            <Filter className="w-4 h-4 ml-2" />
            חפש
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">סה״כ לקוחות</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl shrink-0">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">אנשי קשר</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {clients.reduce((sum, c) => sum + c.contacts.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl shrink-0">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">ארגונים</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {clients.reduce((sum, c) => sum + c.organizations.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl shrink-0">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">ארגונים פעילים</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">
                {clients.reduce((sum, c) => sum + c.organizations.filter((o) => o.subscription_status === 'active').length, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4">
                <Building2 className="w-16 h-16 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">אין לקוחות עסקיים</h3>
              <p className="text-slate-600 mb-4">אם יש לך כבר ארגונים במערכת, לחץ על סנכרון כדי לייבא אותם כלקוחות עסקיים.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleSync} size="lg" disabled={isSyncing}>
                  {isSyncing ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5 ml-2" />
                  )}
                  {isSyncing ? 'מסנכרן...' : 'סנכרן מארגונים קיימים'}
                </Button>
                <Button onClick={() => setIsAddClientModalOpen(true)} size="lg" variant="outline">
                  <Plus className="w-5 h-5 ml-2" />
                  הוסף לקוח עסקי ידנית
                </Button>
              </div>
            </div>
          </div>
        ) : (
          clients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const primary = primaryContact(client);

            return (
              <div key={client.id} className="bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow">
                {/* Client Header */}
                <div
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(client.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">{client.company_name}</h3>
                        {client.company_name_en && (
                          <span className="text-sm text-slate-500">({client.company_name_en})</span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            client.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {client.status === 'active' ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        {client.business_number && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-medium">ח.פ/עוסק:</span>
                            <span>{client.business_number}</span>
                          </div>
                        )}
                        {client.industry && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-medium">תחום:</span>
                            <span>{client.industry}</span>
                          </div>
                        )}
                        {client.company_size && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="font-medium">גודל:</span>
                            <span>{client.company_size} עובדים</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-3 text-xs sm:text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{client.contacts.length} אנשי קשר</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{client.organizations.length} ארגונים</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForEdit(client);
                        }}
                        className="text-xs h-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        ערוך
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClient(client);
                        }}
                        disabled={deletingClientId === client.id}
                        className="text-xs h-8 text-red-600 hover:bg-red-50 border-red-200"
                      >
                        {deletingClientId === client.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        מחק
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForContact(client);
                        }}
                        className="text-xs h-8"
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">הוסף </span>איש קשר
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForOrg(client);
                        }}
                        disabled={client.contacts.length === 0}
                        className="text-xs h-8"
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">הוסף </span>ארגון
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 sm:p-6 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Contact Info */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">פרטי התקשרות</h4>
                        <div className="space-y-2 text-sm">
                          {client.primary_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a href={`mailto:${client.primary_email}`} className="text-blue-600 hover:underline">
                                {client.primary_email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-slate-400" />
                              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {client.website}
                              </a>
                            </div>
                          )}
                          {client.address_city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span>{client.address_city}</span>
                            </div>
                          )}
                        </div>

                        {/* All Contacts List */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h5 className="font-medium text-slate-900 mb-2">אנשי קשר ({client.contacts.length})</h5>
                          {client.contacts.length === 0 ? (
                            <p className="text-sm text-slate-400">אין אנשי קשר</p>
                          ) : (
                            <div className="space-y-2">
                              {client.contacts.map((contact: BusinessContact) => (
                                <div key={contact.user_id} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg">
                                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{contact.user?.full_name || 'ללא שם'}</p>
                                    <p className="text-xs text-slate-500 truncate">{contact.user?.email}</p>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                      {contact.is_primary && <span className="px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">ראשי</span>}
                                      {contact.is_billing_contact && <span className="px-1 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">חיובים</span>}
                                      {contact.is_technical_contact && <span className="px-1 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">טכני</span>}
                                      {contact.title && <span className="text-xs text-slate-400">{contact.title}</span>}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedContactForEdit({ contact, clientId: client.id, clientName: client.company_name });
                                      }}
                                      className="h-7 w-7 p-0"
                                      title="ערוך איש קשר"
                                    >
                                      <UserCog className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`למחוק את ${contact.user?.full_name || 'איש קשר'} מ-${client.company_name}?`)) {
                                          handleRemoveContact(client.id, contact.user_id);
                                        }
                                      }}
                                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                      title="הסר איש קשר"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Organizations */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3">ארגונים ({client.organizations.length})</h4>
                        {client.organizations.length === 0 ? (
                          <p className="text-sm text-slate-500">אין ארגונים</p>
                        ) : (
                          <div className="space-y-3">
                            {client.organizations.map((org: unknown) => {
                              const o = asObject(org) ?? {};
                              return (
                              <div key={String(o.id || '')} className="bg-white border border-slate-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{String(o.name || '')}</p>
                                    <p className="text-xs text-slate-500">{String(o.slug || '')}</p>
                                    {Boolean(o.subscription_plan) && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        {String(o.subscription_plan || '').toUpperCase()} • {Number(o.seats_allowed) || 5} מקומות
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      o.subscription_status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : o.subscription_status === 'trial'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {o.subscription_status === 'active' ? 'פעיל' : o.subscription_status === 'trial' ? 'ניסיון' : 'מבוטל'}
                                  </span>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `/app/admin/organizations/${String(o.id || '')}`;
                                    }}
                                    className="text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    נהל ארגון
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForBilling(o as BusinessOrg);
                                    }}
                                    className="text-xs"
                                  >
                                    <Banknote className="w-3.5 h-3.5" />
                                    חיובים
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForCoupon(o as BusinessOrg);
                                    }}
                                    className="text-xs"
                                  >
                                    <Ticket className="w-3.5 h-3.5" />
                                    קופון
                                  </Button>
                                  {o.subscription_status === 'trial' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrgForTrial(o as BusinessOrg);
                                      }}
                                      className="text-xs"
                                    >
                                      <TimerReset className="w-3.5 h-3.5" />
                                      הארכה
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AddBusinessClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSuccess={handleAddClientSuccess}
      />

      {selectedClientForContact && (
        <AddContactToClientModal
          isOpen={true}
          clientId={selectedClientForContact.id}
          clientName={selectedClientForContact.company_name}
          onClose={() => setSelectedClientForContact(null)}
          onSuccess={() => {
            setSelectedClientForContact(null);
            loadClients();
          }}
        />
      )}

      {selectedClientForOrg && (
        <AddOrganizationToClientModal
          isOpen={true}
          clientId={selectedClientForOrg.id}
          clientName={selectedClientForOrg.company_name}
          primaryContactUserId={primaryContact(selectedClientForOrg)?.user_id || null}
          onClose={() => setSelectedClientForOrg(null)}
          onSuccess={() => {
            setSelectedClientForOrg(null);
            loadClients();
          }}
        />
      )}

      {/* Billing Modals */}
      {selectedOrgForBilling && (
        <ManageBillingModal
          isOpen={true}
          organizationId={selectedOrgForBilling.id}
          organizationName={selectedOrgForBilling.name || ''}
          currentBilling={{
            subscription_plan: selectedOrgForBilling.subscription_plan,
            billing_cycle: selectedOrgForBilling.billing_cycle,
            seats_allowed: selectedOrgForBilling.seats_allowed,
            active_users_count: selectedOrgForBilling.active_users_count,
            billing_email: selectedOrgForBilling.billing_email,
            payment_method_id: selectedOrgForBilling.payment_method_id,
            mrr: selectedOrgForBilling.mrr,
            arr: selectedOrgForBilling.arr,
            next_billing_date: selectedOrgForBilling.next_billing_date,
          }}
          onClose={() => setSelectedOrgForBilling(null)}
          onSuccess={() => {
            setSelectedOrgForBilling(null);
            loadClients();
          }}
        />
      )}

      {selectedOrgForCoupon && (
        <ApplyCouponModal
          isOpen={true}
          organizationId={selectedOrgForCoupon.id}
          organizationName={selectedOrgForCoupon.name || ''}
          currentMRR={Number(selectedOrgForCoupon.mrr || 0)}
          onClose={() => setSelectedOrgForCoupon(null)}
          onSuccess={() => {
            setSelectedOrgForCoupon(null);
            loadClients();
          }}
        />
      )}

      {selectedOrgForTrial && (
        <ExtendTrialModal
          isOpen={true}
          organizationId={selectedOrgForTrial.id}
          organizationName={selectedOrgForTrial.name || ''}
          currentTrial={{
            trial_start_date: selectedOrgForTrial.trial_start_date instanceof Date ? selectedOrgForTrial.trial_start_date : selectedOrgForTrial.trial_start_date ? new Date(selectedOrgForTrial.trial_start_date) : undefined,
            trial_days: selectedOrgForTrial.trial_days,
            trial_extended_days: selectedOrgForTrial.trial_extended_days,
            trial_end_date: selectedOrgForTrial.trial_end_date instanceof Date ? selectedOrgForTrial.trial_end_date : selectedOrgForTrial.trial_end_date ? new Date(selectedOrgForTrial.trial_end_date) : undefined,
          }}
          onClose={() => setSelectedOrgForTrial(null)}
          onSuccess={() => {
            setSelectedOrgForTrial(null);
            loadClients();
          }}
        />
      )}


      {/* Edit Modals */}
      {selectedClientForEdit && (
        <EditBusinessClientModal
          isOpen={true}
          client={selectedClientForEdit}
          onClose={() => setSelectedClientForEdit(null)}
          onSuccess={() => {
            setSelectedClientForEdit(null);
            loadClients();
          }}
        />
      )}


      {selectedContactForEdit && (
        <EditContactModal
          isOpen={true}
          clientId={selectedContactForEdit.clientId}
          clientName={selectedContactForEdit.clientName}
          contact={{ ...selectedContactForEdit.contact, role: selectedContactForEdit.contact.role ?? '', title: selectedContactForEdit.contact.title ?? null, department: selectedContactForEdit.contact.department ?? null, is_primary: Boolean(selectedContactForEdit.contact.is_primary), is_billing_contact: Boolean(selectedContactForEdit.contact.is_billing_contact), is_technical_contact: Boolean(selectedContactForEdit.contact.is_technical_contact), user: { full_name: selectedContactForEdit.contact.user?.full_name ?? null, email: selectedContactForEdit.contact.user?.email ?? null } }}
          onClose={() => setSelectedContactForEdit(null)}
          onSuccess={() => {
            setSelectedContactForEdit(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}
