import json

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    rules = json.load(f)

print("=== בדיקת Webhooks בבוט ===\n")

webhooks = []
for rule in rules:
    extra = rule.get('extra', {})
    webhook = extra.get('Webhook', '')
    if webhook and webhook.strip():
        webhooks.append({
            'rule': rule['Rule'][:40],
            'webhook': webhook,
            'active': extra.get('Active', False),
            'send_webhook': extra.get('SendWebhook', False)
        })

print(f"נמצאו {len(webhooks)} כללים עם webhooks:\n")
for w in webhooks:
    status = "✓ פעיל" if w['active'] and w['send_webhook'] else "✗ לא פעיל"
    print(f"{status} | {w['rule']}...")
    print(f"  URL: {w['webhook']}\n")

# בדיקת Finance
print("\n=== בדיקת מודול Finance ===")
finance_count = sum(1 for r in rules if 'finance' in r.get('response', '').lower() or 'Finance' in r.get('response', ''))
print(f"נמצא {finance_count} כללים המזכירים Finance")

# בדיקת מודולים שמוצגים
print("\n=== מודולים שמוצגים בבוט ===")
modules = ['Nexus', 'System', 'Social', 'Client', 'Operations', 'Finance']
for module in modules:
    count = sum(1 for r in rules if module in r.get('response', ''))
    print(f"{module}: {count} כללים")
