import 'server-only';

/**
 * AI Truth Enforcement Module
 * 
 * Central mechanism to prevent AI hallucinations across the entire system.
 * Every AI prompt that generates reports/analysis MUST use these utilities.
 * 
 * PRINCIPLES:
 * 1. AI must ONLY reference data explicitly provided in the prompt
 * 2. If data is missing, AI must say "לא זמין" — never fabricate
 * 3. Every insight must include confidence level
 * 4. Numerical claims must be traceable to source data
 * 5. dataSource field must accompany every metric
 */

/**
 * System instruction prefix that enforces truth in all AI outputs.
 * Append this to EVERY system prompt that generates reports or analysis.
 */
export const TRUTH_ENFORCEMENT_SYSTEM_PREFIX = `
כללי ברזל — כפיית אמת:
1. בסס את כל הניתוח אך ורק על הנתונים שסופקו לך. אסור להמציא מספרים, אחוזים, שמות או עובדות.
2. אם נתון חסר — כתוב "לא זמין" או "אין מידע מספיק". לעולם אל תנחש.
3. אם ערך הוא 0 — אמור "אין נתונים לתקופה זו" ולא "ירידה של 100%".
4. לכל תובנה, ציין רמת ביטחון: גבוהה (מבוסס על נתונים ברורים), בינונית (מבוסס על מגמה חלקית), נמוכה (הערכה כללית).
5. אל תשתמש בביטויים כמו "מחקרים מראים", "על פי הנתונים" אלא אם הנתונים באמת סופקו לך.
6. כשאתה מציע המלצה — הסבר על אילו נתונים היא מבוססת.
7. אל תציג מספרים עגולים (כמו "50%", "100 לקוחות") אלא אם הם המספרים המדויקים מהנתונים.
`.trim();

/**
 * Validates that an AI-generated report doesn't contain fabricated data.
 * Checks for common hallucination patterns.
 */
export function validateReportTruthfulness(
  aiOutput: unknown,
  providedData: Record<string, unknown>
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const outputStr = JSON.stringify(aiOutput || '').toLowerCase();
  const dataStr = JSON.stringify(providedData || '').toLowerCase();

  // Check for fabricated research references
  const fabricatedRefs = [
    'מחקרים מראים',
    'על פי סקר',
    'לפי דוח',
    'research shows',
    'according to',
    'studies indicate',
    'industry average',
    'ממוצע בתעשייה',
  ];

  for (const ref of fabricatedRefs) {
    if (outputStr.includes(ref) && !dataStr.includes(ref)) {
      warnings.push(`AI referenced external data not in prompt: "${ref}"`);
    }
  }

  // Check for suspiciously round percentages that don't match input
  const roundPercentages = outputStr.match(/\b(10|20|30|40|50|60|70|80|90|100)%/g);
  if (roundPercentages && roundPercentages.length > 2) {
    warnings.push(`AI used ${roundPercentages.length} suspiciously round percentages — verify against source data`);
  }

  // Check for future predictions without basis
  const futureClaims = [
    'צפוי',
    'יגדל',
    'יעלה',
    'ירד',
    'יצמח',
    'projected',
    'expected to',
    'will increase',
    'will decrease',
  ];

  let futureClaimCount = 0;
  for (const claim of futureClaims) {
    if (outputStr.includes(claim)) futureClaimCount++;
  }
  if (futureClaimCount > 3) {
    warnings.push(`AI made ${futureClaimCount} future predictions — ensure each is backed by trend data`);
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Wraps data for AI prompt with explicit source labels.
 * This makes it harder for AI to confuse provided data with fabricated data.
 */
export function labelDataForPrompt(data: Record<string, unknown>): string {
  const lines: string[] = ['=== נתונים מאומתים מהמערכת (DB) ==='];

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      lines.push(`${key}: לא זמין`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${subKey}: ${subValue ?? 'לא זמין'}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('=== סוף נתונים מאומתים ===');
  lines.push('חשוב: כל מספר שלא מופיע למעלה — אסור לציין בדוח.');

  return lines.join('\n');
}

/**
 * Post-processes AI report output to add truth markers.
 */
export function addTruthMarkers(report: {
  summary?: string;
  insights?: Array<{ title?: string; description?: string; confidence?: string }>;
}): typeof report & { truthEnforced: boolean; generatedAt: string } {
  return {
    ...report,
    truthEnforced: true,
    generatedAt: new Date().toISOString(),
  };
}
