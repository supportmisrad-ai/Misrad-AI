/**
 * Shabbat Page
 * 
 * Standalone page for Shabbat screen
 */

import { ShabbatScreen } from '../../components/ShabbatScreen';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function ShabbatPage() {
  return <ShabbatScreen />;
}
