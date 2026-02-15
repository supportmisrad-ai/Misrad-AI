#!/usr/bin/env node
/**
 * מציאת ה-clerk_user_id שלך כדי לבדוק את ה-workspaces ב-DB
 * 
 * הרצה: node scripts/find-my-clerk-user-id.js
 */

const { auth } = require('@clerk/nextjs/server');

async function findMyClerkUserId() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ לא מחובר - התחבר דרך הדפדפן קודם');
      return;
    }
    
    console.log('\n✅ ה-Clerk User ID שלך:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(userId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 העתק את זה והחלף ב-scripts/check-my-workspaces.sql');
    console.log('   (שורה 9: WHERE clerk_user_id = \'YOUR_CLERK_USER_ID\')');
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

findMyClerkUserId();
