'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { X, UserPlus, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

type AddContactToClientModalProps = {
  isOpen: boolean;
  clientId: string;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
};

type UserSearchResult = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
};

export default function AddContactToClientModal({
  isOpen,
  clientId,
  clientName,
  onClose,
  onSuccess,
}: AddContactToClientModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [role, setRole] = useState('contact');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isBillingContact, setIsBillingContact] = useState(false);
  const [isTechnicalContact, setIsTechnicalContact] = useState(false);
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const { searchUsersForContact } = await import('@/app/actions/business-clients');
      const result = await searchUsersForContact(clientId, searchTerm);
      
      if (result.ok && result.users) {
        setSearchResults(result.users);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useBackButtonClose(isOpen, onClose);
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUserId) {
      setError('יש לבחור משתמש');
      return;
    }

    startTransition(async () => {
      try {
        const { addContactToClient } = await import('@/app/actions/business-clients');
        
        const result = await addContactToClient(clientId, {
          user_id: selectedUserId,
          role,
          title: title.trim() || undefined,
          department: department.trim() || undefined,
          is_primary: isPrimary,
          is_billing_contact: isBillingContact,
          is_technical_contact: isTechnicalContact,
        });

        if (!result.ok) {
          setError(result.error || 'שגיאה בהוספת איש קשר');
          return;
        }

        onSuccess();
        onClose();
      } catch (err) {
        console.error('Failed to add contact:', err);
        setError('שגיאה לא צפויה');
      }
    });
  };

  const resetForm = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedUserId('');
    setRole('contact');
    setTitle('');
    setDepartment('');
    setIsPrimary(false);
    setIsBillingContact(false);
    setIsTechnicalContact(false);
    setError('');
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const selectedUser = searchResults.find((u) => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">הוספת איש קשר</h2>
              <p className="text-sm text-gray-500">{clientName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Search User */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              חיפוש משתמש
            </div>
            
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="חפש לפי שם או מייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isPending}
                className="pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedUserId === user.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 text-right">
                      <p className="font-medium text-gray-900">{user.full_name || 'ללא שם'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    {selectedUserId === user.id && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchTerm.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-sm text-gray-500 text-center py-4">לא נמצאו משתמשים</p>
            )}
          </div>

          {/* Selected User */}
          {selectedUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">משתמש נבחר:</p>
              <div className="flex items-center gap-3">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Details */}
          {selectedUser && (
            <>
              <div className="space-y-4">
                <div className="text-sm font-semibold text-gray-700 border-b pb-2">
                  פרטי איש קשר
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">תפקיד במערכת</Label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={isPending}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="contact">איש קשר</option>
                      <option value="primary">איש קשר ראשי</option>
                      <option value="billing">חיובים</option>
                      <option value="technical">טכני</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="title">תפקיד בחברה</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="לדוגמה: מנכ״ל, מנהל IT"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isPending}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="department">מחלקה</Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="לדוגמה: IT, שיווק, כספים"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isPending}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-700 border-b pb-2">
                  הגדרות נוספות
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isPrimary"
                    checked={isPrimary}
                    onCheckedChange={(checked: boolean) => setIsPrimary(checked as boolean)}
                    disabled={isPending}
                  />
                  <Label htmlFor="isPrimary" className="cursor-pointer">
                    איש קשר ראשי
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isBillingContact"
                    checked={isBillingContact}
                    onCheckedChange={(checked: boolean) => setIsBillingContact(checked as boolean)}
                    disabled={isPending}
                  />
                  <Label htmlFor="isBillingContact" className="cursor-pointer">
                    איש קשר לחיובים
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isTechnicalContact"
                    checked={isTechnicalContact}
                    onCheckedChange={(checked: boolean) => setIsTechnicalContact(checked as boolean)}
                    disabled={isPending}
                  />
                  <Label htmlFor="isTechnicalContact" className="cursor-pointer">
                    איש קשר טכני
                  </Label>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isPending || !selectedUserId} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מוסיף...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  הוסף איש קשר
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
