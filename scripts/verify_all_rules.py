import json

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

print("=== בדיקת כל הכללים הקשורים לחבילות ומחירים ===\n")

count = 0
issues = []

for rule in rules:
    rule_text = rule.get('Rule', '')
    response = rule.get('response', '')
    
    # בדוק אם הכלל קשור לחבילות/מחירים
    if any(keyword in rule_text + response for keyword in ['חביל', 'מחיר', 'Solo', 'פרלינס', '149', '249', '349', '499', 'מודול']):
        count += 1
        print(f"Rule: {rule_text[:50]}...")
        
        # בדוק בעיות
        if 'Solo' in response and 'נקסוס בלבד' not in response:
            issues.append(f"Rule {rule_text[:30]}: עדיין מכיל 'Solo' ללא 'נקסוס בלבד'")
        if 'פרלינס' in response:
            issues.append(f"Rule {rule_text[:30]}: עדיין מכיל 'פרלינס'")
        if 'בחר מודול' in response:
            issues.append(f"Rule {rule_text[:30]}: עדיין מכיל 'בחר מודול'")
        if '4 חבילות' in response:
            issues.append(f"Rule {rule_text[:30]}: עדיין מכיל '4 חבילות'")
        
        print()

print(f"\nנבדקו {count} כללים רלוונטיים")
print(f"נמצאו {len(issues)} בעיות:")
for issue in issues:
    print(f"  ⚠ {issue}")

if not issues:
    print("\n✓ הכל תקין! אין בעיות")

# בדיקת תקינות JSON
print(f"\n✓ JSON תקין - {len(rules)} כללים בקובץ")
