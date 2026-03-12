import json

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

# מצא את Rule 22
for rule in rules:
    if '22##' in rule.get('Rule', ''):
        print("Found Rule 22")
        print("Current response preview:")
        print(rule['response'][:400])
        
        # בדוק אם צריך עדכון
        if 'משימות חכמות' not in rule['response']:
            print("\n⚠ Need to add Nexus features")
            # החלף את התיאור הקצר בתיאור מורחב
            old_desc = "description:`בדיוק מה שצריך.\n\n💰 החל מ- *149₪/חודש* | שנתי: *119₪*\n📅 *7 ימי ניסיון חינם*\n\n`"
            new_desc = "description:`ניהול צוות ומשימות עם AI.\n\n💰 *149₪/חודש* | שנתי: *119₪*\n📅 *7 ימי ניסיון חינם*\n\n✅ משימות חכמות\n✅ דשבורד צוות\n✅ תזכורות AI\n\nרוצה יותר? חבילות משולבות מ-249₪\n`"
            
            if old_desc in rule['response']:
                rule['response'] = rule['response'].replace(old_desc, new_desc)
                print("✓ Description updated with features")
            else:
                print("⚠ Old description format not found - may already be updated or different format")
        else:
            print("\n✓ Already contains features list")
        break

# שמירה
with open('bot/Rules_5.rules', 'w', encoding='utf-8') as f:
    json.dump(rules, f, ensure_ascii=False, separators=(',', ':'))

print("\n✓ File saved")
