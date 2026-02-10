'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, Users, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddBusinessClientModal from '@/components/admin/AddBusinessClientModal';
import AddContactToClientModal from '@/components/admin/AddContactToClientModal';
import AddOrganizationToClientModal from '@/components/admin/AddOrganizationToClientModal';
import ManageBillingModal from '@/components/admin/ManageBillingModal';
import ApplyCouponModal from '@/components/admin/ApplyCouponModal';
import ExtendTrialModal from '@/components/admin/ExtendTrialModal';
import EditBusinessClientModal from '@/components/admin/EditBusinessClientModal';
import EditOrganizationModal from '@/components/admin/EditOrganizationModal';

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
  contacts: any[];
  organizations: any[];
};

export default function BusinessClientsClient() {
  const [clients, setClients] = useState<BusinessClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClientForContact, setSelectedClientForContact] = useState<BusinessClient | null>(null);
  const [selectedClientForOrg, setSelectedClientForOrg] = useState<BusinessClient | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Billing modals
  const [selectedOrgForBilling, setSelectedOrgForBilling] = useState<any | null>(null);
  const [selectedOrgForCoupon, setSelectedOrgForCoupon] = useState<any | null>(null);
  const [selectedOrgForTrial, setSelectedOrgForTrial] = useState<any | null>(null);
  
  // Edit modals
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<BusinessClient | null>(null);
  const [selectedOrgForEdit, setSelectedOrgForEdit] = useState<any | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { getBusinessClients } = await import('@/app/actions/business-clients');
      const result = await getBusinessClients({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });

      if (result.ok && result.clients) {
        setClients(result.clients);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadClients();
  };

  const handleAddClientSuccess = () => {
    loadClients();
  };

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(expandedClientId === clientId ? null : clientId);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">לקוחות עסקיים</h1>
          <p className="text-sm text-gray-500 mt-1">
            ניהול חברות וארגונים עסקיים (B2B)
          </p>
        </div>
        <Button onClick={() => setIsAddClientModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          הוסף לקוח עסקי
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="חיפוש לפי שם חברה, מייל, ח.פ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setTimeout(loadClients, 100);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">כל הסטטוסים</option>
            <option value="active">פעיל</option>
            <option value="inactive">לא פעיל</option>
            <option value="suspended">מושעה</option>
          </select>
          <Button onClick={handleSearch} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            חפש
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">סה״כ לקוחות</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">אנשי קשר</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.reduce((sum, c) => sum + c.contacts.length, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ארגונים</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.reduce((sum, c) => sum + c.organizations.length, 0)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">פעילים</p>
              <p className="text-2xl font-bold text-gray-900">
                {clients.filter((c) => c.status === 'active').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">אין לקוחות עסקיים</h3>
            <p className="text-gray-500 mb-4">התחל על ידי יצירת לקוח עסקי ראשון</p>
            <Button onClick={() => setIsAddClientModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              הוסף לקוח עסקי
            </Button>
          </div>
        ) : (
          clients.map((client) => {
            const isExpanded = expandedClientId === client.id;
            const primary = primaryContact(client);

            return (
              <div key={client.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Client Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(client.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">{client.company_name}</h3>
                        {client.company_name_en && (
                          <span className="text-sm text-gray-500">({client.company_name_en})</span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            client.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {client.status === 'active' ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {client.business_number && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">ח.פ/עוסק:</span>
                            <span>{client.business_number}</span>
                          </div>
                        )}
                        {client.industry && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">תחום:</span>
                            <span>{client.industry}</span>
                          </div>
                        )}
                        {client.company_size && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">גודל:</span>
                            <span>{client.company_size} עובדים</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
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

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForEdit(client);
                        }}
                      >
                        ✏️ ערוך
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForContact(client);
                        }}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        הוסף איש קשר
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientForOrg(client);
                        }}
                        disabled={client.contacts.length === 0}
                      >
                        <Building2 className="w-4 h-4 mr-1" />
                        הוסף ארגון
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Contact Info */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">פרטי התקשרות</h4>
                        <div className="space-y-2 text-sm">
                          {client.primary_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <a href={`mailto:${client.primary_email}`} className="text-blue-600 hover:underline">
                                {client.primary_email}
                              </a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {client.website}
                              </a>
                            </div>
                          )}
                          {client.address_city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{client.address_city}</span>
                            </div>
                          )}
                        </div>

                        {primary && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="font-medium text-gray-900 mb-2">איש קשר ראשי</h5>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{primary.user?.full_name || 'ללא שם'}</p>
                                <p className="text-sm text-gray-500">{primary.user?.email}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Organizations */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">ארגונים ({client.organizations.length})</h4>
                        {client.organizations.length === 0 ? (
                          <p className="text-sm text-gray-500">אין ארגונים</p>
                        ) : (
                          <div className="space-y-3">
                            {client.organizations.map((org: any) => (
                              <div key={org.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{org.name}</p>
                                    <p className="text-xs text-gray-500">{org.slug}</p>
                                    {org.subscription_plan && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        {org.subscription_plan.toUpperCase()} • {org.seats_allowed || 5} מקומות
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      org.subscription_status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : org.subscription_status === 'trial'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {org.subscription_status === 'active' ? 'פעיל' : org.subscription_status === 'trial' ? 'ניסיון' : 'מבוטל'}
                                  </span>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForEdit(org);
                                    }}
                                    className="text-xs"
                                  >
                                    ✏️ ערוך
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForBilling(org);
                                    }}
                                    className="text-xs"
                                  >
                                    💰 חיובים
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrgForCoupon(org);
                                    }}
                                    className="text-xs"
                                  >
                                    🎟️ קופון
                                  </Button>
                                  {org.subscription_status === 'trial' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOrgForTrial(org);
                                      }}
                                      className="text-xs"
                                    >
                                      ⏱️ הארכה
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
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
          organizationName={selectedOrgForBilling.name}
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
          organizationName={selectedOrgForCoupon.name}
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
          organizationName={selectedOrgForTrial.name}
          currentTrial={{
            trial_start_date: selectedOrgForTrial.trial_start_date,
            trial_days: selectedOrgForTrial.trial_days,
            trial_extended_days: selectedOrgForTrial.trial_extended_days,
            trial_end_date: selectedOrgForTrial.trial_end_date,
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

      {selectedOrgForEdit && (
        <EditOrganizationModal
          isOpen={true}
          organization={selectedOrgForEdit}
          onClose={() => setSelectedOrgForEdit(null)}
          onSuccess={() => {
            setSelectedOrgForEdit(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}
