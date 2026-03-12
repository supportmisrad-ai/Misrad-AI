import json

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

# מצא את Rule 22
rule22 = next((r for r in rules if '22##' in r.get('Rule', '')), None)

if rule22:
    print("=== Rule 22 ===")
    print("Rule:", rule22['Rule'])
    print("\nResponse preview (first 600 chars):")
    print(rule22['response'][:600])
    print("\n...")
    
    # בדוק אם יש "בחר מודול"
    if 'בחר מודול' in rule22['response']:
        print("\n⚠ Still contains 'בחר מודול' - needs update")
    else:
        print("\n✓ Description updated correctly")
        
    if 'נקסוס בלבד' in rule22['response']:
        print("✓ Contains 'נקסוס בלבד'")
    else:
        print("⚠ Missing 'נקסוס בלבד'")
else:
    print("Rule 22 not found!")
