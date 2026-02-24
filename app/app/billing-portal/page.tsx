/**
 * Billing Portal - Payment Page
 *
 * Public/protected page for users whose trial has expired
 * Shows payment options and allows quick payment setup
 */

import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CreditCard, CircleCheck, Clock, Mail, Phone, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import prisma from '@/lib/prisma';

export const metadata = {
  title: 'פורטל תשלומים | Misrad AI',
  description: 'השלם את התשלום והמשך להשתמש במערכת',
};

async function getUserOrganization(clerkUserId: string) {
  try {
    const orgUser = await prisma.organizationUser.findFirst({
      where: { clerk_user_id: clerkUserId },
      select: {
        owned_organizations: {
          select: {
            id: true,
            name: true,
            mrr: true,
            subscription_status: true,
            billing_email: true,
          },
          take: 1,
        },
      },
    });

    return orgUser?.owned_organizations?.[0] || null;
  } catch (error) {
    console.error('[Billing Portal] Error fetching organization:', error);
    return null;
  }
}

export default async function BillingPortalPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/login');
  }

  const organization = await getUserOrganization(userId);

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center">
          <p className="text-gray-600 mb-4">לא נמצא ארגון</p>
          <Link href="/app/admin">
            <Button>חזרה לדף הבית</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mrr = organization.mrr ? parseFloat(String(organization.mrr)) : 0;
  const isActive = organization.subscription_status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <CreditCard className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">פורטל תשלומים</h1>
          <p className="text-lg text-gray-600">{organization.name}</p>
        </div>

        {/* Active Status Banner */}
        {isActive && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 mb-8 shadow-xl">
            <div className="flex items-center gap-4">
              <CircleCheck className="w-12 h-12 shrink-0" />
              <div>
                <h2 className="text-2xl font-black mb-1">המנוי שלך פעיל! ✨</h2>
                <p className="text-green-50">אין צורך בפעולה נוספת. תודה על האמון 🙏</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Pricing Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white">
            <p className="text-sm font-medium mb-2 opacity-90">מחיר חודשי</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-6xl font-black">₪{mrr.toFixed(0)}</span>
              <span className="text-xl opacity-80">לחודש</span>
            </div>
            <p className="mt-4 text-blue-100">כולל מע״מ | ללא התחייבות</p>
          </div>

          {/* Features */}
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 mb-4">מה כלול?</h3>
              <div className="space-y-3">
                {[
                  'גישה מלאה למערכת Misrad AI',
                  'כל המודולים שנבחרו בחבילה שלך',
                  'תמיכה טכנית מלאה',
                  'עדכונים שוטפים וחדשות',
                  'אבטחת מידע ברמה הגבוהה ביותר',
                  'גיבויים אוטומטיים יומיים',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CircleCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
              <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                אמצעי תשלום מאובטחים
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white border border-indigo-200 rounded-lg p-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">כרטיס אשראי</span>
                </div>
                <div className="bg-white border border-indigo-200 rounded-lg p-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium">העברה בנקאית</span>
                </div>
              </div>
            </div>

            {/* Contact for Payment */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-black text-gray-900 mb-3">צור קשר להשלמת תשלום</h3>
              <p className="text-sm text-gray-700 mb-4">
                צור איתנו קשר והמערכת תתחדש באופן מיידי לאחר קבלת התשלום
              </p>

              <div className="space-y-3">
                <a
                  href="mailto:support@misrad-ai.com"
                  className="flex items-center gap-3 p-4 bg-white border border-blue-200 rounded-lg hover:shadow-md transition-shadow group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600">מייל</p>
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      support@misrad-ai.com
                    </p>
                  </div>
                </a>

                <a
                  href="https://wa.me/972512239520" target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-4 bg-white border border-blue-200 rounded-lg hover:shadow-md transition-shadow group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600">טלפון</p>
                    <p className="font-bold text-gray-900 group-hover:text-green-600 transition-colors" dir="ltr">
                      051-2239520
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Direct Checkout CTA */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
              <div className="text-center mb-4">
                <h3 className="font-black text-slate-900 text-xl mb-2">מוכנים להמשיך?</h3>
                <p className="text-sm text-slate-600">השלם תשלום והמשך להשתמש במערכת באופן מיידי</p>
              </div>
              <Link href="/subscribe/checkout">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black text-lg py-6"
                >
                  <CreditCard className="w-6 h-6 ml-2" />
                  הסדר תשלום עכשיו
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: Shield, label: 'מאובטח', color: 'text-green-600' },
                { icon: Clock, label: 'זמין 24/7', color: 'text-blue-600' },
                { icon: CircleCheck, label: 'אמין', color: 'text-purple-600' },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <item.icon className={`w-8 h-8 mx-auto mb-2 ${item.color}`} />
                  <p className="text-xs font-bold text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Link href="/app/admin">
            <Button variant="outline" size="lg">
              חזרה לדף הבית
            </Button>
          </Link>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-600 mt-6">
          MISRAD AI &bull; הפסנתר 9, ראשון לציון &bull; support@misrad-ai.com
        </p>
      </div>
    </div>
  );
}
