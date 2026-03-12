import json

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

print("=== בדיקת כל הכללים הרלוונטיים ===\n")

# Rule 1 - תפריט ראשי
rule1 = next((r for r in rules if '1##התחל' in r.get('Rule', '')), None)
if rule1:
    print("✓ Rule 1 - תפריט ראשי:")
    if 'נקסוס בלבד ₪149, חבילות מ-₪249' in rule1['response']:
        print("  ✓ תיאור חבילות מעודכן: נקסוס בלבד ₪149, חבילות מ-₪249")
    else:
        print("  ⚠ תיאור חבילות ישן - צריך עדכון!")
        print("  מצא:", [m for m in rule1['response'].split('description:')[1:2]])

# Rule 22 - אני לבד
rule22 = next((r for r in rules if '22##אני לבד' in r.get('Rule', '')), None)
if rule22:
    print("\n✓ Rule 22 - אני לבד:")
    if 'נקסוס בלבד' in rule22['response']:
        print("  ✓ כותרת מעודכנת: נקסוס בלבד")
    if 'משימות חכמות' in rule22['response']:
        print("  ✓ יכולות נקסוס מופיעות")
    if 'בחר מודול' in rule22['response']:
        print("  ⚠ עדיין מכיל 'בחר מודול' - צריך הסרה!")
    else:
        print("  ✓ אין 'בחר מודול' - תקין!")

# בדיקת כללים אחרים עם מחירים
print("\n=== בדיקת כללים נוספים ===")
for rule in rules:
    resp = rule.get('response', '')
    if 'Solo' in resp or 'פרלינס' in resp:
        print(f"⚠ Rule {rule['Rule'][:20]}... עדיין מכיל Solo/פרלינס")

print("\n=== סיכום ===")
print(f"סה"כ {len(rules)} כללים בקובץ")
print("JSON תקין ✓")
