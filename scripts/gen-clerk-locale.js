// Generates a local heIL locale file without backticks
// that break webpack eval() in dev mode
'use strict';
const fs = require('fs');
const path = require('path');

const { heIL } = require('@clerk/localizations/he-IL');
const json = JSON.stringify(heIL, null, 2);

// Replace all backticks with single quotes
const clean = json.replace(/`/g, "'");

const outPath = path.join(__dirname, '..', 'lib', 'clerk-he-locale.ts');
const content = `// Auto-generated from @clerk/localizations v3.36.0 (he-IL)
// Backticks removed to fix webpack eval() SyntaxError in dev mode.
// Regenerate: node scripts/gen-clerk-locale.js
import type { LocalizationResource } from '@clerk/types';

export const heIL = ${clean} as unknown as LocalizationResource;
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Written:', outPath);
console.log('Size:', content.length, 'chars');
console.log('Has backticks:', content.includes('`'));
