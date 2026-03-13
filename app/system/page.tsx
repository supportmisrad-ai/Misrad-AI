import { redirect } from 'next/navigation';
import { checkAITowerAccess } from '@/lib/ai/ai-tower-guard';
import SystemOSLandingPage from './SystemOSPageClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SystemPage() {
  // 🏛️ בדיקה האם משתמש זכאי ל-AI Tower
  const aiTowerAccess = await checkAITowerAccess();
  
  if (aiTowerAccess.granted) {
    // ✅ יש גישה - מפנה למגדל שמירה
    redirect('/admin/ai-tower');
  }
  
  // ❌ אין גישה - מציג דף מערכת רגיל
  return <SystemOSLandingPage />;
}
