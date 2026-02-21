/**
 * Shabbat Page
 * 
 * Standalone page for Shabbat screen
 */

import { ShabbatScreen } from '../../components/ShabbatScreen';

// Force dynamic rendering to prevent build-time errors
// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function ShabbatPage() {
  return <ShabbatScreen />;
}
