/**
 * MISRAD AI WhatsApp Bot - Excel Generator
 * Usage: node scripts/generate-whatsapp-bot.cjs
 * Output: bot/misrad-ai-whatsapp-bot.xlsx
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const HEADERS = [
  'Active','Rule','Response','Files','Action','Delay','Delay Type',
  'Notification Numbers','Notification Message','Cooling-off','Contains',
  'Date','Time','Anchor','Follow Up','Variable','Reminder','Reminder Type',
  'Not','Webhook','Color','Preview','Quote','Campaign','Campaign Type',
  'Score Min','Score Max','Score Reset','Score Rule','Visual Position'
];

function R(rule, response, o = {}) {
  return [
    o.off ? 'off' : '', rule, response, o.files||'', o.action||'',
    o.delay||0, o.dt||'S', o.notifNums||'', o.notifMsg||'',
    o.cool||0, o.contains||'', o.date||'', o.time||'',
    o.anchor||'', o.followUp||'', o.variable||'',
    o.reminder||'', o.remType||'', o.not||'', o.webhook||'',
    o.color||'', o.preview||'', o.quote||'', o.campaign||'', o.campType||'',
    0, '0|0', '', '', o.pos||'0|0'
  ];
}

function SEP(pos) { return R('------------------------------', ' ', { pos }); }

function L({ h, d, f, btn, secs }) {
  const lines = [`header:\`${h||''}\`\\`, `description:\`${d||''}\`\\`,
    `footer:\`${f||''}\`\\`, `buttonText:\`${btn||''}\`\\`, 'sections:<'];
  for (const s of secs) {
    lines.push('(list)', `title:\`${s.t||''}\`\\`, 'rows:<');
    for (const i of s.i) {
      lines.push('(item)', `title:\`${i[0]}\`\\`, `description:\`${i[1]||''}\``, '(/item)');
    }
    lines.push('>', '(/list)');
  }
  return lines.join('\n');
}

const WH_SIGNUP  = 'https://hook.eu1.make.com/REPLACE_SIGNUP_WEBHOOK';
const WH_DEMO    = 'https://hook.eu1.make.com/REPLACE_DEMO_WEBHOOK';
const WH_SUPPORT = 'https://hook.eu1.make.com/REPLACE_SUPPORT_WEBHOOK';

// Load rules from separate data file
const rules = require('./whatsapp-bot-rules.cjs');

// Build workbook
const data = [HEADERS, ...rules.map(r => r)];
const ws = XLSX.utils.aoa_to_sheet(data);

// Set column widths
ws['!cols'] = HEADERS.map((h, i) => {
  if (i === 1) return { wch: 45 };  // Rule
  if (i === 2) return { wch: 80 };  // Response
  if (i === 15) return { wch: 30 }; // Variable
  if (i === 19) return { wch: 50 }; // Webhook
  return { wch: 15 };
});

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Bot Rules');

const outDir = path.join(__dirname, '..', 'bot');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'misrad-ai-whatsapp-bot.xlsx');
XLSX.writeFile(wb, outFile);
console.log(`✅ Bot file created: ${outFile}`);
console.log(`   Total rules: ${rules.length}`);
