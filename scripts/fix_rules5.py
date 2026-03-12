import json
import re

with open('bot/Rules_5.rules', 'r', encoding='utf-8') as f:
    content = f.read()

print("File loaded, length:", len(content))

# עדכון 1: שינוי כותרת Rule 22
if 'חבילת פרלינס' in content:
    content = content.replace('חבילת פרלינס', 'נקסוס בלבד')
    print("✓ Updated: חבילת פרלינס → נקסוס בלבד")
else:
    print("⚠ 'חבילת פרלינס' not found")

# בדיקת תקינות JSON
try:
    data = json.loads(content)
    print(f"✓ Valid JSON with {len(data)} rules")
    
    # שמירה
    with open('bot/Rules_5.rules', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ File saved")
    
except json.JSONDecodeError as e:
    print(f"❌ JSON error: {e}")
    print("Changes not saved")
