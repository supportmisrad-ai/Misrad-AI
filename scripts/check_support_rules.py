import json

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

print("=== בדיקת כללי תמיכה ונציגים ===\n")

# חפש כללים של תמיכה/נציג/עזרה
support_rules = []
for rule in rules:
    rule_text = rule.get('Rule', '')
    response = rule.get('response', '')
    
    if any(keyword in rule_text + response for keyword in ['עזרה', 'תמיכה', 'נציג', 'סטופ', 'stop', 'הסר']):
        support_rules.append({
            'rule': rule_text[:60],
            'has_ai': 'AI' in response or 'בינה' in response,
            'has_human': 'נציג' in response or 'אנושי' in response,
            'has_stop': 'סטופ' in response or 'stop' in response.lower()
        })

print(f"נמצאו {len(support_rules)} כללי תמיכה/עזרה:\n")
for r in support_rules:
    ai = "🤖 AI" if r['has_ai'] else ""
    human = "👤 נציג" if r['has_human'] else ""
    stop = "🛑 סטופ" if r['has_stop'] else ""
    print(f"• {r['rule'][:50]}... {ai} {human} {stop}")

print("\n=== סיכום ===")
print(f"סה"כ {len(rules)} כללים בבוט")
