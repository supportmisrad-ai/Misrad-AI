#!/usr/bin/env node
/**
 * Update Rules_6.rules with enhanced partner incentives
 */
const fs = require('fs');
const path = require('path');

const rulesPath = 'c:/Projects/Misrad-AI/bot/Rules_6.rules';
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Update rule 6 - Partner intro with all incentives
const rule6 = rules.find(r => r.extra?.RuleId === 'campaign-006');
if (rule6) {
  rule6.response = `header:\`*מסלול שותפי MISRAD AI* 💸\`\\
description:\`רוצה להרוויח כסף מהקשרים שלך? הנה המודל הכי משתלם שיש:

💰 *עמלה: 10% לתמיד* על כל לקוח שמביא
🎁 *בונוס התחלתי: 150₪* לכל לקוח שמשלם
🏆 *תחרות חודשית:* השותף המוביל מרוויח 1000₪ בונוס!
⭐ *בונוס נוסף:* כל 5 לקוחות = מתנה שווה 500₪

📊 *מדרגות שותפים:*
• 1-5 לקוחות: 10% + 150₪/לקוח
• 6-15 לקוחות: 15% + 200₪/לקוח
• 16+ לקוחות: 20% + 300₪/לקוח

*וגם אם אתה פרטי ולא צריך את המערכת?*
אתה עדיין יכול להרוויח! שתף עם חברים, קולגות, לקוחות — ותקבל עמלה על כל מי שנרשם דרכך. כסף קל! 💵

⏰ *הקמפיין רק עד סוף החודש!*

מוכן להתחיל?\`\\
footer:\`💡 לחץ על הכפתור למטה\`\\
buttonText:\`פעולות 👇\`\\
sections:<
(list)
title:\`שותפים\`\\
rows:<
(item)
title:\`הרשמה כשותף 📝\`\\
description:\`שלח פרטים ונחזור אליך\`
(/item)
(item)
title:\`ערכת שיווק (סרטונים ולינקים) 📁\`\\
description:\`כל מה שצריך כדי להתחיל לפרסם\`
(/item)
(item)
title:\`אני פרטי ולא צריך את המערכת 🙋\`\\
description:\`איך אני מרוויח בלי להשתמש?\`
(/item)
>
(/list)
\n`;
}

// Update rule 7 - Registration
const rule7 = rules.find(r => r.extra?.RuleId === 'campaign-007');
if (rule7) {
  rule7.response = `header:\`*הרשמה כשותף* 📝\`\\
description:\`איזה כיף שאתה איתנו! 🎉

כדי להירשם כשותף, שלח לי את הפרטים הבאים:

1️⃣ שם מלא
2️⃣ מספר טלפון
3️⃣ אימייל (לדו״חות חודשיים)
4️⃣ איך תרצה לקבל את הכסף? (העברה/פייפאל/ביט)

אחרי שתשלח, נחזור אליך עם:
• לינק אישי להפניות
• ערכת שיווק מלאה
• גישה לקהילת השותפים\`\\
footer:\`💡 שלח את הפרטים בהודעה אחת\`\\
buttonText:\`\`\\
sections:<
>
`;
}

// Add new rule for private individuals
const newRulePrivate = {
  sendByDate: false,
  Rule: "אני פרטי ולא צריך את המערכת 🙋##אני פרטי##אני לא צריך את המערכת##רק רוצה להרוויח##לא צריך מערכת",
  response: `header:\`*מעולה! גם פרטיים יכולים להרוויח* 💵\`\\
description:\`לא צריך להשתמש במערכת כדי להרוויח ממנה!

🎯 *איך זה עובד:*
1. נרשמת כשותף (שולח פרטים)
2. קיבלת לינק אישי
3. שיתפת עם חברים, קולגות, לקוחות, קהילות
4. כל מי שנרשם דרכך = עמלה ישירות אליך!

💡 *למי כדאי לשתף?*
• קבוצות וואטסאפ של עצמאים
• חברים עם עסקים קטנים
• לקוחות קודמים
• קהילות יזמים בפייסבוק
• רשתות מקצועיות בלינקדאין

💰 *כמה אפשר להרוויח?*
אם הבאת 10 לקוחות בחודש:
• עמלה: ~500-1000₪/חודש
• בונוסים: עוד 500-1500₪
• סה״כ: 1000-2500₪ בחודש!

בלי לעבוד, בלי להשתמש, רק לשתף לינק. 🚀\`\\
footer:\`💡 מוכן להירשם?\`\\
buttonText:\`בחר פעולה 👇\`\\
sections:<
(list)
title:\`הרשמה\`\\
rows:<
(item)
title:\`הרשמה כשותף 📝\`\\
description:\`שלח פרטים ונתחיל\`
(/item)
(item)
title:\`ערכת שיווק לשיתוף 📁\`\\
description:\`סרטונים וטקסטים מוכנים\`
(/item)
>
(/list)
\n`,
  Delay: 0,
  DelayType: 0,
  notification: false,
  not_numbers: [],
  not_message: "",
  files: [],
  contains: false,
  image_caption: false,
  follow_index: [],
  var_index: -1,
  followAfterDelay: -1,
  followAfterDelayType: -1,
  Cooldown: 0,
  _Date: "2026-03-14T00:00:00",
  Color: "White",
  CustomColor: false,
  IsGif: false,
  extra: {
    _IsSticker: false,
    _Isrecording: false,
    AutoLinkPreview: false,
    FilesBeforeText: false,
    ThirdPartyPreMessage: true,
    Active: true,
    SendWebhook: false,
    Webhook: "",
    RuleId: "campaign-016",
    Campaign: "Launch 2026",
    CampaignOption: 0,
    CooldownAsCounter: false,
    Quote: false,
    AsPtv: false,
    Anchor: false,
    ResetVarsAfterWebhook: false,
    DontModifyLastRule: false,
    AICooldown: 0,
    UnregisterOlderMessages: false,
    ResetScore: false,
    AddToScore: 0,
    AnswerIfScore: false,
    AnswerScoreMin: 0,
    AnswerScoreMax: 0,
    Variable: null
  }
};

// Insert before the separator (last rule)
const separatorIndex = rules.findIndex(r => r.extra?.RuleId === 'separator-001');
if (separatorIndex > 0) {
  rules.splice(separatorIndex, 0, newRulePrivate);
} else {
  rules.push(newRulePrivate);
}

// Save
fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 0), 'utf8');
console.log('✅ Rules updated successfully!');
console.log('Changes:');
console.log('  - Updated rule 6 (partner intro) with all incentives');
console.log('  - Updated rule 7 (registration) with email field');
console.log('  - Added rule 16 for private individuals');
