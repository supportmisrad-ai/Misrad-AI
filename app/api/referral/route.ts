import { NextRequest, NextResponse } from 'next/server';

/**
 * Save partner referral code to cookie
 * Called when a user visits with ?ref=PARTNER_CODE
 * The cookie is read later during workspace provisioning
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');

  if (!ref || ref.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
  }

  const refCode = ref.trim().toUpperCase();

  // Create response with cookie
  const response = NextResponse.json({ 
    success: true, 
    ref: refCode,
    message: 'Referral code saved' 
  });

  // Set cookie for 30 days
  response.cookies.set('partner_ref', refCode, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

/**
 * Clear partner referral cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Referral cookie cleared' });
  response.cookies.delete('partner_ref');
  return response;
}
