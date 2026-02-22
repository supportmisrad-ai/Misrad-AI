/**
 * Generates bot/Rules_2.rules from whatsapp-bot-rules.cjs
 * Usage: node scripts/generate-dot-rules.cjs
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const rows = require('./whatsapp-bot-rules.cjs');

// Build conceptual-number → array-index mapping
const numMap = {};
let lastNum = 0, autoInc = 0;
for (let i = 0; i < rows.length; i++) {
  const rule = rows[i][1];
  const m = rule.match(/^(\d+)##/);
  if (m) { const n = parseInt(m[1]); numMap[n] = i; lastNum = n; autoInc = 0; }
  else if (rule === '%%') { autoInc++; numMap[lastNum + autoInc] = i; }
  else if (rule.startsWith('---')) { autoInc = 0; }
}

function resolveFollows(anchorStr) {
  if (!anchorStr) return [];
  return anchorStr.split(';').map(s => numMap[parseInt(s.trim())]).filter(v => v !== undefined);
}

// Convert each row to .rules JSON object
const result = rows.map((r, i) => {
  const anchor = r[13] || '';
  const variable = r[15] || null;
  const webhook = r[19] || '';
  const isOff = r[0] === 'off';
  const containsVal = (r[10] === 'contains');
  const reminder = r[16] ? parseInt(r[16]) : -1;
  const remType = r[17] === 'M' ? 1 : -1;

  return {
    sendByDate: false,
    Rule: r[1],
    response: r[2],
    Delay: r[5] || 0,
    DelayType: 0,
    notification: false,
    not_numbers: [''],
    not_message: '',
    files: [],
    contains: containsVal,
    image_caption: false,
    follow_index: resolveFollows(anchor),
    var_index: -1,
    followAfterDelay: reminder > 0 ? reminder : -1,
    followAfterDelayType: reminder > 0 ? remType : -1,
    Cooldown: r[9] || 0,
    _Date: new Date().toISOString().split('.')[0],
    Color: 'White',
    CustomColor: false,
    IsGif: false,
    extra: {
      _IsSticker: false, _Isrecording: false,
      AutoLinkPreview: false, FilesBeforeText: false,
      ThirdPartyPreMessage: true,
      Active: !isOff,
      SendWebhook: !!webhook,
      Webhook: webhook,
      RuleId: randomUUID(),
      Campaign: null, CampaignOption: 0,
      CooldownAsCounter: false,
      Quote: false, AsPtv: false, Anchor: false,
      ResetVarsAfterWebhook: false, DontModifyLastRule: false,
      AICooldown: 0, UnregisterOlderMessages: false,
      ResetScore: false, AddToScore: 0,
      AnswerIfScore: false, AnswerScoreMin: 0, AnswerScoreMax: 0,
      Variable: variable || null
    }
  };
});

const outDir = path.join(__dirname, '..', 'bot');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'Rules_2.rules');
const BOM = '\uFEFF';
fs.writeFileSync(outFile, BOM + JSON.stringify(result), 'utf8');
console.log(`✅ Rules file created: ${outFile}`);
console.log(`   Total rules: ${result.length}`);
console.log(`   Number mapping entries: ${Object.keys(numMap).length}`);
