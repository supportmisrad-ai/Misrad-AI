import json
import re

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

print("=== תיקון בעיות בבוט ===\n")

# תיקון 1: Rule 10 - הסרת "4 חבילות"
for rule in rules:
    if '10##מה זה MISRAD AI' in rule.get('Rule', ''):
        if '4 חבילות' in rule['response']:
            rule['response'] = rule['response'].replace('4 חבילות', 'נקסוס בלבד וחבילות משולבות')
            print("✓ Rule 10: '4 חבילות' → 'נקסוס בלבד וחבילות משולבות'")

# תיקון 2: Rule 11 - הסרת "בחר מודול" ו"4 חבילות"
for rule in rules:
    if '11##המודולים שלנו' in rule.get('Rule', ''):
        if 'בחר מודול' in rule['response']:
            rule['response'] = rule['response'].replace('בחר מודול', '5 מודולים שעובדים יחד')
            print("✓ Rule 11: 'בחר מודול' → '5 מודולים שעובדים יחד'")
        if '4 חבילות' in rule['response']:
            rule['response'] = rule['response'].replace('4 חבילות', 'חבילות גמישות')
            print("✓ Rule 11: '4 חבילות' → 'חבילות גמישות'")

# תיקון 3: Rule 56 - שינוי "Solo" ל"נקסוס בלבד"
for rule in rules:
    if '56##מה המחיר' in rule.get('Rule', ''):
        if 'Solo' in rule['response'] and 'נקסוס בלבד' not in rule['response']:
            rule['response'] = rule['response'].replace('Solo', 'נקסוס בלבד')
            print("✓ Rule 56: 'Solo' → 'נקסוס בלבד'")

# בדיקת תקינות
with open('bot/Rules_5.rules', 'w', encoding='utf-8') as f:
    json.dump(rules, f, ensure_ascii=False, separators=(',', ':'))

print("\n✓ הקובץ נשמר בהצלחה")
print(f"✓ {len(rules)} כללים בקובץ")
